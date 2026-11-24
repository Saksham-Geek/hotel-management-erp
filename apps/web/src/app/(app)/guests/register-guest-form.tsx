'use client';

import { useState } from 'react';
import { btnCls, inputCls } from '@/components/ui';
import { CustomDropdown } from '@/components/dropdown';
import { FormSubmit } from '@/components/form-submit';
import { PhoneCountryInput } from '@/components/phone-country-input';
import { NationalityCombobox } from '@/components/nationality-combobox';
import { IdDocumentInput } from '@/components/id-document-input';
import { SecureDocumentInput } from '@/components/secure-document-input';
import { saveGuest } from './actions';
import { DEFAULT_COUNTRY, type CountryInfo } from '@/lib/countries';

export function RegisterGuestForm() {
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(DEFAULT_COUNTRY);
  const [nationality, setNationality] = useState<string>('India');
  const [idType, setIdType] = useState<string>('aadhaar');
  const [idNumber, setIdNumber] = useState<string>('');

  // When Nationality changes from search dropdown, intelligently suggest matching phone country code
  const handleCountrySelect = (country: CountryInfo) => {
    setSelectedCountry(country);
    // If foreign country selected and ID type is Aadhaar, suggest switching to Passport
    if (country.code !== 'IN' && idType === 'aadhaar') {
      setIdType('passport');
    } else if (country.code === 'IN' && idType === 'passport') {
      setIdType('aadhaar');
    }
  };

  return (
    <form action={saveGuest} className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div className="border-b border-line px-4 py-4 sm:px-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Register a guest</h2>
          <p className="mt-1 text-xs text-muted">Save a profile once and reuse it on future reservations.</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-lagoon/10 px-2.5 py-1 text-xs font-semibold text-lagoon-dark">
          🌐 Global PMS KYC Ready
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Core Guest Demographics Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Full Name */}
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Full name <span className="text-danger">*</span>
            <input
              name="fullName"
              required
              maxLength={120}
              placeholder="Guest full name"
              className={`${inputCls} mt-1.5`}
            />
          </label>

          {/* International Phone with Flag & Dial Code Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Phone number <span className="text-danger">*</span>
              <span className="text-[10px] font-normal text-muted ml-1.5">
                (Defaults to 🇮🇳 +91 · change code anytime)
              </span>
            </label>
            <PhoneCountryInput
              name="phone"
              country={selectedCountry}
              onCountryChange={(newCountry) => setSelectedCountry(newCountry)}
              required={true}
            />
          </div>

          {/* Email with Format Validation */}
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Email address <span className="font-normal text-muted">(optional)</span>
            <input
              name="email"
              type="email"
              placeholder="guest@example.com"
              pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
              title="Enter a valid email address (e.g. name@domain.com)"
              className={`${inputCls} mt-1.5`}
            />
          </label>

          {/* Nationality with 1-Field Country Code & Country Name Search */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nationality <span className="font-normal text-muted">(Search country, code, or +dial code)</span>
            </label>
            <NationalityCombobox
              name="nationality"
              defaultValue="India"
              value={nationality}
              onChange={(val) => setNationality(val)}
              onCountrySelect={handleCountrySelect}
              placeholder="Search nationality (e.g. India, US, +1, UK)..."
            />
          </div>

          {/* Required ID Type and Required ID Number Fields */}
          <div className="sm:col-span-2">
            <IdDocumentInput
              idType={idType}
              idNumber={idNumber}
              onIdTypeChange={(type) => setIdType(type)}
              onIdNumberChange={(num) => setIdNumber(num)}
              required={true}
            />
          </div>

          {/* Guest Notes */}
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
            Guest notes / preferences
            <textarea
              name="notes"
              maxLength={1000}
              rows={2}
              placeholder="Optional preferences, room requests, or VIP notes"
              className={`${inputCls} mt-1.5`}
            />
          </label>

          {/* VIP Switch */}
          <label className="flex min-h-10 items-center gap-2 self-end text-sm font-medium text-ink cursor-pointer">
            <input
              name="vip"
              type="checkbox"
              className="h-4 w-4 rounded accent-[hsl(var(--accent))]"
            />
            <span>Mark as VIP guest</span>
          </label>
        </div>

        {/* Identity Document Attachment & UIDAI Compliance Section */}
        <div className="rounded-xl border border-dashed border-line bg-ground/40 p-4 space-y-3">
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
            <SecureDocumentInput
              id="guest-register-docs"
              name="documents"
              multiple={true}
              required={true}
              maxFiles={8}
              label="Identity documents"
              sublabel="(PDF, JPEG, PNG, WebP · Auto-compressed · up to 8 files)"
            />
            <p className="mt-2 text-[11px] text-muted">
              📍 <span className="font-semibold text-ink">Where to view after upload:</span> Once saved, view your encrypted document anytime in the <strong className="text-ink font-medium">Guest directory</strong> below by clicking <span className="rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-ink">View ID 👁️</span>.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Document category
              </label>
              <CustomDropdown
                name="documentType"
                defaultValue={idType === 'aadhaar' ? 'aadhaar_masked' : idType}
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Consent recorded by
              </label>
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
                required
                defaultChecked={true}
                className="mt-1 h-4 w-4 rounded accent-[hsl(var(--accent))]"
              />
              <span>
                I confirm the guest was informed and agreed to this identity document being stored for statutory hotel check-in compliance. <span className="text-danger font-bold">*</span>
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
        <p className="text-xs text-muted">
          Identity numbers and documents are encrypted with AES-256-GCM and zero-desktop protected.
        </p>
        <FormSubmit className={`${btnCls} w-full sm:w-auto`} pendingLabel="Saving profile…">
          Save guest profile
        </FormSubmit>
      </div>
    </form>
  );
}
