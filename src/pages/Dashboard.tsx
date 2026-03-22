
import React, { useState, useEffect } from 'react';
import { doc, getDoc, getDocs, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeAds: 0,
    totalViews: 0,
    successfulSales: 0,
    responseTime: '15 MINS'
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) return;

        // 1. Fetch Profile Data
        const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
        const profile = profileSnap.exists() ? profileSnap.data() : null;

        // 2. Fetch User Listings for Counts
        const listingsSnap = await getDocs(query(collection(db, 'listings'), where('user_id', '==', user.uid)));
        const listings = listingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        if (listings) {
          const active = listings.filter(l => l.status === 'active').length;
          const totalViews = listings.reduce((sum, l) => sum + (l.views_count || 0), 0);

          // Calculate response time from actual chats
          let responseTimeStr = '—';
          try {
            const chatsSnap = await getDocs(query(collection(db, 'chats'), where('seller_id', '==', user.uid), limit(20)));
            const userChats = chatsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

            if (userChats && userChats.length > 0) {
              const chatIds = userChats.map((c: any) => c.id);
              // Firestore 'in' max 30
              const msgSnap = await getDocs(query(collection(db, 'messages'), where('chat_id', 'in', chatIds.slice(0, 30)), where('sender_id', '==', user.uid), orderBy('created_at', 'asc')));
              const firstReplies = msgSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

              if (firstReplies && firstReplies.length > 0) {
                // Get first seller reply per chat
                const firstReplyByChat = new Map<string, string>();
                firstReplies.forEach(m => {
                  if (!firstReplyByChat.has(m.chat_id)) firstReplyByChat.set(m.chat_id, m.created_at);
                });

                let totalMs = 0;
                let count = 0;
                userChats.forEach(chat => {
                  const replyTime = firstReplyByChat.get(chat.id);
                  if (replyTime) {
                    const diff = new Date(replyTime).getTime() - new Date(chat.created_at).getTime();
                    if (diff > 0) { totalMs += diff; count++; }
                  }
                });

                if (count > 0) {
                  const avgMins = Math.round(totalMs / count / 60000);
                  responseTimeStr = avgMins < 60 ? `${avgMins} MIN${avgMins !== 1 ? 'S' : ''}` : `${Math.round(avgMins / 60)} HR${Math.round(avgMins / 60) !== 1 ? 'S' : ''}`;
                }
              }
            }
          } catch { /* non-critical */ }

          setStats({
            activeAds: active,
            totalViews: totalViews,
            successfulSales: profile?.successful_sales || 0,
            responseTime: responseTimeStr
          });

          // P5: Generate chart data from actual last 7 days
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const recentListings = listings.filter(l => new Date(l.created_at) >= sevenDaysAgo);

          const dayLabels: string[] = [];
          const viewsByDate: Record<string, number> = {};
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const label = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dateKey = d.toISOString().split('T')[0];
            dayLabels.push(label);
            viewsByDate[dateKey] = 0;
          }

          recentListings.forEach(l => {
            const dateKey = new Date(l.created_at).toISOString().split('T')[0];
            if (dateKey in viewsByDate) {
              viewsByDate[dateKey] += l.views_count || 0;
            }
          });

          const dateKeys = Object.keys(viewsByDate);
          setChartData(dayLabels.map((label, i) => ({ name: label, views: viewsByDate[dateKeys[i]] })));
        }
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const targetSales = 5;
  const progressPercent = Math.min((stats.successfulSales / targetSales) * 100, 100);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-ocean-600"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">My Activity</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Lifecycle Tracking & Performance</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-sm flex items-center space-x-6">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Response Time</p>
            <p className="text-xl font-black text-ocean-700">~ {stats.responseTime}</p>
          </div>
          <div className="w-px h-10 bg-slate-100"></div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
            <p className="text-xl font-black text-black">ACTIVE</p>
          </div>
        </div>
      </div>

      <section className="bg-slate-950 text-white p-8 md:p-12 rounded-[40px] mb-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl">🏆</div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Road to Island Legend</h2>
          <p className="text-slate-400 font-medium mb-8 leading-snug">
            {stats.successfulSales >= targetSales
              ? "Congratulations! You are an Island Legend. Your listings get maximum visibility."
              : `Complete ${targetSales - stats.successfulSales} more successful sales to unlock the Island Legend badge.`}
          </p>

          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span>Progression</span>
              <span>{stats.successfulSales} / {targetSales} Sales</span>
            </div>
            <div className="h-6 bg-white/10 rounded-full overflow-hidden border border-white/10 p-1">
              <div
                className={`h-full bg-ocean-500 rounded-full transition-all duration-1000 ${stats.successfulSales >= targetSales ? 'w-full' :
                    stats.successfulSales === 4 ? 'w-4/5' :
                      stats.successfulSales === 3 ? 'w-3/5' :
                        stats.successfulSales === 2 ? 'w-2/5' :
                          stats.successfulSales === 1 ? 'w-1/5' : 'w-0'
                  }`}
              ></div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border-4 border-slate-50 shadow-sm">
          <h3 className="text-xl font-black uppercase tracking-tight mb-8">Engagement (Total Views)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="views" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#0369a1' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-ocean-50 p-8 rounded-[40px] border-4 border-ocean-100">
            <h3 className="font-black uppercase tracking-tight text-ocean-900 mb-4">Account Health</h3>
            <ul className="space-y-4">
              {[
                `${stats.activeAds} active listings now live`,
                `${stats.totalViews} total item views`,
                "Verified location increases trust"
              ].map((tip, i) => (
                <li key={i} className="flex items-start text-xs font-bold text-ocean-800">
                  <span className="mr-2">⚡</span> {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-8 rounded-[40px] border-4 border-slate-50 shadow-sm">
            <h3 className="font-black uppercase tracking-tight mb-6">Real-Time Pulse</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">👤</div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase">Recent Activity</p>
                  <p className="text-xs font-bold text-slate-400">Total Views: {stats.totalViews}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
