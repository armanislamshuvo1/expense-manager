import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  X, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowRightLeft, 
  Wallet, 
  Search, 
  Filter, 
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAccountModal } from '../context/AccountModalContext';
import { useAuth } from '../context/AuthContext';
import { useAxiosSecure } from '../hooks/useApi';
import { getMergedTransactions, setCache, getAccountsCache, setAccountsCache, subscribeToSync } from '../utils/syncManager';

export default function AccountTransactionsModal() {
  const navigate = useNavigate();
  const { selectedAccount, isOpen, closeAccountModal } = useAccountModal();
  const { user } = useAuth();
  const axiosSecure = useAxiosSecure();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'
  const [syncQueueLen, setSyncQueueLen] = useState(0);

  // Subscribe to sync manager queue changes to re-evaluate merged transactions reactively
  useEffect(() => {
    const unsubscribe = subscribeToSync((status, qLength) => {
      setSyncQueueLen(qLength);
    });
    return () => unsubscribe();
  }, []);

  // Listen for ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeAccountModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeAccountModal]);

  // Lock body scroll when modal is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Fetch accounts to resolve full account details if only ID was passed
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      try {
        const res = await axiosSecure.get('/api/accounts');
        if (res.data?.success) {
          setAccountsCache(res.data.data);
          return res.data.data;
        }
      } catch (err) {
        console.warn('Failed to fetch accounts online, using cache');
      }
      return getAccountsCache();
    },
    enabled: isOpen
  });

  // Fetch transactions from API to populate sync cache
  const { data: rawTransactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      try {
        const res = await axiosSecure.get('/api/transactions');
        if (res.data?.success) {
          setCache(res.data.data);
          return res.data.data;
        }
      } catch (err) {
        console.warn('Failed to fetch transactions online, using cache');
      }
      return [];
    },
    enabled: isOpen
  });

  // Target account resolution
  const account = useMemo(() => {
    if (!selectedAccount) return null;
    const found = accounts.find(a => String(a._id) === String(selectedAccount._id));
    return found || selectedAccount;
  }, [selectedAccount, accounts]);

  // Merged transactions (includes offline & pending queue)
  const mergedTransactions = useMemo(() => {
    return getMergedTransactions();
  }, [rawTransactions, syncQueueLen]);

  // Filter transactions for this specific account
  const accountTransactions = useMemo(() => {
    if (!account?._id) return [];
    const accIdStr = String(account._id);

    return mergedTransactions.filter(tx => {
      const srcId = String(tx.accountId?._id || tx.accountId || '');
      const destId = String(tx.toAccountId?._id || tx.toAccountId || '');
      return srcId === accIdStr || destId === accIdStr;
    });
  }, [mergedTransactions, account]);

  // Computed summary statistics for this account
  const stats = useMemo(() => {
    if (!account?._id) return { inflow: 0, outflow: 0, net: 0, count: 0 };
    const accIdStr = String(account._id);

    let inflow = 0;
    let outflow = 0;

    accountTransactions.forEach(tx => {
      const srcId = String(tx.accountId?._id || tx.accountId || '');
      const destId = String(tx.toAccountId?._id || tx.toAccountId || '');
      const amount = Number(tx.amount) || 0;

      if (tx.type === 'INCOME') {
        inflow += amount;
      } else if (tx.type === 'EXPENSE') {
        outflow += amount;
      } else if (tx.type === 'TRANSFER') {
        if (destId === accIdStr) {
          inflow += amount;
        } else if (srcId === accIdStr) {
          outflow += amount;
        }
      }
    });

    return {
      inflow,
      outflow,
      net: inflow - outflow,
      count: accountTransactions.length
    };
  }, [accountTransactions, account]);

  // Apply search & type filters inside modal
  const filteredTransactions = useMemo(() => {
    return accountTransactions.filter(tx => {
      // Type filter
      if (filterType !== 'ALL' && tx.type !== filterType) {
        return false;
      }
      // Search term filter (note, category name, account name, amount)
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const noteMatch = tx.note?.toLowerCase().includes(term);
        const categoryMatch = tx.categoryId?.name?.toLowerCase().includes(term);
        const srcAccMatch = tx.accountId?.name?.toLowerCase().includes(term);
        const destAccMatch = tx.toAccountId?.name?.toLowerCase().includes(term);
        const amountMatch = String(tx.amount).includes(term);

        return noteMatch || categoryMatch || srcAccMatch || destAccMatch || amountMatch;
      }
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [accountTransactions, filterType, searchTerm]);

  // Group transactions by date string
  const groupedTransactions = useMemo(() => {
    const groups = {};
    filteredTransactions.forEach(tx => {
      const dateKey = new Date(tx.date).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    });
    return groups;
  }, [filteredTransactions]);

  if (!isOpen || !account) return null;

  const baseCurrency = user?.baseCurrency || account.currency || 'USD';

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-0 md:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeAccountModal();
        }
      }}
    >
      <div className="w-full h-full md:h-[85vh] md:max-w-3xl bg-base-100 md:rounded-3xl shadow-2xl border border-base-content/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="p-4 md:p-6 bg-base-200/60 border-b border-base-content/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center text-primary-content font-black text-lg shadow-lg shadow-primary/20 shrink-0">
              {account.name ? account.name.charAt(0).toUpperCase() : <Wallet className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-extrabold text-base-content tracking-tight">
                  {account.name || 'Account Details'}
                </h2>
                <span className="badge badge-sm badge-neutral font-semibold uppercase tracking-wider text-[10px]">
                  {account.type ? account.type.replace('_', ' ') : 'ACCOUNT'}
                </span>
              </div>
              <p className="text-xs text-base-content/60 font-medium mt-0.5">
                {account.type === 'CREDIT_CARD' ? 'Outstanding Balance (Owed): ' : 'Current Balance: '}
                <span className={`font-bold ${account.type === 'CREDIT_CARD' ? 'text-error' : 'text-base-content'}`}>
                  {account.currency || baseCurrency} {Number(account.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </p>
              {account.type === 'CREDIT_CARD' && account.creditLimit > 0 && (
                <div className="mt-2 text-xs bg-base-200/80 p-2 rounded-xl border border-base-content/10 max-w-sm space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-semibold">
                    <span className="text-base-content/70">Limit: {account.currency || baseCurrency} {Number(account.creditLimit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-success font-bold">Avail: {account.currency || baseCurrency} {Number(Math.max(0, account.creditLimit - account.balance)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full bg-base-300 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        (account.balance / account.creditLimit) > 0.7 ? 'bg-error' : (account.balance / account.creditLimit) > 0.3 ? 'bg-warning' : 'bg-success'
                      }`}
                      style={{ width: `${Math.min(100, Math.round((account.balance / account.creditLimit) * 100))}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={closeAccountModal}
            className="btn btn-circle btn-ghost btn-sm text-base-content/70 hover:text-base-content hover:bg-base-300 transition-all"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Overview Stats Header */}
        <div className="p-4 bg-base-200/30 border-b border-base-content/5 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-base-100 p-3 rounded-2xl border border-base-content/5 shadow-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-success">
              <TrendingUp className="w-3.5 h-3.5" /> Total Inflow
            </div>
            <div className="text-sm md:text-base font-black text-base-content mt-1">
              +{account.currency || baseCurrency} {stats.inflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-base-100 p-3 rounded-2xl border border-base-content/5 shadow-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-error">
              <TrendingDown className="w-3.5 h-3.5" /> Total Outflow
            </div>
            <div className="text-sm md:text-base font-black text-base-content mt-1">
              -{account.currency || baseCurrency} {stats.outflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-base-100 p-3 rounded-2xl border border-base-content/5 shadow-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-info">
              <Activity className="w-3.5 h-3.5" /> Net Flow
            </div>
            <div className={`text-sm md:text-base font-black mt-1 ${stats.net >= 0 ? 'text-success' : 'text-error'}`}>
              {stats.net >= 0 ? '+' : ''}{account.currency || baseCurrency} {stats.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-base-100 p-3 rounded-2xl border border-base-content/5 shadow-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-base-content/60">
              <Calendar className="w-3.5 h-3.5" /> Transactions
            </div>
            <div className="text-sm md:text-base font-black text-base-content mt-1">
              {stats.count} total
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="p-3 md:p-4 bg-base-100 border-b border-base-content/5 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-sm w-full pl-9 bg-base-200/50 border-base-content/10 focus:border-primary rounded-xl text-xs"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
              >
                ✕
              </button>
            )}
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 bg-base-200/60 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            {['ALL', 'EXPENSE', 'INCOME', 'TRANSFER'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                  filterType === type 
                    ? 'bg-base-100 text-primary shadow-xs' 
                    : 'text-base-content/60 hover:text-base-content'
                }`}
              >
                {type === 'ALL' ? 'All' : type === 'EXPENSE' ? 'Expenses' : type === 'INCOME' ? 'Income' : 'Transfers'}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-16 bg-base-200/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : Object.keys(groupedTransactions).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center text-base-content/30 mb-3">
                <Wallet className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-base-content/70">No Transactions Found</h3>
              <p className="text-xs text-base-content/40 mt-1 max-w-xs">
                {searchTerm || filterType !== 'ALL' 
                  ? 'No transactions match your search filter for this account.' 
                  : 'There are no transactions recorded for this account yet.'}
              </p>
            </div>
          ) : (
            Object.entries(groupedTransactions).map(([dateStr, txs]) => (
              <div key={dateStr} className="space-y-2">
                <div className="text-[11px] font-bold text-base-content/50 uppercase tracking-wider px-1">
                  {dateStr}
                </div>
                <div className="bg-base-100 rounded-2xl border border-base-content/5 shadow-xs divide-y divide-base-content/5 overflow-hidden">
                  {txs.map(tx => {
                    const accIdStr = String(account._id);
                    const srcId = String(tx.accountId?._id || tx.accountId || '');
                    const destId = String(tx.toAccountId?._id || tx.toAccountId || '');
                    const txTime = new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    // Determine directional role for this account
                    let isIncoming = false;
                    let displayLabel = '';
                    let subText = '';

                    if (tx.type === 'INCOME') {
                      isIncoming = true;
                      displayLabel = tx.categoryId?.name || 'Income';
                      subText = tx.note || 'Direct Deposit';
                    } else if (tx.type === 'EXPENSE') {
                      isIncoming = false;
                      displayLabel = tx.categoryId?.name || 'Expense';
                      subText = tx.note || 'Direct Expense';
                    } else if (tx.type === 'TRANSFER') {
                      if (destId === accIdStr) {
                        isIncoming = true;
                        displayLabel = 'Transfer Received';
                        subText = `From: ${tx.accountId?.name || 'Other Account'}`;
                      } else {
                        isIncoming = false;
                        displayLabel = 'Transfer Sent';
                        subText = `To: ${tx.toAccountId?.name || 'Other Account'}`;
                      }
                    }

                    return (
                      <div 
                        key={tx._id || tx.clientTxId} 
                        onClick={() => {
                          closeAccountModal();
                          navigate('/transactions', {
                            state: {
                              editTx: tx,
                              editTxId: tx._id,
                              returnTo: window.location.pathname
                            }
                          });
                        }}
                        className="p-3.5 flex items-center justify-between hover:bg-base-200/60 cursor-pointer transition-colors group"
                        title="Click to edit transaction"
                      >
                        <div className="flex items-center gap-3.5">
                          {/* Transaction Icon Badge */}
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            tx.type === 'TRANSFER'
                              ? 'bg-info/10 text-info'
                              : isIncoming
                                ? 'bg-success/10 text-success'
                                : 'bg-error/10 text-error'
                          }`}>
                            {tx.type === 'TRANSFER' ? (
                              <ArrowRightLeft className="w-5 h-5" />
                            ) : isIncoming ? (
                              <ArrowDownLeft className="w-5 h-5" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5" />
                            )}
                          </div>

                          {/* Info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-base-content">
                                {displayLabel}
                              </span>
                              {tx.isPending && (
                                <span className="badge badge-warning badge-xs text-[9px] gap-1">
                                  Offline
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-base-content/60 mt-0.5">
                              <span>{subText}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1 opacity-75">
                                <Clock className="w-3 h-3" />
                                {txTime}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right">
                          <div className={`font-black text-sm md:text-base ${
                            isIncoming ? 'text-success' : 'text-error'
                          }`}>
                            {isIncoming ? '+' : '-'}{tx.currency || baseCurrency} {Number(tx.amount).toFixed(2)}
                          </div>
                          {tx.note && (tx.type === 'INCOME' || tx.type === 'EXPENSE') && (
                            <div className="text-[10px] text-base-content/40 max-w-[140px] truncate">
                              {tx.note}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-base-200/40 border-t border-base-content/10 flex justify-between items-center shrink-0 text-xs text-base-content/60">
          <span>Showing {filteredTransactions.length} of {accountTransactions.length} transactions</span>
          <button
            onClick={closeAccountModal}
            className="btn btn-sm btn-ghost hover:bg-base-300 rounded-xl"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
