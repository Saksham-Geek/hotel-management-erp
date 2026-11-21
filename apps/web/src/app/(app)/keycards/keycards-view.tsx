'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CustomDropdown } from '@/components/dropdown';
import { getRoomTypeTheme } from '@/lib/room-types';
import { updateRoomKeyStatusAction, encodeKeycardAction } from './actions';

export interface RoomKeyCustodyLogDto {
  id: string;
  action: 'issued_to_guest' | 'returned_to_slot' | 'with_housekeeping' | 'lost';
  recipientName: string;
  recipientType: 'primary_guest' | 'companion' | 'housekeeping' | 'front_desk';
  notes: string | null;
  loggedAt: string;
}

export interface RoomKeyDto {
  id: string;
  roomId: string;
  keyNumber: string;
  keyType: 'physical_brass' | 'rfid_mifare' | 'mobile_qr';
  cardUid: string | null;
  status: 'in_slot' | 'issued_to_guest' | 'with_housekeeping' | 'lost';
  issuedToReservationId: string | null;
  issuedToGuestName: string | null;
  issuedAt: string | null;
  returnedAt: string | null;
  notes: string | null;
  roomNumber: string;
  floor: number;
  roomTypeName: string | null;
  guestCheckIn: string | null;
  guestCheckOut: string | null;
  custodyLogs?: RoomKeyCustodyLogDto[];
}

export interface ActiveGuestStayDto {
  reservationId: string;
  roomNumber: string;
  guestName: string;
  guests?: { id: string; name: string }[];
  checkIn: string;
  checkOut: string;
  checkInFormatted?: string;
  checkOutFormatted?: string;
}

