import React, { useState } from 'react';
import { AlertCircle, Check, RefreshCw, Plus, CheckCircle, Sparkles, X } from 'lucide-react';
import { useAxiosSecure } from '../../hooks/useApi';

export default function ConflictResolutionModal({ isOpen, onClose, scanData, onImportFinished }) {
  const axiosSecure = useAxiosSecure();
  const [decisions, setDecisions] = useState({}); // { [txIdKey]: 'KEEP' | 'REPLACE' | 'DUPLICATE' }
  const [strategy, setStrategy] = useState('MERGE'); // 'MERGE' | 'OVERWRITE'
  const [committing, setCommitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !scanData) return null;

  const { conflicts = [], summary = {}, payload = {}, aiSummary = '' } = scanData;

  const setChoiceForAll = (choice) => {
    const newDecisions = {};
    conflicts.forEach(c => {
      const key = c.incoming.clientTxId || `tx_${c.incoming.date}_${c.incoming.amount}`;
      newDecisions[key] = choice;
    });
    setDecisions(newDecisions);
  };

  const handleSetItemDecision = (txIdKey, choice) => {
    setDecisions(prev => ({ ...prev, [txIdKey]: choice }));
  };

  const handleCommit = async () => {
    setCommitting(true);
    setErrorMsg('');
    try {
      const response = await axiosSecure.post('/api/sync/import-commit', {
        payload,
        decisions,
        strategy
      });

      if (response.data.success) {
        onImportFinished(response.data.results);
        onClose();
      }
    } catch (err) {
      console.error('Commit error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to complete import.');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-base-300 w-full max-w-2xl rounded-3xl border border-base-content/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-base-content/10 flex justify-between items-center bg-base-200">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning" /> Item-by-Item Conflict Resolution
            </h2>
            <p className="text-xs text-base-content/50">
              Found {conflicts.length} duplicate/conflicting transactions out of {summary.totalIncomingTransactions} items
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="alert alert-error text-xs p-3 text-white rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* AI Summary Highlight */}
          {aiSummary && (
            <div className="bg-error/10 border border-error/20 p-3 rounded-2xl flex items-start gap-2 text-xs">
              <Sparkles className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-error block mb-0.5">Gemini AI Import Intelligence</span>
                <span className="text-base-content/80">{aiSummary}</span>
              </div>
            </div>
          )}

          {/* Conflict Summary Stats */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-base-200 p-2.5 rounded-xl border border-base-content/10">
              <span className="text-[10px] text-base-content/50 block">New Items</span>
              <span className="font-bold text-success text-sm">{summary.cleanTransactionsCount}</span>
            </div>
            <div className="bg-base-200 p-2.5 rounded-xl border border-base-content/10">
              <span className="text-[10px] text-base-content/50 block">Conflicting Items</span>
              <span className="font-bold text-warning text-sm">{conflicts.length}</span>
            </div>
            <div className="bg-base-200 p-2.5 rounded-xl border border-base-content/10">
              <span className="text-[10px] text-base-content/50 block">Total Accounts</span>
              <span className="font-bold text-info text-sm">{summary.totalIncomingAccounts}</span>
            </div>
          </div>

          {/* Global Action Bar */}
          {conflicts.length > 0 && (
            <div className="bg-base-200/60 p-3 rounded-2xl border border-base-content/10 flex flex-wrap justify-between items-center gap-2">
              <span className="text-xs font-bold text-base-content/70">Quick Bulk Resolution:</span>
              <div className="flex gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setChoiceForAll('KEEP')}
                  className="btn btn-xs btn-outline btn-neutral"
                >
                  Keep All Existing
                </button>
                <button
                  type="button"
                  onClick={() => setChoiceForAll('REPLACE')}
                  className="btn btn-xs btn-outline btn-warning"
                >
                  Replace All
                </button>
                <button
                  type="button"
                  onClick={() => setChoiceForAll('DUPLICATE')}
                  className="btn btn-xs btn-outline btn-info"
                >
                  Import All as Duplicate
                </button>
              </div>
            </div>
          )}

          {/* Itemized Comparison List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/50">Conflicting Records Review</h3>
            {conflicts.length === 0 ? (
              <div className="text-center py-6 text-xs text-base-content/50">
                No transaction conflicts detected! Clean auto-merge ready.
              </div>
            ) : (
              conflicts.map((item, idx) => {
                const txKey = item.incoming.clientTxId || `tx_${item.incoming.date}_${item.incoming.amount}`;
                const currentChoice = decisions[txKey] || 'KEEP';

                return (
                  <div key={idx} className="bg-base-200/40 p-3.5 rounded-2xl border border-base-content/10 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Existing Item */}
                      <div className="p-2.5 rounded-xl bg-base-300 border border-base-content/10">
                        <span className="badge badge-xs badge-neutral text-[9px] mb-1">Current Database</span>
                        <div className="font-bold text-sm text-base-content">
                          {item.existing.currency} {item.existing.amount}
                        </div>
                        <div className="text-[10px] text-base-content/50">
                          {new Date(item.existing.date).toISOString().slice(0, 10)} • {item.existing.type}
                        </div>
                        {item.existing.description && (
                          <div className="text-[11px] text-base-content/70 truncate mt-1">{item.existing.description}</div>
                        )}
                      </div>

                      {/* Incoming Backup Item */}
                      <div className="p-2.5 rounded-xl bg-base-300 border border-warning/30">
                        <span className="badge badge-xs badge-warning text-[9px] mb-1 text-white">Incoming Backup</span>
                        <div className="font-bold text-sm text-warning">
                          {item.incoming.currency || 'MYR'} {item.incoming.amount}
                        </div>
                        <div className="text-[10px] text-base-content/50">
                          {new Date(item.incoming.date).toISOString().slice(0, 10)} • {item.incoming.type}
                        </div>
                        {(item.incoming.description || item.incoming.note) && (
                          <div className="text-[11px] text-base-content/70 truncate mt-1">{item.incoming.description || item.incoming.note}</div>
                        )}
                      </div>
                    </div>

                    {/* Per Item Choice Buttons */}
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSetItemDecision(txKey, 'KEEP')}
                        className={`btn btn-xs rounded-lg ${currentChoice === 'KEEP' ? 'btn-neutral text-white font-bold' : 'btn-ghost text-base-content/60'}`}
                      >
                        Keep Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetItemDecision(txKey, 'REPLACE')}
                        className={`btn btn-xs rounded-lg ${currentChoice === 'REPLACE' ? 'btn-warning text-white font-bold' : 'btn-ghost text-base-content/60'}`}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetItemDecision(txKey, 'DUPLICATE')}
                        className={`btn btn-xs rounded-lg ${currentChoice === 'DUPLICATE' ? 'btn-info text-white font-bold' : 'btn-ghost text-base-content/60'}`}
                      >
                        Import Duplicate
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Commit */}
        <div className="p-4 border-t border-base-content/10 bg-base-200 flex justify-between items-center">
          <button onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
          <button
            onClick={handleCommit}
            disabled={committing}
            className="btn btn-error text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg"
          >
            {committing ? <span className="loading loading-spinner loading-xs" /> : <CheckCircle className="w-4 h-4" />}
            {committing ? 'Applying Import...' : 'Confirm & Execute Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
