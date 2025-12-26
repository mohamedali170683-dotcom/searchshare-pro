import axios from 'axios';
import { BrandKeyword, RankedKeyword, CalculationResults } from '../types';

const API_BASE = '/api';

interface SearchVolumeRequest {
  keywords: string[];
  locationCode: number;
  languageCode: string;
  login: string;
  password: string;
}

interface RankedKeywordsRequest {
  domain: string;
  locationCode: number;
  languageCode: string;
  limit?: number;
  login: string;
  password: string;
}

interface CalculateRequest {
  brandKeywords: BrandKeyword[];
  rankedKeywords: RankedKeyword[];
}

export const api = {
  // Get search volumes for brand keywords
  async getSearchVolume(request: SearchVolumeRequest): Promise<BrandKeyword[]> {
    const response = await axios.post(`${API_BASE}/search-volume`, request);
    return response.data;
  },

  // Get ranked keywords for a domain
  async getRankedKeywords(request: RankedKeywordsRequest): Promise<RankedKeyword[]> {
    const response = await axios.post(`${API_BASE}/ranked-keywords`, request);
    return response.data;
  },

  // Calculate SOS, SOV, and Gap
  async calculate(request: CalculateRequest): Promise<CalculationResults> {
    const response = await axios.post(`${API_BASE}/calculate`, request);
    return response.data;
  },

  // Test API connection
  async testConnection(login: string, password: string): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      const response = await axios.post(`${API_BASE}/test-connection`, { login, password });
      return { success: true, balance: response.data.balance };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      return { success: false, error: errorMessage };
    }
  }
};

export default api;
