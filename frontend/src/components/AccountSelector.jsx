import React from 'react';
import { X, Plus, Edit } from 'lucide-react';

export const AccountSelector = ({ accounts = [], selectedAccountId, onSelect, onClose, onAddAccount }) => {
  return (
    <div className="bg-base-100 p-4 rounded-t-3xl border-t border-base-300 w-full animate-slideUp">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-base-200">
        <h3 className="font-bold text-lg text-base-content flex items-center gap-2">
          Accounts
        </h3>
        <div className="flex gap-2">
          <button type="button" onClick={onAddAccount} className="btn btn-ghost btn-sm btn-circle">
            <Plus className="w-5 h-5 text-primary" />
          </button>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid Accounts */}
      {accounts.length === 0 ? (
        <div className="text-center py-6 text-sm text-base-content opacity-60">
          No accounts found. Create one to get started!
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
          {accounts.map((acc) => {
            const isSelected = selectedAccountId === acc._id;
            return (
              <button
                key={acc._id}
                type="button"
                onClick={() => onSelect(acc)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                  isSelected 
                    ? 'bg-error/10 border-error text-error scale-95 shadow-sm' 
                    : 'bg-base-200 border-base-300 hover:bg-base-300 hover:border-base-content/10'
                }`}
              >
                <span className="truncate max-w-full text-center">{acc.name}</span>
                <span className="text-[10px] opacity-70 mt-1 uppercase">
                  {acc.currency} {acc.balance.toFixed(2)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
