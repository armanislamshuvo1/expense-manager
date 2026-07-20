import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import { useAxiosSecure } from './useApi';
import { useAuth } from '../context/AuthContext';
import { queueOperation, generateUUID } from '../utils/syncManager';

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
      const clientTxId = generateUUID();
      queueOperation('CREATE', clientTxId, null, txData);
      return { success: true, data: { _id: clientTxId, ...txData } };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, txData }) => {
      queueOperation('UPDATE', null, id, txData);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      queueOperation('DELETE', null, id, null);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
    const modal = document.getElementById('add_transaction_modal');
    if (modal) modal.showModal();
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
    const modal = document.getElementById('add_transaction_modal');
    if (modal) modal.showModal();
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

  const handleSaveCustomAccount = async (accountData) => {
    try {
      const response = await axiosSecure.post('/api/accounts', accountData);
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
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
    }
    return false;
  };

  const getNoteSuggestions = () => {
    const suggestions = transactions
      .filter((tx) => tx.note && tx.note.trim())
      .map((tx) => tx.note.trim());
    return [...new Set(suggestions)].slice(0, 5);
  };

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
    getNoteSuggestions
  };
}
