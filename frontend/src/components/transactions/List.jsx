import React from 'react';
import { Trash2 } from 'lucide-react';
import { useAccountModal } from '../../context/AccountModalContext';

const TransactionRow = React.memo(({
  tx,
  user,
  handleOpenEditModal,
  handleDeleteTransaction,
  onCategoryClick
}) => {
  const { openAccountModal } = useAccountModal();
  const txTime = new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const catName = tx.type === 'TRANSFER' ? 'Transfer' : (tx.categoryId?.name || 'General');
  const isIncome = tx.type === 'INCOME';
  const isExpense = tx.type === 'EXPENSE';

  return (
    <div 
      onClick={() => handleOpenEditModal(tx)}
      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-base-200/60 active:scale-[0.99] transition-all cursor-pointer gap-2 border border-transparent hover:border-base-content/10"
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
          isIncome 
            ? 'bg-primary-app/15 text-primary-app border border-primary-app/30' 
            : isExpense 
              ? 'bg-danger-app/15 text-danger-app border border-danger-app/30' 
              : 'bg-secondary-app/15 text-secondary-app border border-secondary-app/30'
        }`}>
          {isIncome ? 'IN' : isExpense ? 'OUT' : '⇄'}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-xs text-base-content truncate">
            {tx.note || catName}
          </span>
          <span className="text-[10px] text-base-content/60 flex items-center gap-1 truncate">
            <span className="font-semibold truncate">{catName}</span>
            <span>•</span>
            <span className="truncate">{tx.accountId?.name || 'Account'}</span>
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`font-black text-xs ${
          isIncome ? 'text-primary-app' : isExpense ? 'text-danger-app' : 'text-secondary-app'
        }`}>
          {isIncome ? '+' : isExpense ? '-' : '⇄'} {tx.currency || user?.baseCurrency} {Number(tx.amount || 0).toFixed(2)}
        </div>
        <div className="text-[9px] text-base-content/40">
          {txTime}
        </div>
      </div>
    </div>
  );
});

TransactionRow.displayName = 'TransactionRow';

const List = React.memo(({
  transactions,
  filteredTransactions,
  uniqueDates,
  groupedTransactions,
  baseCurrency,
  user,
  isTransactionsLoading,
  formatDateHeader,
  handleOpenAddModal,
  handleOpenEditModal,
  handleDeleteTransaction,
  onCategoryClick
}) => {
  if (isTransactionsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((n) => (
          <div key={n} className="space-y-2">
            <div className="h-3 w-16 skeleton-shimmer rounded px-1"></div>
            <div className="card bg-base-100 shadow-md">
              <div className="card-body p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 skeleton-shimmer rounded-full"></div>
                    <div className="space-y-1.5">
                      <div className="h-4 w-28 skeleton-shimmer rounded"></div>
                      <div className="h-3 w-20 skeleton-shimmer rounded"></div>
                    </div>
                  </div>
                  <div className="h-4 w-16 skeleton-shimmer rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 opacity-60 text-sm">
        No transactions logged this month.
      </div>
    );
  }

  if (filteredTransactions.length === 0) {
    return (
      <div className="text-center py-10 opacity-60 text-sm">
        No transactions match the selected filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {uniqueDates.map((dateKey) => {
        const dayTransactions = groupedTransactions[dateKey] || [];
        const dayIncome = dayTransactions
          .filter(tx => tx.type === 'INCOME')
          .reduce((sum, tx) => sum + (tx.convertedAmount || tx.amount), 0);
        const dayExpense = dayTransactions
          .filter(tx => tx.type === 'EXPENSE')
          .reduce((sum, tx) => sum + (tx.convertedAmount || tx.amount), 0);
        const formattedHeader = formatDateHeader(dateKey);

        return (
          <div key={dateKey} className="space-y-2">
            {/* Styled Clickable Date Bar */}
            <div 
              onClick={() => handleOpenAddModal(formattedHeader.dateObj)}
              className="flex justify-between items-center bg-base-200/90 hover:bg-base-200 cursor-pointer p-3 rounded-xl border border-base-content/10 transition-colors shadow-sm"
              title="Click to add transaction for this day"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-base-content leading-none">
                  {formattedHeader.day}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider ${
                  formattedHeader.dayOfWeek === 'Sun' || formattedHeader.dayOfWeek === 'Sat'
                    ? 'bg-error/10 text-error'
                    : 'bg-base-300 text-base-content/60'
                }`}>
                  {formattedHeader.dayOfWeek}
                </span>
                <span className="text-[10px] text-base-content/40 font-semibold font-mono">
                  {formattedHeader.monthYear}
                </span>
              </div>
              <div className="flex gap-3 text-xs font-bold font-mono">
                <span className="text-success">{baseCurrency} {dayIncome.toFixed(2)}</span>
                <span className="text-error">{baseCurrency} {dayExpense.toFixed(2)}</span>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md">
              <div className="card-body p-2">
                <div className="divide-y divide-base-200">
                  {dayTransactions.map((tx) => (
                    <TransactionRow
                      key={tx._id}
                      tx={tx}
                      user={user}
                      handleOpenEditModal={handleOpenEditModal}
                      handleDeleteTransaction={handleDeleteTransaction}
                      onCategoryClick={onCategoryClick}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

List.displayName = 'List';

export default List;
