import { redirect } from 'next/navigation';
import { FEATURES } from '@erp/shared';
import { Banner, btnCls, CustomDropdown, EmptyState, inputCls, PageHeader } from '@/components/ui';
import { FormSubmit } from '@/components/form-submit';
import { api, getMe, requireFeature } from '@/lib/api';
import { saveGuest } from './actions';
import { GuestDirectory, type GuestProfile } from './guest-directory';

export default async function GuestsPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const [me, { error, ok }, ent, guests] = await Promise.all([
    getMe(),
    searchParams,
    requireFeature(FEATURES.HOTEL_RESERVATIONS),
    api<GuestProfile[]>('/hotel/guests'),
  ]);

  if (me.role === 'housekeeping') {
    redirect(
      '/housekeeping?error=' +
        encodeURIComponent(
          'Access Restricted: Guests directory is reserved for Front Desk and Management.',
        ),
    );
  }

  return (
    <>
      <PageHeader title="Guest directory" eyebrow="Guest profiles" description="Keep reusable guest details in one place and find returning guests quickly." />
      <Banner error={error} ok={ok} />

      {!ent.readOnly ? (
        <form action={saveGuest} className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <div className="border-b border-line px-4 py-4 sm:px-5">
            <h2 className="text-sm font-semibold text-ink">Register a guest</h2>
            <p className="mt-1 text-xs text-muted">Save a profile once and reuse it on future reservations.</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
            <label className="text-xs font-medium text-ink">Full name <span className="text-danger">*</span><input name="fullName" required maxLength={120} placeholder="Guest full name" className={`${inputCls} mt-1.5`} /></label>
            <label className="text-xs font-medium text-ink">Phone <span className="text-danger">*</span><input name="phone" type="tel" required minLength={7} maxLength={30} pattern="\+?[0-9 ().-]{7,30}" title="Enter a valid phone number with 7 to 15 digits." placeholder="Phone number" className={`${inputCls} mt-1.5`} /></label>
            <label className="text-xs font-medium text-ink">Email<input name="email" type="email" placeholder="Email address" className={`${inputCls} mt-1.5`} /></label>
            <label className="text-xs font-medium text-ink">Nationality<input name="nationality" maxLength={60} placeholder="Nationality" className={`${inputCls} mt-1.5`} /></label>
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">ID document type</label>
              <CustomDropdown
                name="idType"
                defaultValue=""
                placeholder="Select type (optional)"
                options={[
                  { value: '', label: 'Select type (optional)' },
                  { value: 'aadhaar', label: 'Aadhaar' },
                  { value: 'passport', label: 'Passport' },
                  { value: 'driving_license', label: 'Driving licence' },
                  { value: 'voter_id', label: 'Voter ID' },
                  { value: 'other', label: 'Other' },
                ]}
                aria-label="ID document type"
              />
            </div>
            <label className="text-xs font-medium text-ink">Identity number <span className="font-normal text-muted">(optional)</span><input name="idNumber" maxLength={60} placeholder="For Aadhaar, enter last 4 digits only" className={`${inputCls} mt-1.5`} /></label>
            <label className="text-xs font-medium text-ink sm:col-span-2">Guest notes / preferences<textarea name="notes" maxLength={1000} rows={2} placeholder="Optional preferences or notes" className={`${inputCls} mt-1.5`} /></label>
            <label className="flex min-h-10 items-center gap-2 self-end text-sm font-medium text-ink"><input name="vip" type="checkbox" className="h-4 w-4 accent-[hsl(var(--accent))]" /> Mark as VIP</label>

            <div className="rounded-xl border border-dashed border-line bg-ground/40 p-4 sm:col-span-2 lg:col-span-3 space-y-3">
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-amber-600 dark:text-amber-400">🛡️</span>
                  <span>UIDAI & DPDP Aadhaar Compliance Checklist</span>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-amber-800 dark:text-amber-300/90">
                  Section 29 of the Aadhaar Act prohibits storing unmasked 12-digit Aadhaar numbers. Verify that the first
                  8 digits are obscured (e.g. <span className="font-mono font-bold">XXXX-XXXX-1234</span>) and biometric QR code is redacted before uploading.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Identity documents <span className="font-normal text-muted">(PDF, JPEG, PNG, WebP · max 5 MB each · up to 8 files)</span>
                </label>
                <input
                  name="documents"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  multiple
                  className="block w-full text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:rounded-xl file:border file:border-slate-300 dark:file:border-white/15 file:bg-white dark:file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-800 dark:file:text-white file:shadow-2xs hover:file:bg-slate-50 dark:hover:file:bg-white/15 cursor-pointer"
                />
                <p className="mt-1.5 text-[11px] text-muted">
                  📍 <span className="font-semibold text-ink">Where to view after upload:</span> Once you click <strong className="text-lagoon-dark font-medium">&quot;Save guest profile&quot;</strong>, the file is securely encrypted and stored. View it anytime in the <strong className="text-ink font-medium">Guest directory</strong> below by clicking <span className="rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-ink">View ID 👁️</span> or expanding the guest profile.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">Document category</label>
                  <CustomDropdown
                    name="documentType"
                    defaultValue="other"
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
                  <label className="block text-xs font-medium text-ink mb-1.5">Consent recorded by</label>
                  <CustomDropdown
                    name="consentMethod"
                    defaultValue="written"
                    options={[
                      { value: 'written', label: 'Written' },
                      { value: 'verbal', label: 'Verbal' },
                      { value: 'digital', label: 'Digital' },
                    ]}
                    aria-label="Consent recorded by"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-start gap-2 text-xs leading-5 text-ink cursor-pointer">
                  <input
                    name="consentGiven"
                    type="checkbox"
                    defaultChecked={true}
                    className="mt-1 h-4 w-4 rounded accent-[hsl(var(--accent))]"
                  />
                  <span>
                    I confirm the guest was informed and agreed to this identity document being stored for statutory hotel check-in compliance.
                  </span>
                </label>

                <label className="flex items-start gap-2 text-xs leading-5 text-ink cursor-pointer">
                  <input
                    name="aadhaarMasked"
                    type="checkbox"
                    defaultChecked={true}
                    className="mt-1 h-4 w-4 rounded accent-[hsl(var(--accent))]"
                  />
                  <span>If this is Aadhaar, I confirm the document has the first eight digits masked.</span>
                </label>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-line bg-ground/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-muted">Identity values are encrypted with AES-256-GCM and zero-desktop protected.</p>
            <FormSubmit className={`${btnCls} w-full sm:w-auto`} pendingLabel="Saving profile…">Save guest profile</FormSubmit>
          </div>
        </form>
      ) : (
        <EmptyState title="Guest profiles are read-only" description="Your property’s subscription needs attention before changes can be made." />
      )}

      <GuestDirectory guests={guests} readOnly={ent.readOnly} currentUser={{ fullName: me.fullName, email: me.email, role: me.role }} />
    </>
  );
}
