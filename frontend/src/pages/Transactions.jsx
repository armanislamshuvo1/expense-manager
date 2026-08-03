import React, { useEffect, useState, useMemo } from 'react';
import { useAxiosSecure } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import Swal from 'sweetalert2';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { 
  getMergedTransactions, 
  setCache, 
  getAccountsCache,
  setAccountsCache,
  getCategoriesCache,
  setCategoriesCache,
  subscribeToSync
} from '../utils/syncManager';
import { useTransactionsForm } from '../hooks/useTransactionsForm';

// Import modularized components
import Filters from '../components/transactions/Filters';
import List from '../components/transactions/List';
import FormModal from '../components/transactions/FormModal';

export default function Transactions() {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterAccount, setFilterAccount] = useState('ALL');
  const [filterDateRange, setFilterDateRange] = useState('MONTH');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const axiosSecure = useAxiosSecure();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  const [syncStatus, setSyncStatus] = useState('synced');
  const [syncQueueLength, setSyncQueueLength] = useState(0);

  useEffect(() => {
    return subscribeToSync((status, qLength) => {
      setSyncStatus(status);
      setSyncQueueLength(qLength);
      if (status === 'synced' && qLength === 0) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
      }
    });
  }, [queryClient]);

  // Queries using TanStack Query
  const { data: rawTransactions = [], isLoading: isTransactionsLoading } = useQuery({
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
    }
  });

  const transactions = useMemo(() => {
    return getMergedTransactions();
  }, [rawTransactions, syncQueueLength]);

  const { data: rawAccounts = [] } = useQuery({
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
    }
  });

  const accounts = useMemo(() => {
    return getMergedAccounts();
  }, [rawAccounts, syncQueueLength]);

  const { data: rawCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const res = await axiosSecure.get('/api/categories');
        if (res.data?.success) {
          setCategoriesCache(res.data.data);
          return res.data.data;
        }
      } catch (err) {
        console.warn('Failed to fetch categories online, using cache');
      }
      return getCategoriesCache();
    }
  });

  const categories = useMemo(() => {
    return getMergedCategories();
  }, [rawCategories, syncQueueLength]);

  const formProps = useTransactionsForm(transactions);
  const {
    type,
    setType,
    amount,
    setAmount,
    currency,
    setCurrency,
    accountId,
    setAccountId,
    accountName,
    setAccountName,
    toAccountId,
    setToAccountId,
    toAccountName,
    setToAccountName,
    categoryId,
    setCategoryId,
    categoryName,
    setCategoryName,
    note,
    setNote,
    description,
    setDescription,
    shouldConvert,
    setShouldConvert,
    exchangeRate,
    setExchangeRate,
    date,
    setDate,
    loading,
    error,
    setError,
    editMode,
    editingId,
    handleOpenAddModal,
    handleOpenEditModal,
    handleSaveTransaction,
    handleCreateCategory,
    handleSaveCustomAccount,
    handleDeleteTransaction,
    getNoteSuggestions
  } = formProps;

  const [returnPath, setReturnPath] = useState(null);

  useEffect(() => {
    if (location.state?.openAddModal) {
      if (location.state?.returnTo) {
        setReturnPath(location.state.returnTo);
      }
      handleOpenAddModal();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.openAddModal, location.state?.returnTo, handleOpenAddModal, navigate, location.pathname]);

  useEffect(() => {
    const modal = document.getElementById('add_transaction_modal');
    if (!modal) return;
    const handleClose = () => {
      if (returnPath) {
        const dest = returnPath;
        setReturnPath(null);
        navigate(dest);
      }
    };
    modal.addEventListener('close', handleClose);
    return () => modal.removeEventListener('close', handleClose);
  }, [returnPath, navigate]);

  const formatDateKey = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  const baseCurrency = user?.baseCurrency || 'MYR';

  const getDayDate = (key) => {
    const [day, month, year] = key.split('-');
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

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
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
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          if (txDate < startOfMonth || txDate > endOfMonth) return false;
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
  }, [transactions, searchQuery, filterType, filterCategory, filterAccount, filterDateRange, customStartDate, customEndDate]);

  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((groups, tx) => {
      const dateKey = formatDateKey(tx.date);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
      return groups;
    }, {});
  }, [filteredTransactions]);

  const uniqueDates = useMemo(() => {
    const dates = [];
    filteredTransactions.forEach(tx => {
      const key = formatDateKey(tx.date);
      if (!dates.includes(key)) {
        dates.push(key);
      }
    });
    return dates;
  }, [filteredTransactions]);

  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter(tx => tx.type === 'INCOME')
      .reduce((sum, tx) => sum + (tx.convertedAmount || tx.amount), 0);
  }, [filteredTransactions]);

  const totalExpenses = useMemo(() => {
    return filteredTransactions
      .filter(tx => tx.type === 'EXPENSE')
      .reduce((sum, tx) => sum + (tx.convertedAmount || tx.amount), 0);
  }, [filteredTransactions]);

  const total = useMemo(() => totalIncome - totalExpenses, [totalIncome, totalExpenses]);

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
      await deferredPrompt.userChoice;
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
      {/* Date / Month Header Row & Filters Bar */}
      <Filters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterType={filterType}
        setFilterType={setFilterType}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        filterAccount={filterAccount}
        setFilterAccount={setFilterAccount}
        filterDateRange={filterDateRange}
        setFilterDateRange={setFilterDateRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        categories={categories}
        accounts={accounts}
        handleInstallApp={handleInstallApp}
      />

      {/* Ledger list of Daily Transactions */}
      <div className="p-4 space-y-4">
        {/* Monthly Summary Bar */}
        <div className="grid grid-cols-3 text-center bg-base-100 p-3 rounded-xl shadow-md border border-base-200">
          <div className="flex flex-col items-center justify-center border-r border-base-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-success font-extrabold">Income</span>
            <span className="text-sm font-extrabold text-success mt-1">
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

        {/* Transactions List */}
        <List
          transactions={transactions}
          filteredTransactions={filteredTransactions}
          uniqueDates={uniqueDates}
          groupedTransactions={groupedTransactions}
          baseCurrency={baseCurrency}
          user={user}
          isTransactionsLoading={isTransactionsLoading}
          formatDateHeader={formatDateHeader}
          handleOpenAddModal={handleOpenAddModal}
          handleOpenEditModal={handleOpenEditModal}
          handleDeleteTransaction={handleDeleteTransaction}
        />
      </div>

      {/* Floating Add Action Button */}
      <button
        onClick={() => handleOpenAddModal()}
        className="btn btn-error btn-circle fixed bottom-28 right-6 shadow-xl z-40 text-white animate-bounce"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Form Dialog Component */}
      <FormModal
        type={type}
        setType={setType}
        amount={amount}
        setAmount={setAmount}
        currency={currency}
        setCurrency={setCurrency}
        accountId={accountId}
        setAccountId={setAccountId}
        accountName={accountName}
        setAccountName={setAccountName}
        toAccountId={toAccountId}
        setToAccountId={setToAccountId}
        toAccountName={toAccountName}
        setToAccountName={setToAccountName}
        categoryId={categoryId}
        setCategoryId={setCategoryId}
        categoryName={categoryName}
        setCategoryName={setCategoryName}
        note={note}
        setNote={setNote}
        description={description}
        setDescription={setDescription}
        shouldConvert={shouldConvert}
        setShouldConvert={setShouldConvert}
        exchangeRate={exchangeRate}
        setExchangeRate={setExchangeRate}
        date={date}
        setDate={setDate}
        error={error}
        setError={setError}
        loading={loading}
        editMode={editMode}
        editingId={editingId}
        accounts={accounts}
        categories={categories}
        user={user}
        handleSaveTransaction={handleSaveTransaction}
        handleCreateCategory={handleCreateCategory}
        handleSaveCustomAccount={handleSaveCustomAccount}
        handleDeleteTransaction={handleDeleteTransaction}
        getNoteSuggestions={getNoteSuggestions}
      />

      <BottomNav />
    </div>
  );
}
