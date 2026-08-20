import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, ExternalLink, X } from 'lucide-react';

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

  const handleViewAllInTransactions = () => {
    const catIdOrName = selectedCategoryTransactions.categoryId || selectedCategoryTransactions.categoryName;
    setSelectedCategoryTransactions(null);
    navigate('/transactions', {
      state: {
        filterCategory: catIdOrName,
        filterType: selectedCategoryTransactions.type || 'ALL'
      }
    });
  };

  const totalAmount = (selectedCategoryTransactions.transactions || []).reduce(
    (sum, tx) => sum + (tx.convertedAmount || tx.amount || 0), 0
  );

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setSelectedCategoryTransactions(null);
        }
      }}
    >
      <div className="bg-base-300 border border-base-content/15 rounded-2xl max-w-lg w-full p-5 shadow-2xl relative animate-scaleUp">
        <div className="flex items-center justify-between pb-3 border-b border-base-content/10 mb-4">
          <div>
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              <span>{selectedCategoryTransactions.categoryName}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-base-200 opacity-80">
                {selectedCategoryTransactions.transactions.length} txns
              </span>
            </h3>
            <p className="text-xs opacity-60 font-mono mt-0.5">
              Total: {baseCurrency} {totalAmount.toFixed(2)}
            </p>
          </div>
          <button 
            onClick={() => setSelectedCategoryTransactions(null)}
            className="btn btn-sm btn-circle btn-ghost text-base-content/60 hover:text-base-content"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {selectedCategoryTransactions.transactions.map((tx) => (
            <div 
              key={tx._id || tx.clientTxId} 
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

        <div className="mt-4 pt-3 border-t border-base-content/10 flex justify-end">
          <button
            onClick={handleViewAllInTransactions}
            className="btn btn-sm btn-error text-white gap-1.5 cursor-pointer text-xs font-bold shadow-md hover:bg-error/80"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View All in Transactions List
          </button>
        </div>
      </div>
    </div>
  );
}
