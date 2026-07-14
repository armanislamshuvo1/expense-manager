import React from 'react';

export default function CategoryTransactionsModal({
  selectedCategoryTransactions,
  setSelectedCategoryTransactions,
  baseCurrency
}) {
  if (!selectedCategoryTransactions) return null;

  return (
    <dialog
      className="modal modal-open"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setSelectedCategoryTransactions(null);
        }
      }}
    >
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
  );
}
