import React, { useState } from 'react';
import { UserX, ShieldAlert, X } from 'lucide-react';
import { useAxiosSecure } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';

export default function AccountDeleteModal({ isOpen, onClose }) {
  const axiosSecure = useAxiosSecure();
  const { user, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isCustomUser = user?.provider === 'custom';
  const REQUIRED_TEXT = 'DELETE MY ACCOUNT';

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await axiosSecure.delete('/api/user/account', {
        data: {
          password: isCustomUser ? password : undefined,
          confirmationText: !isCustomUser ? confirmInput : undefined
        }
      });

      if (response.data.success) {
        logout();
      }
    } catch (err) {
      console.error('Account deletion error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to delete account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-base-300 w-full max-w-md rounded-3xl border border-error/30 shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-base-content/10 pb-3">
          <h2 className="text-lg font-bold text-error flex items-center gap-2">
            <UserX className="w-6 h-6 text-error" /> Delete Account
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-error/10 border border-error/20 p-3 rounded-2xl text-xs text-base-content/80 space-y-1">
          <p className="font-bold text-error">Account Deletion Request</p>
          <p>Your account will be set to <span className="font-mono text-error font-bold">DELETED</span>. You will be logged out immediately. To restore your account in the future, you will need to contact support.</p>
        </div>

        {errorMsg && <div className="alert alert-error text-xs p-2 text-white">{errorMsg}</div>}

        <form onSubmit={handleDeleteAccount} className="space-y-4">
          {isCustomUser ? (
            <div>
              <label className="text-xs text-base-content/60 block mb-1">Enter your password to confirm:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Account password..."
                className="input input-bordered input-error w-full text-xs"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs text-base-content/60 block mb-1">
                Type <span className="font-mono font-bold text-error">{REQUIRED_TEXT}</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={REQUIRED_TEXT}
                className="input input-bordered input-error w-full text-xs font-mono"
              />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
            <button
              type="submit"
              disabled={loading || (isCustomUser ? !password : confirmInput !== REQUIRED_TEXT)}
              className="btn btn-error text-white font-bold btn-sm rounded-xl flex items-center gap-1 cursor-pointer"
            >
              {loading ? <span className="loading loading-spinner loading-xs" /> : <UserX className="w-4 h-4" />}
              {loading ? 'Deleting...' : 'Delete My Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
