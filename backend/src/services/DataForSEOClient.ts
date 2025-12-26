import axios from 'axios';
import { RankedKeyword } from '../types/index.js';

interface SearchVolumeResult {
  keyword: string;
  searchVolume: number;
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

  // Get search volume for brand keywords (for SOS)
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
    return results.map((item: { keyword: string; search_volume?: number }) => ({
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
