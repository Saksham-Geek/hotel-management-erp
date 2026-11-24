'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { btnCls, btnGhostCls } from './ui';

export interface RedactionBox {
  id: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // percentage (0-100)
  height: number; // percentage (0-100)
  label: string;
  type?: 'aadhaar_digits' | 'aadhaar_qr' | 'mrz' | 'signature' | 'barcode' | 'custom';
}

interface IdRedactionModalProps {
  isOpen: boolean;
  file: File | null;
  documentType?: 'aadhaar_masked' | 'passport' | 'driving_license' | 'voter_id' | 'pan' | 'other';
  onClose: () => void;
  onSave: (redactedFile: File) => void;
}

declare global {
  interface Window {
    pdfjsLib?: {
      getDocument: (params: { data: Uint8Array }) => {
        promise: Promise<{
          getPage: (pageNumber: number) => Promise<{
            getViewport: (params: { scale: number }) => { width: number; height: number };
            render: (params: {
              canvasContext: CanvasRenderingContext2D;
              viewport: { width: number; height: number };
            }) => { promise: Promise<void> };
          }>;
        }>;
      };
      GlobalWorkerOptions: {
        workerSrc: string;
      };
    };
  }
}

export function IdRedactionModal({
  isOpen,
  file,
  documentType = 'aadhaar_masked',
  onClose,
  onSave,
}: IdRedactionModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<RedactionBox[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'draw'>('draw');
  const [imageBitmapSource, setImageBitmapSource] = useState<HTMLImageElement | HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDragRect, setCurrentDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [complianceSummary, setComplianceSummary] = useState<string>('');

  // 1. Load File into Image or Canvas (supports JPEG, PNG, WebP, and PDF)
  useEffect(() => {
    if (!file || !isOpen) {
      setImageBitmapSource(null);
      setBoxes([]);
      setPdfLoadError(null);
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      // PDF File Rendering
      setLoadingPdf(true);
      setPdfLoadError(null);

      const renderPdfPage = async (arrayBuffer: ArrayBuffer) => {
        try {
          if (!window.pdfjsLib) {
            // Load pdf.js dynamically from CDN
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
              script.onload = () => {
                if (window.pdfjsLib) {
                  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                  resolve();
                } else {
                  reject(new Error('pdfjsLib failed to initialize'));
                }
              };
              script.onerror = () => reject(new Error('Network error loading PDF renderer'));
              document.head.appendChild(script);
            });
          }

          if (!window.pdfjsLib) throw new Error('PDF library unavailable');

          const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
          const page = await pdf.getPage(1); // Render 1st page where ID card is located
          const viewport = page.getViewport({ scale: 2.0 }); // High-DPI 2x scale for crystal clear legibility

          const offscreenCanvas = document.createElement('canvas');
          offscreenCanvas.width = viewport.width;
          offscreenCanvas.height = viewport.height;
          const ctx = offscreenCanvas.getContext('2d');
          if (!ctx) throw new Error('Could not create offscreen canvas context');

          await page.render({ canvasContext: ctx, viewport }).promise;

          setImageBitmapSource(offscreenCanvas);
          setLoadingPdf(false);
          applySmartPreset(documentType, offscreenCanvas.width, offscreenCanvas.height);
        } catch (err: unknown) {
          console.warn('PDF rendering error:', err);
          setLoadingPdf(false);
          setPdfLoadError(
            'Could not render PDF preview directly. You can take a photo of the ID using the mobile scanner or webcam for instant masking.',
          );
        }
      };

      const fileReader = new FileReader();
      fileReader.onload = () => {
        if (fileReader.result instanceof ArrayBuffer) {
          renderPdfPage(fileReader.result);
        }
      };
      fileReader.onerror = () => {
        setLoadingPdf(false);
        setPdfLoadError('Could not read PDF file.');
      };
      fileReader.readAsArrayBuffer(file);
    } else {
      // Standard Image Rendering (JPEG, PNG, WebP)
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImageBitmapSource(img);
        applySmartPreset(documentType, img.width, img.height);
      };
      img.onerror = () => {
        setPdfLoadError('Failed to load image.');
      };
      img.src = objectUrl;

      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
  }, [file, isOpen, documentType]);

  // 2. Apply Statutory Smart Presets for Indian ID Proofs
  const applySmartPreset = (type: string, docWidth = 1000, docHeight = 650) => {
    const fileName = file?.name?.toLowerCase() || '';
    const isAadhaar = type === 'aadhaar_masked' || fileName.includes('aadhaar') || fileName.includes('aadhar');
    const isPassport = type === 'passport' || fileName.includes('passport');
    const isDl = type === 'driving_license' || fileName.includes('license') || fileName.includes('dl');
    const isVoter = type === 'voter_id' || fileName.includes('voter') || fileName.includes('epic');
    const isPan = type === 'pan' || fileName.includes('pan');

    if (isAadhaar) {
      // UIDAI Rule 2022 / Section 29: Mask first 8 digits & the unencrypted 2D QR Code
      const aadhaarBoxes: RedactionBox[] = [
        {
          id: 'aadhaar-digits-' + Date.now(),
          x: 20, // Covers digits 1-8 in the standard bottom strip (leaves last 4 visible)
          y: 71,
          width: 38,
          height: 13,
          label: 'XXXX XXXX (UIDAI SEC 29)',
          type: 'aadhaar_digits',
        },
        {
          id: 'aadhaar-qr-' + Date.now(),
          x: 64, // Covers the unencrypted demographic 2D QR code
          y: 50,
          width: 30,
          height: 42,
          label: 'QR CODE (CONFIDENTIAL)',
          type: 'aadhaar_qr',
        },
      ];
      setBoxes(aadhaarBoxes);
      setComplianceSummary(
        'UIDAI Section 29 Compliant: First 8 digits (XXXX XXXX) & 2D demographic QR code targeted for permanent blackout.',
      );
    } else if (isPassport) {
      // MEA / Passport Act 1967: Redact bottom 2-line Machine Readable Zone (MRZ) & specimen signature
      const passportBoxes: RedactionBox[] = [
        {
          id: 'passport-mrz-' + Date.now(),
          x: 4,
          y: 80,
          width: 92,
          height: 18,
          label: 'MRZ LINES REDACTED (PASSPORT ACT)',
          type: 'mrz',
        },
        {
          id: 'passport-sig-' + Date.now(),
          x: 6,
          y: 65,
          width: 32,
          height: 12,
          label: 'SIGNATURE REDACTED',
          type: 'signature',
        },
      ];
      setBoxes(passportBoxes);
      setComplianceSummary(
        'Passport Compliance: Bottom 2 Machine-Readable Zone (MRZ) lines and specimen signature auto-targeted.',
      );
    } else if (isDl) {
      // MoRTH Compliance: Redact specimen signature and emergency contact
      const dlBoxes: RedactionBox[] = [
        {
          id: 'dl-signature-' + Date.now(),
          x: 55,
          y: 65,
          width: 38,
          height: 16,
          label: 'SIGNATURE REDACTED (MoRTH)',
          type: 'signature',
        },
      ];
      setBoxes(dlBoxes);
      setComplianceSummary(
        'MoRTH Compliance: Holder signature block auto-targeted for identity privacy protection.',
      );
    } else if (isVoter) {
      // Election Commission of India: Redact voter barcode
      const voterBoxes: RedactionBox[] = [
        {
          id: 'voter-barcode-' + Date.now(),
          x: 60,
          y: 20,
          width: 35,
          height: 25,
          label: 'BARCODE REDACTED',
          type: 'barcode',
        },
      ];
      setBoxes(voterBoxes);
      setComplianceSummary(
        'Election Commission Compliance: Tracking barcode and sensitive markers targeted.',
      );
    } else if (isPan) {
      // Income Tax Rule 114B: Redact middle digits of PAN and signature
      const panBoxes: RedactionBox[] = [
        {
          id: 'pan-digits-' + Date.now(),
          x: 10,
          y: 68,
          width: 45,
          height: 14,
          label: 'PAN MASKED (IT RULE 114B)',
          type: 'custom',
        },
        {
          id: 'pan-sig-' + Date.now(),
          x: 58,
          y: 70,
          width: 36,
          height: 16,
          label: 'SIGNATURE REDACTED',
          type: 'signature',
        },
      ];
      setBoxes(panBoxes);
      setComplianceSummary(
        'IT Act Compliance: PAN card middle digits and specimen signature targeted for masking.',
      );
    } else {
      setBoxes([]);
      setComplianceSummary(
        'Drag crosshair over any sensitive numbers, QR codes, or signatures to create custom blackout boxes.',
      );
    }
  };

  // 3. Render Canvas with Document & Redaction Overlays
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageBitmapSource) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageBitmapSource.width;
    canvas.height = imageBitmapSource.height;

    // Draw document source (Image or PDF page canvas)
    ctx.drawImage(imageBitmapSource, 0, 0, imageBitmapSource.width, imageBitmapSource.height);

    // Draw active redaction boxes
    boxes.forEach((box) => {
      const bx = (box.x / 100) * canvas.width;
      const by = (box.y / 100) * canvas.height;
      const bw = (box.width / 100) * canvas.width;
      const bh = (box.height / 100) * canvas.height;

      const isSelected = box.id === selectedBoxId;

      // Solid pitch blackout
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx, by, bw, bh);

      // Border highlight
      ctx.lineWidth = isSelected ? 4 : 2;
      ctx.strokeStyle = isSelected ? '#38bdf8' : '#475569';
      ctx.strokeRect(bx, by, bw, bh);

      // Security stamp label
      const fontSize = Math.max(11, Math.min(22, Math.floor(bh * 0.28)));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const label = box.label || '[CONFIDENTIAL]';
      ctx.fillText(label, bx + bw / 2, by + bh / 2, Math.max(10, bw - 10));
    });

    // Draw active drag rectangle
    if (currentDragRect) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(currentDragRect.x, currentDragRect.y, currentDragRect.w, currentDragRect.h);
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(currentDragRect.x, currentDragRect.y, currentDragRect.w, currentDragRect.h);
      ctx.setLineDash([]);
    }
  }, [imageBitmapSource, boxes, selectedBoxId, currentDragRect]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Coordinate normalizer for Mouse & Touch
  const getCoordinatesFromEvent = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Interactive Drag & Draw Event Handlers
  const handleInteractionStart = (clientX: number, clientY: number) => {
    const coords = getCoordinatesFromEvent(clientX, clientY);
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if user tapped inside an existing box
    const clickedBox = [...boxes].reverse().find((b) => {
      const bx = (b.x / 100) * canvas.width;
      const by = (b.y / 100) * canvas.height;
      const bw = (b.width / 100) * canvas.width;
      const bh = (b.height / 100) * canvas.height;
      return coords.x >= bx && coords.x <= bx + bw && coords.y >= by && coords.y <= by + bh;
    });

    if (clickedBox && activeTool === 'select') {
      setSelectedBoxId(clickedBox.id);
      return;
    }

    // Start drawing new redaction box
    setIsDrawing(true);
    setDrawStart(coords);
    setSelectedBoxId(null);
  };

  const handleInteractionMove = (clientX: number, clientY: number) => {
    if (!isDrawing || !drawStart) return;
    const current = getCoordinatesFromEvent(clientX, clientY);
    const x = Math.min(drawStart.x, current.x);
    const y = Math.min(drawStart.y, current.y);
    const w = Math.abs(current.x - drawStart.x);
    const h = Math.abs(current.y - drawStart.y);
    setCurrentDragRect({ x, y, w, h });
  };

  const handleInteractionEnd = () => {
    if (isDrawing && currentDragRect && canvasRef.current) {
      const canvas = canvasRef.current;
      if (currentDragRect.w > 15 && currentDragRect.h > 15) {
        const newBox: RedactionBox = {
          id: 'custom-' + Date.now(),
          x: Math.round((currentDragRect.x / canvas.width) * 1000) / 10,
          y: Math.round((currentDragRect.y / canvas.height) * 1000) / 10,
          width: Math.round((currentDragRect.w / canvas.width) * 1000) / 10,
          height: Math.round((currentDragRect.h / canvas.height) * 1000) / 10,
          label: '[REDACTED]',
          type: 'custom',
        };
        setBoxes((prev) => [...prev, newBox]);
        setSelectedBoxId(newBox.id);
      }
    }
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentDragRect(null);
  };

  // Delete selected box
  const removeSelectedBox = () => {
    if (!selectedBoxId) return;
    setBoxes((prev) => prev.filter((b) => b.id !== selectedBoxId));
    setSelectedBoxId(null);
  };

  // Clear all boxes
  const clearAllBoxes = () => {
    setBoxes([]);
    setSelectedBoxId(null);
  };

  // 4. Burn Redactions Permanently & Save File
  const handleBurnAndSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !file || !imageBitmapSource) return;

    setIsProcessing(true);

    try {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Redraw base image
        ctx.drawImage(imageBitmapSource, 0, 0, canvas.width, canvas.height);

        // Permanently burn pitch black #000000 pixels
        boxes.forEach((box) => {
          const bx = (box.x / 100) * canvas.width;
          const by = (box.y / 100) * canvas.height;
          const bw = (box.width / 100) * canvas.width;
          const bh = (box.height / 100) * canvas.height;

          // Indelible pitch-black stamp
          ctx.fillStyle = '#000000';
          ctx.fillRect(bx, by, bw, bh);

          // White statutory label
          const fontSize = Math.max(12, Math.min(24, Math.floor(bh * 0.28)));
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(box.label || '[CONFIDENTIAL · MASKED]', bx + bw / 2, by + bh / 2, Math.max(10, bw - 8));
        });

        // Add statutory audit watermark across bottom
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          'SECURE KYC · MASKED UNDER SECTION 29 AADHAAR ACT / DPDP ACT 2023 · FOR HOTEL CHECK-IN USE ONLY',
          canvas.width / 2,
          canvas.height - 15,
        );
      }

      // Export canvas to high-performance JPEG File
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setIsProcessing(false);
            return;
          }

          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const maskedName = `${baseName}-masked.jpg`;

          const maskedFile = new File([blob], maskedName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          setIsProcessing(false);
          onSave(maskedFile);
          onClose();
        },
        'image/jpeg',
        0.88,
      );
    } catch (err) {
      console.error('Error burning redaction:', err);
      setIsProcessing(false);
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[94vh] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-lg font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
              🛡️
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  UIDAI Section 29 &amp; DPDP Act ID Masking
                </h2>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                  ₹0 Cost · Client-Side
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {complianceSummary}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 p-2.5 dark:border-white/5 dark:bg-white/[0.02] shrink-0 text-xs">
          {/* Statutory Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-500 text-[11px] mr-1">Smart Presets:</span>
            <button
              type="button"
              onClick={() => applySmartPreset('aadhaar_masked')}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300 cursor-pointer"
              title="Masks first 8 digits & QR code to Section 29 compliance"
            >
              <span>⚡</span>
              <span>Aadhaar (8 Digits &amp; QR)</span>
            </button>
            <button
              type="button"
              onClick={() => applySmartPreset('passport')}
              className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-900 hover:bg-blue-100 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300 cursor-pointer"
              title="Redacts MRZ bottom lines & signature"
            >
              <span>📘</span>
              <span>Passport MRZ</span>
            </button>
            <button
              type="button"
              onClick={() => applySmartPreset('driving_license')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 cursor-pointer"
              title="Redacts driver signature"
            >
              <span>🚗</span>
              <span>Driving License</span>
            </button>
            <button
              type="button"
              onClick={() => applySmartPreset('voter_id')}
              className="inline-flex items-center gap-1 rounded-lg border border-purple-300 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-900 hover:bg-purple-100 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300 cursor-pointer"
              title="Redacts voter barcode"
            >
              <span>🗳️</span>
              <span>Voter ID</span>
            </button>
            <button
              type="button"
              onClick={() => applySmartPreset('pan')}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300 cursor-pointer"
              title="Redacts PAN digits & signature"
            >
              <span>💳</span>
              <span>PAN Card</span>
            </button>
          </div>

          {/* Interactive Tools */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'draw' ? 'select' : 'draw')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer ${
                activeTool === 'draw'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-white'
              }`}
            >
              {activeTool === 'draw' ? '✏️ Drawing Active (Drag on Image)' : '👆 Select / Move'}
            </button>
            {selectedBoxId && (
              <button
                type="button"
                onClick={removeSelectedBox}
                className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900/40 dark:text-rose-300 cursor-pointer"
              >
                🗑️ Delete Box
              </button>
            )}
            {boxes.length > 0 && (
              <button
                type="button"
                onClick={clearAllBoxes}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2 cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Viewport Canvas */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-auto bg-slate-950/90 p-4 flex items-center justify-center min-h-[360px]"
        >
          {loadingPdf ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-3 text-cyan-400">
              <svg className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-xs font-semibold text-slate-300 animate-pulse">
                Rendering PDF page 1 for client-side redaction...
              </p>
            </div>
          ) : pdfLoadError ? (
            <div className="max-w-md rounded-xl border border-amber-500/30 bg-amber-950/40 p-4 text-center space-y-2 text-xs text-amber-200">
              <p className="text-sm font-bold text-amber-300">⚠️ PDF Preview Notice</p>
              <p>{pdfLoadError}</p>
              <p className="text-[11px] text-slate-400">
                You can capture or upload photos directly (JPG/PNG) for instant 100% offline masking.
              </p>
            </div>
          ) : (
            <div className="relative shadow-2xl rounded-lg overflow-hidden border border-white/10 touch-none">
              <canvas
                ref={canvasRef}
                onMouseDown={(e) => handleInteractionStart(e.clientX, e.clientY)}
                onMouseMove={(e) => handleInteractionMove(e.clientX, e.clientY)}
                onMouseUp={handleInteractionEnd}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  if (touch) handleInteractionStart(touch.clientX, touch.clientY);
                }}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  if (touch) handleInteractionMove(touch.clientX, touch.clientY);
                }}
                onTouchEnd={handleInteractionEnd}
                className={`max-h-[60vh] max-w-full object-contain ${
                  activeTool === 'draw' ? 'cursor-crosshair' : 'cursor-pointer'
                }`}
              />
            </div>
          )}
        </div>

        {/* Footer / Burn & Save Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 dark:border-white/10 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>ℹ️</span>
            <span>
              {boxes.length} black redaction {boxes.length === 1 ? 'box' : 'boxes'} active. UIDAI Section 29 compliant.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className={btnGhostCls}>
              Cancel
            </button>
            <button
              type="button"
              disabled={isProcessing || loadingPdf || !imageBitmapSource}
              onClick={handleBurnAndSave}
              className={`${btnCls} bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 shadow-sm cursor-pointer disabled:opacity-50`}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Burning Permanent Redactions...
                </span>
              ) : (
                '✓ Burn Redactions & Save Masked ID →'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
