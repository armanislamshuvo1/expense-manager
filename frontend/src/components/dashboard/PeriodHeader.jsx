import React from 'react';

export default function PeriodHeader({
  periodType,
  setPeriodType,
  formatPeriodLabel,
  handlePrevPeriod,
  handleNextPeriod,
  isDark
}) {
  return (
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
  );
}
