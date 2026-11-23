'use client';

import { useMemo, useState } from 'react';
import { btnCls, btnGhostCls, CustomDropdown, EmptyState, inputCls } from '@/components/ui';
import { FormSubmit } from '@/components/form-submit';
import { updateGuest, uploadGuestDocuments } from './actions';
import { SecureDocumentViewer, type SecureDocument } from '@/components/secure-document-viewer';

export interface GuestProfile {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  vip: boolean;
  nationality: string | null;
  notes: string | null;
  documents?: SecureDocument[] | null;
}

interface GuestDirectoryProps {
  guests: GuestProfile[];
  readOnly: boolean;
  currentUser?: { fullName?: string; email?: string; role?: string };
}

export function GuestDirectory({ guests, readOnly, currentUser }: GuestDirectoryProps) {
  const [query, setQuery] = useState('');
  const [viewingDoc, setViewingDoc] = useState<{
    guestId: string;
    guestName: string;
    document: SecureDocument;
  } | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return guests.filter((guest) => !term || [guest.fullName, guest.phone ?? '', guest.email ?? '']
      .some((value) => value.toLocaleLowerCase().includes(term)));
  }, [guests, query]);

  return (
    <section aria-labelledby="guest-directory-title" className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="guest-directory-title" className="font-display text-lg font-bold text-ink">
            Guest directory
          </h2>
          <p className="mt-1 text-xs text-muted">
            {filtered.length} of {guests.length} profiles · zero-desktop download protected with forensic watermark
          </p>
        </div>
        <label className="w-full sm:w-80">
          <span className="sr-only">Search guest profiles</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, phone or email"
            className={inputCls}
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={guests.length ? 'No matching guest profiles' : 'No guest profiles yet'}
          description={guests.length ? 'Try another name, phone number or email.' : 'Register a guest profile above or add one while creating a reservation.'}
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.map((guest) => (
            <details key={guest.id} className="group min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-lagoon-dark" aria-hidden>
                  {guest.fullName.split(/\s+/).map((word) => word[0]).slice(0, 2).join('').toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{guest.fullName}</span>
                    {guest.vip && <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">VIP</span>}
                    {Boolean(guest.documents?.length) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        🛡️ {guest.documents!.length} {guest.documents!.length === 1 ? 'doc' : 'docs'}
                        {guest.documents!.some((d) => d.mimeType === 'application/pdf') ? ' (PDF)' : ''}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted">
                    {[guest.phone, guest.email].filter(Boolean).join(' · ') || 'No contact details'}
                  </span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {Boolean(guest.documents?.length) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setViewingDoc({
                          guestId: guest.id,
                          guestName: guest.fullName,
                          document: guest.documents![0],
                        });
                      }}
                      className="rounded-lg border border-lagoon/40 bg-lagoon/10 hover:bg-lagoon/20 px-2.5 py-1.5 text-[11px] font-semibold text-lagoon-dark transition cursor-pointer"
                      title="View primary identity document in secure viewer"
                    >
                      View ID 👁️
                    </button>
                  )}
                  <span className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-muted group-open:text-ink">
                    Profile <span aria-hidden className="ml-1 inline-block transition-transform group-open:rotate-180">⌄</span>
                  </span>
                </div>
              </summary>

              <div className="space-y-4 border-t border-line bg-ground/25 p-4">
                <div className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
                  <p><span className="text-muted">Phone</span><span className="mt-0.5 block font-medium text-ink">{guest.phone || 'Not provided'}</span></p>
                  <p><span className="text-muted">Email</span><span className="mt-0.5 block break-all font-medium text-ink">{guest.email || 'Not provided'}</span></p>
                  <p><span className="text-muted">Nationality</span><span className="mt-0.5 block font-medium text-ink">{guest.nationality || 'Not provided'}</span></p>
                  <p><span className="text-muted">Identity documents</span><span className="mt-0.5 block font-medium text-ink">{guest.documents?.length ?? 0} files</span></p>
                </div>

                {guest.notes && (
                  <p className="rounded-lg border border-line bg-surface p-3 text-xs leading-5 text-muted">
                    <span className="font-semibold text-ink">Notes: </span>{guest.notes}
                  </p>
                )}

                {/* Identity Documents List with In-App Viewer Trigger */}
                {guest.documents?.length ? (
                  <div className="rounded-lg border border-line bg-surface p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-semibold text-ink">Protected Identity Documents (Encrypted AES-256-GCM)</p>
                      <span className="text-[10px] text-muted">Click to view in secure sandboxed viewer</span>
                    </div>
                    <ul className="space-y-2">
                      {guest.documents.map((document) => {
                        const isPdf = document.mimeType === 'application/pdf';
                        return (
                          <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-ground/40 border border-line/60">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  isPdf
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                }`}
                              >
                                {isPdf ? 'PDF' : 'IMG'}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  setViewingDoc({
                                    guestId: guest.id,
                                    guestName: guest.fullName,
                                    document,
                                  })
                                }
                                className="text-xs font-semibold text-lagoon-dark underline underline-offset-2 hover:opacity-80 text-left cursor-pointer truncate max-w-[200px] sm:max-w-[280px]"
                                title="Open in Secure Viewer"
                              >
                                {document.documentType.replaceAll('_', ' ')}
                              </button>

                              {document.legalHold && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                  HOLD
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-muted">
                              <span>
                                {document.retentionUntil
                                  ? `Retained to ${new Date(document.retentionUntil).toLocaleDateString()}`
                                  : '180 days standard'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingDoc({
                                    guestId: guest.id,
                                    guestName: guest.fullName,
                                    document,
                                  })
                                }
                                className="px-2 py-0.5 rounded border border-line bg-surface hover:bg-ground text-[10px] font-semibold text-ink transition"
                              >
                                View 👁️
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                {!readOnly && (
                  <>
                    <form action={uploadGuestDocuments} className="rounded-lg border border-dashed border-line bg-surface p-3">
                      <input type="hidden" name="guestId" value={guest.id} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-ink mb-1">Document category</label>
                          <CustomDropdown
                            name="documentType"
                            defaultValue="other"
                            size="sm"
                            options={[
                              { value: 'aadhaar_masked', label: 'Masked Aadhaar (PDF / Image)' },
                              { value: 'passport', label: 'Passport' },
                              { value: 'driving_license', label: 'Driving licence' },
                              { value: 'voter_id', label: 'Voter ID' },
                              { value: 'other', label: 'Other identity document' },
                            ]}
                            aria-label="Document category"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-ink mb-1">Consent method</label>
                          <CustomDropdown
                            name="consentMethod"
                            defaultValue=""
                            required
                            size="sm"
                            placeholder="Select method"
                            options={[
                              { value: '', label: 'Select method' },
                              { value: 'written', label: 'Written' },
                              { value: 'verbal', label: 'Verbal' },
                              { value: 'digital', label: 'Digital' },
                            ]}
                            aria-label="Consent method"
                          />
                        </div>
                      </div>
                      <label className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-ink">
                        <input name="consentGiven" type="checkbox" required className="mt-0.5 h-4 w-4" /> Guest was informed of the purpose and agreed; an alternative ID may be provided.
                      </label>
                      <label className="mt-2 flex items-start gap-2 text-[11px] leading-4 text-ink">
                        <input name="aadhaarMasked" type="checkbox" className="mt-0.5 h-4 w-4" /> If Aadhaar, first eight digits are masked.
                      </label>
                      <label className="mt-3 block text-xs font-medium text-ink">
                        Add identity documents (PDF, JPEG, PNG, WebP)
                        <input
                          name="documents"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          multiple
                          required
                          className="mt-2 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-ground file:px-3 file:py-2 file:text-xs file:font-semibold cursor-pointer"
                        />
                      </label>
                      <p className="mt-2 text-[10px] text-muted">
                        PDF, JPEG, PNG or WebP · 5 MB per document · up to 8 files. Encrypted with AES-256-GCM.
                      </p>
                      <FormSubmit className={`${btnGhostCls} mt-3 w-full text-xs`} pendingLabel="Uploading…">
                        Upload securely
                      </FormSubmit>
                    </form>

                    <form action={updateGuest} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                      <input type="hidden" name="id" value={guest.id} />
                      <label className="text-xs font-medium text-ink">
                        Full name<input name="fullName" defaultValue={guest.fullName} required maxLength={120} className={`${inputCls} mt-1.5`} />
                      </label>
                      <label className="text-xs font-medium text-ink">
                        Phone<input name="phone" type="tel" minLength={7} maxLength={30} pattern="\+?[0-9 ().-]{7,30}" title="Enter a valid phone number with 7 to 15 digits." defaultValue={guest.phone ?? ''} className={`${inputCls} mt-1.5`} />
                      </label>
                      <label className="text-xs font-medium text-ink">
                        Email<input name="email" type="email" defaultValue={guest.email ?? ''} className={`${inputCls} mt-1.5`} />
                      </label>
                      <label className="text-xs font-medium text-ink">
                        Nationality<input name="nationality" defaultValue={guest.nationality ?? ''} maxLength={60} className={`${inputCls} mt-1.5`} />
                      </label>
                      <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
                        <input name="vip" type="checkbox" defaultChecked={guest.vip} className="h-4 w-4 accent-[hsl(var(--accent))]" /> VIP guest
                      </label>
                      <label className="text-xs font-medium text-ink sm:col-span-2">
                        Guest notes<textarea name="notes" defaultValue={guest.notes ?? ''} maxLength={1000} rows={2} className={`${inputCls} mt-1.5`} />
                      </label>
                      <div className="sm:col-span-2">
                        <FormSubmit className={`${btnCls} w-full sm:w-auto`} pendingLabel="Saving…">
                          Save profile
                        </FormSubmit>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </details>
          ))}
        </div>
      )}

      {/* Forensic Watermarked Document Viewer Modal */}
      {viewingDoc && (
        <SecureDocumentViewer
          guestId={viewingDoc.guestId}
          guestName={viewingDoc.guestName}
          document={viewingDoc.document}
          currentUser={currentUser}
          onClose={() => setViewingDoc(null)}
          onLegalHoldToggle={(docId, newHold) => {
            // Update document legal hold in local state
            setViewingDoc((prev) =>
              prev && prev.document.id === docId
                ? { ...prev, document: { ...prev.document, legalHold: newHold } }
                : prev,
            );
          }}
        />
      )}
    </section>
  );
}
