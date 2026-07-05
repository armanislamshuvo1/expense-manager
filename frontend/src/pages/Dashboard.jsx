import React, { useEffect, useState } from 'react';
import { useAxiosSecure } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalLiabilities, setTotalLiabilities] = useState(0);
  const axiosSecure = useAxiosSecure();
  const { user, logout } = useAuth();

  const fetchStats = async () => {
    try {
      const [accRes, txRes] = await Promise.all([
        axiosSecure.get('/api/accounts'),
        axiosSecure.get('/api/transactions'),
      ]);

      if (accRes.data.success && txRes.data.success) {
        const accountsList = accRes.data.data;
        const transactionsList = txRes.data.data;

        // Calculate assets vs liabilities
        const assetsSum = accountsList.reduce((sum, acc) => sum + acc.balance, 0);
        setTotalAssets(assetsSum);

        // Generate line chart values based on transaction history
        let runningTotal = assetsSum;
        const chartValues = transactionsList.map((tx, idx) => {
          if (tx.type === 'INCOME') {
            runningTotal -= tx.convertedAmount;
          } else if (tx.type === 'EXPENSE') {
            runningTotal += tx.convertedAmount;
          }
          return {
            name: new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            NetWorth: Number(runningTotal.toFixed(2)),
          };
        }).reverse();

        // Add current value
        chartValues.push({
          name: 'Today',
          NetWorth: assetsSum
        });

        setData(chartValues);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-base-300 pb-24 text-base-content font-sans">
      {/* Top Header Card */}
      <div className="bg-base-200 p-6 rounded-b-3xl shadow-lg border-b border-base-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-black">Net Worth</h1>
            <p className="text-xs opacity-60">Assets & Alternative Investments</p>
          </div>
          <button onClick={logout} className="btn btn-xs btn-outline btn-error">
            Sign Out
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-4 bg-base-100/50 rounded-2xl border border-base-content/5 mb-4">
          <span className="text-xs opacity-50 uppercase tracking-widest">Total Wealth</span>
          <h2 className="text-3xl font-black mt-1 text-primary">
            {user?.baseCurrency || 'MYR'} {(totalAssets - totalLiabilities).toFixed(2)}
          </h2>
          <div className="flex items-center gap-1 text-xs text-primary mt-2">
            <TrendingUp className="w-4 h-4" />
            <span>Month-to-Date Net Worth Pacing</span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-4">
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4">
            <h3 className="card-title text-sm font-bold opacity-75 mb-4">Performance History</h3>
            <div className="w-full h-48">
              {data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff5c5c" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ff5c5c" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="currentColor" opacity={0.4} fontSize={10} />
                    <YAxis stroke="currentColor" opacity={0.4} fontSize={10} width={40} />
                    <Tooltip contentStyle={{ backgroundColor: '#1d232a', border: 'none', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="NetWorth" stroke="#ff5c5c" strokeWidth={3} fillOpacity={1} fill="url(#colorUv)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs opacity-50">
                  No chart pacing history generated.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
