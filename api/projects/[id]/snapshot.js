import prisma from '../../../lib/prisma.js';
import { requireAuth } from '../../../lib/auth.js';
import { calculateSnapshot } from '../../../lib/calculations.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
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
        competitors: true,
        keywords: { include: { positions: true } }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const positions = {};
    project.keywords.forEach((kw, idx) => {
      positions[idx] = {};
      kw.positions.forEach(pos => {
        if (pos.position) positions[idx][pos.brandName] = pos.position;
      });
    });

    const snapshot = calculateSnapshot({
      brand: project.brand,
      competitors: project.competitors,
      marketKeywords: project.keywords.map(k => ({ keyword: k.keyword, volume: k.volume })),
      positions
    });

    await prisma.$transaction([
      prisma.snapshot.create({
        data: {
          projectId: project.id,
          date: snapshot.date,
          brandVolume: snapshot.brandVolume,
          totalBrandVolume: snapshot.totalBrandVolume,
          totalMarketVolume: snapshot.totalMarketVolume,
          visibleVolume: snapshot.visibleVolume,
          sos: snapshot.sos,
          sov: snapshot.sov,
          gap: snapshot.gap,
          status: snapshot.status,
          allBrandsData: snapshot.allBrands
        }
      }),
      prisma.project.update({
        where: { id: project.id },
        data: {
          currentSOS: snapshot.sos,
          currentSOV: snapshot.sov,
          currentGap: snapshot.gap,
          currentStatus: snapshot.status
        }
      })
    ]);

    res.json({ message: 'Snapshot created', snapshot });
  } catch (error) {
    console.error('Snapshot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
