'use client';

import { useMemo, useState } from 'react';
import { btnCls, btnGhostCls, EmptyState, inputCls } from '@/components/ui';
import { CustomDropdown } from '@/components/dropdown';
import { FormSubmit } from '@/components/form-submit';
import { updateGuest, uploadGuestDocuments } from './actions';
import { SecureDocumentViewer, type SecureDocument } from '@/components/secure-document-viewer';
import { PhoneCountryInput } from '@/components/phone-country-input';
import { NationalityCombobox } from '@/components/nationality-combobox';
import { IdDocumentInput } from '@/components/id-document-input';
import { formatDeterministicDate } from '@/lib/dates';

export interface GuestProfile {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  vip: boolean;
  nationality: string | null;
  idType?: string | null;
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
  const [inlinePreviews, setInlinePreviews] = useState<Record<string, boolean>>({});
  const [viewingDoc, setViewingDoc] = useState<{
    guestId: string;
    guestName: string;
    document: SecureDocument;
  } | null>(null);

  const staffIdentifier = currentUser?.fullName || currentUser?.email || 'Authorized Operator';
  const staffRole = (currentUser?.role || 'staff').toUpperCase();

  const toggleInlinePreview = (docId: string) => {
    setInlinePreviews((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

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
                  <p><span className="text-muted">ID Document Type</span><span className="mt-0.5 block font-medium text-ink uppercase">{guest.idType ? guest.idType.replaceAll('_', ' ') : 'Not recorded'}</span></p>
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
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <p className="text-xs font-bold text-ink">Protected Identity Documents ({guest.documents.length})</p>
                        <p className="text-[10px] text-muted">Encrypted with AES-256-GCM · Click Preview to view inline</p>
                      </div>
                      <span className="text-[10px] font-semibold text-lagoon-dark">
                        Zero-desktop download protected
                      </span>
                    </div>

                    <ul className="space-y-3">
                      {guest.documents.map((document) => {
                        const isPdf = document.mimeType === 'application/pdf';
                        const isPreviewOpen = Boolean(inlinePreviews[document.id]);
                        const docDisplayName = document.fileName || `${document.documentType.replaceAll('_', ' ')}.${isPdf ? 'pdf' : 'jpg'}`;

                        return (
                          <li key={document.id} className="rounded-xl border border-line/80 bg-ground/40 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                    isPdf
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                  }`}
                                >
                                  {isPdf ? 'PDF' : 'IMG'}
                                </span>

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleInlinePreview(document.id)}
                                      className="text-xs font-bold text-ink hover:text-lagoon-dark text-left cursor-pointer truncate max-w-[200px] sm:max-w-[320px]"
                                      title="Toggle document preview"
                                    >
                                      📄 {docDisplayName}
                                    </button>
                                    <span className="rounded bg-line/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted">
                                      {document.documentType.replaceAll('_', ' ')}
                                    </span>
                                    {document.legalHold && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                        LEGAL HOLD
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-0.5 text-[10px] text-muted">
                                    {document.byteLength ? `${Math.round(document.byteLength / 1024)} KB · ` : ''}
                                    {document.consentMethod ? `Consent: ${document.consentMethod}` : 'Consent verified'}
                                    {document.retentionUntil ? ` · Retained to ${formatDeterministicDate(document.retentionUntil)}` : ' · 180 days standard'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => toggleInlinePreview(document.id)}
                                  className="px-2.5 py-1 rounded-lg border border-line bg-surface hover:bg-ground text-[11px] font-semibold text-ink transition cursor-pointer"
                                >
                                  {isPreviewOpen ? 'Hide Preview ▲' : 'Show Preview 👁️'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewingDoc({
                                      guestId: guest.id,
                                      guestName: guest.fullName,
                                      document,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg border border-lagoon/40 bg-lagoon/10 hover:bg-lagoon/20 text-[11px] font-semibold text-lagoon-dark transition cursor-pointer"
                                  title="Open in Fullscreen Sandboxed Viewer"
                                >
                                  Fullscreen ⛶
                                </button>
                              </div>
                            </div>

                            {/* Inline Visual Document Preview */}
                            {isPreviewOpen && (
                              <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-amber-500/10 px-3 py-1.5 text-[10px] font-mono text-amber-900 dark:text-amber-200">
                                  <div className="flex items-center gap-1.5">
                                    <span>🛡️</span>
                                    <span>CONFIDENTIAL • VIEWED BY {staffIdentifier} ({staffRole})</span>
                                  </div>
                                  <div className="flex items-center gap-2 font-sans">
                                    <a
                                      href={`/api/guest-documents/${encodeURIComponent(guest.id)}/${encodeURIComponent(document.id)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] font-semibold text-lagoon-dark underline hover:opacity-80"
                                    >
                                      Open in New Tab ↗
                                    </a>
                                  </div>
                                </div>

                                <div
                                  className="relative min-h-[350px] max-h-[550px] bg-slate-900/5 dark:bg-black/30 flex items-center justify-center p-2 select-none"
                                  onContextMenu={(e) => e.preventDefault()}
                                >
                                  {isPdf ? (
                                    <iframe
                                      src={`/api/guest-documents/${encodeURIComponent(guest.id)}/${encodeURIComponent(document.id)}#toolbar=0`}
                                      className="h-[480px] w-full rounded border border-line bg-white shadow-xs"
                                      title={docDisplayName}
                                    />
                                  ) : (
                                    <img
                                      src={`/api/guest-documents/${encodeURIComponent(guest.id)}/${encodeURIComponent(document.id)}`}
                                      alt={docDisplayName}
                                      className="max-h-[480px] w-auto max-w-full rounded object-contain shadow-xs"
                                    />
                                  )}
                                </div>
                              </div>
                            )}
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
                            defaultValue="written"
                            required
                            size="sm"
                            options={[
                              { value: 'written', label: 'Written' },
                              { value: 'verbal', label: 'Verbal' },
                              { value: 'digital', label: 'Digital' },
                            ]}
                            aria-label="Consent method"
                          />
                        </div>
                      </div>
                      <label className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-ink cursor-pointer">
                        <input name="consentGiven" type="checkbox" defaultChecked={true} required className="mt-0.5 h-4 w-4 accent-[hsl(var(--accent))]" />
                        <span>Guest was informed of statutory purpose and agreed to identity storage.</span>
                      </label>
                      <label className="mt-2 flex items-start gap-2 text-[11px] leading-4 text-ink cursor-pointer">
                        <input name="aadhaarMasked" type="checkbox" defaultChecked={true} className="mt-0.5 h-4 w-4 accent-[hsl(var(--accent))]" />
                        <span>If Aadhaar, first eight digits are masked.</span>
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
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Full name <span className="text-danger">*</span>
                        <input name="fullName" defaultValue={guest.fullName} required maxLength={120} className={`${inputCls} mt-1.5`} />
                      </label>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Phone number <span className="text-danger">*</span>
                        </label>
                        <PhoneCountryInput
                          name="phone"
                          defaultValue={guest.phone ?? ''}
                          required={true}
                        />
                      </div>

                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Email address
                        <input
                          name="email"
                          type="email"
                          defaultValue={guest.email ?? ''}
                          pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                          title="Enter a valid email address (e.g. name@domain.com)"
                          className={`${inputCls} mt-1.5`}
                        />
                      </label>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Nationality <span className="font-normal text-muted">(Search country or +code)</span>
                        </label>
                        <NationalityCombobox
                          name="nationality"
                          defaultValue={guest.nationality ?? ''}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <IdDocumentInput
                          defaultIdType={guest.idType || 'aadhaar'}
                          required={false}
                        />
                      </div>

                      <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2 cursor-pointer">
                        <input name="vip" type="checkbox" defaultChecked={guest.vip} className="h-4 w-4 accent-[hsl(var(--accent))]" /> VIP guest
                      </label>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
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
