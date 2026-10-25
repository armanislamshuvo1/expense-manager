import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import { useAxiosSecure } from './useApi';
import { useAuth } from '../context/AuthContext';
import { queueOperation, queueCategoryOperation, queueAccountOperation, generateUUID, triggerSync } from '../utils/syncManager';

export function useTransactionsForm(transactions = []) {
  const axiosSecure = useAxiosSecure();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [type, setType] = useState('EXPENSE'); // INCOME, EXPENSE, TRANSFER
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('MYR');
  const [accountId, setAccountId] = useState('');
  const [accountName, setAccountName] = useState('Select Account');
  const [toAccountId, setToAccountId] = useState('');
  const [toAccountName, setToAccountName] = useState('Select Account');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('Select Category');
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');
  const [shouldConvert, setShouldConvert] = useState(true);
  const [exchangeRate, setExchangeRate] = useState('1.0');
  const [date, setDate] = useState(new Date());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState('');

  const createMutation = useMutation({
    mutationFn: async (txData) => {
      if (navigator.onLine) {
        try {
          const res = await axiosSecure.post('/api/transactions', txData);
          if (res.data?.success) {
            return res.data;
          }
        } catch (netErr) {
          console.warn('Direct transaction post failed, falling back to offline queue:', netErr);
        }
      }
      const clientTxId = generateUUID('tx');
      queueOperation('CREATE', clientTxId, null, txData);
      triggerSync();
      return { success: true, data: { _id: clientTxId, ...txData } };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, txData }) => {
      if (navigator.onLine && id && !String(id).startsWith('tx_')) {
        try {
          const res = await axiosSecure.put(`/api/transactions/${id}`, txData);
          if (res.data?.success) {
            return res.data;
          }
        } catch (netErr) {
          console.warn('Direct transaction update failed, falling back to offline queue:', netErr);
        }
      }
      queueOperation('UPDATE', null, id, txData);
      triggerSync();
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      if (navigator.onLine && id && !String(id).startsWith('tx_')) {
        try {
          const res = await axiosSecure.delete(`/api/transactions/${id}`);
          if (res.data?.success) {
            return res.data;
          }
        } catch (netErr) {
          console.warn('Direct transaction delete failed, falling back to offline queue:', netErr);
        }
      }
      queueOperation('DELETE', null, id, null);
      triggerSync();
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const handleOpenAddModal = useCallback((prefilledDate) => {
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
    const modal = document.getElementById('add_transaction_modal');
    if (modal) modal.showModal();
  }, [user?.baseCurrency]);

  const handleOpenEditModal = useCallback((tx) => {
    if (!tx) return;
    setEditMode(true);
    setEditingId(tx._id);
    setType(tx.type || 'EXPENSE');
    setAmount(tx.amount !== undefined ? tx.amount.toString() : '');
    setCurrency(tx.currency || 'MYR');

    const accObj = typeof tx.accountId === 'object' ? tx.accountId : null;
    const accId = accObj?._id || (typeof tx.accountId === 'string' ? tx.accountId : '');
    const accName = accObj?.name || 'Select Account';

    const toAccObj = typeof tx.toAccountId === 'object' ? tx.toAccountId : null;
    const toAccId = toAccObj?._id || (typeof tx.toAccountId === 'string' ? tx.toAccountId : '');
    const toAccName = toAccObj?.name || 'Select Account';

    const catObj = typeof tx.categoryId === 'object' ? tx.categoryId : null;
    const catId = catObj?._id || (typeof tx.categoryId === 'string' ? tx.categoryId : '');
    const catName = catObj?.name || 'Select Category';

    setAccountId(accId);
    setAccountName(accName);
    setToAccountId(toAccId);
    setToAccountName(toAccName);
    setCategoryId(catId);
    setCategoryName(catName);
    setNote(tx.note || '');
    setDescription(tx.description || '');
    setShouldConvert(tx.shouldConvert !== undefined ? tx.shouldConvert : true);
    setExchangeRate(tx.exchangeRate?.toString() || '1.0');
    setDate(tx.date ? new Date(tx.date) : new Date());
    setError('');
    const modal = document.getElementById('add_transaction_modal');
    if (modal) modal.showModal();
  }, []);

  const handleSaveTransaction = useCallback(async (e) => {
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
        date: date,
        accountName,
        toAccountName,
        categoryName
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
      const modal = document.getElementById('add_transaction_modal');
      if (modal) modal.close();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save transaction.');
    } finally {
      setLoading(false);
    }
  }, [
    type, amount, accountId, toAccountId, categoryId, currency, shouldConvert, exchangeRate, 
    note, description, date, accountName, toAccountName, categoryName, editMode, editingId, 
    updateMutation, createMutation
  ]);

  const handleCreateCategory = useCallback(async (catName, emoji, parentId = null) => {
    try {
      const clientCatId = generateUUID('cat');
      queueCategoryOperation('CREATE', clientCatId, null, {
        name: catName,
        emoji: emoji || '',
        parentId: parentId || null,
        type: type === 'INCOME' ? 'INCOME' : 'EXPENSE'
      });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (err) {
      console.error(err);
    }
  }, [queryClient, type]);

  const handleSaveCustomAccount = useCallback(async (accountData) => {
    try {
      const clientAccId = generateUUID('acc');
      queueAccountOperation('CREATE', clientAccId, null, accountData);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    } catch (err) {
      console.error(err);
    }
  }, [queryClient]);

  const handleDeleteTransaction = useCallback(async (id) => {
    const modalEl = document.getElementById('add_transaction_modal');
    const wasModalOpen = Boolean(modalEl && modalEl.open);

    if (wasModalOpen) {
      modalEl.close();
    }

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

    if (result.isConfirmed) {
      setLoading(true);
      try {
        await deleteMutation.mutateAsync(id);
        Swal.fire({
          title: 'Deleted!',
          text: 'Transaction deleted successfully.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#1e1e24',
          color: '#ffffff'
        });
        return true;
      } catch (err) {
        Swal.fire({
          title: 'Error',
          text: err.response?.data?.message || 'Failed to delete transaction.',
          icon: 'error',
          confirmButtonColor: '#ef4444',
          background: '#1e1e24',
          color: '#ffffff'
        });
      } finally {
        setLoading(false);
      }
    } else if (wasModalOpen && modalEl) {
      // Re-open form modal ONLY if it was open before the delete prompt
      modalEl.showModal();
    }
    return false;
  }, [deleteMutation]);

  const getNoteSuggestions = useCallback((query = '') => {
    const suggestions = transactions
      .filter((tx) => tx.note && tx.note.trim())
      .map((tx) => tx.note.trim());
    const unique = [...new Set(suggestions)];
    if (!query || !query.trim()) {
      return unique.slice(0, 5);
    }
    const q = query.trim().toLowerCase();
    return unique
      .filter((sug) => sug.toLowerCase().includes(q))
      .slice(0, 5);
  }, [transactions]);

  const applyNoteAutocomplete = useCallback((noteText) => {
    setNote(noteText);
    if (user?.settings?.autocomplete !== false) {
      const match = transactions.find(
        (tx) => tx.note && tx.note.trim().toLowerCase() === noteText.trim().toLowerCase()
      );
      if (match) {
        if (match.type && (match.type === 'INCOME' || match.type === 'EXPENSE')) {
          setType(match.type);
        }
        if (match.categoryId) {
          const catId = typeof match.categoryId === 'object' ? (match.categoryId._id || match.categoryId.clientCatId) : match.categoryId;
          const catName = typeof match.categoryId === 'object' ? match.categoryId.name : match.categoryName;
          if (catId) setCategoryId(catId);
          if (catName) setCategoryName(catName);
        }
        if (match.accountId) {
          const accId = typeof match.accountId === 'object' ? match.accountId._id : match.accountId;
          const accName = typeof match.accountId === 'object' ? match.accountId.name : match.accountName;
          if (accId) setAccountId(accId);
          if (accName) setAccountName(accName);
        }
      }
    }
  }, [transactions, user]);

  return {
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
    getNoteSuggestions,
    applyNoteAutocomplete
  };
}
