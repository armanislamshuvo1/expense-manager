import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Play,
  Pause,
  Repeat,
  Zap,
  Clock,
  Calendar,
  AlertCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useAxiosSecure } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { recurringService } from '../services/recurringService';
import { hapticSelection, hapticSuccess, hapticWarning } from '../utils/haptics';

export default function RecurringTransactionsSetting() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const axiosSecure = useAxiosSecure();
  const { user } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [type, setType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(user?.baseCurrency || 'MYR');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState('DAILY');
  const [executionTime, setExecutionTime] = useState('');
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Fetch Recurring Transactions
  const {
    data: recurringData,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['recurring'],
    queryFn: recurringService.getRecurringTransactions
  });

  const recurringList = recurringData?.data || recurringData?.items || [];

  // Fetch Accounts and Categories for the form selector
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [accRes, catRes] = await Promise.all([
          axiosSecure.get('/api/accounts'),
          axiosSecure.get('/api/categories')
        ]);
        if (accRes.data?.success) setAccounts(accRes.data.data);
        if (catRes.data?.success) setCategories(catRes.data.data);
      } catch (err) {
        console.error('Failed to load accounts/categories for recurring modal:', err);
      }
    };
    fetchMetadata();
  }, [axiosSecure]);

  const resetForm = () => {
    setEditingId(null);
    setType('EXPENSE');
    setAmount('');
    setCurrency(user?.baseCurrency || 'MYR');
    setAccountId(accounts[0]?._id || '');
    setToAccountId(accounts[1]?._id || '');
    setCategoryId(categories[0]?._id || '');
    setFrequency('DAILY');
    setExecutionTime(new Date().toTimeString().slice(0, 5));
    setNote('');
    setDescription('');
    setError('');
  };

  const handleOpenAdd = () => {
    hapticSelection();
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule) => {
    hapticSelection();
    setEditingId(rule._id);
    setType(rule.type);
    setAmount(String(rule.amount));
    setCurrency(rule.currency || user?.baseCurrency || 'MYR');
    setAccountId(rule.accountId?._id || rule.accountId || '');
    setToAccountId(rule.toAccountId?._id || rule.toAccountId || '');
    setCategoryId(rule.categoryId?._id || rule.categoryId || '');
    setFrequency(rule.frequency || 'DAILY');
    setExecutionTime(
      rule.executionTime ||
      (rule.nextRunDate ? new Date(rule.nextRunDate).toTimeString().slice(0, 5) : new Date().toTimeString().slice(0, 5))
    );
    setNote(rule.note || '');
    setDescription(rule.description || '');
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!accountId) {
      setError('Please select an account.');
      return;
    }
    if (type === 'TRANSFER' && (!toAccountId || accountId === toAccountId)) {
      setError('Source and destination accounts must be different.');
      return;
    }
    if (type !== 'TRANSFER' && !categoryId) {
      setError('Please select a category.');
      return;
    }

    try {
      const payload = {
        type,
        amount: Number(amount),
        currency,
        accountId,
        toAccountId: type === 'TRANSFER' ? toAccountId : undefined,
        categoryId: type !== 'TRANSFER' ? categoryId : undefined,
        frequency,
        executionTime: executionTime || undefined,
        timezone: Intl?.DateTimeFormat?.().resolvedOptions()?.timeZone || 'Asia/Kuala_Lumpur',
        note,
        description
      };

      if (editingId) {
        await recurringService.updateRecurringTransaction(editingId, payload);
        Swal.fire({
          icon: 'success',
          title: 'Schedule Updated',
          text: 'Recurring rule has been updated successfully.',
          timer: 1500,
          showConfirmButton: false
        });
      } else {
        await recurringService.createRecurringTransaction(payload);
        Swal.fire({
          icon: 'success',
          title: 'Schedule Created',
          text: 'New recurring transaction schedule is now active.',
          timer: 1500,
          showConfirmButton: false
        });
      }

      hapticSuccess();
      setIsModalOpen(false);
      resetForm();
      refetch();
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save recurring schedule.');
      hapticWarning();
    }
  };

  const handleToggle = async (rule) => {
    hapticSelection();
    setActionLoadingId(rule._id);
    try {
      const res = await recurringService.toggleRecurringTransaction(rule._id);
      const newStatus = res.status || (rule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE');
      Swal.fire({
        icon: 'info',
        title: newStatus === 'ACTIVE' ? 'Schedule Resumed' : 'Schedule Paused',
        text: `The recurring transaction schedule has been ${newStatus.toLowerCase()}.`,
        timer: 1500,
        showConfirmButton: false
      });
      hapticSuccess();
      refetch();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to toggle status.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (ruleId) => {
    hapticWarning();
    const result = await Swal.fire({
      title: 'Delete Schedule?',
      text: 'This will permanently remove this recurring rule. Transactions already logged will remain.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#4b5563',
      confirmButtonText: 'Yes, delete it'
    });

    if (result.isConfirmed) {
      try {
        await recurringService.deleteRecurringTransaction(ruleId);
        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: 'Recurring transaction rule deleted.',
          timer: 1200,
          showConfirmButton: false
        });
        hapticSuccess();
        refetch();
      } catch (err) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to delete schedule.', 'error');
      }
    }
  };

  const handleRunNow = async (ruleId) => {
    hapticSelection();
    setActionLoadingId(ruleId);
    try {
      const res = await recurringService.runNow(ruleId);
      Swal.fire({
        icon: 'success',
        title: 'Transaction Executed',
        text: 'The recurring transaction was logged immediately and balances updated.',
        timer: 1800,
        showConfirmButton: false
      });
      hapticSuccess();
      refetch();
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to execute transaction now.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content pb-20">
      {/* Header Bar */}
      <div className="sticky top-0 z-30 bg-base-100/95 backdrop-blur-md border-b border-base-content/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              hapticSelection();
              navigate(-1);
            }}
            className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-base-content"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold flex items-center gap-1.5">
              <Repeat className="w-4 h-4 text-primary-app" /> Recurring Transactions
            </h1>
            <p className="text-[11px] text-base-content/50">Manage automated cron schedules</p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="btn btn-xs bg-primary-app text-slate-950 font-bold hover:bg-cyan-400 border-none gap-1 shadow"
        >
          <Plus className="w-3.5 h-3.5" /> Add Rule
        </button>
      </div>

      {/* Main Content Area */}
      <div className="max-w-lg mx-auto p-4 space-y-3">
        {/* Info Banner */}
        <div className="bg-base-200/60 border border-base-content/10 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-base-content/70">
          <Clock className="w-4 h-4 text-primary-app flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-base-content block">Automated Cron Engine</span>
            Active repeating rules execute automatically on schedule in the background, updating balances and recording genuine transaction history.
          </div>
        </div>

        {/* Schedule List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-md text-primary-app"></span>
          </div>
        ) : recurringList.length === 0 ? (
          <div className="text-center py-16 bg-base-200/40 rounded-3xl border border-dashed border-base-content/20 p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-app/10 text-primary-app flex items-center justify-center mx-auto">
              <Repeat className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-base-content">No Recurring Schedules</h3>
            <p className="text-xs text-base-content/60 max-w-xs mx-auto">
              You haven't set up any repeating transactions yet. Turn on Repeat when adding an expense or click "Add Rule" above.
            </p>
            <button
              onClick={handleOpenAdd}
              className="btn btn-sm bg-primary-app text-slate-950 hover:bg-cyan-400 font-bold border-none"
            >
              <Plus className="w-4 h-4" /> Create Schedule
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recurringList.map((rule) => {
              const isActive = rule.status === 'ACTIVE';
              const isBusy = actionLoadingId === rule._id;
              const formattedNextRun = rule.nextRunDate
                ? new Date(rule.nextRunDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Pending';

              return (
                <div
                  key={rule._id}
                  className={`bg-base-200/70 border rounded-2xl p-4 transition-all shadow-sm flex flex-col gap-3 ${
                    isActive
                      ? 'border-base-content/10 hover:border-primary-app/40'
                      : 'border-base-content/5 opacity-70'
                  }`}
                >
                  {/* Top Bar of Card */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {rule.type === 'TRANSFER'
                          ? '🔁'
                          : rule.categoryId?.emoji || (rule.type === 'INCOME' ? '💰' : '🏷️')}
                      </span>
                      <div>
                        <span className="font-bold text-sm block leading-tight">
                          {rule.type === 'TRANSFER'
                            ? `Transfer to ${rule.toAccountId?.name || 'Account'}`
                            : rule.categoryId?.name || (rule.type === 'INCOME' ? 'Income' : 'Expense')}
                        </span>
                        <span className="text-[10px] text-base-content/50">
                          From: {rule.accountId?.name || 'Account'}
                        </span>
                      </div>
                    </div>

                    {/* Amount & Status Badge */}
                    <div className="text-right">
                      <span
                        className={`font-black text-sm block ${
                          rule.type === 'INCOME'
                            ? 'text-success'
                            : rule.type === 'TRANSFER'
                            ? 'text-info'
                            : 'text-error'
                        }`}
                      >
                        {rule.type === 'INCOME' ? '+' : rule.type === 'TRANSFER' ? '→ ' : '-'}
                        {rule.currency || 'MYR'} {Number(rule.amount).toFixed(2)}
                      </span>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span
                          className={`badge badge-xs font-bold ${
                            isActive
                              ? 'bg-success/20 text-success border-success/30'
                              : 'bg-warning/20 text-warning border-warning/30'
                          }`}
                        >
                          {rule.status}
                        </span>
                        <span className="badge badge-xs bg-base-300 text-base-content/70 border-none font-semibold">
                          {rule.frequency}
                        </span>
                        {rule.executionTime && (
                          <span className="badge badge-xs bg-base-300 text-base-content/70 border-none font-semibold flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5 text-primary-app inline" />
                            {rule.executionTime} ({rule.timezone?.split('/')?.pop()?.replace('_', ' ') || 'Local'})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Note / Description */}
                  {(rule.note || rule.description) && (
                    <div className="text-xs bg-base-300/40 rounded-xl p-2 text-base-content/80 font-medium">
                      {rule.note && <span className="block font-semibold">{rule.note}</span>}
                      {rule.description && (
                        <span className="text-[11px] text-base-content/60 block">{rule.description}</span>
                      )}
                    </div>
                  )}

                  {/* Next Run & Stats */}
                  <div className="flex items-center justify-between text-[11px] text-base-content/60 pt-2 border-t border-base-content/10">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-primary-app" />
                      <span>Next: <strong className="text-base-content/90 font-semibold">{formattedNextRun}</strong></span>
                    </div>
                    {rule.executionCount > 0 && (
                      <span className="text-[10px] opacity-75">
                        Ran {rule.executionCount} {rule.executionCount === 1 ? 'time' : 'times'}
                      </span>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-base-content/10 mt-1">
                    <button
                      onClick={() => handleRunNow(rule._id)}
                      disabled={isBusy || !isActive}
                      className="btn btn-xs bg-primary-app/15 text-primary-app hover:bg-primary-app hover:text-slate-950 border-none gap-1 font-bold"
                    >
                      <Zap className="w-3 h-3" /> Run Now
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggle(rule)}
                        disabled={isBusy}
                        className={`btn btn-xs btn-ghost gap-1 font-semibold ${
                          isActive ? 'text-warning' : 'text-success'
                        }`}
                        title={isActive ? 'Pause rule' : 'Resume rule'}
                      >
                        {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {isActive ? 'Pause' : 'Resume'}
                      </button>

                      <button
                        onClick={() => handleOpenEdit(rule)}
                        disabled={isBusy}
                        className="btn btn-xs btn-ghost btn-circle text-base-content/60 hover:text-base-content"
                        title="Edit schedule"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(rule._id)}
                        disabled={isBusy}
                        className="btn btn-xs btn-ghost btn-circle text-base-content/60 hover:text-error"
                        title="Delete schedule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-base-300 border border-base-content/15 rounded-3xl w-full max-w-md p-5 shadow-2xl text-base-content flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-base-content/10 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Repeat className="w-4 h-4 text-primary-app" />
                {editingId ? 'Edit Recurring Schedule' : 'New Recurring Schedule'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn btn-xs btn-ghost btn-circle"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="alert alert-error text-xs p-2.5 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              {/* Type selector */}
              <div className="grid grid-cols-3 gap-1 bg-base-200 p-1 rounded-xl">
                {['EXPENSE', 'INCOME', 'TRANSFER'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      setType(t);
                    }}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      type === t
                        ? 'bg-primary-app text-slate-950 shadow'
                        : 'text-base-content/70 hover:text-base-content'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase text-base-content/50 block mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="input input-sm input-bordered bg-base-200 w-full rounded-xl font-bold text-base"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-base-content/50 block mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    className="input input-sm input-bordered bg-base-200 w-full rounded-xl font-bold uppercase text-center"
                    maxLength={4}
                  />
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="text-[10px] font-bold uppercase text-base-content/50 block mb-1">
                  Recurrence Frequency
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-base-200 p-1 rounded-xl">
                  {['DAILY', 'WEEKLY', 'MONTHLY'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        hapticSelection();
                        setFrequency(f);
                      }}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        frequency === f
                          ? 'bg-primary-app text-slate-950 shadow'
                          : 'text-base-content/70 hover:text-base-content'
                      }`}
                    >
                      {f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Execution Time */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold uppercase text-base-content/50">
                    Execution Time ({Intl?.DateTimeFormat?.().resolvedOptions()?.timeZone || 'Asia/Kuala_Lumpur'})
                  </label>
                  <span className="text-[10px] text-base-content/40">
                    Your local time
                  </span>
                </div>
                <input
                  type="time"
                  value={executionTime}
                  onChange={(e) => setExecutionTime(e.target.value)}
                  className="input input-sm input-bordered bg-base-200 w-full rounded-xl font-bold"
                />
              </div>

              {/* Account */}
              <div>
                <label className="text-[10px] font-bold uppercase text-base-content/50 block mb-1">
                  {type === 'TRANSFER' ? 'Source Account' : 'Account'}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="select select-sm select-bordered bg-base-200 w-full rounded-xl font-semibold"
                  required
                >
                  <option value="" disabled>Select Account</option>
                  {accounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Account if TRANSFER */}
              {type === 'TRANSFER' && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-base-content/50 block mb-1">
                    Destination Account
                  </label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="select select-sm select-bordered bg-base-200 w-full rounded-xl font-semibold"
                    required
                  >
                    <option value="" disabled>Select Destination Account</option>
                    {accounts.filter(a => a._id !== accountId).map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name} ({acc.currency})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category if NOT Transfer */}
              {type !== 'TRANSFER' && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-base-content/50 block mb-1">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="select select-sm select-bordered bg-base-200 w-full rounded-xl font-semibold"
                    required
                  >
                    <option value="" disabled>Select Category</option>
                    {categories
                      .filter(c => type === 'INCOME' ? c.type === 'INCOME' : (c.type === 'EXPENSE' || !c.type))
                      .map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.emoji || '🏷️'} {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="text-[10px] font-bold uppercase text-base-content/50 block mb-1">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Morning Coffee, Rent, Internet"
                  maxLength={50}
                  className="input input-sm input-bordered bg-base-200 w-full rounded-xl"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-base-content/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-sm btn-ghost flex-1 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm bg-primary-app text-slate-950 font-bold hover:bg-cyan-400 border-none flex-1 rounded-xl shadow"
                >
                  {editingId ? 'Save Changes' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
