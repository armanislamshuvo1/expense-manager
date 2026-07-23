import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAxiosSecure } from '../hooks/useApi';
import { BottomNav } from '../components/BottomNav';
import { ArrowLeft, ChevronRight, Settings, ShieldAlert, Sun, Moon, Share2, Link, Copy, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Import modularized components

import PreferencesModal from '../components/more/PreferencesModal';
import PasscodeSettingsModal from '../components/more/PasscodeSettingsModal';
import QuickPreferenceForm from '../components/more/QuickPreferenceForm';
import SettingsSection from '../components/more/SettingsSection';

import DeviceImportExportModal from '../components/more/DeviceImportExportModal';
import ConflictResolutionModal from '../components/more/ConflictResolutionModal';
import WipeDataConfirmModal from '../components/more/WipeDataConfirmModal';
import AccountDeleteModal from '../components/more/AccountDeleteModal';

export default function More() {
  const { user, setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();

  // Data Governance modal states
  const [deviceSyncModalOpen, setDeviceSyncModalOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [wipeDataModalOpen, setWipeDataModalOpen] = useState(false);
  const [accountDeleteModalOpen, setAccountDeleteModalOpen] = useState(false);
  const [scanResultData, setScanResultData] = useState(null);

  const ALL_CURRENCIES = [
    { code: 'MYR', name: 'Malaysian Ringgit (RM)' },
    { code: 'USD', name: 'US Dollar ($)' },
    { code: 'EUR', name: 'Euro (€)' },
    { code: 'SGD', name: 'Singapore Dollar (S$)' },
    { code: 'BDT', name: 'Bangladeshi Taka (৳)' },
    { code: 'GBP', name: 'British Pound (£)' },
    { code: 'JPY', name: 'Japanese Yen (¥)' },
    { code: 'AUD', name: 'Australian Dollar (A$)' },
    { code: 'CAD', name: 'Canadian Dollar (C$)' },
    { code: 'CHF', name: 'Swiss Franc (CHF)' },
    { code: 'CNY', name: 'Chinese Yuan (¥)' },
    { code: 'INR', name: 'Indian Rupee (₹)' },
    { code: 'AED', name: 'UAE Dirham (AED)' },
    { code: 'IDR', name: 'Indonesian Rupiah (Rp)' },
    { code: 'PHP', name: 'Philippine Peso (₱)' },
    { code: 'THB', name: 'Thai Baht (฿)' },
    { code: 'KRW', name: 'South Korean Won (₩)' },
    { code: 'TWD', name: 'New Taiwan Dollar (NT$)' },
  ];

  const [baseCurrency, setBaseCurrency] = useState(user?.baseCurrency || 'MYR');
  const [curList, setCurList] = useState(user?.preferredCurrencies || []);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // Modal configuration states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalOptions, setModalOptions] = useState([]);
  const [modalValue, setModalValue] = useState('');
  const [modalType, setModalType] = useState('select');

  // Passcode setting modal states
  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [newPasscode, setNewPasscode] = useState('');
  const [passcodeConfirm, setPasscodeConfirm] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  const settings = user?.settings || {};

  const handleUpdate = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setSuccess('');

    try {
      const response = await axiosSecure.put('/api/auth/settings', {
        baseCurrency,
        preferredCurrencies: curList
      });

      if (response.data.success) {
        setUser(response.data.data);
        setSuccess('Preferences updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettingKey = async (key, val) => {
    try {
      const response = await axiosSecure.put('/api/auth/settings', {
        settings: {
          ...settings,
          [key]: val
        }
      });
      if (response.data.success) {
        setUser(response.data.data);
      }
    } catch (err) {
      console.error("Failed to update setting:", err);
    }
  };

  const handleToggleSharing = async () => {
    setLoading(true);
    setSuccess('');
    try {
      const response = await axiosSecure.post('/api/user/toggle-sharing');
      if (response.data.success) {
        setUser(response.data.data);
        setSuccess(response.data.data.isSharingEnabled ? 'Sharing enabled successfully!' : 'Sharing disabled successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateShareToken = async () => {
    setLoading(true);
    setSuccess('');
    try {
      const response = await axiosSecure.post('/api/user/regenerate-share-token');
      if (response.data.success) {
        setUser(response.data.data);
        setSuccess('Share link regenerated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openSelectModal = (key, title, options, currentVal) => {
    setModalKey(key);
    setModalTitle(title);
    setModalOptions(options);
    setModalValue(currentVal);
    setModalType('select');
    setModalOpen(true);
  };

  const openNumberModal = (key, title, currentVal) => {
    setModalKey(key);
    setModalTitle(title);
    setModalValue(currentVal || '');
    setModalType('number');
    setModalOpen(true);
  };

  const openPasscodeModal = () => {
    setNewPasscode('');
    setPasscodeConfirm('');
    setPasscodeError('');
    setPasscodeModalOpen(true);
  };

  const handleSavePasscode = async () => {
    if (newPasscode.length !== 4 || !/^\d+$/.test(newPasscode)) {
      setPasscodeError('Passcode must be a 4-digit number.');
      return;
    }
    if (newPasscode !== passcodeConfirm) {
      setPasscodeError('Passcodes do not match.');
      return;
    }
    try {
      const response = await axiosSecure.put('/api/auth/settings', {
        settings: {
          ...settings,
          passcodeEnabled: true,
          passcodeValue: newPasscode
        }
      });
      if (response.data.success) {
        setUser(response.data.data);
        setPasscodeModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      setPasscodeError('Failed to save passcode.');
    }
  };

  const handleModalSave = async () => {
    let finalVal = modalValue;
    if (modalType === 'number') {
      finalVal = Number(modalValue) || 0;
    }
    await updateSettingKey(modalKey, finalVal);
    setModalOpen(false);
  };

  const themeLabel = theme.charAt(0).toUpperCase() + theme.slice(1);

  return (
    <div className="min-h-screen bg-base-200 text-base-content pb-28 font-sans">
      {/* Header */}
      <div className="bg-base-300 p-4 flex items-center gap-4 border-b border-base-content/10">
        <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-circle text-base-content/60 hover:text-base-content">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-bold">Configuration</h1>
          <p className="text-xs text-base-content/50">Settings and Customizations</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Profile Card */}
        <div
          onClick={() => navigate('/profile')}
          className="bg-base-300 rounded-2xl border border-base-content/10 p-4 shadow-lg cursor-pointer hover:bg-base-200 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-error/20 border border-error/40 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-error">
                {(user?.name || '?').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-sm truncate">{user?.name}</h2>
              <p className="text-xs text-base-content/50 truncate">{user?.email}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-base-content/50 flex-shrink-0" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`badge badge-xs ${user?.provider === 'google' ? 'badge-primary' : 'badge-ghost'} text-[10px]`}>
              {user?.provider === 'google' ? 'Google' : 'Password'}
            </span>
          </div>
        </div>

        {success && <div className="alert alert-success text-xs p-2 text-white bg-success border-none rounded-xl">{success}</div>}

        {/* Currency Quick Update Form */}
        <QuickPreferenceForm
          baseCurrency={baseCurrency}
          setBaseCurrency={setBaseCurrency}
          curList={curList}
          setCurList={setCurList}
          ALL_CURRENCIES={ALL_CURRENCIES}
          handleUpdate={handleUpdate}
          loading={loading}
        />

        {/* AI Features List */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2 px-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-error" /> AI Assistance
          </h2>
          <div className="bg-base-300 rounded-2xl divide-y divide-base-content/10 overflow-hidden shadow-lg border border-base-content/10">
            <button
              onClick={() => navigate('/wealthbuddy')}
              className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
            >
              <span className="text-sm font-medium text-base-content/80">Chat with WealthBuddy AI</span>
              <ChevronRight className="w-4 h-4 text-base-content/50" />
            </button>
          </div>
        </div>

        {/* Settings Sections */}
        <SettingsSection
          user={user}
          settings={settings}
          baseCurrency={baseCurrency}
          theme={theme}
          themeLabel={themeLabel}
          toggleTheme={toggleTheme}
          navigate={navigate}
          updateSettingKey={updateSettingKey}
          openNumberModal={openNumberModal}
          openSelectModal={openSelectModal}
          openPasscodeModal={openPasscodeModal}
          handleToggleSharing={handleToggleSharing}
          handleRegenerateShareToken={handleRegenerateShareToken}
          loading={loading}
          setSuccess={setSuccess}
          ALL_CURRENCIES={ALL_CURRENCIES}
          onOpenDeviceSync={() => setDeviceSyncModalOpen(true)}
          onOpenWipeData={() => setWipeDataModalOpen(true)}
          onOpenDeleteAccount={() => setAccountDeleteModalOpen(true)}
        />
      </div>

      {/* Preferences Selection & Number Input Dialog Component */}
      <PreferencesModal
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        modalTitle={modalTitle}
        modalType={modalType}
        modalOptions={modalOptions}
        modalValue={modalValue}
        setModalValue={setModalValue}
        onSave={handleModalSave}
        baseCurrency={baseCurrency}
      />

      {/* Security passcode Modal Component */}
      <PasscodeSettingsModal
        passcodeModalOpen={passcodeModalOpen}
        setPasscodeModalOpen={setPasscodeModalOpen}
        newPasscode={newPasscode}
        setNewPasscode={setNewPasscode}
        passcodeConfirm={passcodeConfirm}
        setPasscodeConfirm={setPasscodeConfirm}
        passcodeError={passcodeError}
        handleSavePasscode={handleSavePasscode}
      />

      {/* Device Import, Export & PDF Reports Modal */}
      <DeviceImportExportModal
        isOpen={deviceSyncModalOpen}
        onClose={() => setDeviceSyncModalOpen(false)}
        onTriggerConflictResolution={(scanData) => {
          setScanResultData(scanData);
          setConflictModalOpen(true);
        }}
      />

      {/* Item-by-Item Interactive Conflict Resolution Modal */}
      <ConflictResolutionModal
        isOpen={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        scanData={scanResultData}
        onImportFinished={(results) => {
          setSuccess(`Import completed! ${results.importedCount || 0} imported, ${results.replacedCount || 0} replaced, ${results.skippedCount || 0} skipped.`);
          setTimeout(() => setSuccess(''), 4000);
        }}
      />

      {/* Wipe Data Modal */}
      <WipeDataConfirmModal
        isOpen={wipeDataModalOpen}
        onClose={() => setWipeDataModalOpen(false)}
        onSuccess={(msg) => {
          setSuccess(msg);
          setTimeout(() => setSuccess(''), 4000);
        }}
      />

      {/* Delete Account Modal */}
      <AccountDeleteModal
        isOpen={accountDeleteModalOpen}
        onClose={() => setAccountDeleteModalOpen(false)}
      />

      <BottomNav />
    </div>
  );
}
