import { Router, Request, Response } from 'express';
import {
  projectService,
  brandKeywordService,
  categoryKeywordService,
  competitorService,
  snapshotService,
  competitorMetricsService,
} from '../services/database.js';

const router = Router();

// ============ Projects ============

// Get all projects
router.get('/', async (_req: Request, res: Response) => {
  try {
    const projects = await projectService.findAll();
    res.json(projects);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch projects';
    res.status(500).json({ error: message });
  }
});

// Get project by ID with all relations
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await projectService.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch project';
    res.status(500).json({ error: message });
  }
});

// Create project
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, domain, brandName, locationCode, languageCode } = req.body;

    if (!name || !domain || !brandName) {
      return res.status(400).json({ error: 'Name, domain, and brandName are required' });
    }

    const project = await projectService.create({
      name,
      domain,
      brandName,
      locationCode,
      languageCode,
    });

    res.status(201).json(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create project';
    res.status(500).json({ error: message });
  }
});

// Update project
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, domain, brandName, locationCode, languageCode } = req.body;
    const project = await projectService.update(req.params.id, {
      name,
      domain,
      brandName,
      locationCode,
      languageCode,
    });
    res.json(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project';
    res.status(500).json({ error: message });
  }
});

// Delete project
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await projectService.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete project';
    res.status(500).json({ error: message });
  }
});

// ============ Brand Keywords ============

// Get brand keywords for project
router.get('/:projectId/brand-keywords', async (req: Request, res: Response) => {
  try {
    const keywords = await brandKeywordService.findByProject(req.params.projectId);
    res.json(keywords);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch keywords';
    res.status(500).json({ error: message });
  }
});

// Upsert brand keywords
router.post('/:projectId/brand-keywords', async (req: Request, res: Response) => {
  try {
    const { keywords } = req.body;
    if (!Array.isArray(keywords)) {
      return res.status(400).json({ error: 'Keywords array required' });
    }

    const result = await brandKeywordService.upsertMany(req.params.projectId, keywords);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save keywords';
    res.status(500).json({ error: message });
  }
});

// Delete brand keyword
router.delete('/brand-keywords/:id', async (req: Request, res: Response) => {
  try {
    await brandKeywordService.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete keyword';
    res.status(500).json({ error: message });
  }
});

// ============ Category Keywords ============

// Get category keywords for project
router.get('/:projectId/category-keywords', async (req: Request, res: Response) => {
  try {
    const { group } = req.query;
    const keywords = group
      ? await categoryKeywordService.findByGroup(req.params.projectId, group as string)
      : await categoryKeywordService.findByProject(req.params.projectId);
    res.json(keywords);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch keywords';
    res.status(500).json({ error: message });
  }
});

// Upsert category keywords
router.post('/:projectId/category-keywords', async (req: Request, res: Response) => {
  try {
    const { keywords } = req.body;
    if (!Array.isArray(keywords)) {
      return res.status(400).json({ error: 'Keywords array required' });
    }

    const result = await categoryKeywordService.upsertMany(req.params.projectId, keywords);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save keywords';
    res.status(500).json({ error: message });
  }
});

// Delete category keyword
router.delete('/category-keywords/:id', async (req: Request, res: Response) => {
  try {
    await categoryKeywordService.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete keyword';
    res.status(500).json({ error: message });
  }
});

// ============ Competitors ============

// Get competitors for project
router.get('/:projectId/competitors', async (req: Request, res: Response) => {
  try {
    const competitors = await competitorService.findByProject(req.params.projectId);
    res.json(competitors);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch competitors';
    res.status(500).json({ error: message });
  }
});

// Add competitor
router.post('/:projectId/competitors', async (req: Request, res: Response) => {
  try {
    const { domain, brandName, brandKeywords } = req.body;
    if (!domain || !brandName) {
      return res.status(400).json({ error: 'Domain and brandName required' });
    }

    const competitor = await competitorService.create({
      projectId: req.params.projectId,
      domain,
      brandName,
      brandKeywords,
    });
    res.status(201).json(competitor);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add competitor';
    res.status(500).json({ error: message });
  }
});

// Update competitor
router.put('/competitors/:id', async (req: Request, res: Response) => {
  try {
    const { domain, brandName, brandKeywords } = req.body;
    const competitor = await competitorService.update(req.params.id, {
      domain,
      brandName,
      brandKeywords,
    });
    res.json(competitor);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update competitor';
    res.status(500).json({ error: message });
  }
});

// Delete competitor
router.delete('/competitors/:id', async (req: Request, res: Response) => {
  try {
    await competitorService.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete competitor';
    res.status(500).json({ error: message });
  }
});

// ============ Snapshots (Historical Tracking) ============

// Get snapshots for project
router.get('/:projectId/snapshots', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 30;
    const snapshots = await snapshotService.findByProject(req.params.projectId, limit);
    res.json(snapshots);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch snapshots';
    res.status(500).json({ error: message });
  }
});

// Get latest snapshot
router.get('/:projectId/snapshots/latest', async (req: Request, res: Response) => {
  try {
    const snapshot = await snapshotService.findLatest(req.params.projectId);
    if (!snapshot) {
      return res.status(404).json({ error: 'No snapshots found' });
    }
    res.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch snapshot';
    res.status(500).json({ error: message });
  }
});

// Get snapshot history for date range
router.get('/:projectId/snapshots/history', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate required' });
    }

    const snapshots = await snapshotService.getHistory(
      req.params.projectId,
      new Date(startDate as string),
      new Date(endDate as string)
    );
    res.json(snapshots);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch history';
    res.status(500).json({ error: message });
  }
});

// Create snapshot (save current metrics)
router.post('/:projectId/snapshots', async (req: Request, res: Response) => {
  try {
    const {
      shareOfSearch,
      brandVolume,
      totalBrandVolume,
      shareOfVoice,
      visibleVolume,
      totalMarketVolume,
      growthGap,
      interpretation,
      keywordBreakdown,
      competitorMetrics: compMetrics,
    } = req.body;

    // Create main snapshot
    const snapshot = await snapshotService.create({
      projectId: req.params.projectId,
      shareOfSearch,
      brandVolume,
      totalBrandVolume,
      shareOfVoice,
      visibleVolume,
      totalMarketVolume,
      growthGap,
      interpretation,
      keywordBreakdown,
    });

    // Create competitor metrics if provided
    if (Array.isArray(compMetrics)) {
      for (const cm of compMetrics) {
        await competitorMetricsService.create({
          snapshotId: snapshot.id,
          competitorId: cm.competitorId,
          shareOfVoice: cm.shareOfVoice,
          visibleVolume: cm.visibleVolume,
          rankedKeywords: cm.rankedKeywords,
          avgPosition: cm.avgPosition,
          keywordRankings: cm.keywordRankings,
        });
      }
    }

    // Fetch complete snapshot with relations
    const completeSnapshot = await snapshotService.findLatest(req.params.projectId);
    res.status(201).json(completeSnapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create snapshot';
    res.status(500).json({ error: message });
  }
});

export default router;
