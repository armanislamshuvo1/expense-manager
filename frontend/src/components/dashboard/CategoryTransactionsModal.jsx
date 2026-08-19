import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2 } from 'lucide-react';

export default function CategoryTransactionsModal({
  selectedCategoryTransactions,
  setSelectedCategoryTransactions,
  baseCurrency
}) {
  const navigate = useNavigate();

  if (!selectedCategoryTransactions) return null;

  const handleTransactionClick = (tx) => {
    setSelectedCategoryTransactions(null);
    navigate('/transactions', {
      state: {
        editTx: tx,
        editTxId: tx._id,
        returnTo: '/dashboard'
      }
    });
  };

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
        
        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {selectedCategoryTransactions.transactions.map((tx) => (
            <div 
              key={tx._id} 
              onClick={() => handleTransactionClick(tx)}
              className="p-3.5 bg-base-200 hover:bg-base-100 rounded-xl flex justify-between items-center border border-base-content/5 cursor-pointer transition-all duration-150 hover:shadow-md hover:border-primary/20 group"
              title="Click to edit transaction"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-base-300 group-hover:bg-primary/10 flex items-center justify-center text-base-content/60 group-hover:text-primary transition-colors shrink-0">
                  <Edit2 className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                </div>
                <div>
                  <p className="font-bold text-sm text-base-content group-hover:text-primary transition-colors">
                    {tx.note || 'No Note'}
                  </p>
                  <p className="text-[10px] opacity-50 font-medium mt-0.5">
                    {new Date(tx.date).toLocaleDateString()} • {tx.accountId?.name || 'Account'}
                  </p>
                </div>
              </div>
              <span className={`font-mono text-sm font-black ${
                tx.type === 'INCOME' ? 'text-primary' : 'text-error'
              }`}>
                {tx.type === 'INCOME' ? '+' : '-'} {tx.currency || baseCurrency} {Number(tx.amount || 0).toFixed(2)}
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
