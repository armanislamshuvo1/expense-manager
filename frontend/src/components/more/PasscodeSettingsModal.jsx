import React from 'react';

export default function PasscodeSettingsModal({
  passcodeModalOpen,
  setPasscodeModalOpen,
  newPasscode,
  setNewPasscode,
  passcodeConfirm,
  setPasscodeConfirm,
  passcodeError,
  handleSavePasscode
}) {
  if (!passcodeModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-base-300 border border-base-content/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4 text-base-content">
        <h3 className="text-md font-bold border-b border-base-content/10 pb-2">Set Lock Passcode</h3>

        {passcodeError && (
          <div className="alert alert-error text-xs p-2 text-white bg-error border-none rounded-xl">
            {passcodeError}
          </div>
        )}

        <div className="space-y-3">
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs text-base-content/50">New 4-Digit Passcode</span>
            </label>
            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value.replace(/\D/g, ''))}
              className="input input-bordered bg-base-200 border-base-content/20 text-base-content text-center text-lg tracking-widest w-full font-mono"
              autoFocus
            />
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs text-base-content/50">Confirm Passcode</span>
            </label>
            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={passcodeConfirm}
              onChange={(e) => setPasscodeConfirm(e.target.value.replace(/\D/g, ''))}
              className="input input-bordered bg-base-200 border-base-content/20 text-base-content text-center text-lg tracking-widest w-full font-mono"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-base-content/10">
          <button 
            onClick={() => setPasscodeModalOpen(false)}
            className="btn btn-sm btn-ghost text-base-content/50 hover:text-base-content"
          >
            Cancel
          </button>
          <button 
            onClick={handleSavePasscode}
            className="btn btn-sm bg-error hover:bg-error/80 text-white border-none"
          >
            Save Passcode
          </button>
        </div>
      </div>
    </div>
  );
}
