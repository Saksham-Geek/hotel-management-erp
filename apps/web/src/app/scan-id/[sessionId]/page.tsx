'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { compressImageFile, formatBytes } from '@/lib/image-compression';
import { IdRedactionModal } from '@/components/id-redaction-modal';

export default function MobileScanPage() {
  const params = useParams();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [sessionStatus, setSessionStatus] = useState<'checking' | 'ready' | 'expired' | 'error'>('checking');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRedactionModalOpen, setIsRedactionModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stop camera media stream helper
  const stopCameraStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // 1. Verify session validity on mount
  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/kyc-bridge/${encodeURIComponent(sessionId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Session invalid');
        return res.json();
      })
      .then((data) => {
        if (data.status === 'pending') {
          setSessionStatus('ready');
        } else {
          setSessionStatus('expired');
        }
      })
      .catch(() => setSessionStatus('expired'));
  }, [sessionId]);

  // 2. Launch Live In-Browser Webcam / Phone Camera via WebRTC
  const startLiveCamera = async () => {
    setCameraError(null);
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setCameraError(
          'Chrome blocks webcam access on insecure IP addresses. Click "Switch to localhost" below to use your laptop webcam.',
        );
        return;
      }
      // Fallback to native camera file input if getUserMedia is not supported
      fileInputRef.current?.click();
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
      }
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.warn('Direct camera access error:', err);
      // If browser blocks getUserMedia (e.g. non-HTTPS on mobile), fall back to file input
      setCameraError('Live viewfinder blocked by browser. Using native camera capture instead.');
      fileInputRef.current?.click();
    }
  };

  // 3. Shutter Click: Capture frame from live video
  const captureFrameFromVideo = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    // Stop live camera stream once frame is snapped
    stopCameraStream();
    setIsProcessing(true);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setIsProcessing(false);
          setErrorMessage('Failed to capture frame from camera.');
          return;
        }

        const rawFile = new File([blob], `aadhaar-cam-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        setOriginalSize(rawFile.size);

        try {
          const result = await compressImageFile(rawFile, {
            maxDimension: 1920,
            quality: 0.82,
            outputMimeType: 'image/jpeg',
          });

          setCompressedFile(result.file);
          setCompressedSize(result.compressedSize);

          const reader = new FileReader();
          reader.onload = (e) => {
            setPhotoPreview(e.target?.result as string);
            setIsProcessing(false);
          };
          reader.readAsDataURL(result.file);
        } catch (err: unknown) {
          setIsProcessing(false);
          const msg = err instanceof Error ? err.message : 'Failed to compress photo.';
          setErrorMessage(msg);
        }
      },
      'image/jpeg',
      0.92,
    );
  };

  // 4. Fallback File Input Capture
  const handlePhotoCapturedFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCameraStream();
    setErrorMessage(null);
    setIsProcessing(true);
    setOriginalSize(file.size);

    try {
      const result = await compressImageFile(file, {
        maxDimension: 1920,
        quality: 0.82,
        outputMimeType: 'image/jpeg',
      });

      setCompressedFile(result.file);
      setCompressedSize(result.compressedSize);

      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
        setIsProcessing(false);
      };
      reader.readAsDataURL(result.file);
    } catch (err: unknown) {
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : 'Failed to compress photo.';
      setErrorMessage(msg);
    }
  };

  // 5. Send photo to the Desk PC
  const sendToDeskPc = async () => {
    if (!compressedFile || !photoPreview || !sessionId) return;

    setIsSending(true);
    setErrorMessage(null);

    try {
      const base64Clean = photoPreview.replace(/^data:[^,]+,/, '');
      const res = await fetch(`/api/kyc-bridge/${encodeURIComponent(sessionId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64: base64Clean,
          mimeType: compressedFile.type,
          fileName: compressedFile.name || `aadhaar-scan-${Date.now()}.jpg`,
          fileSize: compressedFile.size,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to send to PC');
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not deliver photo to desk PC.';
      setErrorMessage(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleRetake = () => {
    setPhotoPreview(null);
    setCompressedFile(null);
    setErrorMessage(null);
    startLiveCamera();
  };

  // Expired / Invalid state
  if (sessionStatus === 'expired') {
    return (
      <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mb-4">
          ⏱️
        </div>
        <h1 className="text-xl font-bold">QR Session Expired</h1>
        <p className="mt-2 text-sm text-slate-400 max-w-xs">
          This ephemeral mobile bridge session has expired or was already used. Please click <strong>"Snap with Phone"</strong> on your desk PC to generate a fresh QR code.
        </p>
      </main>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="h-20 w-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-4xl mb-4">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-white">Sent to Desk PC!</h1>
        <p className="mt-2 text-sm text-emerald-300 font-medium">
          The document has been securely transferred to your laptop screen.
        </p>
        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-xs text-slate-400 max-w-xs space-y-2">
          <p className="text-slate-300 font-semibold">🔒 Zero-Footprint Security</p>
          <p>
            This photo stayed in temporary browser memory only. It was not saved to your personal phone gallery or WhatsApp.
          </p>
        </div>
        <p className="mt-8 text-xs text-slate-500">You may now close this mobile tab.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto">
      {/* Fallback real camera/file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapturedFromFile}
        className="sr-only"
      />

      {/* Header */}
      <header className="border-b border-white/10 pb-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏨</span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Front Desk Mobile Bridge
            </span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Direct camera capture for Aadhaar, Passport, or KYC ID
        </p>
      </header>

      {/* Main View Area */}
      <div className="my-auto py-4">
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
            ⚠️ {errorMessage}
          </div>
        )}

        {cameraError && (
          <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-[11px] text-amber-300 space-y-2">
            <p>ℹ️ {cameraError}</p>
            {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && (
              <button
                type="button"
                onClick={() => {
                  window.location.hostname = 'localhost';
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer hover:bg-amber-300 transition"
              >
                Switch this tab to localhost (Enables Webcam)
              </button>
            )}
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center p-8 space-y-3">
            <svg className="h-8 w-8 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-xs font-medium text-slate-300 animate-pulse">
              Optimizing & compressing ID photo...
            </p>
          </div>
        )}

        {/* State A: Idle (Before camera is active) */}
        {!isCameraActive && !photoPreview && !isProcessing && (
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
            <div className="relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center p-6 overflow-hidden">
              <div className="w-[82%] aspect-[85/54] rounded-lg border-2 border-cyan-500/50 bg-cyan-500/5 flex flex-col items-center justify-center p-2 text-center">
                <span className="text-3xl mb-1">🪪</span>
                <span className="text-[11px] font-medium text-cyan-300">
                  Align ID card within frame
                </span>
                <span className="text-[9px] text-cyan-400/80 mt-0.5">
                  Keep details flat & avoid glare
                </span>
              </div>
            </div>

            <div className="w-full space-y-2">
              <button
                type="button"
                onClick={startLiveCamera}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 font-bold text-slate-950 text-sm shadow-lg shadow-teal-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="text-lg">📷</span>
                <span>Open Live Camera</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-850 text-slate-300 text-xs font-medium active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📁</span>
                <span>Choose photo from device gallery / files</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Photo will be transferred directly to your desk PC form. No photos will remain on your device.
            </p>
          </div>
        )}

        {/* State B: Live Video Viewfinder Active */}
        <div className={`space-y-3 ${isCameraActive && !photoPreview && !isProcessing ? 'block' : 'hidden'}`}>
          <div className="relative rounded-2xl overflow-hidden border border-cyan-500/40 bg-black aspect-[4/3] flex items-center justify-center shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Guide overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
              <div className="w-[88%] aspect-[85/54] rounded-lg border-2 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center">
                <span className="rounded bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                  Align ID card here
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={stopCameraStream}
              className="py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 active:scale-[0.98] transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={captureFrameFromVideo}
              className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 font-bold text-slate-950 text-sm shadow-lg shadow-teal-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="text-lg">📸</span>
              <span>Snap Photo Now</span>
            </button>
          </div>
        </div>

        {/* State C: Captured Photo Review */}
        {photoPreview && !isProcessing && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-black aspect-[4/3] flex items-center justify-center shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Captured ID"
                className="max-h-full max-w-full object-contain"
              />
              <div className="absolute top-2 right-2 rounded-lg bg-black/70 backdrop-blur px-2 py-1 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                Compressed: {formatBytes(compressedSize)} (from {formatBytes(originalSize)})
              </div>
            </div>

            {/* 1-Click Mask & Redact Button */}
            <button
              type="button"
              onClick={() => setIsRedactionModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>🛡️</span>
              <span>Mask Aadhaar (First 8 Digits &amp; QR) / Redact ID</span>
            </button>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleRetake}
                disabled={isSending}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold active:scale-[0.98] transition disabled:opacity-50 cursor-pointer"
              >
                🔄 Retake
              </button>

              <button
                type="button"
                onClick={sendToDeskPc}
                disabled={isSending}
                className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-slate-950" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Sending to PC...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Send to Desk PC</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Security Badges */}
      <footer className="border-t border-white/10 pt-3 text-center">
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
          <span>🛡️ DPDP Act 2023 Compliant</span>
          <span>•</span>
          <span>Ephemeral In-Memory Transfer</span>
        </div>
      </footer>
      {/* Mobile ID Redaction Modal */}
      {isRedactionModalOpen && compressedFile && (
        <IdRedactionModal
          isOpen={true}
          file={compressedFile}
          onClose={() => setIsRedactionModalOpen(false)}
          onSave={async (redactedFile) => {
            setIsRedactionModalOpen(false);
            setCompressedFile(redactedFile);
            setCompressedSize(redactedFile.size);
            const reader = new FileReader();
            reader.onload = (e) => {
              setPhotoPreview(String(e.target?.result || ''));
            };
            reader.readAsDataURL(redactedFile);
          }}
        />
      )}
    </main>
  );
}
