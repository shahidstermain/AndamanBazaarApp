import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Eye,
  Layers3,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface ListingRow {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'sold' | 'expired' | 'deleted';
  views_count: number | null;
  created_at: string;
  updated_at?: string;
  is_featured?: boolean;
}

interface ChatRow {
  id: string;
  listing_id: string | null;
  created_at: string;
  last_message_at: string;
  seller_unread_count: number | null;
  listing?: { title?: string } | { title?: string }[] | null;
}

interface ProfileRow {
  successful_sales: number | null;
  trust_level: string | null;
  is_location_verified: boolean | null;
}

interface DashboardState {
  profile: ProfileRow | null;
  listings: ListingRow[];
  chats: ChatRow[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_TARGET = 5;
const HEALTHY_VIEWS_PER_LISTING = 20;
const DEFAULT_PROFILE: ProfileRow = {
  successful_sales: 0,
  trust_level: 'newbie',
  is_location_verified: false,
};

const formatSignedPercent = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return '0%';
  return `${value > 0 ? '+' : ''}${Math.round(value)}%`;
};

const formatSignedCount = (value: number) => {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : ''}${value}`;
};

const getPercentChange = (current: number, previous: number) => {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return ((current - previous) / previous) * 100;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const daysAgo = (days: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
};

const isBetween = (iso: string, start: Date, end: Date) => {
  const value = new Date(iso).getTime();
  return value >= start.getTime() && value < end.getTime();
};

const getListingTitle = (chat: ChatRow) => {
  if (!chat.listing) return 'Listing';
  return Array.isArray(chat.listing) ? chat.listing[0]?.title || 'Listing' : chat.listing.title || 'Listing';
};

const getTrendTone = (value: number, inverse = false): 'good' | 'bad' | 'neutral' => {
  if (value === 0) return 'neutral';
  const positive = value > 0;
  if (inverse) return positive ? 'bad' : 'good';
  return positive ? 'good' : 'bad';
};

const toneStyles = {
  good: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'text-emerald-600',
    chip: 'bg-emerald-500',
  },
  bad: {
    badge: 'bg-red-50 text-red-700 border-red-200',
    icon: 'text-red-600',
    chip: 'bg-red-500',
  },
  neutral: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: 'text-slate-500',
    chip: 'bg-slate-400',
  },
} as const;

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardState>({
    profile: null,
    listings: [],
    chats: [],
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setData({ profile: null, listings: [], chats: [] });
          return;
        }

        const [profileResult, listingsResult, chatsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('successful_sales, trust_level, is_location_verified')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('listings')
            .select('id, title, status, views_count, created_at, updated_at, is_featured')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('chats')
            .select('id, listing_id, created_at, last_message_at, seller_unread_count, listing:listings(title)')
            .eq('seller_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (listingsResult.error) throw listingsResult.error;
        if (chatsResult.error) throw chatsResult.error;

        setData({
          profile: profileResult.data ?? DEFAULT_PROFILE,
          listings: listingsResult.data || [],
          chats: chatsResult.data || [],
        });
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const { profile, listings, chats } = data;
  const currentPeriodStart = daysAgo(6);
  const currentPeriodEnd = new Date(startOfDay(new Date()).getTime() + DAY_MS);
  const previousPeriodStart = daysAgo(13);
  const previousPeriodEnd = currentPeriodStart;

  const activeListings = listings.filter((listing) => listing.status === 'active');
  const draftListings = listings.filter((listing) => listing.status === 'draft');
  const expiredListings = listings.filter((listing) => listing.status === 'expired');
  const soldListings = listings.filter((listing) => listing.status === 'sold');

  const currentWeekListings = listings.filter((listing) => isBetween(listing.created_at, currentPeriodStart, currentPeriodEnd));
  const previousWeekListings = listings.filter((listing) => isBetween(listing.created_at, previousPeriodStart, previousPeriodEnd));
  const currentWeekChats = chats.filter((chat) => isBetween(chat.created_at, currentPeriodStart, currentPeriodEnd));
  const previousWeekChats = chats.filter((chat) => isBetween(chat.created_at, previousPeriodStart, previousPeriodEnd));

  const unreadReplies = chats.reduce((sum, chat) => sum + (chat.seller_unread_count || 0), 0);
  const totalViews = listings.reduce((sum, listing) => sum + (listing.views_count || 0), 0);
  const activeViews = activeListings.reduce((sum, listing) => sum + (listing.views_count || 0), 0);
  const avgViewsPerActive = activeListings.length ? activeViews / activeListings.length : 0;
  const zeroViewActiveListings = activeListings.filter((listing) => (listing.views_count || 0) === 0);
  const staleActiveListings = activeListings.filter(
    (listing) => new Date(listing.created_at).getTime() < Date.now() - 14 * DAY_MS
  );
  const freshActiveListings = activeListings.filter(
    (listing) => new Date(listing.created_at).getTime() >= Date.now() - 14 * DAY_MS
  );
  const freshInventoryShare = activeListings.length ? (freshActiveListings.length / activeListings.length) * 100 : 0;
  const successfulSales = Math.max(profile?.successful_sales || 0, soldListings.length);
  const sellThroughBase = Math.max(listings.length, successfulSales);
  const sellThroughRate = sellThroughBase ? Math.min((successfulSales / sellThroughBase) * 100, 100) : 0;

  const inquiryTrend = getPercentChange(currentWeekChats.length, previousWeekChats.length);
  const listingTrend = getPercentChange(currentWeekListings.length, previousWeekListings.length);
  const activeGap = activeListings.length - ACTIVE_TARGET;
  const zeroViewShare = activeListings.length ? (zeroViewActiveListings.length / activeListings.length) * 100 : 0;
  const viewEfficiencyDelta = avgViewsPerActive - HEALTHY_VIEWS_PER_LISTING;

  const currentChatCountByDay = new Map<number, number>();
  const previousChatCountByDay = new Map<number, number>();

  chats.forEach((chat) => {
    const chatDay = startOfDay(new Date(chat.created_at)).getTime();

    if (chatDay >= currentPeriodStart.getTime() && chatDay < currentPeriodEnd.getTime()) {
      currentChatCountByDay.set(chatDay, (currentChatCountByDay.get(chatDay) || 0) + 1);
      return;
    }

    if (chatDay >= previousPeriodStart.getTime() && chatDay < previousPeriodEnd.getTime()) {
      previousChatCountByDay.set(chatDay, (previousChatCountByDay.get(chatDay) || 0) + 1);
    }
  });

  const chartData = Array.from({ length: 7 }, (_, index) => {
    const currentDay = new Date(currentPeriodStart.getTime() + index * DAY_MS);
    const previousDay = new Date(previousPeriodStart.getTime() + index * DAY_MS);
    const currentDayKey = currentDay.getTime();
    const previousDayKey = previousDay.getTime();

    return {
      label: currentDay.toLocaleDateString('en-IN', { weekday: 'short' }),
      current: currentChatCountByDay.get(currentDayKey) || 0,
      previous: previousChatCountByDay.get(previousDayKey) || 0,
    };
  });

  const statusData = [
    { label: 'Active', value: activeListings.length, color: 'bg-emerald-500', text: 'text-emerald-700' },
    { label: 'Draft', value: draftListings.length, color: 'bg-amber-500', text: 'text-amber-700' },
    { label: 'Sold', value: soldListings.length, color: 'bg-slate-900', text: 'text-slate-900' },
    { label: 'Expired', value: expiredListings.length, color: 'bg-red-500', text: 'text-red-700' },
  ].filter((item) => item.value > 0 || listings.length === 0);

  const viewDistribution = [
    {
      label: 'No exposure',
      hint: '0 views',
      value: activeListings.filter((listing) => (listing.views_count || 0) === 0).length,
      color: 'bg-red-500',
      text: 'text-red-700',
    },
    {
      label: 'Low traction',
      hint: '1-9 views',
      value: activeListings.filter((listing) => {
        const views = listing.views_count || 0;
        return views > 0 && views < 10;
      }).length,
      color: 'bg-amber-500',
      text: 'text-amber-700',
    },
    {
      label: 'Healthy',
      hint: '10-24 views',
      value: activeListings.filter((listing) => {
        const views = listing.views_count || 0;
        return views >= 10 && views < 25;
      }).length,
      color: 'bg-emerald-500',
      text: 'text-emerald-700',
    },
    {
      label: 'Top performers',
      hint: '25+ views',
      value: activeListings.filter((listing) => (listing.views_count || 0) >= 25).length,
      color: 'bg-slate-900',
      text: 'text-slate-900',
    },
  ];

  const listingUnreadMap = chats.reduce<Record<string, number>>((acc, chat) => {
    if (!chat.listing_id) return acc;
    acc[chat.listing_id] = (acc[chat.listing_id] || 0) + (chat.seller_unread_count || 0);
    return acc;
  }, {});

  const priorityListings = activeListings
    .map((listing) => {
      const views = listing.views_count || 0;
      const ageDays = Math.max(0, Math.floor((Date.now() - new Date(listing.created_at).getTime()) / DAY_MS));
      const unreadForListing = listingUnreadMap[listing.id] || 0;
      let priority = 0;
      let reason = 'Stable performance';
      let tone: 'good' | 'bad' | 'neutral' = 'good';

      if (unreadForListing > 0) {
        priority += unreadForListing * 5;
        reason = `${unreadForListing} unread buyer ${unreadForListing === 1 ? 'reply' : 'replies'}`;
        tone = 'bad';
      } else if (views === 0) {
        priority += 18 + ageDays;
        reason = ageDays > 7 ? 'No views after a week' : 'No views yet';
        tone = 'bad';
      } else if (ageDays > 14 && views < 10) {
        priority += 12;
        reason = 'Stale listing with weak reach';
        tone = 'bad';
      } else if (views < 10) {
        priority += 6;
        reason = 'Needs stronger title or pricing';
        tone = 'neutral';
      } else {
        priority += Math.max(1, 20 - views);
        reason = 'Healthy but monitor conversion';
        tone = 'good';
      }

      return {
        id: listing.id,
        title: listing.title,
        views,
        ageDays,
        unreadForListing,
        priority,
        reason,
        tone,
      };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4);

  const alerts: Array<{ title: string; detail: string; tone: 'good' | 'bad' | 'neutral' }> = [];

  if (unreadReplies > 0) {
    alerts.push({
      title: 'Buyer replies waiting',
      detail: `${unreadReplies} unread ${unreadReplies === 1 ? 'message needs' : 'messages need'} a response. Fast replies are the quickest way to protect conversion.`,
      tone: 'bad',
    });
  }

  if (activeListings.length > 0 && zeroViewShare >= 40) {
    alerts.push({
      title: 'Too many listings are invisible',
      detail: `${zeroViewActiveListings.length} of ${activeListings.length} active listings still have zero views. Rework thumbnails, titles, or pricing first.`,
      tone: 'bad',
    });
  }

  if (activeListings.length > 0 && currentWeekChats.length === 0) {
    alerts.push({
      title: 'Demand stalled this week',
      detail: 'No new buyer conversations started in the last 7 days. Promote your top listing or refresh stale inventory.',
      tone: 'bad',
    });
  }

  if (expiredListings.length > 0) {
    alerts.push({
      title: 'Expired inventory needs action',
      detail: `${expiredListings.length} ${expiredListings.length === 1 ? 'listing has' : 'listings have'} expired and are no longer discoverable.`,
      tone: 'neutral',
    });
  }

  if (activeListings.length > 0 && freshInventoryShare < 50) {
    alerts.push({
      title: 'Inventory is aging',
      detail: `Only ${Math.round(freshInventoryShare)}% of active listings were created in the last 14 days. Refreshing old listings can recover visibility.`,
      tone: 'neutral',
    });
  }

  if (profile && !profile.is_location_verified) {
    alerts.push({
      title: 'Trust signal missing',
      detail: 'Location verification is off. Turning it on should improve buyer confidence.',
      tone: 'neutral',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      title: 'System looks healthy',
      detail: 'No urgent anomalies detected. Focus on converting active demand and keeping inventory fresh.',
      tone: 'good',
    });
  }

  const primaryChartTone: 'good' | 'bad' | 'neutral' =
    currentWeekChats.length === previousWeekChats.length
      ? 'neutral'
      : currentWeekChats.length > previousWeekChats.length
        ? 'good'
        : 'bad';

  const kpis = [
    {
      label: 'Buyer inquiries',
      value: currentWeekChats.length.toString(),
      helper: 'Started in the last 7 days',
      trend: formatSignedPercent(inquiryTrend),
      trendText: `vs previous 7 days (${previousWeekChats.length})`,
      tone: getTrendTone(inquiryTrend),
      icon: MessageSquare,
    },
    {
      label: 'Listings published',
      value: currentWeekListings.length.toString(),
      helper: 'New listings this week',
      trend: formatSignedCount(currentWeekListings.length - previousWeekListings.length),
      trendText: `vs previous 7 days (${previousWeekListings.length})`,
      tone: getTrendTone(listingTrend),
      icon: Layers3,
    },
    {
      label: 'Active inventory',
      value: activeListings.length.toString(),
      helper: `Target is ${ACTIVE_TARGET} live listings`,
      trend: formatSignedCount(activeGap),
      trendText: activeGap >= 0 ? 'above coverage target' : 'below coverage target',
      tone: activeGap >= 0 ? 'good' : 'bad',
      icon: TrendingUp,
    },
    {
      label: 'Avg. views per active listing',
      value: activeListings.length ? avgViewsPerActive.toFixed(1) : '0',
      helper: 'Reach quality across live inventory',
      trend: formatSignedCount(Math.round(viewEfficiencyDelta)),
      trendText: `vs healthy benchmark (${HEALTHY_VIEWS_PER_LISTING})`,
      tone: viewEfficiencyDelta >= 0 ? 'good' : 'bad',
      icon: Eye,
    },
    {
      label: 'Unread buyer replies',
      value: unreadReplies.toString(),
      helper: 'Conversations waiting on you',
      trend: unreadReplies === 0 ? 'Clear' : `${unreadReplies} pending`,
      trendText: unreadReplies === 0 ? 'response queue is healthy' : 'respond now to protect conversion',
      tone: unreadReplies === 0 ? 'good' : 'bad',
      icon: Clock3,
    },
    {
      label: 'Sell-through rate',
      value: `${Math.round(sellThroughRate)}%`,
      helper: 'Successful sales vs total listings',
      trend: `${successfulSales} sold`,
      trendText: profile?.trust_level ? `trust level: ${profile.trust_level}` : 'track against closed deals',
      tone: sellThroughRate >= 25 ? 'good' : sellThroughRate > 0 ? 'neutral' : 'bad',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-10 space-y-8">
      <section className="rounded-[36px] border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Decision Dashboard</p>
            <h1 className="mt-3 text-3xl md:text-5xl font-black tracking-tight text-slate-950">
              See health, spot blockers, act fast.
            </h1>
            <p className="mt-3 text-sm md:text-base font-medium text-slate-600 leading-relaxed">
              This view answers three questions quickly: is demand improving, which listings need intervention, and what is blocking conversion right now?
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Total views</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{totalViews}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Active alerts</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{alerts.filter((alert) => alert.tone !== 'good').length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const trendStyles = toneStyles[kpi.tone];
          const TrendIcon = kpi.tone === 'bad' ? ArrowDownRight : kpi.tone === 'good' ? ArrowUpRight : ArrowRight;

          return (
            <div key={kpi.label} className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{kpi.label}</p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{kpi.value}</p>
                  <p className="mt-2 text-sm font-medium text-slate-500">{kpi.helper}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-slate-700">
                  <Icon size={20} />
                </div>
              </div>

              <div className={`mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-widest ${trendStyles.badge}`}>
                <TrendIcon size={14} className={trendStyles.icon} />
                <span>{kpi.trend}</span>
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-500">{kpi.trendText}</p>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-[36px] border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Primary question</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                Are buyer inquiries accelerating this week?
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Compare new conversations started in the last 7 days against the previous 7-day period.
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-widest ${toneStyles[primaryChartTone].badge}`}>
              {primaryChartTone === 'bad' ? <ArrowDownRight size={14} /> : primaryChartTone === 'good' ? <ArrowUpRight size={14} /> : <ArrowRight size={14} />}
              <span>{formatSignedPercent(inquiryTrend)} inquiry trend</span>
            </div>
          </div>

          <div className="mt-8 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={10}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 800 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 800 }}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    borderRadius: '18px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
                  }}
                />
                <Bar dataKey="previous" radius={[10, 10, 0, 0]} fill="#cbd5e1" />
                <Bar dataKey="current" radius={[10, 10, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`current-${index}`}
                      fill={entry.current >= entry.previous ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <LegendChip color="bg-slate-300" label="Previous 7 days" />
            <LegendChip color="bg-emerald-500" label="Current day beat previous week" />
            <LegendChip color="bg-red-500" label="Current day trails previous week" />
          </div>
        </div>

        <div className="rounded-[36px] border border-slate-200 bg-slate-950 p-6 md:p-8 text-white shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">What to do next</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Immediate readout</h2>
          <div className="mt-6 space-y-5">
            <InsightRow
              label="Demand"
              value={currentWeekChats.length === 0 ? 'Cold' : currentWeekChats.length > previousWeekChats.length ? 'Improving' : currentWeekChats.length < previousWeekChats.length ? 'Slowing' : 'Flat'}
              detail={`${currentWeekChats.length} inquiries this week vs ${previousWeekChats.length} last week`}
            />
            <InsightRow
              label="Visibility"
              value={zeroViewActiveListings.length > 0 ? 'At risk' : 'Healthy'}
              detail={
                zeroViewActiveListings.length > 0
                  ? `${zeroViewActiveListings.length} active ${zeroViewActiveListings.length === 1 ? 'listing has' : 'listings have'} no views`
                  : 'All active listings have at least one view'
              }
            />
            <InsightRow
              label="Response"
              value={unreadReplies > 0 ? 'Blocked' : 'Clear'}
              detail={
                unreadReplies > 0
                  ? `${unreadReplies} buyer ${unreadReplies === 1 ? 'reply is' : 'replies are'} waiting`
                  : 'No unread buyer replies'
              }
            />
            <InsightRow
              label="Inventory"
              value={freshInventoryShare >= 50 ? 'Fresh enough' : 'Aging'}
              detail={`${Math.round(freshInventoryShare)}% of active listings are newer than 14 days`}
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel title="Where is inventory getting stuck?" subtitle="Status breakdown to show whether the next action is publish, relist, or convert.">
          <div className="space-y-4">
            {statusData.map((item) => {
              const width = listings.length ? Math.max((item.value / listings.length) * 100, item.value > 0 ? 8 : 0) : 0;
              return (
                <MetricBar
                  key={item.label}
                  label={item.label}
                  hint={`${item.value} ${item.value === 1 ? 'listing' : 'listings'}`}
                  value={item.value}
                  width={width}
                  barColor={item.color}
                  textColor={item.text}
                />
              );
            })}
          </div>
        </Panel>

        <Panel title="How is attention distributed?" subtitle="Avoid pie charts. This shows how many live listings have no reach, weak reach, or healthy traction.">
          <div className="space-y-4">
            {viewDistribution.map((item) => {
              const width = activeListings.length ? Math.max((item.value / activeListings.length) * 100, item.value > 0 ? 8 : 0) : 0;
              return (
                <MetricBar
                  key={item.label}
                  label={item.label}
                  hint={item.hint}
                  value={item.value}
                  width={width}
                  barColor={item.color}
                  textColor={item.text}
                />
              );
            })}
          </div>
        </Panel>

        <Panel title="Which listings need action today?" subtitle="Ranked by urgency so you know where to intervene first.">
          <div className="space-y-4">
            {priorityListings.length === 0 ? (
              <EmptyState text="No active listings yet. Publish inventory to start receiving demand signals." />
            ) : (
              priorityListings.map((listing) => {
                const style = toneStyles[listing.tone];
                return (
                  <div key={listing.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900 line-clamp-2">{listing.title}</p>
                        <p className="mt-2 text-xs font-semibold text-slate-500">{listing.reason}</p>
                      </div>
                      <div className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${style.badge}`}>
                        {listing.tone === 'bad' ? 'Act now' : listing.tone === 'neutral' ? 'Monitor' : 'Stable'}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
                      <span className="rounded-full bg-white px-3 py-1">{listing.views} views</span>
                      <span className="rounded-full bg-white px-3 py-1">{listing.ageDays}d old</span>
                      {listing.unreadForListing > 0 && (
                        <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">{listing.unreadForListing} unread</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>
      </section>

      <section className="rounded-[36px] border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Anomaly watch</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">What needs attention automatically?</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Alerts are generated from unread demand, invisible inventory, stale inventory, and trust gaps.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {alerts.map((alert) => (
            <AlertCard key={`${alert.title}-${alert.detail}`} {...alert} />
          ))}
        </div>
      </section>
    </div>
  );
};

const LegendChip: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
    <span className={`h-2.5 w-2.5 rounded-full ${color}`}></span>
    <span>{label}</span>
  </div>
);

const InsightRow: React.FC<{ label: string; value: string; detail: string }> = ({ label, value, detail }) => (
  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</p>
    <div className="mt-2 flex items-center justify-between gap-4">
      <p className="text-xl font-black tracking-tight text-white">{value}</p>
    </div>
    <p className="mt-2 text-sm font-medium text-slate-300">{detail}</p>
  </div>
);

const Panel: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-sm">
    <h3 className="text-xl font-black tracking-tight text-slate-950">{title}</h3>
    <p className="mt-2 text-sm font-medium text-slate-500">{subtitle}</p>
    <div className="mt-6">{children}</div>
  </div>
);

const MetricBar: React.FC<{
  label: string;
  hint: string;
  value: number;
  width: number;
  barColor: string;
  textColor: string;
}> = ({ label, hint, value, width, barColor, textColor }) => (
  <div>
    <div className="mb-2 flex items-end justify-between gap-3">
      <div>
        <p className="text-sm font-black text-slate-900">{label}</p>
        <p className="text-xs font-semibold text-slate-400">{hint}</p>
      </div>
      <p className={`text-sm font-black ${textColor}`}>{value}</p>
    </div>
    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(width, 100)}%` }}></div>
    </div>
  </div>
);

const AlertCard: React.FC<{ title: string; detail: string; tone: 'good' | 'bad' | 'neutral' }> = ({
  title,
  detail,
  tone,
}) => {
  const config = {
    good: {
      wrapper: 'border-emerald-200 bg-emerald-50',
      title: 'text-emerald-900',
      detail: 'text-emerald-800',
      icon: <CheckCircle2 size={18} className="text-emerald-600" />,
    },
    bad: {
      wrapper: 'border-red-200 bg-red-50',
      title: 'text-red-900',
      detail: 'text-red-800',
      icon: <AlertTriangle size={18} className="text-red-600" />,
    },
    neutral: {
      wrapper: 'border-amber-200 bg-amber-50',
      title: 'text-amber-900',
      detail: 'text-amber-800',
      icon: <Clock3 size={18} className="text-amber-600" />,
    },
  }[tone];

  return (
    <div className={`rounded-[28px] border p-5 ${config.wrapper}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{config.icon}</div>
        <div>
          <p className={`text-sm font-black ${config.title}`}>{title}</p>
          <p className={`mt-2 text-sm font-semibold leading-relaxed ${config.detail}`}>{detail}</p>
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-500">
    {text}
  </div>
);
