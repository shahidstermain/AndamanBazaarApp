import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AlertsSection, DashboardHero, KPISection, PrimaryInsightsSection, SecondaryPanelsSection } from './dashboard/DashboardSections';
import { DEFAULT_PROFILE } from './dashboard/types';
import type { DashboardState } from './dashboard/types';
import { DASHBOARD_TARGETS, daysAgo } from './dashboard/utils';
import { useDashboardMetrics } from './dashboard/useDashboardMetrics';

const EMPTY_DASHBOARD_STATE: DashboardState = {
  profile: null,
  listings: [],
  chats: [],
  recentChats: [],
};

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardState>(EMPTY_DASHBOARD_STATE);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setData(EMPTY_DASHBOARD_STATE);
        return;
      }

      const recentTrendStart = daysAgo(DASHBOARD_TARGETS.trendWindowDays * 2 - 1).toISOString();

      const [profileResult, listingsResult, chatsResult, recentChatsResult] = await Promise.all([
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
          .select('id, listing_id, seller_unread_count')
          .eq('seller_id', user.id)
          .order('last_message_at', { ascending: false }),
        supabase
          .from('chats')
          .select('created_at')
          .eq('seller_id', user.id)
          .gte('created_at', recentTrendStart)
          .order('created_at', { ascending: false }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (listingsResult.error) throw listingsResult.error;
      if (chatsResult.error) throw chatsResult.error;
      if (recentChatsResult.error) throw recentChatsResult.error;

      setData({
        profile: profileResult.data ?? DEFAULT_PROFILE,
        listings: listingsResult.data || [],
        chats: chatsResult.data || [],
        recentChats: recentChatsResult.data || [],
      });
    } catch (err) {
      console.error('Dashboard error:', err);
      setError('Dashboard data could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const metrics = useDashboardMetrics(data);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="rounded-[36px] border border-red-200 bg-red-50 p-8 shadow-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-red-600 border border-red-200">
            <AlertTriangle size={26} />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">Dashboard unavailable</h1>
          <p className="mt-3 text-sm font-medium text-slate-600">{error}</p>
          <button
            onClick={fetchDashboard}
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-slate-800"
          >
            Retry load
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-10 space-y-8">
      <DashboardHero totalViews={metrics.totalViews} activeAlertCount={metrics.activeAlertCount} />
      <KPISection kpis={metrics.kpis} />
      <PrimaryInsightsSection
        chartData={metrics.chartData}
        primaryChartTone={metrics.primaryChartTone}
        inquiryTrend={metrics.inquiryTrend}
        immediateReadout={metrics.immediateReadout}
      />
      <SecondaryPanelsSection
        statusData={metrics.statusData}
        viewDistribution={metrics.viewDistribution}
        priorityListings={metrics.priorityListings}
      />
      <AlertsSection alerts={metrics.alerts} />
    </div>
  );
};
