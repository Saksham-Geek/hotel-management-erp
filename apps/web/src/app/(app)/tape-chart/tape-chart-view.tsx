'use client';

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CustomDropdown } from '@/components/dropdown';
import { CustomDatePicker } from '@/components/date-picker';
import { formatMoney } from '@/lib/format';
import {
  formatDeterministicShortDate,
  formatDeterministicDateWithWeekday,
  formatDeterministicWeekdayShort,
  toDate,
} from '@/lib/dates';
import { getRoomTypeTheme } from '@/lib/room-types';

export interface RoomTape {
  id: string;
  number: string;
  floor: number;
  status: string;
  roomType: string;
  baseRate: number;
}

export interface ReservationTape {
  id: string;
  roomId: string;
  status: string;
  checkIn: string;
  checkOut: string;
  rateMode: string;
  bookingSource?: string;
  otaBookingId?: string;
  totalAmount: number;
  guestName: string;
  guestPhone: string | null;
  vip: boolean;
  folioId?: string;
  folioStatus?: string;
  paidAmount: number;
}

function cleanGuestName(name: string): string {
  if (!name) return 'Guest';
  return name.replace(/^\[.*?\]\s*/, '').trim();
}

/**
 * Booking channel tag: Returns the distribution source only.
 * VIP is a guest attribute, NEVER a channel, preventing duplicate VIP pills.
 */
