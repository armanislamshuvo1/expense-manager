import React from 'react';
import { Check } from 'lucide-react';

export default function PreferencesModal({
  modalOpen,
  setModalOpen,
  modalTitle,
  modalType,
  modalOptions,
  modalValue,
  setModalValue,
  onSave,
  baseCurrency
}) {
  if (!modalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-base-300 border border-base-content/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4 text-base-content">
        <h3 className="text-md font-bold border-b border-base-content/10 pb-2">{modalTitle}</h3>

        {modalType === 'select' ? (
          <div className="max-h-60 overflow-y-auto space-y-1">
            {modalOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setModalValue(opt)}
                className={`w-full text-left py-2.5 px-3.5 rounded-xl transition-colors text-sm flex justify-between items-center ${
                  String(modalValue) === String(opt)
                    ? 'bg-error/10 text-error border border-error'
                    : 'hover:bg-base-200 text-base-content/80 border border-transparent'
                }`}
              >
                <span>{opt}</span>
                {String(modalValue) === String(opt) && <Check className="w-4 h-4 text-error" />}
              </button>
            ))}
          </div>
        ) : (
          <div className="form-control">
            <label className="label">
              <span className="label-text text-xs text-base-content/50">Limit Amount ({baseCurrency})</span>
            </label>
            <input
              type="number"
              placeholder="0 (Disabled)"
              value={modalValue}
              onChange={(e) => setModalValue(e.target.value)}
              className="input input-bordered bg-base-200 border-base-content/20 text-base-content w-full"
              autoFocus
            />
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2 border-t border-base-content/10">
          <button 
            onClick={() => setModalOpen(false)}
            className="btn btn-sm btn-ghost text-base-content/50 hover:text-base-content"
          >
            Cancel
          </button>
          <button 
            onClick={onSave}
            className="btn btn-sm bg-error hover:bg-error/80 text-white border-none"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
