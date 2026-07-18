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
        currency: newAccCurrency
      });
      onClose();
      setNewAccName('');
      setNewAccBalance('0');
      setNewAccType('SAVINGS');
      setNewAccCurrency('MYR');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="bg-base-200 border border-base-content/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scaleIn text-base-content">
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
              placeholder="e.g. My Cash, Maybank, Visa Card..."
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
              <option className="bg-base-100 text-base-content" value="CARD">Credit / Debit Card</option>
              <option className="bg-base-100 text-base-content" value="SAVINGS">Savings Account</option>
              <option className="bg-base-100 text-base-content" value="INVESTMENT">Investment Account</option>
              <option className="bg-base-100 text-base-content" value="CRYPTO">Crypto Wallet</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs">Initial Balance</span>
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
