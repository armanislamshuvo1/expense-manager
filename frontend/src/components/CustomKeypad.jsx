import React, { useState } from 'react';
import { Delete, Calculator, Check } from 'lucide-react';

export const CustomKeypad = ({ value, onChange, onDone, preferredCurrencies = ['MYR', 'USD'], activeCurrency, onCurrencyChange }) => {
  const [expression, setExpression] = useState(value || '');

  React.useEffect(() => {
    setExpression(value || '');
  }, [value]);

  const handleKeyPress = (char) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    if (char === 'C') {
      setExpression('');
      onChange('');
    } else if (char === 'DEL') {
      const next = expression.slice(0, -1);
      setExpression(next);
      onChange(next);
    } else if (char === '=') {
      try {
        // Safe evaluation of simple math
        const sanitized = expression.replace(/[^-+*/.0-9]/g, '');
        const evaluated = Function(`"use strict"; return (${sanitized})`)();
        const result = String(Number(evaluated.toFixed(2)));
        setExpression(result);
        onChange(result);
      } catch (err) {
        // do nothing
      }
    } else {
      const next = expression + char;
      setExpression(next);
      onChange(next);
    }
  };

  const keypadLayout = [
    ['1', '2', '3', 'DEL'],
    ['4', '5', '6', '-'],
    ['7', '8', '9', '+'],
    ['/', '0', '.', '='],
  ];

  const currenciesToShow = (preferredCurrencies && preferredCurrencies.length > 0)
    ? preferredCurrencies
    : ['MYR', 'USD'];
  const displayCurrencies = [...new Set([...currenciesToShow, activeCurrency])].filter(Boolean);

  return (
    <div className="bg-base-300 border-t border-base-content/10 p-3 sm:p-4 w-full select-none rounded-t-2xl shadow-2xl">
      {/* Calculator Display Screen */}
      <div className="bg-base-200 border border-base-content/10 rounded-xl p-2.5 sm:p-3.5 mb-2 sm:mb-3 flex justify-between items-center text-base-content">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-base-content/50">Calculator Input</span>
        <span className="text-xl sm:text-2xl font-black text-error tracking-tight">
          {activeCurrency === 'MYR' ? 'RM' : activeCurrency} {expression || '0.00'}
        </span>
      </div>

      {/* Currency Switcher Header Row */}
      <div className="flex gap-1.5 sm:gap-2 mb-2 sm:mb-3 justify-center">
        {displayCurrencies.map((curr) => (
          <button
            key={curr}
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
              onCurrencyChange(curr);
            }}
            className={`btn btn-xs sm:btn-sm flex-1 font-semibold text-[10px] sm:text-xs py-1 px-2 border rounded-xl transition-all ${
              activeCurrency === curr 
                ? 'bg-error border-error text-white shadow-md shadow-error/20' 
                : 'bg-base-200 border-base-content/20 text-base-content/60 hover:text-base-content hover:border-base-content/40'
            }`}
          >
            {curr === 'MYR' ? 'RM' : curr === 'USD' ? 'US$' : curr}
          </button>
        ))}
      </div>

      {/* Grid Keypad */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {keypadLayout.map((row, rIndex) => (
          <React.Fragment key={rIndex}>
            {row.map((key) => {
              let btnClass = "btn bg-base-200 hover:bg-base-100 text-base-content border border-base-content/10 text-base sm:text-lg font-bold h-11 sm:h-14 rounded-xl transition-all active:scale-95";
              let content = key;

              if (key === 'DEL') {
                btnClass = "btn bg-base-200 hover:bg-base-100 text-error border border-base-content/10 h-11 sm:h-14 rounded-xl transition-all active:scale-95 flex items-center justify-center";
                content = <Delete className="w-5 h-5" />;
              } else if (key === '=') {
                btnClass = "btn bg-error hover:bg-error/80 text-white border border-transparent h-11 sm:h-14 rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-error/15";
                content = <Calculator className="w-5 h-5" />;
              }

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeyPress(key)}
                  className={btnClass}
                >
                  {content}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Done Button Row */}
      <button
        type="button"
        onClick={() => {
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
          onDone();
        }}
        className="btn btn-error border-none btn-block mt-3 sm:mt-4 py-2 sm:py-3 h-auto font-bold text-sm sm:text-md flex gap-2 items-center justify-center rounded-xl shadow-lg shadow-error/20 transition-all active:scale-[0.98]"
      >
        <Check className="w-5 h-5" /> Done
      </button>
    </div>
  );
};
