import React from 'react';
import { Eye, Heart, MessageCircle, TrendingUp, Users, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ListingAnalytics {
  listing_id: string;
  title: string;
  status: string;
  total_views: number;
  total_favorites: number;
  total_chats: number;
  favorite_rate: number;
  chat_conversion_rate: number;
  last_activity_at: string | null;
}

export interface PerformanceComparison {
  metric: string;
  listing_value: number;
  category_avg: number;
  percentile: number;
}

interface ListingPerformanceCardProps {
  analytics: ListingAnalytics;
  comparison?: PerformanceComparison[];
  className?: string;
}

export const ListingPerformanceCard: React.FC<ListingPerformanceCardProps> = ({
  analytics,
  comparison,
  className,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'sold':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No activity';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-4', className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">{analytics.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn('text-xs px-2 py-0.5 rounded-full', getStatusColor(analytics.status))}>
              {analytics.status}
            </span>
            <span className="text-xs text-gray-500">
              Last active: {formatDate(analytics.last_activity_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
            <Eye className="w-4 h-4" />
            <span className="text-xs">Views</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{analytics.total_views}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
            <Heart className="w-4 h-4" />
            <span className="text-xs">Favorites</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{analytics.total_favorites}</p>
          <p className="text-xs text-gray-500">{analytics.favorite_rate}% rate</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">Chats</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{analytics.total_chats}</p>
          <p className="text-xs text-gray-500">{analytics.chat_conversion_rate}% conv.</p>
        </div>
      </div>

      {/* Comparison to Category */}
      {comparison && comparison.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-medium text-gray-700 mb-2">vs Category Average:</p>
          <div className="space-y-2">
            {comparison.slice(0, 2).map((comp) => (
              <div key={comp.metric} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 capitalize">{comp.metric.replace('_', ' ')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{comp.listing_value.toFixed(0)}</span>
                  <span
                    className={cn(
                      'text-xs flex items-center gap-0.5',
                      comp.percentile >= 100 ? 'text-green-600' : 'text-gray-500'
                    )}
                  >
                    {comp.percentile >= 100 ? (
                      <>
                        <ArrowUpRight className="w-3 h-3" />
                        {(comp.percentile - 100).toFixed(0)}% above avg
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="w-3 h-3" />
                        {(100 - comp.percentile).toFixed(0)}% below avg
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface DashboardStatsProps {
  totalViews: number;
  totalFavorites: number;
  totalChats: number;
  activeListings: number;
  className?: string;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  totalViews,
  totalFavorites,
  totalChats,
  activeListings,
  className,
}) => {
  const stats = [
    {
      label: 'Total Views',
      value: totalViews,
      icon: Eye,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Favorites',
      value: totalFavorites,
      icon: Heart,
      color: 'text-pink-600 bg-pink-50',
    },
    {
      label: 'Chat Inquiries',
      value: totalChats,
      icon: MessageCircle,
      color: 'text-teal-600 bg-teal-50',
    },
    {
      label: 'Active Listings',
      value: activeListings,
      icon: TrendingUp,
      color: 'text-green-600 bg-green-50',
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', stat.color)}>
            <stat.icon className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
          <p className="text-sm text-gray-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};

interface InsightsCardProps {
  insights: string[];
  className?: string;
}

export const InsightsCard: React.FC<InsightsCardProps> = ({ insights, className }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div className={cn('bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-100 p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-amber-600" />
        <h4 className="font-semibold text-gray-900">AI Insights</h4>
      </div>
      <ul className="space-y-2">
        {insights.map((insight, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-amber-500 mt-0.5">•</span>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
};
