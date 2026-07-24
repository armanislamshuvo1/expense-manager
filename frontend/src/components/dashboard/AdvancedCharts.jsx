import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { Activity, Calendar } from 'lucide-react';
import ErrorBoundary from '../ErrorBoundary';

const ACCENT_COLOR = '#ff5c5c';

const AdvancedCharts = React.memo(({
  showAdvancedCharts,
  setShowAdvancedCharts,
  netWorthData = [],
  cashFlowData = [],
  isDark = true,
  baseCurrency = 'MYR'
}) => {
  const tooltipStyle = useMemo(() => ({
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '12px',
    fontSize: '11px',
    color: isDark ? '#ffffff' : '#1e293b'
  }), [isDark]);

  return (
    <div className="space-y-6">
      {/* Toggle for Net Worth & Cash Flow Charts */}
      <div className="text-center">
        <button 
          onClick={() => setShowAdvancedCharts(!showAdvancedCharts)}
          className="btn btn-xs btn-outline btn-ghost text-base-content/60 hover:text-base-content hover:bg-base-200"
        >
          {showAdvancedCharts ? 'Hide Advanced Metrics' : 'Show Advanced Metrics'}
        </button>
      </div>

      {showAdvancedCharts && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fadeIn">
          {/* Net Worth Chart */}
          <div className={`backdrop-blur-xl border rounded-3xl p-5 shadow-xl flex flex-col h-80 transition-all duration-300 ${
            isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80 shadow-md'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className={`text-xs uppercase tracking-widest font-bold ${isDark ? 'opacity-40 text-white' : 'text-slate-400'}`}>Net Worth Tracker</h3>
                <p className="text-[10px] text-error/90 mt-0.5 font-medium">Assets vs Estimated Liabilities</p>
              </div>
              <Activity className="w-4 h-4 text-error" />
            </div>
            <div className="flex-1 min-h-0">
              {netWorthData && netWorthData.length > 0 ? (
                <ErrorBoundary>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={netWorthData}>
                      <defs>
                        <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={ACCENT_COLOR} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={ACCENT_COLOR} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke={isDark ? "#ffffff" : "#334155"} opacity={0.2} fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke={isDark ? "#ffffff" : "#334155"} opacity={0.2} fontSize={9} tickLine={false} axisLine={false} width={45} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="Assets" stroke={ACCENT_COLOR} strokeWidth={2.5} fillOpacity={1} fill="url(#colorAssets)" />
                      <Area type="monotone" dataKey="Liabilities" stroke={ACCENT_COLOR} strokeDasharray="4 4" strokeWidth={1.5} fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ErrorBoundary>
              ) : (
                <div className="flex items-center justify-center h-full text-xs opacity-40">No statistics available.</div>
              )}
            </div>
          </div>

          {/* Cash Flow Income vs Expense */}
          <div className={`backdrop-blur-xl border rounded-3xl p-5 shadow-xl flex flex-col h-80 transition-all duration-300 ${
            isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80 shadow-md'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className={`text-xs uppercase tracking-widest font-bold ${isDark ? 'opacity-40 text-white' : 'text-slate-400'}`}>Monthly Cash Flow</h3>
                <p className="text-[10px] text-error/90 mt-0.5 font-medium">Income vs Expenses</p>
              </div>
              <Calendar className="w-4 h-4 text-error" />
            </div>
            <div className="flex-1 min-h-0">
              {cashFlowData && cashFlowData.length > 0 ? (
                <ErrorBoundary>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={cashFlowData}>
                      <XAxis dataKey="name" stroke={isDark ? "#ffffff" : "#334155"} opacity={0.2} fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke={isDark ? "#ffffff" : "#334155"} opacity={0.2} fontSize={9} tickLine={false} axisLine={false} width={45} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="Income" fill={ACCENT_COLOR} fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Expenses" fill={ACCENT_COLOR} fillOpacity={0.25} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ErrorBoundary>
              ) : (
                <div className="flex items-center justify-center h-full text-xs opacity-40">No statistics available.</div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
});

AdvancedCharts.displayName = 'AdvancedCharts';

export default AdvancedCharts;
