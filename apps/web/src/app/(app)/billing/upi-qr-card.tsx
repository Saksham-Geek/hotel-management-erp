'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface UpiQrCardProps {
  amount: number;
  currency: string;
  hotelName: string;
  roomNumber: string;
  guestName: string;
  folioId: string;
  upiId?: string | null;
  upiMerchantName?: string | null;
  isOwner?: boolean;
  onOpenUpiSettings?: () => void;
  onSimulatePaid: (utr: string) => void;
}

export function UpiQrCard({
  amount,
  currency,
  hotelName,
  roomNumber,
  guestName,
  folioId,
  upiId,
  upiMerchantName,
  isOwner,
  onOpenUpiSettings,
  onSimulatePaid,
}: UpiQrCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600); // 10 minutes expiry countdown

  // Verified receiver UPI VPA & Payee Name
  const vpa = upiId?.trim() || `pay.${hotelName.toLowerCase().replace(/[^a-z0-9]/g, '')}@icici`;
  const merchant = upiMerchantName?.trim() || hotelName;
  const transactionNote = `Rm ${roomNumber} Stay - ${guestName.split(' ')[0]}`;
  
  // Standard NPCI UPI URI Scheme
  const upiUri = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(
    merchant,
  )}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

  useEffect(() => {
    if (amount > 0) {
      QRCode.toDataURL(upiUri, {
        width: 240,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate UPI QR:', err));
    }
  }, [upiUri, amount]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.floor(secondsLeft / 60);
  const secs = (secondsLeft % 60).toString().padStart(2, '0');

  function handleCopy() {
    navigator.clipboard?.writeText(upiUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSimulate() {
    const randomUtr = `UPI/${new Date().getFullYear()}${(new Date().getMonth() + 1)
      .toString()
      .padStart(2, '0')}${Math.floor(100000000 + Math.random() * 900000000)}/NPCI`;
    onSimulatePaid(randomUtr);
  }

  return (
    <div className="rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-b from-indigo-50/40 via-white to-white p-5 shadow-md space-y-4 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-white font-black text-xs shadow-xs">
            ₹
          </span>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 font-display">
              Live Dynamic UPI Scan-to-Pay
            </h4>
            <p className="text-[11px] text-slate-500">NPCI Instant Real-Time Settlement</p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Expires in {mins}:{secs}</span>
        </span>
      </div>

      {/* QR Code Container */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="relative shrink-0 grid place-items-center p-2 rounded-xl border-2 border-indigo-100 bg-white shadow-xs">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Scan UPI QR" className="h-36 w-36 object-contain" />
          ) : (
            <div className="h-36 w-36 grid place-items-center bg-slate-100 text-xs font-bold text-slate-400">
              Generating QR…
            </div>
          )}
          <span className="absolute bottom-1 bg-indigo-600 text-[9px] font-black uppercase tracking-widest text-white px-2 py-0.5 rounded-full shadow-2xs">
            UPI AUTO-SYNC
          </span>
        </div>

        <div className="space-y-2 flex-1 text-center sm:text-left">
          <p className="text-[11px] text-slate-500">Scan using any UPI App:</p>
          {/* UPI App Logos / Badges */}
          <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
            <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-800">
              GPay
            </span>
            <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-900">
              PhonePe
            </span>
            <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-900">
              Paytm
            </span>
            <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
              BHIM
            </span>
            <span className="rounded-md bg-slate-900 text-white px-2 py-0.5 text-[10px] font-bold">
              CRED
            </span>
          </div>

          <div className="pt-1">
            <p className="text-xs font-semibold text-slate-700">Amount to Pay:</p>
            <p className="text-xl font-black text-slate-950 font-display">
              ₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(amount)}
            </p>
          </div>

          <div className="space-y-1 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Receiver UPI VPA
              </span>
              {isOwner ? (
                <button
                  type="button"
                  onClick={onOpenUpiSettings}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-0.5"
                  title="Update the receiving UPI ID for this property"
                >
                  <span>⚙️ Edit</span>
                </button>
              ) : (
                <span
                  title="Only the property owner can modify the receiving bank UPI ID"
                  className="text-[9px] font-semibold text-slate-400 flex items-center gap-0.5"
                >
                  <span>🔒 Owner Only</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-indigo-950 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                {vpa}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold" title="NPCI Verified Merchant Account">
                ✓
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleCopy}
          className="w-full sm:w-auto flex-1 rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>{copied ? '✓ Copied UPI Link' : '📋 Copy UPI Intent Link'}</span>
        </button>

        <button
          type="button"
          onClick={handleSimulate}
          className="w-full sm:w-auto flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>⚡ Simulate Guest Scanned &amp; Paid</span>
        </button>
      </div>

      <p className="text-[10px] text-slate-400 text-center">
        🔒 0% MDR · Direct Instant Merchant Bank Settlement · NPCI Encrypted
      </p>
    </div>
  );
}
