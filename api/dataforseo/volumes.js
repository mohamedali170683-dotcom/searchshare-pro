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

    const response = await fetch('https://api.dataforseo.com/v3/keywords_data/google/search_volume/live', {
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
    const volumes = {};
    const items = data.tasks?.[0]?.result || [];

    items.forEach(item => {
      if (item.keyword && item.search_volume) {
        volumes[item.keyword] = item.search_volume;
      }
    });

    res.json({ volumes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
