import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

/**
 * Make authenticated request to DataForSEO
 */
async function dataForSeoRequest(user, endpoint, body) {
  if (!user.dataForSeoLogin || !user.dataForSeoPassword) {
    throw new Error('DataForSEO API credentials not configured');
  }

  const credentials = Buffer.from(`${user.dataForSeoLogin}:${user.dataForSeoPassword}`).toString('base64');

  const response = await fetch(`${DATAFORSEO_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.status_message || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * POST /api/dataforseo/test
 * Test API connection
 */
router.post('/test', asyncHandler(async (req, res) => {
  const result = await dataForSeoRequest(req.user, '/appendix/user_data', [{}]);

  res.json({
    success: true,
    balance: result.tasks?.[0]?.result?.[0]?.money?.balance || 0
  });
}));

/**
 * POST /api/dataforseo/volumes
 * Fetch search volumes for keywords
 */
router.post('/volumes', asyncHandler(async (req, res) => {
  const { keywords, locationCode = 2840 } = req.body;

  if (!keywords || keywords.length === 0) {
    return res.status(400).json({ error: 'Keywords required' });
  }

  const result = await dataForSeoRequest(req.user, '/keywords_data/google/search_volume/live', [{
    keywords: keywords.map(k => k.toLowerCase()),
    location_code: locationCode,
    language_code: 'en'
  }]);

  const volumes = {};
  const items = result.tasks?.[0]?.result || [];

  items.forEach(item => {
    if (item.keyword && item.search_volume) {
      volumes[item.keyword] = item.search_volume;
    }
  });

  res.json({ volumes });
}));

/**
 * POST /api/dataforseo/keyword-suggestions
 * Get keyword suggestions
 */
router.post('/keyword-suggestions', asyncHandler(async (req, res) => {
  const { seedKeyword, limit = 30, locationCode = 2840 } = req.body;

  if (!seedKeyword) {
    return res.status(400).json({ error: 'Seed keyword required' });
  }

  const result = await dataForSeoRequest(req.user, '/dataforseo_labs/google/keyword_suggestions/live', [{
    keyword: seedKeyword.trim().toLowerCase(),
    location_code: locationCode,
    language_code: 'en',
    limit,
    include_serp_info: false,
    include_seed_keyword: false,
    order_by: ['keyword_info.search_volume,desc']
  }]);

  const items = result.tasks?.[0]?.result?.[0]?.items || [];

  const keywords = items.map(item => ({
    keyword: item.keyword,
    volume: item.keyword_info?.search_volume || 0,
    competition: item.keyword_info?.competition || 0,
    cpc: item.keyword_info?.cpc || 0
  })).filter(k => k.volume > 0);

  res.json({ keywords });
}));

/**
 * POST /api/dataforseo/keyword-ideas
 * Get keyword ideas for a category
 */
router.post('/keyword-ideas', asyncHandler(async (req, res) => {
  const { seedKeyword, limit = 30, locationCode = 2840 } = req.body;

  if (!seedKeyword) {
    return res.status(400).json({ error: 'Seed keyword required' });
  }

  const result = await dataForSeoRequest(req.user, '/dataforseo_labs/google/keyword_ideas/live', [{
    keywords: [seedKeyword.trim().toLowerCase()],
    location_code: locationCode,
    language_code: 'en',
    limit,
    include_serp_info: false,
    filters: [
      ['keyword_info.search_volume', '>', 500]
    ],
    order_by: ['keyword_info.search_volume,desc']
  }]);

  const items = result.tasks?.[0]?.result?.[0]?.items || [];

  const keywords = items.map(item => ({
    keyword: item.keyword,
    volume: item.keyword_info?.search_volume || 0,
    competition: item.keyword_info?.competition || 0,
    cpc: item.keyword_info?.cpc || 0
  })).filter(k => k.volume > 0);

  res.json({ keywords });
}));

/**
 * POST /api/dataforseo/related-keywords
 * Get related keywords
 */
router.post('/related-keywords', asyncHandler(async (req, res) => {
  const { seedKeyword, limit = 20, locationCode = 2840 } = req.body;

  if (!seedKeyword) {
    return res.status(400).json({ error: 'Seed keyword required' });
  }

  const result = await dataForSeoRequest(req.user, '/dataforseo_labs/google/related_keywords/live', [{
    keyword: seedKeyword.trim().toLowerCase(),
    location_code: locationCode,
    language_code: 'en',
    limit,
    order_by: ['keyword_info.search_volume,desc']
  }]);

  const items = result.tasks?.[0]?.result?.[0]?.items || [];

  const keywords = items.map(item => ({
    keyword: item.keyword_data?.keyword || item.keyword,
    volume: item.keyword_data?.keyword_info?.search_volume || 0,
    competition: item.keyword_data?.keyword_info?.competition || 0
  })).filter(k => k.volume > 0);

  res.json({ keywords });
}));

/**
 * POST /api/dataforseo/historical-volumes
 * Get historical search volumes
 */
router.post('/historical-volumes', asyncHandler(async (req, res) => {
  const { keywords, locationCode = 2840 } = req.body;

  if (!keywords || keywords.length === 0) {
    return res.status(400).json({ error: 'Keywords required' });
  }

  const result = await dataForSeoRequest(req.user, '/dataforseo_labs/google/historical_search_volume/live', [{
    keywords: keywords.map(k => k.toLowerCase()),
    location_code: locationCode,
    language_code: 'en'
  }]);

  const items = result.tasks?.[0]?.result || [];
  const history = {};

  items.forEach(item => {
    if (item.keyword && item.monthly_searches) {
      history[item.keyword] = {
        current: item.search_volume || 0,
        monthly: item.monthly_searches.map(m => ({
          year: m.year,
          month: m.month,
          volume: m.search_volume || 0
        })).sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        })
      };
    }
  });

  res.json({ history });
}));

/**
 * POST /api/dataforseo/serp-positions
 * Fetch SERP positions for domains on keywords
 */
router.post('/serp-positions', asyncHandler(async (req, res) => {
  const { keywords, domains, locationCode = 2840 } = req.body;

  if (!keywords || keywords.length === 0 || !domains || domains.length === 0) {
    return res.status(400).json({ error: 'Keywords and domains required' });
  }

  // Clean domains
  const cleanDomains = domains.map(d =>
    d.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase()
  );

  const positions = {};
  const keywordVolumes = {};

  // Fetch SERP for each keyword
  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];

    try {
      const result = await dataForSeoRequest(req.user, '/serp/google/organic/live/regular', [{
        keyword: keyword,
        location_code: locationCode,
        language_code: 'en',
        depth: 100
      }]);

      const items = result.tasks?.[0]?.result?.[0]?.items || [];
      const searchInfo = result.tasks?.[0]?.result?.[0]?.search_information || {};

      positions[i] = {};
      keywordVolumes[keyword] = searchInfo.search_volume || 0;

      items.forEach(item => {
        if (item.type === 'organic') {
          const itemDomain = (item.domain || '').toLowerCase();

          cleanDomains.forEach((domain, domainIdx) => {
            if (itemDomain.includes(domain) || domain.includes(itemDomain)) {
              positions[i][domains[domainIdx]] = item.rank_group;
            }
          });
        }
      });
    } catch (error) {
      console.warn(`Failed to fetch SERP for "${keyword}":`, error.message);
      positions[i] = {};
    }
  }

  res.json({ positions, keywordVolumes });
}));

export default router;
