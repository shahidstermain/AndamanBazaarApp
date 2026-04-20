import { useMemo } from 'react';
import {
  Clock3,
  Eye,
  Layers3,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import type {
  AlertData,
  ChatRow,
  DashboardMetrics,
  KpiCardData,
  ListingRow,
  MetricBarData,
  ProfileRow,
  Tone,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_TARGET = 5;
const HEALTHY_VIEWS_PER_LISTING = 20;

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

const getTrendTone = (value: number): Tone => {
  if (value === 0) return 'neutral';
  return value > 0 ? 'good' : 'bad';
};

const toMetricBar = (
  label: string,
  hint: string,
  value: number,
  total: number,
  barColor: string,
  textColor: string,
): MetricBarData => ({
  label,
  hint,
  value,
  width: total ? Math.max((value / total) * 100, value > 0 ? 8 : 0) : 0,
  barColor,
  textColor,
});

export const useDashboardMetrics = ({
  profile,
  listings,
  chats,
}: {
  profile: ProfileRow | null;
  listings: ListingRow[];
  chats: ChatRow[];
}): DashboardMetrics =>
  useMemo(() => {
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
    const freshActiveListings = activeListings.filter(
      (listing) => new Date(listing.created_at).getTime() >= Date.now() - 14 * DAY_MS,
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

      return {
        label: currentDay.toLocaleDateString('en-IN', { weekday: 'short' }),
        current: currentChatCountByDay.get(currentDay.getTime()) || 0,
        previous: previousChatCountByDay.get(previousDay.getTime()) || 0,
      };
    });

    const statusData = [
      toMetricBar('Active', `${activeListings.length} ${activeListings.length === 1 ? 'listing' : 'listings'}`, activeListings.length, listings.length, 'bg-emerald-500', 'text-emerald-700'),
      toMetricBar('Draft', `${draftListings.length} ${draftListings.length === 1 ? 'listing' : 'listings'}`, draftListings.length, listings.length, 'bg-amber-500', 'text-amber-700'),
      toMetricBar('Sold', `${soldListings.length} ${soldListings.length === 1 ? 'listing' : 'listings'}`, soldListings.length, listings.length, 'bg-slate-900', 'text-slate-900'),
      toMetricBar('Expired', `${expiredListings.length} ${expiredListings.length === 1 ? 'listing' : 'listings'}`, expiredListings.length, listings.length, 'bg-red-500', 'text-red-700'),
    ].filter((item) => item.value > 0 || listings.length === 0);

    const viewDistribution = [
      toMetricBar(
        'No exposure',
        '0 views',
        activeListings.filter((listing) => (listing.views_count || 0) === 0).length,
        activeListings.length,
        'bg-red-500',
        'text-red-700',
      ),
      toMetricBar(
        'Low traction',
        '1-9 views',
        activeListings.filter((listing) => {
          const views = listing.views_count || 0;
          return views > 0 && views < 10;
        }).length,
        activeListings.length,
        'bg-amber-500',
        'text-amber-700',
      ),
      toMetricBar(
        'Healthy',
        '10-24 views',
        activeListings.filter((listing) => {
          const views = listing.views_count || 0;
          return views >= 10 && views < 25;
        }).length,
        activeListings.length,
        'bg-emerald-500',
        'text-emerald-700',
      ),
      toMetricBar(
        'Top performers',
        '25+ views',
        activeListings.filter((listing) => (listing.views_count || 0) >= 25).length,
        activeListings.length,
        'bg-slate-900',
        'text-slate-900',
      ),
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
        let tone: Tone = 'good';

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

    const alerts: AlertData[] = [];

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

    const primaryChartTone: Tone =
      currentWeekChats.length === previousWeekChats.length
        ? 'neutral'
        : currentWeekChats.length > previousWeekChats.length
          ? 'good'
          : 'bad';

    const immediateReadout: DashboardMetrics['immediateReadout'] = [
      {
        label: 'Demand',
        value:
          currentWeekChats.length === 0
            ? 'Cold'
            : currentWeekChats.length > previousWeekChats.length
              ? 'Improving'
              : currentWeekChats.length < previousWeekChats.length
                ? 'Slowing'
                : 'Flat',
        detail: `${currentWeekChats.length} inquiries this week vs ${previousWeekChats.length} last week`,
      },
      {
        label: 'Visibility',
        value: zeroViewActiveListings.length > 0 ? 'At risk' : 'Healthy',
        detail:
          zeroViewActiveListings.length > 0
            ? `${zeroViewActiveListings.length} active ${zeroViewActiveListings.length === 1 ? 'listing has' : 'listings have'} no views`
            : 'All active listings have at least one view',
      },
      {
        label: 'Response',
        value: unreadReplies > 0 ? 'Blocked' : 'Clear',
        detail:
          unreadReplies > 0
            ? `${unreadReplies} buyer ${unreadReplies === 1 ? 'reply is' : 'replies are'} waiting`
            : 'No unread buyer replies',
      },
      {
        label: 'Inventory',
        value: freshInventoryShare >= 50 ? 'Fresh enough' : 'Aging',
        detail: `${Math.round(freshInventoryShare)}% of active listings are newer than 14 days`,
      },
    ];

    const kpis: KpiCardData[] = [
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

    return {
      totalViews,
      activeAlertCount: alerts.filter((alert) => alert.tone !== 'good').length,
      kpis,
      chartData,
      primaryChartTone,
      inquiryTrend,
      immediateReadout,
      statusData,
      viewDistribution,
      priorityListings,
      alerts,
    };
  }, [profile, listings, chats]);
