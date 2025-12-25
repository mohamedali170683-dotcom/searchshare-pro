/**
 * Calculations Service
 * Handles SOS, SOV, and Gap calculations
 */

// CTR model based on position (Sistrix/industry averages)
const CTR_BY_POSITION = {
  1: 0.316,
  2: 0.158,
  3: 0.110,
  4: 0.077,
  5: 0.053,
  6: 0.043,
  7: 0.035,
  8: 0.030,
  9: 0.026,
  10: 0.023
};

/**
 * Get CTR for a SERP position
 */
function getCTR(position) {
  if (!position || position > 100) return 0;
  if (position <= 10) return CTR_BY_POSITION[position];
  if (position <= 20) return 0.01;
  if (position <= 50) return 0.005;
  return 0.001;
}

/**
 * Calculate metrics snapshot
 */
export function calculateSnapshot(project) {
  const { brand, competitors, marketKeywords, positions, expandedKeywords, expandedTotalMarketVolume, expansionStats } = project;

  const allBrands = [
    { ...brand, isBrand: true },
    ...(competitors || []).map(c => ({ ...c, isBrand: false }))
  ];

  // Share of Search
  const totalBrandVolume = allBrands.reduce((sum, b) => sum + (b.volume || 0), 0);

  allBrands.forEach(b => {
    b.sos = totalBrandVolume > 0
      ? ((b.volume || 0) / totalBrandVolume) * 100
      : 0;
  });

  // Share of Voice
  // Use seed keywords for position-based visibility calculation
  const seedKeywords = marketKeywords || [];
  const seedKeywordVolume = seedKeywords.reduce((sum, k) => sum + (k.volume || 0), 0);

  // Use expanded Total Market Volume if available, otherwise use seed keywords volume
  const hasExpandedData = expandedKeywords && expandedTotalMarketVolume > 0;
  const totalMarketVolume = hasExpandedData ? expandedTotalMarketVolume : seedKeywordVolume;

  allBrands.forEach(b => {
    let visibleVolume = 0;

    // Calculate visible volume based on seed keywords positions
    // Note: For a more accurate SOV, we'd need positions for all expanded keywords
    // Currently using seed keywords for visibility calculation
    seedKeywords.forEach((kw, idx) => {
      const pos = positions?.[idx]?.[b.name];
      const ctr = getCTR(pos);
      visibleVolume += (kw.volume || 0) * ctr;
    });

    b.visibleVolume = Math.round(visibleVolume);
    b.sov = totalMarketVolume > 0
      ? (visibleVolume / totalMarketVolume) * 100
      : 0;
  });

  const brandMetrics = allBrands.find(b => b.isBrand);
  const gap = (brandMetrics?.sov || 0) - (brandMetrics?.sos || 0);

  let status = 'neutral';
  if (gap > 5) status = 'growing';
  else if (gap < -5) status = 'declining';

  return {
    date: new Date().toISOString().slice(0, 7),
    timestamp: new Date().toISOString(),
    brandVolume: brand?.volume || 0,
    totalBrandVolume,
    totalMarketVolume,
    seedKeywordVolume,
    sos: brandMetrics?.sos || 0,
    sov: brandMetrics?.sov || 0,
    visibleVolume: brandMetrics?.visibleVolume || 0,
    gap,
    status,
    allBrands,
    // Expansion metadata
    hasExpandedData,
    expansionStats: hasExpandedData ? expansionStats : null,
    expandedKeywordCount: hasExpandedData ? expandedKeywords.length : 0,
    seedKeywordCount: seedKeywords.length
  };
}

/**
 * Generate recommendations based on metrics
 */
export function generateRecommendations(snapshot, project) {
  const recommendations = [];
  const { sos, sov, gap, allBrands } = snapshot;

  if (gap > 5) {
    recommendations.push({
      priority: 'low',
      icon: '🚀',
      title: 'Strong Growth Position',
      message: `Your SOV (${sov.toFixed(1)}%) exceeds SOS (${sos.toFixed(1)}%) by ${gap.toFixed(1)}pp. This predicts market share growth.`
    });
  } else if (gap < -5) {
    recommendations.push({
      priority: 'high',
      icon: '⚠️',
      title: 'Visibility Gap Alert',
      message: `Your SOS (${sos.toFixed(1)}%) exceeds SOV (${sov.toFixed(1)}%) by ${Math.abs(gap).toFixed(1)}pp. Prioritize SEO investment.`
    });
  } else {
    recommendations.push({
      priority: 'medium',
      icon: '📊',
      title: 'Balanced Position',
      message: `SOS and SOV are aligned (${Math.abs(gap).toFixed(1)}pp gap). Push SOV higher to drive growth.`
    });
  }

  if (allBrands && allBrands.length > 0) {
    const sortedBySOS = [...allBrands].sort((a, b) => b.sos - a.sos);
    const sosRank = sortedBySOS.findIndex(b => b.isBrand) + 1;

    if (sosRank === 1) {
      recommendations.push({
        priority: 'low',
        icon: '👑',
        title: 'Brand Demand Leader',
        message: `You lead in Share of Search with ${sos.toFixed(1)}%.`
      });
    } else if (sortedBySOS[0]) {
      const leader = sortedBySOS[0];
      recommendations.push({
        priority: 'medium',
        icon: '🎯',
        title: `Gap to ${leader.name}`,
        message: `${leader.name} leads SOS with ${leader.sos.toFixed(1)}% vs your ${sos.toFixed(1)}%.`
      });
    }
  }

  if (sov < 10 && (project?.marketKeywords?.length || 0) > 0) {
    recommendations.push({
      priority: 'high',
      icon: '🔍',
      title: 'Low Category Visibility',
      message: `Only ${sov.toFixed(1)}% visibility on market keywords. Focus on SEO improvements.`
    });
  }

  return recommendations;
}
