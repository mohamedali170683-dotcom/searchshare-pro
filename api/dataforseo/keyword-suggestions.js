import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  if (!user.dataForSeoLogin || !user.dataForSeoPassword) {
    return res.status(400).json({ error: 'DataForSEO credentials not configured' });
  }

  try {
    const { seedKeyword, limit = 30, locationCode = 2840 } = req.body;

    if (!seedKeyword) {
      return res.status(400).json({ error: 'Seed keyword required' });
    }

    const credentials = Buffer.from(`${user.dataForSeoLogin}:${user.dataForSeoPassword}`).toString('base64');

    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        keyword: seedKeyword.trim().toLowerCase(),
        location_code: locationCode,
        language_code: 'en',
        limit,
        include_serp_info: false,
        include_seed_keyword: false,
        order_by: ['keyword_info.search_volume,desc']
      }])
    });

    const data = await response.json();
    const items = data.tasks?.[0]?.result?.[0]?.items || [];

    const keywords = items.map(item => ({
      keyword: item.keyword,
      volume: item.keyword_info?.search_volume || 0,
      competition: item.keyword_info?.competition || 0,
      cpc: item.keyword_info?.cpc || 0
    })).filter(k => k.volume > 0);

    res.json({ keywords });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
