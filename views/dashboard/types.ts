import type { LucideIcon } from 'lucide-react';

export type Tone = 'good' | 'bad' | 'neutral';

export interface ListingRow {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'sold' | 'expired' | 'deleted';
  views_count: number | null;
  created_at: string;
  updated_at?: string;
  is_featured?: boolean;
}

export interface ChatRow {
  id: string;
  listing_id: string | null;
  created_at: string;
  last_message_at: string;
  seller_unread_count: number | null;
  listing?: { title?: string } | { title?: string }[] | null;
}

export interface ProfileRow {
  successful_sales: number | null;
  trust_level: string | null;
  is_location_verified: boolean | null;
}

export interface DashboardState {
  profile: ProfileRow | null;
  listings: ListingRow[];
  chats: ChatRow[];
}

export interface KpiCardData {
  label: string;
  value: string;
  helper: string;
  trend: string;
  trendText: string;
  tone: Tone;
  icon: LucideIcon;
}

export interface ChartPoint {
  label: string;
  current: number;
  previous: number;
}

export interface InsightItem {
  label: string;
  value: string;
  detail: string;
}

export interface MetricBarData {
  label: string;
  hint: string;
  value: number;
  width: number;
  barColor: string;
  textColor: string;
}

export interface PriorityListingData {
  id: string;
  title: string;
  views: number;
  ageDays: number;
  unreadForListing: number;
  priority: number;
  reason: string;
  tone: Tone;
}

export interface AlertData {
  title: string;
  detail: string;
  tone: Tone;
}

export interface DashboardMetrics {
  totalViews: number;
  activeAlertCount: number;
  kpis: KpiCardData[];
  chartData: ChartPoint[];
  primaryChartTone: Tone;
  inquiryTrend: number;
  immediateReadout: InsightItem[];
  statusData: MetricBarData[];
  viewDistribution: MetricBarData[];
  priorityListings: PriorityListingData[];
  alerts: AlertData[];
}

export const DEFAULT_PROFILE: ProfileRow = {
  successful_sales: 0,
  trust_level: 'newbie',
  is_location_verified: false,
};

export const TONE_STYLES = {
  good: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'text-emerald-600',
  },
  bad: {
    badge: 'bg-red-50 text-red-700 border-red-200',
    icon: 'text-red-600',
  },
  neutral: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: 'text-slate-500',
  },
} as const;
