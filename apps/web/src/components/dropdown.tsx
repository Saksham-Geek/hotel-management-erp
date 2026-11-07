'use client';

import { useState, useRef, useEffect, useId, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  badge?: string;
  badgeColor?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface CustomDropdownProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: DropdownOption[];
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

export function CustomDropdown({
  id: externalId,
  name,
  value: controlledValue,
  defaultValue,
  onChange,
  options,
  placeholder = 'Select option…',
  disabled = false,
  required = false,
  className = '',
  size = 'md',
  align = 'left',
  direction = 'auto',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
}: CustomDropdownProps) {
  const autoId = useId();
  const triggerId = externalId || `dropdown-trigger-${autoId}`;
  const listboxId = `dropdown-listbox-${autoId}`;

  const [internalValue, setInternalValue] = useState<string>(
    controlledValue !== undefined ? controlledValue : (defaultValue ?? '')
  );
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [opensUpward, setOpensUpward] = useState(direction === 'up');

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const typeaheadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeaheadBufferRef = useRef<string>('');

  // Synchronize controlled value if supplied
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

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
        setOpensUpward(spaceBelow < 240 && rect.top > 240);
      }

      // Initialize active index to currently selected value or first enabled item
      const currentIdx = options.findIndex((opt) => opt.value === internalValue && !opt.disabled);
      if (currentIdx >= 0) {
        setActiveIndex(currentIdx);
      } else {
        const firstEnabled = options.findIndex((opt) => !opt.disabled);
        setActiveIndex(firstEnabled >= 0 ? firstEnabled : -1);
      }
    } else {
      setActiveIndex(-1);
    }
  }, [isOpen, direction, internalValue, options]);

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

  // Scroll active option into view when activeIndex changes
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listboxRef.current) {
      const itemsContainer = listboxRef.current.firstElementChild;
      if (itemsContainer && itemsContainer.children[activeIndex]) {
        const activeEl = itemsContainer.children[activeIndex] as HTMLElement;
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, activeIndex]);

  const selectedOption = options.find((opt) => opt.value === internalValue);

  function handleSelect(val: string) {
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    onChange?.(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  // Find next enabled option index
  function findNextEnabledIndex(startIndex: number, directionStep: 1 | -1): number {
    const count = options.length;
    if (count === 0) return -1;
    let idx = startIndex;
    for (let i = 0; i < count; i++) {
      idx = (idx + directionStep + count) % count;
      if (!options[idx]?.disabled) {
        return idx;
      }
    }
    return -1;
  }

  // Keyboard navigation handler (WAI-ARIA APG Select pattern)
  function handleKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const next = findNextEnabledIndex(activeIndex, 1);
          if (next >= 0) setActiveIndex(next);
        }
        break;
      }

      case 'ArrowUp': {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const prev = findNextEnabledIndex(activeIndex, -1);
          if (prev >= 0) setActiveIndex(prev);
        }
        break;
      }

      case 'Home': {
        if (isOpen) {
          e.preventDefault();
          const first = options.findIndex((opt) => !opt.disabled);
          if (first >= 0) setActiveIndex(first);
        }
        break;
      }

      case 'End': {
        if (isOpen) {
          e.preventDefault();
          for (let i = options.length - 1; i >= 0; i--) {
            if (!options[i]?.disabled) {
              setActiveIndex(i);
              break;
            }
          }
        }
        break;
      }

      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (isOpen) {
          if (activeIndex >= 0 && options[activeIndex] && !options[activeIndex].disabled) {
            handleSelect(options[activeIndex].value);
          } else {
            setIsOpen(false);
          }
        } else {
          setIsOpen(true);
        }
        break;
      }

      case 'Escape': {
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
        }
        break;
      }

      case 'Tab': {
        if (isOpen) {
          setIsOpen(false);
        }
        break;
      }

      default: {
        // Type-ahead navigation
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          if (typeaheadTimeoutRef.current) {
            clearTimeout(typeaheadTimeoutRef.current);
          }
          typeaheadBufferRef.current += e.key.toLowerCase();
          typeaheadTimeoutRef.current = setTimeout(() => {
            typeaheadBufferRef.current = '';
          }, 600);

          const search = typeaheadBufferRef.current;
          const matchIdx = options.findIndex(
            (opt, i) =>
              !opt.disabled &&
              opt.label.toLowerCase().startsWith(search) &&
              (isOpen ? i !== activeIndex : true)
          );

          if (matchIdx >= 0) {
            if (!isOpen) {
              setIsOpen(true);
            }
            setActiveIndex(matchIdx);
          }
        }
        break;
      }
    }
  }

  const isSmall = size === 'sm';
  const activeOption = activeIndex >= 0 ? options[activeIndex] : null;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full ${className}`}
    >
      {/* Hidden input to ensure native form submissions and server actions receive the value */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={internalValue}
          required={required}
        />
      )}

      {/* Accessible Combobox Trigger Button */}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={isOpen && activeOption ? `${listboxId}-opt-${activeOption.value}` : undefined}
        aria-label={ariaLabel || (selectedOption ? `${selectedOption.label}` : placeholder)}
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`group relative flex w-full items-center justify-between rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1222] shadow-2xs transition-all duration-150 hover:border-slate-300 dark:hover:border-white/20 focus-visible:border-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:focus-visible:ring-white dark:focus-visible:ring-offset-[#080d1a] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
          isSmall ? 'min-h-[36px] px-3 py-1.5 text-xs' : 'min-h-[44px] px-3.5 py-2.5 text-sm'
        } ${isOpen ? 'border-slate-900 ring-2 ring-slate-900/10 dark:border-white/40' : ''}`}
      >
        <div className="flex min-w-0 items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span
            className={`truncate font-semibold ${
              selectedOption ? 'text-slate-900 dark:text-white' : 'text-slate-400 font-normal'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              className={`ml-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                selectedOption.badgeColor || 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-white/10 dark:text-slate-200 dark:border-white/10'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        {/* Custom Chevron Arrow with smooth 180deg flip */}
        <span
          aria-hidden="true"
          className={`shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 group-hover:text-slate-600 dark:group-hover:text-slate-300 ${
            isOpen ? 'rotate-180 text-slate-900 dark:text-white' : ''
          }`}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {/* Floating Themed Menu Popover */}
      {isOpen && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel || placeholder}
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${
            opensUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } z-[100] max-h-64 w-full min-w-[180px] overflow-y-auto rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#0c1222]/95 p-1.5 shadow-xl shadow-slate-950/15 backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150`}
        >
          <div className="flex flex-col gap-0.5" role="presentation">
            {options.map((opt, idx) => {
              const isSelected = opt.value === internalValue;
              const isHighlighted = idx === activeIndex;
              const optionId = `${listboxId}-opt-${opt.value}`;

              return (
                <button
                  key={opt.value}
                  id={optionId}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled}
                  disabled={opt.disabled}
                  onMouseEnter={() => !opt.disabled && setActiveIndex(idx)}
                  onClick={() => handleSelect(opt.value)}
                  className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all duration-150 ${
                    opt.disabled
                      ? 'cursor-not-allowed opacity-40 text-slate-400'
                      : isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                      : isHighlighted
                      ? 'bg-slate-100 dark:bg-white/15 text-slate-950 dark:text-white ring-1 ring-slate-900/20'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2 truncate">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span className="truncate">{opt.label}</span>
                    {opt.badge && (
                      <span
                        className={`ml-1 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                          isSelected
                            ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-950'
                            : opt.badgeColor || 'bg-slate-200/70 text-slate-700 dark:bg-white/10 dark:text-slate-200'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <span className="shrink-0 text-white dark:text-slate-950 ml-2" aria-hidden="true">
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
