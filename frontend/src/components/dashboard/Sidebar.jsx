import React, { useState, useEffect } from 'react';
import { Wallet, Settings, Cloud, CloudOff, RefreshCw, CloudAlert, ChevronDown } from 'lucide-react';
import { subscribeToSync, triggerSync } from '../../utils/syncManager';
import { useAccountModal } from '../../context/AccountModalContext';

export default function Sidebar({ accounts, isDark, logout, navigate, isPwaMode }) {
  const { openAccountModal } = useAccountModal();
  const [syncStatus, setSyncStatus] = useState('synced');
  const [queueCount, setQueueCount] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    return subscribeToSync((status, qLength) => {
      setSyncStatus(status);
      setQueueCount(qLength);
    });
  }, []);

  const renderSyncBadge = () => {
    if (syncStatus === 'offline') {
      return (
        <div 
          onClick={triggerSync}
          className="flex items-center gap-1 text-[9px] font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full cursor-pointer hover:bg-orange-500/20 transition-all select-none"
          title={`${queueCount} pending changes cached offline`}
        >
          <CloudOff className="w-2.5 h-2.5" />
          <span>Offline ({queueCount})</span>
        </div>
      );
    }
    if (syncStatus === 'syncing') {
      return (
        <div className="flex items-center gap-1 text-[9px] font-bold text-info bg-info/10 border border-info/20 px-2 py-0.5 rounded-full select-none">
          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
          <span>Syncing...</span>
        </div>
      );
    }
    if (syncStatus === 'error') {
      return (
        <div 
          onClick={triggerSync}
          className="flex items-center gap-1 text-[9px] font-bold text-danger-app bg-danger-app/10 border border-danger-app/20 px-2 py-0.5 rounded-full cursor-pointer hover:bg-danger-app/20 transition-all select-none"
          title="Sync error, click to retry"
        >
          <CloudAlert className="w-2.5 h-2.5" />
          <span>Error</span>
        </div>
      );
    }
    return (
      <div 
        onClick={triggerSync}
        className="flex items-center gap-1 text-[9px] font-bold text-primary-app bg-primary-app/10 border border-primary-app/20 px-2 py-0.5 rounded-full cursor-pointer hover:bg-primary-app/20 transition-all select-none"
        title="All changes synced"
      >
        <Cloud className="w-2.5 h-2.5" />
        <span>Synced</span>
      </div>
    );
  };

  return (
    <aside className="w-full lg:w-72 flex flex-col gap-6">
      {/* Logo / Title Panel */}
      <div className={`backdrop-blur-xl border rounded-3xl p-5 flex items-center justify-between shadow-xl transition-all duration-300 ${
        isDark ? 'bg-base-200/60 border-white/5' : 'bg-white border-slate-200/80 shadow-md'
      }`}>
        <div 
          onClick={() => !isPwaMode() && navigate('/')}
          className={`flex items-center gap-3 ${!isPwaMode() ? 'cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all' : ''}`}
          title={!isPwaMode() ? "Go to Landing Page" : undefined}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-app to-cyan-400 flex items-center justify-center shadow-lg shadow-primary-app/25">
            <span className="text-xl font-black text-slate-950">N</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`font-extrabold text-sm tracking-wider transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-800'}`}>NEXUS WEALTH</h1>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[9px] uppercase tracking-widest transition-colors duration-300 ${isDark ? 'opacity-40 text-white' : 'text-slate-400 font-semibold'}`}>Premium Tracker</span>
              <span>•</span>
              {renderSyncBadge()}
            </div>
          </div>
        </div>
        {isPwaMode() ? (
          <button 
            onClick={() => navigate('/more')} 
            className="w-8 h-8 rounded-xl bg-base-300 border border-base-content/10 flex items-center justify-center text-base-content/70 hover:text-primary-app transition-colors shrink-0 cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={logout} className="btn btn-xs btn-ghost text-danger-app hover:bg-danger-app/10 rounded-lg shrink-0 font-bold">
            Sign Out
          </button>
        )}
      </div>

      {/* Connected Accounts Card */}
      <div className={`backdrop-blur-xl border rounded-3xl p-5 shadow-xl transition-all duration-300 ${
        isDark ? 'bg-base-200/60 border-white/5' : 'bg-white border-slate-200/80 shadow-md'
      }`}>
        <div 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex justify-between items-center cursor-pointer select-none"
        >
          <div>
            <h2 className={`text-xs uppercase tracking-widest font-bold ${isDark ? 'opacity-40 text-white' : 'text-slate-400'}`}>Connected Accounts</h2>
            <h3 className={`text-xs font-semibold mt-0.5 ${isDark ? 'text-white' : 'text-slate-700'}`}>Total Assets Summary</h3>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-secondary-app" />
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
          </div>
        </div>

        <div className={`space-y-3 overflow-hidden transition-all duration-300 ${
          isCollapsed ? 'max-h-0 opacity-0 mt-0 pointer-events-none' : 'max-h-[1000px] opacity-100 mt-4'
        }`}>
          {accounts.map(acc => (
            <div 
              key={acc._id} 
              onClick={() => openAccountModal(acc)}
              className={`flex justify-between items-center p-3 rounded-2xl border transition-all cursor-pointer ${
              isDark 
                ? 'bg-base-300/40 border-white/5 hover:bg-base-300/80' 
                : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-secondary-app/15 border border-secondary-app/30 flex items-center justify-center text-secondary-app font-bold text-xs">
                  {acc.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${isDark ? 'text-white/90' : 'text-slate-800'}`}>{acc.name}</h4>
                  <p className={`text-[9px] uppercase ${isDark ? 'opacity-40 text-white' : 'text-slate-400 font-semibold'}`}>{acc.type}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {acc.currency || 'MYR'} {(Number(acc.balance) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
