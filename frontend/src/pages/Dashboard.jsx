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
          <div className="space-y-4">
            {/* AI Advisor Card & Scanner Trigger */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`md:col-span-2 backdrop-blur-xl border rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between shadow-md transition-all gap-4 ${
                isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
              }`}>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-error to-error/60 flex items-center justify-center text-white shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider">WealthBuddy AI Advisor</h3>
                    <p className="text-[10px] opacity-60">Chat about budgets, spend patterns & custom reports.</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/wealthbuddy')}
                  className="btn btn-sm btn-error text-white font-bold rounded-xl w-full md:w-auto"
                >
                  <MessageSquare className="w-4 h-4 mr-1" /> Chat Advisor
                </button>
              </div>

              <div className={`backdrop-blur-xl border rounded-3xl p-4 flex items-center justify-between shadow-md transition-all ${
                isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-base-300 flex items-center justify-center text-error border border-base-content/10 shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider">Scan Receipt</h3>
                    <p className="text-[10px] opacity-60">Extract automatically.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setReceiptModalOpen(true)}
                  className="btn btn-sm btn-circle btn-ghost text-error"
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
                className="btn btn-circle btn-error h-10 w-10 min-h-10 text-white"
              >
                {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </button>
            </form>

            {/* AI Insights Summary & Alerts */}
            {aiInsights.digest && (
              <div className={`backdrop-blur-xl border rounded-3xl p-4 shadow-md transition-all ${
                isDark ? 'bg-gradient-to-br from-[#0f172a]/80 to-[#1e1b4b]/20 border-white/5' : 'bg-gradient-to-br from-white to-red-50/20 border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-error" />
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-error">AI Financial Summary</span>
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
                <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-error uppercase tracking-wider text-[10px]">Unusual Spending Alert</h4>
                  <p className="opacity-90 mt-0.5">
                    Logged <strong>MYR {anom.amount}</strong> in <strong>{anom.category}</strong> on {anom.date}.
                  </p>
                  <p className="opacity-60 text-[10px] mt-1">{anom.reason}</p>
                </div>
              </div>
            ))}
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
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`backdrop-blur-xl border rounded-3xl p-4 shadow-md text-center transition-all duration-300 ${
              isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80'
            }`}>
              <span className={`text-[10px] uppercase tracking-wider block ${isDark ? 'opacity-40 text-white' : 'text-slate-400'}`}>Total Income</span>
              <span className={`text-sm font-black mt-1 block ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {baseCurrency} {totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className={`backdrop-blur-xl border rounded-3xl p-4 shadow-md text-center transition-all duration-300 ${
              isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80'
            }`}>
              <span className={`text-[10px] uppercase tracking-wider block ${isDark ? 'opacity-40 text-white' : 'text-slate-400'}`}>Total Outflow</span>
              <span className={`text-sm font-black mt-1 block ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {baseCurrency} {totalExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className={`backdrop-blur-xl border rounded-3xl p-4 shadow-md text-center transition-all duration-300 ${
              isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80'
            }`}>
              <span className={`text-[10px] uppercase tracking-wider block ${isDark ? 'opacity-40 text-white' : 'text-slate-400'}`}>Net Savings</span>
              <span className={`text-sm font-black mt-1 block ${netSavings >= 0 ? 'text-error' : isDark ? 'text-white/40' : 'text-slate-400'}`}>
                {baseCurrency} {netSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className={`backdrop-blur-xl border rounded-3xl p-4 shadow-md text-center transition-all duration-300 ${
              isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80'
            }`}>
              <span className={`text-[10px] uppercase tracking-wider block ${isDark ? 'opacity-40 text-white' : 'text-slate-400'}`}>Savings Rate</span>
              <span className={`text-sm font-black mt-1 block ${isDark ? 'text-white' : 'text-slate-800'}`}>{savingsRate}%</span>
            </div>
          </section>
        </main>
      </div>

      {/* Category Transactions List Modal */}
      <CategoryTransactionsModal 
        selectedCategoryTransactions={selectedCategoryTransactions}
        setSelectedCategoryTransactions={setSelectedCategoryTransactions}
        baseCurrency={baseCurrency}
      />

      {/* Review Quick Log Parsed Transaction Modal */}
      {reviewTransaction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-3xl border border-base-content/10 bg-base-100 p-6 shadow-2xl transition-all text-xs">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-error" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Confirm AI Quick Log</h3>
              </div>
              <button onClick={() => setReviewTransaction(null)} className="btn btn-sm btn-circle btn-ghost">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label text-[10px] uppercase font-bold opacity-40">Amount</label>
                  <input
                    type="number"
                    value={reviewTransaction.amount || ''}
                    onChange={(e) => setReviewTransaction({ ...reviewTransaction, amount: Number(e.target.value) })}
                    className="input input-bordered rounded-xl text-xs font-bold bg-base-200"
                  />
                </div>
                <div className="form-control">
                  <label className="label text-[10px] uppercase font-bold opacity-40">Date</label>
                  <input
                    type="date"
                    value={reviewTransaction.date ? reviewTransaction.date.split('T')[0] : ''}
                    onChange={(e) => setReviewTransaction({ ...reviewTransaction, date: e.target.value })}
                    className="input input-bordered rounded-xl text-xs font-bold bg-base-200"
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label text-[10px] uppercase font-bold opacity-40">Description</label>
                <input
                  type="text"
                  value={reviewTransaction.description || ''}
                  onChange={(e) => setReviewTransaction({ ...reviewTransaction, description: e.target.value })}
                  className="input input-bordered rounded-xl text-xs font-bold bg-base-200"
                />
              </div>

              {reviewTransaction.type === 'TRANSFER' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label text-[10px] uppercase font-bold opacity-40">From Account</label>
                    <select
                      value={reviewTransaction.accountId || ''}
                      onChange={(e) => setReviewTransaction({ ...reviewTransaction, accountId: e.target.value })}
                      className="select select-bordered select-sm rounded-xl text-xs bg-base-200"
                    >
                      {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label text-[10px] uppercase font-bold opacity-40">To Account</label>
                    <select
                      value={reviewTransaction.toAccountId || ''}
                      onChange={(e) => setReviewTransaction({ ...reviewTransaction, toAccountId: e.target.value })}
                      className="select select-bordered select-sm rounded-xl text-xs bg-base-200"
                    >
                      {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label text-[10px] uppercase font-bold opacity-40">Account</label>
                    <select
                      value={reviewTransaction.accountId || ''}
                      onChange={(e) => setReviewTransaction({ ...reviewTransaction, accountId: e.target.value })}
                      className="select select-bordered select-sm rounded-xl text-xs bg-base-200"
                    >
                      {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label text-[10px] uppercase font-bold opacity-40">Category</label>
                    <select
                      value={reviewTransaction.categoryId || ''}
                      onChange={(e) => setReviewTransaction({ ...reviewTransaction, categoryId: e.target.value })}
                      className="select select-bordered select-sm rounded-xl text-xs bg-base-200"
                    >
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setReviewTransaction(null)}
                className="btn btn-ghost flex-1 rounded-2xl font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveQuickLog}
                disabled={reviewLoading}
                className="btn btn-error flex-1 rounded-2xl text-white font-bold"
              >
                {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}

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
