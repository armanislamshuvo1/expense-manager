import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAxiosSecure } from '../hooks/useApi';
import { BottomNav } from '../components/BottomNav';
import { ArrowLeft, ChevronRight, Settings, ShieldAlert, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ToggleSwitch = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onChange(!checked);
    }}
    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 focus:outline-none ${
      checked ? 'bg-[#f05454]' : 'bg-gray-700'
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
  const [modalType, setModalType] = useState('select'); // 'select' | 'number'

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

  return (
    <div className="min-h-screen bg-[#1e1e24] text-white pb-28 font-sans">
      {/* Header */}
      <div className="bg-[#15151a] p-4 flex items-center gap-4 border-b border-gray-800">
        <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-circle text-gray-400 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-bold">Configuration</h1>
          <p className="text-xs text-gray-500">Settings and Customizations</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {success && <div className="alert alert-success text-xs p-2 text-white bg-green-600 border-none rounded-xl">{success}</div>}

        {/* Currency Quick Update Form */}
        <div className="bg-[#25252d] rounded-2xl border border-gray-800 p-4 shadow-lg">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#f05454]" /> Quick Preference Form
          </h2>
          <form onSubmit={handleUpdate} className="space-y-3">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs text-gray-400">Base Currency</span>
              </label>
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="select select-bordered select-sm bg-[#1e1e24] border-gray-700 text-white w-full"
              >
                {ALL_CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code}>{curr.name}</option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs text-gray-400">Keypad Currencies</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2 p-2 bg-[#1e1e24] border border-gray-700 rounded-lg min-h-[40px] items-center">
                {curList.length === 0 ? (
                  <span className="text-[10px] text-gray-500">No preferred currencies. Add below.</span>
                ) : (
                  curList.map((curr) => (
                    <div key={curr} className="flex items-center gap-1 bg-[#25252d] border border-gray-700 text-xs px-2.5 py-1 rounded-full text-gray-200">
                      <span>{curr}</span>
                      <button
                        type="button"
                        onClick={() => setCurList(curList.filter((c) => c !== curr))}
                        className="text-gray-500 hover:text-red-500 font-bold ml-1 cursor-pointer"
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
                className="select select-bordered select-sm bg-[#1e1e24] border-gray-700 text-white w-full text-xs"
              >
                <option value="">+ Add Preferred Currency...</option>
                {ALL_CURRENCIES.filter(c => !curList.includes(c.code)).map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={loading} className="btn btn-sm bg-[#f05454] hover:bg-[#d94444] border-none text-white btn-block mt-2">
              Save Preferences
            </button>
          </form>
        </div>

        {/* Category & Repeat Settings List */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">Category/Repeat</h2>
          <div className="bg-[#25252d] rounded-2xl divide-y divide-gray-800 overflow-hidden shadow-lg border border-gray-800">
            <button
              onClick={() => navigate('/settings/income-categories')}
              className="flex justify-between items-center w-full p-4 hover:bg-[#2e2e38] transition-colors text-left"
            >
              <span className="text-sm font-medium text-gray-200">Income Category Setting</span>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>

            <button
              onClick={() => navigate('/settings/expense-categories')}
              className="flex justify-between items-center w-full p-4 hover:bg-[#2e2e38] transition-colors text-left"
            >
              <span className="text-sm font-medium text-gray-200">Expenses Category Setting</span>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>

            <div 
              onClick={() => updateSettingKey('subcategoryEnabled', !settings.subcategoryEnabled)}
              className="flex justify-between items-center p-4 hover:bg-[#2e2e38] transition-colors cursor-pointer"
            >
              <span className="text-sm font-medium text-gray-200">Subcategory</span>
              <ToggleSwitch checked={!!settings.subcategoryEnabled} onChange={(val) => updateSettingKey('subcategoryEnabled', val)} />
            </div>

            <button
              onClick={() => openNumberModal('budgetLimit', 'Set Monthly Budget Limit', settings.budgetLimit)}
              className="flex justify-between items-center w-full p-4 hover:bg-[#2e2e38] transition-colors text-left"
            >
              <span className="text-sm font-medium text-gray-200">Budget Setting</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[#f05454]">
                  {settings.budgetLimit > 0 ? `${baseCurrency} ${settings.budgetLimit}` : 'OFF'}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            </button>

            <button
              onClick={() => openSelectModal('repeatDefault', 'Default Repeat Setting', ['None', 'Daily', 'Weekly', 'Monthly'], settings.repeatDefault || 'None')}
              className="flex justify-between items-center w-full p-4 hover:bg-[#2e2e38] transition-colors text-left"
            >
              <span className="text-sm font-medium text-gray-200">Repeat Setting</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[#f05454]">{settings.repeatDefault || 'None'}</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            </button>
          </div>
        </div>

        {/* Accounts Setting List */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">Accounts</h2>
          <div className="bg-[#25252d] rounded-2xl divide-y divide-gray-800 overflow-hidden shadow-lg border border-gray-800">
            <button
              onClick={() => navigate('/settings/accounts')}
              className="flex justify-between items-center w-full p-4 hover:bg-[#2e2e38] transition-colors text-left"
            >
              <span className="text-sm font-medium text-gray-200">Accounts Setting</span>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Configuration List */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">Configuration</h2>
          <div className="bg-[#25252d] rounded-2xl divide-y divide-gray-800 overflow-hidden shadow-lg border border-gray-800 text-sm text-gray-200">
            <div className="flex justify-between items-center p-4">
              <span>Main Currency Setting</span>
              <span className="text-xs font-bold text-[#f05454]">{baseCurrency}</span>
            </div>
            
            <button
              onClick={() => openSelectModal('subCurrency', 'Sub Currency Setting', ALL_CURRENCIES.map(c => c.code), settings.subCurrency || 'USD')}
              className="flex justify-between items-center w-full p-4 hover:bg-[#2e2e38] transition-colors text-left"
            >
              <span>Sub Currency Setting</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[#f05454]">{settings.subCurrency || 'USD'}</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            </button>

            <button
              onClick={() => openSelectModal('startScreen', 'Start Screen Setting', ['Daily', 'Calendar'], settings.startScreen || 'Daily')}
              className="flex justify-between items-center w-full p-4 hover:bg-[#2e2e38] transition-colors text-left"
            >
              <span>Start Screen (Daily/Calendar)</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[#f05454]">{settings.startScreen || 'Daily'}</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            </button>

            <button
              onClick={() => openSelectModal('monthlyStartDate', 'Monthly Start Date', Array.from({ length: 31 }, (_, i) => String(i + 1)), String(settings.monthlyStartDate || 1))}
              className="flex justify-between items-center w-full p-4 hover:bg-[#2e2e38] transition-colors text-left"
            >
              <span>Monthly Start Date</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[#f05454]">Every {settings.monthlyStartDate || 1}</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            </button>

            <button
              onClick={() => openSelectModal('weeklyStartDay', 'Weekly Start Day', ['Sunday', 'Monday', 'Saturday'], settings.weeklyStartDay || 'Sunday')}
              className="flex justify-between items-center w-full p-4 hover:bg-[#2e2e38] transition-colors text-left"
            >
              <span>Weekly Start Day</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[#f05454]">{settings.weeklyStartDay || 'Sunday'}</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            </button>

            <div 
              onClick={() => updateSettingKey('carryOverEnabled', !settings.carryOverEnabled)}
              className="flex justify-between items-center p-4 hover:bg-[#2e2e38] transition-colors cursor-pointer"
            >
              <span>Carry-over Setting</span>
              <ToggleSwitch checked={settings.carryOverEnabled !== false} onChange={(val) => updateSettingKey('carryOverEnabled', val)} />
            </div>

            <button
              onClick={() => openSelectModal('swipeAction', 'Swipe Action Setting', ['To Change Date', 'To Change Month'], settings.swipeAction || 'To Change Date')}
              className="flex justify-between items-center w-full p-4 hover:bg-[#2e2e38] transition-colors text-left"
            >
              <span>Swipe</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[#f05454]">{settings.swipeAction || 'To Change Date'}</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            </button>

            <button
              onClick={() => openSelectModal('colorSetting', 'Color Palette Setting', ['Set. A', 'Set. B'], settings.colorSetting || 'Set. A')}
              className="flex justify-between items-center w-full p-4 hover:bg-[#2e2e38] transition-colors text-left"
            >
              <span>Income-Expenses Color Setting</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[#f05454]">{settings.colorSetting || 'Set. A'}</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            </button>

            <button
              onClick={() => openSelectModal('timeInputSetting', 'Time Input Mode', ['Input Only, Desc.', 'Always Input'], settings.timeInputSetting || 'Input Only, Desc.')
              }
              className="flex justify-between items-center w-full p-4 hover:bg-[#2e2e38] transition-colors text-left"
            >
              <span>Time Input</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[#f05454]">{settings.timeInputSetting || 'Input Only, Desc.'}</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            </button>

            <div 
              onClick={() => updateSettingKey('showDescription', !settings.showDescription)}
              className="flex justify-between items-center p-4 hover:bg-[#2e2e38] transition-colors cursor-pointer"
            >
              <span>Show description</span>
              <ToggleSwitch checked={!!settings.showDescription} onChange={(val) => updateSettingKey('showDescription', val)} />
            </div>

            <div 
              onClick={() => updateSettingKey('autocomplete', !settings.autocomplete)}
              className="flex justify-between items-center p-4 hover:bg-[#2e2e38] transition-colors cursor-pointer"
            >
              <span>Autocomplete</span>
              <ToggleSwitch checked={settings.autocomplete !== false} onChange={(val) => updateSettingKey('autocomplete', val)} />
            </div>
          </div>
        </div>

        {/* Other settings list */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">Other</h2>
          <div className="bg-[#25252d] rounded-2xl divide-y divide-gray-800 overflow-hidden shadow-lg border border-gray-800 text-sm text-gray-200">
            <div 
              onClick={() => {
                if (settings.passcodeEnabled) {
                  updateSettingKey('passcodeEnabled', false);
                } else {
                  openPasscodeModal();
                }
              }}
              className="flex justify-between items-center p-4 hover:bg-[#2e2e38] transition-colors cursor-pointer"
            >
              <span>Passcode</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#f05454]">
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
              className="flex justify-between items-center p-4 hover:bg-[#2e2e38] transition-colors cursor-pointer"
            >
              <span>Alarm Setting</span>
              <ToggleSwitch checked={settings.alarmEnabled !== false} onChange={(val) => updateSettingKey('alarmEnabled', val)} />
            </div>

            <div 
              onClick={() => updateSettingKey('quickAddEnabled', !settings.quickAddEnabled)}
              className="flex justify-between items-center p-4 hover:bg-[#2e2e38] transition-colors cursor-pointer"
            >
              <span>Quick add</span>
              <ToggleSwitch checked={!!settings.quickAddEnabled} onChange={(val) => updateSettingKey('quickAddEnabled', val)} />
            </div>
          </div>
        </div>

        {/* Admin Controls */}
        {user?.role === 'ADMIN' && (
          <div className="bg-[#25252d] rounded-2xl p-4 shadow-lg border border-red-950 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-red-500 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Admin Controls
              </h3>
              <p className="text-[10px] text-gray-500">Manage locks & roles</p>
            </div>
            <button onClick={() => navigate('/admin')} className="btn btn-xs bg-red-600 hover:bg-red-700 text-white border-none">
              Portal
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Setting Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#25252d] border border-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="text-md font-bold border-b border-gray-800 pb-2">{modalTitle}</h3>

            {modalType === 'select' ? (
              <div className="max-h-60 overflow-y-auto space-y-1">
                {modalOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setModalValue(opt)}
                    className={`w-full text-left py-2.5 px-3.5 rounded-xl transition-colors text-sm flex justify-between items-center ${
                      String(modalValue) === String(opt)
                        ? 'bg-[#f05454]/10 text-[#f05454] border border-[#f05454]'
                        : 'hover:bg-[#2e2e38] text-gray-300 border border-transparent'
                    }`}
                  >
                    <span>{opt}</span>
                    {String(modalValue) === String(opt) && <Check className="w-4 h-4 text-[#f05454]" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs text-gray-400">Limit Amount ({baseCurrency})</span>
                </label>
                <input
                  type="number"
                  placeholder="0 (Disabled)"
                  value={modalValue}
                  onChange={(e) => setModalValue(e.target.value)}
                  className="input input-bordered bg-[#1e1e24] border-gray-700 text-white w-full"
                  autoFocus
                />
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t border-gray-800">
              <button 
                onClick={() => setModalOpen(false)}
                className="btn btn-sm btn-ghost text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleModalSave}
                className="btn btn-sm bg-[#f05454] hover:bg-[#d94444] text-white border-none"
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
          <div className="bg-[#25252d] border border-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="text-md font-bold border-b border-gray-800 pb-2">Set Lock Passcode</h3>

            {passcodeError && (
              <div className="alert alert-error text-xs p-2 text-white bg-red-600 border-none rounded-xl">
                {passcodeError}
              </div>
            )}

            <div className="space-y-3">
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs text-gray-400">New 4-Digit Passcode</span>
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value.replace(/\D/g, ''))}
                  className="input input-bordered bg-[#1e1e24] border-gray-700 text-white text-center text-lg tracking-widest w-full font-mono"
                  autoFocus
                />
              </div>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs text-gray-400">Confirm Passcode</span>
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={passcodeConfirm}
                  onChange={(e) => setPasscodeConfirm(e.target.value.replace(/\D/g, ''))}
                  className="input input-bordered bg-[#1e1e24] border-gray-700 text-white text-center text-lg tracking-widest w-full font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-gray-800">
              <button 
                onClick={() => setPasscodeModalOpen(false)}
                className="btn btn-sm btn-ghost text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePasscode}
                className="btn btn-sm bg-[#f05454] hover:bg-[#d94444] text-white border-none"
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