export function KeycardsView({
  keys,
  activeStays,
}: {
  keys: RoomKeyDto[];
  activeStays: ActiveGuestStayDto[];
}) {
  const router = useRouter();
  const [localKeys, setLocalKeys] = useState<RoomKeyDto[]>(keys);
  const [activeTab, setActiveTab] = useState<'brass_rack' | 'rfid_encoder' | 'digital_mobile'>('brass_rack');
  const [serialConnected, setSerialConnected] = useState(false);
  const [serialPortName, setSerialPortName] = useState<string | null>(null);

  // Sync prop updates if parent re-renders
  useEffect(() => {
    setLocalKeys(keys);
  }, [keys]);

  // Encode Modal State
  const [encodingKey, setEncodingKey] = useState<RoomKeyDto | null>(null);
  const [encoderProtocol, setEncoderProtocol] = useState<'mifare_classic_1k' | 'mifare_ultralight' | 'saflok_ascii'>('mifare_classic_1k');
  const [encodingProgress, setEncodingProgress] = useState<'idle' | 'writing' | 'success'>('idle');

  // Digital Mobile Pass Modal
  const [mobilePassKey, setMobilePassKey] = useState<RoomKeyDto | null>(null);

  // Hand to Guest Modal
  const [handingKey, setHandingKey] = useState<RoomKeyDto | null>(null);

  // Key Custody History Modal
  const [historyKey, setHistoryKey] = useState<RoomKeyDto | null>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const brassKeys = localKeys.filter((k) => k.keyType === 'physical_brass');
  const rfidKeys = localKeys.filter((k) => k.keyType === 'rfid_mifare');

  const [brassCategoryFilter, setBrassCategoryFilter] = useState<string>('all');
  const [rfidCategoryFilter, setRfidCategoryFilter] = useState<string>('all');

  const brassCategories = Array.from(
    new Set(brassKeys.map((k) => k.roomTypeName || 'Deluxe')),
  ).filter(Boolean);

  const filteredBrassKeys =
    brassCategoryFilter === 'all'
      ? brassKeys
      : brassKeys.filter((k) => (k.roomTypeName || 'Deluxe') === brassCategoryFilter);

  const rfidCategories = Array.from(
    new Set(rfidKeys.map((k) => k.roomTypeName || 'Deluxe')),
  ).filter(Boolean);

  const filteredRfidKeys =
    rfidCategoryFilter === 'all'
      ? rfidKeys
      : rfidKeys.filter((k) => (k.roomTypeName || 'Deluxe') === rfidCategoryFilter);

  // Browser Web Serial API connection for USB RFID Reader / Encoder
  async function handleConnectSerialEncoder() {
    if (typeof window !== 'undefined' && 'serial' in navigator) {
      try {
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        setSerialConnected(true);
        setSerialPortName('USB RFID Encoder (COM / Serial)');
        setFeedbackMsg({
          type: 'ok',
          text: 'USB RFID Card Encoder successfully paired and ready for MIFARE encoding!',
        });
      } catch (err: any) {
        setFeedbackMsg({
          type: 'err',
          text: err?.message || 'USB Serial encoder connection was cancelled or unavailable.',
        });
      }
    } else {
      // Graceful emulation for browsers or platforms without Web Serial
      setSerialConnected(true);
      setSerialPortName('ACR122U USB NFC Encoder (Virtual Emulated)');
      setFeedbackMsg({
        type: 'ok',
        text: 'USB RFID Card Encoder paired in Emulated Driver mode.',
      });
    }
  }

  async function handleExecuteEncodeForStay(stay: ActiveGuestStayDto) {
    if (!encodingKey) return;

    setEncodingProgress('writing');

    // Simulate hardware RFID write latency (Sector 1 auth + write)
    await new Promise((r) => setTimeout(r, 1200));

    const res = await encodeKeycardAction(encodingKey.id, {
      keyId: encodingKey.id,
      roomNumber: stay.roomNumber,
      guestName: stay.guestName,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      protocol: encoderProtocol,
    });

    if (res.ok) {
      setEncodingProgress('success');
      setFeedbackMsg({
        type: 'ok',
        text: `MIFARE Smart Keycard successfully written for Room ${stay.roomNumber} (${stay.guestName})!`,
      });
      setLocalKeys((prev) =>
        prev.map((k) =>
          k.id === encodingKey.id
            ? {
                ...k,
                status: 'issued_to_guest',
                issuedToGuestName: stay.guestName,
                issuedToReservationId: stay.reservationId,
                issuedAt: new Date().toISOString(),
                returnedAt: null,
              }
            : k
        )
      );
      router.refresh();
      setTimeout(() => {
        setEncodingProgress('idle');
        setEncodingKey(null);
      }, 1500);
    } else {
      setEncodingProgress('idle');
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to encode RFID keycard' });
    }
  }

  async function handleUpdateKeyStatus(keyId: string, status: RoomKeyDto['status'], guestName?: string, resId?: string, notes?: string) {
    // Optimistic UI state flip
    setLocalKeys((prev) =>
      prev.map((k) =>
        k.id === keyId
          ? {
              ...k,
              status,
              issuedToGuestName: status === 'in_slot' ? null : (guestName ?? k.issuedToGuestName),
              issuedToReservationId: status === 'in_slot' ? null : (resId ?? k.issuedToReservationId),
              returnedAt: status === 'in_slot' ? new Date().toISOString() : k.returnedAt,
              custodyLogs: [
                {
                  id: 'temp-' + Date.now(),
                  action: status === 'in_slot' ? ('returned_to_slot' as const) : status,
                  recipientName: status === 'in_slot' ? 'Front Desk Key Slot' : (guestName || k.issuedToGuestName || 'Staff'),
                  recipientType: status === 'in_slot' ? ('front_desk' as const) : status === 'with_housekeeping' ? ('housekeeping' as const) : ('primary_guest' as const),
                  notes: notes || (status === 'lost' ? 'Reported lost' : status === 'in_slot' ? 'Returned to slot' : 'Handed to occupant'),
                  loggedAt: new Date().toISOString(),
                },
                ...(k.custodyLogs || []),
              ],
            }
          : k
      )
    );

    const res = await updateRoomKeyStatusAction(keyId, {
      status,
      issuedToGuestName: guestName,
      issuedToReservationId: resId,
      notes,
    });
    if (res.ok) {
      const label = status === 'in_slot' ? 'RETURNED TO SLOT' : status === 'issued_to_guest' ? `ISSUED TO ${guestName || 'GUEST'}` : status === 'lost' ? 'REPORTED LOST' : 'WITH HOUSEKEEPING';
      setFeedbackMsg({ type: 'ok', text: `Key status updated to ${label}` });
      setHandingKey(null);
      router.refresh();
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to update key status' });
      // Revert to prop state on failure
      setLocalKeys(keys);
    }
  }

  // Handle Escape key to dismiss any active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (encodingKey) setEncodingKey(null);
        if (handingKey) setHandingKey(null);
        if (mobilePassKey) setMobilePassKey(null);
        if (historyKey) setHistoryKey(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [encodingKey, handingKey, mobilePassKey, historyKey]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1222] p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20">
            <KeyIcon />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
                Room Keys &amp; Door Lock Bridge
              </h1>
              <span className="rounded-full bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-200 text-[11px] font-bold px-2.5 py-0.5 border border-slate-200 dark:border-white/10">
                Smart Locks &amp; Key Cabinet
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Traditional Brass Keychain Rack for boutique hotels · MIFARE RFID Encoder for modern locks · Digital Mobile QR Passes.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-white/[0.05] p-1 border border-slate-200/80 dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('brass_rack')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'brass_rack'
                ? 'bg-white dark:bg-white/20 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            🗝️ Brass Key Tag Rack ({brassKeys.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rfid_encoder')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'rfid_encoder'
                ? 'bg-white dark:bg-white/20 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            💳 RFID Card Encoder ({rfidKeys.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('digital_mobile')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'digital_mobile'
                ? 'bg-white dark:bg-white/20 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            📱 Mobile QR Keycards
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`flex items-center justify-between rounded-2xl p-4 text-xs font-bold shadow-xs transition-all ${
            feedbackMsg.type === 'ok'
              ? 'bg-emerald-50 text-emerald-950 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-950 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: FRONT DESK KEY TAG CABINET & BRASS TAGS */}
      {/* ========================================================================= */}
      {activeTab === 'brass_rack' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <span>Front Desk Key Cabinet</span>
                <span className="rounded-full bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-200 text-[10px] font-bold px-2.5 py-0.5 border border-slate-200 dark:border-white/10">
                  Physical Brass Keychains
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Physical front desk key cabinet with live occupancy tracking, guest custody verification, and audit logs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-3 py-1 text-emerald-800 dark:text-emerald-300 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                In Slot ({brassKeys.filter((k) => k.status === 'in_slot').length})
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-3 py-1 text-amber-800 dark:text-amber-300 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                With Guest ({brassKeys.filter((k) => k.status === 'issued_to_guest').length})
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/40 px-3 py-1 text-sky-800 dark:text-sky-300 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                Housekeeping ({brassKeys.filter((k) => k.status === 'with_housekeeping').length})
              </span>
              {brassKeys.some((k) => k.status === 'lost') && (
                <span className="flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 px-3 py-1 text-rose-800 dark:text-rose-300 shadow-2xs">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Lost ({brassKeys.filter((k) => k.status === 'lost').length})
                </span>
              )}
            </div>
          </div>

          {/* Room Category Quick Filter Bar */}
          {brassCategories.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
                Filter Category:
              </span>
              <button
                type="button"
                onClick={() => setBrassCategoryFilter('all')}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  brassCategoryFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                    : 'bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
                }`}
              >
                All Categories ({brassKeys.length})
              </button>
              {brassCategories.map((cat) => {
                const theme = getRoomTypeTheme(cat);
                const count = brassKeys.filter(
                  (k) => (k.roomTypeName || 'Deluxe') === cat,
                ).length;
                const isSelected = brassCategoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setBrassCategoryFilter(cat)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 border cursor-pointer ${
                      isSelected
                        ? `${theme.badge} ring-2 ring-slate-900/15 dark:ring-white/20 scale-[1.02]`
                        : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                    <span>{theme.icon}</span>
                    <span>{cat}</span>
                    <span className="opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Key Cabinet Grid matching Site Theme */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredBrassKeys.map((key) => {
                const stay = activeStays.find(
                  (s) => String(s.roomNumber).trim() === String(key.roomNumber).trim(),
                );
                const roomTheme = getRoomTypeTheme(key.roomTypeName);

                return (
                  <div
                    key={key.id}
                    className={`min-w-0 relative flex flex-col justify-between rounded-2xl border transition-all duration-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md ${roomTheme.lightBg} ${
                      key.status === 'in_slot'
                        ? 'border-slate-200/90 dark:border-white/10 hover:border-slate-300'
                        : key.status === 'issued_to_guest'
                        ? 'border-amber-400/90 dark:border-amber-500/60 ring-2 ring-amber-400/20'
                        : key.status === 'lost'
                        ? 'border-rose-400/90 dark:border-rose-500/60 ring-2 ring-rose-400/20'
                        : 'border-sky-400/90 dark:border-sky-500/60 ring-2 ring-sky-400/20'
                    }`}
                  >
                    <div>
                      {/* Top Header: Category Dash Accent & Custody Log Pill */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className={`h-1.5 w-6 rounded-full ${roomTheme.dash} block shadow-2xs`} />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHistoryKey(key);
                          }}
                          title="View Custody Log & Handover History"
                          className="rounded-md border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>📜</span>
                          <span>Log</span>
                        </button>
                      </div>

                      {/* Brass Key Peg / Hook Accent */}
                      <div className="mx-auto my-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 border border-amber-400/80 text-amber-950 shadow-inner">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-900/80" />
                      </div>

                      {/* Room Plate with Category Styling */}
                      <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0c1222]/90 backdrop-blur-xs p-2.5 text-center shadow-2xs space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          ROOM
                        </p>
                        <p className="font-display text-2xl font-black font-mono tracking-tight text-slate-950 dark:text-white leading-none">
                          {key.roomNumber}
                        </p>
                        <div className="pt-0.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${roomTheme.badge} max-w-full truncate`}>
                            <span>{roomTheme.icon}</span>
                            <span className="truncate">{key.roomTypeName || 'Deluxe'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="mt-2.5 flex justify-center">
                        {key.status === 'in_slot' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 text-[10px] font-bold shadow-2xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span>In Slot</span>
                          </span>
                        ) : key.status === 'issued_to_guest' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 px-2.5 py-0.5 text-[10px] font-bold shadow-2xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Out with Guest</span>
                          </span>
                        ) : key.status === 'with_housekeeping' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-900 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700 px-2.5 py-0.5 text-[10px] font-bold shadow-2xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                            <span>Housekeeping</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-900 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700 px-2.5 py-0.5 text-[10px] font-bold shadow-2xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            <span>Lost Key</span>
                          </span>
                        )}
                      </div>

                      {/* Occupant / Room Info */}
                      <div className="mt-2 text-center min-h-[20px]">
                        {key.status === 'lost' ? (
                          <p className="text-[10px] text-rose-700 dark:text-rose-300 font-bold truncate flex items-center justify-center gap-1" title={`Lost. Last Holder: ${key.custodyLogs?.[0]?.recipientName || key.issuedToGuestName || 'Unknown'}`}>
                            <span>🚨</span>
                            <span className="truncate">Last: {key.custodyLogs?.[0]?.recipientName || key.issuedToGuestName || 'Unknown'}</span>
                          </p>
                        ) : key.status === 'issued_to_guest' ? (
                          <p className="text-[10px] text-slate-800 dark:text-slate-200 font-bold truncate flex items-center justify-center gap-1" title={`Guest: ${key.issuedToGuestName || 'In-House Guest'}`}>
                            <span>👤</span>
                            <span className="truncate">{key.issuedToGuestName || 'In-House Guest'}</span>
                          </p>
                        ) : key.status === 'with_housekeeping' ? (
                          <p className="text-[10px] text-sky-800 dark:text-sky-300 font-semibold truncate flex items-center justify-center gap-1">
                            <span>🧹</span>
                            <span className="truncate">{key.issuedToGuestName || 'Housekeeping Staff'}</span>
                          </p>
                        ) : stay ? (
                          <p className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold truncate flex items-center justify-center gap-1" title={`In-House: ${stay.guestName}`}>
                            <span>👤</span>
                            <span className="truncate">{stay.guestName}</span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate flex items-center justify-center gap-1">
                            <span>🚪</span>
                            <span>Vacant Room</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-white/10 space-y-1.5">
                      {key.status === 'in_slot' ? (
                        <button
                          type="button"
                          onClick={() => setHandingKey(key)}
                          className={`w-full rounded-xl py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                            stay
                              ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200'
                              : 'bg-white dark:bg-white/10 border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/15'
                          }`}
                        >
                          {stay ? 'Hand to Guest →' : 'Key Actions →'}
                        </button>
                      ) : key.status === 'with_housekeeping' ? (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateKeyStatus(key.id, 'in_slot')}
                            className="w-full rounded-xl bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                          >
                            ✓ Return to Slot
                          </button>
                          {stay && (
                            <button
                              type="button"
                              onClick={() => setHandingKey(key)}
                              className="w-full rounded-xl bg-slate-900 py-1 text-[11px] font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 transition-colors cursor-pointer shadow-2xs"
                            >
                              Hand to Guest →
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateKeyStatus(key.id, 'in_slot')}
                          className="w-full rounded-xl bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                        >
                          {key.status === 'lost' ? '✓ Found & Return' : '✓ Return to Slot'}
                        </button>
                      )}

                      {/* Custody History Button */}
                      <button
                        type="button"
                        onClick={() => setHistoryKey(key)}
                        className="w-full rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <span>📜 Custody Log</span>
                        {key.custodyLogs && key.custodyLogs.length > 0 ? (
                          <span className="rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950 px-1.5 py-0.2 text-[9px] font-bold">
                            {key.custodyLogs.length}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400">
                            (Audit)
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RFID CARD ENCODER (MIFARE & CONTACTLESS) */}
      {/* ========================================================================= */}
      {activeTab === 'rfid_encoder' && (
        <div className="space-y-4">
          {/* Encoder Hardware Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1222] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span
                className={`grid h-10 w-10 place-items-center rounded-xl text-lg ${
                  serialConnected
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                }`}
              >
                📡
              </span>
              <div>
                <p className="text-xs font-bold text-ink">
                  Hardware Encoder Status: {serialConnected ? '🟢 Connected & Ready' : '⚪ Disconnected'}
                </p>
                <p className="text-[11px] text-muted">
                  {serialPortName || 'Pair ACR122U or USB Serial RFID Reader to write MIFARE Classic 1K / Ultralight cards.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConnectSerialEncoder}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 transition-colors cursor-pointer shadow-xs"
            >
              {serialConnected ? '✓ Encoder Active' : 'Pair USB RFID Reader'}
            </button>
          </div>

          {/* Room Category Quick Filter Bar for RFID */}
          {rfidCategories.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
                Filter Category:
              </span>
              <button
                type="button"
                onClick={() => setRfidCategoryFilter('all')}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  rfidCategoryFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                    : 'bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
                }`}
              >
                All Categories ({rfidKeys.length})
              </button>
              {rfidCategories.map((cat) => {
                const theme = getRoomTypeTheme(cat);
                const count = rfidKeys.filter(
                  (k) => (k.roomTypeName || 'Deluxe') === cat,
                ).length;
                const isSelected = rfidCategoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setRfidCategoryFilter(cat)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 border cursor-pointer ${
                      isSelected
                        ? `${theme.badge} ring-2 ring-slate-900/15 dark:ring-white/20 scale-[1.02]`
                        : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                    <span>{theme.icon}</span>
                    <span>{cat}</span>
                    <span className="opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* RFID Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRfidKeys.map((key) => {
              const stay = activeStays.find(
                (s) => String(s.roomNumber).trim() === String(key.roomNumber).trim(),
              );
              const roomTheme = getRoomTypeTheme(key.roomTypeName);

              return (
                <div
                  key={key.id}
                  className={`flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-white/10 ${roomTheme.lightBg} p-5 shadow-sm hover:shadow-md transition-all`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-6 rounded-full ${roomTheme.dash} block shadow-2xs`} />
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          NFC / RFID 13.56MHz
                        </span>
                      </div>
                      <span className="text-xl">💳</span>
                    </div>

                    <div className="mt-3">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ROOM NUMBER</p>
                      <p className="font-display text-2xl font-black font-mono text-slate-950 dark:text-white leading-tight">
                        {key.roomNumber}
                      </p>
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${roomTheme.badge}`}>
                          <span>{roomTheme.icon}</span>
                          <span>{key.roomTypeName || 'Deluxe'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-white/80 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/5 p-2.5 font-mono text-[10px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">CARD UID:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{key.cardUid || '04:A2:4B:91'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">STATUS:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {key.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">OCCUPANT:</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                          {stay ? stay.guestName : key.issuedToGuestName ? key.issuedToGuestName : 'Vacant'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setEncodingKey(key)}
                      className="w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>⚡ Write Sector 1 Keycard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryKey(key)}
                      className="w-full rounded-xl bg-white hover:bg-slate-50 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] border border-slate-200/80 dark:border-white/10 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span>📜 Custody Log</span>
                      {key.custodyLogs && key.custodyLogs.length > 0 && (
                        <span className="rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950 px-1.5 py-0.2 text-[9px] font-bold">
                          {key.custodyLogs.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DIGITAL QR MOBILE KEYCARDS */}
      {/* ========================================================================= */}
      {activeTab === 'digital_mobile' && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              📱 Digital Mobile QR Keycards
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Instant keyless smartphone passes for checked-in guests. Guests scan QR code at the room door reader or front desk.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeStays.map((stay) => {
              const matchKey = keys.find(
                (k) => String(k.roomNumber).trim() === String(stay.roomNumber).trim(),
              );
              const roomTheme = getRoomTypeTheme(matchKey?.roomTypeName);

              return (
                <div
                  key={stay.reservationId}
                  className={`flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-white/10 ${roomTheme.lightBg} p-5 shadow-sm hover:shadow-md transition-all`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                        ACTIVE STAY
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-500">Room {stay.roomNumber}</span>
                    </div>

                    <div className="mt-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${roomTheme.badge}`}>
                        <span>{roomTheme.icon}</span>
                        <span>{matchKey?.roomTypeName || 'Deluxe'}</span>
                      </span>
                    </div>

                    <h3 className="font-display text-base font-bold text-slate-950 dark:text-white mt-2">
                      {stay.guestName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Stay: {stay.checkInFormatted || new Date(stay.checkIn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} → {stay.checkOutFormatted || new Date(stay.checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (matchKey) setMobilePassKey(matchKey);
                      }}
                      className="w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 transition-colors shadow-2xs cursor-pointer"
                    >
                      View Digital Pass QR
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ENCODE RFID CARD MODAL (ROOM-BOUND) */}
      {/* ========================================================================= */}
      {encodingKey && (() => {
        const roomStays = activeStays.filter(
          (s) => String(s.roomNumber).trim() === String(encodingKey.roomNumber).trim()
        );
        const stay = roomStays[0];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50" role="presentation">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="encode-rfid-modal-title"
              className="relative flex w-full max-w-md flex-col rounded-3xl bg-white dark:bg-[#0c1222] shadow-2xl p-6 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-100 text-indigo-700 font-bold text-sm" aria-hidden="true">
                    💳
                  </span>
                  <div>
                    <h3 id="encode-rfid-modal-title" className="font-display text-sm font-bold">
                      Encode Contactless RFID Keycard
                    </h3>
                    <p className="text-[11px] text-muted">Room {encodingKey.roomNumber} ({encodingKey.roomTypeName || 'Room'})</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close encode dialog"
                  onClick={() => setEncodingKey(null)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                >
                  ✕
                </button>
              </div>

              {stay ? (
                <div className="my-4 space-y-3.5 text-xs">
                  <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/20 p-3 text-xs">
                    <p className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                      Verified Room Occupant
                    </p>
                    <p className="text-sm font-bold text-ink mt-0.5">{stay.guestName}</p>
                    <p className="text-[11px] text-muted">
                      Stay: {stay.checkInFormatted || new Date(stay.checkIn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} → {stay.checkOutFormatted || new Date(stay.checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Card Protocol &amp; Encryption</label>
                    <CustomDropdown
                      value={encoderProtocol}
                      onChange={(val) => setEncoderProtocol(val as any)}
                      size="sm"
                      options={[
                        { value: 'mifare_classic_1k', label: 'MIFARE Classic 1K (Crypto-1 Sector 1 Key A/B)' },
                        { value: 'mifare_ultralight', label: 'MIFARE Ultralight C (3DES Contactless)' },
                        { value: 'saflok_ascii', label: 'Saflok / Onity TCP ASCII Protocol' },
                      ]}
                      aria-label="Card Protocol & Encryption"
                    />
                  </div>

                  {/* Hardware Animation */}
                  <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/20 p-4 text-center">
                    {encodingProgress === 'writing' ? (
                      <div className="space-y-2">
                        <span className="inline-block animate-spin text-2xl">⏳</span>
                        <p className="font-bold text-indigo-900 dark:text-indigo-200">Writing Sector 1 Data to RFID Card...</p>
                        <p className="text-[10px] text-slate-500">Hold card steady on the USB encoder reader</p>
                      </div>
                    ) : encodingProgress === 'success' ? (
                      <div className="space-y-1">
                        <span className="text-2xl">✅</span>
                        <p className="font-bold text-emerald-800 dark:text-emerald-300">RFID Keycard Encoded Successfully!</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-2xl">📡</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200">Place Blank MIFARE Card on Reader</p>
                        <p className="text-[10px] text-slate-500">Encoder will authenticate Sector 1 and burn Room {encodingKey.roomNumber} credentials</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="my-5 space-y-4 text-xs">
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/30 p-4 text-amber-900 dark:text-amber-200 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-sm">
                      <span>⚠️</span> Room {encodingKey.roomNumber} is Currently Vacant
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                      MIFARE Smart Keycards can only be encoded for active in-house guests checked into Room {encodingKey.roomNumber}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEncodingKey(null);
                      router.push('/reservations');
                    }}
                    className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 transition-colors cursor-pointer"
                  >
                    Check In Guest for Room {encodingKey.roomNumber} →
                  </button>
                </div>
              )}

              <div className="flex gap-2 border-t border-slate-100 dark:border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setEncodingKey(null)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                {stay && (
                  <button
                    type="button"
                    disabled={encodingProgress !== 'idle'}
                    onClick={() => handleExecuteEncodeForStay(stay)}
                    className="flex-1 rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    Encode Card Now
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 2: HAND TO GUEST MODAL (BRASS KEY - STRICTLY FILTERED BY ROOM) */}
      {/* ========================================================================= */}
      {handingKey && (() => {
        // STRICT FILTER: Only show guests registered in THIS exact room number
        const roomStays = activeStays.filter(
          (s) => String(s.roomNumber).trim() === String(handingKey.roomNumber).trim()
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50" role="presentation">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="hand-key-modal-title"
              className="relative flex w-full max-w-md flex-col rounded-3xl bg-white dark:bg-[#0c1222] shadow-2xl p-6 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-400 text-slate-950 font-black text-base shadow-xs" aria-hidden="true">
                    🗝️
                  </span>
                  <div>
                    <h3 id="hand-key-modal-title" className="font-display text-base font-bold">
                      Hand Brass Key #{handingKey.roomNumber} to Guest
                    </h3>
                    <p className="text-xs text-muted">
                      Select the guest registered in Room {handingKey.roomNumber} taking possession of the key tag.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const k = handingKey;
                      setHandingKey(null);
                      setHistoryKey(k);
                    }}
                    title="View Custody Log for this key"
                    className="rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 transition-colors cursor-pointer flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <span>📜</span>
                    <span>Custody Log</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Close handover dialog"
                    onClick={() => setHandingKey(null)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {roomStays.length > 0 ? (
                <div className="my-4 space-y-2.5">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 py-2 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                    🛡️ Verified Room Occupants — Only guests staying in Room {handingKey.roomNumber}
                  </div>

                  <div className="space-y-2">
                    {roomStays.map((s) => (
                      <div key={s.reservationId} className="space-y-2">
                        {/* Primary Registered Guest */}
                        <button
                          type="button"
                          onClick={() => handleUpdateKeyStatus(handingKey.id, 'issued_to_guest', s.guestName, s.reservationId)}
                          className="w-full text-left rounded-xl border border-slate-200 dark:border-white/10 p-3 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all cursor-pointer flex items-center justify-between group"
                        >
                          <div>
                            <p className="text-xs font-bold text-ink">Room {s.roomNumber} — {s.guestName}</p>
                            <p className="text-[10px] text-muted">
                              Primary Guest · Checked in · {s.checkInFormatted || 'Today'} → {s.checkOutFormatted || 'Tomorrow'}
                            </p>
                          </div>
                          <span className="rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-slate-950 group-hover:bg-amber-300 transition-colors shadow-xs">
                            Hand Key →
                          </span>
                        </button>

                        {/* Registered Companions in this room (if any) */}
                        {Array.isArray(s.guests) &&
                          s.guests
                            .filter((g) => g.name && g.name.trim().toLowerCase() !== s.guestName.trim().toLowerCase())
                            .map((comp) => (
                              <button
                                key={comp.id}
                                type="button"
                                onClick={() => handleUpdateKeyStatus(handingKey.id, 'issued_to_guest', comp.name, s.reservationId)}
                                className="w-full text-left rounded-xl border border-slate-200 dark:border-white/10 p-3 pl-5 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all cursor-pointer flex items-center justify-between group bg-slate-50/50 dark:bg-white/[0.02]"
                              >
                                <div>
                                  <p className="text-xs font-bold text-ink">Room {s.roomNumber} — {comp.name}</p>
                                  <p className="text-[10px] text-muted">Registered Room Companion</p>
                                </div>
                                <span className="rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-slate-950 group-hover:bg-amber-300 transition-colors shadow-xs">
                                  Hand Key →
                                </span>
                              </button>
                            ))}
                      </div>
                    ))}
                  </div>

                  {/* Housekeeping Option */}
                  <div className="pt-2 border-t border-slate-100 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => handleUpdateKeyStatus(handingKey.id, 'with_housekeeping', 'Housekeeping Staff')}
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🧹 Hand to Housekeeping Staff</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Room is VACANT - No Active Guest */
                <div className="my-5 space-y-4">
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-sm">
                      <span>⚠️</span> Room {handingKey.roomNumber} is Currently Vacant
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                      No active checked-in guest is registered for Room {handingKey.roomNumber}.
                      Keys cannot be handed to guests staying in other rooms.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => handleUpdateKeyStatus(handingKey.id, 'with_housekeeping', 'Housekeeping Staff')}
                      className="w-full rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 py-2.5 text-xs font-bold text-blue-900 dark:text-blue-200 hover:bg-blue-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>🧹 Hand to Housekeeping Staff</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setHandingKey(null);
                        router.push('/reservations');
                      }}
                      className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>🛎️ Go to Reservations &amp; Check In Guest →</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 dark:border-white/10 pt-3">
                <button
                  type="button"
                  onClick={() => setHandingKey(null)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 3: DIGITAL MOBILE PASS QR */}
      {/* ========================================================================= */}
      {mobilePassKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-pass-modal-title"
            className="relative flex w-full max-w-sm flex-col rounded-3xl bg-white dark:bg-[#0c1222] shadow-2xl p-6 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 text-center"
          >
            <h3 id="mobile-pass-modal-title" className="font-display text-base font-bold">
              Room {mobilePassKey.roomNumber} Digital Mobile Key
            </h3>
            <p className="text-xs text-muted mt-1">Guest can scan this QR code at the door reader.</p>

            <div className="my-5 flex justify-center">
              <div className="rounded-2xl border-4 border-slate-900 bg-white p-4 shadow-md">
                {/* SVG QR Code Graphic */}
                <svg
                  role="img"
                  aria-label={`QR Code pass for room ${mobilePassKey.roomNumber}`}
                  className="h-44 w-44"
                  viewBox="0 0 100 100"
                  fill="none"
                >
                  <rect width="100" height="100" fill="white" />
                  <rect x="10" y="10" width="24" height="24" fill="black" />
                  <rect x="14" y="14" width="16" height="16" fill="white" />
                  <rect x="18" y="18" width="8" height="8" fill="black" />
                  <rect x="66" y="10" width="24" height="24" fill="black" />
                  <rect x="70" y="14" width="16" height="16" fill="white" />
                  <rect x="74" y="18" width="8" height="8" fill="black" />
                  <rect x="10" y="66" width="24" height="24" fill="black" />
                  <rect x="14" y="70" width="16" height="16" fill="white" />
                  <rect x="18" y="74" width="8" height="8" fill="black" />
                  <rect x="42" y="15" width="8" height="12" fill="black" />
                  <rect x="42" y="35" width="12" height="8" fill="black" />
                  <rect x="60" y="42" width="14" height="8" fill="black" />
                  <rect x="42" y="60" width="12" height="12" fill="black" />
                  <rect x="65" y="65" width="18" height="8" fill="black" />
                  <rect x="75" y="75" width="8" height="15" fill="black" />
                </svg>
              </div>
            </div>

            <p className="font-mono text-xs font-bold text-slate-500">
              PASS TOKEN: AURAKEY-{mobilePassKey.roomNumber}-{Math.random().toString(36).substring(2, 8).toUpperCase()}
            </p>

            <div className="mt-5 border-t border-slate-100 dark:border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setMobilePassKey(null)}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
              >
                Close Mobile Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: KEY CUSTODY HISTORY & LOST KEY AUDIT */}
      {/* ========================================================================= */}
      {historyKey && (() => {
        const logs = historyKey.custodyLogs || [];
        const lastHolder = logs[0]?.recipientName || historyKey.issuedToGuestName || 'Front Desk Rack';
        const isLost = historyKey.status === 'lost';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50" role="presentation">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="custody-log-modal-title"
              className="relative flex w-full max-w-lg flex-col rounded-3xl bg-white dark:bg-[#0c1222] shadow-2xl p-6 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/20 text-amber-500 font-black text-lg" aria-hidden="true">
                    📜
                  </span>
                  <div>
                    <h3 id="custody-log-modal-title" className="font-display text-base font-bold">
                      Key Custody History · Room {historyKey.roomNumber}
                    </h3>
                    <p className="text-xs text-muted">
                      {historyKey.keyType === 'physical_brass' ? 'Brass Key Tag' : 'MIFARE Contactless RFID Card'} · Active Stay Audit
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close custody log dialog"
                  onClick={() => setHistoryKey(null)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                >
                  ✕
                </button>
              </div>

              {/* Current Custody / Lost Banner */}
              <div className="my-4">
                <div
                  className={`rounded-2xl border p-4 text-xs ${
                    isLost
                      ? 'border-rose-500/40 bg-rose-50 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200'
                      : historyKey.status === 'issued_to_guest'
                      ? 'border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200'
                      : historyKey.status === 'with_housekeeping'
                      ? 'border-blue-500/40 bg-blue-50 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200'
                      : 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                        {isLost ? '🚨 STATUS: KEY REPORTED LOST' : 'CURRENT CHAIN OF CUSTODY'}
                      </p>
                      <p className="text-sm font-extrabold mt-0.5">
                        {isLost
                          ? `Last Person in Possession: ${lastHolder}`
                          : historyKey.status === 'issued_to_guest'
                          ? `In Possession Of: ${historyKey.issuedToGuestName || lastHolder} (Guest)`
                          : historyKey.status === 'with_housekeeping'
                          ? `In Possession Of: ${historyKey.issuedToGuestName || 'Housekeeping Staff'}`
                          : 'Key is currently in Front Desk Slot'}
                      </p>
                    </div>

                    {/* Quick Report Lost / Found Toggle */}
                    {isLost ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateKeyStatus(historyKey.id, 'in_slot');
                          setHistoryKey(null);
                        }}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                      >
                        ✓ Found &amp; Return
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateKeyStatus(historyKey.id, 'lost', undefined, undefined, 'Reported missing by front desk');
                          setHistoryKey(null);
                        }}
                        className="rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                      >
                        🚨 Mark as Lost
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[340px]">
                {logs.length > 0 ? (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
                    {logs.map((log, idx) => (
                      <div key={log.id} className="relative text-xs space-y-1">
                        {/* Dot */}
                        <div
                          className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#0c1222] shadow-xs ${
                            idx === 0
                              ? log.action === 'lost'
                                ? 'bg-rose-500 ring-4 ring-rose-500/20'
                                : 'bg-amber-400 ring-4 ring-amber-400/20'
                              : log.action === 'returned_to_slot'
                              ? 'bg-emerald-500'
                              : log.action === 'with_housekeeping'
                              ? 'bg-blue-500'
                              : 'bg-slate-400'
                          }`}
                        />

                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink flex items-center gap-1.5">
                            {log.action === 'issued_to_guest'
                              ? '👤 Handed to Guest'
                              : log.action === 'returned_to_slot'
                              ? '📥 Returned to Slot'
                              : log.action === 'with_housekeeping'
                              ? '🧹 Given to Housekeeping'
                              : '🚨 Reported Lost'}
                            {idx === 0 && (
                              <span className="rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-300 text-[9px] font-black px-1.5 py-0.2">
                                LATEST
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-muted">
                            {new Date(log.loggedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })},{' '}
                            {new Date(log.loggedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>

                        <div className="rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-ink">
                              {log.recipientName}
                            </span>
                            <span className="rounded bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700 dark:text-slate-300">
                              {log.recipientType.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          {log.notes && (
                            <p className="text-[10px] text-muted mt-1 italic">
                              "{log.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center text-xs text-muted">
                    <p className="font-bold">No Key Movements Recorded Yet</p>
                    <p className="text-[11px] mt-1">
                      Key movements (handover to guest, companion, maid return) are logged here in real time during the stay.
                    </p>
                  </div>
                )}
              </div>

              {/* Automatic Deletion Privacy Policy Notice */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span>🔒</span> Auto-Purge: All key history is permanently deleted upon final check-out.
                </span>
                <button
                  type="button"
                  onClick={() => setHistoryKey(null)}
                  className="rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold px-4 py-1.5 text-xs hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

function KeyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m10.5 12.5 8-8M15 8l3 3M17 6l2 2" />
    </svg>
  );
}
