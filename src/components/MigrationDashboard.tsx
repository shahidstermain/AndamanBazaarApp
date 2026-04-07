import React, { useState, useEffect } from 'react';
import { 
  getAuthProvider, 
  isFirebaseAvailable,
  getCurrentUser 
} from '../lib/auth';
import { checkFunctionHealth } from '../lib/functions';
import { 
  Activity, 
  Database, 
  HardDrive, 
  Cloud, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  BarChart3,
  Users,
  Package,
  CreditCard,
  MapPin,
  Shield
} from 'lucide-react';

interface ProviderStatus {
  name: string;
  provider: string;
  available: boolean;
  healthy?: boolean;
  latency?: number;
  icon: React.ReactNode;
}

interface MigrationMetrics {
  totalUsers: number;
  totalListings: number;
  totalPayments: number;
  totalStorage: number;
  activeConnections: number;
  errorRate: number;
  avgResponseTime: number;
}

export const MigrationDashboard: React.FC = () => {
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [metrics, setMetrics] = useState<MigrationMetrics>({
    totalUsers: 0,
    totalListings: 0,
    totalPayments: 0,
    totalStorage: 0,
    activeConnections: 0,
    errorRate: 0,
    avgResponseTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadProviderStatuses();
    loadMetrics();
    
    const interval = setInterval(() => {
      loadProviderStatuses();
      loadMetrics();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadProviderStatuses = async () => {
    try {
      const statuses: ProviderStatus[] = [];

      // Auth Provider Status
      const authProvider = getAuthProvider();
      const firebaseAuthAvailable = isFirebaseAvailable();

      statuses.push({
        name: 'Authentication',
        provider: authProvider,
        available: firebaseAuthAvailable,
        icon: <Users className="w-5 h-5" />
      });

      statuses.push({
        name: 'Database',
        provider: 'firebase',
        available: firebaseAuthAvailable,
        icon: <Database className="w-5 h-5" />
      });

      statuses.push({
        name: 'Storage',
        provider: 'firebase',
        available: firebaseAuthAvailable,
        icon: <HardDrive className="w-5 h-5" />
      });

      const functionHealth = await checkFunctionHealth();
      statuses.push({
        name: 'Functions',
        provider: 'firebase',
        available: functionHealth.healthy,
        healthy: functionHealth.healthy,
        latency: functionHealth.latency,
        icon: <Cloud className="w-5 h-5" />
      });

      setProviderStatuses(statuses);
    } catch (error) {
      console.error('Error loading provider statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      // Mock metrics for now - in real implementation, these would come from your monitoring system
      setMetrics({
        totalUsers: 1234,
        totalListings: 5678,
        totalPayments: 12345,
        totalStorage: 1234567890, // bytes
        activeConnections: 89,
        errorRate: 0.02,
        avgResponseTime: 145
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProviderStatuses();
    await loadMetrics();
    setLastRefresh(new Date());
    setRefreshing(false);
  };

  const getStatusColor = (status: ProviderStatus) => {
    if (!status.available) return 'text-red-500';
    if (status.healthy === false) return 'text-yellow-500';
    if (status.healthy === true) return 'text-green-500';
    return 'text-green-500';
  };

  const getStatusIcon = (status: ProviderStatus) => {
    if (!status.available) return <XCircle className="w-4 h-4" />;
    if (status.healthy === false) return <AlertCircle className="w-4 h-4" />;
    if (status.healthy === true) return <CheckCircle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading migration dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Migration Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Firebase Migration Status & Monitoring
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Provider Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {providerStatuses.map((status, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={getStatusColor(status)}>
                    {status.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{status.name}</h3>
                    <p className="text-sm text-gray-500">{status.provider}</p>
                  </div>
                </div>
                <div className={getStatusColor(status)}>
                  {getStatusIcon(status)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  <span className={getStatusColor(status)}>
                    {status.available ? (status.healthy === false ? 'Degraded' : 'Healthy') : 'Unavailable'}
                  </span>
                </div>
                {status.latency && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Latency:</span>
                    <span className="text-gray-900">{status.latency}ms</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Total Users</h3>
                  <p className="text-sm text-gray-500">Active accounts</p>
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(metrics.totalUsers)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Package className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Total Listings</h3>
                  <p className="text-sm text-gray-500">Active listings</p>
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(metrics.totalListings)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <CreditCard className="w-8 h-8 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Total Payments</h3>
                  <p className="text-sm text-gray-500">Processed transactions</p>
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(metrics.totalPayments)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <HardDrive className="w-8 h-8 text-orange-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Storage Used</h3>
                  <p className="text-sm text-gray-500">Total file storage</p>
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatBytes(metrics.totalStorage)}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Active Connections</h3>
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {metrics.activeConnections}
            </div>
            <div className="text-sm text-gray-500">
              Current active users
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Error Rate</h3>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {(metrics.errorRate * 100).toFixed(2)}%
            </div>
            <div className="text-sm text-gray-500">
              Last 24 hours
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Avg Response Time</h3>
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {metrics.avgResponseTime}ms
            </div>
            <div className="text-sm text-gray-500">
              API response time
            </div>
          </div>
        </div>

        {/* Migration Progress */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Migration Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Authentication</span>
                <span className="text-green-600 font-medium">Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Database</span>
                <span className="text-green-600 font-medium">Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Storage</span>
                <span className="text-green-600 font-medium">Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Functions</span>
                <span className="text-green-600 font-medium">Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Frontend Integration</span>
                <span className="text-yellow-600 font-medium">In Progress</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
