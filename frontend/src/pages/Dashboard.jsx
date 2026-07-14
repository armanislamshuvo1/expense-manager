import React, { useEffect, useState } from 'react';
import { useAxiosSecure } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { isPwaMode } from '../utils/pwaUtils';
import { useTheme } from '../context/ThemeContext';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  TrendingUp, Calendar, CreditCard, ArrowUpRight, ArrowDownRight, Wallet, Activity,
  Sun, Moon
} from 'lucide-react';

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [netWorthData, setNetWorthData] = useState([]);
  const [cashFlowData, setCashFlowData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  // Dynamic selector states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [periodType, setPeriodType] = useState('Monthly'); // 'Weekly' | 'Monthly' | 'Yearly' | 'All'
  const [activeTab, setActiveTab] = useState('EXPENSE'); // 'EXPENSE' | 'INCOME'
  const [selectedCategoryTransactions, setSelectedCategoryTransactions] = useState(null);
  
  const axiosSecure = useAxiosSecure();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
  const ACCENT_COLOR = '#ff5c5c';
  const ACCENT_SHADES = [
    '#ff5c5c', // Coral/Red
    '#ffa043', // Orange
    '#ffe033', // Yellow
    '#8bf23d', // Lime Green
    '#3df2a5', // Greenish Teal
    '#3dc2f2', // Cyan/Light Blue
    '#3d52f2', // Indigo/Blue
    '#aa3df2', // Purple
  ];

  const fetchStats = async () => {
    try {
      const [accRes, txRes] = await Promise.all([
        axiosSecure.get('/api/accounts'),
        axiosSecure.get('/api/transactions'),
      ]);

      if (accRes.data.success && txRes.data.success) {
        const accountsList = accRes.data.data;
        const transactionsList = txRes.data.data;

        setAccounts(accountsList);
        setTransactions(transactionsList);

        // 1. Assets calculation
        const assetsSum = accountsList.reduce((sum, acc) => sum + acc.balance, 0);
        setTotalAssets(assetsSum);

        // Generate metrics based on data and timeframe
        processDashboardData(transactionsList, assetsSum, periodType, selectedDate, activeTab);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

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
    fetchStats();
  }, [periodType, selectedDate, activeTab]);

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

  const totalForActiveTab = categoryData.reduce((sum, item) => sum + item.value, 0);
  const totalIncome = cashFlowData.reduce((sum, item) => sum + item.Income, 0);
  const totalExpense = cashFlowData.reduce((sum, item) => sum + item.Expenses, 0);
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

        {/* MAIN PANEL CONTENT */}
        <main className="flex-1 space-y-6">
          {/* Header Month / Time Selector Bar */}
          <header className="flex justify-between items-center gap-4">
            <div className={`border rounded-2xl p-1 flex gap-1 items-center ${
              isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200 shadow-md'
            }`}>
              <button 
                onClick={handlePrevPeriod}
                disabled={periodType === 'All'}
                className="btn btn-xs btn-circle btn-ghost text-base-content hover:bg-base-200/50"
              >
                &lt;
              </button>
              <span className={`text-xs font-bold px-2 text-center min-w-[90px] ${isDark ? 'text-white' : 'text-slate-700'}`}>
                {formatPeriodLabel()}
              </span>
              <button 
                onClick={handleNextPeriod}
                disabled={periodType === 'All'}
                className="btn btn-xs btn-circle btn-ghost text-base-content hover:bg-base-200/50"
              >
                &gt;
              </button>
            </div>
            
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
              className={`select select-sm select-bordered rounded-2xl text-xs font-bold border-base-content/10 ${
                isDark ? 'bg-[#0f172a]/60 text-white' : 'bg-white text-slate-700 shadow-sm'
              }`}
            >
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
              <option value="All">All Time</option>
            </select>
          </header>

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
          <div className={`backdrop-blur-xl border rounded-3xl p-5 shadow-xl flex flex-col items-center justify-center transition-all duration-300 ${
            isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80 shadow-md'
          }`}>
            <div className="w-full h-64 md:h-72">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={85}
                      dataKey="value"
                      labelLine={true}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                      onClick={(data) => handleCategoryClick(data.name)}
                      className="cursor-pointer"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={ACCENT_SHADES[index % ACCENT_SHADES.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${baseCurrency} ${Number(value).toLocaleString()}`} contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '12px', fontSize: '11px', color: isDark ? '#ffffff' : '#1e293b' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs opacity-40">No transactions recorded for this period.</div>
              )}
            </div>
            
            {/* Legend Breakdown List */}
            <div className="w-full mt-6 space-y-2.5">
              {categoryData.map((item, idx) => {
                const percentage = totalForActiveTab > 0 ? ((item.value / totalForActiveTab) * 100).toFixed(0) : '0';
                return (
                  <div 
                    key={item.name} 
                    onClick={() => handleCategoryClick(item.name)}
                    className={`flex justify-between items-center p-3 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] ${
                      isDark 
                        ? 'bg-[#1e293b]/40 border-white/5 hover:bg-[#1e293b]/70' 
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span 
                        className="px-2 py-1 text-[10px] font-extrabold rounded-lg text-white font-mono text-center min-w-[36px]" 
                        style={{ backgroundColor: ACCENT_SHADES[idx % ACCENT_SHADES.length] }}
                      >
                        {percentage}%
                      </span>
                      <span className="text-xl">
                        {item.emoji || '🏷️'}
                      </span>
                      <span className={`font-semibold text-sm ${isDark ? 'text-white/90' : 'text-slate-700'}`}>
                        {item.name}
                      </span>
                    </div>
                    <span className={`font-mono text-sm font-bold ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                      {baseCurrency} {item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

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
                  {netWorthData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={netWorthData}>
                        <defs>
                          <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={ACCENT_COLOR} stopOpacity={0.25}/>
                            <stop offset="95%" stopColor={ACCENT_COLOR} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke={isDark ? "#ffffff" : "#334155"} opacity={0.2} fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke={isDark ? "#ffffff" : "#334155"} opacity={0.2} fontSize={9} tickLine={false} axisLine={false} width={45} />
                        <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '12px', fontSize: '11px', color: isDark ? '#ffffff' : '#1e293b' }} />
                        <Area type="monotone" dataKey="Assets" stroke={ACCENT_COLOR} strokeWidth={2.5} fillOpacity={1} fill="url(#colorAssets)" />
                        <Area type="monotone" dataKey="Liabilities" stroke={ACCENT_COLOR} strokeDasharray="4 4" strokeWidth={1.5} fillOpacity={0} />
                      </AreaChart>
                    </ResponsiveContainer>
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
                  {cashFlowData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cashFlowData}>
                        <XAxis dataKey="name" stroke={isDark ? "#ffffff" : "#334155"} opacity={0.2} fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke={isDark ? "#ffffff" : "#334155"} opacity={0.2} fontSize={9} tickLine={false} axisLine={false} width={45} />
                        <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '12px', fontSize: '11px', color: isDark ? '#ffffff' : '#1e293b' }} />
                        <Bar dataKey="Income" fill={ACCENT_COLOR} fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Expenses" fill={ACCENT_COLOR} fillOpacity={0.25} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs opacity-40">No statistics available.</div>
                  )}
                </div>
              </div>
            </section>
          )}

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
      {selectedCategoryTransactions && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-base-300 border border-base-content/10 rounded-2xl max-w-lg p-5">
            <h3 className="font-extrabold text-lg flex items-center justify-between pb-3 border-b border-base-content/10 mb-4">
              <span>{selectedCategoryTransactions.categoryName} Transactions</span>
              <button 
                onClick={() => setSelectedCategoryTransactions(null)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {selectedCategoryTransactions.transactions.map((tx) => (
                <div key={tx._id} className="p-3 bg-base-200 rounded-xl flex justify-between items-center border border-base-content/5">
                  <div>
                    <p className="font-bold text-sm text-base-content">{tx.note || 'No Note'}</p>
                    <p className="text-[10px] opacity-50 font-medium mt-0.5">
                      {new Date(tx.date).toLocaleDateString()} • {tx.accountId?.name}
                    </p>
                  </div>
                  <span className={`font-mono text-sm font-black ${
                    tx.type === 'INCOME' ? 'text-primary' : 'text-error'
                  }`}>
                    {tx.type === 'INCOME' ? '+' : '-'} {tx.currency} {tx.amount.toFixed(2)}
                  </span>
                </div>
              ))}
              {selectedCategoryTransactions.transactions.length === 0 && (
                <p className="text-center py-6 opacity-45 text-xs">No transactions in this period.</p>
              )}
            </div>
          </div>
        </dialog>
      )}

      <BottomNav />
    </div>
  );
}
