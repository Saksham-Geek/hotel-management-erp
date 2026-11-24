'use client';

import { useEffect, useState, useTransition, useId, useRef } from 'react';
import { searchGuestProfiles } from './actions';
import { inputCls, selectCls } from '@/components/ui';
import { CustomDropdown } from '@/components/dropdown';
import { PhoneCountryInput } from '@/components/phone-country-input';
import { NationalityCombobox } from '@/components/nationality-combobox';
import { IdDocumentInput } from '@/components/id-document-input';
import { SecureDocumentInput } from '@/components/secure-document-input';
import { DEFAULT_COUNTRY, type CountryInfo } from '@/lib/countries';

type Guest = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  vip: boolean;
  hasIdentityDocument: boolean;
};

type NewCompanion = {
  clientKey: string;
  fullName: string;
  phone?: string;
  email?: string;
  nationality?: string;
  idType?: string;
  idNumber?: string;
};

const documentTypes = [
  ['aadhaar_masked', 'Masked Aadhaar'],
  ['passport', 'Passport'],
  ['driving_license', 'Driving licence'],
  ['voter_id', 'Voter ID'],
  ['other', 'Other identity document'],
] as const;

const identityTypes = [
  ['aadhaar', 'Aadhaar (masked)'],
  ['passport', 'Passport'],
  ['driving_license', 'Driving licence'],
  ['voter_id', 'Voter ID'],
  ['other', 'Other'],
] as const;

