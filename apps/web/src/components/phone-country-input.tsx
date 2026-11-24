'use client';

import { useState, useRef, useEffect, useId } from 'react';
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  searchCountries,
  parsePhoneNumber,
  type CountryInfo,
} from '@/lib/countries';

export interface PhoneCountryInputProps {
  id?: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  country?: CountryInfo;
  onCountryChange?: (country: CountryInfo) => void;
  onChange?: (fullNumber: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function PhoneCountryInput({
  id: externalId,
  name = 'phone',
  defaultValue = '',
  country: controlledCountry,
  onCountryChange,
  onChange,
  required = true,
  disabled = false,
  placeholder = 'Phone number',
  className = '',
}: PhoneCountryInputProps) {
  const autoId = useId();
  const inputId = externalId || `phone-input-${autoId}`;

  // Parse initial state from defaultValue
  const initialParsed = parsePhoneNumber(defaultValue);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(
    controlledCountry || initialParsed.country || DEFAULT_COUNTRY,
  );
  const [localNumber, setLocalNumber] = useState(initialParsed.localNumber || '');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);

  // Sync with controlled country if passed from outside (e.g. Nationality selection)
  useEffect(() => {
    if (controlledCountry && controlledCountry.code !== selectedCountry.code) {
      setSelectedCountry(controlledCountry);
    }
  }, [controlledCountry]);

  // Handle outside click to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input on open
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredCountries = searchCountries(searchQuery);

  const handleSelectCountry = (country: CountryInfo) => {
    setSelectedCountry(country);
    onCountryChange?.(country);
    setIsOpen(false);
    setSearchQuery('');
    const full = localNumber ? `${country.dialCode} ${localNumber.trim()}` : '';
    onChange?.(full);
    numberInputRef.current?.focus();
  };

  const handleNumberChange = (val: string) => {
    // Only allow numbers, spaces, and hyphens in local part
    const cleaned = val.replace(/[^0-9 -]/g, '');
    setLocalNumber(cleaned);
    const full = cleaned.trim() ? `${selectedCountry.dialCode} ${cleaned.trim()}` : '';
    onChange?.(full);
  };

  // Full merged value submitted in form
  const fullPhoneNumber = localNumber.trim()
    ? `${selectedCountry.dialCode} ${localNumber.trim()}`
    : '';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Hidden input to submit full formatted international phone number to Server Action */}
      <input type="hidden" name={name} value={fullPhoneNumber} />

      <div className="flex min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c1222] shadow-2xs transition duration-150 focus-within:border-slate-900 dark:focus-within:border-white focus-within:ring-2 focus-within:ring-slate-950 dark:focus-within:ring-white focus-within:ring-offset-1">
        {/* Country Flag & Dial Code Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setIsOpen((prev) => !prev);
              setSearchQuery('');
            }
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          title={`${selectedCountry.name} (${selectedCountry.dialCode}) - Click to change country code`}
          className="flex items-center gap-1.5 px-3 py-2 border-r border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-white/5 transition rounded-l-xl cursor-pointer shrink-0"
        >
          <span className="text-base leading-none" aria-hidden="true">
            {selectedCountry.flag}
          </span>
          <span className="font-mono text-slate-600 dark:text-slate-300">
            {selectedCountry.dialCode}
          </span>
          <span className="text-[10px] text-slate-400" aria-hidden="true">
            ▼
          </span>
        </button>

        {/* Local Phone Digits Input */}
        <input
          ref={numberInputRef}
          id={inputId}
          type="tel"
          required={required}
          disabled={disabled}
          value={localNumber}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder={
            selectedCountry.code === 'IN'
              ? '98765 43210'
              : selectedCountry.code === 'US' || selectedCountry.code === 'CA'
                ? '(555) 012-3456'
                : placeholder
          }
          minLength={5}
          maxLength={18}
          className="w-full bg-transparent px-3 py-2 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {/* Searchable Country Picker Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c1222] shadow-xl animate-in fade-in-50 zoom-in-95 duration-150 overflow-hidden">
          {/* Quick Search Field in Country Dropdown */}
          <div className="p-2 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country or code (+91, US, India)..."
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
            />
          </div>

          {/* Scrollable Country List */}
          <ul
            role="listbox"
            className="max-h-60 overflow-y-auto p-1 text-xs divide-y divide-slate-100/50 dark:divide-white/[0.03]"
          >
            {filteredCountries.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-slate-400">
                No country found matching &quot;{searchQuery}&quot;
              </li>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = c.code === selectedCountry.code;
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
                          ({c.code})
                        </span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-200 shrink-0">
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
