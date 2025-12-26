import React, { useState } from 'react';
import { formatNumber, getGapInfo } from '../utils/calculations';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  suffix?: string;
  type: 'sos' | 'sov' | 'gap';
  numerator?: number;
  denominator?: number;
  formula?: string;
  interpretation?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  suffix = '%',
  type,
  numerator,
  denominator,
  formula,
  interpretation
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getBorderColor = () => {
    switch (type) {
      case 'sos':
        return 'border-emerald-500';
      case 'sov':
        return 'border-orange-500';
      case 'gap':
        if (interpretation === 'growth_potential') return 'border-emerald-500';
        if (interpretation === 'missing_opportunities') return 'border-red-500';
        return 'border-blue-500';
      default:
        return 'border-gray-300';
    }
  };

  const getValueColor = () => {
    switch (type) {
      case 'sos':
        return 'text-emerald-600';
      case 'sov':
        return 'text-orange-500';
      case 'gap':
        if (interpretation === 'growth_potential') return 'text-emerald-600';
        if (interpretation === 'missing_opportunities') return 'text-red-600';
        return 'text-blue-600';
      default:
        return 'text-gray-900';
    }
  };

  const gapInfo = interpretation ? getGapInfo(interpretation) : null;

  return (
    <div className={`bg-white rounded-xl shadow-sm border-t-4 ${getBorderColor()} p-6`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Show calculation details"
        >
          <Info size={18} />
        </button>
      </div>

      <div className="flex items-baseline gap-1">
        <span className={`text-5xl font-bold ${getValueColor()}`}>
          {type === 'gap' && value > 0 ? '+' : ''}{value}
        </span>
        <span className={`text-2xl font-medium ${getValueColor()}`}>
          {type === 'gap' ? 'pp' : suffix}
        </span>
      </div>

      {gapInfo && (
        <div className="mt-2 flex items-center gap-2">
          <span>{gapInfo.icon}</span>
          <span className={`text-sm font-medium ${getValueColor()}`}>{gapInfo.text}</span>
        </div>
      )}

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {formula && (
            <div className="text-xs text-gray-500 mb-2">
              <strong>Formula:</strong> {formula}
            </div>
          )}
          {numerator !== undefined && denominator !== undefined && (
            <div className="text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Numerator:</span>
                <span className="font-medium">{formatNumber(numerator)}</span>
              </div>
              <div className="flex justify-between">
                <span>Denominator:</span>
                <span className="font-medium">{formatNumber(denominator)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        {showDetails ? (
          <>
            <ChevronUp size={14} /> Hide details
          </>
        ) : (
          <>
            <ChevronDown size={14} /> Show calculation
          </>
        )}
      </button>
    </div>
  );
};

export default MetricCard;
