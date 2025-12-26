import React, { useState, useMemo } from 'react';
import { RankedKeyword, BrandKeyword } from '../types';
import { formatNumber, getPositionColor } from '../utils/calculations';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type SortField = 'keyword' | 'searchVolume' | 'position' | 'ctr' | 'visibleVolume' | 'isOwnBrand';
type SortDirection = 'asc' | 'desc';

interface SOVTableProps {
  keywords: RankedKeyword[];
}

export const SOVKeywordTable: React.FC<SOVTableProps> = ({ keywords }) => {
  const [sortField, setSortField] = useState<SortField>('visibleVolume');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedKeywords = useMemo(() => {
    return [...keywords].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortField) {
        case 'keyword':
          aVal = a.keyword;
          bVal = b.keyword;
          break;
        case 'searchVolume':
          aVal = a.searchVolume;
          bVal = b.searchVolume;
          break;
        case 'position':
          aVal = a.position;
          bVal = b.position;
          break;
        case 'ctr':
          aVal = a.ctr || 0;
          bVal = b.ctr || 0;
          break;
        case 'visibleVolume':
          aVal = a.visibleVolume || 0;
          bVal = b.visibleVolume || 0;
          break;
      }

      if (typeof aVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }

      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [keywords, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-300" />;
    return sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">SOV Keyword Breakdown</h3>
        <p className="text-sm text-gray-500">Keywords ranked in top 20 with CTR-weighted visible volume</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort('keyword')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  Keyword <SortIcon field="keyword" />
                </div>
              </th>
              <th
                onClick={() => handleSort('searchVolume')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-end gap-1">
                  Volume <SortIcon field="searchVolume" />
                </div>
              </th>
              <th
                onClick={() => handleSort('position')}
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-center gap-1">
                  Position <SortIcon field="position" />
                </div>
              </th>
              <th
                onClick={() => handleSort('ctr')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-end gap-1">
                  CTR <SortIcon field="ctr" />
                </div>
              </th>
              <th
                onClick={() => handleSort('visibleVolume')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-end gap-1">
                  Visible Volume <SortIcon field="visibleVolume" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedKeywords.map((kw, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{kw.keyword}</div>
                  {kw.url && <div className="text-xs text-gray-400">{kw.url}</div>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                  {formatNumber(kw.searchVolume)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPositionColor(kw.position)}`}>
                    #{kw.position}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                  {kw.ctr?.toFixed(1)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-orange-600">
                  {formatNumber(kw.visibleVolume || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface SOSTableProps {
  keywords: BrandKeyword[];
}

export const SOSKeywordTable: React.FC<SOSTableProps> = ({ keywords }) => {
  const [sortField, setSortField] = useState<SortField>('searchVolume');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedKeywords = useMemo(() => {
    return [...keywords].sort((a, b) => {
      let aVal: number | string | boolean = 0;
      let bVal: number | string | boolean = 0;

      switch (sortField) {
        case 'keyword':
          aVal = a.keyword;
          bVal = b.keyword;
          break;
        case 'searchVolume':
          aVal = a.searchVolume;
          bVal = b.searchVolume;
          break;
        case 'isOwnBrand':
          aVal = a.isOwnBrand ? 1 : 0;
          bVal = b.isOwnBrand ? 1 : 0;
          break;
      }

      if (typeof aVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }

      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [keywords, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-300" />;
    return sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">SOS Brand Keywords</h3>
        <p className="text-sm text-gray-500">Brand search volume comparison</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort('keyword')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  Keyword <SortIcon field="keyword" />
                </div>
              </th>
              <th
                onClick={() => handleSort('searchVolume')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-end gap-1">
                  Search Volume <SortIcon field="searchVolume" />
                </div>
              </th>
              <th
                onClick={() => handleSort('isOwnBrand')}
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-center gap-1">
                  Type <SortIcon field="isOwnBrand" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedKeywords.map((kw, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {kw.keyword}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                  {formatNumber(kw.searchVolume)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {kw.isOwnBrand ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      Own Brand
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Competitor
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
