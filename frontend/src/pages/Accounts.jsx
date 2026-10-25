import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAxiosSecure } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useAccountModal } from '../context/AccountModalContext';
import { BottomNav } from '../components/BottomNav';
import { CreditCard, Plus, Trash2, X, Wallet, DollarSign, Globe, Layers, Calendar, Check, AlertCircle, Banknote, Smartphone, Landmark, TrendingUp } from 'lucide-react';
import { getPreferredCurrencies } from '../utils/currencies';
import { getMergedAccounts, setAccountsCache, getAccountsCache, queueAccountOperation, generateUUID, subscribeToSync } from '../utils/syncManager';
import Swal from 'sweetalert2';

export default function Accounts() {
  const navigate = useNavigate();
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

  const [syncStatus, setSyncStatus] = useState('synced');
  const [syncQueueLength, setSyncQueueLength] = useState(0);

  useEffect(() => {
    return subscribeToSync((status, qLength) => {
      setSyncStatus(status);
      setSyncQueueLength(qLength);
      if (status === 'synced' && qLength === 0) {
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
      }
    });
  }, [queryClient]);

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
  }, [rawAccounts, syncQueueLength]);

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
    if (!navigator.onLine) {
      Swal.fire({
        title: 'Internet Required',
        text: 'Please connect to the internet to delete an account or financial data.',
        icon: 'warning',
        confirmButtonColor: '#ef4444',
        background: '#1e1e24',
        color: '#ffffff'
      });
      return;
    }

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
      const response = await axiosSecure.delete(`/api/accounts/${id}`);
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Group accounts by type for premium dashboard listing (Cash, Credit Cards, Cards, E-Wallets, Savings, Investments)
  const groupAccounts = () => {
    const groups = { Cash: [], 'Credit Cards': [], Cards: [], 'E-Wallets': [], Savings: [], Investments: [] };
    accounts.forEach((acc) => {
      if (acc.type === 'CASH') groups.Cash.push(acc);
      else if (acc.type === 'CREDIT_CARD') groups['Credit Cards'].push(acc);
      else if (acc.type === 'CARD') groups.Cards.push(acc);
      else if (acc.type === 'E-WALLET') groups['E-Wallets'].push(acc);
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
    <div className="min-h-screen bg-base-300 pb-32 text-base-content font-sans">
      {/* Top Net Worth Header */}
      <div className="bg-base-200 p-6 rounded-b-3xl shadow-lg border-b border-base-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold">Accounts</h1>
            <span className="badge bg-secondary-app/20 text-secondary-app border-secondary-app/30 gap-1 font-bold">LIVE</span>
          </div>
          <button
            onClick={() => document.getElementById('add_account_modal').showModal()}
            className="btn btn-sm bg-primary-app text-slate-950 hover:bg-cyan-400 border-none rounded-xl flex items-center gap-1 text-xs font-bold shadow-md shadow-primary-app/20"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        </div>
        <div className="flex justify-around text-center mt-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-60">Assets</div>
            <div className="text-lg font-bold text-primary-app">
              {user?.baseCurrency || 'MYR'} {calculateAssets().toFixed(2)}
            </div>
          </div>
          <div className="border-l border-base-content/10 h-8 self-center"></div>
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-60">Liabilities</div>
            <div className="text-lg font-bold text-danger-app">
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
            const GROUP_CONFIG = {
              Cash: { icon: Banknote, style: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
              'Credit Cards': { icon: CreditCard, style: 'text-secondary-app bg-secondary-app/10 border-secondary-app/30' },
              Cards: { icon: CreditCard, style: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
              'E-Wallets': { icon: Smartphone, style: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
              Savings: { icon: Landmark, style: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
              Investments: { icon: TrendingUp, style: 'text-purple-400 bg-purple-500/10 border-purple-500/30' }
            };
            const currentGroup = GROUP_CONFIG[groupName] || { icon: Layers, style: 'text-primary-app bg-primary-app/10 border-primary-app/30' };
            const GroupIcon = currentGroup.icon;

            return (
              <div key={groupName} className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-2 py-1 bg-base-200/60 rounded-2xl border border-base-content/10 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-xl border flex items-center justify-center ${currentGroup.style}`}>
                      <GroupIcon className="w-3.5 h-3.5" />
                    </div>
                    <h2 className="text-xs font-black uppercase tracking-wider text-base-content">
                      {groupName}
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-base-100 border border-base-content/10 text-base-content/60">
                    {grouped[groupName].length} {grouped[groupName].length > 1 ? 'accounts' : 'account'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {grouped[groupName].map((acc) => {
                    const isCC = acc.type === 'CREDIT_CARD';
                    const limit = acc.creditLimit || 0;
                    const available = isCC && limit ? Math.max(0, limit - acc.balance) : 0;
                    const utilPercent = isCC && limit ? Math.min(100, Math.round((acc.balance / limit) * 100)) : 0;

                    return (
                      <div 
                        key={acc._id} 
                        onClick={() => openAccountModal(acc)}
                        className={`p-4 rounded-3xl cursor-pointer transition-all active:scale-[0.98] shadow-lg border relative overflow-hidden ${
                          isCC 
                            ? 'bg-gradient-to-br from-base-200 to-base-300 border-secondary-app/30 hover:border-secondary-app' 
                            : 'bg-gradient-to-br from-base-200 to-base-300 border-primary-app/30 hover:border-primary-app'
                        }`}
                      >
                        {/* Card Top: Chip + Masked Number + Type Badge */}
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-5 rounded-md bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
                              <div className="w-3.5 h-2.5 border border-amber-400/30 rounded-sm"></div>
                            </div>
                            <span className="text-[10px] text-base-content/40 tracking-widest font-mono">
                              •••• {acc.name.slice(0, 4)}
                            </span>
                          </div>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            isCC 
                              ? 'bg-secondary-app/15 text-secondary-app border-secondary-app/30' 
                              : 'bg-primary-app/15 text-primary-app border-primary-app/30'
                          }`}>
                            {acc.type.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Card Middle: Account Name & Subtitle */}
                        <div className="mb-2">
                          <h3 className="font-extrabold text-sm text-base-content tracking-wide">{acc.name}</h3>
                          <span className="text-[10px] text-base-content/50 uppercase font-semibold">
                            {isCC ? 'Credit Account' : 'Available Balance'}
                          </span>
                        </div>

                        {/* Card Bottom: Hero Balance & CC Details */}
                        <div className="flex items-baseline justify-between pt-1">
                          <span className={`text-xl font-black ${isCC ? 'text-danger-app' : 'text-primary-app'}`}>
                            {acc.currency} {acc.balance.toFixed(2)}
                          </span>
                          {isCC && limit > 0 && (
                            <span className="text-[10px] text-base-content/60 font-semibold">
                              Limit: {acc.currency} {limit.toFixed(0)}
                            </span>
                          )}
                        </div>

                        {/* Credit Card Specific Progress & Limit Details */}
                        {isCC && limit > 0 && (
                          <div className="mt-3 space-y-1">
                            <div className="w-full bg-base-300/80 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  utilPercent > 70 ? 'bg-danger-app' : utilPercent > 30 ? 'bg-secondary-app' : 'bg-primary-app'
                                }`} 
                                style={{ width: `${utilPercent}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-base-content/50 font-semibold">
                              <span>{utilPercent}% Used</span>
                              <span>{acc.currency} {available.toFixed(2)} avail</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Add Transaction Action Button */}
      <button
        onClick={() => navigate('/transactions', { state: { openAddModal: true, returnTo: '/accounts' } })}
        className="w-14 h-14 rounded-full bg-primary-app text-slate-950 flex items-center justify-center fixed bottom-24 right-5 shadow-2xl shadow-cyan-500/40 z-40 active:scale-90 transition-all font-bold border border-cyan-300/30"
        title="Add Transaction"
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
                className="btn bg-primary-app text-slate-950 font-black border-none hover:bg-cyan-400 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl px-6 text-sm flex items-center gap-2 shadow-lg shadow-primary-app/25"
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
