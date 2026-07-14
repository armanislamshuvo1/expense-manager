import React from 'react';
import { Trash2 } from 'lucide-react';

const TransactionRow = React.memo(({
  tx,
  user,
  handleOpenEditModal,
  handleDeleteTransaction
}) => {
  const txTime = new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <div className="group flex justify-between items-center py-2 px-2 hover:bg-base-200/40 rounded-xl transition-colors">
      <div 
        onClick={() => handleOpenEditModal(tx)}
        className="flex-1 flex justify-between items-center cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {tx.type === 'TRANSFER' ? '🔄' : (tx.categoryId?.emoji || '🏷️')}
          </span>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">
              {tx.type === 'TRANSFER' ? 'Transfer' : (tx.categoryId?.name || 'Uncategorized')}
            </span>
            {tx.note && (
              <span className="text-xs text-base-content/80 font-medium py-0.5">
                {tx.note}
              </span>
            )}
            <span className="text-[10px] opacity-50 flex items-center gap-1.5">
              <span>{txTime}</span>
              <span>•</span>
              <span>
                {tx.type === 'TRANSFER' 
                  ? `${tx.accountId?.name} ➔ ${tx.toAccountId?.name || '?'}` 
                  : tx.accountId?.name
                }
              </span>
            </span>
          </div>
        </div>
        <div className="text-right mr-3">
          <div className={`font-bold text-sm ${
            tx.type === 'INCOME' ? 'text-primary' : tx.type === 'EXPENSE' ? 'text-error' : 'text-warning'
          }`}>
            {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : '⇄'} {tx.currency} {tx.amount.toFixed(2)}
          </div>
          {tx.currency !== user?.baseCurrency && tx.convertedAmount !== undefined && (
            <div className="text-[9px] opacity-50">
              Base: {user?.baseCurrency} {tx.convertedAmount.toFixed(2)}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteTransaction(tx._id);
        }}
        className="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/10 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100"
      >
        <Trash2 className="w-4 h-4" />
      </button>
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
  handleDeleteTransaction
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
              className="flex justify-between items-center bg-base-200/90 hover:bg-base-200 cursor-pointer p-3 rounded-xl border border-base-content/10 transition-colors shadow-sm active:scale-[0.99]"
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
                <span className="text-primary">{baseCurrency} {dayIncome.toFixed(2)}</span>
                <span className="text-error">{baseCurrency} {dayExpense.toFixed(2)}</span>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md interactive-scale">
              <div className="card-body p-2">
                <div className="divide-y divide-base-200">
                  {dayTransactions.map((tx) => (
                    <TransactionRow
                      key={tx._id}
                      tx={tx}
                      user={user}
                      handleOpenEditModal={handleOpenEditModal}
                      handleDeleteTransaction={handleDeleteTransaction}
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
