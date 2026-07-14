import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DateTimePickerModal({ isOpen, onClose, value, onChange }) {
  const [tempDate, setTempDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('date'); // 'date' | 'time'

  // Month/Year navigation state for calendar grid (defaults to selected date's month/year)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (isOpen && value) {
      const d = new Date(value);
      setTempDate(d);
      setCurrentMonth(d.getMonth());
      setCurrentYear(d.getFullYear());
      setActiveTab('date');
    }
  }, [isOpen, value]);

  if (!isOpen) return null;

  // Format header strings
  const displayYear = tempDate.getFullYear();
  const displayDateStr = tempDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const displayTimeStr = tempDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Calendar calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day) => {
    const newD = new Date(tempDate);
    newD.setFullYear(currentYear);
    newD.setMonth(currentMonth);
    newD.setDate(day);
    setTempDate(newD);
  };

  const handleTimeChange = (type, val) => {
    const newD = new Date(tempDate);
    if (type === 'hour') {
      newD.setHours(val);
    } else if (type === 'minute') {
      newD.setMinutes(val);
    }
    setTempDate(newD);
  };

  const handleOk = () => {
    onChange(tempDate);
    onClose();
  };

  // Generate calendar cells (padding + actual days)
  const cells = [];
  // Previous month padding days
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    cells.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      key: `prev-${i}`
    });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({
      day: i,
      isCurrentMonth: true,
      key: `curr-${i}`
    });
  }

  const isSelectedDay = (day, isCurrentMonth) => {
    if (!isCurrentMonth) return false;
    return tempDate.getDate() === day &&
      tempDate.getMonth() === currentMonth &&
      tempDate.getFullYear() === currentYear;
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal Dialog Card */}
      <div className="w-full max-w-[340px] bg-[#2c2c2e] rounded-3xl overflow-hidden shadow-2xl border border-white/5 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Section (Dark charcoal/grey) */}
        <div className="bg-[#1e1e20] p-5 text-white flex flex-col gap-1 border-b border-white/5">
          <div className="text-xs text-white/50 font-medium tracking-wider">
            {displayYear}
          </div>
          <div className="flex justify-between items-end">
            <button
              onClick={() => setActiveTab('date')}
              className={`text-2xl font-semibold transition-all ${activeTab === 'date' ? 'text-teal-400' : 'text-white/80 hover:text-white'}`}
            >
              {displayDateStr}
            </button>
            <button
              onClick={() => setActiveTab('time')}
              className={`text-lg font-medium transition-all px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 ${activeTab === 'time' ? 'text-teal-400 border border-teal-500/30' : 'text-white/80'}`}
            >
              {displayTimeStr}
            </button>
          </div>
        </div>

        {/* Tab Selector Icons */}
        <div className="flex justify-around bg-[#222224] border-b border-white/5 py-2 text-white/60">
          <button
            onClick={() => setActiveTab('date')}
            className={`flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold transition-all ${activeTab === 'date' ? 'bg-teal-500/10 text-teal-400' : 'hover:text-white'}`}
          >
            <CalendarIcon className="w-3.5 h-3.5" /> Date
          </button>
          <button
            onClick={() => setActiveTab('time')}
            className={`flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold transition-all ${activeTab === 'time' ? 'bg-teal-500/10 text-teal-400' : 'hover:text-white'}`}
          >
            <Clock className="w-3.5 h-3.5" /> Time
          </button>
        </div>

        {/* Content Section */}
        <div className="p-4 flex-1">
          {activeTab === 'date' ? (
            /* Calendar View */
            <div className="flex flex-col gap-2">
              {/* Month Navigator Header */}
              <div className="flex justify-between items-center px-1 mb-2">
                <span className="text-sm font-semibold text-white/90">
                  {MONTHS[currentMonth]} {currentYear}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-full hover:bg-white/5 text-white/70 active:scale-95 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-full hover:bg-white/5 text-white/70 active:scale-95 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Weekday Labels */}
              <div className="grid grid-cols-7 text-center text-xs font-medium text-white/40 mb-1">
                {WEEKDAYS.map((w, idx) => (
                  <div key={idx} className="h-6 flex items-center justify-center">
                    {w}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 text-center text-sm gap-y-1">
                {cells.map((c) => {
                  const selected = isSelectedDay(c.day, c.isCurrentMonth);
                  return (
                    <div key={c.key} className="h-8 flex items-center justify-center">
                      {c.isCurrentMonth ? (
                        <button
                          onClick={() => handleSelectDay(c.day)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-medium transition-all ${
                            selected
                              ? 'bg-teal-500 text-white font-bold scale-105 shadow-md shadow-teal-500/20'
                              : 'text-white/80 hover:bg-white/5'
                          }`}
                        >
                          {c.day}
                        </button>
                      ) : (
                        <span className="text-white/20">{c.day}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Time Selector View */
            <div className="flex flex-col items-center justify-center py-4 gap-4">
              <div className="flex items-center gap-3 text-4xl font-bold text-white">
                {/* Hour */}
                <div className="flex flex-col items-center gap-1 bg-[#1e1e20] rounded-xl p-3 border border-white/5">
                  <button 
                    onClick={() => handleTimeChange('hour', (tempDate.getHours() + 1) % 24)}
                    className="text-xs text-white/40 hover:text-white py-1 w-10 text-center transition-all"
                  >
                    ▲
                  </button>
                  <span className="w-12 text-center select-none font-mono">
                    {String(tempDate.getHours()).padStart(2, '0')}
                  </span>
                  <button 
                    onClick={() => handleTimeChange('hour', (tempDate.getHours() - 1 + 24) % 24)}
                    className="text-xs text-white/40 hover:text-white py-1 w-10 text-center transition-all"
                  >
                    ▼
                  </button>
                </div>

                <span className="text-teal-400 select-none animate-pulse">:</span>

                {/* Minute */}
                <div className="flex flex-col items-center gap-1 bg-[#1e1e20] rounded-xl p-3 border border-white/5">
                  <button 
                    onClick={() => handleTimeChange('minute', (tempDate.getMinutes() + 1) % 60)}
                    className="text-xs text-white/40 hover:text-white py-1 w-10 text-center transition-all"
                  >
                    ▲
                  </button>
                  <span className="w-12 text-center select-none font-mono">
                    {String(tempDate.getMinutes()).padStart(2, '0')}
                  </span>
                  <button 
                    onClick={() => handleTimeChange('minute', (tempDate.getMinutes() - 1 + 60) % 60)}
                    className="text-xs text-white/40 hover:text-white py-1 w-10 text-center transition-all"
                  >
                    ▼
                  </button>
                </div>
              </div>

              {/* Quick Adjustment Options */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-[240px] mt-2">
                <button
                  onClick={() => {
                    const newD = new Date(tempDate);
                    newD.setMinutes(Math.round(newD.getMinutes() / 5) * 5); // Round to nearest 5m
                    setTempDate(newD);
                  }}
                  className="btn btn-xs bg-white/5 hover:bg-white/10 text-white/80 border-none rounded-lg h-7 font-normal"
                >
                  Round to 5m
                </button>
                <button
                  onClick={() => {
                    setTempDate(new Date());
                  }}
                  className="btn btn-xs bg-white/5 hover:bg-white/10 text-white/80 border-none rounded-lg h-7 font-normal"
                >
                  Set to Now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Section */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-[#222224] border-t border-white/5">
          <button
            onClick={onClose}
            className="text-sm font-semibold text-teal-400 hover:text-teal-300 transition-colors uppercase px-3 py-1.5 rounded-lg hover:bg-white/5 active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleOk}
            className="text-sm font-semibold text-teal-400 hover:text-teal-300 transition-colors uppercase px-3 py-1.5 rounded-lg hover:bg-white/5 active:scale-95"
          >
            OK
          </button>
        </div>

      </div>
    </div>
  );
}
