import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAxiosSecure } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { isPwaMode } from '../utils/pwaUtils';
import { useTheme } from '../context/ThemeContext';
import { Sparkles, Camera, AlertTriangle, Loader2, Check, X, MessageSquare, Plus } from 'lucide-react';
import { 
  getQueue, 
  getMergedTransactions, 
  setCache, 
  queueOperation, 
  subscribeToSync, 
  generateUUID 
} from '../utils/syncManager';

import Swal from 'sweetalert2';

// Import modularized components
import Sidebar from '../components/dashboard/Sidebar';
import PeriodHeader from '../components/dashboard/PeriodHeader';
import CategoryChart from '../components/dashboard/CategoryChart';
import AdvancedCharts from '../components/dashboard/AdvancedCharts';
import CategoryTransactionsModal from '../components/dashboard/CategoryTransactionsModal';
import ReceiptScannerModal from '../components/ReceiptScannerModal';
import DashboardAiConsole from '../components/dashboard/DashboardAiConsole';
import QuickStats from '../components/dashboard/QuickStats';
import ReviewQuickLogModal from '../components/dashboard/ReviewQuickLogModal';


export default function Dashboard() {
  const axiosSecure = useAxiosSecure();
  const queryClient = useQueryClient();

  const [syncStatus, setSyncStatus] = useState('synced');
  const [syncQueueLength, setSyncQueueLength] = useState(0);

  useEffect(() => {
    return subscribeToSync((status, qLength) => {
      setSyncStatus(status);
      setSyncQueueLength(qLength);
      if (status === 'synced' && qLength === 0) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
      }
    });
  }, [queryClient]);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await axiosSecure.get('/api/accounts');
      return res.data.success ? res.data.data : [];
    }
  });

  const { data: rawTransactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await axiosSecure.get('/api/transactions');
      if (res.data.success) {
        setCache(res.data.data);
      }
      return res.data.success ? res.data.data : [];
    }
  });

  const transactions = useMemo(() => {
    return getMergedTransactions();
  }, [rawTransactions, syncQueueLength]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await axiosSecure.get('/api/categories');
      return res.data.success ? res.data.data : [];
    }
  });

  const { data: aiInsights = { digest: '', anomalies: [] }, refetch: refetchInsights } = useQuery({
    queryKey: ['aiInsights'],
    queryFn: async () => {
      const res = await axiosSecure.get('/api/ai/insights');
      return res.data.success ? res.data.data : { digest: '', anomalies: [] };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache validity
    refetchOnWindowFocus: false, // Prevent query on window focus
    refetchOnReconnect: false // Prevent query on reconnect
  });


  const [quickLogText, setQuickLogText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [reviewTransaction, setReviewTransaction] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);


  const [netWorthData, setNetWorthData] = useState([]);
  const [cashFlowData, setCashFlowData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  // Dynamic selector states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [periodType, setPeriodType] = useState('Monthly'); // 'Weekly' | 'Monthly' | 'Yearly' | 'All'
  const [activeTab, setActiveTab] = useState('EXPENSE'); // 'EXPENSE' | 'INCOME'
  const [selectedCategoryTransactions, setSelectedCategoryTransactions] = useState(null);
  
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const baseCurrency = user?.baseCurrency || 'MYR';
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.settings?.quickAddEnabled) {
      const quickAddDone = sessionStorage.getItem('quickAddDone');
      if (!quickAddDone) {
        sessionStorage.setItem('quickAddDone', 'true');
        navigate('/transactions', { state: { openAddModal: true } });
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

      const payload = {
        accountId: reviewTransaction.accountId,
        categoryId: reviewTransaction.categoryId,
        type: reviewTransaction.type || 'EXPENSE',
        amount: reviewTransaction.amount,
        currency: 'MYR',
        date: reviewTransaction.date,
        description: reviewTransaction.description || 'Quick AI Log',
        note: reviewTransaction.note || '',
        accountName: matchedAccount ? matchedAccount.name : 'Account',
        categoryName: matchedCategory ? matchedCategory.name : 'Category'
      };

      const clientTxId = generateUUID();
      queueOperation('CREATE', clientTxId, null, payload);

      Swal.fire({
        icon: 'success',
        title: 'Logged!',
        text: 'Transaction recorded successfully.',
        timer: 1500,
        showConfirmButton: false
      });
      setReviewTransaction(null);
      queryClient.invalidateQueries(['transactions']);
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

  const processDashboardData = (txList, currentAssets, period, refDate, currentTab) => {
    let filteredTx = [...txList];

    if (period !== 'All') {
      let start, end;
      if (period === 'Weekly') {
        start = new Date(refDate);
        start.setDate(refDate.getDate() - refDate.getDay());
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 7);
      } else if (period === 'Monthly') {
        start = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
        end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1);
      } else if (period === 'Yearly') {
        start = new Date(refDate.getFullYear(), 0, 1);
        end = new Date(refDate.getFullYear() + 1, 0, 1);
      }
      filteredTx = txList.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= start && txDate < end;
      });
    }

    // 1. Net Worth Pacing Chart (Assets vs Liabilities / Cumulative)
    let runningTotal = currentAssets;
    const sortedTx = [...txList].sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first

    // Create a time series for net worth tracking
    const pacingMap = {};
    const todayStr = new Date().toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    pacingMap[todayStr] = runningTotal;

    sortedTx.forEach(tx => {
      const dateKey = new Date(tx.date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      if (tx.type === 'INCOME') {
        runningTotal -= tx.convertedAmount || tx.amount;
      } else if (tx.type === 'EXPENSE') {
        runningTotal += tx.convertedAmount || tx.amount;
      }
      pacingMap[dateKey] = runningTotal;
    });

    const netWorthChartValues = Object.keys(pacingMap).map(key => ({
      name: key,
      Assets: Number(pacingMap[key].toFixed(2)),
      Liabilities: Number((pacingMap[key] * 0.15).toFixed(2))
    })).reverse();

    setNetWorthData(netWorthChartValues.slice(-12));

    // 2. Cash Flow Chart (Income vs Expense by Month)
    const monthlyData = {};
    filteredTx.forEach(tx => {
      const monthName = new Date(tx.date).toLocaleDateString(undefined, { month: 'short' });
      if (!monthlyData[monthName]) {
        monthlyData[monthName] = { name: monthName, Income: 0, Expenses: 0 };
      }
      if (tx.type === 'INCOME') {
        monthlyData[monthName].Income += tx.convertedAmount || tx.amount;
      } else if (tx.type === 'EXPENSE') {
        monthlyData[monthName].Expenses += tx.convertedAmount || tx.amount;
      }
    });

    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sortedCashFlow = Object.values(monthlyData).sort((a, b) => {
      return monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name);
    });
    setCashFlowData(sortedCashFlow);

    // 3. Category Donut Chart
    const categoriesMap = {};
    const categoriesEmojiMap = {};
    filteredTx.filter(tx => tx.type === currentTab).forEach(tx => {
      const catName = tx.categoryId ? tx.categoryId.name : (tx.type === 'TRANSFER' ? 'Transfer' : 'Other');
      const emoji = tx.categoryId ? tx.categoryId.emoji : (tx.type === 'TRANSFER' ? '🔄' : '🏷️');
      categoriesMap[catName] = (categoriesMap[catName] || 0) + (tx.convertedAmount || tx.amount);
      categoriesEmojiMap[catName] = emoji;
    });

    const categoryPieData = Object.keys(categoriesMap).map(key => ({
      name: key,
      value: Number(categoriesMap[key].toFixed(2)),
      emoji: categoriesEmojiMap[key] || '🏷️'
    })).sort((a, b) => b.value - a.value);

    setCategoryData(categoryPieData);
  };

  useEffect(() => {
    const assetsSum = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    processDashboardData(transactions, assetsSum, periodType, selectedDate, activeTab);
  }, [accounts, transactions, periodType, selectedDate, activeTab]);

  const formatPeriodLabel = () => {
    if (periodType === 'All') return 'All Time';
    if (periodType === 'Yearly') return selectedDate.getFullYear().toString();
    if (periodType === 'Monthly') {
      return selectedDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
    if (periodType === 'Weekly') {
      const start = new Date(selectedDate);
      start.setDate(selectedDate.getDate() - selectedDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startStr} - ${endStr}`;
    }
    return '';
  };

  const handlePrevPeriod = () => {
    const nextDate = new Date(selectedDate);
    if (periodType === 'Weekly') nextDate.setDate(selectedDate.getDate() - 7);
    else if (periodType === 'Monthly') nextDate.setMonth(selectedDate.getMonth() - 1);
    else if (periodType === 'Yearly') nextDate.setFullYear(selectedDate.getFullYear() - 1);
    setSelectedDate(nextDate);
  };

  const handleNextPeriod = () => {
    const nextDate = new Date(selectedDate);
    if (periodType === 'Weekly') nextDate.setDate(selectedDate.getDate() + 7);
    else if (periodType === 'Monthly') nextDate.setMonth(selectedDate.getMonth() + 1);
    else if (periodType === 'Yearly') nextDate.setFullYear(selectedDate.getFullYear() + 1);
    setSelectedDate(nextDate);
  };

  const handleCategoryClick = React.useCallback((categoryName) => {
    const catTx = transactions.filter(tx => {
      const isCat = (tx.categoryId?.name || (tx.type === 'TRANSFER' ? 'Transfer' : 'Other')) === categoryName;
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
        return isCat && isType && txDate >= start && txDate < end;
      }
      return isCat && isType;
    });

    setSelectedCategoryTransactions({
      categoryName,
      transactions: catTx
    });
  }, [transactions, activeTab, periodType, selectedDate]);

  const totalForActiveTab = useMemo(() => categoryData.reduce((sum, item) => sum + item.value, 0), [categoryData]);
  const totalIncome = useMemo(() => cashFlowData.reduce((sum, item) => sum + item.Income, 0), [cashFlowData]);
  const totalExpense = useMemo(() => cashFlowData.reduce((sum, item) => sum + item.Expenses, 0), [cashFlowData]);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const [showAdvancedCharts, setShowAdvancedCharts] = useState(false);

  return (
    <div className={`min-h-screen font-sans pb-24 transition-colors duration-300 ${
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
        <main className="flex-1 space-y-6">
          {/* Header Month / Time Selector Bar */}
          <PeriodHeader 
            periodType={periodType}
            setPeriodType={setPeriodType}
            formatPeriodLabel={formatPeriodLabel}
            handlePrevPeriod={handlePrevPeriod}
            handleNextPeriod={handleNextPeriod}
            isDark={isDark}
          />
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
          />

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
          queryClient.invalidateQueries(['transactions']);
          queryClient.invalidateQueries(['accounts']);
          refetchInsights();
        }}
      />

      <BottomNav />
    </div>

  );
}
