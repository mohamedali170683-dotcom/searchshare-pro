import axios from 'axios';
import { RankedKeyword } from '../types/index.js';

interface SearchVolumeResult {
  keyword: string;
  searchVolume: number;
  competition?: number;
  cpc?: number;
}

interface SerpCompetitor {
  domain: string;
  avgPosition: number;
  sumPosition: number;
  intersections: number;
  competitorRelevance: number;
}

interface KeywordSuggestion {
  keyword: string;
  searchVolume: number;
  competition?: number;
  cpc?: number;
  keywordDifficulty?: number;
}

export class DataForSEOClient {
  private auth: string;
  private baseUrl = 'https://api.dataforseo.com/v3';

  constructor(login: string, password: string) {
    this.auth = Buffer.from(`${login}:${password}`).toString('base64');
  }

  private async request(endpoint: string, data: unknown[]) {
    const response = await axios.post(`${this.baseUrl}${endpoint}`, data, {
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  // Test API connection and get balance
  async testConnection(): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      const response = await axios.get(`${this.baseUrl}/appendix/user_data`, {
        headers: {
          'Authorization': `Basic ${this.auth}`
        }
      });

      const balance = response.data.tasks?.[0]?.result?.[0]?.money?.balance;
      return { success: true, balance };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      return { success: false, error: errorMessage };
    }
  }

  // Get search volume for keywords (Google Ads data)
  async getSearchVolume(
    keywords: string[],
    locationCode: number,
    languageCode: string
  ): Promise<SearchVolumeResult[]> {
    const response = await this.request('/keywords_data/google_ads/search_volume/live', [{
      keywords,
      location_code: locationCode,
      language_code: languageCode
    }]);

    const results = response.tasks?.[0]?.result || [];
    return results.map((item: {
      keyword: string;
      search_volume?: number;
      competition?: number;
      cpc?: number;
    }) => ({
      keyword: item.keyword,
      searchVolume: item.search_volume || 0,
      competition: item.competition,
      cpc: item.cpc
    }));
  }

  // Get DataForSEO refined search volume (clickstream-normalized, more accurate)
  async getClickstreamSearchVolume(
    keywords: string[],
    locationCode: number,
    languageCode: string
  ): Promise<SearchVolumeResult[]> {
    const response = await this.request('/keywords_data/clickstream_data/dataforseo_search_volume/live', [{
      keywords,
      location_code: locationCode,
      language_code: languageCode,
      use_clickstream: true
    }]);

    const results = response.tasks?.[0]?.result || [];
    return results.map((item: {
      keyword: string;
      search_volume?: number;
    }) => ({
      keyword: item.keyword,
      searchVolume: item.search_volume || 0
    }));
  }

  // Get ranked keywords for a domain (for SOV)
  async getRankedKeywords(
    domain: string,
    locationCode: number,
    languageCode: string,
    limit = 1000
  ): Promise<RankedKeyword[]> {
    // Clean domain
    const cleanDomain = domain
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('/')[0]
      .toLowerCase();

    const response = await this.request('/dataforseo_labs/google/ranked_keywords/live', [{
      target: cleanDomain,
      location_code: locationCode,
      language_code: languageCode,
      item_types: ['organic'],
      limit,
      filters: [
        ['keyword_data.keyword_info.search_volume', '>', 0],
        'and',
        ['ranked_serp_element.serp_item.rank_group', '<=', 20]
      ],
      order_by: ['keyword_data.keyword_info.search_volume,desc']
    }]);

    const items = response.tasks?.[0]?.result?.[0]?.items || [];

    return items.map((item: {
      keyword_data: {
        keyword: string;
        keyword_info: { search_volume?: number };
      };
      ranked_serp_element: {
        serp_item: {
          rank_group: number;
          relative_url?: string;
        };
      };
    }) => ({
      keyword: item.keyword_data.keyword,
      searchVolume: item.keyword_data.keyword_info.search_volume || 0,
      position: item.ranked_serp_element.serp_item.rank_group,
      url: item.ranked_serp_element.serp_item.relative_url
    }));
  }

  // Get SERP competitors for specific keywords
  async getSerpCompetitors(
    keywords: string[],
    locationCode: number,
    languageCode: string,
    limit = 100
  ): Promise<SerpCompetitor[]> {
    const response = await this.request('/dataforseo_labs/google/serp_competitors/live', [{
      keywords,
      location_code: locationCode,
      language_code: languageCode,
      limit
    }]);

    const items = response.tasks?.[0]?.result?.[0]?.items || [];

    return items.map((item: {
      domain: string;
      avg_position: number;
      sum_position: number;
      intersections: number;
      competitor_relevance: number;
    }) => ({
      domain: item.domain,
      avgPosition: item.avg_position,
      sumPosition: item.sum_position,
      intersections: item.intersections,
      competitorRelevance: item.competitor_relevance
    }));
  }

  // Get keyword suggestions for a domain
  async getKeywordsForSite(
    domain: string,
    locationCode: number,
    languageCode: string,
    limit = 500
  ): Promise<KeywordSuggestion[]> {
    const cleanDomain = domain
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('/')[0]
      .toLowerCase();

    const response = await this.request('/dataforseo_labs/google/keywords_for_site/live', [{
      target: cleanDomain,
      location_code: locationCode,
      language_code: languageCode,
      include_serp_info: true,
      limit
    }]);

    const items = response.tasks?.[0]?.result?.[0]?.items || [];

    return items.map((item: {
      keyword: string;
      keyword_info: {
        search_volume?: number;
        competition?: number;
        cpc?: number;
      };
      keyword_properties?: {
        keyword_difficulty?: number;
      };
    }) => ({
      keyword: item.keyword,
      searchVolume: item.keyword_info?.search_volume || 0,
      competition: item.keyword_info?.competition,
      cpc: item.keyword_info?.cpc,
      keywordDifficulty: item.keyword_properties?.keyword_difficulty
    }));
  }

  // Get related keywords (keyword ideas)
  async getRelatedKeywords(
    seedKeyword: string,
    locationCode: number,
    languageCode: string,
    limit = 100
  ): Promise<KeywordSuggestion[]> {
    const response = await this.request('/dataforseo_labs/google/related_keywords/live', [{
      keyword: seedKeyword,
      location_code: locationCode,
      language_code: languageCode,
      limit
    }]);

    const items = response.tasks?.[0]?.result?.[0]?.items || [];

    return items.map((item: {
      keyword_data: {
        keyword: string;
        keyword_info: {
          search_volume?: number;
          competition?: number;
          cpc?: number;
        };
      };
    }) => ({
      keyword: item.keyword_data.keyword,
      searchVolume: item.keyword_data.keyword_info?.search_volume || 0,
      competition: item.keyword_data.keyword_info?.competition,
      cpc: item.keyword_data.keyword_info?.cpc
    }));
  }

  // Get keyword suggestions from Google Ads
  async getKeywordIdeas(
    seedKeywords: string[],
    locationCode: number,
    languageCode: string,
    limit = 100
  ): Promise<KeywordSuggestion[]> {
    const response = await this.request('/keywords_data/google_ads/keywords_for_keywords/live', [{
      keywords: seedKeywords,
      location_code: locationCode,
      language_code: languageCode,
      sort_by: 'search_volume',
      limit
    }]);

    const results = response.tasks?.[0]?.result || [];

    return results.map((item: {
      keyword: string;
      search_volume?: number;
      competition?: number;
      cpc?: number;
    }) => ({
      keyword: item.keyword,
      searchVolume: item.search_volume || 0,
      competition: item.competition,
      cpc: item.cpc
    }));
  }

  // Get competitor keywords for comparison
  async getCompetitorKeywords(
    domains: string[],
    locationCode: number,
    languageCode: string
  ): Promise<Map<string, RankedKeyword[]>> {
    const results = new Map<string, RankedKeyword[]>();

    for (const domain of domains) {
      try {
        const keywords = await this.getRankedKeywords(domain, locationCode, languageCode, 100);
        results.set(domain, keywords);
      } catch (error) {
        console.error(`Failed to fetch keywords for ${domain}:`, error);
        results.set(domain, []);
      }
    }

    return results;
  }
}

export default DataForSEOClient;
