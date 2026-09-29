import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../utils/apiConfig';

export default function SharedDashboard() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('1 Year');

  const [netWorthData, setNetWorthData] = useState([]);
  const [cashFlowData, setCashFlowData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [totalAssets, setTotalAssets] = useState(0);

  const ACCENT_COLOR = '#ff5c5c'; 
  const ACCENT_SHADES = [
    'rgba(255, 92, 92, 1.0)',
    'rgba(255, 92, 92, 0.8)',
    'rgba(255, 92, 92, 0.6)',
    'rgba(255, 92, 92, 0.4)',
    'rgba(255, 92, 92, 0.2)',
  ];

  const fetchSharedData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/share/${token}`);
      if (response.data.success) {
        const payload = response.data.data;
        setData(payload);

        // Assets sum
        const assetsSum = payload.accounts.reduce((sum, acc) => sum + acc.balance, 0);
        setTotalAssets(assetsSum);

        processDashboardData(payload.transactions, assetsSum, timeframe);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load shared statistics. The link may have expired or been disabled.');
    } finally {
      setLoading(false);
    }
  };

  const processDashboardData = (txList, currentAssets, period) => {
    const cutoffDate = new Date();
    if (period === '30 Days') cutoffDate.setDate(cutoffDate.getDate() - 30);
    else if (period === '6 Months') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
    else if (period === '1 Year') cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
    else cutoffDate.setFullYear(cutoffDate.getFullYear() - 10);

    const filteredTx = txList.filter(tx => new Date(tx.date) >= cutoffDate);

    // 1. Net Worth Pacing Chart
    let runningTotal = currentAssets;
    const sortedTx = [...txList].sort((a, b) => new Date(b.date) - new Date(a.date));

    const pacingMap = {};
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
      Liabilities: Number((pacingMap[key] * 0.15).toFixed(2))
    })).reverse();

    setNetWorthData(netWorthChartValues.slice(-12));

    // 2. Cash Flow Chart
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

    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sortedCashFlow = Object.values(monthlyData).sort((a, b) => {
      return monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name);
    });
    setCashFlowData(sortedCashFlow);

    // 3. Categories Donut Chart
    const categoriesMap = {};
    filteredTx.filter(tx => tx.type === 'EXPENSE' && tx.categoryId).forEach(tx => {
      const catName = tx.categoryId.name || 'Other';
      categoriesMap[catName] = (categoriesMap[catName] || 0) + tx.convertedAmount;
    });

    const categoryPieData = Object.keys(categoriesMap).map(key => ({
      name: key,
      value: Number(categoriesMap[key].toFixed(2))
    })).sort((a, b) => b.value - a.value);

    setCategoryData(categoryPieData.slice(0, 5));
  };

  useEffect(() => {
    fetchSharedData();
  }, [timeframe]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center text-[#e0e6f2]">
        <span className="loading loading-spinner text-error"></span>
        <p className="text-xs opacity-50 mt-4">Loading shared stats...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center text-[#e0e6f2] p-4">
        <div className="bg-[#0f172a]/80 border border-white/5 p-6 rounded-3xl text-center max-w-sm">
          <p className="text-error font-semibold mb-2">Access Error</p>
          <p className="text-xs opacity-50 mb-4">{error || 'Unable to retrieve dashboard.'}</p>
        </div>
      </div>
    );
  }

  const { user, accounts } = data;
  const baseCurrency = user.baseCurrency || 'MYR';

  const totalIncome = cashFlowData.reduce((sum, item) => sum + item.Income, 0);
  const totalExpense = cashFlowData.reduce((sum, item) => sum + item.Expenses, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(0) : 0;

  return (
    <div className="min-h-screen bg-[#070b13] text-[#e0e6f2] font-sans pb-12">
      <div className="flex flex-col lg:flex-row max-w-7xl mx-auto p-4 lg:p-6 gap-6">
        
        {/* Sidebar */}
        <aside className="w-full lg:w-72 flex flex-col gap-6">
          <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-error to-error/60 flex items-center justify-center shadow-lg shadow-error/20">
                <span className="text-xl font-black text-white">N</span>
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-wider text-white">NEXUS WEALTH</h1>
                <p className="text-[10px] opacity-40 uppercase tracking-widest">Shared Portal</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-[10px] text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Secure Read-Only Access</span>
            </div>
          </div>

          {/* Accounts list */}
          <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-xl">
            <h2 className="text-xs uppercase tracking-widest opacity-40 font-bold mb-4">Shared Accounts</h2>
            <div className="space-y-3">
              {accounts.map(acc => (
                <div key={acc._id} className="flex justify-between items-center p-3 rounded-2xl bg-[#1e293b]/40 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-error/10 border border-error/20 flex items-center justify-center text-error font-bold text-xs">
                      {acc.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white/90">{acc.name}</h4>
                      <p className="text-[9px] opacity-40 uppercase">{acc.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-white">
                      {acc.currency} {acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-6">
          <header className="bg-gradient-to-r from-[#0f172a]/80 to-[#1e293b]/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-xs opacity-50">Shared dashboard of</p>
              <h2 className="text-xl font-bold text-white tracking-tight mt-1">{user.name}</h2>
              <h3 className="text-2xl font-black text-white mt-1">
                {baseCurrency} {totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>
            
            <div className="bg-[#1e293b]/50 border border-white/5 rounded-2xl p-1 flex gap-1 self-stretch md:self-auto justify-between">
              {['30 Days', '6 Months', '1 Year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setTimeframe(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    timeframe === p 
                      ? 'bg-error text-white shadow-md shadow-error/20' 
                      : 'hover:bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </header>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Net Worth */}
            <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-xl flex flex-col h-80">
              <h3 className="text-xs uppercase tracking-widest opacity-40 font-bold mb-4">Net Worth Tracker</h3>
              <div className="flex-1 min-h-0">
                {netWorthData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={netWorthData}>
                      <defs>
                        <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={ACCENT_COLOR} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={ACCENT_COLOR} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#ffffff" opacity={0.2} fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff" opacity={0.2} fontSize={9} tickLine={false} axisLine={false} width={45} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px' }} />
                      <Area type="monotone" dataKey="Assets" stroke={ACCENT_COLOR} strokeWidth={2.5} fillOpacity={1} fill="url(#colorAssets)" />
                      <Area type="monotone" dataKey="Liabilities" stroke={ACCENT_COLOR} strokeDasharray="4 4" strokeWidth={1.5} fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs opacity-40">No statistics.</div>
                )}
              </div>
            </div>

            {/* Cash Flow */}
            <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-xl flex flex-col h-80">
              <h3 className="text-xs uppercase tracking-widest opacity-40 font-bold mb-4">Monthly Cash Flow</h3>
              <div className="flex-1 min-h-0">
                {cashFlowData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={cashFlowData}>
                      <XAxis dataKey="name" stroke="#ffffff" opacity={0.2} fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff" opacity={0.2} fontSize={9} tickLine={false} axisLine={false} width={45} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px' }} />
                      <Bar dataKey="Income" fill={ACCENT_COLOR} fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Expenses" fill={ACCENT_COLOR} fillOpacity={0.25} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs opacity-40">No cash flow statistics.</div>
                )}
              </div>
            </div>

            {/* Pie Chart Categories */}
            <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-xl flex flex-col h-80 xl:col-span-2">
              <h3 className="text-xs uppercase tracking-widest opacity-40 font-bold mb-2">Top Spending Categories</h3>
              <div className="flex flex-col md:flex-row items-center justify-around flex-1 min-h-0">
                {categoryData.length > 0 ? (
                  <>
                    <div className="w-full md:w-1/2 h-48">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="w-full md:w-1/2 space-y-2 px-4 max-w-sm">
                      {categoryData.map((item, idx) => (
                        <div key={item.name} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-full" 
                              style={{ backgroundColor: ACCENT_SHADES[idx % ACCENT_SHADES.length] }} 
                            />
                            <span className="font-semibold text-white/90">{item.name}</span>
                          </div>
                          <span className="font-mono text-white/60">
                            {baseCurrency} {item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs opacity-40 w-full">No categories configured.</div>
                )}
              </div>
            </div>
          </section>

          {/* Quick Stats Summary */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-4 shadow-md text-center">
              <span className="text-[10px] opacity-40 uppercase tracking-wider block">Total Income</span>
              <span className="text-sm font-black text-white mt-1 block">
                {baseCurrency} {totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-4 shadow-md text-center">
              <span className="text-[10px] opacity-40 uppercase tracking-wider block">Total Outflow</span>
              <span className="text-sm font-black text-white mt-1 block">
                {baseCurrency} {totalExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-4 shadow-md text-center">
              <span className="text-[10px] opacity-40 uppercase tracking-wider block">Net Savings</span>
              <span className={`text-sm font-black mt-1 block ${netSavings >= 0 ? 'text-error' : 'text-white/40'}`}>
                {baseCurrency} {netSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-4 shadow-md text-center">
              <span className="text-[10px] opacity-40 uppercase tracking-wider block">Savings Rate</span>
              <span className="text-sm font-black text-white mt-1 block">{savingsRate}%</span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
