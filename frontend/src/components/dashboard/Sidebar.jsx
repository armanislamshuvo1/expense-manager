import React from 'react';
import { Wallet } from 'lucide-react';

export default function Sidebar({ accounts, isDark, logout, navigate, isPwaMode }) {
  return (
    <aside className="w-full lg:w-72 flex flex-col gap-6">
      {/* Logo / Title Panel */}
      <div className={`backdrop-blur-xl border rounded-3xl p-5 flex items-center justify-between shadow-xl transition-all duration-300 ${
        isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80 shadow-md'
      }`}>
        <div 
          onClick={() => !isPwaMode() && navigate('/')}
          className={`flex items-center gap-3 ${!isPwaMode() ? 'cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all' : ''}`}
          title={!isPwaMode() ? "Go to Landing Page" : undefined}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-error to-error/60 flex items-center justify-center shadow-lg shadow-error/20">
            <span className="text-xl font-black text-white">N</span>
          </div>
          <div>
            <h1 className={`font-extrabold text-sm tracking-wider transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-800'}`}>NEXUS WEALTH</h1>
            <p className={`text-[10px] uppercase tracking-widest transition-colors duration-300 ${isDark ? 'opacity-40 text-white' : 'text-slate-400 font-semibold'}`}>Premium Tracker</p>
          </div>
        </div>
        <button onClick={logout} className="btn btn-xs btn-ghost text-error/80 hover:text-error hover:bg-error/10 rounded-lg">
          Sign Out
        </button>
      </div>

      {/* Connected Accounts Card */}
      <div className={`backdrop-blur-xl border rounded-3xl p-5 shadow-xl transition-all duration-300 ${
        isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80 shadow-md'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className={`text-xs uppercase tracking-widest font-bold ${isDark ? 'opacity-40 text-white' : 'text-slate-400'}`}>Connected Accounts</h2>
            <h3 className={`text-xs font-semibold mt-0.5 ${isDark ? 'text-white' : 'text-slate-700'}`}>Total Assets Summary</h3>
          </div>
          <Wallet className="w-4 h-4 text-error" />
        </div>

        <div className="space-y-3">
          {accounts.map(acc => (
            <div key={acc._id} className={`flex justify-between items-center p-3 rounded-2xl border transition-all cursor-pointer ${
              isDark 
                ? 'bg-[#1e293b]/40 border-white/5 hover:bg-[#1e293b]/70' 
                : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-error/10 border border-error/20 flex items-center justify-center text-error font-bold text-xs">
                  {acc.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${isDark ? 'text-white/90' : 'text-slate-800'}`}>{acc.name}</h4>
                  <p className={`text-[9px] uppercase ${isDark ? 'opacity-40 text-white' : 'text-slate-400 font-semibold'}`}>{acc.type}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {acc.currency} {acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="text-center py-4 text-xs opacity-40">No accounts connected.</div>
          )}
        </div>
      </div>
    </aside>
  );
}
