import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAxiosSecure } from '../hooks/useApi';
import { BottomNav } from '../components/BottomNav';
import { ArrowLeft, ChevronRight, Settings, ShieldAlert, Check, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ToggleSwitch = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onChange(!checked);
    }}
    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 focus:outline-none ${
      checked ? 'bg-error' : 'bg-base-content/20'
    }`}
  >
    <div
      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

export default function More() {
  const { user, setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();

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
        <div className="bg-base-300 rounded-2xl border border-base-content/10 p-4 shadow-lg">
          <h2 className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-error" /> Quick Preference Form
          </h2>
          <form onSubmit={handleUpdate} className="space-y-3">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/50">Base Currency</span>
              </label>
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="select select-bordered select-sm bg-base-200 border-base-content/20 text-base-content w-full"
              >
                {ALL_CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code}>{curr.name}</option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/50">Keypad Currencies</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2 p-2 bg-base-200 border border-base-content/20 rounded-lg min-h-[40px] items-center">
                {curList.length === 0 ? (
                  <span className="text-[10px] text-base-content/50">No preferred currencies. Add below.</span>
                ) : (
                  curList.map((curr) => (
                    <div key={curr} className="flex items-center gap-1 bg-base-300 border border-base-content/20 text-xs px-2.5 py-1 rounded-full text-base-content/80">
                      <span>{curr}</span>
                      <button
                        type="button"
                        onClick={() => setCurList(curList.filter((c) => c !== curr))}
                        className="text-base-content/50 hover:text-error font-bold ml-1 cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>
                  ))
                )}
              </div>
              <select
                value=""
                onChange={(e) => {
                  const newCur = e.target.value;
                  if (newCur && !curList.includes(newCur)) {
                    setCurList([...curList, newCur]);
                  }
                }}
                className="select select-bordered select-sm bg-base-200 border-base-content/20 text-base-content w-full text-xs"
              >
                <option value="">+ Add Preferred Currency...</option>
                {ALL_CURRENCIES.filter(c => !curList.includes(c.code)).map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={loading} className="btn btn-sm bg-error hover:bg-error/80 border-none text-white btn-block mt-2">
              Save Preferences
            </button>
          </form>
        </div>

        {/* Category & Repeat Settings List */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2 px-1">Category/Repeat</h2>
          <div className="bg-base-300 rounded-2xl divide-y divide-base-content/10 overflow-hidden shadow-lg border border-base-content/10">
            <button
              onClick={() => navigate('/settings/income-categories')}
              className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
            >
              <span className="text-sm font-medium text-base-content/80">Income Category Setting</span>
              <ChevronRight className="w-4 h-4 text-base-content/50" />
            </button>

            <button
              onClick={() => navigate('/settings/expense-categories')}
              className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
            >
              <span className="text-sm font-medium text-base-content/80">Expenses Category Setting</span>
              <ChevronRight className="w-4 h-4 text-base-content/50" />
            </button>

            <div 
              onClick={() => updateSettingKey('subcategoryEnabled', !settings.subcategoryEnabled)}
              className="flex justify-between items-center p-4 hover:bg-base-200 transition-colors cursor-pointer"
            >
              <span className="text-sm font-medium text-base-content/80">Subcategory</span>
              <ToggleSwitch checked={!!settings.subcategoryEnabled} onChange={(val) => updateSettingKey('subcategoryEnabled', val)} />
            </div>

            <button
              onClick={() => openNumberModal('budgetLimit', 'Set Monthly Budget Limit', settings.budgetLimit)}
              className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
            >
              <span className="text-sm font-medium text-base-content/80">Budget Setting</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-error">
                  {settings.budgetLimit > 0 ? `${baseCurrency} ${settings.budgetLimit}` : 'OFF'}
                </span>
                <ChevronRight className="w-4 h-4 text-base-content/50" />
              </div>
            </button>

            <button
              onClick={() => openSelectModal('repeatDefault', 'Default Repeat Setting', ['None', 'Daily', 'Weekly', 'Monthly'], settings.repeatDefault || 'None')}
              className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
            >
              <span className="text-sm font-medium text-base-content/80">Repeat Setting</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-error">{settings.repeatDefault || 'None'}</span>
                <ChevronRight className="w-4 h-4 text-base-content/50" />
              </div>
            </button>
          </div>
        </div>

        {/* Accounts Setting List */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2 px-1">Accounts</h2>
          <div className="bg-base-300 rounded-2xl divide-y divide-base-content/10 overflow-hidden shadow-lg border border-base-content/10">
            <button
              onClick={() => navigate('/settings/accounts')}
              className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
            >
              <span className="text-sm font-medium text-base-content/80">Accounts Setting</span>
              <ChevronRight className="w-4 h-4 text-base-content/50" />
            </button>
          </div>
        </div>

        {/* Configuration List */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2 px-1">Configuration</h2>
          <div className="bg-base-300 rounded-2xl divide-y divide-base-content/10 overflow-hidden shadow-lg border border-base-content/10 text-sm text-base-content/80">
            <div className="flex justify-between items-center p-4">
              <span>Main Currency Setting</span>
              <span className="text-xs font-bold text-error">{baseCurrency}</span>
            </div>
            
            <button
              onClick={() => openSelectModal('subCurrency', 'Sub Currency Setting', ALL_CURRENCIES.map(c => c.code), settings.subCurrency || 'USD')}
              className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
            >
              <span>Sub Currency Setting</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-error">{settings.subCurrency || 'USD'}</span>
                <ChevronRight className="w-4 h-4 text-base-content/50" />
              </div>
            </button>

            <button
              onClick={() => openSelectModal('startScreen', 'Start Screen Setting', ['Daily', 'Calendar'], settings.startScreen || 'Daily')}
              className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
            >
              <span>Start Screen (Daily/Calendar)</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-error">{settings.startScreen || 'Daily'}</span>
                <ChevronRight className="w-4 h-4 text-base-content/50" />
              </div>
            </button>

            <button
              onClick={() => openSelectModal('monthlyStartDate', 'Monthly Start Date', Array.from({ length: 31 }, (_, i) => String(i + 1)), String(settings.monthlyStartDate || 1))}
              className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
            >
              <span>Monthly Start Date</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-error">Every {settings.monthlyStartDate || 1}</span>
                <ChevronRight className="w-4 h-4 text-base-content/50" />
              </div>
            </button>

            <button
              onClick={() => openSelectModal('weeklyStartDay', 'Weekly Start Day', ['Sunday', 'Monday', 'Saturday'], settings.weeklyStartDay || 'Sunday')}
              className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
            >
              <span>Weekly Start Day</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-error">{settings.weeklyStartDay || 'Sunday'}</span>
                <ChevronRight className="w-4 h-4 text-base-content/50" />
              </div>
            </button>

            <div 
              onClick={() => updateSettingKey('carryOverEnabled', !settings.carryOverEnabled)}
              className="flex justify-between items-center p-4 hover:bg-base-200 transition-colors cursor-pointer"
            >
              <span>Carry-over Setting</span>
              <ToggleSwitch checked={settings.carryOverEnabled !== false} onChange={(val) => updateSettingKey('carryOverEnabled', val)} />
            </div>

            <button
              onClick={() => openSelectModal('swipeAction', 'Swipe Action Setting', ['To Change Date', 'To Change Month'], settings.swipeAction || 'To Change Date')}
              className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
            >
              <span>Swipe</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-error">{settings.swipeAction || 'To Change Date'}</span>
                <ChevronRight className="w-4 h-4 text-base-content/50" />
              </div>
            </button>

            <button
              onClick={() => openSelectModal('colorSetting', 'Color Palette Setting', ['Set. A', 'Set. B'], settings.colorSetting || 'Set. A')}
              className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
            >
              <span>Income-Expenses Color Setting</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-error">{settings.colorSetting || 'Set. A'}</span>
                <ChevronRight className="w-4 h-4 text-base-content/50" />
              </div>
            </button>

            <button
              onClick={() => openSelectModal('timeInputSetting', 'Time Input Mode', ['Input Only, Desc.', 'Always Input'], settings.timeInputSetting || 'Input Only, Desc.')
              }
              className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
            >
              <span>Time Input</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-error">{settings.timeInputSetting || 'Input Only, Desc.'}</span>
                <ChevronRight className="w-4 h-4 text-base-content/50" />
              </div>
            </button>

            <div 
              onClick={() => updateSettingKey('showDescription', !settings.showDescription)}
              className="flex justify-between items-center p-4 hover:bg-base-200 transition-colors cursor-pointer"
            >
              <span>Show description</span>
              <ToggleSwitch checked={!!settings.showDescription} onChange={(val) => updateSettingKey('showDescription', val)} />
            </div>

            <div 
              onClick={() => updateSettingKey('autocomplete', !settings.autocomplete)}
              className="flex justify-between items-center p-4 hover:bg-base-200 transition-colors cursor-pointer"
            >
              <span>Autocomplete</span>
              <ToggleSwitch checked={settings.autocomplete !== false} onChange={(val) => updateSettingKey('autocomplete', val)} />
            </div>
          </div>
        </div>

        {/* Other settings list */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2 px-1">Other</h2>
          <div className="bg-base-300 rounded-2xl divide-y divide-base-content/10 overflow-hidden shadow-lg border border-base-content/10 text-sm text-base-content/80">
            <div 
              onClick={toggleTheme}
              className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                Theme
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-error">{themeLabel}</span>
                <ChevronRight className="w-4 h-4 text-base-content/50" />
              </div>
            </div>

            <div 
              onClick={() => {
                if (settings.passcodeEnabled) {
                  updateSettingKey('passcodeEnabled', false);
                } else {
                  openPasscodeModal();
                }
              }}
              className="flex justify-between items-center p-4 hover:bg-base-200 transition-colors cursor-pointer"
            >
              <span>Passcode</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-error">
                  {settings.passcodeEnabled ? 'ON' : 'OFF'}
                </span>
                <ToggleSwitch 
                  checked={!!settings.passcodeEnabled} 
                  onChange={(val) => {
                    if (!val) {
                      updateSettingKey('passcodeEnabled', false);
                    } else {
                      openPasscodeModal();
                    }
                  }} 
                />
              </div>
            </div>

            <div 
              onClick={() => updateSettingKey('alarmEnabled', !settings.alarmEnabled)}
              className="flex justify-between items-center p-4 hover:bg-base-200 transition-colors cursor-pointer"
            >
              <span>Alarm Setting</span>
              <ToggleSwitch checked={settings.alarmEnabled !== false} onChange={(val) => updateSettingKey('alarmEnabled', val)} />
            </div>

            <div 
              onClick={() => updateSettingKey('quickAddEnabled', !settings.quickAddEnabled)}
              className="flex justify-between items-center p-4 hover:bg-base-200 transition-colors cursor-pointer"
            >
              <span>Quick add</span>
              <ToggleSwitch checked={!!settings.quickAddEnabled} onChange={(val) => updateSettingKey('quickAddEnabled', val)} />
            </div>
          </div>
        </div>

        {/* Guides & Support */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2 px-1">Guides & Help</h2>
          <div className="bg-base-300 rounded-2xl divide-y divide-base-content/10 overflow-hidden shadow-lg border border-base-content/10">
            <button
              onClick={() => navigate('/how-it-works')}
              className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
            >
              <span className="text-sm font-medium text-base-content/80 flex items-center gap-2">
                How It Works Guide
              </span>
              <ChevronRight className="w-4 h-4 text-base-content/50" />
            </button>
          </div>
        </div>

        {/* Admin Controls */}
        {user?.role === 'ADMIN' && (
          <div className="bg-base-300 rounded-2xl p-4 shadow-lg border border-error/20 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-error flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Admin Controls
              </h3>
              <p className="text-[10px] text-base-content/50">Manage locks & roles</p>
            </div>
            <button onClick={() => navigate('/admin')} className="btn btn-xs bg-error hover:bg-error/80 text-white border-none">
              Portal
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Setting Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-base-300 border border-base-content/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
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
                onClick={handleModalSave}
                className="btn btn-sm bg-error hover:bg-error/80 text-white border-none"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Passcode Configuration Modal */}
      {passcodeModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-base-300 border border-base-content/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
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
      )}

      <BottomNav />
    </div>
  );
}
