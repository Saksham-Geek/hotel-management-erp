'use client';

import { useState } from 'react';
import { inputCls } from '@/components/ui';

interface RoomOption {
  id: string;
  number: string;
  roomType: string;
  baseRate?: number;
  hourlyRate?: number | null;
}

export function ReservationPricingFields({
  rooms,
  currency,
}: {
  rooms: RoomOption[];
  currency: string;
}) {
  const [roomId, setRoomId] = useState('');
  const [rateMode, setRateMode] = useState<'nightly' | 'hourly'>('nightly');
  const [unitRate, setUnitRate] = useState('');
  const [reason, setReason] = useState('');
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
        <label className="block text-xs font-medium text-muted">
          Room
          <select
            name="roomId"
            required
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            aria-label="Room"
            className={`${inputCls} mt-1`}
          >
            <option value="" disabled>Choose a room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.number} · {room.roomType}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-muted">
          Pricing basis
          <select
            name="rateMode"
            value={rateMode}
            onChange={(event) => setRateMode(event.target.value as 'nightly' | 'hourly')}
            className={`${inputCls} mt-1`}
          >
            <option value="nightly">Nightly stay</option>
            <option value="hourly">Hourly stay</option>
          </select>
        </label>

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
