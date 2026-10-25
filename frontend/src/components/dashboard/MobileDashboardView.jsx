import React, { useState, useMemo } from 'react';
import { Eye, EyeOff, Settings, Plus, Wallet, Sparkles, Cloud, CloudOff, RefreshCw, CloudAlert, PieChart, TrendingUp } from 'lucide-react';
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
  carryOverBalance = 0,
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
  activeTab = 'EXPENSE',
  setActiveTab,
  categoryData = [],
  totalForActiveTab = 0,
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

  // Calculate Net Worth: Assets - Liabilities
  const netWorth = useMemo(() => {
    return accounts.reduce((sum, acc) => {
      if (acc.type === 'CREDIT_CARD') {
        return sum - (Number(acc.balance) || 0);
      }
      return sum + (Number(acc.balance) || 0);
    }, 0);
  }, [accounts]);

  // Compute top spending categories
  const sortedCategories = useMemo(() => {
    const list = [...categoryData].sort((a, b) => b.value - a.value);
    const total = list.reduce((sum, c) => sum + c.value, 0);
    return list.map(c => ({
      ...c,
      percent: total > 0 ? Math.round((c.value / total) * 100) : 0
    }));
  }, [categoryData]);

  // Budget pacing calculation
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - dayOfMonth);
  const carryOverAmount = (user?.settings?.carryOverEnabled !== false) ? carryOverBalance : 0;
  const netSavings = totalIncome - totalExpense + carryOverAmount;
  const safeDailySpend = netSavings > 0 ? (netSavings / daysRemaining) : 0;

  const touchStartX = React.useRef(null);
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) > 60) {
      if (deltaX > 0) {
        handlePrevPeriod && handlePrevPeriod();
      } else {
        handleNextPeriod && handleNextPeriod();
      }
    }
  };

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
    <div className="space-y-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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

      {/* 4. Month / Period Selector Bar */}
      <div>
        <PeriodHeader 
          periodType={periodType}
          setPeriodType={setPeriodType}
          formatPeriodLabel={formatPeriodLabel}
          handlePrevPeriod={handlePrevPeriod}
          handleNextPeriod={handleNextPeriod}
          isDark={isDark}
        />
      </div>

      {/* 5. Safe-to-Spend & Budget Gauge Card */}
      <div className="rounded-2xl p-4 bg-base-200/80 border border-base-content/10 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5 text-base-content/70 font-bold uppercase tracking-wider text-[10px]">
            <TrendingUp className="w-3.5 h-3.5 text-primary-app" />
            <span>Daily Safe-To-Spend</span>
          </div>
          <span className="text-[10px] text-base-content/50 font-semibold">{daysRemaining} days left</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-black text-primary-app">
            {baseCurrency} {safeDailySpend.toFixed(2)} <span className="text-xs font-normal text-base-content/60">/ day</span>
          </span>
          <span className="text-xs font-bold text-secondary-app">
            {netSavings >= 0 ? `+${baseCurrency} ${netSavings.toFixed(0)} saved` : `-${baseCurrency} ${Math.abs(netSavings).toFixed(0)} deficit`}
          </span>
        </div>
      </div>

      {/* 6. Primary Category Breakdown Section (Replacing duplicate transactions) */}
      <div className="rounded-3xl p-5 bg-base-200/90 border border-base-content/10 shadow-lg space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-secondary-app" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-base-content">
              Category Breakdown
            </h3>
          </div>
          <span className="text-[10px] font-bold text-base-content/60 uppercase">
            Total {baseCurrency} {(activeTab === 'INCOME' ? totalIncome : totalExpense).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Expense / Income Pill Toggle */}
        <div className="grid grid-cols-2 p-1 bg-base-300 rounded-2xl border border-base-content/10 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab && setActiveTab('EXPENSE')}
            className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'EXPENSE'
                ? 'bg-danger-app/20 text-danger-app border border-danger-app/30 shadow-sm font-extrabold'
                : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            <span>Expenses</span>
            <span className="text-[10px] opacity-75">
              ({baseCurrency} {totalExpense.toFixed(0)})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab && setActiveTab('INCOME')}
            className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'INCOME'
                ? 'bg-primary-app/20 text-primary-app border border-primary-app/30 shadow-sm font-extrabold'
                : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            <span>Income</span>
            <span className="text-[10px] opacity-75">
              ({baseCurrency} {totalIncome.toFixed(0)})
            </span>
          </button>
        </div>

        {/* Visual Category Donut */}
        <CategoryChart 
          categoryData={categoryData}
          totalForActiveTab={totalForActiveTab || (activeTab === 'INCOME' ? totalIncome : totalExpense)}
          baseCurrency={baseCurrency}
          isDark={isDark}
          ACCENT_SHADES={ACCENT_SHADES}
          handleCategoryClick={handleCategoryClick}
        />

        {/* Top 4 Category Progress Bars */}
        <div className="space-y-2.5 pt-2 border-t border-base-content/10">
          {sortedCategories.slice(0, 4).map((cat, idx) => {
            const barColors = [
              'bg-primary-app',
              'bg-secondary-app',
              'bg-cyan-500',
              'bg-indigo-400'
            ];
            const colorClass = barColors[idx % barColors.length];

            return (
              <div 
                key={cat.name} 
                onClick={() => handleCategoryClick && handleCategoryClick(cat.name)}
                className="space-y-1 cursor-pointer hover:opacity-80 active:scale-[0.99] transition-all"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-base-content truncate pr-2">{cat.name}</span>
                  <span className="font-bold text-base-content shrink-0">
                    {baseCurrency} {Number(cat.value).toFixed(2)} ({cat.percent}%)
                  </span>
                </div>
                <div className="w-full bg-base-300 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${colorClass}`} 
                    style={{ width: `${Math.min(100, cat.percent)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. AI Quick Tools & Receipt Scanner */}
      <div className="pt-1">
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
    </div>
  );
}
