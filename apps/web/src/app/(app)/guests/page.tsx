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

            <div className="rounded-lg border border-dashed border-line bg-ground/40 p-3 sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-ink">Identity images <span className="font-normal text-muted">(optional)</span><input name="documents" type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-2 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-2 file:text-xs file:font-semibold" /></label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">Document category</label>
                  <CustomDropdown
                    name="documentType"
                    defaultValue="other"
                    options={[
                      { value: 'aadhaar_masked', label: 'Masked Aadhaar image' },
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
                    defaultValue=""
                    placeholder="Select method when uploading"
                    options={[
                      { value: '', label: 'Select method when uploading' },
                      { value: 'written', label: 'Written' },
                      { value: 'verbal', label: 'Verbal' },
                      { value: 'digital', label: 'Digital' },
                    ]}
                    aria-label="Consent recorded by"
                  />
                </div>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-muted">JPEG, PNG or WebP · maximum 5 MB each · up to 8 images. Tell the guest why the document is collected, how it will be used, and that an alternative ID may be provided. For Aadhaar, upload only a copy with the first eight digits masked. Uploads are encrypted at rest.</p>
              <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-ink"><input name="consentGiven" type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--accent))]" /> I confirm the guest was informed and agreed to this identity document being stored for the stated purpose.</label>
              <label className="mt-2 flex items-start gap-2 text-xs leading-5 text-ink"><input name="aadhaarMasked" type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--accent))]" /> If this is Aadhaar, I confirm the image has the first eight digits masked.</label>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-line bg-ground/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-muted">Identity values are not shown in the guest directory.</p>
            <FormSubmit className={`${btnCls} w-full sm:w-auto`} pendingLabel="Saving profile…">Save guest profile</FormSubmit>
          </div>
        </form>
      ) : (
        <EmptyState title="Guest profiles are read-only" description="Your property’s subscription needs attention before changes can be made." />
      )}

      <GuestDirectory guests={guests} readOnly={ent.readOnly} />
    </>
  );
}
