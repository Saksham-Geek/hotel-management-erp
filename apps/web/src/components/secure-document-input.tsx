'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
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

  // Ephemeral Mobile QR Bridge States
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isInitiatingBridge, setIsInitiatingBridge] = useState(false);
  const [bridgeSessionId, setBridgeSessionId] = useState<string | null>(null);
  const [bridgeScanUrl, setBridgeScanUrl] = useState<string>('');
  const [bridgeQrDataUrl, setBridgeQrDataUrl] = useState<string>('');
  const [bridgeSecondsLeft, setBridgeSecondsLeft] = useState<number>(300);
  const [bridgeToast, setBridgeToast] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const processSelectedFiles = useCallback(
    async (fileList: FileList | File[] | null) => {
      if (!fileList || (fileList instanceof FileList && fileList.length === 0)) return;
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
    },
    [items.length, maxFiles, multiple],
  );

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processSelectedFiles(e.target.files);
    // Reset file input value so selecting the same file again triggers onChange
    e.target.value = '';
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  // Close QR Modal and cleanup polling timers
  const closeQrModal = useCallback(() => {
    setIsQrModalOpen(false);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Handle escape key to dismiss QR modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isQrModalOpen) {
        closeQrModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQrModalOpen, closeQrModal]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Initiate QR Mobile Bridge Session
  const startMobileQrBridge = async () => {
    setIsInitiatingBridge(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/kyc-bridge', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to initialize QR mobile session.');
      }

      const { sessionId, scanUrl } = data;
      setBridgeSessionId(sessionId);
      setBridgeScanUrl(scanUrl);
      setBridgeSecondsLeft(300);

      const qrData = await QRCode.toDataURL(scanUrl, {
        width: 260,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });

      setBridgeQrDataUrl(qrData);
      setIsQrModalOpen(true);
      setIsInitiatingBridge(false);

      // Start 5-minute countdown
      timerIntervalRef.current = setInterval(() => {
        setBridgeSecondsLeft((prev) => {
          if (prev <= 1) {
            closeQrModal();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start polling for photo delivery from mobile
      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/kyc-bridge/${encodeURIComponent(sessionId)}`);
          if (!pollRes.ok) return;

          const pollData = await pollRes.json();
          if (pollData.status === 'uploaded' && pollData.data) {
            // Photo received from mobile!
            closeQrModal();

            // Decode base64 to standard File
            const raw = pollData.data;
            const byteCharacters = atob(raw.base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: raw.mimeType || 'image/jpeg' });
            const file = new File([blob], raw.fileName || 'aadhaar-mobile-scan.jpg', {
              type: raw.mimeType || 'image/jpeg',
              lastModified: Date.now(),
            });

            // Process and add to documents
            await processSelectedFiles([file]);

            setBridgeToast('🎉 Photo received from mobile camera and attached!');
            setTimeout(() => setBridgeToast(null), 5000);
          } else if (pollData.status === 'expired') {
            closeQrModal();
          }
        } catch {
          // Ignore transient poll errors
        }
      }, 1200);
    } catch (err: unknown) {
      setIsInitiatingBridge(false);
      const msg = err instanceof Error ? err.message : 'Could not create mobile bridge session.';
      setErrorMessage(msg);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

      {/* Hidden camera input for devices with local camera (bypasses saving to gallery) */}
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

      {/* Upload & Mobile QR Bridge Actions Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 1. File Picker */}
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

        {/* 2. Snap with Phone QR Bridge (Method 1) */}
        <button
          type="button"
          onClick={startMobileQrBridge}
          disabled={isInitiatingBridge}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-500/20 active:scale-[0.98] transition cursor-pointer dark:text-cyan-300"
          title="Scan laptop screen with your smartphone camera to snap the guest ID directly without WhatsApp"
        >
          {isInitiatingBridge ? (
            <>
              <svg className="h-3.5 w-3.5 animate-spin text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Generating QR...</span>
            </>
          ) : (
            <>
              <span>📱</span>
              <span>Snap with Phone</span>
            </>
          )}
        </button>

        {/* 3. Direct Camera fallback for mobile/tablet */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="inline-flex sm:hidden items-center gap-1.5 rounded-xl border border-line bg-ground/60 px-3 py-2 text-xs font-medium text-ink hover:bg-ground transition active:scale-[0.98] cursor-pointer"
          title="Open camera directly on this device"
        >
          <span>📷</span>
          <span>Camera</span>
        </button>

        <span className="text-[11px] text-muted hidden lg:inline">
          Max 15 MB raw · Auto-compressed to &lt; 500 KB · PDF up to 5 MB
        </span>
      </div>

      {/* Success Toast from Mobile Bridge */}
      {bridgeToast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in duration-300">
          <span>✓</span>
          <span>{bridgeToast}</span>
        </div>
      )}

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

      {/* Modal: Snap with Phone QR Bridge */}
      {isQrModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={closeQrModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-2xl relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-left">
                <span className="text-xl">📱</span>
                <div>
                  <h3 className="text-sm font-bold text-ink">Snap ID with Phone</h3>
                  <p className="text-[11px] text-muted">No WhatsApp · 0 files in phone gallery</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeQrModal}
                className="grid h-7 w-7 place-items-center rounded-lg hover:bg-ground text-slate-400 hover:text-ink text-sm transition cursor-pointer"
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>

            {/* QR Code Presentation */}
            <div className="my-4 flex flex-col items-center">
              <div className="rounded-xl border border-line bg-white p-3 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bridgeQrDataUrl}
                  alt="QR Code for mobile document camera"
                  className="h-56 w-56 object-contain"
                />
              </div>

              {/* Status and Countdown */}
              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                <span>Waiting for photo from phone...</span>
                <span className="font-mono font-semibold text-ink">({formatCountdown(bridgeSecondsLeft)})</span>
              </div>
            </div>

            {/* Instructional Steps */}
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-left text-[11px] text-slate-700 dark:text-slate-300 space-y-1.5">
              <p className="font-semibold text-cyan-900 dark:text-cyan-200">How it works:</p>
              <p>1. Open your phone camera and point it at this QR code.</p>
              <p>2. Tap the link that appears to snap the Aadhaar/Passport.</p>
              <p>3. Tap <strong>"Send to Desk PC"</strong> — photo appears right here!</p>
            </div>

            {/* Desktop Test Link Helper */}
            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-[11px]">
              <span className="text-muted">Testing on this computer?</span>
              <a
                href={bridgeScanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-lagoon-dark underline hover:opacity-80"
              >
                Open Scanner Tab ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
