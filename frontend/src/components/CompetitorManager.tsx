import React, { useState } from 'react';
import { Plus, Trash2, Building2, Globe, Search } from 'lucide-react';

export interface Competitor {
  id: string;
  domain: string;
  brandName: string;
  brandKeywords: string[];
}

interface CompetitorManagerProps {
  competitors: Competitor[];
  onChange: (competitors: Competitor[]) => void;
  onAutoDetect?: (keywords: string[]) => Promise<Competitor[]>;
  loading?: boolean;
}

export const CompetitorManager: React.FC<CompetitorManagerProps> = ({
  competitors,
  onChange,
  onAutoDetect,
  loading = false
}) => {
  const [newDomain, setNewDomain] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [autoDetectKeywords, setAutoDetectKeywords] = useState('');

  const addCompetitor = () => {
    if (!newDomain.trim() || !newBrandName.trim()) return;

    const competitor: Competitor = {
      id: Date.now().toString(),
      domain: newDomain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, ''),
      brandName: newBrandName.trim(),
      brandKeywords: [newBrandName.trim().toLowerCase()]
    };

    onChange([...competitors, competitor]);
    setNewDomain('');
    setNewBrandName('');
  };

  const removeCompetitor = (id: string) => {
    onChange(competitors.filter(c => c.id !== id));
  };

  const updateCompetitor = (id: string, updates: Partial<Competitor>) => {
    onChange(competitors.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleAutoDetect = async () => {
    if (!onAutoDetect || !autoDetectKeywords.trim()) return;

    const keywords = autoDetectKeywords.split(',').map(k => k.trim()).filter(k => k);
    const detected = await onAutoDetect(keywords);
    onChange([...competitors, ...detected]);
    setAutoDetectKeywords('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Competitor Management</h3>
        <p className="text-sm text-gray-500">Add competitors to compare Share of Search</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Auto-detect section */}
        {onAutoDetect && (
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Search size={16} />
                Auto-detect Competitors
              </div>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={autoDetectKeywords}
                onChange={(e) => setAutoDetectKeywords(e.target.value)}
                placeholder="Enter category keywords (comma-separated)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                onClick={handleAutoDetect}
                disabled={loading || !autoDetectKeywords.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Detect
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              e.g., "naturkosmetik, bio kosmetik, organic skincare"
            </p>
          </div>
        )}

        {/* Manual add section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-1">
                <Building2 size={14} />
                Brand Name
              </div>
            </label>
            <input
              type="text"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="e.g., Weleda"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-1">
                <Globe size={14} />
                Domain
              </div>
            </label>
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="e.g., weleda.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={addCompetitor}
              disabled={!newDomain.trim() || !newBrandName.trim()}
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add Competitor
            </button>
          </div>
        </div>

        {/* Competitors list */}
        {competitors.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand Keywords</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {competitors.map((competitor) => (
                  <tr key={competitor.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={competitor.brandName}
                        onChange={(e) => updateCompetitor(competitor.id, { brandName: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={competitor.domain}
                        onChange={(e) => updateCompetitor(competitor.id, { domain: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={competitor.brandKeywords.join(', ')}
                        onChange={(e) => updateCompetitor(competitor.id, {
                          brandKeywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                        })}
                        placeholder="brand, brand keyword 2..."
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-emerald-500 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeCompetitor(competitor.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {competitors.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Building2 size={48} className="mx-auto mb-2 opacity-50" />
            <p>No competitors added yet</p>
            <p className="text-sm">Add competitors manually or auto-detect from keywords</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetitorManager;
