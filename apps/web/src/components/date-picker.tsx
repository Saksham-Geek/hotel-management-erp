'use client';

import { useState, useRef, useEffect, useMemo, useId, type KeyboardEvent as ReactKeyboardEvent } from 'react';

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
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = [
  { short: 'Su', full: 'Sunday' },
  { short: 'Mo', full: 'Monday' },
  { short: 'Tu', full: 'Tuesday' },
  { short: 'We', full: 'Wednesday' },
  { short: 'Th', full: 'Thursday' },
  { short: 'Fr', full: 'Friday' },
  { short: 'Sa', full: 'Saturday' },
];

export function CustomDatePicker({
  id: externalId,
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
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
}: CustomDatePickerProps) {
  const autoId = useId();
  const triggerId = externalId || `datepicker-trigger-${autoId}`;
  const dialogId = `datepicker-dialog-${autoId}`;
  const headingId = `datepicker-heading-${autoId}`;

  const [internalValue, setInternalValue] = useState<string>(
    controlledValue !== undefined ? controlledValue : (defaultValue ?? '')
  );
  const [isOpen, setIsOpen] = useState(false);
  const [opensUpward, setOpensUpward] = useState(direction === 'up');

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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
  const [focusedDateStr, setFocusedDateStr] = useState<string>(
    internalValue ||
      `${activeDate.getFullYear()}-${String(activeDate.getMonth() + 1).padStart(2, '0')}-${String(activeDate.getDate()).padStart(2, '0')}`
  );

  // Update view month when opened or value changed
  useEffect(() => {
    if (isOpen) {
      setViewYear(activeDate.getFullYear());
      setViewMonth(activeDate.getMonth());
      const curStr =
        internalValue ||
        `${activeDate.getFullYear()}-${String(activeDate.getMonth() + 1).padStart(2, '0')}-${String(activeDate.getDate()).padStart(2, '0')}`;
      setFocusedDateStr(curStr);
    }
  }, [isOpen, activeDate, internalValue]);

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

  // Focus day button when focusedDateStr changes and modal is open
  useEffect(() => {
    if (isOpen && gridRef.current) {
      const btn = gridRef.current.querySelector<HTMLButtonElement>(`button[data-datestr="${focusedDateStr}"]`);
      btn?.focus();
    }
  }, [isOpen, focusedDateStr, viewMonth, viewYear]);

  function handleSelectDate(year: number, month: number, day: number) {
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (controlledValue === undefined) {
      setInternalValue(formatted);
    }
    onChange?.(formatted);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleClear() {
    if (controlledValue === undefined) {
      setInternalValue('');
    }
    onChange?.('');
    setIsOpen(false);
    triggerRef.current?.focus();
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
      weekdayName: string;
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(y, m, d).getDay();
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateStr,
        disabled: (!!min && dateStr < min) || (!!max && dateStr > max),
        weekdayName: WEEKDAYS[dayOfWeek]?.full || '',
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(viewYear, viewMonth, d).getDay();
      days.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        dateStr,
        disabled: (!!min && dateStr < min) || (!!max && dateStr > max),
        weekdayName: WEEKDAYS[dayOfWeek]?.full || '',
      });
    }

    // Next month padding to fill complete grid of 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(y, m, d).getDay();
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateStr,
        disabled: (!!min && dateStr < min) || (!!max && dateStr > max),
        weekdayName: WEEKDAYS[dayOfWeek]?.full || '',
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

  // WAI-ARIA APG Calendar Grid Keyboard Navigation
  function handleGridKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (!focusedDateStr) return;
    const [y, m, d] = focusedDateStr.split('-').map(Number);
    const currentDate = new Date(y, m - 1, d);

    let nextDate: Date | null = null;

    switch (e.key) {
      case 'ArrowLeft': {
        e.preventDefault();
        nextDate = new Date(y, m - 1, d - 1);
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        nextDate = new Date(y, m - 1, d + 1);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        nextDate = new Date(y, m - 1, d - 7);
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        nextDate = new Date(y, m - 1, d + 7);
        break;
      }
      case 'PageUp': {
        e.preventDefault();
        if (e.shiftKey) {
          nextDate = new Date(y - 1, m - 1, d);
        } else {
          nextDate = new Date(y, m - 2, d);
        }
        break;
      }
      case 'PageDown': {
        e.preventDefault();
        if (e.shiftKey) {
          nextDate = new Date(y + 1, m - 1, d);
        } else {
          nextDate = new Date(y, m, d);
        }
        break;
      }
      case 'Home': {
        e.preventDefault();
        const dayOfWeek = currentDate.getDay();
        nextDate = new Date(y, m - 1, d - dayOfWeek);
        break;
      }
      case 'End': {
        e.preventDefault();
        const dayOfWeek = currentDate.getDay();
        nextDate = new Date(y, m - 1, d + (6 - dayOfWeek));
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const cell = calendarDays.find((c) => c.dateStr === focusedDateStr);
        if (cell && !cell.disabled) {
          handleSelectDate(cell.year, cell.month, cell.day);
        }
        return;
      }
      case 'Escape': {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }
      default:
        return;
    }

    if (nextDate) {
      const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
      if (nextDate.getMonth() !== viewMonth || nextDate.getFullYear() !== viewYear) {
        setViewYear(nextDate.getFullYear());
        setViewMonth(nextDate.getMonth());
      }
      setFocusedDateStr(nextStr);
    }
  }

  const isSmall = size === 'sm';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full ${className}`}
    >
      {/* Hidden input ensuring native HTML form actions & Next.js Server Actions receive the exact YYYY-MM-DD */}
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
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? dialogId : undefined}
        aria-label={
          ariaLabel ||
          (displayText ? `${placeholder ? placeholder + ': ' : ''}${displayText}` : placeholder)
        }
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            if (!isOpen && !disabled) {
              e.preventDefault();
              setIsOpen(true);
            }
          }
        }}
        className={`group relative flex w-full items-center justify-between rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1222] shadow-2xs transition-all duration-150 hover:border-slate-300 dark:hover:border-white/20 focus-visible:border-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:focus-visible:ring-white dark:focus-visible:ring-offset-[#080d1a] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
          isSmall ? 'min-h-[36px] px-3 py-1.5 text-xs' : 'min-h-[44px] px-3.5 py-2 text-sm'
        } ${isOpen ? 'border-slate-900 ring-2 ring-slate-900/10 dark:border-white/40' : ''}`}
      >
        <div className="flex min-w-0 items-center gap-2 truncate">
          <span
            aria-hidden="true"
            className="shrink-0 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 transition-colors"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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

        <span
          aria-hidden="true"
          className="shrink-0 text-[10px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors uppercase"
        >
          {internalValue ? 'Pick' : 'Date'}
        </span>
      </button>

      {/* Luxury Themed Date Picker Floating Popover */}
      {isOpen && (
        <div
          id={dialogId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${
            opensUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } z-[110] w-[290px] rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#0c1222]/95 p-3.5 shadow-2xl shadow-slate-950/15 backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150`}
        >
          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <h2
              id={headingId}
              aria-live="polite"
              className="font-display text-xs font-bold text-slate-900 dark:text-white select-none"
            >
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>

            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Calendar Grid */}
          <div
            ref={gridRef}
            role="grid"
            aria-labelledby={headingId}
            onKeyDown={handleGridKeyDown}
            className="focus:outline-none"
          >
            {/* Weekday Row */}
            <div role="row" className="grid grid-cols-7 gap-1 text-center mb-1">
              {WEEKDAYS.map((w) => (
                <span
                  key={w.short}
                  role="columnheader"
                  aria-label={w.full}
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 py-0.5 select-none"
                >
                  {w.short}
                </span>
              ))}
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 gap-1" role="rowgroup">
              {calendarDays.map((cell, idx) => {
                const isSelected = cell.dateStr === internalValue;
                const isToday = cell.dateStr === todayStr;
                const isFocused = cell.dateStr === focusedDateStr;

                const fullDateLabel = `${cell.weekdayName}, ${cell.day} ${MONTH_NAMES[cell.month]} ${cell.year}${
                  isToday ? ', today' : ''
                }${isSelected ? ', selected' : ''}${cell.disabled ? ', disabled' : ''}`;

                return (
                  <div key={`${cell.dateStr}-${idx}`} role="gridcell" className="grid place-items-center">
                    <button
                      type="button"
                      data-datestr={cell.dateStr}
                      disabled={cell.disabled}
                      tabIndex={isFocused ? 0 : -1}
                      aria-label={fullDateLabel}
                      aria-selected={isSelected}
                      aria-current={isToday ? 'date' : undefined}
                      aria-disabled={cell.disabled}
                      onClick={() => handleSelectDate(cell.year, cell.month, cell.day)}
                      onFocus={() => setFocusedDateStr(cell.dateStr)}
                      className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-1 dark:focus-visible:ring-white ${
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
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions Footer (Clear & Today) */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs font-bold">
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 px-2 py-1 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="text-slate-900 hover:text-slate-700 dark:text-white dark:hover:text-slate-200 px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
