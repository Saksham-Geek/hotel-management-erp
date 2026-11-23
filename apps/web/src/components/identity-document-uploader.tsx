'use client';

import { useState } from 'react';
import { CustomDropdown } from './ui';

interface IdentityDocumentUploaderProps {
  name?: string;
  defaultCategory?: string;
  maxFiles?: number;
  maxSizeMb?: number;
  showCategoryPicker?: boolean;
  showConsentPicker?: boolean;
}

export function IdentityDocumentUploader({
  name = 'documents',
  defaultCategory = 'other',
  maxFiles = 8,
  maxSizeMb = 5,
  showCategoryPicker = true,
  showConsentPicker = true,
}: IdentityDocumentUploaderProps) {
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [selectedFiles, setSelectedFiles] = useState<{ name: string; size: number; type: string }[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const isAadhaar = selectedCategory === 'aadhaar_masked';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFileError(null);

    if (files.length > maxFiles) {
      setFileError(`You can upload a maximum of ${maxFiles} documents at once.`);
      e.target.value = '';
      setSelectedFiles([]);
      return;
    }

    const invalidSize = files.find((f) => f.size > maxSizeMb * 1024 * 1024);
    if (invalidSize) {
      setFileError(`${invalidSize.name} exceeds the ${maxSizeMb} MB limit.`);
      e.target.value = '';
      setSelectedFiles([]);
      return;
    }

    setSelectedFiles(
      files.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      })),
    );
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Category and Consent Pickers */}
      {(showCategoryPicker || showConsentPicker) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {showCategoryPicker && (
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">Document category</label>
              <CustomDropdown
                name="documentType"
                defaultValue={selectedCategory}
                onChange={(val) => setSelectedCategory(val)}
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
          )}

          {showConsentPicker && (
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
          )}
        </div>
      )}

      {/* Aadhaar Masking Warning & Checklist Banner */}
      {isAadhaar && (
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
      )}

      {/* File Input */}
      <div>
        <label className="block text-xs font-medium text-ink mb-1">
          Identity documents <span className="font-normal text-muted">(PDF, JPEG, PNG, WebP · max {maxSizeMb} MB)</span>
        </label>
        <input
          name={name}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={handleFileChange}
          className="block w-full text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:rounded-xl file:border file:border-slate-300 dark:file:border-white/15 file:bg-white dark:file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-800 dark:file:text-white file:shadow-2xs hover:file:bg-slate-50 dark:hover:file:bg-white/15 cursor-pointer"
        />
      </div>

      {fileError && (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{fileError}</p>
      )}

      {/* Live Selected Files Thumbnail Chips */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {selectedFiles.map((f, idx) => {
            const isPdf = f.type === 'application/pdf';
            return (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 px-2.5 py-1.5 text-xs shadow-2xs"
              >
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isPdf
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  }`}
                >
                  {isPdf ? 'PDF' : 'IMG'}
                </span>
                <span className="max-w-[140px] truncate font-medium text-slate-800 dark:text-slate-200">
                  {f.name}
                </span>
                <span className="text-[10px] text-muted">{formatSize(f.size)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Consent Declarations */}
      <div className="space-y-1.5 pt-1">
        <label className="flex items-start gap-2 text-xs leading-5 text-ink cursor-pointer">
          <input
            name="consentGiven"
            type="checkbox"
            defaultChecked={true}
            className="mt-1 h-4 w-4 rounded accent-[hsl(var(--accent))]"
          />
          <span>
            I confirm the guest was informed and agreed to this identity document being stored for statutory hotel
            check-in compliance.
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
  );
}
