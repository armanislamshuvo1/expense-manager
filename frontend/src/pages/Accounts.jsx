import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAxiosSecure } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useAccountModal } from '../context/AccountModalContext';
import { BottomNav } from '../components/BottomNav';
import { CreditCard, Plus, Trash2, X, Wallet, DollarSign, Globe, Layers, Calendar, Check, AlertCircle } from 'lucide-react';
import { ALL_CURRENCIES, getPreferredCurrencies } from '../utils/currencies';
import { getMergedAccounts, setAccountsCache, getAccountsCache, queueAccountOperation, generateUUID } from '../utils/syncManager';
import Swal from 'sweetalert2';

export default function Accounts() {
  const queryClient = useQueryClient();
  const axiosSecure = useAxiosSecure();
  const { user } = useAuth();
  const { openAccountModal } = useAccountModal();

  const [name, setName] = useState('');
  const [type, setType] = useState('CASH');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [statementDate, setStatementDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('MYR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: rawAccounts = [], isLoading: fetching } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      try {
        const res = await axiosSecure.get('/api/accounts');
        if (res.data.success) {
          setAccountsCache(res.data.data);
          return res.data.data;
        }
      } catch (err) {
        console.warn('Using cached accounts offline');
      }
      return getAccountsCache();
    }
  });

  const accounts = useMemo(() => {
    return getMergedAccounts();
  }, [rawAccounts]);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const clientAccId = generateUUID('acc');
      queueAccountOperation('CREATE', clientAccId, null, {
        name,
        type,
        balance: parseFloat(balance) || 0,
        creditLimit: type === 'CREDIT_CARD' ? (parseFloat(creditLimit) || 0) : 0,
        statementDate: type === 'CREDIT_CARD' && statementDate ? parseInt(statementDate, 10) : undefined,
        dueDate: type === 'CREDIT_CARD' && dueDate ? parseInt(dueDate, 10) : undefined,
        currency
      });

      setName('');
      setBalance('');
      setCreditLimit('');
      setStatementDate('');
      setDueDate('');
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      document.getElementById('add_account_modal').close();
    } catch (err) {
      setError('Failed to add account.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Delete this account and all linked transactions?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      background: '#1e1e24',
      color: '#ffffff'
    });
    if (!result.isConfirmed) return;
    try {
      queueAccountOperation('DELETE', null, id, null);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (err) {
      console.error(err);
    }
  };

  // Group accounts by type for premium dashboard listing (Cash, Credit Cards, Cards, Savings, Investments)
  const groupAccounts = () => {
    const groups = { Cash: [], 'Credit Cards': [], Cards: [], Savings: [], Investments: [] };
    accounts.forEach((acc) => {
      if (acc.type === 'CASH') groups.Cash.push(acc);
      else if (acc.type === 'CREDIT_CARD') groups['Credit Cards'].push(acc);
      else if (acc.type === 'CARD') groups.Cards.push(acc);
      else if (acc.type === 'SAVINGS') groups.Savings.push(acc);
      else groups.Investments.push(acc);
    });
    return groups;
  };

  const grouped = groupAccounts();

  // Sum total assets (cash/savings/investments) & liabilities (credit card debt / negative balance)
  const calculateAssets = () => {
    return accounts.reduce((sum, acc) => {
      if (acc.type === 'CREDIT_CARD') return sum;
      return sum + (acc.balance > 0 ? acc.balance : 0);
    }, 0);
  };

  const calculateLiabilities = () => {
    return accounts.reduce((sum, acc) => {
      if (acc.type === 'CREDIT_CARD') return sum + acc.balance;
      return sum + (acc.balance < 0 ? Math.abs(acc.balance) : 0);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-base-300 pb-20 text-base-content font-sans">
      {/* Top Net Worth Header */}
      <div className="bg-base-200 p-6 rounded-b-3xl shadow-lg border-b border-base-200">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-extrabold">Accounts</h1>
          <span className="badge badge-error gap-1 font-bold">LIVE</span>
        </div>
        <div className="flex justify-around text-center mt-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-60">Assets</div>
            <div className="text-lg font-bold text-primary">
              {user?.baseCurrency || 'MYR'} {calculateAssets().toFixed(2)}
            </div>
          </div>
          <div className="border-l border-base-content/10 h-8 self-center"></div>
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-60">Liabilities</div>
            <div className="text-lg font-bold text-error">
              {user?.baseCurrency || 'MYR'} {calculateLiabilities().toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Accounts List Grouped */}
      <div className="p-4 space-y-4">
        {fetching ? (
          <>
            {[1, 2].map((n) => (
              <div key={n} className="card bg-base-100 shadow-md">
                <div className="card-body p-4 space-y-3">
                  <div className="h-4 w-20 skeleton-shimmer rounded"></div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2">
                      <div className="space-y-1">
                        <div className="h-4 w-32 skeleton-shimmer rounded"></div>
                        <div className="h-3 w-16 skeleton-shimmer rounded"></div>
                      </div>
                      <div className="h-4 w-24 skeleton-shimmer rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          Object.keys(grouped).map((groupName) => {
            if (grouped[groupName].length === 0) return null;
            return (
              <div key={groupName} className="card bg-base-100 shadow-md interactive-scale">
                <div className="card-body p-4">
                  <h2 className="text-xs font-bold uppercase opacity-60 mb-2">{groupName}</h2>
                  <div className="divide-y divide-base-200">
                    {grouped[groupName].map((acc) => {
                      const isCC = acc.type === 'CREDIT_CARD';
                      const limit = acc.creditLimit || 0;
                      const available = isCC && limit ? Math.max(0, limit - acc.balance) : 0;
                      const utilPercent = isCC && limit ? Math.min(100, Math.round((acc.balance / limit) * 100)) : 0;

                      return (
                        <div 
                          key={acc._id} 
                          onClick={() => openAccountModal(acc)}
                          className="py-3 px-2 rounded-xl hover:bg-base-200/50 cursor-pointer transition-colors space-y-2"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm hover:underline flex items-center gap-1.5">
                                {acc.name}
                                {isCC && <span className="badge badge-xs badge-outline badge-secondary">CC</span>}
                              </span>
                              <span className="text-[10px] opacity-50 uppercase">{acc.type.replace('_', ' ')}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className={`font-bold text-sm block ${isCC ? 'text-error' : ''}`}>
                                  {acc.currency} {acc.balance.toFixed(2)}
                                </span>
                                {isCC && (
                                  <span className="text-[10px] opacity-60 block">
                                    Owed / Bal.
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAccount(acc._id);
                                }}
                                className="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Credit Card Specific Progress & Limit Details */}
                          {isCC && limit > 0 && (
                            <div className="bg-base-200/80 p-2 rounded-xl space-y-1.5 border border-base-content/5">
                              <div className="flex justify-between items-center text-[10px] font-semibold">
                                <span className="text-base-content/70">
                                  Limit: {acc.currency} {limit.toFixed(2)}
                                </span>
                                <span className="text-success font-bold">
                                  Available: {acc.currency} {available.toFixed(2)}
                                </span>
                              </div>
                              <div className="w-full bg-base-300 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${
                                    utilPercent > 70 ? 'bg-error' : utilPercent > 30 ? 'bg-warning' : 'bg-success'
                                  }`} 
                                  style={{ width: `${utilPercent}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-[9px] opacity-60">
                                <span>Util: {utilPercent}%</span>
                                {(acc.statementDate || acc.dueDate) && (
                                  <span>
                                    {acc.statementDate ? `Stmt: Day ${acc.statementDate}` : ''} 
                                    {acc.dueDate ? ` | Due: Day ${acc.dueDate}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Add Account Action Button */}
      <button
        onClick={() => document.getElementById('add_account_modal').showModal()}
        className="btn btn-error btn-circle fixed bottom-28 right-6 shadow-xl z-40 text-white"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Account Modal */}
      <dialog
        id="add_account_modal"
        className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.currentTarget.close();
          }
        }}
      >
        <div className="modal-box bg-base-100/95 border border-base-content/15 shadow-2xl rounded-2xl p-6 sm:p-7 max-w-md w-full relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-base-content/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-error/15 text-error flex items-center justify-center border border-error/20 shadow-inner">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-base-content leading-snug">Add New Account</h3>
                <p className="text-xs text-base-content/60">Configure your new account details</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => document.getElementById('add_account_modal').close()}
              className="btn btn-sm btn-circle btn-ghost text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {error && (
            <div className="alert alert-error mb-4 text-xs py-2 px-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAddAccount} className="space-y-4">
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input input-bordered focus:input-error focus:outline-none focus:ring-2 focus:ring-error/20 rounded-xl bg-base-200/50 text-sm font-medium transition-all"
                placeholder="e.g. Cash, Maybank, ShopeePay"
                required
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
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="select select-bordered focus:select-error focus:outline-none focus:ring-2 focus:ring-error/20 rounded-xl bg-base-200/50 text-sm font-medium text-base-content transition-all"
              >
                <option className="bg-base-100 text-base-content" value="CASH">Cash</option>
                <option className="bg-base-100 text-base-content" value="CREDIT_CARD">Credit Card</option>
                <option className="bg-base-100 text-base-content" value="CARD">Debit / Payment Card</option>
                <option className="bg-base-100 text-base-content" value="SAVINGS">Savings Account</option>
                <option className="bg-base-100 text-base-content" value="INVESTMENT">Investment Account</option>
                <option className="bg-base-100 text-base-content" value="CRYPTO">Crypto Wallet</option>
                <option className="bg-base-100 text-base-content" value="E-WALLET">E-Wallet</option>
              </select>
            </div>

            {/* Balance */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-semibold flex items-center gap-1.5 text-base-content/80">
                  {type === 'CREDIT_CARD' ? (
                    <CreditCard className="w-3.5 h-3.5 text-error" />
                  ) : (
                    <DollarSign className="w-3.5 h-3.5 text-error" />
                  )}
                  {type === 'CREDIT_CARD' ? 'Outstanding Balance (Owed)' : 'Initial Balance'}
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="input input-bordered w-full focus:input-error focus:outline-none focus:ring-2 focus:ring-error/20 rounded-xl bg-base-200/50 text-sm font-medium transition-all"
                  placeholder="0.00"
                />
              </div>
              <span className="text-[10px] text-base-content/50 mt-1 px-1">
                {type === 'CREDIT_CARD'
                  ? 'Current total unpaid amount owed on this credit card'
                  : 'Starting balance available in this account'}
              </span>
            </div>

            {/* Credit Card Specific Options */}
            {type === 'CREDIT_CARD' && (
              <div className="bg-error/5 border border-error/20 p-4 rounded-2xl space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-error uppercase tracking-wider">
                  <CreditCard className="w-4 h-4 text-error" />
                  <span>Credit Card Details</span>
                </div>
                
                <div className="form-control">
                  <label className="label py-0.5">
                    <span className="label-text-alt font-semibold text-base-content/80">Credit Limit</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input input-sm input-bordered focus:input-error rounded-xl bg-base-100 text-xs font-medium"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="e.g. 5000.00"
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
                      value={statementDate}
                      onChange={(e) => setStatementDate(e.target.value)}
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
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
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
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="select select-bordered focus:select-error focus:outline-none focus:ring-2 focus:ring-error/20 rounded-xl bg-base-200/50 text-sm font-medium text-base-content transition-all"
              >
                {getPreferredCurrencies(user, currency).map((c) => (
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
                onClick={() => document.getElementById('add_account_modal').close()}
                className="btn btn-ghost hover:bg-base-200 text-base-content/70 rounded-xl px-5 text-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-error text-white font-semibold shadow-lg shadow-error/25 hover:shadow-error/40 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl px-6 text-sm flex items-center gap-2"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Account
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </dialog>

      <BottomNav />
    </div>
  );
}
