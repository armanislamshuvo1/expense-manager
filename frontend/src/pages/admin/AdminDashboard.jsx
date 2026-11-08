import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAxiosSecure } from '../../hooks/useApi';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  ArrowLeft, 
  BarChart3, 
  Users, 
  TicketCheck, 
  AlertTriangle, 
  Gift 
} from 'lucide-react';
import Swal from 'sweetalert2';

import AdminStatsTab from './components/AdminStatsTab';
import AdminUsersTab from './components/AdminUsersTab';
import AdminReportsTab from './components/AdminReportsTab';
import AdminLogsTab from './components/AdminLogsTab';
import AdminBannersTab from './components/AdminBannersTab';

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('stats');

  // Stats Data
  const [stats, setStats] = useState(null);
  const [aiStats, setAiStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Users Data
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [userTierFilter, setUserTierFilter] = useState('');

  // Reports Data
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState('');
  const [reportCategoryFilter, setReportCategoryFilter] = useState('');

  // Logs Data
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logLevelFilter, setLogLevelFilter] = useState('');
  const [logResolvedFilter, setLogResolvedFilter] = useState('');

  // Banners Data
  const [banners, setBanners] = useState([]);
  const [activeBanner, setActiveBanner] = useState(null);
  const [bannersLoading, setBannersLoading] = useState(false);

  // Fetch Methods
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const [overviewRes, aiRes] = await Promise.all([
        axiosSecure.get('/api/admin/stats/overview'),
        axiosSecure.get('/api/admin/stats/ai')
      ]);
      if (overviewRes.data.success) setStats(overviewRes.data.data);
      if (aiRes.data.success) setAiStats(aiRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const params = { limit: 50 };
      if (userSearch?.trim()) params.search = userSearch.trim();
      if (userRoleFilter) params.role = userRoleFilter;
      if (userStatusFilter) params.status = userStatusFilter;
      if (userTierFilter) params.tier = userTierFilter;

      const res = await axiosSecure.get('/api/admin/users', { params });
      if (res.data.success) {
        setUsers(Array.isArray(res.data.data?.users) ? res.data.data.users : (Array.isArray(res.data.data) ? res.data.data : []));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const params = { limit: 50 };
      if (reportStatusFilter) params.status = reportStatusFilter;
      if (reportCategoryFilter) params.category = reportCategoryFilter;

      const res = await axiosSecure.get('/api/admin/reports', { params });
      if (res.data.success) {
        setReports(Array.isArray(res.data.data?.reports) ? res.data.data.reports : (Array.isArray(res.data.data) ? res.data.data : []));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const params = { limit: 50 };
      if (logLevelFilter) params.level = logLevelFilter;
      if (logResolvedFilter) params.resolved = logResolvedFilter;

      const res = await axiosSecure.get('/api/admin/logs', { params });
      if (res.data.success) {
        setLogs(Array.isArray(res.data.data?.logs) ? res.data.data.logs : (Array.isArray(res.data.data) ? res.data.data : []));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchBanners = async () => {
    setBannersLoading(true);
    try {
      const [listRes, activeRes] = await Promise.all([
        axiosSecure.get('/api/admin/promo-banners'),
        axiosSecure.get('/api/admin/promo-banner')
      ]);
      if (listRes.data.success) setBanners(Array.isArray(listRes.data.data) ? listRes.data.data : []);
      if (activeRes.data.success) setActiveBanner(activeRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setBannersLoading(false);
    }
  };

  // Preload tabs on initial mount for instant tab switching
  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchReports();
    fetchLogs();
    fetchBanners();
  }, []);

  // Refetch when tab filters change
  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [userRoleFilter, userStatusFilter, userTierFilter]);

  useEffect(() => {
    if (activeTab === 'reports') fetchReports();
  }, [reportStatusFilter, reportCategoryFilter]);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
  }, [logLevelFilter, logResolvedFilter]);

  // Debounced search for users
  useEffect(() => {
    if (activeTab !== 'users') return;
    const timeout = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearch]);

  // User Actions
  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await axiosSecure.put(`/api/admin/users/${userId}/role`, { role: newRole });
      if (res.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Role Updated',
          text: res.data.message,
          timer: 2000,
          showConfirmButton: false,
          background: '#1e1e24',
          color: '#ffffff'
        });
        fetchUsers();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Update Denied',
        text: err.response?.data?.message || 'Failed to update user role.',
        background: '#1e1e24',
        color: '#ffffff'
      });
    }
  };

  const handleTierChange = async (userId, newTier) => {
    try {
      const res = await axiosSecure.put(`/api/admin/users/${userId}/tier`, { tier: newTier });
      if (res.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Tier Updated',
          text: `User tier changed to ${newTier}`,
          timer: 1500,
          showConfirmButton: false,
          background: '#1e1e24',
          color: '#ffffff'
        });
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: err.response?.data?.message || 'Failed to update user tier.',
        background: '#1e1e24',
        color: '#ffffff'
      });
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      const res = await axiosSecure.put(`/api/admin/users/${userId}/status`, { status: newStatus });
      if (res.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Status Updated',
          text: `User status changed to ${newStatus}`,
          timer: 1500,
          showConfirmButton: false,
          background: '#1e1e24',
          color: '#ffffff'
        });
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Action Denied',
        text: err.response?.data?.message || 'Failed to change user status.',
        background: '#1e1e24',
        color: '#ffffff'
      });
    }
  };

  // Report Actions
  const handleUpdateReportStatus = async (reportId, status, adminNotes) => {
    try {
      const res = await axiosSecure.put(`/api/admin/reports/${reportId}/status`, {
        status,
        adminNotes
      });
      if (res.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Ticket Updated',
          text: `Status changed to ${status}`,
          timer: 1500,
          showConfirmButton: false,
          background: '#1e1e24',
          color: '#ffffff'
        });
        fetchReports();
        fetchStats();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: err.response?.data?.message || 'Could not update ticket status.',
        background: '#1e1e24',
        color: '#ffffff'
      });
    }
  };

  // Log Actions
  const handleResolveLog = async (logId) => {
    try {
      const res = await axiosSecure.put(`/api/admin/logs/${logId}/resolve`);
      if (res.data.success) {
        fetchLogs();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePurgeResolved = async () => {
    try {
      const res = await axiosSecure.delete('/api/admin/logs/resolved');
      if (res.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Logs Purged',
          text: res.data.message,
          timer: 2000,
          showConfirmButton: false,
          background: '#1e1e24',
          color: '#ffffff'
        });
        fetchLogs();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Banner Actions
  const handleSaveBanner = async (bannerForm) => {
    try {
      let res;
      if (bannerForm._id) {
        res = await axiosSecure.put(`/api/admin/promo-banners/${bannerForm._id}`, bannerForm);
      } else {
        res = await axiosSecure.post('/api/admin/promo-banners', bannerForm);
      }
      if (res.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Banner Saved',
          timer: 1500,
          showConfirmButton: false,
          background: '#1e1e24',
          color: '#ffffff'
        });
        fetchBanners();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Save Error',
        text: err.response?.data?.message || 'Failed to save banner.',
        background: '#1e1e24',
        color: '#ffffff'
      });
      throw err;
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    try {
      const res = await axiosSecure.delete(`/api/admin/promo-banners/${bannerId}`);
      if (res.data.success) {
        fetchBanners();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActiveBanner = async (banner) => {
    try {
      const res = await axiosSecure.put(`/api/admin/promo-banners/${banner._id}`, {
        ...banner,
        isActive: !banner.isActive
      });
      if (res.data.success) {
        fetchBanners();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-base-300 pb-24 text-base-content font-sans">
      {/* Top Header */}
      <div className="bg-base-200 p-5 rounded-b-3xl shadow-lg border-b border-base-content/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/more')} className="btn btn-ghost btn-circle btn-sm">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold flex items-center gap-2 text-error">
                  <ShieldAlert className="w-5 h-5" /> Admin Portal
                </h1>
                <span className="badge badge-error badge-outline text-[10px] font-bold">
                  {currentUser?.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'ADMIN'}
                </span>
              </div>
              <p className="text-xs text-base-content/50">
                Zero-Trust Telemetry, Role Guards, User Tiers & Problem Reports
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-base-300 rounded-2xl">
            <button
              onClick={() => setActiveTab('stats')}
              className={`btn btn-sm text-xs font-bold rounded-xl gap-1.5 ${
                activeTab === 'stats' ? 'btn-primary shadow-sm' : 'btn-ghost'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Analytics
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`btn btn-sm text-xs font-bold rounded-xl gap-1.5 ${
                activeTab === 'users' ? 'btn-primary shadow-sm' : 'btn-ghost'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Users & Tiers
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`btn btn-sm text-xs font-bold rounded-xl gap-1.5 relative ${
                activeTab === 'reports' ? 'btn-primary shadow-sm' : 'btn-ghost'
              }`}
            >
              <TicketCheck className="w-3.5 h-3.5" /> Reports
              {stats?.kpis?.pendingReports > 0 && (
                <span className="badge badge-warning badge-xs px-1 font-bold">
                  {stats.kpis.pendingReports}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`btn btn-sm text-xs font-bold rounded-xl gap-1.5 ${
                activeTab === 'logs' ? 'btn-primary shadow-sm' : 'btn-ghost'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> System Logs
              {stats?.kpis?.unresolvedErrors > 0 && (
                <span className="badge badge-error badge-xs px-1 font-bold text-white">
                  {stats.kpis.unresolvedErrors}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('banners')}
              className={`btn btn-sm text-xs font-bold rounded-xl gap-1.5 ${
                activeTab === 'banners' ? 'btn-primary shadow-sm' : 'btn-ghost'
              }`}
            >
              <Gift className="w-3.5 h-3.5" /> Banners
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {activeTab === 'stats' && (
          <AdminStatsTab
            stats={stats}
            aiStats={aiStats}
            loading={statsLoading}
            onRefresh={fetchStats}
          />
        )}

        {activeTab === 'users' && (
          <AdminUsersTab
            users={users}
            currentUser={currentUser}
            loading={usersLoading}
            onRoleChange={handleRoleChange}
            onStatusChange={handleStatusChange}
            onTierChange={handleTierChange}
            onSearch={setUserSearch}
            searchQuery={userSearch}
            roleFilter={userRoleFilter}
            setRoleFilter={setUserRoleFilter}
            statusFilter={userStatusFilter}
            setStatusFilter={setUserStatusFilter}
            tierFilter={userTierFilter}
            setTierFilter={setUserTierFilter}
            onRefresh={fetchUsers}
          />
        )}

        {activeTab === 'reports' && (
          <AdminReportsTab
            reports={reports}
            loading={reportsLoading}
            onUpdateStatus={handleUpdateReportStatus}
            statusFilter={reportStatusFilter}
            setStatusFilter={setReportStatusFilter}
            categoryFilter={reportCategoryFilter}
            setCategoryFilter={setReportCategoryFilter}
            onRefresh={fetchReports}
          />
        )}

        {activeTab === 'logs' && (
          <AdminLogsTab
            logs={logs}
            loading={logsLoading}
            onResolveLog={handleResolveLog}
            onPurgeResolved={handlePurgeResolved}
            levelFilter={logLevelFilter}
            setLevelFilter={setLogLevelFilter}
            resolvedFilter={logResolvedFilter}
            setResolvedFilter={setLogResolvedFilter}
            onRefresh={fetchLogs}
          />
        )}

        {activeTab === 'banners' && (
          <AdminBannersTab
            banners={banners}
            activeBanner={activeBanner}
            onSaveBanner={handleSaveBanner}
            onDeleteBanner={handleDeleteBanner}
            onToggleActive={handleToggleActiveBanner}
            loading={bannersLoading}
          />
        )}
      </div>
    </div>
  );
}
