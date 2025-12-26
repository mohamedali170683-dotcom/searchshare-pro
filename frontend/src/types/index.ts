export interface BrandKeyword {
  keyword: string;
  searchVolume: number;
  isOwnBrand: boolean;
}

export interface RankedKeyword {
  keyword: string;
  searchVolume: number;
  position: number;
  url?: string;
  ctr?: number;
  visibleVolume?: number;
}

export interface SOSResult {
  shareOfSearch: number;
  brandVolume: number;
  totalBrandVolume: number;
}

export interface SOVResult {
  shareOfVoice: number;
  visibleVolume: number;
  totalMarketVolume: number;
  keywordBreakdown: RankedKeyword[];
}

export interface GrowthGapResult {
  gap: number;
  interpretation: 'growth_potential' | 'missing_opportunities' | 'balanced';
}

export interface CalculationResults {
  sos: SOSResult;
  sov: SOVResult;
  gap: GrowthGapResult;
}

export interface APIConfig {
  login: string;
  password: string;
  domain: string;
  locationCode: number;
  languageCode: string;
}

export const LOCATIONS: Record<string, number> = {
  germany: 2276,
  usa: 2840,
  uk: 2826,
  france: 2250,
  spain: 2724
};
