import React from 'react';
import { 
  Users, 
  CreditCard, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  Cpu, 
  TrendingUp, 
  ShieldCheck, 
  TicketCheck 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

export default function AdminStatsTab({ stats, aiStats, loading, onRefresh }) {
  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center py-24">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const kpis = stats?.kpis || {};
  const growthTrend = Array.isArray(stats?.growthTrend) ? stats.growthTrend : [];
  const tierBreakdown = Array.isArray(stats?.tierBreakdown) ? stats.tierBreakdown : [];
  const aiSummary = aiStats?.summary || {};
  const aiEndpoints = Array.isArray(aiStats?.endpoints) ? aiStats.endpoints : [];

  return (
    <div className="space-y-6">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="card bg-base-100 shadow-md border border-base-content/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-base-content/60">Total Users</span>
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black mt-2">{kpis.totalUsers ?? 0}</div>
          <div className="text-[11px] text-success font-medium mt-1">
            {kpis.activeUsers ?? 0} active ({kpis.suspendedUsers ?? 0} suspended)
          </div>
        </div>

        <div className="card bg-base-100 shadow-md border border-base-content/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-base-content/60">System Transactions</span>
            <div className="p-2 bg-secondary/10 text-secondary rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black mt-2">{kpis.totalTransactions ?? 0}</div>
          <div className="text-[11px] text-base-content/50 mt-1">Total anonymized entries</div>
        </div>

        <div className="card bg-base-100 shadow-md border border-base-content/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-base-content/60">Support Tickets</span>
            <div className="p-2 bg-warning/10 text-warning rounded-xl">
              <TicketCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black mt-2">{kpis.pendingReports ?? 0}</div>
          <div className="text-[11px] text-warning font-medium mt-1">Pending admin action</div>
        </div>

        <div className="card bg-base-100 shadow-md border border-base-content/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-base-content/60">System Health</span>
            <div className="p-2 bg-error/10 text-error rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black mt-2">{kpis.unresolvedErrors ?? 0}</div>
          <div className="text-[11px] text-error font-medium mt-1">
            {kpis.recentErrors ?? 0} errors in last 30d
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Trend */}
        <div className="card bg-base-100 shadow-md border border-base-content/10 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> User Signups (Last 30 Days)
              </h3>
              <p className="text-[11px] text-base-content/50">Daily registration activity</p>
            </div>
            <button onClick={onRefresh} className="btn btn-ghost btn-xs text-primary">Refresh</button>
          </div>
          <div className="h-56 w-full min-h-[220px]">
            {growthTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={growthTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} domain={[0, 'auto']} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1e24', borderColor: '#3f3f46', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="signups" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#signupGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-base-content/50">
                No user signups recorded in this window.
              </div>
            )}
          </div>
        </div>

        {/* Tier Distribution Breakdown */}
        <div className="card bg-base-100 shadow-md border border-base-content/10 p-5">
          <h3 className="font-bold text-sm flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-success" /> User Tier Breakdown
          </h3>
          <p className="text-[11px] text-base-content/50 mb-4">Distribution by account tier</p>
          <div className="space-y-3">
            {['FREE', 'PRO', 'ENTERPRISE'].map((tName) => {
              const count = tierBreakdown.find((item) => item.tier === tName)?.count || 0;
              const total = kpis.totalUsers || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={tName} className="p-3 bg-base-200 rounded-2xl">
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <span className="font-bold">{tName}</span>
                    <span className="text-base-content/60 font-semibold">{count} users ({pct}%)</span>
                  </div>
                  <progress 
                    className={`progress w-full ${tName === 'ENTERPRISE' ? 'progress-secondary' : tName === 'PRO' ? 'progress-primary' : 'progress-neutral'}`} 
                    value={count} 
                    max={total} 
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Usage & Telemetry Section */}
      <div className="card bg-base-100 shadow-md border border-base-content/10 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-base-content/10 gap-2">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-warning" /> AI Engine Telemetry & Performance
            </h3>
            <p className="text-[11px] text-base-content/50">Real-time Gemini usage, token estimates, and latency</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-base-content/70">
              <Cpu className="w-3.5 h-3.5 text-primary" /> Calls: {aiSummary.totalCalls ?? 0}
            </span>
            <span className="flex items-center gap-1.5 text-base-content/70">
              <Sparkles className="w-3.5 h-3.5 text-warning" /> Est. Tokens: {aiSummary.totalTokens ? (aiSummary.totalTokens).toLocaleString() : 0}
            </span>
            <span className="flex items-center gap-1.5 text-base-content/70">
              <Clock className="w-3.5 h-3.5 text-info" /> Avg Latency: {aiSummary.avgLatencyMs ?? 0}ms
            </span>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="table table-xs w-full">
            <thead>
              <tr className="text-base-content/50">
                <th>Service Name</th>
                <th>API Endpoint</th>
                <th>Total Invocations</th>
                <th>Est. Tokens</th>
                <th>Avg Latency</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {aiEndpoints.map((ep) => (
                <tr key={ep.endpoint} className="hover:bg-base-200/50">
                  <td className="font-bold">{ep.name}</td>
                  <td className="font-mono text-[11px] text-base-content/60">{ep.endpoint}</td>
                  <td className="font-semibold">{(ep.totalCalls || 0).toLocaleString()}</td>
                  <td className="font-semibold">{(ep.estimatedTokens || 0).toLocaleString()}</td>
                  <td>
                    <span className="badge badge-ghost badge-sm text-[10px] font-mono">
                      {ep.avgLatencyMs || 0}ms
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-sm text-[10px] font-bold ${ep.status === 'Healthy' ? 'badge-success text-white' : 'badge-error'}`}>
                      {ep.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
