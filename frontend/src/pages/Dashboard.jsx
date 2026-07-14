import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAxiosSecure } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { isPwaMode } from '../utils/pwaUtils';
import { useTheme } from '../context/ThemeContext';

// Import modularized components
import Sidebar from '../components/dashboard/Sidebar';
import PeriodHeader from '../components/dashboard/PeriodHeader';
import CategoryChart from '../components/dashboard/CategoryChart';
import AdvancedCharts from '../components/dashboard/AdvancedCharts';
import CategoryTransactionsModal from '../components/dashboard/CategoryTransactionsModal';

export default function Dashboard() {
  const axiosSecure = useAxiosSecure();

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await axiosSecure.get('/api/accounts');
      return res.data.success ? res.data.data : [];
    }
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await axiosSecure.get('/api/transactions');
      return res.data.success ? res.data.data : [];
    }
  });

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

  const handleCategoryClick = (categoryName) => {
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
  };

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

      <BottomNav />
    </div>
  );
}