function IdentityUploadFields({
  prefix,
  required = false,
  defaultDocumentType = '',
}: {
  prefix: string;
  required?: boolean;
  defaultDocumentType?: string;
}) {
  return (
    <div className="mt-3 space-y-2.5 rounded-2xl border border-dashed border-slate-300 dark:border-white/20 bg-slate-50/70 dark:bg-white/[0.02] p-4 sm:col-span-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <span>📄</span> Identity document {required ? <span className="text-rose-500 font-semibold">(required)</span> : <span className="text-slate-400 font-normal">(optional)</span>}
        </p>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
          Statutory KYC
        </span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${prefix}-document-type`} className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Uploaded document type {required && <span className="text-rose-500" aria-hidden="true">*</span>}
          </label>
          <CustomDropdown
            id={`${prefix}-document-type`}
            name={`${prefix}DocumentType`}
            defaultValue={defaultDocumentType || ''}
            required={required}
            size="sm"
            placeholder={`Uploaded document type${required ? ' (required)' : ''}`}
            options={[
              { value: '', label: `Uploaded document type${required ? ' (required)' : ''}` },
              ...documentTypes.map(([value, label]) => ({ value, label })),
            ]}
            aria-label="Identity document type"
          />
        </div>

        <div>
          <label htmlFor={`${prefix}-consent-method`} className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Consent method {required && <span className="text-rose-500" aria-hidden="true">*</span>}
          </label>
          <CustomDropdown
            id={`${prefix}-consent-method`}
            name={`${prefix}ConsentMethod`}
            defaultValue="written"
            required={required}
            size="sm"
            placeholder={`Consent method${required ? ' (required)' : ' (when uploading)'}`}
            options={[
              { value: '', label: `Consent method${required ? ' (required)' : ' (when uploading)'}` },
              { value: 'written', label: 'Written' },
              { value: 'verbal', label: 'Verbal' },
              { value: 'digital', label: 'Digital' },
            ]}
            aria-label="Consent method"
          />
        </div>
      </div>

      <div>
        <SecureDocumentInput
          id={`${prefix}-file-input`}
          name={`${prefix}Documents`}
          multiple={false}
          required={required}
          label="Document file (PDF, JPEG, PNG, WebP)"
          sublabel="(Auto-compressed · max 5 MB)"
          ariaLabel="Upload identity document file"
        />
      </div>

      <div className="space-y-1.5 pt-1">
        <label htmlFor={`${prefix}-consent`} className="flex items-start gap-2 text-[11px] leading-4 text-slate-600 dark:text-slate-400 cursor-pointer">
          <input
            id={`${prefix}-consent`}
            name={`${prefix}ConsentGiven`}
            type="checkbox"
            required={required}
            defaultChecked={true}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-950 dark:border-white/20 dark:bg-white/10"
          />
          <span>Guest was informed about the purpose, agrees to storage, and was told an alternative ID may be provided.</span>
        </label>

        <label htmlFor={`${prefix}-aadhaar-masked`} className="flex items-start gap-2 text-[11px] leading-4 text-slate-600 dark:text-slate-400 cursor-pointer">
          <input
            id={`${prefix}-aadhaar-masked`}
            name={`${prefix}AadhaarMasked`}
            type="checkbox"
            defaultChecked={true}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-950 dark:border-white/20 dark:bg-white/10"
          />
          <span>If Aadhaar, first eight digits are masked.</span>
        </label>
      </div>

      <p className="text-[10px] leading-4 text-slate-500 dark:text-slate-400">
        PDF, JPEG, PNG or WebP · up to 5 MB. Aadhaar documents must be masked before upload.
      </p>
    </div>
  );
}

function CompanionCard({
  guest,
  index,
  onUpdate,
  onRemove,
}: {
  guest: NewCompanion;
  index: number;
  onUpdate: (updates: Partial<NewCompanion>) => void;
  onRemove: () => void;
}) {
  const nameId = `companion-${guest.clientKey}-name`;
  const phoneId = `companion-${guest.clientKey}-phone`;
  const emailId = `companion-${guest.clientKey}-email`;
  const nationalityId = `companion-${guest.clientKey}-nat`;
  const idTypeId = `companion-${guest.clientKey}-id-type`;
  const idNumberId = `companion-${guest.clientKey}-id-num`;

  const mappedDocType =
    guest.idType === 'aadhaar'
      ? 'aadhaar_masked'
      : guest.idType === 'passport'
      ? 'passport'
      : guest.idType === 'driving_license'
      ? 'driving_license'
      : guest.idType === 'voter_id'
      ? 'voter_id'
      : guest.idType === 'other'
      ? 'other'
      : '';

  return (
    <div className="space-y-3.5 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] p-4 sm:p-5 shadow-2xs">
      {/* Header with Companion Index & Remove Button */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white dark:bg-amber-400 dark:text-slate-950">
            {index + 1}
          </span>
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            Companion Guest #{index + 1}
          </p>
          <span className="text-[11px] text-slate-500 font-normal">
            (Sharing room with primary guest)
          </span>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          title="Remove this companion"
        >
          ✕ Remove
        </button>
      </div>

      {/* Companion Personal & ID Details */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={nameId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Full Name <span className="text-rose-500" aria-hidden="true">*</span>
          </label>
          <input
            id={nameId}
            name={`companion_${guest.clientKey}_fullName`}
            value={guest.fullName}
            onChange={(e) => onUpdate({ fullName: e.target.value })}
            required
            minLength={1}
            maxLength={120}
            placeholder="e.g. Priyadarshini Rathore"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor={phoneId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Phone Number <span className="text-rose-500" aria-hidden="true">*</span>
          </label>
          <PhoneCountryInput
            id={phoneId}
            name={`companion_${guest.clientKey}_phone`}
            defaultValue={guest.phone ?? ''}
            onChange={(phone) => onUpdate({ phone })}
            required
          />
        </div>

        <div>
          <label htmlFor={emailId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Email Address <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id={emailId}
            name={`companion_${guest.clientKey}_email`}
            value={guest.email ?? ''}
            onChange={(e) => onUpdate({ email: e.target.value })}
            type="email"
            maxLength={200}
            pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
            title="Enter a valid email address (e.g. name@domain.com)"
            placeholder="e.g. companion@example.com"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor={nationalityId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nationality <span className="text-slate-400 font-normal">(Search country or +code)</span>
          </label>
          <NationalityCombobox
            id={nationalityId}
            name={`companion_${guest.clientKey}_nationality`}
            defaultValue={guest.nationality ?? ''}
            value={guest.nationality}
            onChange={(val) => onUpdate({ nationality: val })}
            onCountrySelect={(country) => {
              onUpdate({
                nationality: country.name,
                ...(country.code !== 'IN' && guest.idType === 'aadhaar' ? { idType: 'passport' } : {}),
                ...(country.code === 'IN' && guest.idType === 'passport' ? { idType: 'aadhaar' } : {}),
              });
            }}
            placeholder="Search nationality (e.g. India, US, +1)..."
          />
        </div>

        <div className="sm:col-span-2">
          <IdDocumentInput
            nameIdType={`companion_${guest.clientKey}_idType`}
            nameIdNumber={`companion_${guest.clientKey}_idNumber`}
            defaultIdType={guest.idType || 'aadhaar'}
            idType={guest.idType}
            idNumber={guest.idNumber}
            onIdTypeChange={(idType) => onUpdate({ idType })}
            onIdNumberChange={(idNumber) => onUpdate({ idNumber })}
            required
          />
        </div>

        {/* Identity Document Section - Identical to Main Guest KYC */}
        <div className="sm:col-span-2">
          <IdentityUploadFields
            prefix={`companion_${guest.clientKey}`}
            required
            defaultDocumentType={mappedDocType}
          />
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        🔒 ID numbers are encrypted with AES-256-GCM. Identity documents are stored securely for police midnight verification and statutory compliance.
      </p>
    </div>
  );
}

function GuestSearch({
  label,
  placeholder,
  onSelect,
  excludeIds = [],
  inputId: externalInputId,
}: {
  label: string;
  placeholder: string;
  onSelect: (guest: Guest) => void;
  excludeIds?: string[];
  inputId?: string;
}) {
  const autoId = useId();
  const inputId = externalInputId || `guest-search-input-${autoId}`;
  const listboxId = `guest-search-listbox-${autoId}`;
  const liveRegionId = `guest-search-status-${autoId}`;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Guest[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [searchError, setSearchError] = useState(false);
  const [loading, startTransition] = useTransition();

  const listboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();

    if (q.length < 2) {
      setResults([]);
      setActiveIndex(-1);
      setSearchError(false);
      return;
    }

    const timer = setTimeout(
      () =>
        startTransition(async () => {
          try {
            setSearchError(false);
            const res = await searchGuestProfiles(q);
            setResults(res);
            setActiveIndex(-1);
          } catch {
            setResults([]);
            setActiveIndex(-1);
            setSearchError(true);
          }
        }),
      250,
    );

    return () => clearTimeout(timer);
  }, [query]);

  const filteredResults = results.filter(
    (guest) => !excludeIds.includes(guest.id),
  );

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex >= 0 && listboxRef.current) {
      const activeEl = listboxRef.current.children[activeIndex] as HTMLElement | undefined;
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && filteredResults[activeIndex]) {
        e.preventDefault();
        onSelect(filteredResults[activeIndex]);
        setQuery('');
        setResults([]);
        setActiveIndex(-1);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setResults([]);
      setActiveIndex(-1);
    }
  };

  const activeGuest = activeIndex >= 0 ? filteredResults[activeIndex] : null;

  return (
    <div className="relative space-y-1">
      <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </label>

      <input
        id={inputId}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={filteredResults.length > 0}
        aria-controls={filteredResults.length > 0 ? listboxId : undefined}
        aria-activedescendant={activeGuest ? `${listboxId}-opt-${activeGuest.id}` : undefined}
        aria-describedby={liveRegionId}
        className={`${inputCls} mt-1`}
      />

      {/* Screen reader live region */}
      <div id={liveRegionId} role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {loading
          ? 'Searching guest directory…'
          : filteredResults.length > 0
          ? `${filteredResults.length} matching guests found. Use up and down arrow keys to navigate.`
          : query.trim().length >= 2 && !searchError
          ? 'No matching guest profiles found.'
          : ''}
      </div>

      {loading && (
        <p className="text-xs text-muted" aria-hidden="true">
          Searching guest directory…
        </p>
      )}

      {searchError && !loading && (
        <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger" role="alert">
          Guest search is unavailable right now. Check your connection and try again.
        </p>
      )}

      {filteredResults.length > 0 && (
        <div
          ref={listboxRef}
          id={listboxId}
          className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c1222] shadow-xl z-20 absolute left-0 right-0 top-full mt-1"
          role="listbox"
          aria-label={`${label} matches`}
        >
          {filteredResults.map((guest, idx) => {
            const isHighlighted = idx === activeIndex;
            return (
              <button
                type="button"
                id={`${listboxId}-opt-${guest.id}`}
                key={guest.id}
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  onSelect(guest);
                  setQuery('');
                  setResults([]);
                  setActiveIndex(-1);
                }}
                className={`flex w-full flex-col items-start border-b border-slate-100 dark:border-white/10 px-3.5 py-2.5 text-left last:border-0 transition-colors ${
                  isHighlighted
                    ? 'bg-slate-100 dark:bg-white/10 ring-1 ring-inset ring-slate-900/20'
                    : 'hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {guest.fullName}
                  {guest.vip ? ' · VIP' : ''}
                </span>

                <span className="text-xs text-muted">
                  {[guest.phone, guest.email]
                    .filter(Boolean)
                    .join(' · ') || 'No phone or email on file'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {query.trim().length >= 2 &&
        !loading &&
        !searchError &&
        results.length === 0 && (
          <p className="text-xs text-muted" aria-hidden="true">
            No matching profile found. You can register a new guest below.
          </p>
        )}
    </div>
  );
}

export function GuestPicker() {
  const [lead, setLead] = useState<Guest | null>(null);
  const [companions, setCompanions] = useState<Guest[]>([]);
  const [newCompanions, setNewCompanions] = useState<NewCompanion[]>([]);
  const [primaryCountry, setPrimaryCountry] = useState<CountryInfo>(DEFAULT_COUNTRY);
  const [primaryNationality, setPrimaryNationality] = useState<string>('India');
  const [primaryIdType, setPrimaryIdType] = useState<string>('aadhaar');
  const [primaryIdNumber, setPrimaryIdNumber] = useState<string>('');

  const handleAddCompanion = () => {
    if (companions.length + newCompanions.length >= 19) return;
    setNewCompanions((previous) => [
      ...previous,
      {
        clientKey: crypto.randomUUID(),
        fullName: '',
        phone: '',
        email: '',
        nationality: '',
        idType: 'aadhaar',
        idNumber: '',
      },
    ]);
  };

  const handleUpdateCompanion = (clientKey: string, updates: Partial<NewCompanion>) => {
    setNewCompanions((previous) =>
      previous.map((c) => (c.clientKey === clientKey ? { ...c, ...updates } : c)),
    );
  };

  const handleRemoveCompanion = (clientKey: string) => {
    setNewCompanions((previous) => previous.filter((c) => c.clientKey !== clientKey));
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">1. Guests</h3>
          <span className="text-[10px] text-muted">
            Search by phone first
          </span>
        </div>

        <GuestSearch
          inputId="reservation-guest-search-input"
          label="Find returning guest"
          placeholder="Enter phone number, name or email…"
          onSelect={setLead}
          excludeIds={companions.map((guest) => guest.id)}
        />

        {lead ? (
          <div className="space-y-3 rounded-2xl border border-lagoon/30 bg-lagoon-tint p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{lead.fullName}</p>
                <p className="text-xs text-muted">{[lead.phone, lead.email].filter(Boolean).join(' · ')}</p>
                <p className="text-xs font-semibold text-lagoon-dark">
                  Existing profile selected{lead.hasIdentityDocument ? ' · ✓ ID on file' : ' · ⚠️ ID image required'}
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white underline cursor-pointer"
                onClick={() => setLead(null)}
              >
                Change
              </button>
              <input type="hidden" name="guestId" value={lead.id} />
            </div>
            {!lead.hasIdentityDocument && <IdentityUploadFields prefix={`existing_${lead.id}`} required />}
          </div>
        ) : (
          <div className="space-y-3.5 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] p-4 sm:p-5 shadow-2xs">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                New guest details{' '}
                <span className="font-normal text-muted">
                  (only if no matching profile exists)
                </span>
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="new-guest-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="new-guest-name"
                  name="guestName"
                  required={!lead}
                  minLength={1}
                  maxLength={120}
                  placeholder="e.g. Vikramaditya Rathore"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number <span className="text-rose-500" aria-hidden="true">*</span>
                  <span className="text-[10px] font-normal text-muted ml-1.5">
                    (Defaults to 🇮🇳 +91 · change code anytime)
                  </span>
                </label>
                <PhoneCountryInput
                  name="guestPhone"
                  country={primaryCountry}
                  onCountryChange={setPrimaryCountry}
                  required={!lead}
                />
              </div>

              <div>
                <label htmlFor="new-guest-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="new-guest-email"
                  name="guestEmail"
                  type="email"
                  maxLength={200}
                  pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                  title="Enter a valid email address (e.g. name@domain.com)"
                  placeholder="e.g. guest@example.com"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nationality <span className="text-slate-400 font-normal">(Search country or +code)</span>
                </label>
                <NationalityCombobox
                  name="guestNationality"
                  defaultValue="India"
                  value={primaryNationality}
                  onChange={setPrimaryNationality}
                  onCountrySelect={(country) => {
                    setPrimaryCountry(country);
                    if (country.code !== 'IN' && primaryIdType === 'aadhaar') {
                      setPrimaryIdType('passport');
                    } else if (country.code === 'IN' && primaryIdType === 'passport') {
                      setPrimaryIdType('aadhaar');
                    }
                  }}
                  placeholder="Search nationality (e.g. India, US, +1)..."
                />
              </div>

              <div className="sm:col-span-2">
                <IdDocumentInput
                  nameIdType="guestIdType"
                  nameIdNumber="guestIdNumber"
                  idType={primaryIdType}
                  idNumber={primaryIdNumber}
                  onIdTypeChange={setPrimaryIdType}
                  onIdNumberChange={setPrimaryIdNumber}
                  required={!lead}
                />
              </div>

              <div className="sm:col-span-2">
                <IdentityUploadFields
                  prefix="guest"
                  required={!lead}
                  defaultDocumentType={primaryIdType === 'aadhaar' ? 'aadhaar_masked' : primaryIdType}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3.5 border-t border-slate-200/80 dark:border-white/10 pt-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Other guests sharing this room
          </h4>
          <p className="text-xs text-slate-500 font-normal">
            Every adult occupant sharing the room must have identity details and KYC document recorded for police midnight beat reporting.
          </p>
        </div>

        {/* Existing returning companions */}
        {companions.map((guest) => (
          <div
            key={guest.id}
            className="space-y-2 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] p-3 text-sm shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {guest.fullName}
                </span>
                <span className="text-xs text-muted">
                  {[guest.phone, guest.email].filter(Boolean).join(' · ')}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    guest.hasIdentityDocument
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}
                >
                  {guest.hasIdentityDocument ? '✓ ID on file' : '⚠️ ID image required'}
                </span>
                <input type="hidden" name="guestIds" value={guest.id} />
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                onClick={() =>
                  setCompanions((previous) => previous.filter((item) => item.id !== guest.id))
                }
                title="Remove companion"
              >
                ✕ Remove
              </button>
            </div>

            {!guest.hasIdentityDocument && (
              <IdentityUploadFields prefix={`existing_${guest.id}`} required />
            )}
          </div>
        ))}

        {/* New registered companions with full KYC document upload */}
        {newCompanions.map((guest, index) => (
          <CompanionCard
            key={guest.clientKey}
            guest={guest}
            index={index}
            onUpdate={(updates) => handleUpdateCompanion(guest.clientKey, updates)}
            onRemove={() => handleRemoveCompanion(guest.clientKey)}
          />
        ))}

        <input
          type="hidden"
          name="newCompanions"
          value={JSON.stringify(newCompanions)}
        />

        {/* Action button to add a new companion */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {companions.length + newCompanions.length < 19 ? (
            <button
              type="button"
              onClick={handleAddCompanion}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0c1222] px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs hover:border-slate-900 dark:hover:border-white hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer"
            >
              <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {newCompanions.length === 0 ? '+ Register a new companion' : '+ Register another companion'}
            </button>
          ) : (
            <p className="text-xs text-muted">Maximum of 20 guests per reservation reached.</p>
          )}

          <span className="text-[11px] text-muted">
            All registered guests will be linked to room folio & statutory register
          </span>
        </div>

        {/* Search returning companion */}
        <div className="pt-2">
          <GuestSearch
            inputId="companion-guest-search-input"
            label="Add existing companion"
            placeholder="Search companion by phone, name or email…"
            onSelect={(guest) =>
              setCompanions((previous) =>
                previous.length + newCompanions.length >= 19 ||
                previous.some((item) => item.id === guest.id) ||
                guest.id === lead?.id
                  ? previous
                  : [...previous, guest],
              )
            }
            excludeIds={[
              ...(lead ? [lead.id] : []),
              ...companions.map((guest) => guest.id),
            ]}
          />
        </div>

        <p className="text-xs text-muted">
          All selected guests share one reservation and one consolidated bill by default.
        </p>
      </div>
    </>
  );
}
