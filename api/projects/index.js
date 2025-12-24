import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../lib/auth.js';
import { calculateSnapshot } from '../../lib/calculations.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      // List all projects
      const projects = await prisma.project.findMany({
        where: { userId: user.id },
        include: {
          brand: true,
          competitors: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { snapshots: true } }
        },
        orderBy: { updatedAt: 'desc' }
      });

      res.json({
        projects: projects.map(p => ({
          id: p.id,
          name: p.name,
          client: p.client,
          brand: p.brand,
          competitorCount: p.competitors.length,
          snapshotCount: p._count.snapshots,
          currentSOS: p.currentSOS,
          currentSOV: p.currentSOV,
          currentGap: p.currentGap,
          currentStatus: p.currentStatus,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        }))
      });
    } else if (req.method === 'POST') {
      // Create new project
      const { name, client, brand, competitors = [], marketKeywords = [], positions = {} } = req.body;

      if (!name || !brand?.name) {
        return res.status(400).json({ error: 'Project name and brand name required' });
      }

      const project = await prisma.$transaction(async (tx) => {
        const proj = await tx.project.create({
          data: {
            name,
            client,
            userId: user.id,
            brand: {
              create: {
                name: brand.name,
                domain: brand.domain,
                volume: brand.volume || 0
              }
            },
            competitors: {
              create: competitors.map((c, idx) => ({
                name: c.name,
                domain: c.domain,
                volume: c.volume || 0,
                sortOrder: idx
              }))
            },
            keywords: {
              create: marketKeywords.map((k, idx) => ({
                keyword: k.keyword,
                volume: k.volume || 0,
                sortOrder: idx
              }))
            }
          },
          include: {
            brand: true,
            competitors: true,
            keywords: true
          }
        });

        // Create positions
        for (const [kwIdx, brandPositions] of Object.entries(positions)) {
          const keyword = proj.keywords[parseInt(kwIdx)];
          if (keyword) {
            for (const [brandName, position] of Object.entries(brandPositions)) {
              await tx.position.create({
                data: {
                  keywordId: keyword.id,
                  brandName,
                  position
                }
              });
            }
          }
        }

        return proj;
      });

      // Calculate initial metrics
      const snapshot = calculateSnapshot({ brand, competitors, marketKeywords, positions });

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

      res.status(201).json({
        message: 'Project created successfully',
        project: { id: project.id, name: project.name, currentMetrics: snapshot }
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
