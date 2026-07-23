import React, { useState } from 'react';
import { AlertOctagon, Trash2, X } from 'lucide-react';
import { useAxiosSecure } from '../../hooks/useApi';

export default function WipeDataConfirmModal({ isOpen, onClose, onSuccess }) {
  const axiosSecure = useAxiosSecure();
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const REQUIRED_TEXT = 'DELETE MY FINANCIAL DATA';

  const handleWipe = async (e) => {
    e.preventDefault();
    if (confirmInput !== REQUIRED_TEXT) {
      setErrorMsg(`Please type "${REQUIRED_TEXT}" exactly.`);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const response = await axiosSecure.delete('/api/user/wipe-data', {
        data: { confirmationText: confirmInput }
      });

      if (response.data.success) {
        onSuccess(response.data.message);
        onClose();
      }
    } catch (err) {
      console.error('Wipe error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to wipe financial data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-base-300 w-full max-w-md rounded-3xl border border-error/30 shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-base-content/10 pb-3">
          <h2 className="text-lg font-bold text-error flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-error" /> Wipe All Financial Data
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-error/10 border border-error/20 p-3 rounded-2xl text-xs text-base-content/80 space-y-1">
          <p className="font-bold text-error">Warning: This action is permanent and non-reversible!</p>
          <p>This will wipe all your transactions, accounts, categories, and cached insights. Your user login profile will remain intact.</p>
        </div>

        {errorMsg && <div className="alert alert-error text-xs p-2 text-white">{errorMsg}</div>}

        <form onSubmit={handleWipe} className="space-y-4">
          <div>
            <label className="text-xs text-base-content/60 block mb-1">
              To confirm, please type <span className="font-mono font-bold text-error">{REQUIRED_TEXT}</span> below:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={REQUIRED_TEXT}
              className="input input-bordered input-error w-full text-xs font-mono"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
            <button
              type="submit"
              disabled={loading || confirmInput !== REQUIRED_TEXT}
              className="btn btn-error text-white font-bold btn-sm rounded-xl flex items-center gap-1 cursor-pointer"
            >
              {loading ? <span className="loading loading-spinner loading-xs" /> : <Trash2 className="w-4 h-4" />}
              {loading ? 'Wiping...' : 'Wipe Data Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
