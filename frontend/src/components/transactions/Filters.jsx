import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { isNativeApp, isPwaMode } from '../../utils/pwaUtils';

export default function Filters({
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  filterCategory,
  setFilterCategory,
  filterAccount,
  setFilterAccount,
  filterDateRange,
  setFilterDateRange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  showFilters,
  setShowFilters,
  categories,
  accounts,
  handleInstallApp
}) {
  const selectedCategoryValue = React.useMemo(() => {
    if (!filterCategory || filterCategory === 'ALL') return 'ALL';
    const filterStr = String(filterCategory).toLowerCase();
    const matched = (categories || []).find(c => 
      String(c._id || '').toLowerCase() === filterStr ||
      String(c.clientCatId || '').toLowerCase() === filterStr ||
      String(c.name || '').toLowerCase() === filterStr
    );
    if (matched) return String(matched._id || matched.clientCatId || matched.name);
    return String(filterCategory);
  }, [categories, filterCategory]);

  return (
    <>
      {/* Date / Month Header Row */}
      <div className="bg-base-200 p-4 flex justify-between items-center border-b border-base-200">
        <h1 className="text-md font-bold">
          {new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-xs ${showFilters ? 'bg-secondary-app text-white border-secondary-app' : 'btn-outline'} flex items-center gap-1 cursor-pointer`}
          >
            <SlidersHorizontal className="w-3 h-3" /> Filters
          </button>
          {!(isNativeApp() || isPwaMode()) && (
            <button
              onClick={handleInstallApp}
              className="btn btn-xs btn-outline cursor-pointer"
            >
              Install APK
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <div className="p-4 bg-base-200/50 border-b border-base-content/10 space-y-3 animate-slideUp">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-base-content/40 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search note, category, account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-sm bg-base-100 border-base-content/15 pl-9 w-full text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Filter by Type */}
            <div className="flex flex-col gap-1">
              <label className="opacity-50 text-[10px] font-bold uppercase tracking-wider pl-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="select select-sm select-bordered bg-base-100 border-base-content/15 text-xs w-full"
              >
                <option value="ALL">All Types</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </div>

            {/* Filter by Date Range */}
            <div className="flex flex-col gap-1">
              <label className="opacity-50 text-[10px] font-bold uppercase tracking-wider pl-1">Period</label>
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="select select-sm select-bordered bg-base-100 border-base-content/15 text-xs w-full"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="WEEK">This Week</option>
                <option value="MONTH">This Month</option>
                <option value="CUSTOM">Custom Range</option>
              </select>
            </div>

            {/* Filter by Category */}
            <div className="flex flex-col gap-1">
              <label className="opacity-50 text-[10px] font-bold uppercase tracking-wider pl-1">Category</label>
              <select
                value={selectedCategoryValue}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="select select-sm select-bordered bg-base-100 border-base-content/15 text-xs w-full"
              >
                <option value="ALL">All Categories</option>
                {filterType === 'INCOME' && (
                  categories.filter(c => c.type === 'INCOME').map((cat) => {
                    const val = String(cat._id || cat.clientCatId || cat.name);
                    return <option key={val} value={val}>{cat.emoji} {cat.name}</option>;
                  })
                )}
                {filterType === 'EXPENSE' && (
                  categories.filter(c => c.type === 'EXPENSE').map((cat) => {
                    const val = String(cat._id || cat.clientCatId || cat.name);
                    return <option key={val} value={val}>{cat.emoji} {cat.name}</option>;
                  })
                )}
                {(filterType === 'ALL' || filterType === 'TRANSFER') && (
                  <>
                    <optgroup label="Income Categories">
                      {categories.filter(c => c.type === 'INCOME').map((cat) => {
                        const val = String(cat._id || cat.clientCatId || cat.name);
                        return <option key={val} value={val}>{cat.emoji} {cat.name}</option>;
                      })}
                    </optgroup>
                    <optgroup label="Expense Categories">
                      {categories.filter(c => c.type === 'EXPENSE').map((cat) => {
                        const val = String(cat._id || cat.clientCatId || cat.name);
                        return <option key={val} value={val}>{cat.emoji} {cat.name}</option>;
                      })}
                    </optgroup>
                  </>
                )}
              </select>
            </div>

            {/* Filter by Account */}
            <div className="flex flex-col gap-1">
              <label className="opacity-50 text-[10px] font-bold uppercase tracking-wider pl-1">Account</label>
              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="select select-sm select-bordered bg-base-100 border-base-content/15 text-xs w-full"
              >
                <option value="ALL">All Accounts</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>{acc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Date Inputs */}
          {filterDateRange === 'CUSTOM' && (
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-base-content/5">
              <div className="flex flex-col gap-1">
                <label className="opacity-50 text-[10px] font-bold uppercase tracking-wider pl-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="input input-sm input-bordered bg-base-100 border-base-content/15 text-xs w-full"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="opacity-50 text-[10px] font-bold uppercase tracking-wider pl-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="input input-sm input-bordered bg-base-100 border-base-content/15 text-xs w-full"
                />
              </div>
            </div>
          )}

          {/* Clear Filters Button */}
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterType('ALL');
              setFilterCategory('ALL');
              setFilterAccount('ALL');
              setFilterDateRange('MONTH');
              setCustomStartDate('');
              setCustomEndDate('');
            }}
            className="btn btn-xs btn-ghost text-error/85 hover:text-error hover:bg-error/10 w-full rounded-lg mt-1 cursor-pointer"
          >
            Clear Active Filters
          </button>
        </div>
      )}
    </>
  );
}
