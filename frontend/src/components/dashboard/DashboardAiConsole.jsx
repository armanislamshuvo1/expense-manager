import React from 'react';
import { Sparkles, Camera, Plus, Loader2, MessageSquare, AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardAiConsole({
  isDark,
  navigate,
  setReceiptModalOpen,
  handleQuickLogSubmit,
  quickLogText,
  setQuickLogText,
  parsing,
  aiInsights = { digest: '', anomalies: [] },
  onRefreshInsights,
  isRefreshingInsights = false
}) {
  return (
    <div className="space-y-4">
      {/* AI Advisor Card & Scanner Trigger */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`md:col-span-2 backdrop-blur-xl border rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between shadow-md transition-all gap-4 ${
          isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
        }`}>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-secondary-app to-indigo-600 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider">WealthBuddy AI Advisor</h3>
              <p className="text-[10px] opacity-60">Chat about budgets, spend patterns & custom reports.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/wealthbuddy')}
            className="btn btn-sm bg-secondary-app hover:bg-indigo-600 text-white font-bold rounded-xl border-none shadow-md shadow-secondary-app/20 w-full md:w-auto"
          >
            <MessageSquare className="w-4 h-4 mr-1" /> Chat Advisor
          </button>
        </div>

        <div className={`backdrop-blur-xl border rounded-3xl p-4 flex items-center justify-between shadow-md transition-all ${
          isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-base-300 flex items-center justify-center text-primary-app border border-base-content/10 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider">Scan Receipt</h3>
              <p className="text-[10px] opacity-60">Extract automatically.</p>
            </div>
          </div>
          <button 
            onClick={() => setReceiptModalOpen(true)}
            className="btn btn-sm btn-circle btn-ghost text-primary-app"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick AI Log Bar */}
      <form 
        onSubmit={handleQuickLogSubmit}
        className={`flex items-center gap-2 p-2 border rounded-2xl transition-all shadow-md ${
          isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200'
        }`}
      >
        <input
          type="text"
          value={quickLogText}
          onChange={(e) => setQuickLogText(e.target.value)}
          placeholder="Log with AI... (e.g. Spent 15 on shopping using Bank Account)"
          className="flex-1 input input-ghost bg-transparent focus:bg-transparent text-xs outline-none focus:outline-none border-none py-2 px-3 h-10 w-full"
        />
        <button
          type="submit"
          disabled={parsing || !quickLogText.trim()}
          className="btn btn-circle bg-primary-app text-slate-950 hover:bg-cyan-400 border-none h-10 w-10 min-h-10 text-white"
        >
          {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        </button>
      </form>

      {/* AI Insights Summary & Alerts */}
      {aiInsights.digest && (
        <div className={`backdrop-blur-xl border rounded-3xl p-4 shadow-md transition-all ${
          isDark ? 'bg-gradient-to-br from-[#0f172a]/80 to-[#1e1b4b]/20 border-white/5' : 'bg-gradient-to-br from-white to-red-50/20 border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary-app" />
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-primary-app">AI Financial Summary</span>
            </div>
            {onRefreshInsights && (
              <button
                type="button"
                onClick={onRefreshInsights}
                disabled={isRefreshingInsights}
                className="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-primary-app transition-colors disabled:opacity-50"
                title="Refresh summary using latest notes & details"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingInsights ? 'animate-spin text-primary-app' : ''}`} />
              </button>
            )}
          </div>
          <p className="text-xs leading-relaxed opacity-95">{aiInsights.digest}</p>
        </div>
      )}

      {/* Anomaly Alerts */}
      {aiInsights.anomalies && aiInsights.anomalies.map((anom) => (
        <div 
          key={anom.id}
          className="flex items-start gap-3 bg-error/10 border border-error/20 rounded-2xl p-4 animate-fade-in text-xs"
        >
          <AlertTriangle className="w-5 h-5 text-primary-app shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-primary-app uppercase tracking-wider text-[10px]">Unusual Spending Alert</h4>
            <p className="opacity-90 mt-0.5">
              Logged <strong>{anom.currency || 'MYR'} {anom.amount}</strong> in <strong>{anom.category}</strong> on {anom.date}.
            </p>
            <p className="opacity-60 text-[10px] mt-1">{anom.reason}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
