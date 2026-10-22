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
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Total Income: Primary Color */}
      <div className={`backdrop-blur-xl border rounded-3xl p-3.5 shadow-md text-center transition-all duration-300 ${
        isDark ? 'bg-base-200/60 border-primary-app/20' : 'bg-white border-slate-200'
      }`}>
        <span className="text-[10px] uppercase tracking-wider block opacity-60">Total Income</span>
        <span className="text-sm font-black mt-1 block text-primary-app">
          {baseCurrency} {(Number(totalIncome) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* Total Outflow: Danger Color */}
      <div className={`backdrop-blur-xl border rounded-3xl p-3.5 shadow-md text-center transition-all duration-300 ${
        isDark ? 'bg-base-200/60 border-danger-app/20' : 'bg-white border-slate-200'
      }`}>
        <span className="text-[10px] uppercase tracking-wider block opacity-60">Total Outflow</span>
        <span className="text-sm font-black mt-1 block text-danger-app">
          {baseCurrency} {(Number(totalExpense) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* Net Savings */}
      <div className={`backdrop-blur-xl border rounded-3xl p-3.5 shadow-md text-center transition-all duration-300 ${
        isDark ? 'bg-base-200/60 border-base-content/10' : 'bg-white border-slate-200'
      }`}>
        <span className="text-[10px] uppercase tracking-wider block opacity-60">Net Savings</span>
        <span className={`text-sm font-black mt-1 block ${netSavings >= 0 ? 'text-primary-app' : 'text-danger-app'}`}>
          {baseCurrency} {(Number(netSavings) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* Savings Rate: Secondary Color */}
      <div className={`backdrop-blur-xl border rounded-3xl p-3.5 shadow-md text-center transition-all duration-300 ${
        isDark ? 'bg-base-200/60 border-secondary-app/20' : 'bg-white border-slate-200'
      }`}>
        <span className="text-[10px] uppercase tracking-wider block opacity-60">Savings Rate</span>
        <span className="text-sm font-black mt-1 block text-secondary-app font-mono">{savingsRate}%</span>
      </div>
    </section>
  );
}
