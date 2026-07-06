import React, { useEffect, useState } from 'react';
import { useAxiosSecure } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Plus, Trash2, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function AccountsSetting() {
  const [accounts, setAccounts] = useState([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('CASH');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('MYR');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const axiosSecure = useAxiosSecure();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchAccounts = async () => {
    try {
      const response = await axiosSecure.get('/api/accounts');
      if (response.data.success) {
        setAccounts(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    setError('');

    try {
      if (editingId) {
        const response = await axiosSecure.put(`/api/accounts/${editingId}`, {
          name,
          type,
          balance: Number(balance) || 0,
          currency,
        });
        if (response.data.success) {
          setEditingId(null);
          setName('');
          setBalance('');
          fetchAccounts();
          document.getElementById('account_modal').close();
        }
      } else {
        const response = await axiosSecure.post('/api/accounts', {
          name,
          type,
          balance: Number(balance) || 0,
          currency,
        });
        if (response.data.success) {
          setName('');
          setBalance('');
          fetchAccounts();
          document.getElementById('account_modal').close();
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save account.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (acc) => {
    setEditingId(acc._id);
    setName(acc.name);
    setType(acc.type);
    setBalance(acc.balance.toString());
    setCurrency(acc.currency || 'MYR');
    document.getElementById('account_modal').showModal();
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
        fetchAccounts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 text-base-content font-sans pb-10">
      {/* Header */}
      <div className="bg-base-300 p-4 flex items-center gap-4 border-b border-base-content/10">
        <button onClick={() => navigate('/more')} className="btn btn-ghost btn-circle text-base-content/60 hover:text-base-content">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-bold">Accounts Setting</h1>
          <p className="text-xs text-base-content/50">Configure your payment accounts</p>
        </div>
      </div>

      {/* Account List */}
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-base-content/50">My Accounts</span>
          <button
            onClick={() => {
              setEditingId(null);
              setName('');
              setType('CASH');
              setBalance('');
              setCurrency(user?.baseCurrency || 'MYR');
              document.getElementById('account_modal').showModal();
            }}
            className="btn btn-xs bg-error hover:bg-error/80 border-none text-white gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add New
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-12 text-base-content/50 text-sm">
            No accounts defined.
          </div>
        ) : (
          <div className="bg-base-300 rounded-2xl divide-y divide-base-content/10 overflow-hidden shadow-lg border border-base-content/10">
            {accounts.map((acc) => (
              <div key={acc._id} className="flex justify-between items-center p-4 hover:bg-base-200 transition-colors">
                <div>
                  <span className="font-semibold text-sm block">{acc.name}</span>
                  <span className="text-[10px] text-base-content/50 uppercase tracking-wider">{acc.type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">
                    {acc.currency} {acc.balance.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleEditClick(acc)}
                    className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(acc._id)}
                    className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-error"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <dialog id="account_modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box bg-base-300 border border-base-content/10 text-base-content">
          <h3 className="font-bold text-lg mb-4 text-error">
            {editingId ? 'Edit Account' : 'Add New Account'}
          </h3>

          {error && <div className="alert alert-error mb-4 text-xs p-2">{error}</div>}

          <form onSubmit={handleSaveAccount} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-base-content/60 font-semibold">Account Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input input-bordered bg-base-200 border-base-content/20 text-base-content"
                placeholder="e.g. Cash Wallet, Bank of America"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-base-content/60 font-semibold">Account Type</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="select select-bordered bg-base-200 border-base-content/20 text-base-content"
                >
                  <option className="bg-base-200 text-base-content" value="CASH">Cash</option>
                  <option className="bg-base-200 text-base-content" value="CARD">Credit / Debit Card</option>
                  <option className="bg-base-200 text-base-content" value="SAVINGS">Savings Account</option>
                  <option className="bg-base-200 text-base-content" value="INVESTMENT">Investment Account</option>
                  <option className="bg-base-200 text-base-content" value="CRYPTO">Crypto Wallet</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text text-base-content/60 font-semibold">Currency</span>
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="select select-bordered bg-base-200 border-base-content/20 text-base-content"
                >
                  <option className="bg-base-200 text-base-content" value="MYR">MYR (RM)</option>
                  <option className="bg-base-200 text-base-content" value="USD">USD ($)</option>
                  <option className="bg-base-200 text-base-content" value="EUR">EUR (€)</option>
                  <option className="bg-base-200 text-base-content" value="SGD">SGD (S$)</option>
                </select>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text text-base-content/60 font-semibold">Balance</span>
              </label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="input input-bordered bg-base-200 border-base-content/20 text-base-content"
                placeholder="0.00"
              />
            </div>

            <div className="modal-action flex justify-end gap-2">
              <button
                type="button"
                onClick={() => document.getElementById('account_modal').close()}
                className="btn btn-ghost btn-sm text-base-content/60 hover:text-base-content"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn bg-error hover:bg-error/80 border-none btn-sm text-white"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}
