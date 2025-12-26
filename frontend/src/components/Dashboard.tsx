import React, { useState, useEffect } from 'react';
import { BrandKeyword, RankedKeyword, SOSResult, SOVResult, GrowthGapResult } from '../types';
import { calculateSOS, calculateSOV, calculateGrowthGap } from '../utils/calculations';
import { SAMPLE_BRAND_KEYWORDS, SAMPLE_RANKED_KEYWORDS } from '../utils/sampleData';
import MetricCard from './MetricCard';
import { SOVKeywordTable, SOSKeywordTable } from './KeywordTable';
import APIConfigPanel from './APIConfigPanel';
import { RefreshCw, Download, BarChart3 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [brandKeywords, setBrandKeywords] = useState<BrandKeyword[]>(SAMPLE_BRAND_KEYWORDS);
  const [rankedKeywords, setRankedKeywords] = useState<RankedKeyword[]>(SAMPLE_RANKED_KEYWORDS);
  const [sos, setSos] = useState<SOSResult | null>(null);
  const [sov, setSov] = useState<SOVResult | null>(null);
  const [gap, setGap] = useState<GrowthGapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [usingSampleData, setUsingSampleData] = useState(true);

  // Calculate metrics whenever data changes
  useEffect(() => {
    if (brandKeywords.length > 0) {
      const sosResult = calculateSOS(brandKeywords);
      setSos(sosResult);
    }

    if (rankedKeywords.length > 0) {
      const sovResult = calculateSOV(rankedKeywords);
      setSov(sovResult);
    }
  }, [brandKeywords, rankedKeywords]);

  // Calculate gap when both SOS and SOV are available
  useEffect(() => {
    if (sos && sov) {
      const gapResult = calculateGrowthGap(sos.shareOfSearch, sov.shareOfVoice);
      setGap(gapResult);
    }
  }, [sos, sov]);

  const handleFetchData = async (config: {
    login: string;
    password: string;
    domain: string;
    locationCode: number;
    languageCode: string;
  }) => {
    setLoading(true);
    try {
      // TODO: Implement actual API call when backend is ready
      // For now, use sample data
      console.log('Fetching data with config:', config);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Use sample data for demonstration
      setBrandKeywords(SAMPLE_BRAND_KEYWORDS);
      setRankedKeywords(SAMPLE_RANKED_KEYWORDS);
      setUsingSampleData(true);

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    const sosResult = calculateSOS(brandKeywords);
    const sovResult = calculateSOV(rankedKeywords);
    const gapResult = calculateGrowthGap(sosResult.shareOfSearch, sovResult.shareOfVoice);

    setSos(sosResult);
    setSov(sovResult);
    setGap(gapResult);
  };

  const handleExport = () => {
    const data = {
      sos,
      sov,
      gap,
      brandKeywords,
      rankedKeywords: sov?.keywordBreakdown || rankedKeywords
    };

    // Export as CSV
    const sovRows = (sov?.keywordBreakdown || []).map(kw =>
      `"${kw.keyword}",${kw.searchVolume},${kw.position},${kw.ctr},${kw.visibleVolume}`
    );

    const sosRows = brandKeywords.map(kw =>
      `"${kw.keyword}",${kw.searchVolume},${kw.isOwnBrand ? 'Own Brand' : 'Competitor'}`
    );

    const csv = [
      '# SearchShare Pro Export',
      `# Generated: ${new Date().toISOString()}`,
      '',
      '# Summary',
      `Share of Search,${sos?.shareOfSearch}%`,
      `Share of Voice,${sov?.shareOfVoice}%`,
      `Growth Gap,${gap?.gap}pp`,
      '',
      '# SOV Keywords',
      'Keyword,Volume,Position,CTR%,Visible Volume',
      ...sovRows,
      '',
      '# SOS Keywords',
      'Keyword,Volume,Type',
      ...sosRows
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `searchshare-pro-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-emerald-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">SearchShare Pro</h1>
                <p className="text-sm text-gray-500">Share of Search & Voice Analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {usingSampleData && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  Sample Data
                </span>
              )}
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh calculations"
              >
                <RefreshCw size={20} />
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API Configuration */}
        <div className="mb-8">
          <APIConfigPanel onFetch={handleFetchData} loading={loading} />
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {sos && (
            <MetricCard
              title="Share of Search"
              value={sos.shareOfSearch}
              type="sos"
              numerator={sos.brandVolume}
              denominator={sos.totalBrandVolume}
              formula="Your Brand Volume ÷ Total Brand Volumes × 100"
            />
          )}

          {sov && (
            <MetricCard
              title="Share of Voice"
              value={sov.shareOfVoice}
              type="sov"
              numerator={sov.visibleVolume}
              denominator={sov.totalMarketVolume}
              formula="Visible Volume ÷ Total Market Volume × 100"
            />
          )}

          {gap && (
            <MetricCard
              title="Growth Gap"
              value={gap.gap}
              type="gap"
              interpretation={gap.interpretation}
              formula="SOV - SOS (in percentage points)"
            />
          )}
        </div>

        {/* Keyword Tables */}
        <div className="space-y-8">
          {sov && sov.keywordBreakdown.length > 0 && (
            <SOVKeywordTable keywords={sov.keywordBreakdown} />
          )}

          {brandKeywords.length > 0 && (
            <SOSKeywordTable keywords={brandKeywords} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-400">
            SearchShare Pro - Built for SEO Professionals
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
