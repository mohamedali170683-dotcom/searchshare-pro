import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../lib/auth.js';
import { calculateSnapshot } from '../../lib/calculations.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const project = await prisma.project.findFirst({
        where: { id, userId: user.id },
        include: {
          brand: true,
          competitors: { orderBy: { sortOrder: 'asc' } },
          keywords: {
            orderBy: { sortOrder: 'asc' },
            include: { positions: true }
          },
          snapshots: { orderBy: { timestamp: 'desc' }, take: 12 }
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Transform positions
      const positions = {};
      project.keywords.forEach((kw, idx) => {
        positions[idx] = {};
        kw.positions.forEach(pos => {
          if (pos.position) positions[idx][pos.brandName] = pos.position;
        });
      });

      const latestSnapshot = project.snapshots[0];

      res.json({
        project: {
          id: project.id,
          name: project.name,
          client: project.client,
          brand: project.brand,
          competitors: project.competitors,
          marketKeywords: project.keywords.map(k => ({ keyword: k.keyword, volume: k.volume })),
          positions,
          currentMetrics: latestSnapshot ? {
            sos: latestSnapshot.sos,
            sov: latestSnapshot.sov,
            gap: latestSnapshot.gap,
            status: latestSnapshot.status,
            brandVolume: latestSnapshot.brandVolume,
            totalBrandVolume: latestSnapshot.totalBrandVolume,
            totalMarketVolume: latestSnapshot.totalMarketVolume,
            visibleVolume: latestSnapshot.visibleVolume,
            allBrands: latestSnapshot.allBrandsData
          } : null,
          snapshots: project.snapshots.map(s => ({
            date: s.date, sos: s.sos, sov: s.sov, gap: s.gap, status: s.status
          })),
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        }
      });
    } else if (req.method === 'PUT') {
      const existing = await prisma.project.findFirst({
        where: { id, userId: user.id }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const { name, client, brand, competitors, marketKeywords, positions } = req.body;

      await prisma.$transaction(async (tx) => {
        await tx.project.update({
          where: { id },
          data: { name, client }
        });

        if (brand) {
          await tx.brand.update({
            where: { projectId: id },
            data: { name: brand.name, domain: brand.domain, volume: brand.volume }
          });
        }

        if (competitors) {
          await tx.competitor.deleteMany({ where: { projectId: id } });
          await tx.competitor.createMany({
            data: competitors.map((c, idx) => ({
              projectId: id, name: c.name, domain: c.domain, volume: c.volume || 0, sortOrder: idx
            }))
          });
        }

        if (marketKeywords) {
          await tx.marketKeyword.deleteMany({ where: { projectId: id } });
          for (let idx = 0; idx < marketKeywords.length; idx++) {
            const kw = marketKeywords[idx];
            const keyword = await tx.marketKeyword.create({
              data: { projectId: id, keyword: kw.keyword, volume: kw.volume || 0, sortOrder: idx }
            });
            if (positions && positions[idx]) {
              for (const [brandName, position] of Object.entries(positions[idx])) {
                await tx.position.create({
                  data: { keywordId: keyword.id, brandName, position }
                });
              }
            }
          }
        }
      });

      if (brand || competitors || marketKeywords || positions) {
        const snapshot = calculateSnapshot({
          brand: brand || existing.brand,
          competitors: competitors || [],
          marketKeywords: marketKeywords || [],
          positions: positions || {}
        });

        await prisma.$transaction([
          prisma.snapshot.create({
            data: {
              projectId: id,
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
            where: { id },
            data: {
              currentSOS: snapshot.sos,
              currentSOV: snapshot.sov,
              currentGap: snapshot.gap,
              currentStatus: snapshot.status
            }
          })
        ]);
      }

      res.json({ message: 'Project updated successfully' });
    } else if (req.method === 'DELETE') {
      const project = await prisma.project.findFirst({
        where: { id, userId: user.id }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      await prisma.project.delete({ where: { id } });
      res.json({ message: 'Project deleted successfully' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
