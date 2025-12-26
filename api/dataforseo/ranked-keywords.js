import { requireAuth } from '../../lib/auth.js';
import { getDataForSeoCredentials, getAuthHeader } from '../../lib/dataforseo.js';

/**
 * Ranked Keywords API - Gets all keyword rankings for each domain
 * Much faster than searching each keyword individually
 *
 * DataForSEO endpoint: /v3/dataforseo_labs/google/ranked_keywords/live
 */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const credentials = getDataForSeoCredentials(user);

  if (!credentials) {
    return res.status(400).json({ error: 'DataForSEO credentials not configured' });
  }

  try {
    const { keywords, domains, locationCode = 2840 } = req.body;

    if (!keywords?.length || !domains?.length) {
      return res.status(400).json({ error: 'Keywords and domains required' });
    }

    // Normalize keywords for matching
    const keywordSet = new Set(keywords.map(k => k.toLowerCase().trim()));

    const authHeader = getAuthHeader(credentials);

    // Fetch ranked keywords for each domain in parallel
    const fetchPromises = domains.map(async (domain, domainIdx) => {
      try {
        // Clean domain for API
        const cleanDomain = domain
          .replace(/^(https?:\/\/)?(www\.)?/, '')
          .split('/')[0]
          .toLowerCase();

        const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([{
            target: cleanDomain,
            location_code: locationCode,
            language_code: 'en',
            limit: 1000, // Get top 1000 keywords
            order_by: ['keyword_data.keyword_info.search_volume,desc']
          }])
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          return {
            domain,
            error: `API ${response.status}: ${errorText.substring(0, 100)}`,
            rankings: {}
          };
        }

        const data = await response.json();

        // Check for API-level errors
        if (data.tasks?.[0]?.status_code !== 20000) {
          return {
            domain,
            error: data.tasks?.[0]?.status_message || 'API task error',
            rankings: {}
          };
        }

        const items = data.tasks?.[0]?.result?.[0]?.items || [];

        // Filter to only keywords we care about and build rankings map
        const rankings = {};
        const matchedKeywords = [];

        items.forEach(item => {
          const kw = item.keyword_data?.keyword?.toLowerCase().trim();
          if (kw && keywordSet.has(kw)) {
            const position = item.ranked_serp_element?.serp_item?.rank_group;
            const volume = item.keyword_data?.keyword_info?.search_volume || 0;

            if (position) {
              rankings[kw] = {
                position,
                volume
              };
              matchedKeywords.push(kw);
            }
          }
        });

        return {
          domain,
          rankings,
          totalKeywordsFound: items.length,
          matchedKeywords: matchedKeywords.length
        };

      } catch (error) {
        return {
          domain,
          error: error.message || 'Request failed',
          rankings: {}
        };
      }
    });

    // Wait for all domain requests to complete
    const results = await Promise.all(fetchPromises);

    // Build position matrix (keywordIndex -> { domain: position })
    const positions = {};
    const keywordVolumes = {};
    const errors = [];

    // Initialize positions for each keyword index
    keywords.forEach((kw, idx) => {
      positions[idx] = {};
    });

    // Fill in positions from each domain's results
    results.forEach(result => {
      if (result.error) {
        errors.push({ domain: result.domain, error: result.error });
      }

      // Map rankings back to keyword indices
      keywords.forEach((kw, idx) => {
        const kwLower = kw.toLowerCase().trim();
        const ranking = result.rankings[kwLower];

        if (ranking) {
          positions[idx][result.domain] = ranking.position;

          // Store volume if we don't have it yet
          if (!keywordVolumes[kw] && ranking.volume) {
            keywordVolumes[kw] = ranking.volume;
          }
        }
      });
    });

    // Collect debug info
    const debugResults = results.map(r => ({
      domain: r.domain,
      totalKeywordsFound: r.totalKeywordsFound,
      matchedKeywords: r.matchedKeywords,
      error: r.error
    }));

    res.json({
      positions,
      keywordVolumes,
      errors: errors.length > 0 ? errors : undefined,
      debug: {
        domainsProcessed: domains.length,
        keywordsToMatch: keywords.length,
        results: debugResults
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
