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
  const fallbackFileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<CompressionResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Direct Laptop / Desktop Webcam Modal States
  const [isWebcamModalOpen, setIsWebcamModalOpen] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const laptopVideoRef = useRef<HTMLVideoElement>(null);
  const laptopStreamRef = useRef<MediaStream | null>(null);

  // Ephemeral Mobile QR Bridge States
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isInitiatingBridge, setIsInitiatingBridge] = useState(false);
  const [bridgeSessionId, setBridgeSessionId] = useState<string | null>(null);
  const [bridgeScanUrl, setBridgeScanUrl] = useState<string>('');
  const [bridgeQrDataUrl, setBridgeQrDataUrl] = useState<string>('');
  const [bridgeSecondsLeft, setBridgeSecondsLeft] = useState<number>(300);
  const [bridgeToast, setBridgeToast] = useState<string | null>(null);
  const [detectedLanIp, setDetectedLanIp] = useState<string>('');
  const [customHost, setCustomHost] = useState<string>('');
  const [isEditingHost, setIsEditingHost] = useState(false);
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

  // Stop Laptop Webcam stream
  const stopLaptopWebcam = useCallback(() => {
    if (laptopStreamRef.current) {
      laptopStreamRef.current.getTracks().forEach((track) => track.stop());
      laptopStreamRef.current = null;
    }
    setIsWebcamActive(false);
    setIsWebcamModalOpen(false);
  }, []);

  // Handle escape key to dismiss modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isQrModalOpen) closeQrModal();
        if (isWebcamModalOpen) stopLaptopWebcam();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQrModalOpen, isWebcamModalOpen, closeQrModal, stopLaptopWebcam]);

  // Cleanup timers and streams on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (laptopStreamRef.current) laptopStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // 1. Direct Laptop Webcam Flow
  const startLaptopWebcam = async () => {
    setWebcamError(null);
    setIsWebcamModalOpen(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setWebcamError('Your browser does not support in-browser camera access. Use Choose Files instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      laptopStreamRef.current = stream;
      if (laptopVideoRef.current) {
        laptopVideoRef.current.srcObject = stream;
        laptopVideoRef.current.onloadedmetadata = () => {
          laptopVideoRef.current?.play().catch(() => {});
        };
      }
      setIsWebcamActive(true);
    } catch (err: unknown) {
      console.warn('Webcam access error:', err);
      setWebcamError('Camera access denied or webcam in use by another app. Please grant browser camera permissions.');
    }
  };

  const captureLaptopWebcamFrame = async () => {
    if (!laptopVideoRef.current) return;
    const video = laptopVideoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    stopLaptopWebcam();
    setIsProcessing(true);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setIsProcessing(false);
          setErrorMessage('Failed to capture frame from webcam.');
          return;
        }

        const rawFile = new File([blob], `laptop-webcam-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        await processSelectedFiles([rawFile]);
        setBridgeToast('📸 Photo captured via laptop webcam!');
        setTimeout(() => setBridgeToast(null), 4000);
      },
      'image/jpeg',
      0.92,
    );
  };

  // 2. Initiate QR Mobile Bridge Session
  const startMobileQrBridge = async () => {
    setIsInitiatingBridge(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/kyc-bridge', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to initialize QR mobile session.');
      }

      const { sessionId, scanUrl, lanIp, port } = data;
      setBridgeSessionId(sessionId);
      setDetectedLanIp(lanIp || '');
      setCustomHost(lanIp ? `${lanIp}:${port}` : window.location.host);
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

  // Re-generate QR if custom host/IP is changed by user
  const handleHostUpdate = async (newHost: string) => {
    setCustomHost(newHost);
    if (!bridgeSessionId) return;
    const cleanHost = newHost.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const isHttpsTunnel = cleanHost.includes('.loca.lt') || cleanHost.includes('ngrok') || cleanHost.includes('.app');
    const protocol = isHttpsTunnel ? 'https:' : window.location.protocol;
    const newScanUrl = `${protocol}//${cleanHost}/scan-id/${bridgeSessionId}`;
    setBridgeScanUrl(newScanUrl);

    try {
      const qrData = await QRCode.toDataURL(newScanUrl, {
        width: 260,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      setBridgeQrDataUrl(qrData);
    } catch {
      // Ignore QR generation errors
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

      {/* Hidden fallback camera/file input */}
      <input
        ref={fallbackFileInputRef}
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

      {/* Upload, Mobile QR Bridge, and Laptop Webcam Actions Bar */}
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

        {/* 3. Direct Laptop Webcam Capture */}
        <button
          type="button"
          onClick={startLaptopWebcam}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-ground/60 px-3 py-2 text-xs font-medium text-ink hover:bg-ground transition active:scale-[0.98] cursor-pointer"
          title="Open laptop/PC webcam directly on screen to hold up and snap ID"
        >
          <span>📷</span>
          <span>Laptop Webcam</span>
        </button>

        <span className="text-[11px] text-muted hidden lg:inline">
          Max 15 MB raw · Auto-compressed to &lt; 500 KB · PDF up to 5 MB
        </span>
      </div>

      {/* Success Toast from Mobile Bridge / Webcam */}
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

      {/* Modal 1: Laptop Direct Webcam Capture */}
      {isWebcamModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={stopLaptopWebcam}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-2xl relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-left">
                <span className="text-xl">📷</span>
                <div>
                  <h3 className="text-sm font-bold text-ink">Laptop Webcam Capture</h3>
                  <p className="text-[11px] text-muted">Hold ID card flat facing the camera</p>
                </div>
              </div>
              <button
                type="button"
                onClick={stopLaptopWebcam}
                className="grid h-7 w-7 place-items-center rounded-lg hover:bg-ground text-slate-400 hover:text-ink text-sm transition cursor-pointer"
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>

            <div className="my-4">
              {webcamError ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
                  ⚠️ {webcamError}
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-black aspect-[4/3] flex items-center justify-center shadow-lg">
                  <video
                    ref={laptopVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Card alignment overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                    <div className="w-[85%] aspect-[85/54] rounded-lg border-2 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center">
                      <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                        Hold Aadhaar / Passport here
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isWebcamActive && !webcamError && (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={stopLaptopWebcam}
                  className="py-2.5 px-4 rounded-xl border border-line bg-surface hover:bg-ground text-xs font-medium text-ink transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={captureLaptopWebcamFrame}
                  className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-base">📸</span>
                  <span>Capture & Use ID Photo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: Snap with Phone QR Bridge */}
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
            <div className="my-3 flex flex-col items-center">
              <div className="rounded-xl border border-line bg-white p-3 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bridgeQrDataUrl}
                  alt="QR Code for mobile document camera"
                  className="h-52 w-52 object-contain"
                />
              </div>

              {/* Status and Countdown */}
              <div className="mt-2.5 flex items-center gap-2 text-xs text-muted">
                <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                <span>Waiting for photo from phone...</span>
                <span className="font-mono font-semibold text-ink">({formatCountdown(bridgeSecondsLeft)})</span>
              </div>
            </div>

            {/* Network / Wi-Fi IP Information Banner */}
            <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-left text-[11px] text-emerald-900 dark:text-emerald-200 space-y-1.5">
              <div className="flex items-center justify-between font-semibold">
                <span>📡 Network Target for Phone:</span>
                <button
                  type="button"
                  onClick={() => setIsEditingHost(!isEditingHost)}
                  className="text-[10px] text-cyan-700 dark:text-cyan-300 underline cursor-pointer"
                >
                  {isEditingHost ? 'Done' : 'Custom'}
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleHostUpdate('192.168.1.9:3000')}
                  className="px-2 py-1 rounded-md text-[10px] font-semibold bg-white dark:bg-white/10 border border-slate-300 dark:border-white/20 hover:bg-slate-50 transition cursor-pointer"
                  title="Direct local Wi-Fi connection"
                >
                  Wi-Fi IP (192.168.1.9)
                </button>
                <button
                  type="button"
                  onClick={() => handleHostUpdate('gentle-onions-guess.loca.lt')}
                  className="px-2 py-1 rounded-md text-[10px] font-semibold bg-cyan-500/20 text-cyan-900 dark:text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/30 transition cursor-pointer"
                  title="Public HTTPS Tunnel: bypasses Wi-Fi router isolation and Windows firewall"
                >
                  🌐 Cloud Tunnel (Bypasses Firewall)
                </button>
              </div>

              {isEditingHost ? (
                <div className="pt-1 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customHost}
                    onChange={(e) => handleHostUpdate(e.target.value)}
                    placeholder="e.g. 192.168.1.9:3000 or tunnel.domain"
                    className="w-full rounded-md border border-line bg-surface px-2 py-1 font-mono text-[11px] text-ink"
                  />
                </div>
              ) : (
                <p className="font-mono text-[10px] truncate text-emerald-800 dark:text-emerald-300">
                  {bridgeScanUrl}
                </p>
              )}

              <p className="text-[10px] text-muted">
                If Wi-Fi fails due to router isolation, tap <strong>Cloud Tunnel</strong> above to connect instantly!
              </p>
            </div>

            {/* Desktop Instant Test Button */}
            <div className="pt-2 border-t border-line flex flex-col gap-2 text-[11px]">
              <a
                href={bridgeScanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-xl border border-lagoon/30 bg-lagoon/10 hover:bg-lagoon/20 font-semibold text-lagoon-dark transition text-center flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🧪</span>
                <span>Open Mobile Scanner in New Tab (Test Instantly)</span>
              </a>
              <p className="text-[10px] text-muted leading-tight">
                💡 If testing from phone, ensure Windows Firewall allows incoming connections on port 3000.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
