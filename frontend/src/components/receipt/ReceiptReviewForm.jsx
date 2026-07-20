import React from 'react';
import { Check, Loader2 } from 'lucide-react';

export function ReceiptReviewForm({
  parsedResult,
  setParsedResult,
  loading,
  handleApprove
}) {
  return (
    <div className="space-y-6">
      <div className="bg-success/10 border border-success/20 rounded-2xl p-4 text-center">
        <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-2 text-success">
          <Check className="w-4 h-4" />
        </div>
        <h4 className="text-xs font-black text-success uppercase tracking-wider">AI Extraction Complete</h4>
        <p className="text-[10px] opacity-60 mt-0.5">Please review the details before saving.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label text-[10px] uppercase font-bold opacity-40">Amount (MYR)</label>
            <input
              type="number"
              value={parsedResult.amount || ''}
              onChange={(e) => setParsedResult({ ...parsedResult, amount: Number(e.target.value) })}
              className="input input-bordered rounded-xl text-xs font-bold bg-base-200"
            />
          </div>
          <div className="form-control">
            <label className="label text-[10px] uppercase font-bold opacity-40">Date & Time</label>
            <input
              type="datetime-local"
              value={parsedResult.date ? (parsedResult.date.includes('T') ? parsedResult.date.substring(0, 16) : `${parsedResult.date}T12:00`) : ''}
              onChange={(e) => setParsedResult({ ...parsedResult, date: e.target.value })}
              className="input input-bordered rounded-xl text-xs font-bold bg-base-200"
            />
          </div>
        </div>

        <div className="form-control">
          <label className="label text-[10px] uppercase font-bold opacity-40">Merchant / Note</label>
          <input
            type="text"
            value={parsedResult.note || ''}
            onChange={(e) => setParsedResult({ ...parsedResult, note: e.target.value })}
            maxLength={30}
            className="input input-bordered rounded-xl text-xs font-bold bg-base-200"
          />
        </div>

        <div className="form-control">
          <label className="label text-[10px] uppercase font-bold opacity-40">Description / Details</label>
          <textarea
            value={parsedResult.description || ''}
            onChange={(e) => setParsedResult({ ...parsedResult, description: e.target.value })}
            className="textarea textarea-bordered rounded-xl text-xs bg-base-200 h-20"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setParsedResult(null)}
          className="btn btn-ghost flex-1 rounded-2xl font-bold"
        >
          Rescan
        </button>
        <button
          onClick={handleApprove}
          disabled={loading}
          className="btn btn-error flex-1 rounded-2xl text-white font-bold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Transaction'}
        </button>
      </div>
    </div>
  );
}
