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
};

type NewCompanion = {
  fullName: string;
  phone?: string;
  email?: string;
  nationality?: string;
  idType?: string;
  idNumber?: string;
};

const emptyCompanion: NewCompanion = { fullName: '' };

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
  const [loading, startTransition] = useTransition();

  useEffect(() => {
    const q = query.trim();

    if (q.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(
      () =>
        startTransition(async () => {
          try {
            setResults(await searchGuestProfiles(q));
          } catch {
            setResults([]);
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
          className={`${inputCls} mt-1`}
        />
      </label>

      {loading && (
        <p className="text-xs text-muted">
          Searching guest directory…
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
          <div className="flex items-center justify-between gap-3 rounded-lg border border-lagoon/30 bg-lagoon-tint p-3">
            <div>
              <p className="text-sm font-semibold">{lead.fullName}</p>

              <p className="text-xs text-muted">
                {[lead.phone, lead.email].filter(Boolean).join(' · ')}
              </p>

              <p className="text-xs font-medium text-lagoon-dark">
                Existing profile selected
              </p>
            </div>

            <button
              type="button"
              className="text-xs font-semibold underline"
              onClick={() => setLead(null)}
            >
              Change
            </button>

            <input type="hidden" name="guestId" value={lead.id} />
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
                placeholder="Full name"
                aria-label="New guest full name"
                className={inputCls}
              />

              <input
                name="guestPhone"
                placeholder="Phone number"
                aria-label="New guest phone"
                className={inputCls}
              />

              <input
                name="guestEmail"
                type="email"
                placeholder="Email (optional)"
                aria-label="New guest email"
                className={`${inputCls} sm:col-span-2`}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-line pt-3">
        <h4 className="text-xs font-semibold">
          Other guests sharing this room
        </h4>

        {companions.map((guest) => (
          <div
            key={guest.id}
            className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm"
          >
            <span>
              {guest.fullName}

              <span className="ml-2 text-xs text-muted">
                {guest.phone}
              </span>

              <input
                type="hidden"
                name="guestIds"
                value={guest.id}
              />
            </span>

            <button
              type="button"
              className="text-xs underline"
              onClick={() =>
                setCompanions((previous) =>
                  previous.filter((item) => item.id !== guest.id),
                )
              }
            >
              Remove
            </button>
          </div>
        ))}

        {newCompanions.map((guest, index) => (
          <div
            key={`new-${index}`}
            className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-sm"
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
              <button type="button" className="text-xs underline" onClick={() => { setAddingNew(false); setDraft(emptyCompanion); }}>
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
                maxLength={30}
                placeholder="Phone number (optional)"
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
                <option value="">ID type (optional)</option>
                <option value="passport">Passport</option>
                <option value="national_id">National ID</option>
                <option value="drivers_license">Driver’s license</option>
                <option value="other">Other</option>
              </select>
              <input
                value={draft.idNumber ?? ''}
                onChange={(event) => setDraft((value) => ({ ...value, idNumber: event.target.value }))}
                maxLength={60}
                placeholder="ID number (optional)"
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
                if (!fullName || companions.length + newCompanions.length >= 19) return;
                setNewCompanions((previous) => [...previous, { ...draft, fullName }]);
                setDraft(emptyCompanion);
                setAddingNew(false);
              }}
            >
              Add companion
            </button>
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
