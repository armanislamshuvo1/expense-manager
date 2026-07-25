import React from 'react';
import { UserX, Mail, HelpCircle, X } from 'lucide-react';

export default function AccountDeletedModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@nexuswealthmanager.xyz?subject=Account%20Restoration%20Request&body=Hello%20Support%20Team%2C%20I%20would%20like%20to%20restore%20my%20deleted%20account.';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-base-300 w-full max-w-md rounded-3xl border border-error/40 shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-base-content/10 pb-3">
          <h2 className="text-lg font-bold text-error flex items-center gap-2">
            <UserX className="w-6 h-6 text-error" /> Account Deleted
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-error/10 border border-error/20 p-4 rounded-2xl text-xs text-base-content/90 space-y-2">
          <p className="font-bold text-error text-sm">This account has been deleted.</p>
          <p>
            Your account status is currently marked as <span className="font-mono text-error font-bold">DELETED</span>. Access to your financial records is currently restricted.
          </p>
          <p className="text-base-content/70">
            If this was done in error or you would like to restore your account and historical data, please reach out to our support team.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={handleContactSupport}
            className="btn btn-error text-white font-bold w-full rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <Mail className="w-4 h-4" /> Contact Support to Restore Account
          </button>

          <button
            onClick={onClose}
            className="btn btn-ghost text-xs text-base-content/60 w-full"
          >
            Close & Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}
