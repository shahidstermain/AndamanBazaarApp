import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertsSection, DashboardHero, KPISection, PrimaryInsightsSection, SecondaryPanelsSection } from './dashboard/DashboardSections';
import { DEFAULT_PROFILE } from './dashboard/types';
import type { DashboardState } from './dashboard/types';
import { useDashboardMetrics } from './dashboard/useDashboardMetrics';

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

  const metrics = useDashboardMetrics(data);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600"></div>
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
