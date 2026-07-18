import React, { useState } from 'react';
import { CreditCard, Tag, Calendar, Plus, Calculator } from 'lucide-react';
import { CustomKeypad } from '../CustomKeypad';
import { AccountSelector } from '../AccountSelector';
import { CategorySelector } from '../CategorySelector';
import DateTimePickerModal from '../DateTimePickerModal';
import AddCategoryModal from './AddCategoryModal';
import AddAccountModal from './AddAccountModal';

export default function FormModal({
  type,
  setType,
  amount,
  setAmount,
  currency,
  setCurrency,
  accountId,
  setAccountId,
  accountName,
  setAccountName,
  toAccountId,
  setToAccountId,
  toAccountName,
  setToAccountName,
  categoryId,
  setCategoryId,
  categoryName,
  setCategoryName,
  note,
  setNote,
  description,
  setDescription,
  shouldConvert,
  setShouldConvert,
  exchangeRate,
  setExchangeRate,
  date,
  setDate,
  error,
  setError,
  loading,
  editMode,
  editingId,
  accounts,
  categories,
  user,
  handleSaveTransaction,
  handleCreateCategory,
  handleSaveCustomAccount,
  handleDeleteTransaction,
  getNoteSuggestions
}) {
  // Modal display toggles internalized inside FormModal
  const [showKeypad, setShowKeypad] = useState(false);
  const [showAccountSheet, setShowAccountSheet] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [selectingAccountType, setSelectingAccountType] = useState('source'); // 'source' | 'destination'
  
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  return (
    <>
      <dialog
        id="add_transaction_modal"
        className="modal modal-bottom sm:modal-middle"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.currentTarget.close();
          }
        }}
      >
        <div className={`modal-box bg-base-300 border border-base-content/10 p-0 relative overflow-hidden text-base-content rounded-2xl shadow-2xl transition-all duration-300 ${
          showKeypad || showAccountSheet || showCategorySheet ? 'min-h-[480px] sm:min-h-[540px]' : 'min-h-[350px]'
        }`}>
          {/* Top Tabs */}
          <div className="grid grid-cols-3 text-center border-b border-base-content/10">
            {['INCOME', 'EXPENSE', 'TRANSFER'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-3 text-xs font-bold tracking-wider transition-colors ${
                  type === t 
                    ? 'border-b-2 border-error text-error bg-base-200/50' 
                    : 'text-base-content/60 hover:text-base-content'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-4">
            {error && <div className="alert alert-error text-xs p-2 text-white bg-error border-none rounded-xl">{error}</div>}

            {/* Amount Field (Custom numeric input with calculator popup option) */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/60">Amount</span>
              </label>
              <div className="flex gap-2">
                {/* Currency selector */}
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="select select-bordered bg-base-200 border-base-content/20 text-base-content text-xs font-bold rounded-xl h-12 w-[75px] px-2 text-center"
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    paddingRight: '0.5rem',
                    textAlignLast: 'center'
                  }}
                >
                  {(() => {
                    const currenciesToShow = (user?.preferredCurrencies && user.preferredCurrencies.length > 0)
                      ? user.preferredCurrencies
                      : ['MYR', 'USD'];
                    const displayCurrencies = [...new Set([...currenciesToShow, currency])].filter(Boolean);
                    return displayCurrencies.map((curr) => (
                      <option key={curr} value={curr}>
                        {curr === 'MYR' ? 'RM' : curr === 'USD' ? 'US$' : curr}
                      </option>
                    ));
                  })()}
                </select>

                {/* Numeric input with inline Calculator shortcut */}
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input input-bordered bg-base-200 border-base-content/20 hover:border-base-content/40 text-base-content font-bold text-lg h-12 w-full pr-12 rounded-xl transition-all"
                  />
                  <button
                    type="button"
                    title="Open Calculator"
                    onClick={() => {
                      setShowKeypad(true);
                      setShowAccountSheet(false);
                      setShowCategorySheet(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-circle btn-ghost btn-sm text-base-content/60 hover:text-error"
                  >
                    <Calculator className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Conversion Details (if current currency is different from user main baseCurrency) */}
            {currency !== user?.baseCurrency && (
              <div className="bg-base-200 p-3 rounded-xl space-y-3 border border-base-content/10">
                <div className="flex justify-between items-center text-xs text-base-content/80">
                  <span>Target Base Conversion: {user?.baseCurrency}</span>
                  <input
                    type="checkbox"
                    checked={shouldConvert}
                    onChange={(e) => setShouldConvert(e.target.checked)}
                    className="checkbox checkbox-xs checkbox-error"
                  />
                </div>
                {shouldConvert && (
                  <div className="form-control">
                    <label className="label py-0">
                      <span className="label-text-alt text-base-content/50">Manual Exchange Rate (1 {currency} = ? {user?.baseCurrency})</span>
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      className="input input-xs input-bordered bg-base-300 border-base-content/20 text-base-content w-full mt-1"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Account & Category Selection Fields */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectingAccountType('source');
                  setShowAccountSheet(true);
                  setShowKeypad(false);
                  setShowCategorySheet(false);
                }}
                className="btn bg-base-200 hover:bg-base-100 text-base-content border border-base-content/20 justify-between font-semibold text-xs uppercase rounded-xl h-11 transition-all"
              >
                <CreditCard className="w-4 h-4 text-base-content/60" />
                <span className="truncate">{type === 'TRANSFER' ? `From: ${accountName}` : accountName}</span>
              </button>

              {type === 'TRANSFER' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectingAccountType('destination');
                    setShowAccountSheet(true);
                    setShowKeypad(false);
                    setShowCategorySheet(false);
                  }}
                  className="btn bg-base-200 hover:bg-base-100 text-base-content border border-base-content/20 justify-between font-semibold text-xs uppercase rounded-xl h-11 transition-all"
                >
                  <CreditCard className="w-4 h-4 text-base-content/60" />
                  <span className="truncate">{`To: ${toAccountName}`}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowCategorySheet(true);
                    setShowKeypad(false);
                    setShowAccountSheet(false);
                  }}
                  className="btn bg-base-200 hover:bg-base-100 text-base-content border border-base-content/20 justify-between font-semibold text-xs uppercase rounded-xl h-11 transition-all"
                >
                  <Tag className="w-4 h-4 text-base-content/60" />
                  <span className="truncate">{categoryName}</span>
                </button>
              )}
            </div>

            {/* Date & Time Picker */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/60 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Date & Time
                </span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowDatePicker(true);
                  setShowKeypad(false);
                  setShowCategorySheet(false);
                  setShowAccountSheet(false);
                }}
                className="input input-sm input-bordered bg-base-200 border-base-content/20 text-base-content rounded-xl h-10 px-3 w-full text-left flex items-center justify-between cursor-pointer font-semibold text-xs transition-all hover:bg-base-100"
              >
                <span>{(() => {
                  const day = date.getDate();
                  const month = date.getMonth() + 1;
                  const year = String(date.getFullYear()).slice(-2);
                  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  const wday = weekdays[date.getDay()];
                  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                  return `${month}/${day}/${year} (${wday}) ${timeStr}`;
                })()}</span>
              </button>
            </div>

            {/* Optional Note */}
            <div className="form-control">
              <div className="flex justify-between items-center mb-1">
                <label className="opacity-50 text-[10px] font-bold uppercase tracking-wider pl-1">Note</label>
                <span className="text-[10px] opacity-45 pr-1 font-semibold">{note.length}/30</span>
              </div>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={30}
                placeholder="Add notes..."
                className="input input-sm input-bordered bg-base-200 border-base-content/20 text-base-content rounded-xl h-10 px-3 w-full"
              />
              {user?.settings?.autocomplete !== false && getNoteSuggestions().length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10px] text-base-content/40 self-center mr-1">Suggestions:</span>
                  {getNoteSuggestions().map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setNote(sug)}
                      className="badge badge-error badge-outline text-[10px] py-1 px-2 hover:bg-error hover:text-white cursor-pointer transition-all duration-150 rounded-lg"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Optional Description */}
            {user?.settings?.showDescription !== false && (
              <div className="form-control">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add description..."
                  className="input input-sm input-bordered bg-base-200 border-base-content/20 text-base-content rounded-xl h-10 px-3 w-full"
                />
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex border-t border-base-content/10">
            {editMode && (
              <button
                type="button"
                onClick={async () => {
                  const deleted = await handleDeleteTransaction(editingId);
                  if (deleted) {
                    document.getElementById('add_transaction_modal').close();
                  }
                }}
                disabled={loading}
                className="btn btn-ghost text-error flex-1 rounded-none py-4 h-auto hover:bg-error hover:text-white font-bold border-r border-base-content/10"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={() => document.getElementById('add_transaction_modal').close()}
              className="btn btn-ghost flex-1 rounded-none py-4 h-auto text-base-content/60 hover:text-base-content border-r border-base-content/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTransaction}
              disabled={loading}
              className="btn bg-error hover:bg-error/80 border-none flex-1 rounded-none py-4 h-auto text-white font-bold"
            >
              {editMode ? 'Save Changes' : 'Save'}
            </button>
          </div>

          {/* Sub Keypad / Drawers Inside Modal Box */}
          {showKeypad && (
            <div className="absolute bottom-0 left-0 right-0 z-50 animate-slideUp">
              <CustomKeypad
                value={amount}
                onChange={(val) => setAmount(val)}
                onDone={() => setShowKeypad(false)}
                preferredCurrencies={user?.preferredCurrencies}
                activeCurrency={currency}
                onCurrencyChange={(curr) => setCurrency(curr)}
              />
            </div>
          )}

          {showAccountSheet && (
            <div className="absolute bottom-0 left-0 right-0 z-50 animate-slideUp">
              <AccountSelector
                accounts={accounts}
                selectedAccountId={selectingAccountType === 'source' ? accountId : toAccountId}
                onSelect={(acc) => {
                  if (selectingAccountType === 'source') {
                    setAccountId(acc._id);
                    setAccountName(acc.name);
                  } else {
                    setToAccountId(acc._id);
                    setToAccountName(acc.name);
                  }
                  setShowAccountSheet(false);
                }}
                onClose={() => setShowAccountSheet(false)}
                onAddAccount={() => {
                  setShowAddAccountModal(true);
                }}
              />
            </div>
          )}

          {showCategorySheet && (
            <div className="absolute bottom-0 left-0 right-0 z-50 animate-slideUp">
              <CategorySelector
                categories={categories.filter(cat => type === 'INCOME' ? cat.type === 'INCOME' : (cat.type === 'EXPENSE' || !cat.type))}
                selectedCategoryId={categoryId}
                onSelect={(cat) => {
                  setCategoryId(cat._id);
                  setCategoryName(cat.name);
                  setShowCategorySheet(false);
                }}
                onClose={() => setShowCategorySheet(false)}
                onAddCategory={() => {
                  setShowAddCategoryModal(true);
                }}
              />
            </div>
          )}
        </div>
        <DateTimePickerModal
          isOpen={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          value={date}
          onChange={(val) => setDate(val)}
        />

        <AddCategoryModal
          isOpen={showAddCategoryModal}
          onClose={() => setShowAddCategoryModal(false)}
          handleCreateCategory={handleCreateCategory}
        />

        <AddAccountModal
          isOpen={showAddAccountModal}
          onClose={() => setShowAddAccountModal(false)}
          handleSaveCustomAccount={handleSaveCustomAccount}
        />
      </dialog>
    </>
  );
}
