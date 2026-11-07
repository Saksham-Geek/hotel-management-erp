'use client';

import { useEffect, useState, useTransition, useId, useRef } from 'react';
import { searchGuestProfiles } from './actions';
import { CustomDropdown, inputCls, selectCls } from '@/components/ui';

type Guest = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  vip: boolean;
  hasIdentityDocument: boolean;
};

type NewCompanion = {
  clientKey?: string;
  fullName: string;
  phone?: string;
  email?: string;
  nationality?: string;
  idType?: string;
  idNumber?: string;
};

const emptyCompanion: NewCompanion = { fullName: '' };

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

function IdentityUploadFields({ prefix, required = false }: { prefix: string; required?: boolean }) {
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-dashed border-line bg-surface p-3 sm:col-span-2">
      <p className="text-xs font-semibold text-ink">Identity document {required ? '(required)' : '(optional)'}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <CustomDropdown
          name={`${prefix}DocumentType`}
          defaultValue=""
          required={required}
          size="sm"
          placeholder={`Uploaded document type${required ? ' (required)' : ''}`}
          options={[
            { value: '', label: `Uploaded document type${required ? ' (required)' : ''}` },
            ...documentTypes.map(([value, label]) => ({ value, label })),
          ]}
          aria-label="Identity document type"
        />
        <CustomDropdown
          name={`${prefix}ConsentMethod`}
          defaultValue=""
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
      <input name={`${prefix}Documents`} type="file" accept="image/jpeg,image/png,image/webp" required={required} aria-label="Upload identity document" className="block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-ground file:px-3 file:py-2 file:text-xs file:font-semibold" />
      <label className="flex items-start gap-2 text-[11px] leading-4 text-muted"><input name={`${prefix}ConsentGiven`} type="checkbox" required={required} className="mt-0.5 h-4 w-4" /> Guest was informed about the purpose, agrees to storage, and was told an alternative ID may be provided.</label>
      <label className="flex items-start gap-2 text-[11px] leading-4 text-muted"><input name={`${prefix}AadhaarMasked`} type="checkbox" className="mt-0.5 h-4 w-4" /> If Aadhaar, first eight digits are masked.</label>
      <p className="text-[10px] leading-4 text-muted">JPEG, PNG or WebP · up to 5 MB. Aadhaar images must be masked before upload.</p>
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
  const [draft, setDraft] = useState<NewCompanion>(emptyCompanion);
  const [addingNew, setAddingNew] = useState(false);
  const [draftError, setDraftError] = useState('');

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
          <div className="space-y-3 rounded-lg border border-lagoon/30 bg-lagoon-tint p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{lead.fullName}</p>
                <p className="text-xs text-muted">{[lead.phone, lead.email].filter(Boolean).join(' · ')}</p>
                <p className="text-xs font-medium text-lagoon-dark">Existing profile selected{lead.hasIdentityDocument ? ' · ID on file' : ' · ID image required'}</p>
              </div>
              <button type="button" className="text-xs font-semibold underline" onClick={() => setLead(null)}>Change</button>
              <input type="hidden" name="guestId" value={lead.id} />
            </div>
            {!lead.hasIdentityDocument && <IdentityUploadFields prefix={`existing_${lead.id}`} required />}
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border border-line p-3">
            <p className="text-xs font-semibold">
              New guest details{' '}
              <span className="font-normal text-muted">
                (only if no matching profile exists)
              </span>
            </p>

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
                <label htmlFor="new-guest-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="new-guest-phone"
                  name="guestPhone"
                  type="tel"
                  required={!lead}
                  minLength={7}
                  maxLength={30}
                  pattern="\+?[0-9 ().-]{7,30}"
                  title="Enter a valid phone number with 7 to 15 digits."
                  placeholder="+91 98765 43210"
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="new-guest-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="new-guest-email"
                  name="guestEmail"
                  type="email"
                  maxLength={200}
                  placeholder="e.g. guest@example.com"
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="new-guest-id-type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Identity Type <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <CustomDropdown
                  id="new-guest-id-type"
                  name="guestIdType"
                  defaultValue=""
                  required={!lead}
                  placeholder="Select identity type"
                  options={[
                    { value: '', label: 'Select identity type' },
                    ...identityTypes.map(([value, label]) => ({ value, label })),
                  ]}
                  aria-label="New guest identity type"
                />
              </div>

              <div>
                <label htmlFor="new-guest-id-number" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ID Number <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="new-guest-id-number"
                  name="guestIdNumber"
                  required={!lead}
                  maxLength={60}
                  placeholder="Aadhaar: last 4 digits only"
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-2">
                <IdentityUploadFields prefix="guest" required={!lead} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-line pt-3">
        <h4 className="text-xs font-semibold">
          Other guests sharing this room
        </h4>

        {companions.map((guest) => (
          <div key={guest.id} className="space-y-2 rounded-lg bg-surface p-3 text-sm">
            <div className="flex items-center justify-between">
              <span>
                {guest.fullName}<span className="ml-2 text-xs text-muted">{guest.phone}</span>
                <input type="hidden" name="guestIds" value={guest.id} />
              </span>
              <button type="button" className="text-xs underline" onClick={() => setCompanions((previous) => previous.filter((item) => item.id !== guest.id))}>Remove</button>
            </div>
            {!guest.hasIdentityDocument && <IdentityUploadFields prefix={`existing_${guest.id}`} required />}
          </div>
        ))}

        {newCompanions.map((guest, index) => (
          <div
            key={guest.clientKey ?? `new-${index}`}
            className="grid gap-2 rounded-lg border border-line bg-surface p-3 text-sm sm:grid-cols-[1fr_auto]"
          >
            <span>
              {guest.fullName}
              <span className="ml-2 text-xs text-muted">
                {[guest.phone, guest.email].filter(Boolean).join(' · ') || 'New guest'}
              </span>
            </span>
            <button
              type="button"
              className="text-xs underline"
              onClick={() => setNewCompanions((previous) => previous.filter((_, i) => i !== index))}
            >
              Remove
            </button>
            <IdentityUploadFields prefix={`companion_${guest.clientKey ?? index}`} required />
          </div>
        ))}

        <input
          type="hidden"
          name="newCompanions"
          value={JSON.stringify(newCompanions)}
        />
        <input
          type="hidden"
          name="newCompanionDraft"
          value={addingNew && draft.fullName.trim() ? JSON.stringify(draft) : ''}
        />

        {addingNew ? (
          <div className="space-y-3 rounded-lg border border-line bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">Register a new companion</p>
              <button type="button" className="text-xs underline" onClick={() => { setAddingNew(false); setDraft(emptyCompanion); setDraftError(''); }}>
                Cancel
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={draft.fullName}
                onChange={(event) => setDraft((value) => ({ ...value, fullName: event.target.value }))}
                required
                minLength={1}
                maxLength={120}
                placeholder="Full name (required)"
                aria-label="New companion full name"
                className={inputCls}
              />
              <input
                value={draft.phone ?? ''}
                onChange={(event) => setDraft((value) => ({ ...value, phone: event.target.value }))}
                type="tel"
                required
                minLength={7}
                maxLength={30}
                pattern="\+?[0-9 ().-]{7,30}"
                title="Enter a valid phone number with 7 to 15 digits."
                placeholder="Phone number (required)"
                aria-label="New companion phone"
                className={inputCls}
              />
              <input
                value={draft.email ?? ''}
                onChange={(event) => setDraft((value) => ({ ...value, email: event.target.value }))}
                type="email"
                maxLength={200}
                placeholder="Email (optional)"
                aria-label="New companion email"
                className={inputCls}
              />
              <input
                value={draft.nationality ?? ''}
                onChange={(event) => setDraft((value) => ({ ...value, nationality: event.target.value }))}
                maxLength={60}
                placeholder="Nationality (optional)"
                aria-label="New companion nationality"
                className={inputCls}
              />
              <CustomDropdown
                value={draft.idType ?? ''}
                onChange={(val) => setDraft((value) => ({ ...value, idType: val }))}
                placeholder="ID type (required)"
                options={[
                  { value: '', label: 'ID type (required)' },
                  ...identityTypes.map(([value, label]) => ({ value, label })),
                ]}
                aria-label="New companion ID type"
              />
              <input
                value={draft.idNumber ?? ''}
                onChange={(event) => setDraft((value) => ({ ...value, idNumber: event.target.value }))}
                maxLength={60}
                required
                placeholder="ID number (Aadhaar: last 4 digits only)"
                aria-label="New companion ID number"
                className={inputCls}
              />
            </div>
            <p className="text-xs text-muted">ID numbers are encrypted when saved. The new profile will be attached to this reservation and consolidated bill.</p>
            <button
              type="button"
              className="text-xs font-semibold text-lagoon underline"
              onClick={() => {
                const fullName = draft.fullName.trim();
                const phone = draft.phone?.trim() ?? '';
                const digits = phone.replace(/\D/g, '').length;
                if (!fullName) { setDraftError('Enter the companion’s full name.'); return; }
                if (!/^\+?[0-9 ().-]{7,30}$/.test(phone) || digits < 7 || digits > 15) { setDraftError('Enter a valid companion phone number with 7 to 15 digits.'); return; }
                if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) { setDraftError('Enter a valid email address or leave it blank.'); return; }
                if (!draft.idType || !draft.idNumber?.trim()) { setDraftError('Enter the guest’s ID type and ID number.'); return; }
                if (!identityTypes.some(([value]) => value === draft.idType)) { setDraftError('Select a valid identity type.'); return; }
                if (draft.idType?.toLowerCase() === 'aadhaar' && draft.idNumber && !/^\d{4}$/.test(draft.idNumber.trim())) { setDraftError('For Aadhaar, enter only the last four digits.'); return; }
                if (companions.length + newCompanions.length >= 19) return;
                setNewCompanions((previous) => [...previous, { ...draft, fullName, clientKey: crypto.randomUUID() }]);
                setDraft(emptyCompanion);
                setDraftError('');
                setAddingNew(false);
              }}
            >
              Add companion
            </button>
            {draftError && <p className="text-xs text-danger" role="alert">{draftError}</p>}
          </div>
        ) : companions.length + newCompanions.length < 19 ? (
          <button type="button" className="text-xs font-semibold text-lagoon underline" onClick={() => setAddingNew(true)}>
            + Register a new companion
          </button>
        ) : <p className="text-xs text-muted">Maximum of 20 guests per reservation reached.</p>}

        <GuestSearch
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

        <p className="text-xs text-muted">
          All selected guests share one reservation and one
          consolidated bill by default.
        </p>
      </div>
    </>
  );
}