function getChannelTag(res: ReservationTape): { label: string } {
  if (res.bookingSource === 'makemytrip') return { label: 'MMT' };
  if (res.bookingSource === 'booking_com') return { label: 'Booking' };
  if (res.bookingSource === 'agoda') return { label: 'Agoda' };
  if (res.bookingSource === 'expedia') return { label: 'Expedia' };
  if (res.bookingSource === 'corporate') return { label: 'Corporate' };
  if (res.bookingSource === 'walk_in') return { label: 'Walk-In' };
  if (res.rateMode === 'hourly') return { label: 'Layover' };
  return { label: 'Direct' };
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function diffDays(startStr: string, endStr: string): number {
  const [y1, m1, d1] = startStr.split('-').map(Number);
  const [y2, m2, d2] = endStr.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

function formatShortDate(dateStr: string): string {
  return formatDeterministicShortDate(dateStr);
}

function formatCellDate(dateStr: string): string {
  return formatDeterministicDateWithWeekday(dateStr);
}

interface TimelineSegment {
  type: 'reservation' | 'empty';
  span: number;
  dateStr: string;
  reservation?: ReservationTape;
  isContinuingBefore?: boolean;
  isContinuingAfter?: boolean;
  totalNights?: number;
}

function getRoomSegments(roomReservations: ReservationTape[], dates: string[]): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  let dayIdx = 0;

  while (dayIdx < dates.length) {
    const dStr = dates[dayIdx];

    const activeRes = roomReservations.find((r) => {
      if (r.rateMode === 'hourly' || r.checkIn === r.checkOut) {
        return r.checkIn === dStr;
      }
      return r.checkIn <= dStr && r.checkOut > dStr;
    });

    if (!activeRes) {
      segments.push({
        type: 'empty',
        span: 1,
        dateStr: dStr,
      });
      dayIdx++;
    } else {
      const isContinuingBefore = activeRes.checkIn < dStr;
      let span = 1;

      if (activeRes.rateMode !== 'hourly' && activeRes.checkIn !== activeRes.checkOut) {
        while (dayIdx + span < dates.length) {
          const nextDateStr = dates[dayIdx + span];
          if (activeRes.checkOut > nextDateStr) {
            span++;
          } else {
            break;
          }
        }
      }

      const lastDayOfSpan = dates[dayIdx + span - 1];
      const isContinuingAfter =
        activeRes.rateMode !== 'hourly' &&
        activeRes.checkIn !== activeRes.checkOut &&
        activeRes.checkOut > lastDayOfSpan;

      const inDate = new Date(activeRes.checkIn);
      const outDate = new Date(activeRes.checkOut);
      const diffMs = outDate.getTime() - inDate.getTime();
      const totalNights = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

      segments.push({
        type: 'reservation',
        span,
        dateStr: dStr,
        reservation: activeRes,
        isContinuingBefore,
        isContinuingAfter,
        totalNights,
      });

      dayIdx += span;
    }
  }

  return segments;
}

export interface DragSelection {
  roomId: string;
  roomNumber: string;
  roomType: string;
  startDate: string;     // Check-in date
  endDate: string;       // Check-out date
  nights: number;
  startCellDate: string; // First night cell
  endCellDate: string;   // Last night cell
}

export function TapeChartView({
  initialStartDate,
  initialDays = 7,
  rooms,
  reservations,
  currency,
}: {
  initialStartDate: string;
  initialDays?: number;
  rooms: RoomTape[];
  reservations: ReservationTape[];
  currency: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [startDateStr, setStartDateStr] = useState(initialStartDate);
  const [daysCount, setDaysCount] = useState(initialDays);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setStartDateStr(initialStartDate);
  }, [initialStartDate]);

  useEffect(() => {
    setDaysCount(initialDays);
  }, [initialDays]);

  // Drag-to-select stay range booking state
  const [isDragging, setIsDragging] = useState(false);
  const [dragAnchor, setDragAnchor] = useState<{
    roomId: string;
    dateStr: string;
    roomNumber: string;
    roomType: string;
  } | null>(null);
  const [selection, setSelection] = useState<DragSelection | null>(null);
  const [isRangeAnchorActive, setIsRangeAnchorActive] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Guards to prevent click-event race conditions between selection creation and deselection
  const justSelectedRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const lastSelectionTimeRef = useRef(0);

  useEffect(() => {
    function onGlobalMouseUp() {
      setIsDragging(false);
    }
    function onGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelection(null);
        setDragAnchor(null);
        setIsDragging(false);
        setIsRangeAnchorActive(false);
        setHoverDate(null);
      }
    }
    function onGlobalPointerDown(e: MouseEvent) {
      if (!selection) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Guard: ignore clicks inside selected cells, empty cells, or the floating dock
      if (
        target.closest('[data-selected-cell]') ||
        target.closest('[data-floating-dock]') ||
        target.closest('[data-empty-cell]')
      ) {
        return;
      }

      // Clicked outside on headers, columns, background, navbar, etc. -> deselect all!
      setSelection(null);
      setDragAnchor(null);
      setIsDragging(false);
      setIsRangeAnchorActive(false);
      setHoverDate(null);
    }

    window.addEventListener('mouseup', onGlobalMouseUp);
    window.addEventListener('keydown', onGlobalKeyDown);
    window.addEventListener('pointerdown', onGlobalPointerDown);
    return () => {
      window.removeEventListener('mouseup', onGlobalMouseUp);
      window.removeEventListener('keydown', onGlobalKeyDown);
      window.removeEventListener('pointerdown', onGlobalPointerDown);
    };
  }, [selection]);

  const dates = useMemo(() => {
    const list: string[] = [];
    const base = new Date(startDateStr);
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
      list.push(d.toISOString().slice(0, 10));
    }
    return list;
  }, [startDateStr, daysCount]);

  const filteredRooms = useMemo(() => {
    let result = rooms;
    if (filterType !== 'all') {
      result = result.filter((r) => r.roomType === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((r) => {
        const matchesRoom =
          r.number.toLowerCase().includes(q) ||
          r.roomType.toLowerCase().includes(q) ||
          String(r.floor).includes(q);
        const hasMatchingGuest = reservations.some(
          (res) => res.roomId === r.id && cleanGuestName(res.guestName).toLowerCase().includes(q),
        );
        return matchesRoom || hasMatchingGuest;
      });
    }
    return result;
  }, [rooms, filterType, searchQuery, reservations]);

  const roomTypes = useMemo(() => Array.from(new Set(rooms.map((r) => r.roomType))), [rooms]);

  const floors = useMemo(() => {
    const map = new Map<number, RoomTape[]>();
    for (const room of filteredRooms) {
      const list = map.get(room.floor) ?? [];
      list.push(room);
      map.set(room.floor, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [filteredRooms]);

  function navigateDate(newStart: string, newDays: number = daysCount) {
    setStartDateStr(newStart);
    setDaysCount(newDays);
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/room-calendar';
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    params.set('startDate', newStart);
    params.set('days', String(newDays));
    startTransition(() => {
      router.push(`${currentPath}?${params.toString()}`);
    });
  }

  function shiftDays(n: number) {
    const current = new Date(startDateStr);
    const next = new Date(current.getTime() + n * 24 * 60 * 60 * 1000);
    navigateDate(next.toISOString().slice(0, 10), daysCount);
  }

  function handleCellMouseDown(room: RoomTape, dateStr: string) {
    // 1. If 2-click continuous range selection is active on this same room (user clicked start date previously, now clicking 2nd date):
    if (
      isRangeAnchorActive &&
      selection &&
      selection.roomId === room.id &&
      selection.startCellDate === selection.endCellDate &&
      selection.startCellDate !== dateStr
    ) {
      const d1 = selection.startCellDate;
      const d2 = dateStr;
      const startCell = d1 < d2 ? d1 : d2;
      const endCell = d1 < d2 ? d2 : d1;

      // Check if any reservation overlaps between startCell and endCell
      const roomReservations = reservations.filter((r) => r.roomId === room.id);
      const overlaps = roomReservations.some((r) => {
        if (r.rateMode === 'hourly' || r.checkIn === r.checkOut) {
          return r.checkIn >= startCell && r.checkIn <= endCell;
        }
        return r.checkIn <= endCell && r.checkOut > startCell;
      });

      if (!overlaps) {
        const checkOut = addDays(endCell, 1);
        const nights = diffDays(startCell, checkOut);
        justSelectedRef.current = true;
        hasDraggedRef.current = false;
        lastSelectionTimeRef.current = Date.now();
        setSelection({
          roomId: room.id,
          roomNumber: room.number,
          roomType: room.roomType,
          startDate: startCell,
          endDate: checkOut,
          nights,
          startCellDate: startCell,
          endCellDate: endCell,
        });
        setIsRangeAnchorActive(false);
        setDragAnchor(null);
        setIsDragging(false);
        setHoverDate(null);
        return;
      }
    }

    // 2. Normal first-click or drag start:
    justSelectedRef.current = true;
    hasDraggedRef.current = false;
    lastSelectionTimeRef.current = Date.now();
    setIsDragging(true);
    setIsRangeAnchorActive(true);
    setDragAnchor({
      roomId: room.id,
      dateStr,
      roomNumber: room.number,
      roomType: room.roomType,
    });
    const checkOut = addDays(dateStr, 1);
    setSelection({
      roomId: room.id,
      roomNumber: room.number,
      roomType: room.roomType,
      startDate: dateStr,
      endDate: checkOut,
      nights: 1,
      startCellDate: dateStr,
      endCellDate: dateStr,
    });
    setHoverDate(null);
  }

  function handleCellMouseEnter(
    room: RoomTape,
    dateStr: string,
    roomReservations: ReservationTape[],
  ) {
    // If dragging with mouse down:
    if (isDragging && dragAnchor && dragAnchor.roomId === room.id) {
      hasDraggedRef.current = true;
      lastSelectionTimeRef.current = Date.now();
      const d1 = dragAnchor.dateStr;
      const d2 = dateStr;
      const startCell = d1 < d2 ? d1 : d2;
      const endCell = d1 < d2 ? d2 : d1;

      // Check if any reservation overlaps the dragged range
      const overlaps = roomReservations.some((r) => {
        if (r.rateMode === 'hourly' || r.checkIn === r.checkOut) {
          return r.checkIn >= startCell && r.checkIn <= endCell;
        }
        return r.checkIn <= endCell && r.checkOut > startCell;
      });

      if (overlaps) return;

      const checkOut = addDays(endCell, 1);
      const nights = diffDays(startCell, checkOut);

      setSelection({
        roomId: room.id,
        roomNumber: room.number,
        roomType: room.roomType,
        startDate: startCell,
        endDate: checkOut,
        nights,
        startCellDate: startCell,
        endCellDate: endCell,
      });
      return;
    }

    // If 2-click anchor is active (hovering before 2nd click on same room):
    if (
      isRangeAnchorActive &&
      selection &&
      selection.roomId === room.id &&
      selection.startCellDate === selection.endCellDate
    ) {
      setHoverDate(dateStr);
    }
  }

  function handleCellMouseUp() {
    setIsDragging(false);
    // If user dragged across multiple cells, commit the multi-day range and turn off 2-click anchor
    if (selection && selection.startCellDate !== selection.endCellDate) {
      setIsRangeAnchorActive(false);
      setDragAnchor(null);
      setHoverDate(null);
    }
  }

  function handleSelectedDateClick(e: React.MouseEvent, dateStr: string) {
    e.stopPropagation();
    if (!selection) return;

    // Guard: ignore clicks that occur as the tail end of selection creation or dragging
    const elapsed = Date.now() - lastSelectionTimeRef.current;
    if (justSelectedRef.current || hasDraggedRef.current || elapsed < 350) {
      justSelectedRef.current = false;
      hasDraggedRef.current = false;
      return;
    }

    const isStart = dateStr === selection.startCellDate;
    const isEnd = dateStr === selection.endCellDate;
    const isSingle = isStart && isEnd;
    const isMiddle = !isStart && !isEnd;

    // 1. Single night selected -> delete it (deselect all)
    if (isSingle) {
      setSelection(null);
      setDragAnchor(null);
      setIsDragging(false);
      setIsRangeAnchorActive(false);
      setHoverDate(null);
      return;
    }

    // 2. Clicked in the middle of a continuous range -> "delete all if i delete from mid"
    if (isMiddle) {
      setSelection(null);
      setDragAnchor(null);
      setIsDragging(false);
      setIsRangeAnchorActive(false);
      setHoverDate(null);
      return;
    }

    // 3. Clicked the start edge -> delete individual start date (trim start)
    if (isStart) {
      const newStart = addDays(selection.startCellDate, 1);
      if (newStart > selection.endCellDate) {
        setSelection(null);
        setDragAnchor(null);
        setIsDragging(false);
        setIsRangeAnchorActive(false);
        setHoverDate(null);
        return;
      }
      const newNights = diffDays(newStart, selection.endDate);
      justSelectedRef.current = true;
      lastSelectionTimeRef.current = Date.now();
      setSelection({
        ...selection,
        startDate: newStart,
        startCellDate: newStart,
        nights: newNights,
      });
      setIsRangeAnchorActive(false);
      setHoverDate(null);
      return;
    }

    // 4. Clicked the end edge -> delete individual end date (trim end)
    if (isEnd) {
      const newEndCell = addDays(selection.endCellDate, -1);
      if (newEndCell < selection.startCellDate) {
        setSelection(null);
        setDragAnchor(null);
        setIsDragging(false);
        setIsRangeAnchorActive(false);
        setHoverDate(null);
        return;
      }
      const newCheckOut = addDays(newEndCell, 1);
      const newNights = diffDays(selection.startDate, newCheckOut);
      justSelectedRef.current = true;
      lastSelectionTimeRef.current = Date.now();
      setSelection({
        ...selection,
        endDate: newCheckOut,
        endCellDate: newEndCell,
        nights: newNights,
      });
      setIsRangeAnchorActive(false);
      setHoverDate(null);
      return;
    }
  }

  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const inHouse = reservations.filter(
      (r) =>
        r.status === 'checked_in' &&
        r.checkIn <= todayStr &&
        (r.checkOut > todayStr || r.checkIn === r.checkOut),
    ).length;
    const upcoming = reservations.filter((r) => r.status === 'reserved').length;
    const occPct = rooms.length > 0 ? Math.round((inHouse / rooms.length) * 100) : 0;
    return { inHouse, upcoming, occPct };
  }, [reservations, rooms]);

  return (
    <div className="space-y-6">
      {/* 1. Signature Accent KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs relative overflow-hidden min-w-0">
          <span className="h-1.5 w-6 rounded-full bg-emerald-500 block mb-3" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            Total Inventory
          </p>
          <div className="mt-1 flex items-baseline gap-2 truncate">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight tabular-nums">
              {rooms.length} Keys
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
              Across 3 Floors
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs relative overflow-hidden min-w-0">
          <span className="h-1.5 w-6 rounded-full bg-sky-500 block mb-3" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            Current Occupancy
          </p>
          <div className="mt-1 flex items-baseline gap-2 truncate">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight tabular-nums">
              {metrics.inHouse} Active
            </span>
            <span className="rounded-full bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-xs font-black text-sky-600 dark:text-sky-300 shrink-0">
              {metrics.occPct}%
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs relative overflow-hidden min-w-0">
          <span className="h-1.5 w-6 rounded-full bg-purple-500 block mb-3" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            Upcoming Bookings
          </p>
          <div className="mt-1 flex items-baseline gap-2 truncate">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight tabular-nums">
              {metrics.upcoming}
            </span>
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 shrink-0">
              Confirmed Stays
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs relative overflow-hidden min-w-0">
          <span className="h-1.5 w-6 rounded-full bg-amber-500 block mb-3" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            Distribution Channels
          </p>
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-extrabold text-red-600 dark:text-red-400 shadow-2xs">
              MMT
            </span>
            <span className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-extrabold text-blue-600 dark:text-blue-400 shadow-2xs">
              Booking.com
            </span>
            <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 shadow-2xs">
              Agoda
            </span>
            <span className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-extrabold text-purple-600 dark:text-purple-400 shadow-2xs">
              Corporate
            </span>
          </div>
        </div>
      </div>

      {/* 2. Room Type Category Filter Bar & Toolbar */}
      <div className="space-y-4 rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        {/* Top: Room Type Filter Chips */}
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2.5 pb-1">
            <span className="text-xs sm:text-sm font-extrabold text-foreground uppercase tracking-wider shrink-0 mr-1">
              Category:
            </span>
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-extrabold transition-all shadow-xs ${
                filterType === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20 scale-[1.02]'
                  : 'bg-card border border-border text-foreground hover:bg-muted font-bold'
              }`}
            >
              All Types ({rooms.length})
            </button>
            {roomTypes.map((type) => {
              const theme = getRoomTypeTheme(type);
              const isSelected = filterType === type;
              const count = rooms.filter((r) => r.roomType === type).length;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(type)}
                  className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20 scale-[1.02]'
                      : 'bg-card border-border text-foreground hover:bg-muted'
                  }`}
                >
                  <span className="text-base">{theme.icon}</span>
                  <span>{type}</span>
                  <span className="opacity-75 font-mono text-xs">({count})</span>
                </button>
              );
            })}
          </div>

          {selection ? (
            <div className="flex items-center gap-2.5 rounded-full bg-slate-900 text-white px-4 py-1.5 text-xs sm:text-sm font-semibold shadow-xs animate-in fade-in">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Room {selection.roomNumber}: {selection.startDate} → {selection.endDate} ({selection.nights}n)
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelection(null);
                  setDragAnchor(null);
                  setIsDragging(false);
                }}
                className="rounded-full bg-white/20 hover:bg-rose-500 px-2.5 py-0.5 text-xs font-bold text-white transition-colors"
                title="Deselect stay range (or press Esc)"
              >
                ✕ Deselect
              </button>
            </div>
          ) : (
            <p className="text-xs sm:text-sm font-medium text-muted-foreground hidden sm:block">
              💡 Drag across empty days to select · Click selected date or press <kbd className="rounded bg-muted border border-border px-1.5 py-0.5 font-mono text-xs text-foreground font-bold">Esc</kbd> to deselect
            </p>
          )}
        </div>

        {/* Bottom: Date Navigation, Quick Jumps & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center rounded-2xl border border-border bg-muted/50 p-1">
              <button
                type="button"
                onClick={() => shiftDays(-daysCount)}
                className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-card transition-all"
                title={`Previous ${daysCount} Days`}
              >
                ← Prev {daysCount}d
              </button>
              <button
                type="button"
                onClick={() => navigateDate(new Date().toISOString().slice(0, 10), daysCount)}
                className="rounded-xl bg-card px-4 py-2 text-xs sm:text-sm font-black text-foreground shadow-xs border border-border transition-all hover:bg-muted"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => shiftDays(daysCount)}
                className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-card transition-all"
                title={`Next ${daysCount} Days`}
              >
                Next {daysCount}d →
              </button>
            </div>

            {/* Quick Historical Jump Presets */}
            <div className="hidden sm:inline-flex items-center gap-1 rounded-2xl border border-border bg-card px-3 py-1.5 shadow-2xs">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-wider px-1">
                Jump:
              </span>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 7);
                  navigateDate(d.toISOString().slice(0, 10), daysCount);
                }}
                className="rounded-lg px-2.5 py-1 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                title="Jump to 1 week ago"
              >
                -1W
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 1);
                  navigateDate(d.toISOString().slice(0, 10), daysCount);
                }}
                className="rounded-lg px-2.5 py-1 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                title="Jump to 1 month ago"
              >
                -1M
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 3);
                  navigateDate(d.toISOString().slice(0, 10), daysCount);
                }}
                className="rounded-lg px-2.5 py-1 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                title="Jump to 3 months ago (Quarterly History)"
              >
                -3M
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 6);
                  navigateDate(d.toISOString().slice(0, 10), daysCount);
                }}
                className="rounded-lg px-2.5 py-1 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                title="Jump to 6 months ago"
              >
                -6M
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setFullYear(d.getFullYear() - 1);
                  navigateDate(d.toISOString().slice(0, 10), daysCount);
                }}
                className="rounded-lg px-2.5 py-1 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                title="Jump to 1 year ago (Past Year History)"
              >
                -1Y
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground">
              <span>Date:</span>
              <CustomDatePicker
                value={startDateStr}
                onChange={(val) => {
                  if (val) navigateDate(val, daysCount);
                }}
                size="sm"
                aria-label="Navigate date"
              />
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground">
              <span>View:</span>
              <div className="w-36">
                <CustomDropdown
                  value={String(daysCount)}
                  onChange={(val) => {
                    const num = parseInt(val, 10);
                    navigateDate(startDateStr, num);
                  }}
                  size="sm"
                  options={[
                    { value: '7', label: '7 Days (1 Wk)' },
                    { value: '10', label: '10 Days' },
                    { value: '14', label: '14 Days (2 Wks)' },
                    { value: '21', label: '21 Days (3 Wks)' },
                    { value: '30', label: '30 Days (1 Mo)' },
                  ]}
                  aria-label="View duration"
                />
              </div>
            </div>

            <input
              type="search"
              placeholder="Search guest or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-48 sm:w-60 rounded-xl border border-border bg-card px-3.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* 3. Multi-Day Spanning Gantt Grid (Light Luxury Design with Drag-to-Select) */}
      <div className="overflow-x-auto rounded-3xl border border-border bg-card text-card-foreground shadow-sm custom-scrollbar relative">
        {isPending && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-40 flex items-center justify-center">
            <div className="flex items-center gap-2.5 rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 text-xs font-bold shadow-lg animate-in fade-in">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/20 border-t-primary-foreground animate-spin" />
              <span>Loading room allocation &amp; reservations...</span>
            </div>
          </div>
        )}
        <table className="min-w-full border-collapse text-left select-none">
          <thead>
            <tr className="border-b border-border">
              {/* Sticky Room Column Header */}
              <th className="sticky left-0 z-30 w-72 min-w-[280px] max-w-[280px] border-r border-border bg-card/95 backdrop-blur-sm px-6 py-4 text-xs font-black uppercase text-foreground tracking-wider shadow-[2px_0_8px_rgba(0,0,0,0.03)]">
                Room &amp; Category
              </th>

              {/* Day Headers */}
              {dates.map((dateStr) => {
                const dayName = formatDeterministicWeekdayShort(dateStr);
                const dObj = toDate(dateStr);
                const dayNum = dObj ? dObj.getUTCDate() : '';
                const isToday = dateStr === new Date().toISOString().slice(0, 10);
                const isWeekend = dObj ? dObj.getUTCDay() === 0 || dObj.getUTCDay() === 6 : false;

                return (
                  <th
                    key={dateStr}
                    className={`w-[170px] min-w-[170px] sm:w-[190px] sm:min-w-[190px] px-3 py-3.5 text-center border-r border-border transition-colors ${
                      isToday
                        ? 'bg-primary/10 border-b-2 border-b-primary'
                        : isWeekend
                        ? 'bg-muted/30'
                        : 'bg-card'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span
                        className={`text-xs sm:text-sm uppercase tracking-wider font-extrabold ${
                          isToday
                            ? 'text-primary'
                            : isWeekend
                            ? 'text-muted-foreground/80'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {dayName}
                      </span>
                      <div className="mt-1 flex items-center justify-center">
                        <span
                          className={`font-display font-black leading-none ${
                            isToday
                              ? 'grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground font-black text-base shadow-sm ring-2 ring-primary/30'
                              : 'text-xl sm:text-2xl text-foreground'
                          }`}
                        >
                          {dayNum}
                        </span>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {floors.map(([floor, floorRooms]) => {
              const floorReady = floorRooms.filter((r) => r.status === 'available').length;
              const floorOccupied = floorRooms.filter((r) => r.status === 'occupied').length;

              return (
                <Fragment key={`floor-group-${floor}`}>
                  {/* Floor Divider Bar */}
                  <tr className="bg-card border-y border-border">
                    <td
                      colSpan={dates.length + 1}
                      className="sticky left-0 z-10 px-6 py-2.5 bg-card/95 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-3 text-xs sm:text-sm">
                        <span className="font-black text-primary uppercase tracking-wider text-xs px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20">
                          Floor {floor}
                        </span>
                        <span className="font-bold text-foreground">{floorRooms.length} Rooms Total</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{floorReady} Ready</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-sky-600 dark:text-sky-400 font-bold">{floorOccupied} Occupied</span>
                      </div>
                    </td>
                  </tr>

                  {/* Rooms on this Floor */}
                  {floorRooms.map((room) => {
                    const roomReservations = reservations.filter((r) => r.roomId === room.id);
                    const segments = getRoomSegments(roomReservations, dates);
                    const roomTheme = getRoomTypeTheme(room.roomType);

                    return (
                      <tr
                        key={room.id}
                        className="hover:bg-slate-50/40 dark:hover:bg-white/[0.02] transition-colors h-20 sm:h-24"
                      >
                        {/* Sticky Left Room Identification Cell with Signature Accent Dash & Colors */}
                        <td className="sticky left-0 z-20 w-72 min-w-[280px] max-w-[280px] border-r border-border bg-card px-6 py-3.5 shadow-[2px_0_8px_rgba(0,0,0,0.03)]">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3.5">
                              <div className="relative">
                                <span className={`grid h-10 w-14 place-items-center rounded-xl border-2 font-mono text-sm font-black text-foreground ${roomTheme.lightBg} border-border shadow-2xs`}>
                                  {room.number}
                                </span>
                                <span className={`absolute -bottom-1 left-2 h-1.5 w-10 rounded-full ${roomTheme.dash}`} />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-display text-base font-extrabold text-foreground leading-snug">
                                  Room {room.number}
                                </h3>
                                <div className="mt-1">
                                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${roomTheme.badge}`}>
                                    <span>{roomTheme.icon}</span>
                                    <span className="truncate">{room.roomType}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <span
                              className={`h-3 w-3 shrink-0 rounded-full ${
                                room.status === 'available'
                                  ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                                  : room.status === 'occupied'
                                  ? 'bg-sky-500 ring-4 ring-sky-500/20'
                                  : room.status === 'cleaning'
                                  ? 'bg-amber-500 ring-4 ring-amber-500/20'
                                  : 'bg-muted-foreground ring-4 ring-muted'
                              }`}
                              title={`Room Status: ${room.status}`}
                            />
                          </div>
                        </td>

                        {/* Multi-Day Spanning Timeline Segments */}
                        {segments.map((segment, segIdx) => {
                          if (segment.type === 'empty') {
                            const dateObj = new Date(segment.dateStr);
                            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                            const isSelected =
                              selection &&
                              selection.roomId === room.id &&
                              segment.dateStr >= selection.startCellDate &&
                              segment.dateStr <= selection.endCellDate;

                            return (
                              <td
                                key={`${room.id}-empty-${segment.dateStr}-${segIdx}`}
                                colSpan={segment.span}
                                className={`border-r border-border p-1 text-center transition-colors select-none ${
                                  isSelected
                                    ? 'bg-primary/5'
                                    : isWeekend
                                    ? 'bg-muted/20'
                                    : 'bg-card'
                                }`}
                              >
                              {isSelected ? (() => {
                                const isStart = segment.dateStr === selection.startCellDate;
                                const isEnd = segment.dateStr === selection.endCellDate;
                                const isSingle = isStart && isEnd;
                                const nightNum = diffDays(selection.startCellDate, segment.dateStr) + 1;

                                return (
                                  <div
                                    data-selected-cell="true"
                                    onClick={(e) => handleSelectedDateClick(e, segment.dateStr)}
                                    className={`relative flex flex-col items-center justify-center w-full h-16 sm:h-20 bg-slate-900 dark:bg-slate-950 border-y-2 border-primary text-white shadow-sm px-2 py-1.5 cursor-pointer transition-all hover:bg-slate-800 select-none group/selected ${
                                      isSingle
                                        ? 'rounded-xl border-2'
                                        : isStart
                                        ? 'rounded-l-xl border-l-2'
                                        : isEnd
                                        ? 'rounded-r-xl border-r-2'
                                        : 'border-x-0'
                                    }`}
                                    title={
                                      isSingle
                                        ? `Room ${room.number}: 1 night on ${formatCellDate(segment.dateStr)} · Click to deselect`
                                        : isStart
                                        ? `Check-in: ${formatCellDate(segment.dateStr)} · Click to trim this start date`
                                        : isEnd
                                        ? `Last night: ${formatCellDate(segment.dateStr)} (Checkout ${formatCellDate(selection.endDate)}) · Click to trim this end date`
                                        : `Stay night ${nightNum} of ${selection.nights}: ${formatCellDate(segment.dateStr)} · Click to clear entire stay`
                                    }
                                  >
                                    {isSingle ? (
                                      <>
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                                          1 Night Stay
                                        </span>
                                        <span className="text-sm font-black text-white leading-tight">
                                          {formatCellDate(segment.dateStr)}
                                        </span>
                                        <span className="text-[10px] font-semibold text-slate-300 group-hover/selected:text-rose-300 transition-colors">
                                          Out {formatShortDate(selection.endDate)} · ✕ Deselect
                                        </span>
                                      </>
                                    ) : isStart ? (
                                      <>
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                                          Check-In (Night 1)
                                        </span>
                                        <span className="text-sm font-black text-white leading-tight">
                                          {formatCellDate(segment.dateStr)}
                                        </span>
                                        <span className="text-[10px] font-semibold text-slate-300 group-hover/selected:text-rose-300 transition-colors">
                                          ✕ Trim Start
                                        </span>
                                      </>
                                    ) : isEnd ? (
                                      <>
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                                          Last Night ({selection.nights} of {selection.nights})
                                        </span>
                                        <span className="text-sm font-black text-white leading-tight">
                                          {formatCellDate(segment.dateStr)}
                                        </span>
                                        <span className="text-[10px] font-semibold text-slate-300 group-hover/selected:text-rose-300 transition-colors">
                                          Checkout {formatShortDate(selection.endDate)} · ✕ Trim
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                                          Night {nightNum} of {selection.nights}
                                        </span>
                                        <span className="text-sm font-black text-white leading-tight">
                                          {formatCellDate(segment.dateStr)}
                                        </span>
                                        <span className="text-[10px] font-semibold text-slate-400 group-hover/selected:text-rose-300 transition-colors">
                                          ✕ Clear All
                                        </span>
                                      </>
                                    )}
                                  </div>
                                );
                              })() : (() => {
                                const isPreview =
                                  isRangeAnchorActive &&
                                  selection &&
                                  selection.roomId === room.id &&
                                  selection.startCellDate === selection.endCellDate &&
                                  hoverDate &&
                                  segment.dateStr >= (selection.startCellDate < hoverDate ? selection.startCellDate : hoverDate) &&
                                  segment.dateStr <= (selection.startCellDate < hoverDate ? hoverDate : selection.startCellDate);

                                if (isPreview) {
                                  return (
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      aria-label={`Connect stay range to ${formatCellDate(segment.dateStr)} for Room ${room.number}`}
                                      data-empty-cell="true"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          handleCellMouseDown(room, segment.dateStr);
                                        }
                                      }}
                                      onMouseDown={(e) => {
                                        if (e.button === 0) {
                                          handleCellMouseDown(room, segment.dateStr);
                                        }
                                      }}
                                      onMouseEnter={() =>
                                        handleCellMouseEnter(room, segment.dateStr, roomReservations)
                                      }
                                      onMouseUp={handleCellMouseUp}
                                      className="flex flex-col items-center justify-center w-full h-16 sm:h-20 rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                                      title={`Click to connect stay range to ${formatCellDate(segment.dateStr)}`}
                                    >
                                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                        + To {formatShortDate(segment.dateStr)}
                                      </span>
                                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                        Click to connect range
                                      </span>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Select ${formatCellDate(segment.dateStr)} for Room ${room.number}`}
                                    data-empty-cell="true"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleCellMouseDown(room, segment.dateStr);
                                      }
                                    }}
                                    onMouseDown={(e) => {
                                      if (e.button === 0) {
                                        handleCellMouseDown(room, segment.dateStr);
                                      }
                                    }}
                                    onMouseEnter={() =>
                                      handleCellMouseEnter(room, segment.dateStr, roomReservations)
                                    }
                                    onMouseUp={handleCellMouseUp}
                                    className="flex items-center justify-center w-full h-16 sm:h-20 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-xs font-bold text-muted-foreground cursor-crosshair group/empty focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    title={`Click to select check-in date or drag across dates`}
                                  >
                                    <span className="opacity-0 group-hover/empty:opacity-100 transition-opacity font-extrabold text-primary flex items-center gap-1 text-xs sm:text-sm">
                                      + Select / Drag
                                    </span>
                                  </div>
                                );
                              })()}
                              </td>
                            );
                          }

                          // Active Reservation Segment
                          const res = segment.reservation!;
                          const isCheckedIn = res.status === 'checked_in';
                          const isCheckedOut = res.status === 'checked_out';
                          const isHourly =
                            res.rateMode === 'hourly' || res.checkIn === res.checkOut;
                          const channel = getChannelTag(res);
                          const displayName = cleanGuestName(res.guestName);

                          // Distinct Modern Luminous Themes for Capsules
                          const theme = isHourly
                            ? {
                                card: 'bg-[#faf8ff] dark:bg-[#1c1424] hover:bg-purple-100/90 dark:hover:bg-[#281c34] border-purple-200/90 dark:border-purple-800/60 border-l-[4px] border-l-purple-600',
                                badge: 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800',
                                dot: 'bg-purple-600',
                                statusText: 'text-purple-900 dark:text-purple-300',
                              }
                            : isCheckedIn
                            ? {
                                card: 'bg-[#f4faff] dark:bg-[#121c24] hover:bg-sky-100/90 dark:hover:bg-[#1a2b38] border-sky-200/90 dark:border-sky-800/60 border-l-[4px] border-l-sky-600',
                                badge: 'bg-sky-100 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 border-sky-200 dark:border-sky-800',
                                dot: 'bg-sky-600',
                                statusText: 'text-sky-900 dark:text-sky-300',
                              }
                            : isCheckedOut
                            ? {
                                card: 'bg-slate-50/90 dark:bg-slate-800/50 hover:bg-slate-100/90 dark:hover:bg-slate-800 border-slate-200/90 dark:border-slate-700 border-l-[4px] border-l-slate-400',
                                badge: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600',
                                dot: 'bg-slate-400',
                                statusText: 'text-slate-600 dark:text-slate-400',
                              }
                            : res.vip
                            ? {
                                card: 'bg-[#fffcf4] dark:bg-[#1f1a12] hover:bg-amber-100/90 dark:hover:bg-[#2e2619] border-amber-200/90 dark:border-amber-800/60 border-l-[4px] border-l-amber-600',
                                badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-800',
                                dot: 'bg-amber-600',
                                statusText: 'text-amber-900 dark:text-amber-300',
                              }
                            : {
                                card: 'bg-[#f4fbf7] dark:bg-[#101f17] hover:bg-emerald-100/90 dark:hover:bg-[#162e21] border-emerald-200/90 dark:border-emerald-800/60 border-l-[4px] border-l-emerald-600',
                                badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
                                dot: 'bg-emerald-600',
                                statusText: 'text-emerald-900 dark:text-emerald-300',
                              };

                          const totalNights = segment.totalNights ?? 1;

                          return (
                            <td
                              key={`${room.id}-res-${res.id}-${segIdx}`}
                              colSpan={segment.span}
                              className="border-r border-slate-100 dark:border-white/10 p-1.5"
                            >
                              <Link
                                href={`/billing?reservationId=${res.id}`}
                                className={`group relative flex h-16 sm:h-20 w-full flex-col justify-between rounded-xl p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md border ${theme.card}`}
                                title={`${displayName} (${res.checkIn} → ${res.checkOut}) · Total: ${currency} ${res.totalAmount.toLocaleString()} · Click to open live Folio`}
                              >
                                {/* Top Row: Channel Badge, Guest Name, Duration, and SINGLE VIP Badge */}
                                <div className="flex items-center justify-between gap-2 min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`rounded px-2 py-0.5 text-xs font-black uppercase tracking-wider shrink-0 border ${theme.badge}`}
                                    >
                                      {segment.isContinuingBefore
                                        ? `◂ ${channel.label}`
                                        : channel.label}
                                    </span>
                                    <span className="font-extrabold text-sm sm:text-base text-foreground truncate">
                                      {displayName}
                                    </span>
                                    {/* Single VIP Badge (Eliminated double VIP bug) */}
                                    {res.vip && (
                                      <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600 px-2 py-0.5 text-[10px] font-black text-amber-950 dark:text-amber-200 uppercase tracking-wider shrink-0 flex items-center gap-0.5 shadow-2xs">
                                        👑 VIP
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0 text-xs font-bold text-muted-foreground">
                                    {segment.isContinuingAfter && <span>▸</span>}
                                    <span>{totalNights > 1 ? `${totalNights}n` : '1n'}</span>
                                  </div>
                                </div>

                                {/* Bottom Row: Status Tag & Amount */}
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <span
                                    className={`inline-flex items-center gap-1.5 font-bold ${theme.statusText}`}
                                  >
                                    <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                                    <span>{isCheckedIn ? 'In-House' : isCheckedOut ? 'Departed (Paid)' : 'Confirmed'}</span>
                                  </span>

                                  <span className="font-mono font-black text-foreground text-xs sm:text-sm">
                                    {formatMoney(res.totalAmount, currency)}
                                  </span>
                                </div>
                              </Link>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. Minimalist Modern Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-3.5 shadow-xs text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-foreground text-xs">Rack Legend:</span>

          <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Ready / Available
          </span>

          <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            Occupied (In-House)
          </span>

          <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
            Confirmed (Upcoming)
          </span>

          <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            Departed (Past Stay)
          </span>

          <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Needs Cleaning
          </span>

          <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            Maintenance
          </span>
        </div>

        <div className="text-muted-foreground text-xs font-medium">
          Click any reservation to view folio · Drag across empty cells to select dates
        </div>
      </div>

      {/* 5. Floating Action Dock for Dragged Date Range Selection */}
      {selection && (
        <div data-floating-dock="true" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3.5 rounded-full bg-slate-950/95 backdrop-blur-md px-5 py-3 text-white shadow-[0_10px_35px_rgba(0,0,0,0.35)] border border-slate-800 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300">
              Room <strong className="text-white font-mono">{selection.roomNumber}</strong> ({selection.roomType}):{' '}
              <strong className="text-emerald-300 font-mono">{selection.startDate}</strong> →{' '}
              <strong className="text-emerald-300 font-mono">{selection.endDate}</strong>{' '}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white">
                {selection.nights} {selection.nights === 1 ? 'night' : 'nights'}
              </span>
            </span>
          </div>
          <Link
            href={`/reservations?roomId=${selection.roomId}&checkIn=${selection.startDate}&checkOut=${selection.endDate}#new-reservation`}
            className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-1.5 text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <span>+ Book Stay Now</span>
            <span aria-hidden>→</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setSelection(null);
              setDragAnchor(null);
              setIsDragging(false);
            }}
            className="rounded-full bg-slate-800 hover:bg-rose-600/90 text-slate-200 hover:text-white px-3.5 py-1.5 text-xs font-bold transition-all border border-slate-700 active:scale-95 flex items-center gap-1.5 shadow-2xs"
            title="Deselect stay range (or press Esc)"
          >
            <span aria-hidden>✕</span>
            <span>Deselect</span>
          </button>
        </div>
      )}
    </div>
  );
}
