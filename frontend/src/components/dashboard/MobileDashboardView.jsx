import React, { useState } from 'react';
import { Eye, EyeOff, Settings, Plus, Wallet, Sparkles, Cloud, CloudOff, RefreshCw, CloudAlert, ChevronRight } from 'lucide-react';
import PeriodHeader from './PeriodHeader';
import CategoryChart from './CategoryChart';
import DashboardAiConsole from './DashboardAiConsole';

export default function MobileDashboardView({
  user,
  accounts = [],
  transactions = [],
  baseCurrency,
  totalIncome = 0,
  totalExpense = 0,
  syncStatus = 'synced',
  queueCount = 0,
  onSyncTrigger,
  navigate,
  periodType,
  setPeriodType,
  formatPeriodLabel,
  handlePrevPeriod,
  handleNextPeriod,
  isDark,
  categoryData,
  totalForActiveTab,
  ACCENT_SHADES,
  handleCategoryClick,
  setReceiptModalOpen,
  handleQuickLogSubmit,
  quickLogText,
  setQuickLogText,
  parsing,
  aiInsights,
  onRefreshInsights,
  isRefreshingInsights
}) {
  const [hideBalance, setHideBalance] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Calculate Net Worth: Assets - Liabilities
  const netWorth = accounts.reduce((sum, acc) => {
    if (acc.type === 'CREDIT_CARD') {
      return sum - (Number(acc.balance) || 0);
    }
    return sum + (Number(acc.balance) || 0);
  }, 0);

  // Latest 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  const renderSyncBadge = () => {
    if (syncStatus === 'offline') {
      return (
        <span 
          onClick={onSyncTrigger}
          className="flex items-center gap-1 text-[9px] font-bold text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2 py-0.5 rounded-full cursor-pointer"
        >
          <CloudOff className="w-2.5 h-2.5" /> Offline ({queueCount})
        </span>
      );
    }
    if (syncStatus === 'syncing') {
      return (
        <span className="flex items-center gap-1 text-[9px] font-bold text-primary-app bg-primary-app/10 border border-primary-app/20 px-2 py-0.5 rounded-full">
          <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Syncing...
        </span>
      );
    }
    if (syncStatus === 'error') {
      return (
        <span 
          onClick={onSyncTrigger}
          className="flex items-center gap-1 text-[9px] font-bold text-danger-app bg-danger-app/10 border border-danger-app/20 px-2 py-0.5 rounded-full cursor-pointer"
        >
          <CloudAlert className="w-2.5 h-2.5" /> Error
        </span>
      );
    }
    return (
      <span 
        onClick={onSyncTrigger}
        className="flex items-center gap-1 text-[9px] font-bold text-primary-app bg-primary-app/10 border border-primary-app/20 px-2 py-0.5 rounded-full cursor-pointer"
      >
        <Cloud className="w-2.5 h-2.5" /> Synced
      </span>
    );
  };

  const userInitials = (user?.name || 'User')
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-4">
      {/* 1. Mobile Native Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-app/20 border border-primary-app/40 flex items-center justify-center text-primary-app font-black text-sm shadow-md shadow-primary-app/10">
            {userInitials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-base-content/60 font-medium">Hello</p>
              {renderSyncBadge()}
            </div>
            <h2 className="text-sm font-bold text-base-content tracking-wide">
              {user?.name || 'Nexus User'}
            </h2>
          </div>
        </div>
        
        {/* Settings button */}
        <button 
          onClick={() => navigate('/more')} 
          className="w-9 h-9 rounded-xl bg-base-200 border border-base-content/10 flex items-center justify-center text-base-content/70 hover:text-primary-app active:scale-95 transition-all cursor-pointer shadow-sm"
          title="Settings & Security"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Hero Net Worth Card (Strict 3-Color: Cyan border & accent) */}
      <div className="rounded-3xl p-5 relative overflow-hidden bg-base-200/90 border border-primary-app/30 shadow-xl backdrop-blur-xl">
        <div className="flex justify-between items-center text-xs text-base-content/60 mb-1">
          <span className="font-semibold uppercase tracking-wider text-[11px]">Total Net Worth</span>
          <button 
            type="button"
            onClick={() => setHideBalance(!hideBalance)} 
            className="flex items-center gap-1 text-secondary-app text-xs font-semibold hover:underline cursor-pointer"
          >
            {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{hideBalance ? 'Show' : 'Hide'}</span>
          </button>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-xs text-primary-app font-bold">{baseCurrency}</span>
          <h1 className="text-3xl font-black text-base-content tracking-tight">
            {hideBalance 
              ? '••••••••' 
              : netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
        </div>

        {/* Cash Flow Sub-Chips: Primary Cyan Income & Danger Red Outflow */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-base-content/10">
          <div className="bg-base-100/70 rounded-xl p-2.5 border border-primary-app/20">
            <span className="text-[10px] text-base-content/60 font-medium block">Income</span>
            <p className="text-xs font-black text-primary-app truncate">
              +{baseCurrency} {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-base-100/70 rounded-xl p-2.5 border border-danger-app/20">
            <span className="text-[10px] text-base-content/60 font-medium block">Outflow</span>
            <p className="text-xs font-black text-danger-app truncate">
              -{baseCurrency} {totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Safe 3-Action Quick Grid (No Destructive Buttons) */}
      <div className="grid grid-cols-3 gap-2">
        {/* Primary CTA: Add Transaction */}
        <button 
          onClick={() => navigate('/transactions', { state: { openAddModal: true, returnTo: '/dashboard' } })}
          className="py-3 px-2 rounded-2xl bg-primary-app text-slate-950 flex flex-col items-center justify-center font-bold text-xs shadow-lg shadow-primary-app/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5 mb-1 stroke-[2.5]" />
          <span>+ Add Log</span>
        </button>

        {/* Secondary CTA: Accounts */}
        <button 
          onClick={() => navigate('/accounts')}
          className="py-3 px-2 rounded-2xl bg-secondary-app/20 border border-secondary-app/40 text-secondary-app flex flex-col items-center justify-center font-bold text-xs active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          <Wallet className="w-5 h-5 mb-1" />
          <span>Accounts</span>
        </button>

        {/* High-Value CTA: AI WealthBuddy Insights */}
        <button 
          onClick={() => navigate('/wealthbuddy')}
          className="py-3 px-2 rounded-2xl bg-base-200 border border-base-content/10 text-base-content flex flex-col items-center justify-center font-bold text-xs hover:border-primary-app/40 active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          <Sparkles className="w-5 h-5 mb-1 text-primary-app" />
          <span>AI Insights</span>
        </button>
      </div>

      {/* 4. Recent Transactions Feed */}
      <div className="space-y-2 pt-1">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-base-content/70 tracking-wider uppercase">Recent Activity</h3>
          <button 
            onClick={() => navigate('/transactions')} 
            className="text-xs text-secondary-app font-semibold hover:underline flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-6 bg-base-200/50 rounded-2xl border border-base-content/5 text-xs text-base-content/50">
            No recent activity recorded. Tap "+ Add Log" above.
          </div>
        ) : (
          recentTransactions.map((tx) => {
            const isIncome = tx.type === 'INCOME';
            const isExpense = tx.type === 'EXPENSE';
            const catName = tx.type === 'TRANSFER' ? 'Transfer' : (tx.categoryId?.name || tx.categoryName || 'General');
            const accName = tx.accountId?.name || 'Account';
            const txTime = new Date(tx.date).toLocaleDateString([], { month: 'short', day: 'numeric' });

            return (
              <div 
                key={tx._id || tx.clientTxId}
                onClick={() => navigate('/transactions', { state: { editTx: tx } })}
                className="flex items-center justify-between p-3 rounded-2xl bg-base-200/70 border border-base-content/10 hover:border-primary-app/40 active:scale-[0.99] transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    isIncome 
                      ? 'bg-primary-app/15 text-primary-app border border-primary-app/30' 
                      : isExpense 
                        ? 'bg-danger-app/15 text-danger-app border border-danger-app/30' 
                        : 'bg-secondary-app/15 text-secondary-app border border-secondary-app/30'
                  }`}>
                    {isIncome ? 'IN' : isExpense ? 'OUT' : '⇄'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-base-content truncate">
                      {tx.note || catName}
                    </h4>
                    <p className="text-[11px] text-base-content/50 truncate">
                      {catName} • {accName}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-black ${
                    isIncome ? 'text-primary-app' : isExpense ? 'text-danger-app' : 'text-secondary-app'
                  }`}>
                    {isIncome ? '+' : isExpense ? '-' : '⇄'}{tx.currency || baseCurrency} {(Number(tx.amount) || 0).toFixed(2)}
                  </span>
                  <p className="text-[10px] text-base-content/40">{txTime}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Collapsible Period Analytics & AI Tools */}
      <div className="pt-2 border-t border-base-content/10">
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="w-full py-2.5 px-3 rounded-xl bg-base-200/60 border border-base-content/10 flex items-center justify-between text-xs font-bold text-base-content/70 hover:text-base-content transition-all"
        >
          <span>Analytics & AI Scanner</span>
          <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${showAnalytics ? 'rotate-90' : ''}`} />
        </button>

        {showAnalytics && (
          <div className="space-y-4 pt-3">
            <PeriodHeader 
              periodType={periodType}
              setPeriodType={setPeriodType}
              formatPeriodLabel={formatPeriodLabel}
              handlePrevPeriod={handlePrevPeriod}
              handleNextPeriod={handleNextPeriod}
              isDark={isDark}
            />

            <CategoryChart 
              categoryData={categoryData}
              totalForActiveTab={totalForActiveTab}
              baseCurrency={baseCurrency}
              isDark={isDark}
              ACCENT_SHADES={ACCENT_SHADES}
              handleCategoryClick={handleCategoryClick}
            />

            <DashboardAiConsole
              isDark={isDark}
              navigate={navigate}
              setReceiptModalOpen={setReceiptModalOpen}
              handleQuickLogSubmit={handleQuickLogSubmit}
              quickLogText={quickLogText}
              setQuickLogText={setQuickLogText}
              parsing={parsing}
              aiInsights={aiInsights}
              onRefreshInsights={onRefreshInsights}
              isRefreshingInsights={isRefreshingInsights}
            />
          </div>
        )}
      </div>
    </div>
  );
}
