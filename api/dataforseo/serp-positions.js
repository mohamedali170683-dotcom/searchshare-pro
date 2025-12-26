import { requireAuth } from '../../lib/auth.js';
import { getDataForSeoCredentials, getAuthHeader } from '../../lib/dataforseo.js';

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

    // Limit keywords to prevent timeout (Vercel has 10s limit on Hobby plan)
    // Only 1 keyword at a time to allow deeper search (100 results)
    const maxKeywords = 1;
    const limitedKeywords = keywords.slice(0, maxKeywords);
    const wasLimited = keywords.length > maxKeywords;

    const cleanDomains = domains.map(d =>
      d.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase()
    );

    const authHeader = getAuthHeader(credentials);

    // Helper function to fetch with timeout
    const fetchWithTimeout = async (url, options, timeoutMs = 8000) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeout);
        return response;
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    };

    // Fetch all keywords in parallel for speed
    const fetchPromises = limitedKeywords.map(async (keyword, i) => {
      try {
        const response = await fetchWithTimeout('https://api.dataforseo.com/v3/serp/google/organic/live/regular', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([{
            keyword,
            location_code: locationCode,
            language_code: 'en',
            depth: 30 // Reduced depth for Vercel Hobby plan timeout
          }])
        }, 6000); // 6 second timeout to leave room for cold start + auth

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          return { index: i, keyword, positions: {}, volume: 0, error: `API ${response.status}: ${errorText.substring(0, 100)}` };
        }

        const data = await response.json();

        // Check for API-level errors
        if (data.tasks?.[0]?.status_code !== 20000) {
          return { index: i, keyword, positions: {}, volume: 0, error: data.tasks?.[0]?.status_message || 'API task error' };
        }

        const items = data.tasks?.[0]?.result?.[0]?.items || [];
        const searchInfo = data.tasks?.[0]?.result?.[0]?.search_information || {};

        const keywordPositions = {};

        items.forEach(item => {
          if (item.type === 'organic') {
            const itemDomain = (item.domain || '').toLowerCase();
            cleanDomains.forEach((domain, domainIdx) => {
              if (itemDomain.includes(domain) || domain.includes(itemDomain)) {
                keywordPositions[domains[domainIdx]] = item.rank_group;
              }
            });
          }
        });

        // Get top 10 domains for debug
        const topDomains = items
          .filter(item => item.type === 'organic')
          .slice(0, 10)
          .map(item => ({ rank: item.rank_group, domain: item.domain }));

        return {
          index: i,
          keyword,
          positions: keywordPositions,
          volume: searchInfo.search_volume || 0,
          itemCount: items.length,
          topDomains
        };
      } catch (error) {
        return { index: i, keyword, positions: {}, volume: 0, error: error.message || 'Request failed' };
      }
    });

    // Wait for all requests to complete
    const results = await Promise.all(fetchPromises);

    // Build response objects
    const positions = {};
    const keywordVolumes = {};
    const errors = [];

    results.forEach(result => {
      positions[result.index] = result.positions;
      keywordVolumes[result.keyword] = result.volume;
      if (result.error) {
        errors.push({ keyword: result.keyword, error: result.error });
      }
    });

    // Collect debug info from results
    const debugResults = results.map(r => ({
      keyword: r.keyword,
      itemCount: r.itemCount,
      topDomains: r.topDomains,
      foundPositions: Object.keys(r.positions).length
    }));

    res.json({
      positions,
      keywordVolumes,
      limited: wasLimited,
      message: wasLimited
        ? `Only fetched first ${maxKeywords} keywords to avoid timeout. Process remaining keywords separately.`
        : undefined,
      errors: errors.length > 0 ? errors : undefined,
      debug: {
        keywordsProcessed: limitedKeywords.length,
        domainsSearched: cleanDomains,
        results: debugResults
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
