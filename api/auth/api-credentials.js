import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { apiLogin, apiPassword } = req.body;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        dataForSeoLogin: apiLogin || null,
        dataForSeoPassword: apiPassword || null
      }
    });

    res.json({
      message: 'API credentials updated',
      hasCredentials: !!(apiLogin && apiPassword)
    });
  } catch (error) {
    console.error('Update credentials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
