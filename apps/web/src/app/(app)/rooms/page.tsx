import Link from 'next/link';
import { FEATURES } from '@erp/shared';
import { Banner, btnCls, btnGhostCls, EmptyState, inputCls, PageHeader, StatCard } from '@/components/ui';
import { api, getMe, requireFeature } from '@/lib/api';
import { createRoom, createRoomType, updateRoomType } from './actions';
import { RoomInventory, type RoomRecord, type RoomTypeRecord } from './room-inventory';

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const [{ error, ok }, ent, me] = await Promise.all([searchParams, requireFeature(FEATURES.HOTEL_ROOMS), getMe()]);
  const [rooms, types] = await Promise.all([api<RoomRecord[]>('/hotel/rooms'), api<RoomTypeRecord[]>('/hotel/room-types')]);
  const canManage = me.role === 'owner' || me.role === 'manager';
  const ready = rooms.filter((room) => room.status === 'available').length;
  const occupied = rooms.filter((room) => room.status === 'occupied').length;
  const unavailable = rooms.filter((room) => room.status === 'cleaning' || room.status === 'maintenance').length;

  return (
    <>
      <PageHeader title="Rooms" eyebrow="Inventory and rates" description="Configure room types, room-level pricing and operational status.">
        {canManage && !ent.readOnly && <Link href="#room-setup" className={btnCls}>Add room or type</Link>}
      </PageHeader>
      <Banner error={error} ok={ok} />

      {ent.readOnly && <div role="status" className="mb-5 rounded-lg border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-ink">Configuration changes are paused while this subscription is read-only.</div>}

      <section aria-label="Room inventory summary" className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total rooms" value={rooms.length} detail={`${types.length} room types`} />
        <StatCard label="Ready" value={ready} detail="Available for sale" />
        <StatCard label="Occupied" value={occupied} detail="Active stays" />
        <StatCard label="Needs attention" value={unavailable} detail="Cleaning or maintenance" />
      </section>

      {canManage && !ent.readOnly && (
        <section id="room-setup" className="scroll-mt-20">
          <div className="mb-3"><h2 className="font-display text-lg font-bold text-ink">Set up inventory</h2><p className="mt-1 text-xs text-muted">Start with a room type, then add individual rooms.</p></div>
          <div className="grid gap-4 xl:grid-cols-2">
            <form action={createRoomType} className="space-y-4 rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-sm font-bold text-lagoon-dark">01</span><div><h3 className="text-sm font-semibold text-ink">Add a room type</h3><p className="text-xs text-muted">Set the default capacity and rates.</p></div></div>
              <label className="block text-xs font-medium text-ink">Type name<input name="name" required minLength={1} maxLength={80} placeholder="e.g. Deluxe" className={`${inputCls} mt-1.5`} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-ink">Nightly rate<input name="baseRate" type="number" min="0" max="10000000" step="0.01" required placeholder="0.00" className={`${inputCls} mt-1.5`} /></label>
                <label className="block text-xs font-medium text-ink">Hourly rate <span className="font-normal text-muted">(optional)</span><input name="hourlyRate" type="number" min="0" max="10000000" step="0.01" placeholder="Falls back to nightly ÷ 24" className={`${inputCls} mt-1.5`} /></label>
                <label className="block text-xs font-medium text-ink">Maximum guests<input name="capacity" type="number" min="1" max="20" defaultValue="2" required className={`${inputCls} mt-1.5`} /></label>
                <label className="block text-xs font-medium text-ink">Description <span className="font-normal text-muted">(optional)</span><input name="description" maxLength={500} placeholder="Room features" className={`${inputCls} mt-1.5`} /></label>
              </div>
              <button className={btnCls}>Create room type</button>
            </form>

            <form action={createRoom} className="space-y-4 rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-ground text-sm font-bold text-muted">02</span><div><h3 className="text-sm font-semibold text-ink">Add a room</h3><p className="text-xs text-muted">A room inherits rates from its selected type.</p></div></div>
              {types.length ? <>
                <label className="block text-xs font-medium text-ink">Room type<select name="roomTypeId" required aria-label="Room type" className={`${inputCls} mt-1.5`} defaultValue=""><option value="" disabled>Choose a room type</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-ink">Room number<input name="number" required maxLength={20} placeholder="e.g. 101" className={`${inputCls} mt-1.5`} /></label>
                  <label className="block text-xs font-medium text-ink">Floor<input name="floor" type="number" min="-5" max="200" defaultValue="0" className={`${inputCls} mt-1.5`} /></label>
                  <label className="block text-xs font-medium text-ink">Nightly override <span className="font-normal text-muted">(optional)</span><input name="baseRate" type="number" min="0" step="0.01" placeholder="Use room-type rate" className={`${inputCls} mt-1.5`} /></label>
                  <label className="block text-xs font-medium text-ink">Hourly override <span className="font-normal text-muted">(optional)</span><input name="hourlyRate" type="number" min="0" step="0.01" placeholder="Use room-type rate" className={`${inputCls} mt-1.5`} /></label>
                </div>
                <button className={btnCls}>Create room</button>
              </> : <EmptyState title="Create a room type first" description="Room types supply the default rates and capacity for new rooms." />}
            </form>
          </div>
        </section>
      )}

      {canManage && !ent.readOnly && types.length > 0 && (
        <section aria-labelledby="room-types-title" className="mt-8">
          <div className="mb-3"><h2 id="room-types-title" className="font-display text-lg font-bold text-ink">Room types and default rates</h2><p className="mt-1 text-xs text-muted">Individual room overrides take precedence over these defaults.</p></div>
          <div className="grid gap-3 xl:grid-cols-2">
            {types.map((type) => (
              <details key={type.id} className="group rounded-xl border border-line bg-surface shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{type.name}</p><p className="mt-1 text-xs text-muted">{type.capacity} guest capacity · {money(type.baseRate, me.property.currency)} / night{type.hourlyRate != null ? ` · ${money(type.hourlyRate, me.property.currency)} / hour` : ' · hourly fallback ÷ 24'}</p></div>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-muted transition-transform group-open:rotate-180" aria-hidden>⌄</span>
                </summary>
                <form action={updateRoomType} className="grid gap-3 border-t border-line bg-ground/35 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <input type="hidden" name="id" value={type.id} />
                  <label className="text-xs font-medium text-ink">Name<input name="name" required defaultValue={type.name} className={`${inputCls} mt-1.5`} /></label>
                  <label className="text-xs font-medium text-ink">Nightly rate<input name="baseRate" type="number" min="0" step="0.01" required defaultValue={type.baseRate} className={`${inputCls} mt-1.5`} /></label>
                  <label className="text-xs font-medium text-ink">Hourly rate<input name="hourlyRate" type="number" min="0" step="0.01" defaultValue={type.hourlyRate ?? ''} placeholder="Fallback: nightly ÷ 24" className={`${inputCls} mt-1.5`} /></label>
                  <label className="text-xs font-medium text-ink">Maximum guests<input name="capacity" type="number" min="1" max="20" required defaultValue={type.capacity} className={`${inputCls} mt-1.5`} /></label>
                  <label className="text-xs font-medium text-ink sm:col-span-2">Description<input name="description" maxLength={500} defaultValue={type.description ?? ''} placeholder="Room features" className={`${inputCls} mt-1.5`} /></label>
                  <button className={`${btnGhostCls} sm:col-span-2 lg:col-span-3`}>Save room type</button>
                </form>
              </details>
            ))}
          </div>
        </section>
      )}

      <RoomInventory rooms={rooms} types={types} currency={me.property.currency} role={me.role} readOnly={ent.readOnly} />
    </>
  );
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}
