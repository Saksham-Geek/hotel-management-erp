'use client';

import { useEffect, useState, useTransition } from 'react';
import { searchGuestProfiles } from './actions';
import { inputCls } from '@/components/ui';

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
        <select name={`${prefix}DocumentType`} defaultValue="" required={required} aria-label="Identity document type" className={inputCls}>
          <option value="">Uploaded document type{required ? ' (required)' : ''}</option>
          {documentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select name={`${prefix}ConsentMethod`} defaultValue="" required={required} aria-label="Consent method" className={inputCls}>
          <option value="">Consent method{required ? ' (required)' : ' (when uploading)'}</option>
          <option value="written">Written</option><option value="verbal">Verbal</option><option value="digital">Digital</option>
        </select>
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
}: {
  label: string;
  placeholder: string;
  onSelect: (guest: Guest) => void;
  excludeIds?: string[];
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Guest[]>([]);
  const [searchError, setSearchError] = useState(false);
  const [loading, startTransition] = useTransition();

  useEffect(() => {
    const q = query.trim();

    if (q.length < 2) {
      setResults([]);
      setSearchError(false);
      return;
    }

    const timer = setTimeout(
      () =>
        startTransition(async () => {
          try {
            setSearchError(false);
            setResults(await searchGuestProfiles(q));
          } catch {
            setResults([]);
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

  return (
    <div className="relative space-y-1">
      <label className="block text-xs font-medium text-muted">
        {label}

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          className={`${inputCls} mt-1`}
        />
      </label>

      {loading && (
        <p className="text-xs text-muted">
          Searching guest directory…
        </p>
      )}

      {searchError && !loading && (
        <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger" role="status">
          Guest search is unavailable right now. Check your connection and try again.
        </p>
      )}

      {filteredResults.length > 0 && (
        <div
          className="max-h-52 overflow-y-auto rounded-lg border border-line bg-surface shadow-lg"
          role="listbox"
          aria-label={`${label} matches`}
        >
          {filteredResults.map((guest) => (
            <button
              type="button"
              key={guest.id}
              onClick={() => {
                onSelect(guest);
                setQuery('');
                setResults([]);
              }}
              className="flex w-full flex-col items-start border-b border-line px-3 py-2 text-left last:border-0 hover:bg-ground"
              role="option"
              aria-selected="false"
            >
              <span className="text-sm font-semibold">
                {guest.fullName}
                {guest.vip ? ' · VIP' : ''}
              </span>

              <span className="text-xs text-muted">
                {[guest.phone, guest.email]
                  .filter(Boolean)
                  .join(' · ') || 'No phone or email on file'}
              </span>
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 2 &&
        !loading &&
        !searchError &&
        results.length === 0 && (
          <p className="text-xs text-muted">
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
              <input
                name="guestName"
                required={!lead}
                minLength={1}
                maxLength={120}
                placeholder="Full name"
                aria-label="New guest full name"
                className={inputCls}
              />

              <input
                name="guestPhone"
                type="tel"
                required={!lead}
                minLength={7}
                maxLength={30}
                pattern="\+?[0-9 ().-]{7,30}"
                title="Enter a valid phone number with 7 to 15 digits."
                placeholder="Phone number (required)"
                aria-label="New guest phone"
                className={inputCls}
              />

              <input
                name="guestEmail"
                type="email"
                maxLength={200}
                placeholder="Email (optional; must be valid if entered)"
                aria-label="New guest email"
                className={`${inputCls} sm:col-span-2`}
              />
              <select name="guestIdType" defaultValue="" required={!lead} aria-label="New guest identity type" className={inputCls}>
                <option value="">Identity type (required)</option>
                {identityTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input name="guestIdNumber" required={!lead} maxLength={60} placeholder="ID number (Aadhaar: last 4 digits only)" aria-label="New guest identity number" className={inputCls} />
              <IdentityUploadFields prefix="guest" required={!lead} />
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
              <select
                value={draft.idType ?? ''}
                onChange={(event) => setDraft((value) => ({ ...value, idType: event.target.value }))}
                aria-label="New companion ID type"
                className={inputCls}
              >
                <option value="">ID type (required)</option>
                {identityTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
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
