import React from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';

export default function ReviewQuickLogModal({
  reviewTransaction,
  setReviewTransaction,
  accounts = [],
  categories = [],
  handleApproveQuickLog,
  reviewLoading
}) {
  if (!reviewTransaction) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-3xl border border-base-content/10 bg-base-100 p-6 shadow-2xl transition-all text-xs">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-error" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">Confirm AI Quick Log</h3>
          </div>
          <button onClick={() => setReviewTransaction(null)} className="btn btn-sm btn-circle btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label text-[10px] uppercase font-bold opacity-40">Amount</label>
              <input
                type="number"
                value={reviewTransaction.amount || ''}
                onChange={(e) => setReviewTransaction({ ...reviewTransaction, amount: Number(e.target.value) })}
                className="input input-bordered rounded-xl text-xs font-bold bg-base-200"
              />
            </div>
            <div className="form-control">
              <label className="label text-[10px] uppercase font-bold opacity-40">Date</label>
              <input
                type="date"
                value={reviewTransaction.date ? reviewTransaction.date.split('T')[0] : ''}
                onChange={(e) => setReviewTransaction({ ...reviewTransaction, date: e.target.value })}
                className="input input-bordered rounded-xl text-xs font-bold bg-base-200"
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label text-[10px] uppercase font-bold opacity-40">Merchant / Note</label>
            <input
              type="text"
              value={reviewTransaction.note || ''}
              onChange={(e) => setReviewTransaction({ ...reviewTransaction, note: e.target.value })}
              maxLength={30}
              className="input input-bordered rounded-xl text-xs font-bold bg-base-200"
            />
          </div>

          <div className="form-control">
            <label className="label text-[10px] uppercase font-bold opacity-40">Description / Details</label>
            <textarea
              value={reviewTransaction.description || ''}
              onChange={(e) => setReviewTransaction({ ...reviewTransaction, description: e.target.value })}
              className="textarea textarea-bordered rounded-xl text-xs bg-base-200 h-20"
            />
          </div>

          {reviewTransaction.type === 'TRANSFER' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label text-[10px] uppercase font-bold opacity-40">From Account</label>
                <select
                  value={reviewTransaction.accountId || ''}
                  onChange={(e) => setReviewTransaction({ ...reviewTransaction, accountId: e.target.value })}
                  className="select select-bordered select-sm rounded-xl text-xs bg-base-200"
                >
                  {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
              <div className="form-control">
                <label className="label text-[10px] uppercase font-bold opacity-40">To Account</label>
                <select
                  value={reviewTransaction.toAccountId || ''}
                  onChange={(e) => setReviewTransaction({ ...reviewTransaction, toAccountId: e.target.value })}
                  className="select select-bordered select-sm rounded-xl text-xs bg-base-200"
                >
                  {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label text-[10px] uppercase font-bold opacity-40">Account</label>
                <select
                  value={reviewTransaction.accountId || ''}
                  onChange={(e) => setReviewTransaction({ ...reviewTransaction, accountId: e.target.value })}
                  className="select select-bordered select-sm rounded-xl text-xs bg-base-200"
                >
                  {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
              <div className="form-control">
                <label className="label text-[10px] uppercase font-bold opacity-40">Category</label>
                <select
                  value={reviewTransaction.categoryId || ''}
                  onChange={(e) => setReviewTransaction({ ...reviewTransaction, categoryId: e.target.value })}
                  className="select select-bordered select-sm rounded-xl text-xs bg-base-200"
                >
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setReviewTransaction(null)}
            className="btn btn-ghost flex-1 rounded-2xl font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleApproveQuickLog}
            disabled={reviewLoading}
            className="btn btn-error flex-1 rounded-2xl text-white font-bold"
          >
            {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}
