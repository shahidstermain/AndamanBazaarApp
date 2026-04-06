import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import { collection, getDocs, getCountFromServer, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { Report, AppRole } from '../types';
import {
  ShieldAlert, Users, FileText, CheckCircle, XCircle,
  AlertTriangle, Clock, Search, ExternalLink, Loader2,
  Filter, ChevronDown
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { COPY } from '../lib/localCopy';

export const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    pendingReports: 0,
    totalUsers: 0
  });
  const [reports, setReports] = useState<Report[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/auth');
        return;
      }

      const rolesSnap = await getDocs(
        query(collection(db, 'user_roles'),
          where('userId', '==', user.uid),
          where('role', '==', 'admin'))
      );

      if (rolesSnap.empty) {
        showToast('Access denied. Admin privileges required.', 'error');
        navigate('/');
        return;
      }

      setIsAdmin(true);
      fetchDashboardData();
    } catch (err) {
      console.error('Admin check error:', err);
      navigate('/');
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [totalSnap, activeSnap, pendingSnap, usersSnap, reportsSnap] = await Promise.all([
        getCountFromServer(collection(db, 'listings')),
        getCountFromServer(query(collection(db, 'listings'), where('status', '==', 'active'))),
        getCountFromServer(query(collection(db, 'reports'), where('status', '==', 'pending'))),
        getCountFromServer(collection(db, 'users')),
        getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'))),
      ]);

      setStats({
        totalListings: totalSnap.data().count,
        activeListings: activeSnap.data().count,
        pendingReports: pendingSnap.data().count,
        totalUsers: usersSnap.data().count,
      });

      setReports(reportsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: newStatus });

      setReports(prev => prev.map(r => 
        r.id === reportId ? { ...r, status: newStatus as any } : r
      ));
      
      // Update stats if status changed from/to pending
      const report = reports.find(r => r.id === reportId);
      if (report?.status === 'pending' && newStatus !== 'pending') {
        setStats(prev => ({ ...prev, pendingReports: prev.pendingReports - 1 }));
      } else if (report?.status !== 'pending' && newStatus === 'pending') {
        setStats(prev => ({ ...prev, pendingReports: prev.pendingReports + 1 }));
      }

      showToast(`Report marked as ${newStatus}`, 'success');
    } catch (err) {
      console.error('Error updating report:', err);
      showToast('Failed to update report status', 'error');
    }
  };

  const filteredReports = reports.filter(r => 
    filterStatus === 'all' ? true : r.status === filterStatus
  );

  if (!isAdmin && loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-warm-50">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        <p className="text-xs font-bold uppercase tracking-widest text-warm-400 mt-4">Verifying Access...</p>
      </div>
    );
  }

  if (!isAdmin) return null; // Should redirect in useEffect

  return (
    <div className="min-h-screen bg-warm-50 pb-20">
      {/* Header */}
      <div className="bg-midnight-700 text-white pt-24 pb-12 px-4 md:px-8 rounded-b-[40px] shadow-xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-white/10">
                <ShieldAlert size={12} className="text-coral-400" /> Admin Console
              </div>
              <h1 className="text-3xl md:text-4xl font-heading font-black tracking-tight">Dashboard Overview</h1>
              <p className="text-white/60 mt-2 font-medium">{COPY.ADMIN.DASHBOARD_GREETING}</p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={fetchDashboardData}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
              >
                <Loader2 size={16} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Listings', value: stats.totalListings, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Active Listings', value: stats.activeListings, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pending Reports', value: stats.pendingReports, icon: AlertTriangle, color: 'text-coral-600', bg: 'bg-coral-50' },
            { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl shadow-card border border-warm-100 flex flex-col items-center text-center hover:shadow-card-hover transition-all">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${stat.bg}`}>
                <stat.icon size={24} className={stat.color} />
              </div>
              <span className="text-3xl font-heading font-black text-midnight-700">{stat.value}</span>
              <span className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mt-1">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Moderation Section */}
        <div className="bg-white rounded-[32px] shadow-card border border-warm-200 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-warm-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-heading font-black text-midnight-700">Moderation Queue</h2>
              <p className="text-sm text-warm-400 font-medium">{stats.pendingReports > 0 ? COPY.ADMIN.PENDING_QUEUE(stats.pendingReports) : 'Review reported listings and user flags'}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Filter size={16} className="text-warm-400" />
              <div className="flex bg-warm-50 p-1 rounded-xl border border-warm-200">
                {['all', 'pending', 'resolved', 'dismissed'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      filterStatus === status 
                        ? 'bg-white text-midnight-700 shadow-sm' 
                        : 'text-warm-400 hover:text-midnight-700'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-warm-50 text-[10px] font-black text-warm-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Reported Item</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Reporter</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-warm-400 font-medium">
                      No reports found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-warm-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-midnight-700 text-sm">{report.listing?.title || 'Unknown Listing'}</span>
                          <Link 
                            to={`/listings/${report.listing_id}`} 
                            target="_blank"
                            className="text-[10px] font-bold text-teal-600 flex items-center gap-1 hover:underline mt-0.5"
                          >
                            View Listing <ExternalLink size={10} />
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-warm-100 text-midnight-700 text-xs font-bold capitalize">
                          <AlertTriangle size={12} className="text-coral-500" />
                          {report.reason.replace('_', ' ')}
                        </div>
                        {report.description && (
                          <p className="text-xs text-warm-500 mt-1 max-w-xs truncate" title={report.description}>
                            "{report.description}"
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-midnight-700">{report.reporter?.name || 'Anonymous'}</span>
                          <span className="text-[10px] text-warm-400">{report.reporter?.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-warm-500">
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          report.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          report.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                          report.status === 'dismissed' ? 'bg-slate-100 text-slate-600' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            report.status === 'pending' ? 'bg-amber-500 animate-pulse' :
                            report.status === 'resolved' ? 'bg-emerald-500' :
                            report.status === 'dismissed' ? 'bg-slate-500' :
                            'bg-blue-500'
                          }`} />
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {report.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateReportStatus(report.id, 'resolved')}
                                className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-100"
                                title="Resolve & Take Action"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                onClick={() => updateReportStatus(report.id, 'dismissed')}
                                className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200"
                                title="Dismiss Report"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          {report.status !== 'pending' && (
                            <button
                              onClick={() => updateReportStatus(report.id, 'pending')}
                              className="p-2 rounded-xl bg-warm-100 text-warm-500 hover:bg-warm-200 transition-colors"
                              title="Reopen"
                            >
                              <Clock size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
