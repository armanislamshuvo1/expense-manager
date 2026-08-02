import React, { useState } from 'react';
import { Plus } from 'lucide-react';

export default function AddAccountModal({
  isOpen,
  onClose,
  handleSaveCustomAccount
}) {
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('SAVINGS');
  const [newAccBalance, setNewAccBalance] = useState('0');
  const [newAccCreditLimit, setNewAccCreditLimit] = useState('');
  const [newAccStatementDate, setNewAccStatementDate] = useState('');
  const [newAccDueDate, setNewAccDueDate] = useState('');
  const [newAccCurrency, setNewAccCurrency] = useState('MYR');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newAccName.trim()) return;
    try {
      await handleSaveCustomAccount({
        name: newAccName.trim(),
        type: newAccType,
        balance: parseFloat(newAccBalance) || 0,
        creditLimit: newAccType === 'CREDIT_CARD' ? (parseFloat(newAccCreditLimit) || 0) : 0,
        statementDate: newAccType === 'CREDIT_CARD' && newAccStatementDate ? parseInt(newAccStatementDate, 10) : undefined,
        dueDate: newAccType === 'CREDIT_CARD' && newAccDueDate ? parseInt(newAccDueDate, 10) : undefined,
        currency: newAccCurrency
      });
      onClose();
      setNewAccName('');
      setNewAccBalance('0');
      setNewAccCreditLimit('');
      setNewAccStatementDate('');
      setNewAccDueDate('');
      setNewAccType('SAVINGS');
      setNewAccCurrency('MYR');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="bg-base-200 border border-base-content/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scaleIn text-base-content max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-bold text-base-content mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" /> Create New Account
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs">Account Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered input-sm w-full text-xs font-semibold"
              value={newAccName}
              onChange={(e) => setNewAccName(e.target.value)}
              placeholder="e.g. My Cash, Maybank Visa Credit Card..."
              required
              autoFocus
            />
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs">Account Type</span>
            </label>
            <select
              value={newAccType}
              onChange={(e) => setNewAccType(e.target.value)}
              className="select select-bordered select-sm w-full text-xs font-semibold text-base-content"
            >
              <option className="bg-base-100 text-base-content" value="CASH">Cash</option>
              <option className="bg-base-100 text-base-content" value="CREDIT_CARD">Credit Card</option>
              <option className="bg-base-100 text-base-content" value="CARD">Debit / Payment Card</option>
              <option className="bg-base-100 text-base-content" value="SAVINGS">Savings Account</option>
              <option className="bg-base-100 text-base-content" value="INVESTMENT">Investment Account</option>
              <option className="bg-base-100 text-base-content" value="CRYPTO">Crypto Wallet</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs">{newAccType === 'CREDIT_CARD' ? 'Outstanding Balance (Owed)' : 'Initial Balance'}</span>
            </label>
            <input
              type="number"
              step="0.01"
              className="input input-bordered input-sm w-full text-xs font-semibold"
              value={newAccBalance}
              onChange={(e) => setNewAccBalance(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {newAccType === 'CREDIT_CARD' && (
            <div className="bg-base-300 p-3 rounded-xl space-y-3 border border-base-content/10">
              <div className="text-[11px] font-bold text-primary uppercase tracking-wider">Credit Card Details</div>
              <div className="form-control">
                <label className="label py-0 mb-1">
                  <span className="label-text-alt text-xs font-semibold">Total Credit Limit</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input input-bordered input-xs w-full text-xs font-semibold"
                  value={newAccCreditLimit}
                  onChange={(e) => setNewAccCreditLimit(e.target.value)}
                  placeholder="e.g. 5000.00"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="form-control">
                  <label className="label py-0 mb-1">
                    <span className="label-text-alt text-[10px]">Statement Day (1-31)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="input input-bordered input-xs w-full text-xs"
                    value={newAccStatementDate}
                    onChange={(e) => setNewAccStatementDate(e.target.value)}
                    placeholder="e.g. 15"
                  />
                </div>
                <div className="form-control">
                  <label className="label py-0 mb-1">
                    <span className="label-text-alt text-[10px]">Due Day (1-31)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="input input-bordered input-xs w-full text-xs"
                    value={newAccDueDate}
                    onChange={(e) => setNewAccDueDate(e.target.value)}
                    placeholder="e.g. 5"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs">Account Currency</span>
            </label>
            <select
              value={newAccCurrency}
              onChange={(e) => setNewAccCurrency(e.target.value)}
              className="select select-bordered select-sm w-full text-xs font-semibold text-base-content"
            >
              <option className="bg-base-100 text-base-content" value="MYR">MYR (RM)</option>
              <option className="bg-base-100 text-base-content" value="USD">USD ($)</option>
              <option className="bg-base-100 text-base-content" value="EUR">EUR (€)</option>
              <option className="bg-base-100 text-base-content" value="SGD">SGD (S$)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm text-xs font-semibold px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newAccName.trim()}
              className="btn btn-primary btn-sm text-xs font-bold text-white px-4 shadow-md hover:shadow-lg transition-all"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
