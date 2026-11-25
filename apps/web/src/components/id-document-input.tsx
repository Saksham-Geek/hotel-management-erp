'use client';

import { useState, useEffect } from 'react';
import { inputCls, CustomDropdown } from './ui';

export interface IdDocumentInputProps {
  nameIdType?: string;
  nameIdNumber?: string;
  defaultIdType?: string;
  defaultIdNumber?: string;
  idType?: string;
  idNumber?: string;
  onIdTypeChange?: (idType: string) => void;
  onIdNumberChange?: (idNumber: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const ID_TYPE_OPTIONS = [
  { value: 'aadhaar', label: 'Aadhaar (Indian National ID)' },
  { value: 'passport', label: 'Passport (International Travel)' },
  { value: 'driving_license', label: 'Driving Licence' },
  { value: 'voter_id', label: 'Voter ID (Election Card)' },
  { value: 'other', label: 'Other Government ID' },
] as const;

export function IdDocumentInput({
  nameIdType = 'idType',
  nameIdNumber = 'idNumber',
  defaultIdType = 'aadhaar',
  defaultIdNumber = '',
  idType: controlledIdType,
  idNumber: controlledIdNumber,
  onIdTypeChange,
  onIdNumberChange,
  disabled = false,
  required = true,
  className = '',
}: IdDocumentInputProps) {
  const [selectedType, setSelectedType] = useState(
    controlledIdType !== undefined ? controlledIdType : defaultIdType || 'aadhaar',
  );
  const [numberValue, setNumberValue] = useState(
    controlledIdNumber !== undefined ? controlledIdNumber : defaultIdNumber || '',
  );

  // Sync controlled values
  useEffect(() => {
    if (controlledIdType !== undefined && controlledIdType !== selectedType) {
      setSelectedType(controlledIdType);
    }
  }, [controlledIdType]);

  useEffect(() => {
    if (controlledIdNumber !== undefined && controlledIdNumber !== numberValue) {
      setNumberValue(controlledIdNumber);
    }
  }, [controlledIdNumber]);

  const handleTypeChange = (newType: string) => {
    setSelectedType(newType);
    onIdTypeChange?.(newType);
    // If switching to Aadhaar and number is longer than 4 digits, trim to last 4
    if (newType.toLowerCase() === 'aadhaar' && numberValue.length > 4) {
      const trimmed = numberValue.slice(-4);
      setNumberValue(trimmed);
      onIdNumberChange?.(trimmed);
    }
  };

  const handleNumberChange = (val: string) => {
    let sanitized = val;
    if (selectedType.toLowerCase() === 'aadhaar') {
      // Aadhaar: only digits, max 4 digits
      sanitized = val.replace(/\D/g, '').slice(0, 4);
    }
    setNumberValue(sanitized);
    onIdNumberChange?.(sanitized);
  };

  const isAadhaar = selectedType.toLowerCase() === 'aadhaar';

  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      {/* Required ID Document Type */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          ID document type <span className="text-rose-500 font-bold">*</span>
        </label>
        <CustomDropdown
          name={nameIdType}
          required={required}
          disabled={disabled}
          value={selectedType}
          onChange={handleTypeChange}
          placeholder="Select identity document type…"
          options={ID_TYPE_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
        />
      </div>

      {/* Required Identity Number */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Identity number <span className="text-rose-500 font-bold">*</span>
          {isAadhaar && (
            <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400 ml-1.5">
              (Last 4 digits only)
            </span>
          )}
        </label>
        <input
          name={nameIdNumber}
          type="text"
          required={required}
          disabled={disabled}
          value={numberValue}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder={
            isAadhaar
              ? 'Last 4 digits (e.g. 1234)'
              : selectedType === 'passport'
                ? 'Passport number (e.g. Z1234567)'
                : 'Identity document number'
          }
          maxLength={isAadhaar ? 4 : 60}
          pattern={isAadhaar ? '[0-9]{4}' : undefined}
          title={isAadhaar ? 'For Aadhaar, enter exactly the last 4 digits' : undefined}
          className={`${inputCls} ${
            isAadhaar ? 'font-mono tracking-widest text-base' : ''
          }`}
        />
        {isAadhaar && (
          <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300/90 leading-tight">
            🛡️ Section 29 Aadhaar Act: Never record full 12 digits. Only store the last 4.
          </p>
        )}
      </div>
    </div>
  );
}
