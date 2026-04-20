import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
} from 'lucide-react';
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
import { TONE_STYLES } from './types';
import type {
  AlertData,
  ChartPoint,
  InsightItem,
  KpiCardData,
  MetricBarData,
  PriorityListingData,
  Tone,
} from './types';

export const DashboardHero: React.FC<{ totalViews: number; activeAlertCount: number }> = ({
  totalViews,
  activeAlertCount,
}) => (
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
        <SummaryStat label="Total views" value={totalViews} />
        <SummaryStat label="Active alerts" value={activeAlertCount} />
      </div>
    </div>
  </section>
);

export const KPISection: React.FC<{ kpis: KpiCardData[] }> = ({ kpis }) => (
  <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    {kpis.map((kpi) => {
      const Icon = kpi.icon;
      const trendStyles = TONE_STYLES[kpi.tone];
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
);

export const PrimaryInsightsSection: React.FC<{
  chartData: ChartPoint[];
  primaryChartTone: Tone;
  inquiryTrend: number;
  immediateReadout: InsightItem[];
}> = ({ chartData, primaryChartTone, inquiryTrend, immediateReadout }) => (
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
        <div className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-widest ${TONE_STYLES[primaryChartTone].badge}`}>
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
        {immediateReadout.map((item) => (
          <InsightRow key={item.label} {...item} />
        ))}
      </div>
    </div>
  </section>
);

export const SecondaryPanelsSection: React.FC<{
  statusData: MetricBarData[];
  viewDistribution: MetricBarData[];
  priorityListings: PriorityListingData[];
}> = ({ statusData, viewDistribution, priorityListings }) => (
  <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
    <Panel title="Where is inventory getting stuck?" subtitle="Status breakdown to show whether the next action is publish, relist, or convert.">
      <div className="space-y-4">
        {statusData.map((item) => (
          <MetricBar key={item.label} {...item} />
        ))}
      </div>
    </Panel>

    <Panel title="How is attention distributed?" subtitle="Avoid pie charts. This shows how many live listings have no reach, weak reach, or healthy traction.">
      <div className="space-y-4">
        {viewDistribution.map((item) => (
          <MetricBar key={item.label} {...item} />
        ))}
      </div>
    </Panel>

    <Panel title="Which listings need action today?" subtitle="Ranked by urgency so you know where to intervene first.">
      <div className="space-y-4">
        {priorityListings.length === 0 ? (
          <EmptyState text="No active listings yet. Publish inventory to start receiving demand signals." />
        ) : (
          priorityListings.map((listing) => <PriorityListingCard key={listing.id} listing={listing} />)
        )}
      </div>
    </Panel>
  </section>
);

export const AlertsSection: React.FC<{ alerts: AlertData[] }> = ({ alerts }) => (
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
);

const SummaryStat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</p>
    <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
  </div>
);

const LegendChip: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
    <span className={`h-2.5 w-2.5 rounded-full ${color}`}></span>
    <span>{label}</span>
  </div>
);

const InsightRow: React.FC<InsightItem> = ({ label, value, detail }) => (
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

const MetricBar: React.FC<MetricBarData> = ({ label, hint, value, width, barColor, textColor }) => (
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

const PriorityListingCard: React.FC<{ listing: PriorityListingData }> = ({ listing }) => {
  const style = TONE_STYLES[listing.tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
};

const AlertCard: React.FC<AlertData> = ({ title, detail, tone }) => {
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

const formatSignedPercent = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return '0%';
  return `${value > 0 ? '+' : ''}${Math.round(value)}%`;
};
