import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAxiosSecure } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useAccountModal } from '../context/AccountModalContext';
import { BottomNav } from '../components/BottomNav';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Accounts() {
  const { openAccountModal } = useAccountModal();
  const queryClient = useQueryClient();
  const axiosSecure = useAxiosSecure();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [type, setType] = useState('CASH');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [statementDate, setStatementDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('MYR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: accounts = [], isLoading: fetching } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await axiosSecure.get('/api/accounts');
      return res.data.success ? res.data.data : [];
    }
  });

  const handleAddAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axiosSecure.post('/api/accounts', {
        name,
        type,
        balance: parseFloat(balance) || 0,
        creditLimit: type === 'CREDIT_CARD' ? (parseFloat(creditLimit) || 0) : 0,
        statementDate: type === 'CREDIT_CARD' && statementDate ? parseInt(statementDate, 10) : undefined,
        dueDate: type === 'CREDIT_CARD' && dueDate ? parseInt(dueDate, 10) : undefined,
        currency
      });
      if (response.data.success) {
        setName('');
        setBalance('');
        setCreditLimit('');
        setStatementDate('');
        setDueDate('');
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        document.getElementById('add_account_modal').close();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add account.');
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
      const response = await axiosSecure.delete(`/api/accounts/${id}`);
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      }
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
        className="btn btn-error btn-circle fixed bottom-20 right-6 shadow-xl z-40 text-white"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Account Modal */}
      <dialog
        id="add_account_modal"
        className="modal modal-bottom sm:modal-middle"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.currentTarget.close();
          }
        }}
      >
        <div className="modal-box bg-base-100 border border-base-200">
          <h3 className="font-bold text-lg mb-4 text-error">Add New Account</h3>
          
          {error && <div className="alert alert-error mb-4 text-sm">{error}</div>}

          <form onSubmit={handleAddAccount} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Account Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input input-bordered"
                placeholder="e.g. cash, Shoppe pay, BigPay"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Account Type</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="select select-bordered text-base-content"
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

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">{type === 'CREDIT_CARD' ? 'Outstanding Balance (Owed)' : 'Initial Balance'}</span>
              </label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="input input-bordered"
                placeholder="0.00"
              />
            </div>

            {type === 'CREDIT_CARD' && (
              <div className="bg-base-200 p-3 rounded-xl space-y-3 border border-base-content/10">
                <div className="text-xs font-bold text-error uppercase tracking-wider">Credit Card Options</div>
                <div className="form-control">
                  <label className="label py-0">
                    <span className="label-text-alt font-semibold">Credit Limit</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input input-sm input-bordered"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="e.g. 5000.00"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="form-control">
                    <label className="label py-0">
                      <span className="label-text-alt">Statement Day (1-31)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      className="input input-xs input-bordered"
                      value={statementDate}
                      onChange={(e) => setStatementDate(e.target.value)}
                      placeholder="e.g. 15"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-0">
                      <span className="label-text-alt">Due Day (1-31)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      className="input input-xs input-bordered"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      placeholder="e.g. 5"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Account Currency</span>
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="select select-bordered text-base-content"
              >
                <option className="bg-base-100 text-base-content" value="MYR">MYR (RM)</option>
                <option className="bg-base-100 text-base-content" value="USD">USD ($)</option>
                <option className="bg-base-100 text-base-content" value="EUR">EUR (€)</option>
                <option className="bg-base-100 text-base-content" value="SGD">SGD (S$)</option>
              </select>
            </div>

            <div className="modal-action flex justify-end gap-2">
              <button
                type="button"
                onClick={() => document.getElementById('add_account_modal').close()}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-error btn-sm text-white"
              >
                Save Account
              </button>
            </div>
          </form>
        </div>
      </dialog>

      <BottomNav />
    </div>
  );
}
