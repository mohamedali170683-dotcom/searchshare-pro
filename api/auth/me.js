import { requireAuth } from '../../lib/auth.js';
import { hasCredentials } from '../../lib/dataforseo.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        hasApiCredentials: hasCredentials(user),
        createdAt: user.createdAt
      }
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
