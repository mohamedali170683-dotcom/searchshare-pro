import React, { useState, useRef } from 'react';
import { Plus, Trash2, Upload, Download, Search, Tag, Loader2 } from 'lucide-react';

export interface CategoryKeyword {
  id: string;
  keyword: string;
  searchVolume: number;
  difficulty?: number;
  group?: string;
}

interface CategoryKeywordsManagerProps {
  keywords: CategoryKeyword[];
  onChange: (keywords: CategoryKeyword[]) => void;
  onFetchSuggestions?: (seedKeyword: string) => Promise<CategoryKeyword[]>;
  onFetchVolumes?: (keywords: string[]) => Promise<{ keyword: string; volume: number }[]>;
  loading?: boolean;
}

export const CategoryKeywordsManager: React.FC<CategoryKeywordsManagerProps> = ({
  keywords,
  onChange,
  onFetchSuggestions,
  onFetchVolumes,
  loading = false
}) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [seedKeyword, setSeedKeyword] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get unique groups
  const groups = [...new Set(keywords.map(k => k.group).filter(Boolean))] as string[];

  const addKeyword = () => {
    if (!newKeyword.trim()) return;

    const keyword: CategoryKeyword = {
      id: Date.now().toString(),
      keyword: newKeyword.trim().toLowerCase(),
      searchVolume: 0,
      group: selectedGroup || undefined
    };

    onChange([...keywords, keyword]);
    setNewKeyword('');
  };

  const addMultipleKeywords = (keywordList: string) => {
    const newKeywords = keywordList
      .split(/[,\n]/)
      .map(k => k.trim().toLowerCase())
      .filter(k => k && !keywords.some(existing => existing.keyword === k))
      .map(k => ({
        id: Date.now().toString() + Math.random(),
        keyword: k,
        searchVolume: 0,
        group: selectedGroup || undefined
      }));

    if (newKeywords.length > 0) {
      onChange([...keywords, ...newKeywords]);
    }
  };

  const removeKeyword = (id: string) => {
    onChange(keywords.filter(k => k.id !== id));
  };

  const updateKeyword = (id: string, updates: Partial<CategoryKeyword>) => {
    onChange(keywords.map(k => k.id === id ? { ...k, ...updates } : k));
  };

  const handleFetchSuggestions = async () => {
    if (!onFetchSuggestions || !seedKeyword.trim()) return;

    const suggestions = await onFetchSuggestions(seedKeyword.trim());
    const newKeywords = suggestions.filter(
      s => !keywords.some(k => k.keyword === s.keyword)
    );
    onChange([...keywords, ...newKeywords]);
    setSeedKeyword('');
  };

  const handleFetchVolumes = async () => {
    if (!onFetchVolumes || keywords.length === 0) return;

    const keywordsToFetch = keywords.filter(k => k.searchVolume === 0).map(k => k.keyword);
    if (keywordsToFetch.length === 0) return;

    const volumes = await onFetchVolumes(keywordsToFetch);
    const volumeMap = new Map(volumes.map(v => [v.keyword.toLowerCase(), v.volume]));

    onChange(keywords.map(k => ({
      ...k,
      searchVolume: volumeMap.get(k.keyword.toLowerCase()) || k.searchVolume
    })));
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').slice(1); // Skip header

      const imported: CategoryKeyword[] = lines
        .filter(line => line.trim())
        .map((line, idx) => {
          const [keyword, volume, group] = line.split(',').map(s => s.trim().replace(/"/g, ''));
          return {
            id: Date.now().toString() + idx,
            keyword: keyword?.toLowerCase() || '',
            searchVolume: parseInt(volume) || 0,
            group: group || undefined
          };
        })
        .filter(k => k.keyword && !keywords.some(existing => existing.keyword === k.keyword));

      onChange([...keywords, ...imported]);
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCSVExport = () => {
    const csv = [
      'keyword,search_volume,group',
      ...keywords.map(k => `"${k.keyword}",${k.searchVolume},"${k.group || ''}"`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `category-keywords-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalVolume = keywords.reduce((sum, k) => sum + k.searchVolume, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Category Keywords</h3>
          <p className="text-sm text-gray-500">
            Non-brand keywords for Share of Voice calculation
            {keywords.length > 0 && (
              <span className="ml-2 text-emerald-600">
                ({keywords.length} keywords, {totalVolume.toLocaleString()} total volume)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCSVImport}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <Upload size={14} />
            Import CSV
          </button>
          <button
            onClick={handleCSVExport}
            disabled={keywords.length === 0}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1 disabled:opacity-50"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Fetch suggestions section */}
        {onFetchSuggestions && (
          <div className="bg-blue-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-blue-900 mb-2">
              <div className="flex items-center gap-2">
                <Search size={16} />
                Auto-suggest Keywords from Seed
              </div>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={seedKeyword}
                onChange={(e) => setSeedKeyword(e.target.value)}
                placeholder="Enter a seed keyword (e.g., 'naturkosmetik')"
                className="flex-1 px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleFetchSuggestions}
                disabled={loading || !seedKeyword.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                Suggest
              </button>
            </div>
          </div>
        )}

        {/* Manual add section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add Keywords (comma or newline separated)
            </label>
            <textarea
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="naturkosmetik, bio gesichtscreme, vegane kosmetik..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-1">
                <Tag size={14} />
                Group (optional)
              </div>
            </label>
            <input
              type="text"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              placeholder="e.g., Face Care"
              list="keyword-groups"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <datalist id="keyword-groups">
              {groups.map(g => <option key={g} value={g} />)}
            </datalist>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                if (newKeyword.includes(',') || newKeyword.includes('\n')) {
                  addMultipleKeywords(newKeyword);
                  setNewKeyword('');
                } else {
                  addKeyword();
                }
              }}
              disabled={!newKeyword.trim()}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add
            </button>
          </div>
        </div>

        {/* Fetch volumes button */}
        {onFetchVolumes && keywords.some(k => k.searchVolume === 0) && (
          <button
            onClick={handleFetchVolumes}
            disabled={loading}
            className="w-full px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            Fetch Search Volumes ({keywords.filter(k => k.searchVolume === 0).length} keywords missing volume)
          </button>
        )}

        {/* Keywords table */}
        {keywords.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keyword</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Volume</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {keywords.map((kw) => (
                  <tr key={kw.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{kw.keyword}</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        value={kw.searchVolume}
                        onChange={(e) => updateKeyword(kw.id, { searchVolume: parseInt(e.target.value) || 0 })}
                        className="w-24 px-2 py-1 border border-gray-200 rounded text-right text-sm focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={kw.group || ''}
                        onChange={(e) => updateKeyword(kw.id, { group: e.target.value || undefined })}
                        placeholder="—"
                        list="keyword-groups"
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => removeKeyword(kw.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {keywords.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Tag size={48} className="mx-auto mb-2 opacity-50" />
            <p>No category keywords added yet</p>
            <p className="text-sm">Add keywords manually, import CSV, or use auto-suggest</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryKeywordsManager;
