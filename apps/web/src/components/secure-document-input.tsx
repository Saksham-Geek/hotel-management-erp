'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  compressImageFile,
  formatBytes,
  validateFileBeforeProcessing,
  DEFAULT_MAX_RAW_SIZE,
  DEFAULT_MAX_OUTPUT_SIZE,
  MAX_DOCUMENTS_PER_GUEST,
  type CompressionResult,
} from '@/lib/image-compression';

export interface SecureDocumentInputProps {
  id?: string;
  name: string;
  multiple?: boolean;
  required?: boolean;
  className?: string;
  maxFiles?: number;
  label?: string;
  sublabel?: string;
  ariaLabel?: string;
  onFilesChanged?: (files: File[]) => void;
}

export function SecureDocumentInput({
  id = 'secure-doc-input',
  name,
  multiple = false,
  required = false,
  className = '',
  maxFiles = MAX_DOCUMENTS_PER_GUEST,
  label,
  sublabel,
  ariaLabel = 'Upload identity documents',
  onFilesChanged,
}: SecureDocumentInputProps) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<CompressionResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync internal items to hidden file input using DataTransfer
  useEffect(() => {
    if (!hiddenInputRef.current) return;
    try {
      const dt = new DataTransfer();
      items.forEach((item) => dt.items.add(item.file));
      hiddenInputRef.current.files = dt.files;
    } catch {
      // Fallback for environments where DataTransfer is restricted
    }
    if (onFilesChanged) {
      onFilesChanged(items.map((i) => i.file));
    }
  }, [items, onFilesChanged]);

  const processSelectedFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);
    setIsProcessing(true);

    const incoming = Array.from(fileList);

    // Limit check
    const totalCount = (multiple ? items.length : 0) + incoming.length;
    if (multiple && totalCount > maxFiles) {
      setErrorMessage(`You can upload at most ${maxFiles} documents per submission.`);
      setIsProcessing(false);
      return;
    }

    const newResults: CompressionResult[] = [];
    const errors: string[] = [];

    for (const file of incoming) {
      const preCheck = validateFileBeforeProcessing(file, DEFAULT_MAX_RAW_SIZE, DEFAULT_MAX_OUTPUT_SIZE);
      if (!preCheck.valid) {
        errors.push(preCheck.error || `Invalid file: ${file.name}`);
        continue;
      }

      try {
        const result = await compressImageFile(file, {
          maxDimension: 1920,
          quality: 0.82,
        });
        newResults.push(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : `Failed to process ${file.name}`;
        errors.push(msg);
      }
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join(' • '));
    }

    if (newResults.length > 0) {
      if (multiple) {
        setItems((prev) => [...prev, ...newResults]);
      } else {
        setItems(newResults.slice(0, 1));
      }
    }

    setIsProcessing(false);
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processSelectedFiles(e.target.files);
    // Reset file input value so selecting the same file again triggers onChange
    e.target.value = '';
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Hidden real form input that gets submitted with FormData */}
      <input
        ref={hiddenInputRef}
        id={id}
        name={name}
        type="file"
        multiple={multiple}
        required={required && items.length === 0}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        aria-label={ariaLabel}
        className="sr-only"
        tabIndex={-1}
      />

      {/* Hidden camera input for mobile direct snap (bypasses saving to gallery) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="sr-only"
        tabIndex={-1}
      />

      {/* Header labels */}
      {label && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={id} className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label} {required && <span className="text-danger font-bold">*</span>}
          </label>
          {sublabel && (
            <span className="text-[11px] text-muted">
              {sublabel}
            </span>
          )}
        </div>
      )}

      {/* Upload & Mobile Camera Actions Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={`${id}-picker`}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition active:scale-[0.98] dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
        >
          <span>📁</span>
          <span>Choose {multiple ? 'Files' : 'File'}</span>
          <input
            id={`${id}-picker`}
            type="file"
            multiple={multiple}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleInputChange}
            className="sr-only"
          />
        </label>

        {/* Mobile / Tablet Camera Quick Capture */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-ground/60 px-3 py-2 text-xs font-medium text-ink hover:bg-ground transition active:scale-[0.98] cursor-pointer"
          title="Direct camera capture: photo stays in memory, never saved to personal gallery or sent via WhatsApp"
        >
          <span>📷</span>
          <span>Snap Photo</span>
        </button>

        <span className="text-[11px] text-muted hidden sm:inline">
          Max 15 MB raw · Auto-compressed to &lt; 500 KB · PDF up to 5 MB
        </span>
      </div>

      {/* Active Processing Indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/20 bg-accent-soft/20 px-3 py-2 text-xs text-lagoon-dark animate-pulse">
          <svg className="h-4 w-4 animate-spin text-lagoon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="font-medium">Compressing & optimizing image client-side...</span>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <span className="text-sm shrink-0">⚠️</span>
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* File List & Compression Statistics Badges */}
      {items.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {items.map((item, idx) => {
            const isPdf = item.file.type === 'application/pdf';
            return (
              <div
                key={`${item.file.name}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-2.5 shadow-2xs text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ground text-sm">
                    {isPdf ? '📄' : '📸'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink" title={item.file.name}>
                      {item.file.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                      {item.isCompressed ? (
                        <>
                          <span className="line-through text-slate-400">{formatBytes(item.originalSize)}</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            → {formatBytes(item.compressedSize)}
                          </span>
                          <span className="rounded-md bg-emerald-500/10 px-1 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            -{item.savingsPercent}%
                          </span>
                          {item.width && item.height && (
                            <span className="text-slate-400">({item.width}×{item.height})</span>
                          )}
                        </>
                      ) : (
                        <span>{formatBytes(item.compressedSize)} · {isPdf ? 'PDF document' : 'Standard image'}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    ✓ Ready
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="grid h-6 w-6 place-items-center rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition cursor-pointer"
                    title="Remove this document"
                    aria-label={`Remove ${item.file.name}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
