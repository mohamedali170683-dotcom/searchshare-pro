import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { calculateSnapshot, generateRecommendations } from '../services/calculations.service.js';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);

// Validation schemas
const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  client: z.string().optional(),
  brand: z.object({
    name: z.string().min(1, 'Brand name is required'),
    domain: z.string().optional(),
    volume: z.number().int().min(0).default(0)
  }),
  competitors: z.array(z.object({
    name: z.string().min(1),
    domain: z.string().optional(),
    volume: z.number().int().min(0).default(0)
  })).optional().default([]),
  marketKeywords: z.array(z.object({
    keyword: z.string().min(1),
    volume: z.number().int().min(0).default(0)
  })).optional().default([]),
  positions: z.record(z.record(z.number().int().min(1).max(100))).optional().default({})
});

/**
 * GET /api/projects
 * List all projects for the current user
 */
router.get('/', asyncHandler(async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { userId: req.user.id },
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
}));

/**
 * GET /api/projects/:id
 * Get a single project with all details
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const project = await prisma.project.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id
    },
    include: {
      brand: true,
      competitors: { orderBy: { sortOrder: 'asc' } },
      keywords: {
        orderBy: { sortOrder: 'asc' },
        include: { positions: true }
      },
      snapshots: {
        orderBy: { timestamp: 'desc' },
        take: 12
      }
    }
  });

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Transform positions to the format expected by frontend
  const positions = {};
  project.keywords.forEach((kw, idx) => {
    positions[idx] = {};
    kw.positions.forEach(pos => {
      if (pos.position) {
        positions[idx][pos.brandName] = pos.position;
      }
    });
  });

  // Get latest snapshot for current metrics
  const latestSnapshot = project.snapshots[0];

  res.json({
    project: {
      id: project.id,
      name: project.name,
      client: project.client,
      brand: project.brand,
      competitors: project.competitors,
      marketKeywords: project.keywords.map(k => ({
        keyword: k.keyword,
        volume: k.volume
      })),
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
        date: s.date,
        sos: s.sos,
        sov: s.sov,
        gap: s.gap,
        status: s.status
      })),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }
  });
}));

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', asyncHandler(async (req, res) => {
  // Validate input
  const result = projectSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.errors
    });
  }

  const { name, client, brand, competitors, marketKeywords, positions } = result.data;

  // Create project with related entities in a transaction
  const project = await prisma.$transaction(async (tx) => {
    // Create project
    const proj = await tx.project.create({
      data: {
        name,
        client,
        userId: req.user.id,
        brand: {
          create: {
            name: brand.name,
            domain: brand.domain,
            volume: brand.volume
          }
        },
        competitors: {
          create: competitors.map((c, idx) => ({
            name: c.name,
            domain: c.domain,
            volume: c.volume,
            sortOrder: idx
          }))
        },
        keywords: {
          create: marketKeywords.map((k, idx) => ({
            keyword: k.keyword,
            volume: k.volume,
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
  const snapshot = calculateSnapshot({
    brand,
    competitors,
    marketKeywords,
    positions
  });

  // Create snapshot and update project metrics
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
    project: {
      id: project.id,
      name: project.name,
      currentMetrics: snapshot
    }
  });
}));

/**
 * PUT /api/projects/:id
 * Update a project
 */
router.put('/:id', asyncHandler(async (req, res) => {
  // Verify ownership
  const existing = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });

  if (!existing) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { name, client, brand, competitors, marketKeywords, positions } = req.body;

  // Update in transaction
  await prisma.$transaction(async (tx) => {
    // Update basic info
    await tx.project.update({
      where: { id: req.params.id },
      data: { name, client }
    });

    // Update brand
    if (brand) {
      await tx.brand.update({
        where: { projectId: req.params.id },
        data: {
          name: brand.name,
          domain: brand.domain,
          volume: brand.volume
        }
      });
    }

    // Update competitors
    if (competitors) {
      await tx.competitor.deleteMany({ where: { projectId: req.params.id } });
      await tx.competitor.createMany({
        data: competitors.map((c, idx) => ({
          projectId: req.params.id,
          name: c.name,
          domain: c.domain,
          volume: c.volume,
          sortOrder: idx
        }))
      });
    }

    // Update keywords and positions
    if (marketKeywords) {
      // Delete old keywords (cascades to positions)
      await tx.marketKeyword.deleteMany({ where: { projectId: req.params.id } });

      // Create new keywords
      for (let idx = 0; idx < marketKeywords.length; idx++) {
        const kw = marketKeywords[idx];
        const keyword = await tx.marketKeyword.create({
          data: {
            projectId: req.params.id,
            keyword: kw.keyword,
            volume: kw.volume,
            sortOrder: idx
          }
        });

        // Create positions for this keyword
        if (positions && positions[idx]) {
          for (const [brandName, position] of Object.entries(positions[idx])) {
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
    }
  });

  // Recalculate metrics if data changed
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
          projectId: req.params.id,
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
        where: { id: req.params.id },
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
}));

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  // Verify ownership
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  await prisma.project.delete({
    where: { id: req.params.id }
  });

  res.json({ message: 'Project deleted successfully' });
}));

/**
 * POST /api/projects/:id/snapshot
 * Create a new snapshot for a project
 */
router.post('/:id/snapshot', asyncHandler(async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: {
      brand: true,
      competitors: true,
      keywords: { include: { positions: true } }
    }
  });

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Build positions object
  const positions = {};
  project.keywords.forEach((kw, idx) => {
    positions[idx] = {};
    kw.positions.forEach(pos => {
      if (pos.position) {
        positions[idx][pos.brandName] = pos.position;
      }
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

  res.json({
    message: 'Snapshot created',
    snapshot
  });
}));

/**
 * GET /api/projects/:id/recommendations
 * Get AI recommendations for a project
 */
router.get('/:id/recommendations', asyncHandler(async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.user.id },
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
    {
      marketKeywords: project.keywords
    }
  );

  res.json({ recommendations });
}));

export default router;
