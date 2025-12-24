import { requireAuth } from '../../lib/auth.js';
import { getDataForSeoCredentials, getAuthHeader } from '../../lib/dataforseo.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const credentials = getDataForSeoCredentials(user);

  if (!credentials) {
    return res.status(400).json({ error: 'DataForSEO credentials not configured. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD environment variables.' });
  }

  try {
    const response = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(credentials),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{}])
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.status_message || 'API error');
    }

    res.json({
      success: true,
      balance: data.tasks?.[0]?.result?.[0]?.money?.balance || 0,
      source: credentials.source
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
