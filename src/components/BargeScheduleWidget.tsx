import React, { useState } from 'react';
import { Ship, Clock, ExternalLink, MapPin, Send } from 'lucide-react';
import { cn } from '../lib/utils';
import { useBargeSchedule, NextDeparture, suggestPickupTimes } from '../lib/bargeUtils';

interface BargeScheduleWidgetProps {
  buyerLocation: string;
  sellerLocation: string;
  onSelectTime: (message: string) => void;
  className?: string;
}

export const BargeScheduleWidget: React.FC<BargeScheduleWidgetProps> = ({
  buyerLocation,
  sellerLocation,
  onSelectTime,
  className,
}) => {
  const { route, nextDepartures, loading, error, hasMonsoonAlert, monsoonMessage } =
    useBargeSchedule(buyerLocation, sellerLocation);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDeparture, setSelectedDeparture] = useState<NextDeparture | null>(null);

  // Don't show if same island or no route found
  if (buyerLocation === sellerLocation) return null;
  if (!loading && !route && !error) {
    return (
      <div className={cn('bg-gray-50 rounded-lg p-3 text-sm text-gray-500', className)}>
        <Ship className="w-4 h-4 inline mr-1" />
        No ferry service available between these islands
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn('bg-blue-50 rounded-lg p-3 animate-pulse', className)}>
        <div className="h-4 bg-blue-100 rounded w-3/4 mb-2" />
        <div className="h-3 bg-blue-100 rounded w-1/2" />
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className={cn('bg-gray-50 rounded-lg p-3 text-sm text-gray-500', className)}>
        <Ship className="w-4 h-4 inline mr-1" />
        No ferry route found between these islands
      </div>
    );
  }

  const handleSuggestTime = (departure: NextDeparture) => {
    setSelectedDeparture(departure);
    const suggestions = suggestPickupTimes([departure], buyerLocation, sellerLocation);
    if (suggestions.length > 0) {
      onSelectTime(suggestions[0]);
    }
  };

  return (
    <div className={cn('bg-blue-50 rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="px-3 py-2 bg-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ship className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-900 text-sm">
            {route.from} → {route.to}
          </span>
          <span className="text-xs text-blue-600">({route.distance_km}km)</span>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-blue-700 hover:underline"
        >
          {showDetails ? 'Hide' : 'Show ferries'}
        </button>
      </div>

      {/* Monsoon Alert */}
      {hasMonsoonAlert && (
        <div className="px-3 py-2 bg-amber-50 border-l-4 border-amber-400">
          <p className="text-xs text-amber-800">
            <strong>⚠️ Monsoon Alert:</strong> {monsoonMessage}
          </p>
        </div>
      )}

      {/* Departures List */}
      {showDetails && (
        <div className="p-3 space-y-2">
          {nextDepartures.length === 0 ? (
            <p className="text-sm text-gray-500">No ferries available today</p>
          ) : (
            nextDepartures.map((dep, idx) => (
              <div
                key={idx}
                className={cn(
                  'bg-white rounded p-2 border transition-colors',
                  selectedDeparture === dep
                    ? 'border-blue-500 ring-1 ring-blue-500'
                    : 'border-blue-200 hover:border-blue-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {dep.type === 'fast' ? '⚡' : '🚢'}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{dep.operator}</p>
                      <p className="text-xs text-gray-500">
                        {dep.departure} → {dep.arrival}
                        {dep.isTomorrow && ' (Tomorrow)'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-blue-600">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {dep.timeUntil}
                    </p>
                    <p className="text-xs text-gray-400">{dep.type === 'fast' ? 'Fast' : 'Slow'}</p>
                  </div>
                </div>

                {/* Quick suggest button */}
                <button
                  onClick={() => handleSuggestTime(dep)}
                  className="mt-2 w-full text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                >
                  <MapPin className="w-3 h-3" />
                  Suggest pickup after this ferry
                </button>

                {/* Booking link - URL validated */}
                <a
                  href={dep.booking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    // Validate URL before opening
                    try {
                      const url = new URL(dep.booking_url);
                      const allowedDomains = ['andaman.gov.in', 'directorateofshipping.gov.in', 'makruzz.com', 'sealink.co.in', 'greenocean.in'];
                      if (!allowedDomains.some(domain => url.hostname.includes(domain))) {
                        e.preventDefault();
                        console.warn('Blocked potentially unsafe URL:', dep.booking_url);
                      }
                    } catch {
                      e.preventDefault();
                    }
                  }}
                  className="mt-1 block text-xs text-center text-blue-500 hover:underline"
                >
                  <ExternalLink className="w-3 h-3 inline mr-1" />
                  Book tickets
                </a>
              </div>
            ))
          )}
        </div>
      )}

      {/* Quick Actions */}
      {!showDetails && nextDepartures.length > 0 && (
        <div className="px-3 py-2">
          <p className="text-xs text-blue-700 mb-2">
            Next ferry: <strong>{nextDepartures[0].operator}</strong> in{' '}
            {nextDepartures[0].timeUntil}
          </p>
          <button
            onClick={() => handleSuggestTime(nextDepartures[0])}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded flex items-center gap-1 transition-colors"
          >
            <Send className="w-3 h-3" />
            Suggest meeting time
          </button>
        </div>
      )}
    </div>
  );
};
