'use client';

import { useEffect, useState } from 'react';
import { ROOM_STATUSES, type RoomStatus } from '@erp/shared';
import { CustomDropdown, inputCls, STATUS_META } from '@/components/ui';
import { getRoomTypeTheme } from '@/lib/room-types';

export interface RoomOption {
  id: string;
  number: string;
  roomType: string;
  status?: string;
  baseRate?: number;
  hourlyRate?: number | null;
}

export function ReservationPricingFields({
  rooms,
  currency,
  defaultRoomId = '',
}: {
  rooms: RoomOption[];
  currency: string;
  defaultRoomId?: string;
}) {
  const [roomId, setRoomId] = useState(defaultRoomId || (rooms[0]?.id ?? ''));
  const [rateMode, setRateMode] = useState<'nightly' | 'hourly'>('nightly');
  const [unitRate, setUnitRate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (defaultRoomId) setRoomId(defaultRoomId);
  }, [defaultRoomId]);
  const selectedRoom = rooms.find((room) => room.id === roomId);
  const defaultRate = selectedRoom
    ? rateMode === 'hourly'
      ? selectedRoom.hourlyRate ?? (selectedRoom.baseRate == null ? undefined : selectedRoom.baseRate / 24)
      : selectedRoom.baseRate
    : undefined;
  const unitLabel = rateMode === 'hourly' ? 'hour' : 'night';
  const needsReason = unitRate !== '';
  const defaultRateLabel = defaultRate == null
    ? 'Choose a room to see its default rate'
    : `Default ${new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(defaultRate)} per ${unitLabel}`;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Room</label>
          <CustomDropdown
            name="roomId"
            required
            value={roomId}
            onChange={(val) => setRoomId(val)}
            placeholder="Choose a room"
            options={rooms.map((room) => {
              const theme = getRoomTypeTheme(room.roomType);
              const rawStatus = (room.status ?? 'available').toLowerCase();
              const roomStatus: RoomStatus = (ROOM_STATUSES as readonly string[]).includes(rawStatus)
                ? (rawStatus as RoomStatus)
                : 'available';
              const meta = STATUS_META[roomStatus];

              // Color scheme matches Live Room Board cards
              const statusBadgeColor =
                roomStatus === 'occupied'
                  ? 'bg-blue-50 text-blue-900 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-600/40'
                  : roomStatus === 'cleaning'
                  ? 'bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-600/40'
                  : roomStatus === 'maintenance'
                  ? 'bg-slate-100 text-slate-800 border border-slate-300 dark:bg-white/10 dark:text-slate-300 dark:border-white/20'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-600/40';

              return {
                value: room.id,
                label: `${room.number} · ${room.roomType}`,
                badge: meta.label,
                badgeColor: statusBadgeColor,
                icon: (
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${theme.dot} shadow-2xs shrink-0`}
                    title={`Category: ${room.roomType} (${theme.colorName})`}
                  />
                ),
              };
            })}
            aria-label="Room"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1">Pricing basis</label>
          <CustomDropdown
            name="rateMode"
            value={rateMode}
            onChange={(val) => setRateMode(val as 'nightly' | 'hourly')}
            options={[
              { value: 'nightly', label: 'Nightly stay' },
              { value: 'hourly', label: 'Hourly stay' },
            ]}
            aria-label="Pricing basis"
          />
        </div>

        <label className="block text-xs font-medium text-muted">
          Manual {rateMode === 'hourly' ? 'hourly' : 'nightly'} rate (optional)
          <input
            name="unitRateOverride"
            type="number"
            min="0"
            max="10000000"
            step="0.01"
            value={unitRate}
            onChange={(event) => setUnitRate(event.target.value)}
            placeholder={defaultRateLabel}
            aria-describedby="reservation-rate-help"
            className={`${inputCls} mt-1`}
          />
        </label>

        <label className="block text-xs font-medium text-muted">
          Manual rate reason{needsReason ? ' (required)' : ' (required with a manual rate)'}
          <input
            name="overrideReason"
            maxLength={300}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required={needsReason}
            placeholder="e.g. manager-approved rate"
            className={`${inputCls} mt-1`}
          />
        </label>
      </div>
      <p id="reservation-rate-help" className="text-xs text-muted">
        {defaultRateLabel}. Entering a manual rate replaces that default and
        the server multiplies it by {rateMode === 'hourly' ? 'billable hours' : 'nights'}.
      </p>
    </>
  );
}
