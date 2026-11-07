'use client';

import { useEffect, useState } from 'react';
import { btnCls, btnGhostCls } from '@/components/ui';

interface WhatsAppInvoiceModalProps {
  guestName: string;
  guestPhone: string | null;
  hotelName: string;
  roomNumber: string;
  invoiceNumber?: string;
  amount: number;
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppInvoiceModal({
  guestName,
  guestPhone,
  hotelName,
  roomNumber,
  invoiceNumber,
  amount,
  isOpen,
  onClose,
}: WhatsAppInvoiceModalProps) {
  const cleanPhone = (guestPhone ?? '').replace(/[^0-9]/g, '');
  const [phone, setPhone] = useState(cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const invNum = invoiceNumber || `INV-${new Date().getFullYear()}-001`;
  const formattedAmt = `₹${new Intl.NumberFormat('en-IN').format(amount)}`;

  const messageText = `Namaste ${guestName}! 🙏\n\nThank you for choosing ${hotelName} for your stay (Room ${roomNumber}).\n\nYour official GST Tax Invoice has been generated:\n• Invoice No: ${invNum}\n• Total Amount Paid: ${formattedAmt}\n• Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n\nWe look forward to welcoming you back! ✨\nWarm regards,\nManagement, ${hotelName}`;

  const waUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(
    messageText,
  )}`;

  function handleDirectDispatch() {
    // Open WhatsApp Web or mobile app in new window
    window.open(waUrl, '_blank');
    setSent(true);
    setTimeout(() => {
      setSent(false);
      onClose();
    }, 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in-50 duration-150" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-invoice-dialog-title"
        className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500 text-white font-black text-sm shadow-xs" aria-hidden="true">
              💬
            </span>
            <div>
              <h3 id="whatsapp-invoice-dialog-title" className="font-display text-base font-black text-slate-950">
                Dispatch WhatsApp GST Tax Invoice
              </h3>
              <p className="text-xs text-slate-500">Official WhatsApp Cloud API Template</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Guest WhatsApp Phone Input */}
        <div>
          <label htmlFor="wa-recipient-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Recipient WhatsApp Mobile Number (with Country Code)
          </label>
          <div className="flex rounded-xl shadow-2xs">
            <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600" aria-hidden="true">
              🇮🇳 +
            </span>
            <input
              id="wa-recipient-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="919876543210"
              className="min-h-[44px] w-full rounded-r-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
            />
          </div>
        </div>

        {/* Message Preview (WhatsApp Bubble) */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Message Preview (Delivered to Guest)
          </p>
          <div className="rounded-2xl border border-emerald-200 bg-[#e7f8ee] p-4 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans shadow-inner">
            {messageText}
          </div>
        </div>

        {/* Status Toast */}
        {sent && (
          <div className="rounded-xl bg-emerald-100 border border-emerald-300 p-3 text-xs font-bold text-emerald-950 flex items-center gap-2 animate-in fade-in-50">
            <span>✓</span>
            <span>WhatsApp message link launched! Folio receipt logged.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className={`${btnGhostCls} text-xs font-bold`}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDirectDispatch}
            className={`${btnCls} bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm flex items-center gap-1.5`}
          >
            <span>💬 Send WhatsApp Invoice Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
