import React from 'react';
import { Settings } from 'lucide-react';

export default function QuickPreferenceForm({
  baseCurrency,
  setBaseCurrency,
  curList,
  setCurList,
  ALL_CURRENCIES,
  handleUpdate,
  loading
}) {
  return (
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
  );
}
