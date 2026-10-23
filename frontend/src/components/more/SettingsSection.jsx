import React from 'react';
import { isNativeApp, downloadApkDirect } from '../../utils/pwaUtils';
import { ChevronRight, Sun, Moon, Share2, Link, Copy, ShieldAlert, Download, Trash2, UserX, Database } from 'lucide-react';

const ToggleSwitch = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onChange(!checked);
    }}
    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 focus:outline-none ${
      checked ? 'bg-primary-app' : 'bg-base-content/20'
    }`}
  >
    <div
      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

export default function SettingsSection({
  user,
  settings,
  baseCurrency,
  theme,
  themeLabel,
  toggleTheme,
  navigate,
  updateSettingKey,
  openNumberModal,
  openSelectModal,
  openPasscodeModal,
  handleToggleSharing,
  handleRegenerateShareToken,
  loading,
  setSuccess,
  ALL_CURRENCIES,
  onOpenDeviceSync,
  onOpenWipeData,
  onOpenDeleteAccount
}) {
  return (
    <>
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
              <span className="text-xs font-semibold text-primary-app">
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
              <span className="text-xs font-semibold text-primary-app">{settings.repeatDefault || 'None'}</span>
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
            <span className="text-xs font-semibold text-primary-app">{baseCurrency}</span>
          </div>
          
          <button
            onClick={() => openSelectModal('subCurrency', 'Sub Currency Setting', ALL_CURRENCIES.map(c => c.code), settings.subCurrency || 'USD')}
            className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
          >
            <span>Sub Currency Setting</span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-primary-app">{settings.subCurrency || 'USD'}</span>
              <ChevronRight className="w-4 h-4 text-base-content/50" />
            </div>
          </button>

          <button
            onClick={() => openSelectModal('startScreen', 'Start Screen Setting', ['Daily', 'Calendar'], settings.startScreen || 'Daily')}
            className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
          >
            <span>Start Screen (Daily/Calendar)</span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-primary-app">{settings.startScreen || 'Daily'}</span>
              <ChevronRight className="w-4 h-4 text-base-content/50" />
            </div>
          </button>

          <button
            onClick={() => openSelectModal('monthlyStartDate', 'Monthly Start Date', Array.from({ length: 31 }, (_, i) => String(i + 1)), String(settings.monthlyStartDate || 1))}
            className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
          >
            <span>Monthly Start Date</span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-primary-app">Every {settings.monthlyStartDate || 1}</span>
              <ChevronRight className="w-4 h-4 text-base-content/50" />
            </div>
          </button>

          <button
            onClick={() => openSelectModal('weeklyStartDay', 'Weekly Start Day', ['Sunday', 'Monday', 'Saturday'], settings.weeklyStartDay || 'Sunday')}
            className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
          >
            <span>Weekly Start Day</span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-primary-app">{settings.weeklyStartDay || 'Sunday'}</span>
              <ChevronRight className="w-4 h-4 text-base-content/50" />
            </div>
          </button>

          <div 
            onClick={() => updateSettingKey('carryOverEnabled', settings.carryOverEnabled !== false)}
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
              <span className="text-xs font-semibold text-primary-app">{settings.swipeAction || 'To Change Date'}</span>
              <ChevronRight className="w-4 h-4 text-base-content/50" />
            </div>
          </button>

          <button
            onClick={() => openSelectModal('colorSetting', 'Color Palette Setting', ['Set. A', 'Set. B'], settings.colorSetting || 'Set. A')}
            className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
          >
            <span>Income-Expenses Color Setting</span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-primary-app">{settings.colorSetting || 'Set. A'}</span>
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
              <span className="text-xs font-semibold text-primary-app">{settings.timeInputSetting || 'Input Only, Desc.'}</span>
              <ChevronRight className="w-4 h-4 text-base-content/50" />
            </div>
          </button>

          <div 
            onClick={() => updateSettingKey('showDescription', settings.showDescription === false)}
            className="flex justify-between items-center p-4 hover:bg-base-200 transition-colors cursor-pointer"
          >
            <span>Show description</span>
            <ToggleSwitch checked={settings.showDescription !== false} onChange={(val) => updateSettingKey('showDescription', val)} />
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
              <span className="text-xs font-semibold text-primary-app">{themeLabel}</span>
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
              <span className="text-xs font-semibold text-primary-app">
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

      {/* Share Dashboard */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2 px-1">Share Stats & Logs</h2>
        <div className="bg-base-300 rounded-2xl border border-base-content/10 p-4 shadow-lg space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="font-medium text-base-content/80 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-secondary-app" /> Enable Public Link
            </span>
            <ToggleSwitch checked={!!user?.isSharingEnabled} onChange={handleToggleSharing} />
          </div>

          {user?.isSharingEnabled && user?.shareToken && (
            <div className="space-y-2 pt-2 border-t border-base-content/10">
              <p className="text-xs text-base-content/50">
                Anyone with this link can view your cash flow, net worth, and transaction logs in read-only mode.
              </p>
              <div className="flex items-center gap-2 bg-base-200 border border-base-content/20 rounded-lg p-2 overflow-hidden">
                <Link className="w-4 h-4 text-base-content/40 flex-shrink-0" />
                <span className="text-xs text-base-content/70 select-all truncate flex-1 font-mono">
                  {window.location.origin}/shared/{user.shareToken}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/shared/${user.shareToken}`);
                    setSuccess('Copied share link to clipboard!');
                    setTimeout(() => setSuccess(''), 3000);
                  }}
                  className="btn btn-ghost btn-xs btn-square text-base-content/60 hover:text-base-content cursor-pointer"
                  title="Copy Link"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleRegenerateShareToken}
                className="btn btn-xs btn-outline border-secondary-app text-secondary-app hover:bg-secondary-app hover:text-white w-full mt-1 cursor-pointer"
              >
                Regenerate Share Link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Data & Device Management */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2 px-1 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-primary-app" /> Data & Device Governance
        </h2>
        <div className="bg-base-300 rounded-2xl divide-y divide-base-content/10 overflow-hidden shadow-lg border border-base-content/10">
          <button
            type="button"
            onClick={onOpenDeviceSync}
            className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
          >
            <div>
              <span className="text-sm font-medium text-base-content/80 flex items-center gap-2">
                <Download className="w-4 h-4 text-primary-app" /> Device Import, Export & PDF Reports
              </span>
              <span className="text-[10px] text-base-content/50 block pl-6">Backup, restore, XLSX, PDF reports & Money Manager files</span>
            </div>
            <ChevronRight className="w-4 h-4 text-base-content/50" />
          </button>

          <button
            type="button"
            onClick={onOpenWipeData}
            className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
          >
            <div>
              <span className="text-sm font-medium text-warning flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-warning" /> Wipe All Financial Data
              </span>
              <span className="text-[10px] text-base-content/50 block pl-6">Reset transactions, accounts & categories</span>
            </div>
            <ChevronRight className="w-4 h-4 text-base-content/50" />
          </button>

          <button
            type="button"
            onClick={onOpenDeleteAccount}
            className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left"
          >
            <div>
              <span className="text-sm font-medium text-danger-app flex items-center gap-2">
                <UserX className="w-4 h-4 text-danger-app" /> Delete Account
              </span>
              <span className="text-[10px] text-base-content/50 block pl-6">Soft delete user profile & restrict login access</span>
            </div>
            <ChevronRight className="w-4 h-4 text-base-content/50" />
          </button>
        </div>
      </div>

      {/* Guides & Support */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2 px-1">Guides & Help</h2>
        <div className="bg-base-300 rounded-2xl divide-y divide-base-content/10 overflow-hidden shadow-lg border border-base-content/10">
          {!isNativeApp() && (
            <button
              type="button"
              onClick={downloadApkDirect}
              className="flex justify-between items-center w-full p-4 hover:bg-base-200 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-primary-app" />
                <div>
                  <span className="text-sm font-medium text-base-content/90 block">Download Android APK</span>
                  <span className="text-[10px] text-base-content/50 block">Install the full native Android app</span>
                </div>
              </div>
              <span className="badge badge-primary badge-sm font-bold text-[10px]">APK</span>
            </button>
          )}
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
        <div className="bg-base-300 rounded-2xl p-4 shadow-lg border border-secondary-app/20 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm text-error flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Admin Controls
            </h3>
            <p className="text-[10px] text-base-content/50">Manage locks & roles</p>
          </div>
          <button onClick={() => navigate('/admin')} className="btn btn-xs bg-secondary-app hover:bg-indigo-600 text-white border-none">
            Portal
          </button>
        </div>
      )}
    </>
  );
}
