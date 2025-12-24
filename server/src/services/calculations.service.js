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
 * @param {Object} project - Project data
 * @returns {Object} Calculated snapshot
 */
export function calculateSnapshot(project) {
  const { brand, competitors, marketKeywords, positions } = project;

  // Combine brand and competitors
  const allBrands = [
    { ...brand, isBrand: true },
    ...(competitors || []).map(c => ({ ...c, isBrand: false }))
  ];

  // =========================================
  // SHARE OF SEARCH (SOS)
  // Formula: Brand Volume / Total Brand Volumes × 100
  // =========================================
  const totalBrandVolume = allBrands.reduce((sum, b) => sum + (b.volume || 0), 0);

  allBrands.forEach(b => {
    b.sos = totalBrandVolume > 0
      ? ((b.volume || 0) / totalBrandVolume) * 100
      : 0;
  });

  // =========================================
  // SHARE OF VOICE (SOV)
  // Formula: Visible Volume / Total Market Volume × 100
  // Visible Volume = Σ(Keyword Volume × CTR(position))
  // =========================================
  const keywords = marketKeywords || [];
  const totalMarketVolume = keywords.reduce((sum, k) => sum + (k.volume || 0), 0);

  allBrands.forEach(b => {
    let visibleVolume = 0;

    keywords.forEach((kw, idx) => {
      const pos = positions?.[idx]?.[b.name];
      const ctr = getCTR(pos);
      visibleVolume += (kw.volume || 0) * ctr;
    });

    b.visibleVolume = Math.round(visibleVolume);
    b.sov = totalMarketVolume > 0
      ? (visibleVolume / totalMarketVolume) * 100
      : 0;
  });

  // Find brand metrics
  const brandMetrics = allBrands.find(b => b.isBrand);
  const gap = (brandMetrics?.sov || 0) - (brandMetrics?.sos || 0);

  // Determine status based on gap
  let status = 'neutral';
  if (gap > 5) {
    status = 'growing';
  } else if (gap < -5) {
    status = 'declining';
  }

  return {
    date: new Date().toISOString().slice(0, 7), // YYYY-MM
    timestamp: new Date().toISOString(),
    brandVolume: brand?.volume || 0,
    totalBrandVolume,
    totalMarketVolume,
    sos: brandMetrics?.sos || 0,
    sov: brandMetrics?.sov || 0,
    visibleVolume: brandMetrics?.visibleVolume || 0,
    gap,
    status,
    allBrands
  };
}

/**
 * Generate recommendations based on metrics
 * @param {Object} snapshot - Metrics snapshot
 * @param {Object} project - Project data
 * @returns {Array} Recommendations
 */
export function generateRecommendations(snapshot, project) {
  const recommendations = [];
  const { sos, sov, gap, allBrands } = snapshot;

  // Growth gap analysis
  if (gap > 5) {
    recommendations.push({
      priority: 'low',
      icon: '🚀',
      title: 'Strong Growth Position',
      message: `Your SOV (${sov.toFixed(1)}%) exceeds SOS (${sos.toFixed(1)}%) by ${gap.toFixed(1)}pp. Based on Binet & Field's research, this "excess share of voice" predicts market share growth. Keep investing in visibility.`
    });
  } else if (gap < -5) {
    recommendations.push({
      priority: 'high',
      icon: '⚠️',
      title: 'Visibility Gap Alert',
      message: `Your SOS (${sos.toFixed(1)}%) exceeds SOV (${sov.toFixed(1)}%) by ${Math.abs(gap).toFixed(1)}pp. People are searching for your brand, but you're losing visibility on category terms. Prioritize SEO investment.`
    });
  } else {
    recommendations.push({
      priority: 'medium',
      icon: '📊',
      title: 'Balanced Position',
      message: `Your SOS and SOV are closely aligned (${Math.abs(gap).toFixed(1)}pp gap). To drive growth, aim for SOV to exceed SOS by 5-10 percentage points.`
    });
  }

  // Market position analysis
  if (allBrands && allBrands.length > 0) {
    const sortedBySOS = [...allBrands].sort((a, b) => b.sos - a.sos);
    const brandIndex = sortedBySOS.findIndex(b => b.isBrand);
    const sosRank = brandIndex + 1;

    if (sosRank === 1) {
      recommendations.push({
        priority: 'low',
        icon: '👑',
        title: 'Brand Demand Leader',
        message: `You lead in Share of Search with ${sos.toFixed(1)}%. Focus on maintaining brand salience and defending against challenger brands.`
      });
    } else if (sortedBySOS[0]) {
      const leader = sortedBySOS[0];
      recommendations.push({
        priority: 'medium',
        icon: '🎯',
        title: `Gap to ${leader.name}`,
        message: `${leader.name} leads SOS with ${leader.sos.toFixed(1)}% vs your ${sos.toFixed(1)}%. Consider brand campaigns targeting their audience segments.`
      });
    }
  }

  // SOV-specific recommendations
  if (sov < 10 && (project?.marketKeywords?.length || 0) > 0) {
    recommendations.push({
      priority: 'high',
      icon: '🔍',
      title: 'Low Category Visibility',
      message: `Only ${sov.toFixed(1)}% visibility on market keywords. Audit your SEO strategy - focus on ranking improvements for high-volume category terms.`
    });
  }

  return recommendations;
}

/**
 * Calculate SOS trends from historical data
 * @param {Object} historicalData - Historical volumes by brand
 * @param {Array} brandNames - Brand names to calculate trends for
 * @returns {Object} Trends by brand and time period
 */
export function calculateSOSTrend(historicalData, brandNames) {
  const trends = {};
  const now = new Date();
  const month6Ago = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const month12Ago = new Date(now.getFullYear(), now.getMonth() - 12, 1);

  // Helper to get volume for a specific month
  const getVolumeForMonth = (monthly, year, month) => {
    const entry = monthly.find(m => m.year === year && m.month === month);
    return entry ? entry.volume : 0;
  };

  // Calculate for each time period
  const periods = [
    { name: 'now', date: now },
    { name: '6m', date: month6Ago },
    { name: '12m', date: month12Ago }
  ];

  periods.forEach(period => {
    let totalVolume = 0;
    const brandVolumes = {};

    brandNames.forEach(name => {
      const data = historicalData[name.toLowerCase()];
      if (data && data.monthly) {
        const volume = period.name === 'now'
          ? data.current
          : getVolumeForMonth(data.monthly, period.date.getFullYear(), period.date.getMonth() + 1);
        brandVolumes[name] = volume;
        totalVolume += volume;
      }
    });

    // Calculate SOS for each brand at this time period
    brandNames.forEach(name => {
      if (!trends[name]) trends[name] = {};
      const volume = brandVolumes[name] || 0;
      trends[name][period.name] = totalVolume > 0
        ? (volume / totalVolume) * 100
        : 0;
    });
  });

  return trends;
}
