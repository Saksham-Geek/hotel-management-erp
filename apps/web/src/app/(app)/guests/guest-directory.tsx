'use client';

import { useMemo, useState } from 'react';
import { btnCls, btnGhostCls, EmptyState, inputCls } from '@/components/ui';
import { FormSubmit } from '@/components/form-submit';
import { updateGuest, uploadGuestDocuments } from './actions';

interface GuestDocument { id: string; documentType: string; fileName: string; mimeType: string; consentMethod?: string | null; createdAt: string }
export interface GuestProfile {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  vip: boolean;
  nationality: string | null;
  notes: string | null;
  documents?: GuestDocument[] | null;
}

export function GuestDirectory({ guests, readOnly }: { guests: GuestProfile[]; readOnly: boolean }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return guests.filter((guest) => !term || [guest.fullName, guest.phone ?? '', guest.email ?? '']
      .some((value) => value.toLocaleLowerCase().includes(term)));
  }, [guests, query]);

  return (
    <section aria-labelledby="guest-directory-title" className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><h2 id="guest-directory-title" className="font-display text-lg font-bold text-ink">Guest directory</h2><p className="mt-1 text-xs text-muted">{filtered.length} of {guests.length} profiles · identity details are only shown inside a profile</p></div>
        <label className="w-full sm:w-80"><span className="sr-only">Search guest profiles</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, phone or email" className={inputCls} /></label>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title={guests.length ? 'No matching guest profiles' : 'No guest profiles yet'} description={guests.length ? 'Try another name, phone number or email.' : 'Register a guest profile above or add one while creating a reservation.'} />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.map((guest) => (
            <details key={guest.id} className="group min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-lagoon-dark" aria-hidden>{guest.fullName.split(/\s+/).map((word) => word[0]).slice(0, 2).join('').toUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold text-ink">{guest.fullName}</span>{guest.vip && <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">VIP</span>}</span><span className="mt-1 block truncate text-xs text-muted">{[guest.phone, guest.email].filter(Boolean).join(' · ') || 'No contact details'}</span></span>
                <span className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-muted group-open:text-ink">Profile <span aria-hidden className="ml-1 inline-block transition-transform group-open:rotate-180">⌄</span></span>
              </summary>
              <div className="space-y-4 border-t border-line bg-ground/25 p-4">
                <div className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2"><p><span className="text-muted">Phone</span><span className="mt-0.5 block font-medium text-ink">{guest.phone || 'Not provided'}</span></p><p><span className="text-muted">Email</span><span className="mt-0.5 block break-all font-medium text-ink">{guest.email || 'Not provided'}</span></p><p><span className="text-muted">Nationality</span><span className="mt-0.5 block font-medium text-ink">{guest.nationality || 'Not provided'}</span></p><p><span className="text-muted">Identity documents</span><span className="mt-0.5 block font-medium text-ink">{guest.documents?.length ?? 0} files</span></p></div>
                {guest.notes && <p className="rounded-lg border border-line bg-surface p-3 text-xs leading-5 text-muted"><span className="font-semibold text-ink">Notes: </span>{guest.notes}</p>}
                {guest.documents?.length ? <div className="rounded-lg border border-line bg-surface p-3"><p className="mb-2 text-[11px] font-semibold text-ink">Protected identity files</p><ul className="space-y-1.5">{guest.documents.map((document) => <li key={document.id}><a className="text-xs font-medium text-lagoon-dark underline underline-offset-2" href={`/api/guest-documents/${encodeURIComponent(guest.id)}/${encodeURIComponent(document.id)}`}>{document.documentType.replaceAll('_', ' ')}</a><span className="ml-2 text-[10px] text-muted">{document.consentMethod ? `Consent: ${document.consentMethod}` : 'Legacy upload · consent record unavailable'}</span></li>)}</ul></div> : null}

                {!readOnly && <>
                  <form action={uploadGuestDocuments} className="rounded-lg border border-dashed border-line bg-surface p-3">
                    <input type="hidden" name="guestId" value={guest.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-medium text-ink">Document category<select name="documentType" defaultValue="other" className={`${inputCls} mt-1.5`}><option value="aadhaar_masked">Masked Aadhaar</option><option value="passport">Passport</option><option value="driving_license">Driving licence</option><option value="voter_id">Voter ID</option><option value="other">Other</option></select></label>
                      <label className="text-xs font-medium text-ink">Consent method<select name="consentMethod" defaultValue="" required className={`${inputCls} mt-1.5`}><option value="" disabled>Select method</option><option value="written">Written</option><option value="verbal">Verbal</option><option value="digital">Digital</option></select></label>
                    </div>
                    <label className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-ink"><input name="consentGiven" type="checkbox" required className="mt-0.5 h-4 w-4" /> Guest was informed of the purpose and agreed; an alternative ID may be provided.</label>
                    <label className="mt-2 flex items-start gap-2 text-[11px] leading-4 text-ink"><input name="aadhaarMasked" type="checkbox" className="mt-0.5 h-4 w-4" /> If Aadhaar, first eight digits are masked.</label>
                    <label className="mt-3 block text-xs font-medium text-ink">Add identity images<input name="documents" type="file" accept="image/jpeg,image/png,image/webp" multiple required className="mt-2 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-ground file:px-3 file:py-2 file:text-xs file:font-semibold" /></label>
                    <p className="mt-2 text-[10px] text-muted">JPEG, PNG or WebP · 5 MB per image · up to 8 files. Original filenames are not retained.</p>
                    <FormSubmit className={`${btnGhostCls} mt-3 w-full text-xs`} pendingLabel="Uploading…">Upload securely</FormSubmit>
                  </form>
                  <form action={updateGuest} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                    <input type="hidden" name="id" value={guest.id} />
                    <label className="text-xs font-medium text-ink">Full name<input name="fullName" defaultValue={guest.fullName} required maxLength={120} className={`${inputCls} mt-1.5`} /></label>
                    <label className="text-xs font-medium text-ink">Phone<input name="phone" type="tel" minLength={7} maxLength={30} pattern="\+?[0-9 ().-]{7,30}" title="Enter a valid phone number with 7 to 15 digits." defaultValue={guest.phone ?? ''} className={`${inputCls} mt-1.5`} /></label>
                    <label className="text-xs font-medium text-ink">Email<input name="email" type="email" defaultValue={guest.email ?? ''} className={`${inputCls} mt-1.5`} /></label>
                    <label className="text-xs font-medium text-ink">Nationality<input name="nationality" defaultValue={guest.nationality ?? ''} maxLength={60} className={`${inputCls} mt-1.5`} /></label>
                    <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2"><input name="vip" type="checkbox" defaultChecked={guest.vip} className="h-4 w-4 accent-[hsl(var(--accent))]" /> VIP guest</label>
                    <label className="text-xs font-medium text-ink sm:col-span-2">Guest notes<textarea name="notes" defaultValue={guest.notes ?? ''} maxLength={1000} rows={2} className={`${inputCls} mt-1.5`} /></label>
                    <div className="sm:col-span-2"><FormSubmit className={`${btnCls} w-full sm:w-auto`} pendingLabel="Saving…">Save profile</FormSubmit></div>
                  </form>
                </>}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
