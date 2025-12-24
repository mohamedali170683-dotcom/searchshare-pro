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

    const cleanDomains = domains.map(d =>
      d.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase()
    );

    const positions = {};
    const keywordVolumes = {};

    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];

      try {
        const response = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/regular', {
          method: 'POST',
          headers: {
            'Authorization': getAuthHeader(credentials),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([{
            keyword,
            location_code: locationCode,
            language_code: 'en',
            depth: 100
          }])
        });

        const data = await response.json();
        const items = data.tasks?.[0]?.result?.[0]?.items || [];
        const searchInfo = data.tasks?.[0]?.result?.[0]?.search_information || {};

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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
