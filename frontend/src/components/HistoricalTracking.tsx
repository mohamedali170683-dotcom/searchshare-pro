import React, { useState } from 'react';

interface Snapshot {
  id: string;
  snapshotDate: string;
  shareOfSearch: number;
  shareOfVoice: number;
  growthGap: number;
  interpretation: string;
  brandVolume: number;
  totalBrandVolume: number;
  visibleVolume: number;
  totalMarketVolume: number;
}

interface HistoricalTrackingProps {
  snapshots: Snapshot[];
  onSaveSnapshot: () => void;
  loading?: boolean;
}

const HistoricalTracking: React.FC<HistoricalTrackingProps> = ({
  snapshots,
  onSaveSnapshot,
  loading = false,
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const filterSnapshots = (data: Snapshot[]): Snapshot[] => {
    if (timeRange === 'all') return data;

    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return data.filter(s => new Date(s.snapshotDate) >= cutoff);
  };

  const filteredSnapshots = filterSnapshots(snapshots);

  const getChangeIndicator = (current: number, previous: number | undefined) => {
    if (previous === undefined) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 0.1) return <span className="text-gray-500">-</span>;
    if (diff > 0) return <span className="text-green-600">+{diff.toFixed(1)}%</span>;
    return <span className="text-red-600">{diff.toFixed(1)}%</span>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInterpretationBadge = (interpretation: string) => {
    switch (interpretation) {
      case 'growth_potential':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Growth Potential</span>;
      case 'missing_opportunities':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Missing Opportunities</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">Balanced</span>;
    }
  };

  // Calculate trends
  const latestSnapshot = filteredSnapshots[0];
  const previousSnapshot = filteredSnapshots[1];
  const oldestSnapshot = filteredSnapshots[filteredSnapshots.length - 1];

  const overallTrend = latestSnapshot && oldestSnapshot && latestSnapshot !== oldestSnapshot
    ? {
        sos: latestSnapshot.shareOfSearch - oldestSnapshot.shareOfSearch,
        sov: latestSnapshot.shareOfVoice - oldestSnapshot.shareOfVoice,
        gap: latestSnapshot.growthGap - oldestSnapshot.growthGap,
      }
    : null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Historical Tracking</h2>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {range === 'all' ? 'All' : range}
              </button>
            ))}
          </div>
          <button
            onClick={onSaveSnapshot}
            disabled={loading}
            className={`px-4 py-2 rounded text-white text-sm ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {loading ? 'Saving...' : 'Save Snapshot'}
          </button>
        </div>
      </div>

      {/* Trend Summary */}
      {overallTrend && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 mb-1">SOS Trend</div>
            <div className={`text-2xl font-bold ${overallTrend.sos >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {overallTrend.sos >= 0 ? '+' : ''}{overallTrend.sos.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">vs {timeRange === 'all' ? 'first' : timeRange} ago</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-purple-600 mb-1">SOV Trend</div>
            <div className={`text-2xl font-bold ${overallTrend.sov >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {overallTrend.sov >= 0 ? '+' : ''}{overallTrend.sov.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">vs {timeRange === 'all' ? 'first' : timeRange} ago</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="text-sm text-amber-600 mb-1">Gap Trend</div>
            <div className={`text-2xl font-bold ${overallTrend.gap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {overallTrend.gap >= 0 ? '+' : ''}{overallTrend.gap.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">vs {timeRange === 'all' ? 'first' : timeRange} ago</div>
          </div>
        </div>
      )}

      {/* Snapshots Table */}
      {filteredSnapshots.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">No historical data yet</p>
          <p className="text-sm">Click "Save Snapshot" to record current metrics</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-600">Date</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600">SOS</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600">Change</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600">SOV</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600">Change</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600">Gap</th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSnapshots.map((snapshot, index) => {
                const prevSnapshot = filteredSnapshots[index + 1];
                return (
                  <tr key={snapshot.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 text-gray-800">{formatDate(snapshot.snapshotDate)}</td>
                    <td className="py-3 px-2 text-right font-medium text-blue-600">
                      {snapshot.shareOfSearch.toFixed(1)}%
                    </td>
                    <td className="py-3 px-2 text-right">
                      {getChangeIndicator(snapshot.shareOfSearch, prevSnapshot?.shareOfSearch)}
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-purple-600">
                      {snapshot.shareOfVoice.toFixed(1)}%
                    </td>
                    <td className="py-3 px-2 text-right">
                      {getChangeIndicator(snapshot.shareOfVoice, prevSnapshot?.shareOfVoice)}
                    </td>
                    <td className={`py-3 px-2 text-right font-medium ${
                      snapshot.growthGap > 0 ? 'text-green-600' : snapshot.growthGap < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {snapshot.growthGap > 0 ? '+' : ''}{snapshot.growthGap.toFixed(1)}%
                    </td>
                    <td className="py-3 px-2 text-center">
                      {getInterpretationBadge(snapshot.interpretation)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mini Chart Visualization */}
      {filteredSnapshots.length > 1 && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-600 mb-3">Trend Visualization</h3>
          <div className="h-32 flex items-end gap-1">
            {[...filteredSnapshots].reverse().map((snapshot, index) => {
              const maxSOS = Math.max(...filteredSnapshots.map(s => s.shareOfSearch));
              const maxSOV = Math.max(...filteredSnapshots.map(s => s.shareOfVoice));
              const sosHeight = maxSOS > 0 ? (snapshot.shareOfSearch / maxSOS) * 100 : 0;
              const sovHeight = maxSOV > 0 ? (snapshot.shareOfVoice / maxSOV) * 100 : 0;

              return (
                <div key={snapshot.id} className="flex-1 flex gap-0.5 items-end" title={formatDate(snapshot.snapshotDate)}>
                  <div
                    className="flex-1 bg-blue-400 rounded-t"
                    style={{ height: `${sosHeight}%` }}
                    title={`SOS: ${snapshot.shareOfSearch.toFixed(1)}%`}
                  />
                  <div
                    className="flex-1 bg-purple-400 rounded-t"
                    style={{ height: `${sovHeight}%` }}
                    title={`SOV: ${snapshot.shareOfVoice.toFixed(1)}%`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-6 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-400 rounded" /> SOS
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-purple-400 rounded" /> SOV
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricalTracking;
