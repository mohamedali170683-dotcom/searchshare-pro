import prisma from '../../../lib/prisma.js';
import { requireAuth } from '../../../lib/auth.js';
import { generateRecommendations } from '../../../lib/calculations.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;

  try {
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
      include: {
        brand: true,
        keywords: true,
        snapshots: { orderBy: { timestamp: 'desc' }, take: 1 }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const latestSnapshot = project.snapshots[0];
    if (!latestSnapshot) {
      return res.json({ recommendations: [] });
    }

    const recommendations = generateRecommendations(
      {
        sos: latestSnapshot.sos,
        sov: latestSnapshot.sov,
        gap: latestSnapshot.gap,
        allBrands: latestSnapshot.allBrandsData
      },
      { marketKeywords: project.keywords }
    );

    res.json({ recommendations });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
