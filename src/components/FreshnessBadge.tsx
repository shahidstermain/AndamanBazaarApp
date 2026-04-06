import React from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface FreshnessBadgeProps {
  lastActiveAt?: string;
  availabilityStatus?: 'available' | 'sold_recently' | 'inactive';
  responseRate?: number;
  avgResponseHours?: number;
  size?: 'sm' | 'md';
  showResponseTime?: boolean;
}

export const FreshnessBadge: React.FC<FreshnessBadgeProps> = ({
  lastActiveAt,
  availabilityStatus = 'available',
  responseRate,
  avgResponseHours,
  size = 'sm',
  showResponseTime = false,
}) => {
  if (!lastActiveAt && availabilityStatus === 'available') return null;

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Active now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  const getResponseTimeText = (): string => {
    if (!avgResponseHours) return '';
    if (avgResponseHours < 1) return '~1h';
    if (avgResponseHours < 24) return `~${Math.round(avgResponseHours)}h`;
    return `~${Math.round(avgResponseHours / 24)}d`;
  };

  const getResponseRateColor = (): string => {
    if (!responseRate) return 'text-gray-500';
    if (responseRate >= 90) return 'text-green-600';
    if (responseRate >= 70) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
  };

  const iconSizes = {
    sm: 10,
    md: 12,
  };

  if (availabilityStatus === 'sold_recently') {
    return (
      <div className={`flex items-center gap-1 bg-orange-100 text-orange-700 rounded-full ${sizeClasses[size]}`}>
        <AlertCircle size={iconSizes[size]} />
        <span className="font-medium">Sold</span>
      </div>
    );
  }

  if (availabilityStatus === 'inactive') {
    return (
      <div className={`flex items-center gap-1 bg-gray-100 text-gray-600 rounded-full ${sizeClasses[size]}`}>
        <Clock size={iconSizes[size]} />
        <span className="font-medium">Inactive</span>
      </div>
    );
  }

  // Available - show freshness
  return (
    <div className={`flex items-center gap-1 bg-green-100 text-green-700 rounded-full ${sizeClasses[size]}`}>
      <CheckCircle size={iconSizes[size]} />
      <span className="font-medium">
        {lastActiveAt ? getTimeAgo(lastActiveAt) : 'Active'}
      </span>
      {showResponseTime && avgResponseHours && (
        <span className={`${getResponseRateColor()} ml-1`}>
          {getResponseTimeText()}
        </span>
      )}
    </div>
  );
};
