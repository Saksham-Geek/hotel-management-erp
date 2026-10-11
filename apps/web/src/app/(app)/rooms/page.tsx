import { FEATURES, ROOM_STATUSES } from '@erp/shared';
import type { RoomStatus } from '@erp/shared';
import { Banner, btnCls, btnGhostCls, inputCls, PageHeader, RoomTile, STATUS_META } from '@/components/ui';
import { api, getMe, money, requireFeature } from '@/lib/api';
import { createRoom, createRoomType, setRoomStatus, updateRoom, updateRoomType } from './actions';

interface Room { id: string; number: string; floor: number; status: RoomStatus; roomTypeId: string; roomType: string; baseRate: number; baseRateOverride?: number | null; hourlyRate?: number | null; hourlyRateOverride?: number | null }
interface RoomType { id: string; name: string; baseRate: number; hourlyRate?: number | null; capacity: number; description?: string | null }

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const [{ error, ok }, ent, me] = await Promise.all([searchParams, requireFeature(FEATURES.HOTEL_ROOMS), getMe()]);
  const [rooms, types] = await Promise.all([api<Room[]>('/hotel/rooms'), api<RoomType[]>('/hotel/room-types')]);
  const canManage = me.role === 'owner' || me.role === 'manager';
  const locked = ent.readOnly;

  return (
    <>
      <PageHeader title="Rooms" />
      <Banner error={error} ok={ok} />

      {canManage && !locked && (
        <div className="mb-8 grid max-w-5xl gap-4 md:grid-cols-2">
          <form action={createRoomType} className="space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold">Add a room type</h2>
            <input name="name" required placeholder="Deluxe" aria-label="Room type name" className={inputCls} />
            <div className="flex gap-3">
              <input name="baseRate" type="number" min="0" step="0.01" required placeholder="Rate per night" aria-label="Rate per night" className={inputCls} />
              <input name="hourlyRate" type="number" min="0" step="0.01" placeholder="Hourly rate (optional)" aria-label="Hourly rate" className={inputCls} />
              <input name="capacity" type="number" min="1" placeholder="Guests" aria-label="Maximum guests" className={`${inputCls} max-w-24`} />
            </div>
            <input name="description" maxLength={500} placeholder="Description (optional)" aria-label="Room type description" className={inputCls} />
            <button className={btnCls}>Add room type</button>
          </form>
          <form action={createRoom} className="space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold">Add a room</h2>
            <select name="roomTypeId" required aria-label="Room type" className={inputCls} defaultValue="">
              <option value="" disabled>Choose a room type</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name} ({money(t.baseRate, me.property.currency)})</option>)}
            </select>
            <div className="flex gap-3">
              <input name="number" required placeholder="Room number" aria-label="Room number" className={inputCls} />
              <input name="floor" type="number" placeholder="Floor" aria-label="Floor" className={`${inputCls} max-w-24`} />
              <input name="baseRate" type="number" min="0" step="0.01" placeholder="Nightly override (optional)" aria-label="Room nightly override" className={inputCls} />
              <input name="hourlyRate" type="number" min="0" step="0.01" placeholder="Room hourly override (optional)" aria-label="Room hourly override" className={inputCls} />
            </div>
            <button className={btnCls}>Add room</button>
          </form>
        </div>
      )}

      {canManage && !locked && types.length > 0 && (
        <section className="mb-8 max-w-5xl space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold">Room types and rates</h2>
          <p className="text-sm text-muted">Room types define the nightly and hourly defaults. Individual rooms can override either rate. Leave a type hourly rate empty to use its nightly rate divided by 24.</p>
          {types.map((type) => (
            <form key={type.id} action={updateRoomType} className="grid gap-2 rounded-xl bg-ground/60 p-3 sm:grid-cols-2 lg:grid-cols-5">
              <input type="hidden" name="id" value={type.id} />
              <input name="name" required defaultValue={type.name} aria-label={`${type.name} type name`} className={inputCls} />
              <input name="baseRate" type="number" min="0" step="0.01" required defaultValue={type.baseRate} aria-label={`${type.name} nightly rate`} className={inputCls} />
              <input name="hourlyRate" type="number" min="0" step="0.01" defaultValue={type.hourlyRate ?? ''} placeholder="Hourly rate (blank = fallback)" aria-label={`${type.name} default hourly rate`} className={inputCls} />
              <input name="capacity" type="number" min="1" max="20" required defaultValue={type.capacity} aria-label={`${type.name} guest capacity`} className={inputCls} />
              <input name="description" maxLength={500} defaultValue={type.description ?? ''} placeholder="Description" aria-label={`${type.name} description`} className={inputCls} />
              <button className={`${btnGhostCls} sm:col-span-2 lg:col-span-5`}>Save {type.name} type</button>
            </form>
          ))}
        </section>
      )}

      {rooms.length === 0 ? (
        <p className="text-muted">No rooms yet. Add a room type first, then your rooms.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rooms.map((r) => (
            <RoomTile key={r.id} number={r.number} type={`${r.roomType} · ${money(r.baseRate, me.property.currency)}/night${r.hourlyRate != null ? ` · ${money(r.hourlyRate, me.property.currency)}/hr` : ''}`} status={r.status}>
              {canManage && !locked && (
                <form action={updateRoom} className="mt-3 space-y-2 border-t border-line pt-3">
                  <input type="hidden" name="id" value={r.id} />
                  <select name="roomTypeId" defaultValue={r.roomTypeId} aria-label={`Room type for ${r.number}`} className="w-full rounded-md border border-line bg-surface px-2 py-1 text-xs">
                    {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input name="number" required defaultValue={r.number} aria-label={`Room number ${r.number}`} className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1 text-xs" />
                    <input name="floor" type="number" defaultValue={r.floor} aria-label={`Floor for ${r.number}`} className="w-16 rounded-md border border-line bg-surface px-2 py-1 text-xs" />
                  </div>
                  <input name="baseRate" type="number" min="0" step="0.01" defaultValue={r.baseRateOverride ?? ''} placeholder="Nightly override (blank = type rate)" aria-label={`Nightly rate override for ${r.number}`} className="w-full rounded-md border border-line bg-surface px-2 py-1 text-xs" />
                  <input name="hourlyRate" type="number" min="0" step="0.01" defaultValue={r.hourlyRateOverride ?? ''} placeholder="Hourly override (blank = type rate)" aria-label={`Hourly rate override for ${r.number}`} className="w-full rounded-md border border-line bg-surface px-2 py-1 text-xs" />
                  <button className={`${btnGhostCls} w-full !py-1 text-xs`}>Save room configuration</button>
                </form>
              )}
              {!locked && (
                <form action={setRoomStatus} className="mt-3 flex gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="back" value="/rooms" />
                  {r.status === 'maintenance' && !canManage ? (
                    <p className="text-xs text-muted">Manager approval is required to change maintenance status.</p>
                  ) : (
                    <>
                      <select name="status" defaultValue={r.status} aria-label={`Status of room ${r.number}`} className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1 text-xs">
                        {ROOM_STATUSES.filter((s) => s !== 'occupied' && ((me.role === 'owner' || me.role === 'manager') || s !== 'maintenance') && (me.role !== 'housekeeping' || ['available', 'cleaning'].includes(s))).map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                      </select>
                      <button className={`${btnGhostCls} !px-2 !py-1 text-xs`}>Save</button>
                    </>
                  )}
                </form>
              )}
            </RoomTile>
          ))}
        </div>
      )}
    </>
  );
}
