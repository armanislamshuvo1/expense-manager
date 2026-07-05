import React, { useState } from 'react';
import { Delete, Calculator, Check } from 'lucide-react';

export const CustomKeypad = ({ value, onChange, onDone, preferredCurrencies = ['MYR', 'USD'], activeCurrency, onCurrencyChange }) => {
  const [expression, setExpression] = useState(value || '');

  React.useEffect(() => {
    setExpression(value || '');
  }, [value]);

  const handleKeyPress = (char) => {
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
    <div className="bg-[#25252d] border-t border-gray-800 p-4 w-full select-none rounded-t-2xl shadow-2xl">
      {/* Calculator Display Screen */}
      <div className="bg-[#1e1e24] border border-gray-800 rounded-xl p-3.5 mb-3 flex justify-between items-center text-white">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Calculator Input</span>
        <span className="text-2xl font-black text-[#f05454] tracking-tight">
          {activeCurrency === 'MYR' ? 'RM' : activeCurrency} {expression || '0.00'}
        </span>
      </div>

      {/* Currency Switcher Header Row */}
      <div className="flex gap-2 mb-3 justify-center">
        {displayCurrencies.map((curr) => (
          <button
            key={curr}
            type="button"
            onClick={() => onCurrencyChange(curr)}
            className={`btn btn-sm flex-1 font-semibold text-xs py-1 px-2 border rounded-xl transition-all ${
              activeCurrency === curr 
                ? 'bg-[#f05454] border-[#f05454] text-white shadow-md shadow-[#f05454]/20' 
                : 'bg-[#1e1e24] border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            {curr === 'MYR' ? 'RM' : curr === 'USD' ? 'US$' : curr}
          </button>
        ))}
      </div>

      {/* Grid Keypad */}
      <div className="grid grid-cols-4 gap-2">
        {keypadLayout.map((row, rIndex) => (
          <React.Fragment key={rIndex}>
            {row.map((key) => {
              let btnClass = "btn bg-[#1e1e24] hover:bg-[#2c2c35] text-white border border-gray-800 text-lg font-bold h-14 rounded-xl transition-all active:scale-95";
              let content = key;

              if (key === 'DEL') {
                btnClass = "btn bg-[#1e1e24] hover:bg-[#2c2c35] text-red-500 border border-gray-800 h-14 rounded-xl transition-all active:scale-95 flex items-center justify-center";
                content = <Delete className="w-5 h-5" />;
              } else if (key === '=') {
                btnClass = "btn bg-[#f05454] hover:bg-[#d94444] text-white border border-transparent h-14 rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-[#f05454]/15";
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
        onClick={onDone}
        className="btn bg-[#f05454] hover:bg-[#d94444] border-none btn-block mt-4 py-3 h-auto font-bold text-white text-md flex gap-2 items-center justify-center rounded-xl shadow-lg shadow-[#f05454]/20 transition-all active:scale-[0.98]"
      >
        <Check className="w-5 h-5" /> Done
      </button>
    </div>
  );
};
