import React from 'react';

export default function QuickStats({
  isDark,
  baseCurrency,
  totalIncome,
  totalExpense,
  netSavings,
  savingsRate
}) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className={`backdrop-blur-xl border rounded-3xl p-4 shadow-md text-center transition-all duration-300 ${
        isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80'
      }`}>
        <span className={`text-[10px] uppercase tracking-wider block ${isDark ? 'opacity-40 text-white' : 'text-slate-400'}`}>Total Income</span>
        <span className={`text-sm font-black mt-1 block ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {baseCurrency} {(Number(totalIncome) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>
      <div className={`backdrop-blur-xl border rounded-3xl p-4 shadow-md text-center transition-all duration-300 ${
        isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80'
      }`}>
        <span className={`text-[10px] uppercase tracking-wider block ${isDark ? 'opacity-40 text-white' : 'text-slate-400'}`}>Total Outflow</span>
        <span className={`text-sm font-black mt-1 block ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {baseCurrency} {(Number(totalExpense) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>
      <div className={`backdrop-blur-xl border rounded-3xl p-4 shadow-md text-center transition-all duration-300 ${
        isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80'
      }`}>
        <span className={`text-[10px] uppercase tracking-wider block ${isDark ? 'opacity-40 text-white' : 'text-slate-400'}`}>Net Savings</span>
        <span className={`text-sm font-black mt-1 block ${netSavings >= 0 ? 'text-error' : isDark ? 'text-white/40' : 'text-slate-400'}`}>
          {baseCurrency} {(Number(netSavings) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>
      <div className={`backdrop-blur-xl border rounded-3xl p-4 shadow-md text-center transition-all duration-300 ${
        isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200/80'
      }`}>
        <span className={`text-[10px] uppercase tracking-wider block ${isDark ? 'opacity-40 text-white' : 'text-slate-400'}`}>Savings Rate</span>
        <span className={`text-sm font-black mt-1 block ${isDark ? 'text-white' : 'text-slate-800'}`}>{savingsRate}%</span>
      </div>
    </section>
  );
}
