'use client';

import React, { useState, useEffect } from 'react';
import type { ReservationRow } from './reservation-table';
import { formatStayDates } from '@/lib/format';

interface WhatsAppVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: ReservationRow;
  hotelName: string;
  currency?: string;
}

export function WhatsAppVoucherModal({
  isOpen,
  onClose,
  reservation,
  hotelName,
  currency = 'INR',
}: WhatsAppVoucherModalProps) {
  const cleanPhone = (reservation.guestPhone ?? '').replace(/[^0-9]/g, '');
  const [phone, setPhone] = useState(cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`);
  const [templateType, setTemplateType] = useState<'voucher' | 'pre_arrival' | 'welcome'>('voucher');
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const stayFormatted = formatStayDates(reservation.checkIn, reservation.checkOut);
  const amountFormatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(reservation.totalAmount);

  // Template Messages
  let messageText = '';

  if (templateType === 'voucher') {
    messageText = `Namaste ${reservation.guestName}! 🙏\n\nWe are delighted to confirm your reservation at *${hotelName}*! ✨\n\n📋 *BOOKING CONFIRMATION VOUCHER*\n• Booking Ref: #${reservation.id.slice(0, 8).toUpperCase()}\n• Room Assigned: Room ${reservation.roomNumber}\n• Stay Dates: ${stayFormatted}\n• Total Amount: ${amountFormatted}\n• Reservation Status: *${reservation.status.toUpperCase().replace('_', ' ')}*\n\n📍 *HOTEL POLICIES & DETAILS:*\n• Standard Check-in: 12:00 PM | Check-out: 11:00 AM\n• Please present a valid government ID (Aadhaar / Passport / DL) upon arrival.\n• Front Desk & Concierge: 24x7 Assistance available.\n\nWe look forward to welcoming you for a memorable stay! 🌟\nWarm regards,\n*Front Desk Team, ${hotelName}*`;
  } else if (templateType === 'pre_arrival') {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hotel.example.com';
    const checkinUrl = `${origin}/scan-id/${reservation.id}`;
    messageText = `Namaste ${reservation.guestName}! 🙏\n\nYour upcoming stay at *${hotelName}* begins soon (${stayFormatted}).\n\n⚡ *Skip the front desk queue!* You can complete quick pre-arrival digital check-in and securely upload your ID proof from your mobile:\n👉 ${checkinUrl}\n\n🔒 *100% Privacy & UIDAI Section 29 Compliant* (Zero-footprint in-memory transfer).\n\nSafe travels, and see you soon! ✨\n*Guest Relations, ${hotelName}*`;
  } else {
    messageText = `Namaste ${reservation.guestName}! 🙏\n\nWelcome to *${hotelName}*! We hope you are settling comfortably into *Room ${reservation.roomNumber}*.\n\n📶 *High-Speed Guest Wi-Fi:* Connect to '${hotelName}_Guest'\n🍽️ *In-Room Dining:* Dial 9 from room intercom\n🛎️ *Housekeeping & Front Desk:* Dial 0 anytime\n\nPlease let us know if there is anything we can do to make your stay exceptional! ✨\nWarm regards,\n*Management, ${hotelName}*`;
  }

  const waUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(
    messageText,
  )}`;

  const handleSend = () => {
    window.open(waUrl, '_blank');
    setSent(true);
    setTimeout(() => {
      setSent(false);
      onClose();
    }, 2500);
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-dialog-title"
        className="relative flex w-full max-w-xl flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-500 text-white font-black text-lg shadow-sm">
              💬
            </span>
            <div>
              <h3 id="whatsapp-dialog-title" className="font-display text-base font-bold text-slate-950">
                Dispatch WhatsApp Guest Notification
              </h3>
              <p className="text-xs text-slate-500">Official Hotel Guest Messaging &amp; Vouchers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Template Selector Tabs */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Select Notification Template
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTemplateType('voucher')}
              className={`rounded-xl p-2.5 text-left border transition cursor-pointer ${
                templateType === 'voucher'
                  ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="text-base mb-0.5">🎫</div>
              <p className="text-xs leading-tight">Booking Voucher</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-normal">Confirmation &amp; dates</p>
            </button>

            <button
              type="button"
              onClick={() => setTemplateType('pre_arrival')}
              className={`rounded-xl p-2.5 text-left border transition cursor-pointer ${
                templateType === 'pre_arrival'
                  ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="text-base mb-0.5">⚡</div>
              <p className="text-xs leading-tight">Pre-Arrival Check-In</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-normal">Self ID upload link</p>
            </button>

            <button
              type="button"
              onClick={() => setTemplateType('welcome')}
              className={`rounded-xl p-2.5 text-left border transition cursor-pointer ${
                templateType === 'welcome'
                  ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="text-base mb-0.5">🛎️</div>
              <p className="text-xs leading-tight">Welcome &amp; Wi-Fi</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-normal">Check-in day greeting</p>
            </button>
          </div>
        </div>

        {/* Recipient Phone Input */}
        <div>
          <label
            htmlFor="wa-recipient-phone"
            className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1"
          >
            Recipient Mobile Number (with Country Code)
          </label>
          <div className="flex rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
            <span className="inline-flex items-center px-3 text-xs font-bold text-slate-400 bg-slate-50 border-r border-slate-200">
              🇮🇳 +
            </span>
            <input
              id="wa-recipient-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="919876543210"
              className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Standard 10-digit Indian numbers will automatically route with 91 country code prefix.
          </p>
        </div>

        {/* WhatsApp Message Preview Bubble */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Message Preview (WhatsApp Format)
          </label>
          <div className="rounded-2xl bg-[#e5ddd5] p-4 text-slate-900 shadow-inner">
            <div className="max-w-md rounded-2xl bg-white p-3.5 shadow-sm text-xs leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
              {messageText}
              <div className="text-right text-[9px] text-slate-400 font-semibold">
                Just now · ✓✓
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            {copied ? '✓ Copied to Clipboard!' : '📋 Copy Text'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSend}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95 cursor-pointer"
            >
              {sent ? (
                <>
                  <span>✓</span>
                  <span>Dispatched!</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Send via WhatsApp →</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
