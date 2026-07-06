import React, { useEffect, useState } from 'react';
import { useAxiosSecure } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { CustomKeypad } from '../components/CustomKeypad';
import { CategorySelector } from '../components/CategorySelector';
import { AccountSelector } from '../components/AccountSelector';
import { Calendar, Tag, CreditCard, FileText, Bookmark, CalendarRange, Plus } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  // Transaction form states
  const [type, setType] = useState('EXPENSE'); // INCOME, EXPENSE, TRANSFER
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('MYR');
  const [accountId, setAccountId] = useState('');
  const [accountName, setAccountName] = useState('Select Account');
  const [toAccountId, setToAccountId] = useState('');
  const [toAccountName, setToAccountName] = useState('Select Account');
  const [selectingAccountType, setSelectingAccountType] = useState('source'); // 'source' | 'destination'
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('Select Category');
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');
  const [shouldConvert, setShouldConvert] = useState(true);
  const [exchangeRate, setExchangeRate] = useState('1.0');

  // Modal display toggles
  const [showKeypad, setShowKeypad] = useState(false);
  const [showAccountSheet, setShowAccountSheet] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit Mode states
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState('');

  const axiosSecure = useAxiosSecure();
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      const [txRes, accRes, catRes] = await Promise.all([
        axiosSecure.get('/api/transactions'),
        axiosSecure.get('/api/accounts'),
        axiosSecure.get('/api/categories'),
      ]);
      if (txRes.data.success) setTransactions(txRes.data.data);
      if (accRes.data.success) setAccounts(accRes.data.data);
      if (catRes.data.success) setCategories(catRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setEditMode(false);
    setEditingId('');
    setType('EXPENSE');
    setAmount('');
    setCurrency(user?.baseCurrency || 'MYR');
    setAccountId('');
    setAccountName('Select Account');
    setToAccountId('');
    setToAccountName('Select Account');
    setCategoryId('');
    setCategoryName('Select Category');
    setNote('');
    setDescription('');
    setShouldConvert(true);
    setExchangeRate('1.0');
    setError('');
    document.getElementById('add_transaction_modal').showModal();
  };

  const handleOpenEditModal = (tx) => {
    setEditMode(true);
    setEditingId(tx._id);
    setType(tx.type || 'EXPENSE');
    setAmount(tx.amount.toString());
    setCurrency(tx.currency || 'MYR');
    setAccountId(tx.accountId?._id || '');
    setAccountName(tx.accountId?.name || 'Select Account');
    setToAccountId(tx.toAccountId?._id || '');
    setToAccountName(tx.toAccountId?.name || 'Select Account');
    setCategoryId(tx.categoryId?._id || '');
    setCategoryName(tx.categoryId?.name || 'Select Category');
    setNote(tx.note || '');
    setDescription(tx.description || '');
    setShouldConvert(tx.shouldConvert !== undefined ? tx.shouldConvert : true);
    setExchangeRate(tx.exchangeRate?.toString() || '1.0');
    setError('');
    document.getElementById('add_transaction_modal').showModal();
  };

  const handleSaveTransaction = async (e) => {
    if (e) e.preventDefault();
    if (type === 'TRANSFER') {
      if (!amount || !accountId || !toAccountId) {
        setError('Please fill in amount, source, and destination accounts.');
        return;
      }
      if (accountId === toAccountId) {
        setError('Source and destination accounts must be different.');
        return;
      }
    } else {
      if (!amount || !accountId || !categoryId) {
        setError('Please fill in amount, account, and category.');
        return;
      }
    }
    setLoading(true);
    setError('');

    try {
      const txData = {
        accountId,
        toAccountId: type === 'TRANSFER' ? toAccountId : undefined,
        categoryId: type !== 'TRANSFER' ? categoryId : undefined,
        type,
        amount: Number(amount),
        currency,
        shouldConvert,
        exchangeRate: Number(exchangeRate) || 1.0,
        note,
        description
      };
      if (editMode) {
        const originalTx = transactions.find(t => t._id === editingId);
        txData.date = originalTx ? originalTx.date : new Date();
      } else {
        txData.date = new Date();
      }

      const response = editMode
        ? await axiosSecure.put(`/api/transactions/${editingId}`, txData)
        : await axiosSecure.post('/api/transactions', txData);

      if (response.data.success) {
        setAmount('');
        setAccountId('');
        setAccountName('Select Account');
        setToAccountId('');
        setToAccountName('Select Account');
        setCategoryId('');
        setCategoryName('Select Category');
        setNote('');
        setDescription('');
        setEditMode(false);
        setEditingId('');
        setShowKeypad(false);
        fetchData();
        document.getElementById('add_transaction_modal').close();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save transaction.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (catName, emoji) => {
    try {
      const response = await axiosSecure.post('/api/categories', {
        name: catName,
        emoji: emoji || '',
        type: type === 'INCOME' ? 'INCOME' : 'EXPENSE'
      });
      if (response.data.success) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTransaction = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Delete this transaction?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      background: '#1e1e24',
      color: '#ffffff'
    });
    if (!result.isConfirmed) return false;
    try {
      const response = await axiosSecure.delete(`/api/transactions/${id}`);
      if (response.data.success) {
        fetchData();
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const totalIncome = transactions
    .filter(tx => tx.type === 'INCOME')
    .reduce((sum, tx) => sum + (tx.convertedAmount || tx.amount), 0);

  const totalExpenses = transactions
    .filter(tx => tx.type === 'EXPENSE')
    .reduce((sum, tx) => sum + (tx.convertedAmount || tx.amount), 0);

  const total = totalIncome - totalExpenses;

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      Swal.fire({
        title: 'Install App',
        text: 'To install this app on your device, click the install icon in your browser\'s address bar or select "Add to Home Screen" from the browser menu.',
        icon: 'info',
        confirmButtonColor: '#f05454',
        background: '#1e1e24',
        color: '#ffffff'
      });
    }
  };

  return (
    <div className="min-h-screen bg-base-300 pb-24 text-base-content font-sans">
      {/* Date / Month Header Row */}
      <div className="bg-base-200 p-4 flex justify-between items-center border-b border-base-200">
        <h1 className="text-md font-bold">Jul 2026</h1>
        <div className="flex gap-2">
          <button
            onClick={handleInstallApp}
            className="btn btn-xs btn-outline"
          >
            Install App
          </button>
        </div>
      </div>

      {/* Ledger list of Daily Transactions */}
      <div className="p-4 space-y-4">
        {/* Monthly Summary Bar */}
        <div className="grid grid-cols-3 text-center bg-base-100 p-3 rounded-xl shadow-md border border-base-200">
          <div className="flex flex-col items-center justify-center border-r border-base-200">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Income</span>
            <span className="text-sm font-bold text-primary mt-1">
              {totalIncome.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center border-r border-base-200">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Expenses</span>
            <span className="text-sm font-bold text-error mt-1">
              {totalExpenses.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Total</span>
            <span className={`text-sm font-bold mt-1 ${total >= 0 ? 'text-base-content' : 'text-base-content opacity-90'}`}>
              {total >= 0 ? '' : '-'}{Math.abs(total).toFixed(2)}
            </span>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-10 opacity-60 text-sm">
            No transactions logged this month.
          </div>
        ) : (
          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-4">
              <div className="divide-y divide-base-200">
                {transactions.map((tx) => (
                  <div key={tx._id} className="flex justify-between items-center py-2 px-2 hover:bg-base-200/40 rounded-xl transition-colors">
                    <div 
                      onClick={() => handleOpenEditModal(tx)}
                      className="flex-1 flex justify-between items-center cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {tx.type === 'TRANSFER' ? '🔄' : (tx.categoryId?.emoji || '🏷️')}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">
                            {tx.type === 'TRANSFER' ? 'Transfer' : (tx.categoryId?.name || 'Uncategorized')}
                          </span>
                          <span className="text-[10px] opacity-50">
                            {tx.type === 'TRANSFER' 
                              ? `${tx.accountId?.name} ➔ ${tx.toAccountId?.name || '?'}` 
                              : tx.accountId?.name
                            }
                          </span>
                        </div>
                      </div>
                      <div className="text-right mr-3">
                        <div className={`font-bold text-sm ${
                          tx.type === 'INCOME' ? 'text-primary' : tx.type === 'EXPENSE' ? 'text-error' : 'text-warning'
                        }`}>
                          {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : '⇄'} {tx.currency} {tx.amount.toFixed(2)}
                        </div>
                        {tx.currency !== user?.baseCurrency && (
                          <div className="text-[9px] opacity-50">
                            Base: {user?.baseCurrency} {tx.convertedAmount.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Add Action Button */}
      <button
        onClick={handleOpenAddModal}
        className="btn btn-error btn-circle fixed bottom-20 right-6 shadow-xl z-40 text-white"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Transaction Entry Modal (daisyUI Bottom Sheet layout) */}
      <dialog id="add_transaction_modal" className="modal modal-bottom sm:modal-middle">
        <div className={`modal-box bg-base-300 border border-base-content/10 p-0 relative overflow-hidden text-base-content rounded-2xl shadow-2xl transition-all duration-300 ${
          showKeypad || showAccountSheet || showCategorySheet ? 'min-h-[540px]' : 'min-h-[350px]'
        }`}>
          {/* Top Tabs */}
          <div className="grid grid-cols-3 text-center border-b border-base-content/10">
            {['INCOME', 'EXPENSE', 'TRANSFER'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-3 text-xs font-bold tracking-wider transition-colors ${
                  type === t 
                    ? 'border-b-2 border-error text-error bg-base-200/50' 
                    : 'text-base-content/60 hover:text-base-content'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-4">
            {error && <div className="alert alert-error text-xs p-2 text-white bg-error border-none rounded-xl">{error}</div>}

            {/* Amount Field (Triggers Keypad Drawer) */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs text-base-content/60">Amount</span>
              </label>
              <div 
                onClick={() => {
                  setShowKeypad(true);
                  setShowAccountSheet(false);
                  setShowCategorySheet(false);
                }}
                className="input input-bordered bg-base-200 border-base-content/20 hover:border-base-content/40 flex items-center justify-between cursor-pointer h-12 rounded-xl transition-all"
              >
                <span className="font-bold text-lg text-error">
                  {currency} {amount || '0.00'}
                </span>
                <span className="text-xs text-base-content/50">Tap to Input</span>
              </div>
            </div>

            {/* Conversion Details (if current currency is different from user main baseCurrency) */}
            {currency !== user?.baseCurrency && (
              <div className="bg-base-200 p-3 rounded-xl space-y-3 border border-base-content/10">
                <div className="flex justify-between items-center text-xs text-base-content/80">
                  <span>Target Base Conversion: {user?.baseCurrency}</span>
                  <input
                    type="checkbox"
                    checked={shouldConvert}
                    onChange={(e) => setShouldConvert(e.target.checked)}
                    className="checkbox checkbox-xs checkbox-error"
                  />
                </div>
                {shouldConvert && (
                  <div className="form-control">
                    <label className="label py-0">
                      <span className="label-text-alt text-base-content/50">Manual Exchange Rate (1 {currency} = ? {user?.baseCurrency})</span>
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      className="input input-xs input-bordered bg-base-300 border-base-content/20 text-base-content w-full mt-1"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Account & Category Selection Fields */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectingAccountType('source');
                  setShowAccountSheet(true);
                  setShowKeypad(false);
                  setShowCategorySheet(false);
                }}
                className="btn bg-base-200 hover:bg-base-100 text-base-content border border-base-content/20 justify-between font-semibold text-xs uppercase rounded-xl h-11 transition-all"
              >
                <CreditCard className="w-4 h-4 text-base-content/60" />
                <span className="truncate">{type === 'TRANSFER' ? `From: ${accountName}` : accountName}</span>
              </button>

              {type === 'TRANSFER' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectingAccountType('destination');
                    setShowAccountSheet(true);
                    setShowKeypad(false);
                    setShowCategorySheet(false);
                  }}
                  className="btn bg-base-200 hover:bg-base-100 text-base-content border border-base-content/20 justify-between font-semibold text-xs uppercase rounded-xl h-11 transition-all"
                >
                  <CreditCard className="w-4 h-4 text-base-content/60" />
                  <span className="truncate">{`To: ${toAccountName}`}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowCategorySheet(true);
                    setShowKeypad(false);
                    setShowAccountSheet(false);
                  }}
                  className="btn bg-base-200 hover:bg-base-100 text-base-content border border-base-content/20 justify-between font-semibold text-xs uppercase rounded-xl h-11 transition-all"
                >
                  <Tag className="w-4 h-4 text-base-content/60" />
                  <span className="truncate">{categoryName}</span>
                </button>
              )}
            </div>

            {/* Optional Note */}
            <div className="form-control">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add notes..."
                className="input input-sm input-bordered bg-base-200 border-base-content/20 text-base-content rounded-xl h-10 px-3 w-full"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex border-t border-base-content/10">
            {editMode && (
              <button
                type="button"
                onClick={async () => {
                  const deleted = await handleDeleteTransaction(editingId);
                  if (deleted) {
                    document.getElementById('add_transaction_modal').close();
                  }
                }}
                disabled={loading}
                className="btn btn-ghost text-error flex-1 rounded-none py-4 h-auto hover:bg-error hover:text-white font-bold border-r border-base-content/10"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={() => document.getElementById('add_transaction_modal').close()}
              className="btn btn-ghost flex-1 rounded-none py-4 h-auto text-base-content/60 hover:text-base-content border-r border-base-content/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTransaction}
              disabled={loading}
              className="btn bg-error hover:bg-error/80 border-none flex-1 rounded-none py-4 h-auto text-white font-bold"
            >
              {editMode ? 'Save Changes' : 'Save'}
            </button>
          </div>

          {/* Sub Keypad / Drawers Inside Modal Box */}
          {showKeypad && (
            <div className="absolute bottom-0 left-0 right-0 z-50">
              <CustomKeypad
                value={amount}
                onChange={(val) => setAmount(val)}
                onDone={() => setShowKeypad(false)}
                preferredCurrencies={user?.preferredCurrencies}
                activeCurrency={currency}
                onCurrencyChange={(curr) => setCurrency(curr)}
              />
            </div>
          )}

          {showAccountSheet && (
            <div className="absolute bottom-0 left-0 right-0 z-50">
              <AccountSelector
                accounts={accounts}
                selectedAccountId={selectingAccountType === 'source' ? accountId : toAccountId}
                onSelect={(acc) => {
                  if (selectingAccountType === 'source') {
                    setAccountId(acc._id);
                    setAccountName(acc.name);
                  } else {
                    setToAccountId(acc._id);
                    setToAccountName(acc.name);
                  }
                  setShowAccountSheet(false);
                }}
                onClose={() => setShowAccountSheet(false)}
                onAddAccount={() => {
                  document.getElementById('add_transaction_modal').close();
                }}
              />
            </div>
          )}

          {showCategorySheet && (
            <div className="absolute bottom-0 left-0 right-0 z-50">
              <CategorySelector
                categories={categories.filter(cat => type === 'INCOME' ? cat.type === 'INCOME' : (cat.type === 'EXPENSE' || !cat.type))}
                selectedCategoryId={categoryId}
                onSelect={(cat) => {
                  setCategoryId(cat._id);
                  setCategoryName(cat.name);
                  setShowCategorySheet(false);
                }}
                onClose={() => setShowCategorySheet(false)}
                onAddCategory={() => {
                  const catName = prompt('New category name:');
                  if (catName) {
                    const emoji = prompt('Category Emoji (optional):');
                    handleCreateCategory(catName, emoji);
                  }
                }}
              />
            </div>
          )}
        </div>
      </dialog>

      <BottomNav />
    </div>
  );
}
