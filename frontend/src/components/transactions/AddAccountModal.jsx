import React, { useState } from 'react';
import { Plus, X, Wallet, CreditCard, DollarSign, Globe, Layers, Calendar, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ALL_CURRENCIES, getPreferredCurrencies } from '../../utils/currencies';

export default function AddAccountModal({
  isOpen,
  onClose,
  handleSaveCustomAccount
}) {
  const { user } = useAuth();
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
      <div className="bg-base-100/95 border border-base-content/15 shadow-2xl rounded-2xl p-6 max-w-md w-full relative text-base-content max-h-[90vh] overflow-y-auto animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-base-content/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-error/15 text-error flex items-center justify-center border border-error/20 shadow-inner">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-base-content leading-snug">Create New Account</h3>
              <p className="text-xs text-base-content/60">Add a custom account for tracking</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Name */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs font-semibold flex items-center gap-1.5 text-base-content/80">
                <Wallet className="w-3.5 h-3.5 text-error" />
                Account Name
              </span>
            </label>
            <input
              type="text"
              className="input input-bordered focus:input-error focus:outline-none focus:ring-2 focus:ring-error/20 rounded-xl bg-base-200/50 text-sm font-medium transition-all"
              value={newAccName}
              onChange={(e) => setNewAccName(e.target.value)}
              placeholder="e.g. My Cash, Maybank Credit Card..."
              required
              autoFocus
            />
          </div>

          {/* Account Type */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs font-semibold flex items-center gap-1.5 text-base-content/80">
                <Layers className="w-3.5 h-3.5 text-error" />
                Account Type
              </span>
            </label>
            <select
              value={newAccType}
              onChange={(e) => setNewAccType(e.target.value)}
              className="select select-bordered focus:select-error focus:outline-none focus:ring-2 focus:ring-error/20 rounded-xl bg-base-200/50 text-sm font-medium text-base-content transition-all"
            >
              <option className="bg-base-100 text-base-content" value="CASH">Cash</option>
              <option className="bg-base-100 text-base-content" value="CREDIT_CARD">Credit Card</option>
              <option className="bg-base-100 text-base-content" value="CARD">Debit / Payment Card</option>
              <option className="bg-base-100 text-base-content" value="E-WALLET">E-Wallet</option>
              <option className="bg-base-100 text-base-content" value="SAVINGS">Savings Account</option>
              <option className="bg-base-100 text-base-content" value="INVESTMENT">Investment Account</option>
              <option className="bg-base-100 text-base-content" value="CRYPTO">Crypto Wallet</option>
            </select>
          </div>

          {/* Balance */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs font-semibold flex items-center gap-1.5 text-base-content/80">
                {newAccType === 'CREDIT_CARD' ? (
                  <CreditCard className="w-3.5 h-3.5 text-error" />
                ) : (
                  <DollarSign className="w-3.5 h-3.5 text-error" />
                )}
                {newAccType === 'CREDIT_CARD' ? 'Outstanding Balance (Owed)' : 'Initial Balance'}
              </span>
            </label>
            <input
              type="number"
              step="0.01"
              className="input input-bordered focus:input-error focus:outline-none focus:ring-2 focus:ring-error/20 rounded-xl bg-base-200/50 text-sm font-medium transition-all"
              value={newAccBalance}
              onChange={(e) => setNewAccBalance(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {/* Credit Card Specific Options */}
          {newAccType === 'CREDIT_CARD' && (
            <div className="bg-error/5 border border-error/20 p-4 rounded-2xl space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-error uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-error" />
                <span>Credit Card Details</span>
              </div>
              <div className="form-control">
                <label className="label py-0.5">
                  <span className="label-text-alt font-semibold text-base-content/80">Total Credit Limit</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input input-sm input-bordered focus:input-error rounded-xl bg-base-100 text-xs font-medium"
                  value={newAccCreditLimit}
                  onChange={(e) => setNewAccCreditLimit(e.target.value)}
                  placeholder="e.g. 5000.00"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label py-0.5">
                    <span className="label-text-alt font-semibold text-base-content/80 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-error/80" /> Statement Day
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="input input-sm input-bordered focus:input-error rounded-xl bg-base-100 text-xs font-medium"
                    value={newAccStatementDate}
                    onChange={(e) => setNewAccStatementDate(e.target.value)}
                    placeholder="e.g. 15 (1-31)"
                  />
                </div>
                <div className="form-control">
                  <label className="label py-0.5">
                    <span className="label-text-alt font-semibold text-base-content/80 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-error/80" /> Due Day
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="input input-sm input-bordered focus:input-error rounded-xl bg-base-100 text-xs font-medium"
                    value={newAccDueDate}
                    onChange={(e) => setNewAccDueDate(e.target.value)}
                    placeholder="e.g. 5 (1-31)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Currency */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs font-semibold flex items-center gap-1.5 text-base-content/80">
                <Globe className="w-3.5 h-3.5 text-error" />
                Account Currency
              </span>
            </label>
            <select
              value={newAccCurrency}
              onChange={(e) => setNewAccCurrency(e.target.value)}
              className="select select-bordered focus:select-error focus:outline-none focus:ring-2 focus:ring-error/20 rounded-xl bg-base-200/50 text-sm font-medium text-base-content transition-all"
            >
              {getPreferredCurrencies(user, newAccCurrency).map((c) => (
                <option key={c.code} className="bg-base-100 text-base-content" value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-base-content/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost hover:bg-base-200 text-base-content/70 rounded-xl px-5 text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newAccName.trim()}
              className="btn btn-error text-white font-semibold shadow-lg shadow-error/25 hover:shadow-error/40 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl px-6 text-sm flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
