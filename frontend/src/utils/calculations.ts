import { BrandKeyword, RankedKeyword, SOSResult, SOVResult, GrowthGapResult } from '../types';

// CTR Curve based on SERP position
const CTR_CURVE: Record<number, number> = {
  1: 0.28,   // 28%
  2: 0.15,   // 15%
  3: 0.09,   // 9%
  4: 0.06,   // 6%
  5: 0.04,   // 4%
  6: 0.03,   // 3%
  7: 0.025,  // 2.5%
  8: 0.02,   // 2%
  9: 0.018,  // 1.8%
  10: 0.015, // 1.5%
  11: 0.012,
  12: 0.01,
  13: 0.009,
  14: 0.008,
  15: 0.007,
  16: 0.006,
  17: 0.005,
  18: 0.004,
  19: 0.003,
  20: 0.002
};

export function getCTR(position: number): number {
  if (position <= 0) return 0;
  if (position > 20) return 0.001;
  return CTR_CURVE[position] || 0.001;
}

// Calculate Share of Search
export function calculateSOS(brandKeywords: BrandKeyword[]): SOSResult {
  const brandVolume = brandKeywords
    .filter(k => k.isOwnBrand)
    .reduce((sum, k) => sum + k.searchVolume, 0);

  const totalBrandVolume = brandKeywords
    .reduce((sum, k) => sum + k.searchVolume, 0);

  const shareOfSearch = totalBrandVolume > 0
    ? (brandVolume / totalBrandVolume) * 100
    : 0;

  return {
    shareOfSearch: Math.round(shareOfSearch * 10) / 10,
    brandVolume,
    totalBrandVolume
  };
}

// Calculate Share of Voice
export function calculateSOV(rankedKeywords: RankedKeyword[]): SOVResult {
  const keywordBreakdown = rankedKeywords.map(kw => {
    const ctr = getCTR(kw.position);
    const visibleVolume = kw.searchVolume * ctr;
    return {
      ...kw,
      ctr: Math.round(ctr * 1000) / 10, // Convert to percentage with 1 decimal
      visibleVolume: Math.round(visibleVolume)
    };
  });

  const visibleVolume = keywordBreakdown.reduce((sum, k) => sum + (k.visibleVolume || 0), 0);
  const totalMarketVolume = rankedKeywords.reduce((sum, k) => sum + k.searchVolume, 0);

  const shareOfVoice = totalMarketVolume > 0
    ? (visibleVolume / totalMarketVolume) * 100
    : 0;

  return {
    shareOfVoice: Math.round(shareOfVoice * 10) / 10,
    visibleVolume: Math.round(visibleVolume),
    totalMarketVolume,
    keywordBreakdown
  };
}

// Calculate Growth Gap
export function calculateGrowthGap(sos: number, sov: number): GrowthGapResult {
  const gap = sov - sos;
  let interpretation: 'growth_potential' | 'missing_opportunities' | 'balanced';

  if (gap > 2) interpretation = 'growth_potential';
  else if (gap < -2) interpretation = 'missing_opportunities';
  else interpretation = 'balanced';

  return {
    gap: Math.round(gap * 10) / 10,
    interpretation
  };
}

// Format number with thousands separator
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

// Get position badge color
export function getPositionColor(position: number): string {
  if (position <= 3) return 'bg-emerald-100 text-emerald-800';
  if (position <= 10) return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-600';
}

// Get gap interpretation text and color
export function getGapInfo(interpretation: string): { text: string; color: string; icon: string } {
  switch (interpretation) {
    case 'growth_potential':
      return {
        text: 'Growth Potential',
        color: 'text-emerald-600 border-emerald-500',
        icon: '📈'
      };
    case 'missing_opportunities':
      return {
        text: 'Missing Opportunities',
        color: 'text-red-600 border-red-500',
        icon: '⚠️'
      };
    default:
      return {
        text: 'Balanced',
        color: 'text-blue-600 border-blue-500',
        icon: '✓'
      };
  }
}
