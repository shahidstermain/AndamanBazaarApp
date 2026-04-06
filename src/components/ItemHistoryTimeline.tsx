import React, { useMemo } from 'react';
import { Package, User, ArrowRight, CheckCircle, History, Award } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ItemHistoryEntry {
  id: string;
  seller_id: string;
  seller_name: string;
  seller_trust_level: 'newbie' | 'verified' | 'legend';
  title: string;
  price: number;
  sold_at: string;
  depth: number;
}

interface ItemHistoryTimelineProps {
  history: ItemHistoryEntry[];
  currentListingId: string;
  className?: string;
}

export const ItemHistoryTimeline: React.FC<ItemHistoryTimelineProps> = ({
  history,
  currentListingId,
  className,
}) => {
  // Memoize sorted history to prevent re-sorting on every render
  const sortedHistory = useMemo(() => {
    if (!history || history.length <= 1) return [];
    return [...history].sort((a, b) => b.depth - a.depth);
  }, [history]);

  // Early return if no valid history
  if (!history || history.length <= 1 || sortedHistory.length === 0) {
    return null;
  }

  const getTrustBadgeColor = (level: string) => {
    switch (level) {
      case 'legend':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'verified':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTrustLabel = (level: string) => {
    switch (level) {
      case 'legend':
        return 'Legend';
      case 'verified':
        return 'Verified';
      default:
        return 'Newbie';
    }
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-teal-600" />
        <h3 className="font-semibold text-gray-900">Item History</h3>
        <span className="text-xs text-gray-500">
          Previously sold {sortedHistory.length - 1} time{sortedHistory.length > 2 ? 's' : ''} on AndamanBazaar
        </span>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gray-200" />

        {/* Timeline entries */}
        <div className="space-y-6">
          {sortedHistory.map((entry, index) => {
            const isCurrent = entry.id === currentListingId;
            const isLast = index === 0;

            return (
              <div
                key={entry.id}
                className={cn(
                  'relative flex items-start gap-3 pl-10',
                  isCurrent && 'opacity-100',
                  !isCurrent && 'opacity-70'
                )}
              >
                {/* Timeline dot */}
                <div
                  className={cn(
                    'absolute left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    isCurrent
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : isLast
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-gray-300'
                  )}
                >
                  {isCurrent ? (
                    <Package className="w-3 h-3" />
                  ) : isLast ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-sm truncate">
                      {entry.seller_name || 'Unknown Seller'}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full border',
                        getTrustBadgeColor(entry.seller_trust_level)
                      )}
                    >
                      {getTrustLabel(entry.seller_trust_level)}
                    </span>
                    {isCurrent && (
                      <span className="text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
                    <span>₹{entry.price.toLocaleString()}</span>
                    <span className="text-gray-300">|</span>
                    <span>
                      {new Date(entry.sold_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {isLast && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Original sale on AndamanBazaar
                    </p>
                  )}
                </div>

                {/* Arrow connector (except for last) */}
                {!isLast && (
                  <div className="absolute left-4 top-6 text-gray-300">
                    <ArrowRight className="w-3 h-3 rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform Loyalty Badge */}
      {sortedHistory.length >= 3 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm">
            <Award className="w-5 h-5 text-amber-500" />
            <span className="font-medium text-amber-700">Platform Loyalist Item</span>
            <span className="text-gray-500">
              This item has been resold {sortedHistory.length - 1} times through AndamanBazaar
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
