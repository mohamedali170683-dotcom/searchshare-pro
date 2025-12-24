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
    const { keywords, locationCode = 2840 } = req.body;

    if (!keywords || keywords.length === 0) {
      return res.status(400).json({ error: 'Keywords required' });
    }

    const credentials = Buffer.from(`${user.dataForSeoLogin}:${user.dataForSeoPassword}`).toString('base64');

    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/historical_search_volume/live', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        keywords: keywords.map(k => k.toLowerCase()),
        location_code: locationCode,
        language_code: 'en'
      }])
    });

    const data = await response.json();
    const items = data.tasks?.[0]?.result || [];
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
