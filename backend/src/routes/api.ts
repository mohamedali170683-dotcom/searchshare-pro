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

// Get search volumes for keywords (Google Ads data)
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

// Get clickstream-normalized search volumes (more accurate)
router.post('/clickstream-volume', async (req: Request, res: Response) => {
  try {
    const { keywords, locationCode, languageCode, login, password } = req.body;

    if (!keywords?.length || !login || !password) {
      return res.status(400).json({ error: 'Keywords, login, and password required' });
    }

    const client = new DataForSEOClient(login, password);
    const volumes = await client.getClickstreamSearchVolume(
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

// Get SERP competitors for keywords
router.post('/serp-competitors', async (req: Request, res: Response) => {
  try {
    const { keywords, locationCode, languageCode, limit, login, password } = req.body;

    if (!keywords?.length || !login || !password) {
      return res.status(400).json({ error: 'Keywords, login, and password required' });
    }

    const client = new DataForSEOClient(login, password);
    const competitors = await client.getSerpCompetitors(
      keywords,
      locationCode || 2276,
      languageCode || 'en',
      limit || 100
    );

    res.json(competitors);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch competitors';
    res.status(500).json({ error: errorMessage });
  }
});

// Get keyword suggestions for a domain
router.post('/keywords-for-site', async (req: Request, res: Response) => {
  try {
    const { domain, locationCode, languageCode, limit, login, password } = req.body;

    if (!domain || !login || !password) {
      return res.status(400).json({ error: 'Domain, login, and password required' });
    }

    const client = new DataForSEOClient(login, password);
    const suggestions = await client.getKeywordsForSite(
      domain,
      locationCode || 2276,
      languageCode || 'en',
      limit || 500
    );

    res.json(suggestions);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch suggestions';
    res.status(500).json({ error: errorMessage });
  }
});

// Get related keywords from seed keyword
router.post('/related-keywords', async (req: Request, res: Response) => {
  try {
    const { seedKeyword, locationCode, languageCode, limit, login, password } = req.body;

    if (!seedKeyword || !login || !password) {
      return res.status(400).json({ error: 'Seed keyword, login, and password required' });
    }

    const client = new DataForSEOClient(login, password);
    const keywords = await client.getRelatedKeywords(
      seedKeyword,
      locationCode || 2276,
      languageCode || 'en',
      limit || 100
    );

    res.json(keywords);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch keywords';
    res.status(500).json({ error: errorMessage });
  }
});

// Get keyword ideas from Google Ads
router.post('/keyword-ideas', async (req: Request, res: Response) => {
  try {
    const { seedKeywords, locationCode, languageCode, limit, login, password } = req.body;

    if (!seedKeywords?.length || !login || !password) {
      return res.status(400).json({ error: 'Seed keywords, login, and password required' });
    }

    const client = new DataForSEOClient(login, password);
    const ideas = await client.getKeywordIdeas(
      seedKeywords,
      locationCode || 2276,
      languageCode || 'en',
      limit || 100
    );

    res.json(ideas);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch ideas';
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
      competitorDomains,
      locationCode,
      languageCode,
      login,
      password
    } = req.body;

    if (!domain || !login || !password) {
      return res.status(400).json({ error: 'Domain, login, and password required' });
    }

    const client = new DataForSEOClient(login, password);

    // Fetch ranked keywords for SOV (your domain)
    const rankedKeywords = await client.getRankedKeywords(
      domain,
      locationCode || 2276,
      languageCode || 'en'
    );

    // If brand keywords provided, fetch their volumes; otherwise use default
    let brandKeywords: BrandKeyword[] = [];

    if (inputBrandKeywords?.length) {
      // Fetch volumes for all brand keywords
      const allBrandTerms = inputBrandKeywords.map((k: { keyword: string }) => k.keyword);
      const volumes = await client.getSearchVolume(
        allBrandTerms,
        locationCode || 2276,
        languageCode || 'en'
      );

      const volumeMap = new Map(volumes.map(v => [v.keyword.toLowerCase(), v.searchVolume]));

      brandKeywords = inputBrandKeywords.map((k: { keyword: string; isOwnBrand: boolean }) => ({
        keyword: k.keyword,
        searchVolume: volumeMap.get(k.keyword.toLowerCase()) || 0,
        isOwnBrand: k.isOwnBrand
      }));
    } else {
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

    // Fetch competitor data if provided
    let competitorData: Record<string, { rankedKeywords: RankedKeyword[] }> = {};
    if (competitorDomains?.length) {
      for (const compDomain of competitorDomains) {
        try {
          const compKeywords = await client.getRankedKeywords(
            compDomain,
            locationCode || 2276,
            languageCode || 'en',
            500
          );
          competitorData[compDomain] = { rankedKeywords: compKeywords };
        } catch (e) {
          competitorData[compDomain] = { rankedKeywords: [] };
        }
      }
    }

    res.json({
      sos,
      sov,
      gap,
      brandKeywords,
      rankedKeywords: sov.keywordBreakdown,
      competitorData
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
