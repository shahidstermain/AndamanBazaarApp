import React, { useState } from 'react';
import { TrendingUp, Sparkles, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PriceSuggestion {
  avg_price: number;
  min_price: number;
  max_price: number;
  listing_count: number;
  confidence: 'high' | 'medium' | 'low';
  days_to_sell_avg: number;
  price_distribution: { range: string; count: number }[];
  ai_analysis: string;
}

interface PriceDiscoveryWidgetProps {
  suggestion: PriceSuggestion | null;
  currentPrice: string;
  onApplySuggestion: (price: number) => void;
  loading?: boolean;
  className?: string;
}

export const PriceDiscoveryWidget: React.FC<PriceDiscoveryWidgetProps> = ({
  suggestion,
  currentPrice,
  onApplySuggestion,
  loading = false,
  className,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (loading) {
    return (
      <div className={cn('bg-blue-50 rounded-lg p-4', className)}>
        <div className="flex items-center gap-2 text-blue-700">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Analyzing market data...</span>
        </div>
      </div>
    );
  }

  if (!suggestion || suggestion.listing_count === 0) {
    return (
      <div className={cn('bg-gray-50 rounded-lg p-4', className)}>
        <div className="flex items-center gap-2 text-gray-500">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">
            Not enough similar listings to suggest a price. Try checking other platforms.
          </span>
        </div>
      </div>
    );
  }

  const currentPriceNum = parseFloat(currentPrice) || 0;
  const avgPrice = suggestion.avg_price;
  const priceDiff = currentPriceNum - avgPrice;
  const priceDiffPercent = currentPriceNum > 0 ? (priceDiff / avgPrice) * 100 : 0;

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-amber-600 bg-amber-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={cn('bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg p-4 border border-blue-100', className)}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="bg-white p-2 rounded-full shadow-sm">
          <Sparkles className="w-5 h-5 text-teal-500" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">AI Price Suggestion</h4>
          <p className="text-sm text-gray-600">
            Based on {suggestion.listing_count} similar listings
          </p>
        </div>
        <span className={cn('text-xs px-2 py-1 rounded-full font-medium', getConfidenceColor(suggestion.confidence))}>
          {suggestion.confidence} confidence
        </span>
      </div>

      {/* AI Analysis */}
      <p className="text-sm text-gray-700 mb-4 italic">
        "{suggestion.ai_analysis}"
      </p>

      {/* Price Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 text-center shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Average</p>
          <p className="font-bold text-lg text-gray-900">₹{suggestion.avg_price.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Range</p>
          <p className="font-bold text-sm text-gray-900">
            ₹{suggestion.min_price.toLocaleString()} - ₹{suggestion.max_price.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Avg Days to Sell</p>
          <p className="font-bold text-lg text-gray-900">{suggestion.days_to_sell_avg}d</p>
        </div>
      </div>

      {/* Current Price Comparison */}
      {currentPriceNum > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Your price vs market:</span>
            <span
              className={cn(
                'font-medium',
                priceDiffPercent > 10 ? 'text-red-600' : priceDiffPercent < -10 ? 'text-green-600' : 'text-gray-600'
              )}
            >
              {priceDiffPercent > 0 ? '+' : ''}{priceDiffPercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all',
                priceDiffPercent > 10 ? 'bg-red-400' : priceDiffPercent < -10 ? 'bg-green-400' : 'bg-blue-400'
              )}
              style={{ width: `${Math.min(Math.abs(priceDiffPercent) + 50, 100)}%` }}
            />
          </div>
          {priceDiffPercent > 20 && (
            <p className="text-xs text-red-600 mt-1">
              Your price is significantly higher than similar listings. Consider lowering for faster sale.
            </p>
          )}
          {priceDiffPercent < -20 && (
            <p className="text-xs text-green-600 mt-1">
              Your price is lower than average - great for quick sale! You might be undervaluing the item.
            </p>
          )}
        </div>
      )}

      {/* Apply Button */}
      {currentPriceNum !== avgPrice && (
        <button
          onClick={() => onApplySuggestion(avgPrice)}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          Use Suggested Price (₹{avgPrice.toLocaleString()})
        </button>
      )}

      {/* Show Details Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="mt-3 text-sm text-teal-600 hover:underline"
      >
        {showDetails ? 'Hide price distribution' : 'View price distribution'}
      </button>

      {/* Price Distribution */}
      {showDetails && suggestion.price_distribution.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-gray-700">Price Distribution:</p>
          {suggestion.price_distribution.map((dist, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 w-32">{dist.range}</span>
              <div className="flex-1 h-4 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-full bg-teal-400 rounded"
                  style={{
                    width: `${(dist.count / suggestion.listing_count) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 w-8">{dist.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
