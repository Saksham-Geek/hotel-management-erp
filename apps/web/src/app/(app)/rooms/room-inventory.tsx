'use client';

import { useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { ROOM_STATUSES, type RoomStatus } from '@erp/shared';
import { btnGhostCls, EmptyState, inputCls, STATUS_META, StatusBadge } from '@/components/ui';
import { setRoomStatus, updateRoom } from './actions';

export interface RoomRecord {
  id: string;
  number: string;
  floor: number;
  status: RoomStatus;
  roomTypeId: string;
  roomType: string;
  baseRate: number;
  baseRateOverride?: number | null;
  hourlyRate?: number | null;
  hourlyRateOverride?: number | null;
}

export interface RoomTypeRecord {
  id: string;
  name: string;
  baseRate: number;
  hourlyRate?: number | null;
  capacity: number;
  description?: string | null;
}

export function RoomInventory({
  rooms,
  types,
  currency,
  role,
  readOnly,
}: {
  rooms: RoomRecord[];
  types: RoomTypeRecord[];
  currency: string;
  role: string;
  readOnly: boolean;
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const canManage = role === 'owner' || role === 'manager';
  const statuses = [...new Set(rooms.map((room) => room.status))];
  const visibleRooms = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return rooms.filter((room) => (statusFilter === 'all' || room.status === statusFilter) &&
      (!search || `${room.number} ${room.roomType} ${room.floor}`.toLocaleLowerCase().includes(search)))
      .sort((a, b) => a.floor - b.floor || a.number.localeCompare(b.number, undefined, { numeric: true }));
  }, [rooms, query, statusFilter]);

  return (
    <section aria-labelledby="inventory-title" className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="inventory-title" className="font-display text-lg font-bold text-ink">Room inventory</h2>
          <p className="mt-1 text-xs text-muted">{visibleRooms.length} of {rooms.length} rooms · configuration and operational status</p>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(210px,1fr)_180px]">
          <label className="sr-only" htmlFor="room-search">Search rooms</label>
          <input id="room-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search room, type or floor" className={inputCls} />
          <label className="sr-only" htmlFor="room-status-filter">Filter by room status</label>
          <select id="room-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputCls}>
            <option value="all">All room statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{STATUS_META[status].label}</option>)}
          </select>
        </div>
      </div>

      {!visibleRooms.length ? (
        <EmptyState title={rooms.length ? 'No rooms match these filters' : 'No rooms configured yet'} description={rooms.length ? 'Try another search or room status.' : 'Add room types first, then create rooms for this property.'} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleRooms.map((room) => {
            const allowedStatuses = ROOM_STATUSES.filter((status) => status !== 'occupied' &&
              (canManage || status !== 'maintenance') &&
              (role !== 'housekeeping' || ['available', 'cleaning'].includes(status)));
            const statusLocked = room.status === 'maintenance' && !canManage;
            return (
              <article key={room.id} className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-muted">Floor {room.floor}</p>
                    <h3 className="mt-1 font-display text-2xl font-bold leading-7 text-ink">Room {room.number}</h3>
                    <p className="mt-1 truncate text-xs text-muted">{room.roomType}</p>
                  </div>
                  <StatusBadge status={room.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 border-y border-line bg-ground/45 px-4 py-2.5 text-xs">
                  <div><p className="text-muted">Nightly</p><p className="mt-0.5 font-semibold text-ink">{money(room.baseRate, currency)}</p></div>
                  <div><p className="text-muted">Hourly</p><p className="mt-0.5 font-semibold text-ink">{room.hourlyRate == null ? 'Default ÷ 24' : money(room.hourlyRate, currency)}</p></div>
                </div>
                <div className="space-y-3 p-4">
                  {canManage && !readOnly && (
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-primary hover:text-lagoon-dark">
                        <span>Room configuration</span><span className="text-muted transition-transform group-open:rotate-180" aria-hidden>⌄</span>
                      </summary>
                      <form action={updateRoom} className="mt-3 grid gap-2 border-t border-line pt-3">
                        <input type="hidden" name="id" value={room.id} />
                        <label className="text-[11px] font-medium text-muted">Room type<select name="roomTypeId" defaultValue={room.roomTypeId} className={`${inputCls} mt-1 min-h-9 py-1.5 text-xs`}>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
                        <div className="grid grid-cols-[1fr_100px] gap-2">
                          <label className="text-[11px] font-medium text-muted">Room number<input name="number" required defaultValue={room.number} className={`${inputCls} mt-1 min-h-9 py-1.5 text-xs`} /></label>
                          <label className="text-[11px] font-medium text-muted">Floor<input name="floor" type="number" defaultValue={room.floor} className={`${inputCls} mt-1 min-h-9 py-1.5 text-xs`} /></label>
                        </div>
                        <label className="text-[11px] font-medium text-muted">Nightly rate override<input name="baseRate" type="number" min="0" step="0.01" defaultValue={room.baseRateOverride ?? ''} placeholder="Use room-type default" className={`${inputCls} mt-1 min-h-9 py-1.5 text-xs`} /></label>
                        <label className="text-[11px] font-medium text-muted">Hourly rate override<input name="hourlyRate" type="number" min="0" step="0.01" defaultValue={room.hourlyRateOverride ?? ''} placeholder="Use room-type default" className={`${inputCls} mt-1 min-h-9 py-1.5 text-xs`} /></label>
                        <RoomSubmit label="Save configuration" />
                      </form>
                    </details>
                  )}
                  {!readOnly && (statusLocked
                    ? <p className="rounded-lg bg-ground px-3 py-2 text-xs text-muted">Only an owner or manager can change maintenance status.</p>
                    : <form action={setRoomStatus} className="flex items-end gap-2 border-t border-line pt-3">
                      <input type="hidden" name="id" value={room.id} />
                      <input type="hidden" name="back" value="/rooms" />
                      <label className="min-w-0 flex-1 text-[11px] font-medium text-muted">Operational status<select name="status" defaultValue={room.status} className={`${inputCls} mt-1 min-h-9 py-1.5 text-xs`}>{allowedStatuses.map((status) => <option key={status} value={status}>{STATUS_META[status].label}</option>)}</select></label>
                      <RoomSubmit label="Save" compact />
                    </form>)}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RoomSubmit({ label, compact = false }: { label: string; compact?: boolean }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className={`${btnGhostCls} ${compact ? 'min-h-9 px-3 text-xs' : 'w-full text-xs'}`}>{pending ? 'Saving…' : label}</button>;
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}
