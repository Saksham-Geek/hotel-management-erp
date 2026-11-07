'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

export interface CustomDatePickerProps {
  id?: string;
  name?: string;
  value?: string; // YYYY-MM-DD
  defaultValue?: string; // YYYY-MM-DD
  onChange?: (value: string) => void;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  direction?: 'down' | 'up' | 'auto';
  'aria-label'?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function CustomDatePicker({
  id,
  name,
  value: controlledValue,
  defaultValue,
  onChange,
  min,
  max,
  placeholder = 'Select date…',
  disabled = false,
  required = false,
  className = '',
  size = 'md',
  align = 'left',
  direction = 'auto',
  'aria-label': ariaLabel,
}: CustomDatePickerProps) {
  const [internalValue, setInternalValue] = useState<string>(
    controlledValue !== undefined ? controlledValue : (defaultValue ?? '')
  );
  const [isOpen, setIsOpen] = useState(false);
  const [opensUpward, setOpensUpward] = useState(direction === 'up');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  // Selected date components or today fallback for viewing month
  const activeDate = useMemo(() => {
    if (internalValue && /^\d{4}-\d{2}-\d{2}$/.test(internalValue)) {
      const [y, m, d] = internalValue.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [internalValue]);

  const [viewYear, setViewYear] = useState<number>(activeDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(activeDate.getMonth());

  // Update view month when opened or value changed
  useEffect(() => {
    if (isOpen) {
      setViewYear(activeDate.getFullYear());
      setViewMonth(activeDate.getMonth());
    }
  }, [isOpen, activeDate]);

  // Determine direction when opened
  useEffect(() => {
    if (isOpen && containerRef.current) {
      if (direction === 'up') {
        setOpensUpward(true);
      } else if (direction === 'down') {
        setOpensUpward(false);
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpensUpward(spaceBelow < 330 && rect.top > 330);
      }
    }
  }, [isOpen, direction]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function handleSelectDate(year: number, month: number, day: number) {
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (controlledValue === undefined) {
      setInternalValue(formatted);
    }
    onChange?.(formatted);
    setIsOpen(false);
  }

  function handleClear() {
    if (controlledValue === undefined) {
      setInternalValue('');
    }
    onChange?.('');
    setIsOpen(false);
  }

  function handleToday() {
    const today = new Date();
    handleSelectDate(today.getFullYear(), today.getMonth(), today.getDate());
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  // Days matrix for current view month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      dateStr: string;
      disabled: boolean;
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateStr,
        disabled: (!!min && dateStr < min) || (!!max && dateStr > max),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        dateStr,
        disabled: (!!min && dateStr < min) || (!!max && dateStr > max),
      });
    }

    // Next month padding to fill complete grid of 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateStr,
        disabled: (!!min && dateStr < min) || (!!max && dateStr > max),
      });
    }

    return days;
  }, [viewYear, viewMonth, min, max]);

  // Formatted display text (e.g. "07 Nov 2026")
  const displayText = useMemo(() => {
    if (!internalValue) return '';
    try {
      const [y, m, d] = internalValue.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return internalValue;
    }
  }, [internalValue]);

  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  const isSmall = size === 'sm';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full ${className}`}
    >
      {/* Hidden input ensuring native HTML form action & Next.js Server Actions receive the exact YYYY-MM-DD */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={internalValue}
          required={required}
        />
      )}

      {/* Styled Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel || displayText || placeholder}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`group relative flex w-full items-center justify-between rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1222] shadow-2xs transition-all duration-150 hover:border-slate-300 dark:hover:border-white/20 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
          isSmall ? 'min-h-[36px] px-3 py-1.5 text-xs' : 'min-h-[44px] px-3.5 py-2 text-sm'
        } ${isOpen ? 'border-slate-900 ring-2 ring-slate-900/10 dark:border-white/40' : ''}`}
      >
        <div className="flex min-w-0 items-center gap-2 truncate">
          <span className="shrink-0 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 transition-colors">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <span
            className={`truncate font-semibold ${
              internalValue ? 'text-slate-900 dark:text-white' : 'text-slate-400 font-normal'
            }`}
          >
            {displayText || placeholder}
          </span>
        </div>

        <span className="shrink-0 text-[10px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors uppercase">
          {internalValue ? 'Pick' : 'Date'}
        </span>
      </button>

      {/* Luxury Themed Date Picker Floating Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${
            opensUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } z-[110] w-[280px] rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#0c1222]/95 p-3 shadow-2xl shadow-slate-950/15 backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150`}
        >
          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <span className="font-display text-xs font-bold text-slate-900 dark:text-white">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS.map((w) => (
              <span key={w} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 py-0.5">
                {w}
              </span>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, idx) => {
              const isSelected = cell.dateStr === internalValue;
              const isToday = cell.dateStr === todayStr;

              return (
                <button
                  key={`${cell.dateStr}-${idx}`}
                  type="button"
                  disabled={cell.disabled}
                  onClick={() => handleSelectDate(cell.year, cell.month, cell.day)}
                  className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-semibold transition-all ${
                    cell.disabled
                      ? 'cursor-not-allowed opacity-20 text-slate-400'
                      : isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold shadow-xs'
                      : isToday
                      ? 'bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-700'
                      : cell.isCurrentMonth
                      ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-950'
                      : 'text-slate-400 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Quick Actions Footer (Clear & Today) */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs font-bold">
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 px-1 py-0.5 rounded-lg transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="text-slate-900 hover:text-slate-700 dark:text-white dark:hover:text-slate-200 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
