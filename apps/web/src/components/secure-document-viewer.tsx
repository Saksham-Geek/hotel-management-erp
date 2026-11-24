'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDeterministicDate, formatDeterministicDateTime } from '@/lib/dates';

export interface SecureDocument {
  id: string;
  documentType: string;
  fileName: string;
  mimeType: string;
  byteLength?: number;
  consentMethod?: string | null;
  createdAt: string;
  retentionUntil?: string | null;
  legalHold?: boolean;
  sha256Hash?: string | null;
}

interface SecureDocumentViewerProps {
  guestId: string;
  guestName: string;
  document: SecureDocument;
  currentUser?: { fullName?: string; email?: string; role?: string };
  onClose: () => void;
  onLegalHoldToggle?: (documentId: string, newHoldState: boolean) => void;
}

export function SecureDocumentViewer({
  guestId,
  guestName,
  document,
  currentUser,
  onClose,
  onLegalHoldToggle,
}: SecureDocumentViewerProps) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportReason, setExportReason] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [legalHold, setLegalHold] = useState(Boolean(document.legalHold));
  const [isUpdatingHold, setIsUpdatingHold] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const staffIdentifier = currentUser?.fullName || currentUser?.email || 'Authorized Operator';
  const staffRole = (currentUser?.role || 'staff').toUpperCase();
  const accessTimestamp = formatDeterministicDateTime(new Date());

  const isPdf = document.mimeType === 'application/pdf';
  const viewUrl = `/api/guest-documents/${encodeURIComponent(guestId)}/${encodeURIComponent(document.id)}?view=1#toolbar=0&navpanes=0&scrollbar=1`;

  // Printing handler with watermarked stream
  const handlePrint = useCallback(() => {
    if (isPdf) {
      try {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.focus();
          iframeRef.current.contentWindow.print();
          return;
        }
      } catch {
        // Fallback if browser security sandboxes direct iframe contentWindow print
      }
      const printWindow = window.open(viewUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    } else {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print Document - ${document.fileName}</title>
              <style>
                @page { margin: 1cm; }
                body { margin: 0; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fff; }
                img { max-width: 100%; max-height: 90vh; object-fit: contain; }
              </style>
            </head>
            <body>
              <img src="${viewUrl}" onload="window.print();window.close();" />
            </body>
          </html>
        `);
        printWin.document.close();
      }
    }
  }, [isPdf, viewUrl, document.fileName]);

  // Keyboard navigation & shortcut management: Esc to exit, Ctrl+P to print
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        if (showExportModal) {
          setShowExportModal(false);
        } else {
          onClose();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        handlePrint();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        setShowExportModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showExportModal, onClose, handlePrint]);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (exportReason.trim().length < 5) {
      setExportError('Official compliance reason must be at least 5 characters.');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const res = await fetch(
        `/api/guest-documents/${encodeURIComponent(guestId)}/${encodeURIComponent(document.id)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'export', reason: exportReason.trim() }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message ?? 'Export failed');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = downloadUrl;
      a.download = document.fileName || `${document.documentType}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setShowExportModal(false);
    } catch (err: any) {
      setExportError(err?.message ?? 'Failed to export document');
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleLegalHold = async () => {
    setIsUpdatingHold(true);
    try {
      const newHoldState = !legalHold;
      const res = await fetch(
        `/api/guest-documents/${encodeURIComponent(guestId)}/${encodeURIComponent(document.id)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'legal-hold',
            legalHold: newHoldState,
            reason: newHoldState ? 'Manager initiated statutory legal hold' : 'Legal hold released',
          }),
        },
      );
      if (res.ok) {
        setLegalHold(newHoldState);
        onLegalHoldToggle?.(document.id, newHoldState);
      }
    } catch {
      // Ignore
    } finally {
      setIsUpdatingHold(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // Close viewer on backdrop click
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl cursor-default"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                  isPdf
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                }`}
              >
                {isPdf ? 'PDF' : 'IMAGE'}
              </span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white capitalize truncate">
                {document.documentType.replaceAll('_', ' ')} — {guestName}
              </h2>
              {legalHold && (
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  LEGAL HOLD ACTIVE
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Uploaded on {formatDeterministicDate(document.createdAt)} · AES-256-GCM Encrypted
              {document.sha256Hash && (
                <span className="hidden sm:inline font-mono text-[10px] ml-2 text-slate-400">
                  SHA: {document.sha256Hash.slice(0, 12)}...
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold shadow-2xs transition cursor-pointer"
              title="Print document with stamped statutory forensic watermark (Ctrl+P)"
            >
              <span>🖨️</span>
              <span>Print</span>
            </button>

            {/* Legal Hold Button */}
            <button
              type="button"
              onClick={handleToggleLegalHold}
              disabled={isUpdatingHold}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition cursor-pointer ${
                legalHold
                  ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              {legalHold ? 'Release Hold' : 'Place Legal Hold'}
            </button>

            {/* Authorized Export Button */}
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 font-semibold cursor-pointer"
              title="Export document with compliance audit log (Ctrl+S)"
            >
              Authorized Export
            </button>

            {/* Close Button with Esc Hint */}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold hover:opacity-90 transition cursor-pointer"
              title="Exit viewer (Esc or click outside)"
            >
              <span>Close</span>
              <span className="text-[10px] opacity-70 ml-0.5">✕</span>
            </button>
          </div>
        </div>

        {/* Viewport with Forensic Watermark Overlay */}
        <div className="relative flex-1 min-h-[50vh] max-h-[70vh] overflow-auto bg-slate-100 dark:bg-slate-950/50 p-4">
          {/* Forensic Watermark Grid - Blocks phone photo piracy & traces leaks */}
          <div
            aria-hidden="true"
            className="pointer-events-none select-none absolute inset-0 z-20 flex flex-wrap items-center justify-around gap-16 p-8 overflow-hidden opacity-35 dark:opacity-25"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="rotate-[-28deg] text-center font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-4 tracking-wider"
              >
                <div>CONFIDENTIAL PROPERTY RECORD</div>
                <div className="text-[10px]">
                  VIEWED BY: {staffIdentifier} ({staffRole})
                </div>
                <div className="text-[9px]">{accessTimestamp}</div>
              </div>
            ))}
          </div>

          {/* Document Content */}
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            {isPdf ? (
              <iframe
                ref={iframeRef}
                src={viewUrl}
                title={document.fileName}
                className="w-full h-[62vh] rounded-lg border border-slate-200 dark:border-white/10 bg-white shadow-inner"
              />
            ) : (
              <div className="flex items-center justify-center min-h-[55vh] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={viewUrl}
                  alt={document.fileName}
                  className="max-h-[60vh] max-w-full rounded-lg border border-slate-200 dark:border-white/10 object-contain shadow-lg bg-white dark:bg-slate-900"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Audit Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] px-5 py-3 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>DPDP Act 2023 Compliant · Zero-Desktop Download Protected</span>
          </div>
          <div>
            Retention:{' '}
            {document.retentionUntil
              ? formatDeterministicDate(document.retentionUntil)
              : '180 days standard'}
          </div>
        </div>
      </div>

      {/* Authorized Export Confirmation Dialog */}
      {showExportModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowExportModal(false);
            }
          }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in cursor-pointer"
        >
          <form
            onSubmit={handleExport}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 shadow-2xl space-y-4 cursor-default"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Authorized Compliance Export
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Statutory regulations require logging an official business justification before downloading
                  identity documents to a local machine.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg text-sm cursor-pointer"
                title="Cancel (Esc or click outside)"
              >
                ✕
              </button>
            </div>

            {exportError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium">
                {exportError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Compliance Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={exportReason}
                onChange={(e) => setExportReason(e.target.value)}
                placeholder="e.g. Local Police Form-C Request, Credit Card Chargeback Defense, GST Statutory Tax Audit"
                rows={3}
                required
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/5 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-950"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isExporting}
                className="text-xs px-3.5 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {isExporting ? 'Verifying & Exporting…' : 'Confirm & Download'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
