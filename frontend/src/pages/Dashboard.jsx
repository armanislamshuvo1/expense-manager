import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAxiosSecure } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { isPwaMode } from '../utils/pwaUtils';
import { useTheme } from '../context/ThemeContext';
import { 
  getMergedTransactions, 
  getMergedAccounts,
  getMergedCategories,
  getCache,
  setCache, 
  getAccountsCache,
  setAccountsCache,
  getCategoriesCache,
  setCategoriesCache,
  queueOperation, 
  subscribeToSync, 
  generateUUID,
  triggerSync 
} from '../utils/syncManager';

import Swal from 'sweetalert2';

// Import modularized components
import Sidebar from '../components/dashboard/Sidebar';
import PeriodHeader from '../components/dashboard/PeriodHeader';
import CategoryChart from '../components/dashboard/CategoryChart';
import AdvancedCharts from '../components/dashboard/AdvancedCharts';
import { useDashboardData } from '../hooks/useDashboardData';
import CategoryTransactionsModal from '../components/dashboard/CategoryTransactionsModal';
import ReceiptScannerModal from '../components/ReceiptScannerModal';
import DashboardAiConsole from '../components/dashboard/DashboardAiConsole';
import QuickStats from '../components/dashboard/QuickStats';
import ReviewQuickLogModal from '../components/dashboard/ReviewQuickLogModal';


