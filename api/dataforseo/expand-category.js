import { requireAuth } from '../../lib/auth.js';
import { getDataForSeoCredentials, getAuthHeader } from '../../lib/dataforseo.js';

/**
 * Expand seed keywords into a full category keyword list
 * Takes seed keywords as category indicators and discovers all related keywords
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
    const { seedKeywords, locationCode = 2840, limitPerSeed = 50 } = req.body;

    if (!seedKeywords || !Array.isArray(seedKeywords) || seedKeywords.length === 0) {
      return res.status(400).json({ error: 'Seed keywords array required' });
    }

    const authHeader = getAuthHeader(credentials);
    const keywordMap = new Map();

    // Add seed keywords themselves
    for (const seed of seedKeywords) {
      if (seed.keyword) {
        keywordMap.set(seed.keyword.toLowerCase(), {
          keyword: seed.keyword.toLowerCase(),
          volume: seed.volume || 0,
          isSeed: true
        });
      }
    }

    // For each seed keyword, fetch related and suggested keywords
    const expansionPromises = seedKeywords.map(async (seed) => {
      const seedWord = (seed.keyword || seed).toString().trim().toLowerCase();
      if (!seedWord) return [];

      const results = [];

      // Fetch keyword suggestions
      try {
        const suggestionsResponse = await fetch(
          'https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live',
          {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify([{
              keyword: seedWord,
              location_code: locationCode,
              language_code: 'en',
              limit: limitPerSeed,
              include_serp_info: false,
              include_seed_keyword: false,
              order_by: ['keyword_info.search_volume,desc']
            }])
          }
        );

        const suggestionsData = await suggestionsResponse.json();
        const suggestionsItems = suggestionsData.tasks?.[0]?.result?.[0]?.items || [];

        suggestionsItems.forEach(item => {
          if (item.keyword && item.keyword_info?.search_volume > 0) {
            results.push({
              keyword: item.keyword.toLowerCase(),
              volume: item.keyword_info.search_volume,
              source: 'suggestions',
              seedKeyword: seedWord
            });
          }
        });
      } catch (err) {
        console.error(`Error fetching suggestions for "${seedWord}":`, err.message);
      }

      // Fetch related keywords
      try {
        const relatedResponse = await fetch(
          'https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live',
          {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify([{
              keyword: seedWord,
              location_code: locationCode,
              language_code: 'en',
              limit: limitPerSeed,
              order_by: ['keyword_info.search_volume,desc']
            }])
          }
        );

        const relatedData = await relatedResponse.json();
        const relatedItems = relatedData.tasks?.[0]?.result?.[0]?.items || [];

        relatedItems.forEach(item => {
          const kw = item.keyword_data?.keyword || item.keyword;
          const vol = item.keyword_data?.keyword_info?.search_volume || 0;
          if (kw && vol > 0) {
            results.push({
              keyword: kw.toLowerCase(),
              volume: vol,
              source: 'related',
              seedKeyword: seedWord
            });
          }
        });
      } catch (err) {
        console.error(`Error fetching related keywords for "${seedWord}":`, err.message);
      }

      return results;
    });

    // Wait for all expansion requests to complete
    const allResults = await Promise.all(expansionPromises);

    // Flatten and deduplicate, keeping highest volume for duplicates
    allResults.flat().forEach(kw => {
      const existing = keywordMap.get(kw.keyword);
      if (!existing || kw.volume > existing.volume) {
        keywordMap.set(kw.keyword, {
          keyword: kw.keyword,
          volume: kw.volume,
          isSeed: false,
          source: kw.source,
          seedKeyword: kw.seedKeyword
        });
      }
    });

    // Convert to array and sort by volume
    const expandedKeywords = [...keywordMap.values()]
      .sort((a, b) => b.volume - a.volume);

    // Calculate total market volume
    const totalMarketVolume = expandedKeywords.reduce((sum, kw) => sum + kw.volume, 0);
    const seedCount = seedKeywords.length;
    const expandedCount = expandedKeywords.length - seedCount;

    res.json({
      success: true,
      seedKeywords: seedKeywords.map(s => s.keyword || s),
      expandedKeywords,
      totalMarketVolume,
      stats: {
        seedCount,
        expandedCount,
        totalKeywords: expandedKeywords.length,
        avgVolumePerKeyword: Math.round(totalMarketVolume / expandedKeywords.length)
      }
    });
  } catch (error) {
    console.error('Error expanding category:', error);
    res.status(500).json({ error: error.message });
  }
}
