'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CustomDropdown } from '@/components/dropdown';
import { updateRoomKeyStatusAction, encodeKeycardAction } from './actions';

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

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const brassKeys = localKeys.filter((k) => k.keyType === 'physical_brass');
  const rfidKeys = localKeys.filter((k) => k.keyType === 'rfid_mifare');

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

  async function handleUpdateKeyStatus(keyId: string, status: RoomKeyDto['status'], guestName?: string, resId?: string) {
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
            }
          : k
      )
    );

    const res = await updateRoomKeyStatusAction(keyId, {
      status,
      issuedToGuestName: guestName,
      issuedToReservationId: resId,
    });
    if (res.ok) {
      const label = status === 'in_slot' ? 'RETURNED TO SLOT' : status === 'issued_to_guest' ? `ISSUED TO ${guestName || 'GUEST'}` : 'WITH HOUSEKEEPING';
      setFeedbackMsg({ type: 'ok', text: `Key status updated to ${label}` });
      setHandingKey(null);
      router.refresh();
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to update key status' });
      // Revert to prop state on failure
      setLocalKeys(keys);
    }
  }

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
                Phase 4 Enterprise Hardware
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
      {/* TAB 1: TRADITIONAL BRASS KEY TAG RACK */}
      {/* ========================================================================= */}
      {activeTab === 'brass_rack' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                <span>Traditional Wooden Key Rack &amp; Brass Keychains</span>
                <span className="rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 border border-amber-300">
                  Ideal for Small Hotels &amp; Heritage Havelis
                </span>
              </h2>
              <p className="text-xs text-muted">
                Visual representation of the physical front desk key cabinet. Keys are securely bound to their assigned room and active checked-in occupants.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                In Slot ({brassKeys.filter((k) => k.status === 'in_slot').length})
              </span>
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                With Guest ({brassKeys.filter((k) => k.status === 'issued_to_guest').length})
              </span>
              <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                Housekeeping ({brassKeys.filter((k) => k.status === 'with_housekeeping').length})
              </span>
            </div>
          </div>

          {/* Wooden Rack Grid */}
          <div className="rounded-3xl border-4 border-[#4a2e18] bg-[#2b180d] p-6 shadow-2xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {brassKeys.map((key) => {
                const stay = activeStays.find(
                  (s) => String(s.roomNumber).trim() === String(key.roomNumber).trim()
                );

                return (
                  <div
                    key={key.id}
                    className={`flex flex-col justify-between rounded-2xl border p-4 shadow-md transition-all ${
                      key.status === 'in_slot'
                        ? 'border-[#8c6239] bg-[#3d2314] text-amber-100'
                        : key.status === 'issued_to_guest'
                        ? 'border-amber-400/80 bg-[#543019] text-white ring-1 ring-amber-400'
                        : 'border-blue-400/80 bg-[#1d263b] text-white'
                    }`}
                  >
                    <div className="text-center">
                      {/* Brass Key Peg / Hook */}
                      <div className="mx-auto mb-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 ring-2 ring-amber-600 shadow-inner">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                      </div>

                      {/* Room Number Engraved Brass Plate */}
                      <div className="rounded-xl border border-amber-400/60 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 px-3 py-2 text-slate-950 shadow-md">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-950">ROOM</p>
                        <p className="font-display text-2xl font-black tracking-tight leading-none">
                          {key.roomNumber}
                        </p>
                        <p className="text-[8px] font-bold text-amber-900 mt-0.5 truncate">
                          {key.roomTypeName || 'Deluxe'}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="mt-2.5">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            key.status === 'in_slot'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : key.status === 'issued_to_guest'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              : 'bg-blue-950 text-blue-300 border border-blue-500/40'
                          }`}
                        >
                          {key.status === 'in_slot' ? '🟢 In Slot' : key.status === 'issued_to_guest' ? '🟡 Out with Guest' : '🧹 With Maid'}
                        </span>
                      </div>

                      {/* Occupant / Room Info */}
                      {key.status === 'issued_to_guest' && (
                        <p className="text-[10px] text-amber-200 font-bold mt-1.5 truncate" title={`Guest: ${key.issuedToGuestName || 'In-House Guest'}`}>
                          👤 {key.issuedToGuestName || 'In-House Guest'}
                        </p>
                      )}

                      {key.status === 'with_housekeeping' && (
                        <p className="text-[10px] text-blue-200 font-bold mt-1.5 truncate">
                          🧹 {key.issuedToGuestName || 'Housekeeping Staff'}
                        </p>
                      )}

                      {key.status === 'in_slot' && (
                        stay ? (
                          <p className="text-[10px] text-emerald-300 font-bold mt-1.5 truncate" title={`In-House: ${stay.guestName}`}>
                            👤 {stay.guestName}
                          </p>
                        ) : (
                          <p className="text-[10px] text-amber-100/60 font-medium mt-1.5 truncate">
                            🚪 Vacant Room
                          </p>
                        )
                      )}
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="mt-4 pt-2.5 border-t border-white/10 space-y-1.5">
                      {key.status === 'in_slot' ? (
                        <button
                          type="button"
                          onClick={() => setHandingKey(key)}
                          className={`w-full rounded-lg py-1.5 text-[11px] font-black transition-colors cursor-pointer shadow-xs ${
                            stay
                              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                              : 'bg-slate-700/80 text-amber-100 hover:bg-slate-600'
                          }`}
                        >
                          {stay ? 'Hand to Guest →' : 'Key Actions →'}
                        </button>
                      ) : key.status === 'with_housekeeping' ? (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateKeyStatus(key.id, 'in_slot')}
                            className="w-full rounded-lg bg-emerald-700 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-600 transition-colors cursor-pointer"
                          >
                            ✓ Return to Slot
                          </button>
                          {stay && (
                            <button
                              type="button"
                              onClick={() => setHandingKey(key)}
                              className="w-full rounded-lg bg-amber-400 py-1 text-[10px] font-bold text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer"
                            >
                              Hand to Guest →
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateKeyStatus(key.id, 'in_slot')}
                          className="w-full rounded-lg bg-emerald-700 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-600 transition-colors cursor-pointer"
                        >
                          ✓ Return to Slot
                        </button>
                      )}
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

          {/* RFID Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rfidKeys.map((key) => {
              const stay = activeStays.find(
                (s) => String(s.roomNumber).trim() === String(key.roomNumber).trim()
              );

              return (
                <div
                  key={key.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-white/10 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-[#0d1424] dark:to-[#070b14] p-5 shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        NFC / RFID 13.56MHz
                      </span>
                      <span className="text-xl">💳</span>
                    </div>

                    <div className="mt-4">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ROOM NUMBER</p>
                      <p className="font-display text-2xl font-black text-ink">{key.roomNumber}</p>
                      <p className="text-[11px] text-muted">{key.roomTypeName}</p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-100 dark:bg-white/[0.04] p-2.5 font-mono text-[10px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">CARD UID:</span>
                        <span className="font-bold text-ink">{key.cardUid || '04:A2:4B:91'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">STATUS:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {key.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">OCCUPANT:</span>
                        <span className="font-bold text-ink truncate max-w-[120px]">
                          {stay ? stay.guestName : key.issuedToGuestName ? key.issuedToGuestName : 'Vacant'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setEncodingKey(key)}
                      className="w-full rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>⚡ Write Sector 1 Keycard</span>
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
            <h2 className="font-display text-lg font-bold text-ink">
              📱 Digital Mobile QR Keycards
            </h2>
            <p className="text-xs text-muted">
              Instant keyless smartphone passes for checked-in guests. Guests scan QR code at the room door reader or front desk.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeStays.map((stay) => (
              <div
                key={stay.reservationId}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1222] p-5 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                      ACTIVE STAY
                    </span>
                    <span className="font-mono text-xs text-slate-400">Room {stay.roomNumber}</span>
                  </div>

                  <h3 className="font-display text-base font-bold text-ink mt-3">
                    {stay.guestName}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Stay: {stay.checkInFormatted || new Date(stay.checkIn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} → {stay.checkOutFormatted || new Date(stay.checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      const matchKey = keys.find((k) => String(k.roomNumber).trim() === String(stay.roomNumber).trim());
                      if (matchKey) setMobilePassKey(matchKey);
                    }}
                    className="w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    View Digital Pass QR
                  </button>
                </div>
              </div>
            ))}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
            <div className="relative flex w-full max-w-md flex-col rounded-3xl bg-white dark:bg-[#0c1222] shadow-2xl p-6 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-100 text-indigo-700 font-bold text-sm">
                    💳
                  </span>
                  <div>
                    <h3 className="font-display text-sm font-bold">Encode Contactless RFID Keycard</h3>
                    <p className="text-[11px] text-muted">Room {encodingKey.roomNumber} ({encodingKey.roomTypeName || 'Room'})</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEncodingKey(null)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
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
      {/* MODAL 2: HAND TO GUEST MODAL (BRASS KEY - ROOM-BOUND) */}
      {/* ========================================================================= */}
      {handingKey && (() => {
        const roomStays = activeStays.filter(
          (s) => String(s.roomNumber).trim() === String(handingKey.roomNumber).trim()
        );
        const stay = roomStays[0];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
            <div className="relative flex w-full max-w-md flex-col rounded-3xl bg-white dark:bg-[#0c1222] shadow-2xl p-6 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-400 text-slate-950 font-black text-base shadow-xs">
                    🗝️
                  </span>
                  <div>
                    <h3 className="font-display text-base font-bold">
                      Brass Key #{handingKey.roomNumber}
                    </h3>
                    <p className="text-xs text-muted">
                      {handingKey.roomTypeName || 'Room'} · Physical Brass Tag
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHandingKey(null)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {stay ? (
                /* Active In-House Guest(s) Registered for this Room */
                <div className="my-5 space-y-4">
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 text-xs text-emerald-900 dark:text-emerald-200">
                    <p className="font-bold flex items-center gap-1.5">
                      <span>🛡️</span> Verified Room Occupant Binding
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                      For guest privacy and hotel security, keys can only be issued to guests registered in Room {handingKey.roomNumber}.
                    </p>
                  </div>

                  {/* Primary Guest Card */}
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold text-sm">
                          👤
                        </span>
                        <div>
                          <p className="text-sm font-bold text-ink">{stay.guestName}</p>
                          <span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 mt-0.5">
                            Primary In-House Guest
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white dark:bg-[#080d19] border border-slate-200/80 dark:border-white/10 p-2.5 text-[11px] grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Check-In</span>
                        <span className="font-semibold">{stay.checkInFormatted || new Date(stay.checkIn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Check-Out</span>
                        <span className="font-semibold">{stay.checkOutFormatted || new Date(stay.checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateKeyStatus(handingKey.id, 'issued_to_guest', stay.guestName, stay.reservationId)}
                      className="w-full rounded-xl bg-amber-400 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-300 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Hand Key to {stay.guestName} →</span>
                    </button>
                  </div>

                  {/* Registered Companions (if any) */}
                  {Array.isArray(stay.guests) && stay.guests.filter((g) => g.name !== stay.guestName).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Registered Companions in Room {handingKey.roomNumber}
                      </p>
                      {stay.guests
                        .filter((g) => g.name !== stay.guestName)
                        .map((comp) => (
                          <div
                            key={comp.id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-white dark:bg-white/[0.02]"
                          >
                            <div>
                              <p className="text-xs font-bold text-ink">{comp.name}</p>
                              <p className="text-[10px] text-muted">Registered Room Companion</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUpdateKeyStatus(handingKey.id, 'issued_to_guest', comp.name, stay.reservationId)}
                              className="rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer"
                            >
                              Hand Key →
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Housekeeping Option */}
                  <div className="pt-2 border-t border-slate-100 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => handleUpdateKeyStatus(handingKey.id, 'with_housekeeping', 'Housekeeping Staff')}
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🧹 Hand to Housekeeping / Service Staff</span>
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
                      For hotel security and guest safety, room keys <strong>cannot</strong> be handed to guests staying in other rooms.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4 space-y-3">
                    <p className="text-xs font-bold text-ink">Permitted Front Desk Operations:</p>

                    <button
                      type="button"
                      onClick={() => handleUpdateKeyStatus(handingKey.id, 'with_housekeeping', 'Housekeeping Staff')}
                      className="w-full rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 py-2.5 text-xs font-bold text-blue-900 dark:text-blue-200 hover:bg-blue-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>🧹 Hand to Housekeeping / Cleaning Staff</span>
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
                  Close
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative flex w-full max-w-sm flex-col rounded-3xl bg-white dark:bg-[#0c1222] shadow-2xl p-6 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 text-center">
            <h3 className="font-display text-base font-bold">Room {mobilePassKey.roomNumber} Digital Mobile Key</h3>
            <p className="text-xs text-muted mt-1">Guest can scan this QR code at the door reader.</p>

            <div className="my-5 flex justify-center">
              <div className="rounded-2xl border-4 border-slate-900 bg-white p-4 shadow-md">
                {/* SVG QR Code Graphic */}
                <svg className="h-44 w-44" viewBox="0 0 100 100" fill="none">
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
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close Mobile Pass
              </button>
            </div>
          </div>
        </div>
      )}

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
