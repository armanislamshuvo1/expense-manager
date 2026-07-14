import React, { useEffect, useState } from 'react';
import { useAxiosSecure } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { CustomKeypad } from '../components/CustomKeypad';
import { CategorySelector } from '../components/CategorySelector';
import { AccountSelector } from '../components/AccountSelector';
import { Calendar, Tag, CreditCard, FileText, Bookmark, CalendarRange, Plus, SlidersHorizontal, Search, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import DateTimePickerModal from '../components/DateTimePickerModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

export default function Transactions() {
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
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modal display toggles
  const [showKeypad, setShowKeypad] = useState(false);
  const [showAccountSheet, setShowAccountSheet] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit Mode states
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState('');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterAccount, setFilterAccount] = useState('ALL');
  const [filterDateRange, setFilterDateRange] = useState('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const axiosSecure = useAxiosSecure();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openAddModal) {
      handleOpenAddModal();
      setShowKeypad(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const getNoteSuggestions = () => {
    if (!categoryId) return [];
    const suggestions = transactions
      .filter((tx) => tx.categoryId?._id === categoryId && tx.note && tx.note.trim())
      .map((tx) => tx.note.trim());
    return [...new Set(suggestions)].slice(0, 5);
  };

  // Queries using TanStack Query
  const { data: transactions = [], isLoading: isTransactionsLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await axiosSecure.get('/api/transactions');
      return res.data.success ? res.data.data : [];
    }
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await axiosSecure.get('/api/accounts');
      return res.data.success ? res.data.data : [];
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await axiosSecure.get('/api/categories');
      return res.data.success ? res.data.data : [];
    }
  });

  // Mutations using TanStack Query
  const createMutation = useMutation({
    mutationFn: (txData) => axiosSecure.post('/api/transactions', txData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, txData }) => axiosSecure.put(`/api/transactions/${id}`, txData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosSecure.delete(`/api/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: (catData) => axiosSecure.post('/api/categories', catData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  const handleOpenAddModal = (prefilledDate) => {
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
    setDate(prefilledDate instanceof Date ? prefilledDate : new Date());
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
    setDate(tx.date ? new Date(tx.date) : new Date());
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
        description,
        date: date
      };

      if (editMode) {
        await updateMutation.mutateAsync({ id: editingId, txData });
      } else {
        await createMutation.mutateAsync(txData);
      }

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
      document.getElementById('add_transaction_modal').close();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save transaction.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (catName, emoji) => {
    try {
      await createCategoryMutation.mutateAsync({
        name: catName,
        emoji: emoji || '',
        type: type === 'INCOME' ? 'INCOME' : 'EXPENSE'
      });
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
      await deleteMutation.mutateAsync(id);
      return true;
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const formatDateKey = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const baseCurrency = user?.baseCurrency || 'MYR';

  const getDayDate = (key) => {
    const [day, month, year] = key.split('/');
    return new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const formatDateHeader = (key) => {
    const d = getDayDate(key);
    const day = String(d.getDate()).padStart(2, '0');
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeek = weekdays[d.getDay()];
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return {
      day,
      dayOfWeek,
      monthYear: `${month}.${year}`,
      dateObj: d
    };
  };

  const filteredTransactions = transactions.filter(tx => {
    // 1. Search notes/descriptions/category/account
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const noteMatch = tx.note && tx.note.toLowerCase().includes(q);
      const descMatch = tx.description && tx.description.toLowerCase().includes(q);
      const catMatch = tx.categoryId?.name && tx.categoryId.name.toLowerCase().includes(q);
      const accMatch = tx.accountId?.name && tx.accountId.name.toLowerCase().includes(q);
      if (!noteMatch && !descMatch && !catMatch && !accMatch) return false;
    }

    // 2. Type filter
    if (filterType !== 'ALL' && tx.type !== filterType) return false;

    // 3. Category filter
    if (filterCategory !== 'ALL' && tx.categoryId?._id !== filterCategory) return false;

    // 4. Account filter
    if (filterAccount !== 'ALL' && tx.accountId?._id !== filterAccount && tx.toAccountId?._id !== filterAccount) return false;

    // 5. Date Range filter
    if (filterDateRange !== 'ALL') {
      const txDate = new Date(tx.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (filterDateRange === 'TODAY') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (txDate < today || txDate >= tomorrow) return false;
      } else if (filterDateRange === 'WEEK') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        if (txDate < startOfWeek) return false;
      } else if (filterDateRange === 'MONTH') {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        if (txDate < startOfMonth) return false;
      } else if (filterDateRange === 'CUSTOM') {
        if (customStartDate && txDate < new Date(customStartDate)) return false;
        if (customEndDate) {
          const endLimit = new Date(customEndDate);
          endLimit.setHours(23, 59, 59, 999);
          if (txDate > endLimit) return false;
        }
      }
    }

    return true;
  });

  const groupedTransactions = filteredTransactions.reduce((groups, tx) => {
    const dateKey = formatDateKey(tx.date);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(tx);
    return groups;
  }, {});

  const uniqueDates = [];
  filteredTransactions.forEach(tx => {
    const key = formatDateKey(tx.date);
    if (!uniqueDates.includes(key)) {
      uniqueDates.push(key);
    }
  });

  const totalIncome = filteredTransactions
    .filter(tx => tx.type === 'INCOME')
    .reduce((sum, tx) => sum + (tx.convertedAmount || tx.amount), 0);

  const totalExpenses = filteredTransactions
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
        <h1 className="text-md font-bold">
          {new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-xs ${showFilters ? 'btn-error text-white' : 'btn-outline'} flex items-center gap-1 cursor-pointer`}
          >
            <SlidersHorizontal className="w-3 h-3" /> Filters
          </button>
          <button
            onClick={handleInstallApp}
            className="btn btn-xs btn-outline cursor-pointer"
          >
            Install App
          </button>
        </div>
      </div>

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <div className="p-4 bg-base-200/50 border-b border-base-content/10 space-y-3 animate-slideUp">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-base-content/40 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search note, category, account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-sm bg-base-100 border-base-content/15 pl-9 w-full text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Filter by Type */}
            <div className="flex flex-col gap-1">
              <label className="opacity-50 text-[10px] font-bold uppercase tracking-wider pl-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="select select-sm select-bordered bg-base-100 border-base-content/15 text-xs w-full"
              >
                <option value="ALL">All Types</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </div>

            {/* Filter by Date Range */}
            <div className="flex flex-col gap-1">
              <label className="opacity-50 text-[10px] font-bold uppercase tracking-wider pl-1">Period</label>
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="select select-sm select-bordered bg-base-100 border-base-content/15 text-xs w-full"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="WEEK">This Week</option>
                <option value="MONTH">This Month</option>
                <option value="CUSTOM">Custom Range</option>
              </select>
            </div>

            {/* Filter by Category */}
            <div className="flex flex-col gap-1">
              <label className="opacity-50 text-[10px] font-bold uppercase tracking-wider pl-1">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="select select-sm select-bordered bg-base-100 border-base-content/15 text-xs w-full"
              >
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.emoji} {cat.name}</option>
                ))}
              </select>
            </div>

            {/* Filter by Account */}
            <div className="flex flex-col gap-1">
              <label className="opacity-50 text-[10px] font-bold uppercase tracking-wider pl-1">Account</label>
              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="select select-sm select-bordered bg-base-100 border-base-content/15 text-xs w-full"
              >
                <option value="ALL">All Accounts</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>{acc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Date Inputs */}
          {filterDateRange === 'CUSTOM' && (
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-base-content/5">
              <div className="flex flex-col gap-1">
                <label className="opacity-50 text-[10px] font-bold uppercase tracking-wider pl-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="input input-sm input-bordered bg-base-100 border-base-content/15 text-xs w-full"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="opacity-50 text-[10px] font-bold uppercase tracking-wider pl-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="input input-sm input-bordered bg-base-100 border-base-content/15 text-xs w-full"
                />
              </div>
            </div>
          )}

          {/* Clear Filters Button */}
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterType('ALL');
              setFilterCategory('ALL');
              setFilterAccount('ALL');
              setFilterDateRange('ALL');
              setCustomStartDate('');
              setCustomEndDate('');
            }}
            className="btn btn-xs btn-ghost text-error/85 hover:text-error hover:bg-error/10 w-full rounded-lg mt-1 cursor-pointer"
          >
            Clear Active Filters
          </button>
        </div>
      )}

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

        {isTransactionsLoading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="space-y-2">
                <div className="h-3 w-16 skeleton-shimmer rounded px-1"></div>
                <div className="card bg-base-100 shadow-md">
                  <div className="card-body p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 skeleton-shimmer rounded-full"></div>
                        <div className="space-y-1.5">
                          <div className="h-4 w-28 skeleton-shimmer rounded"></div>
                          <div className="h-3 w-20 skeleton-shimmer rounded"></div>
                        </div>
                      </div>
                      <div className="h-4 w-16 skeleton-shimmer rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10 opacity-60 text-sm">
            No transactions logged this month.
          </div>
        ) : (
          <div className="space-y-4">
            {uniqueDates.map((dateKey) => {
              const dayTransactions = groupedTransactions[dateKey];
              const dayIncome = dayTransactions
                .filter(tx => tx.type === 'INCOME')
                .reduce((sum, tx) => sum + (tx.convertedAmount || tx.amount), 0);
              const dayExpense = dayTransactions
                .filter(tx => tx.type === 'EXPENSE')
                .reduce((sum, tx) => sum + (tx.convertedAmount || tx.amount), 0);
              const formattedHeader = formatDateHeader(dateKey);

              return (
                <div key={dateKey} className="space-y-2">
                  {/* Styled Clickable Date Bar */}
                  <div 
                    onClick={() => handleOpenAddModal(formattedHeader.dateObj)}
                    className="flex justify-between items-center bg-base-200/90 hover:bg-base-200 cursor-pointer p-3 rounded-xl border border-base-content/10 transition-colors shadow-sm active:scale-[0.99]"
                    title="Click to add transaction for this day"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-base-content leading-none">
                        {formattedHeader.day}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider ${
                        formattedHeader.dayOfWeek === 'Sun' || formattedHeader.dayOfWeek === 'Sat'
                          ? 'bg-error/10 text-error'
                          : 'bg-base-300 text-base-content/60'
                      }`}>
                        {formattedHeader.dayOfWeek}
                      </span>
                      <span className="text-[10px] text-base-content/40 font-semibold font-mono">
                        {formattedHeader.monthYear}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs font-bold font-mono">
                      <span className="text-primary">{baseCurrency} {dayIncome.toFixed(2)}</span>
                      <span className="text-error">{baseCurrency} {dayExpense.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="card bg-base-100 shadow-md interactive-scale">
                    <div className="card-body p-2">
                      <div className="divide-y divide-base-200">
                        {dayTransactions.map((tx) => {
                          const txTime = new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          return (
                            <div key={tx._id} className="group flex justify-between items-center py-2 px-2 hover:bg-base-200/40 rounded-xl transition-colors">
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
                                    {tx.note && (
                                      <span className="text-xs text-base-content/80 font-medium py-0.5">
                                        {tx.note}
                                      </span>
                                    )}
                                    <span className="text-[10px] opacity-50 flex items-center gap-1.5">
                                      <span>{txTime}</span>
                                      <span>•</span>
                                      <span>
                                        {tx.type === 'TRANSFER' 
                                          ? `${tx.accountId?.name} ➔ ${tx.toAccountId?.name || '?'}` 
                                          : tx.accountId?.name
                                        }
                                      </span>
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
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTransaction(tx._id);
                                }}
                                className="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/10 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
      <dialog
        id="add_transaction_modal"
        className="modal modal-bottom sm:modal-middle"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.currentTarget.close();
          }
        }}
      >
        <div className={`modal-box bg-base-300 border border-base-content/10 p-0 relative overflow-hidden text-base-content rounded-2xl shadow-2xl transition-all duration-300 ${
          showKeypad || showAccountSheet || showCategorySheet ? 'min-h-[480px] sm:min-h-[540px]' : 'min-h-[350px]'
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

            {/* Date & Time Picker */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/60 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Date & Time
                </span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowDatePicker(true);
                  setShowKeypad(false);
                  setShowCategorySheet(false);
                  setShowAccountSheet(false);
                }}
                className="input input-sm input-bordered bg-base-200 border-base-content/20 text-base-content rounded-xl h-10 px-3 w-full text-left flex items-center justify-between cursor-pointer font-semibold text-xs transition-all hover:bg-base-100"
              >
                <span>{(() => {
                  const day = date.getDate();
                  const month = date.getMonth() + 1;
                  const year = String(date.getFullYear()).slice(-2);
                  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  const wday = weekdays[date.getDay()];
                  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                  return `${month}/${day}/${year} (${wday}) ${timeStr}`;
                })()}</span>
              </button>
            </div>

            {/* Optional Note */}
            <div className="form-control">
              <div className="flex justify-between items-center mb-1">
                <label className="opacity-50 text-[10px] font-bold uppercase tracking-wider pl-1">Note</label>
                <span className="text-[10px] opacity-45 pr-1 font-semibold">{note.length}/20</span>
              </div>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={20}
                placeholder="Add notes..."
                className="input input-sm input-bordered bg-base-200 border-base-content/20 text-base-content rounded-xl h-10 px-3 w-full"
              />
              {user?.settings?.autocomplete !== false && getNoteSuggestions().length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10px] text-base-content/40 self-center mr-1">Suggestions:</span>
                  {getNoteSuggestions().map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setNote(sug)}
                      className="badge badge-error badge-outline text-[10px] py-1 px-2 hover:bg-error hover:text-white cursor-pointer transition-all duration-150 rounded-lg"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Optional Description */}
            {user?.settings?.showDescription !== false && (
              <div className="form-control">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add description..."
                  className="input input-sm input-bordered bg-base-200 border-base-content/20 text-base-content rounded-xl h-10 px-3 w-full"
                />
              </div>
            )}
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
        <DateTimePickerModal
          isOpen={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          value={date}
          onChange={(val) => setDate(val)}
        />
      </dialog>

      <BottomNav />
    </div>
  );
}
