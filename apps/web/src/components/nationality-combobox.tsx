'use client';

import { useState, useRef, useEffect, useId } from 'react';
import {
  COUNTRIES,
  searchCountries,
  findCountry,
  type CountryInfo,
} from '@/lib/countries';

export interface NationalityComboboxProps {
  id?: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (nationalityName: string) => void;
  onCountrySelect?: (country: CountryInfo) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function NationalityCombobox({
  id: externalId,
  name = 'nationality',
  defaultValue = '',
  value: controlledValue,
  onChange,
  onCountrySelect,
  disabled = false,
  required = false,
  placeholder = 'Search country, code, or dial code (e.g. India, US, +91)...',
  className = '',
}: NationalityComboboxProps) {
  const autoId = useId();
  const inputId = externalId || `nationality-${autoId}`;

  const [selectedNationality, setSelectedNationality] = useState<string>(
    controlledValue !== undefined ? controlledValue : defaultValue || '',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync controlled value if changed
  useEffect(() => {
    if (controlledValue !== undefined && controlledValue !== selectedNationality) {
      setSelectedNationality(controlledValue);
    }
  }, [controlledValue]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activeCountry = findCountry(selectedNationality);
  const filteredCountries = searchCountries(searchQuery);

  const handleSelectCountry = (country: CountryInfo) => {
    setSelectedNationality(country.name);
    setSearchQuery('');
    setIsOpen(false);
    onChange?.(country.name);
    onCountrySelect?.(country);
  };

  const handleCustomInputChange = (text: string) => {
    setSearchQuery(text);
    setSelectedNationality(text);
    onChange?.(text);
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Hidden input submitted with standard form data */}
      <input type="hidden" name={name} value={selectedNationality} />

      <div className="relative flex items-center">
        {/* Left flag badge if matched */}
        {activeCountry && !isOpen && (
          <span
            className="absolute left-3.5 text-base leading-none pointer-events-none select-none z-10"
            aria-hidden="true"
          >
            {activeCountry.flag}
          </span>
        )}

        <input
          id={inputId}
          ref={inputRef}
          type="text"
          disabled={disabled}
          required={required}
          value={isOpen ? searchQuery : selectedNationality}
          onFocus={() => {
            setIsOpen(true);
            setSearchQuery(selectedNationality);
          }}
          onChange={(e) => handleCustomInputChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className={`min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c1222] py-2.5 text-sm font-medium text-slate-900 dark:text-white shadow-2xs placeholder:text-slate-400 transition duration-150 focus-visible:border-slate-900 dark:focus-visible:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:focus-visible:ring-white focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
            activeCountry && !isOpen ? 'pl-9 pr-9' : 'px-4 pr-9'
          }`}
        />

        {/* Dropdown toggle arrow / clear button */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              setIsOpen(true);
              setSearchQuery(selectedNationality);
              inputRef.current?.focus();
            }
          }}
          className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer p-1"
          title="Toggle country search"
        >
          {isOpen ? '▲' : '▼'}
        </button>
      </div>

      {/* Searchable Options Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[260px] max-w-[min(100vw-32px,420px)] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c1222] shadow-xl animate-in fade-in-50 zoom-in-95 duration-150 overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-50/70 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/10 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Search Country, Code, or Dial Code</span>
            <span>{filteredCountries.length} matches</span>
          </div>

          <ul
            role="listbox"
            className="max-h-64 overflow-y-auto p-1 text-xs divide-y divide-slate-100/50 dark:divide-white/[0.03]"
          >
            {filteredCountries.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-slate-400">
                No matching country. Press enter to keep &quot;{searchQuery}&quot;.
              </li>
            ) : (
              filteredCountries.map((c) => {
                const isSelected =
                  c.name.toLowerCase() === selectedNationality.toLowerCase() ||
                  c.demonym.toLowerCase() === selectedNationality.toLowerCase();

                return (
                  <li key={c.code}>
                    <button
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition cursor-pointer ${
                        isSelected
                          ? 'bg-slate-100 dark:bg-white/10 font-bold text-slate-900 dark:text-white'
                          : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="text-base shrink-0">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          ({c.code}) · {c.demonym}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-500 shrink-0">
                        {c.dialCode}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
