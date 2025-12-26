import { Router, Request, Response } from 'express';
import { DataForSEOClient } from '../services/DataForSEOClient.js';
import { calculateSOS, calculateSOV, calculateGrowthGap } from '../utils/calculations.js';
import { BrandKeyword, RankedKeyword } from '../types/index.js';

const router = Router();

// Test API connection
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password required' });
    }

    const client = new DataForSEOClient(login, password);
    const result = await client.testConnection();

    res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Test failed';
    res.status(500).json({ error: errorMessage });
  }
});

// Get search volumes for keywords (for SOS)
router.post('/search-volume', async (req: Request, res: Response) => {
  try {
    const { keywords, locationCode, languageCode, login, password } = req.body;

    if (!keywords?.length || !login || !password) {
      return res.status(400).json({ error: 'Keywords, login, and password required' });
    }

    const client = new DataForSEOClient(login, password);
    const volumes = await client.getSearchVolume(
      keywords,
      locationCode || 2276,
      languageCode || 'en'
    );

    res.json(volumes);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch volumes';
    res.status(500).json({ error: errorMessage });
  }
});

// Get ranked keywords for a domain (for SOV)
router.post('/ranked-keywords', async (req: Request, res: Response) => {
  try {
    const { domain, locationCode, languageCode, limit, login, password } = req.body;

    if (!domain || !login || !password) {
      return res.status(400).json({ error: 'Domain, login, and password required' });
    }

    const client = new DataForSEOClient(login, password);
    const keywords = await client.getRankedKeywords(
      domain,
      locationCode || 2276,
      languageCode || 'en',
      limit || 1000
    );

    res.json(keywords);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch keywords';
    res.status(500).json({ error: errorMessage });
  }
});

// Calculate SOS, SOV, and Gap
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { brandKeywords, rankedKeywords } = req.body as {
      brandKeywords: BrandKeyword[];
      rankedKeywords: RankedKeyword[];
    };

    if (!brandKeywords?.length || !rankedKeywords?.length) {
      return res.status(400).json({ error: 'Brand keywords and ranked keywords required' });
    }

    const sos = calculateSOS(brandKeywords);
    const sov = calculateSOV(rankedKeywords);
    const gap = calculateGrowthGap(sos.shareOfSearch, sov.shareOfVoice);

    res.json({ sos, sov, gap });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
    res.status(500).json({ error: errorMessage });
  }
});

// Full analysis - fetches all data and calculates metrics
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const {
      domain,
      brandKeywords: inputBrandKeywords,
      locationCode,
      languageCode,
      login,
      password
    } = req.body;

    if (!domain || !login || !password) {
      return res.status(400).json({ error: 'Domain, login, and password required' });
    }

    const client = new DataForSEOClient(login, password);

    // Fetch ranked keywords for SOV
    const rankedKeywords = await client.getRankedKeywords(
      domain,
      locationCode || 2276,
      languageCode || 'en'
    );

    // If brand keywords provided, use them; otherwise use default
    let brandKeywords: BrandKeyword[] = inputBrandKeywords;

    if (!brandKeywords?.length) {
      // Default brand keywords - extract from domain
      const brandName = domain.replace(/\.(com|de|co\.uk|net|org)$/i, '');
      brandKeywords = [
        { keyword: brandName, searchVolume: 10000, isOwnBrand: true }
      ];
    }

    // Calculate metrics
    const sos = calculateSOS(brandKeywords);
    const sov = calculateSOV(rankedKeywords);
    const gap = calculateGrowthGap(sos.shareOfSearch, sov.shareOfVoice);

    res.json({
      sos,
      sov,
      gap,
      brandKeywords,
      rankedKeywords: sov.keywordBreakdown
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