export default function Dashboard() {
  const { user, logout } = useAuth();
  const axiosSecure = useAxiosSecure();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [syncStatus, setSyncStatus] = useState('synced');
  const [syncQueueLength, setSyncQueueLength] = useState(0);

  useEffect(() => {
    const handleSyncDone = () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    };
    window.addEventListener('nexus_sync_completed', handleSyncDone);

    const unsubscribe = subscribeToSync((status, qLength) => {
      setSyncStatus(status);
      setSyncQueueLength(qLength);
      if (status === 'synced' && qLength === 0) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
      }
    });

    return () => {
      window.removeEventListener('nexus_sync_completed', handleSyncDone);
      unsubscribe();
    };
  }, [queryClient]);

  const { data: rawAccounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      try {
        const res = await axiosSecure.get('/api/accounts');
        if (res.data?.success) {
          setAccountsCache(res.data.data);
          return res.data.data;
        }
      } catch (err) {
        console.warn('Failed to fetch accounts online, using cache');
      }
      return getAccountsCache();
    }
  });

  const accounts = useMemo(() => {
    return getMergedAccounts();
  }, [rawAccounts, syncQueueLength]);

  const { data: rawTransactions = [], isLoading: isTransactionsLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      try {
        const res = await axiosSecure.get('/api/transactions');
        if (res.data?.success) {
          setCache(res.data.data);
          return res.data.data;
        }
      } catch (err) {
        console.warn('Failed to fetch transactions online, using cache');
      }
      return getCache();
    }
  });

  const transactions = useMemo(() => {
    return getMergedTransactions();
  }, [rawTransactions, syncQueueLength]);

  const { data: rawCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const res = await axiosSecure.get('/api/categories');
        if (res.data?.success) {
          setCategoriesCache(res.data.data);
          return res.data.data;
        }
      } catch (err) {
        console.warn('Failed to fetch categories online, using cache');
      }
      return getCategoriesCache();
    }
  });

  const categories = useMemo(() => {
    return getMergedCategories();
  }, [rawCategories, syncQueueLength]);

  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);

  const { data: aiInsights = { digest: '', anomalies: [] }, refetch: refetchInsights } = useQuery({
    queryKey: ['aiInsights'],
    queryFn: async () => {
      try {
        const res = await axiosSecure.get('/api/ai/insights');
        return res.data?.success ? res.data.data : { digest: '', anomalies: [] };
      } catch (err) {
        return { digest: '', anomalies: [] };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache validity
    refetchOnWindowFocus: false, // Prevent query on window focus
    refetchOnReconnect: false // Prevent query on reconnect
  });

  const handleRefreshInsights = async () => {
    try {
      setIsRefreshingInsights(true);
      const res = await axiosSecure.get('/api/ai/insights?refresh=true');
      if (res.data?.success) {
        queryClient.setQueryData(['aiInsights'], res.data.data);
      }
    } catch (err) {
      console.error('Error refreshing AI insights:', err);
    } finally {
      setIsRefreshingInsights(false);
    }
  };

  const [quickLogText, setQuickLogText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [receiptModalOpen, setReceiptModalOpenState] = useState(() => {
    return sessionStorage.getItem('receiptModalOpen') === 'true';
  });

  const setReceiptModalOpen = (val) => {
    setReceiptModalOpenState(val);
    if (val) {
      sessionStorage.setItem('receiptModalOpen', 'true');
    } else {
      sessionStorage.removeItem('receiptModalOpen');
      sessionStorage.removeItem('receiptActiveTab');
    }
  };
  const [reviewTransaction, setReviewTransaction] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);


  const isDark = theme === 'dark';
  const baseCurrency = user?.baseCurrency || 'MYR';

  // Use the custom hook for dashboard metrics and period selections
  const dashboardProps = useDashboardData(accounts, transactions, categories);
  const {
    netWorthData,
    cashFlowData,
    categoryData,
    selectedDate,
    setSelectedDate,
    periodType,
    setPeriodType,
    activeTab,
    setActiveTab,
    selectedCategoryTransactions,
    setSelectedCategoryTransactions,
    formatPeriodLabel,
    handlePrevPeriod,
    handleNextPeriod
  } = dashboardProps;

  // Vibrant high contrast color palette
  const ACCENT_SHADES = useMemo(() => [
    '#ff5c5c', // Coral/Red
    '#ffa043', // Orange
    '#ffe033', // Yellow
    '#8bf23d', // Lime Green
    '#3df2a5', // Greenish Teal
    '#3dc2f2', // Cyan/Light Blue
    '#3d52f2', // Indigo/Blue
    '#aa3df2', // Purple
  ], []);

  useEffect(() => {
    if (user?.settings?.quickAddEnabled) {
      const quickAddDone = sessionStorage.getItem('quickAddDone');
      if (!quickAddDone) {
        sessionStorage.setItem('quickAddDone', 'true');
        navigate('/transactions', { state: { openAddModal: true, returnTo: '/dashboard' } });
      }
    }
  }, [user, navigate]);

  const handleQuickLogSubmit = async (e) => {

    e.preventDefault();
    if (!quickLogText.trim()) return;

    setParsing(true);
    try {
      const res = await axiosSecure.post('/api/ai/parse-transaction', { text: quickLogText });
      if (res.data.success) {
        setReviewTransaction(res.data.data);
        setQuickLogText('');
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Parsing Failed',
          text: 'AI could not parse your sentence. Please try something simpler.',
          confirmButtonColor: '#ff5c5c'
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to communicate with AI parsing engine.',
        confirmButtonColor: '#ff5c5c'
      });
    } finally {
      setParsing(false);
    }
  };

  const handleApproveQuickLog = async () => {
    if (!reviewTransaction) return;
    setReviewLoading(true);
    try {
      const matchedAccount = accounts.find(a => a._id === reviewTransaction.accountId);
      const matchedCategory = categories.find(c => c._id === reviewTransaction.categoryId);
      const matchedToAccount = accounts.find(a => a._id === reviewTransaction.toAccountId);

      const payload = {
        accountId: reviewTransaction.accountId,
        toAccountId: reviewTransaction.toAccountId,
        categoryId: reviewTransaction.categoryId,
        type: reviewTransaction.type || 'EXPENSE',
        amount: reviewTransaction.amount,
        currency: 'MYR',
        date: reviewTransaction.date,
        description: reviewTransaction.description || 'Quick AI Log',
        note: reviewTransaction.note || '',
        accountName: matchedAccount ? matchedAccount.name : 'Account',
        toAccountName: matchedToAccount ? matchedToAccount.name : 'Account',
        categoryName: matchedCategory ? matchedCategory.name : 'Category'
      };

      if (navigator.onLine) {
        try {
          await axiosSecure.post('/api/transactions', payload);
        } catch (netErr) {
          const clientTxId = generateUUID();
          queueOperation('CREATE', clientTxId, null, payload);
          triggerSync();
        }
      } else {
        const clientTxId = generateUUID();
        queueOperation('CREATE', clientTxId, null, payload);
        triggerSync();
      }

      Swal.fire({
        icon: 'success',
        title: 'Logged!',
        text: 'Transaction recorded successfully.',
        timer: 1500,
        showConfirmButton: false
      });
      setReviewTransaction(null);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      refetchInsights();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.response?.data?.message || 'Could not log transaction.',
        confirmButtonColor: '#ff5c5c'
      });
    } finally {
      setReviewLoading(false);
    }
  };

  const handleCategoryClick = React.useCallback((categoryName) => {
    if (!categoryName) return;
    const targetNameStr = String(categoryName).trim().toLowerCase();

    const catTx = transactions.filter(tx => {
      let catName = 'Other';
      if (tx.type === 'TRANSFER') {
        catName = 'Transfer';
      } else if (typeof tx.categoryId === 'object' && tx.categoryId?.name) {
        catName = tx.categoryId.name;
      } else {
        const catIdStr = typeof tx.categoryId === 'string' ? tx.categoryId : String(tx.categoryId?._id || tx.categoryId?.clientCatId || '');
        const matched = (categories || []).find(c => 
          String(c._id || '').toLowerCase() === catIdStr.toLowerCase() || 
          String(c.clientCatId || '').toLowerCase() === catIdStr.toLowerCase()
        );
        if (matched) {
          catName = matched.name;
        } else if (tx.categoryName) {
          catName = tx.categoryName;
        }
      }

      const isCat = catName.trim().toLowerCase() === targetNameStr;
      const isType = tx.type === activeTab;

      if (periodType !== 'All') {
        let start, end;
        if (periodType === 'Weekly') {
          start = new Date(selectedDate);
          start.setDate(selectedDate.getDate() - selectedDate.getDay());
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setDate(start.getDate() + 7);
        } else if (periodType === 'Monthly') {
          start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
          end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
        } else if (periodType === 'Yearly') {
          start = new Date(selectedDate.getFullYear(), 0, 1);
          end = new Date(selectedDate.getFullYear() + 1, 0, 1);
        }
        const txDate = new Date(tx.date);
        return isCat && isType && !isNaN(txDate.getTime()) && txDate >= start && txDate < end;
      }
      return isCat && isType;
    });

    const matchedCat = (categories || []).find(c => String(c.name || '').trim().toLowerCase() === targetNameStr);

    setSelectedCategoryTransactions({
      categoryName,
      categoryId: matchedCat ? String(matchedCat._id || matchedCat.clientCatId) : categoryName,
      type: activeTab,
      transactions: catTx
    });
  }, [categories, transactions, activeTab, periodType, selectedDate, setSelectedCategoryTransactions]);

  const totalForActiveTab = useMemo(() => categoryData.reduce((sum, item) => sum + item.value, 0), [categoryData]);
  const totalIncome = useMemo(() => cashFlowData.reduce((sum, item) => sum + item.Income, 0), [cashFlowData]);
  const totalExpense = useMemo(() => cashFlowData.reduce((sum, item) => sum + item.Expenses, 0), [cashFlowData]);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const [showAdvancedCharts, setShowAdvancedCharts] = useState(false);

  return (
    <div className={`min-h-screen font-sans pb-32 transition-colors duration-300 ${
      isDark ? 'bg-[#070b13] text-[#e0e6f2]' : 'bg-[#f1f5f9] text-[#475569]'
    }`}>
      {/* Container with Left Sidebar on Desktop */}
      <div className="flex flex-col lg:flex-row max-w-7xl mx-auto p-4 lg:p-6 gap-6">
        
        {/* SIDEBAR CONTAINER */}
        <Sidebar 
          accounts={accounts} 
          isDark={isDark} 
          logout={logout} 
          navigate={navigate} 
          isPwaMode={isPwaMode} 
        />

        {/* MAIN PANEL CONTENT */}
        <main className="flex-1 flex flex-col gap-6">
          {/* Header Month / Time Selector Bar (Desktop) */}
          <div className="hidden lg:block">
            <PeriodHeader 
              periodType={periodType}
              setPeriodType={setPeriodType}
              formatPeriodLabel={formatPeriodLabel}
              handlePrevPeriod={handlePrevPeriod}
              handleNextPeriod={handleNextPeriod}
              isDark={isDark}
            />
          </div>

          {/* AI Quick Console & Alerts */}
          <DashboardAiConsole
            isDark={isDark}
            navigate={navigate}
            setReceiptModalOpen={setReceiptModalOpen}
            handleQuickLogSubmit={handleQuickLogSubmit}
            quickLogText={quickLogText}
            setQuickLogText={setQuickLogText}
            parsing={parsing}
            aiInsights={aiInsights}
            onRefreshInsights={handleRefreshInsights}
            isRefreshingInsights={isRefreshingInsights}
          />

          {/* Header Month / Time Selector Bar (Small devices: directly on top of Income/Expense tab) */}
          <div className="block lg:hidden">
            <PeriodHeader 
              periodType={periodType}
              setPeriodType={setPeriodType}
              formatPeriodLabel={formatPeriodLabel}
              handlePrevPeriod={handlePrevPeriod}
              handleNextPeriod={handleNextPeriod}
              isDark={isDark}
            />
          </div>

          {/* Income vs Expenses Tab Indicator */}
          <div className="grid grid-cols-2 text-center relative border-b border-base-content/10">
            <button
              onClick={() => setActiveTab('INCOME')}
              className={`py-3 text-xs md:text-sm font-black tracking-wider transition-all cursor-pointer ${
                activeTab === 'INCOME' 
                  ? 'text-primary' 
                  : 'text-base-content/50 hover:text-base-content'
              }`}
            >
              Income {baseCurrency} {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </button>
            <button
              onClick={() => setActiveTab('EXPENSE')}
              className={`py-3 text-xs md:text-sm font-black tracking-wider transition-all cursor-pointer ${
                activeTab === 'EXPENSE' 
                  ? 'text-error' 
                  : 'text-base-content/50 hover:text-base-content'
              }`}
            >
              Expenses {baseCurrency} {totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </button>
            
            <div 
              className="absolute bottom-0 h-0.5 bg-error transition-all duration-300 w-1/2" 
              style={{ left: activeTab === 'INCOME' ? '0%' : '50%' }}
            />
          </div>

          {/* Pie Chart categories list */}
          <CategoryChart 
            categoryData={categoryData}
            totalForActiveTab={totalForActiveTab}
            baseCurrency={baseCurrency}
            isDark={isDark}
            ACCENT_SHADES={ACCENT_SHADES}
            handleCategoryClick={handleCategoryClick}
          />

          {/* Advanced Charts Section */}
          <AdvancedCharts 
            showAdvancedCharts={showAdvancedCharts}
            setShowAdvancedCharts={setShowAdvancedCharts}
            netWorthData={netWorthData}
            cashFlowData={cashFlowData}
            isDark={isDark}
            baseCurrency={baseCurrency}
          />

          {/* Quick Stats Summary Footer Row */}
          <QuickStats
            isDark={isDark}
            baseCurrency={baseCurrency}
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            netSavings={netSavings}
            savingsRate={savingsRate}
          />
        </main>
      </div>

      {/* Category Transactions List Modal */}
      <CategoryTransactionsModal 
        selectedCategoryTransactions={selectedCategoryTransactions}
        setSelectedCategoryTransactions={setSelectedCategoryTransactions}
        baseCurrency={baseCurrency}
      />

      {/* Review Quick Log Parsed Transaction Modal */}
      <ReviewQuickLogModal
        reviewTransaction={reviewTransaction}
        setReviewTransaction={setReviewTransaction}
        accounts={accounts}
        categories={categories}
        handleApproveQuickLog={handleApproveQuickLog}
        reviewLoading={reviewLoading}
      />

      <ReceiptScannerModal 
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        onTransactionApproved={() => {
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['accounts'] });
          refetchInsights();
        }}
      />

      <BottomNav />
    </div>

  );
}
