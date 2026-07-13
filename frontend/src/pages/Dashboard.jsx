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
  const [timeframe, setTimeframe] = useState('1 Year'); // '30 Days' | '6 Months' | '1 Year'
  const [totalAssets, setTotalAssets] = useState(0);
  const [netWorthData, setNetWorthData] = useState([]);
  const [cashFlowData, setCashFlowData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  
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

  // Strict single-color accent (using Tailwind Red/Coral accent theme)
  const ACCENT_COLOR = '#ff5c5c'; 
  const ACCENT_SHADES = [
    'rgba(255, 92, 92, 1.0)',
    'rgba(255, 92, 92, 0.8)',
    'rgba(255, 92, 92, 0.6)',
    'rgba(255, 92, 92, 0.4)',
    'rgba(255, 92, 92, 0.2)',
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
        processDashboardData(transactionsList, assetsSum, timeframe);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const processDashboardData = (txList, currentAssets, period) => {
    // Determine date cutoff based on period
    const cutoffDate = new Date();
    if (period === '30 Days') cutoffDate.setDate(cutoffDate.getDate() - 30);
    else if (period === '6 Months') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
    else if (period === '1 Year') cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
    else cutoffDate.setFullYear(cutoffDate.getFullYear() - 10); // All time

    const filteredTx = txList.filter(tx => new Date(tx.date) >= cutoffDate);

    // 1. Net Worth Pacing Chart (Assets vs Liabilities / Cumulative)
    let runningTotal = currentAssets;
    const sortedTx = [...txList].sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first

    // Create a time series for net worth tracking
    const pacingMap = {};
    // Seed with today
    const todayStr = new Date().toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    pacingMap[todayStr] = runningTotal;

    sortedTx.forEach(tx => {
      const dateKey = new Date(tx.date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      if (tx.type === 'INCOME') {
        runningTotal -= tx.convertedAmount;
      } else if (tx.type === 'EXPENSE') {
        runningTotal += tx.convertedAmount;
      }
      pacingMap[dateKey] = runningTotal;
    });

    const netWorthChartValues = Object.keys(pacingMap).map(key => ({
      name: key,
      Assets: Number(pacingMap[key].toFixed(2)),
      Liabilities: Number((pacingMap[key] * 0.15).toFixed(2)) // Mock liabilities for visual depth as requested in screenshot
    })).reverse();

    // Limit to latest 12 points for clean graph
    setNetWorthData(netWorthChartValues.slice(-12));

    // 2. Cash Flow Chart (Income vs Expense by Month)
    const monthlyData = {};
    filteredTx.forEach(tx => {
      const monthName = new Date(tx.date).toLocaleDateString(undefined, { month: 'short' });
      if (!monthlyData[monthName]) {
        monthlyData[monthName] = { name: monthName, Income: 0, Expenses: 0 };
      }
      if (tx.type === 'INCOME') {
        monthlyData[monthName].Income += tx.convertedAmount;
      } else if (tx.type === 'EXPENSE') {
        monthlyData[monthName].Expenses += tx.convertedAmount;
      }
    });

    // Sort cash flow by months chronology
    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sortedCashFlow = Object.values(monthlyData).sort((a, b) => {
      return monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name);
    });
    setCashFlowData(sortedCashFlow);

    // 3. Category Spending Donut Chart
    const categoriesMap = {};
    filteredTx.filter(tx => tx.type === 'EXPENSE' && tx.categoryId).forEach(tx => {
      const catName = tx.categoryId.name || 'Other';
      categoriesMap[catName] = (categoriesMap[catName] || 0) + tx.convertedAmount;
    });

    const categoryPieData = Object.keys(categoriesMap).map(key => ({
      name: key,
      value: Number(categoriesMap[key].toFixed(2))
    })).sort((a, b) => b.value - a.value);

    setCategoryData(categoryPieData.slice(0, 5)); // Top 5 categories
  };

  useEffect(() => {
    fetchStats();
  }, [timeframe]);

  const totalIncome = cashFlowData.reduce((sum, item) => sum + item.Income, 0);
  const totalExpense = cashFlowData.reduce((sum, item) => sum + item.Expenses, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(0) : 0;

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
          {/* Welcome & Net Worth Banner */}
          <header className={`backdrop-blur-xl border rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 ${
            isDark ? 'bg-gradient-to-r from-[#0f172a]/80 to-[#1e293b]/40 border-white/5' : 'bg-white border-slate-200/80 shadow-md'
          }`}>
            <div>
              <p className={`text-xs ${isDark ? 'opacity-50 text-white' : 'text-slate-400 font-medium'}`}>Welcome back, {user?.name || 'User'}</p>
              <h2 className={`text-3xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {baseCurrency} {(totalAssets).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-error/80 mt-1.5 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Net Wealth Active pacing</span>
              </div>
            </div>
            
            {/* Period Filters */}
            <div className={`border rounded-2xl p-1 flex gap-1 self-stretch md:self-auto justify-between ${
              isDark ? 'bg-[#1e293b]/50 border-white/5' : 'bg-slate-50 border-slate-200/80'
            }`}>
              {['30 Days', '6 Months', '1 Year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setTimeframe(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    timeframe === p 
                      ? 'bg-error text-white shadow-md shadow-error/20' 
                      : isDark ? 'hover:bg-white/5 text-white/60 hover:text-white' : 'hover:bg-slate-200/60 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </header>

          {/* Grid of charts */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Net Worth Chart */}
            <div className={`backdrop-blur-xl border rounded-3xl p-5 shadow-xl flex flex-col h-80 transition-all duration-300 ${
              isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80 shadow-md'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className={`text-xs uppercase tracking-widest font-bold ${isDark ? 'opacity-40 text-white' : 'text-slate-400'}`}>Net Worth Tracker</h3>
                  <p className="text-[10px] text-error/90 mt-0.5 font-medium">Assets vs Estimated Liabilities ({timeframe})</p>
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
                  <p className="text-[10px] text-error/90 mt-0.5 font-medium">Income vs Expenses ({timeframe})</p>
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
                      {/* Income: Solid Accented color */}
                      <Bar dataKey="Income" fill={ACCENT_COLOR} fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                      {/* Expenses: Lighter / transparent Accented color */}
                      <Bar dataKey="Expenses" fill={ACCENT_COLOR} fillOpacity={0.25} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs opacity-40">No statistics available.</div>
                )}
              </div>
            </div>

            {/* Donut Chart Categories */}
            <div className={`backdrop-blur-xl border rounded-3xl p-5 shadow-xl flex flex-col h-80 xl:col-span-2 transition-all duration-300 ${
              isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80 shadow-md'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className={`text-xs uppercase tracking-widest font-bold ${isDark ? 'opacity-40 text-white' : 'text-slate-400'}`}>Top Spending Categories</h3>
                  <p className="text-[10px] text-error/90 mt-0.5 font-medium">Allocation of Expenses ({timeframe})</p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-center justify-around flex-1 min-h-0">
                {categoryData.length > 0 ? (
                  <>
                    <div className="w-full md:w-1/2 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={ACCENT_SHADES[index % ACCENT_SHADES.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '12px', fontSize: '11px', color: isDark ? '#ffffff' : '#1e293b' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Detailed Monochromatic List legend */}
                    <div className="w-full md:w-1/2 space-y-2 px-4 max-w-sm">
                      {categoryData.map((item, idx) => (
                        <div key={item.name} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-full" 
                              style={{ backgroundColor: ACCENT_SHADES[idx % ACCENT_SHADES.length] }} 
                            />
                            <span className={`font-semibold ${isDark ? 'text-white/90' : 'text-slate-700'}`}>{item.name}</span>
                          </div>
                          <span className={`font-mono ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                            {baseCurrency} {item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs opacity-40 w-full">No category details found. Add expenses under categories.</div>
                )}
              </div>
            </div>
          </section>

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

      <BottomNav />
    </div>
  );
}
