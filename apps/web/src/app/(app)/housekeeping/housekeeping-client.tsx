'use client';

import { useState } from 'react';
import { CustomDropdown } from '@/components/dropdown';
import { turnaroundRoomAction, postMinibarChargeHousekeepingAction } from './actions';

export interface HousekeepingRoom {
  id: string;
  number: string;
  floor: number;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
  roomType: string;
}

export interface HousekeepingLog {
  id: string;
  roomId: string;
  roomNumber: string;
  attendantName: string;
  fromStatus: string;
  toStatus: string;
  inspectionNotes?: string | null;
  maintenanceIssue?: string | null;
  loggedAt: string;
}

export interface MinibarItem {
  id: string;
  itemName: string;
  category: string;
  unitPrice: number;
  isActive: boolean;
}

interface HousekeepingClientProps {
  rooms: HousekeepingRoom[];
  logs: HousekeepingLog[];
  minibarCatalog: MinibarItem[];
  readOnly?: boolean;
}

export function HousekeepingClient({ rooms, logs, minibarCatalog, readOnly = false }: HousekeepingClientProps) {
  const [activeTab, setActiveTab] = useState<'turnaround' | 'audit'>('turnaround');
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_attention' | 'available' | 'occupied' | 'maintenance'>('needs_attention');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [maintenanceRoom, setMaintenanceRoom] = useState<HousekeepingRoom | null>(null);
  const [minibarRoom, setMinibarRoom] = useState<HousekeepingRoom | null>(null);
  const [selectedMinibarItem, setSelectedMinibarItem] = useState(minibarCatalog[0]?.id || '');
  const [minibarQty, setMinibarQty] = useState(1);

  // Derive unique floors
  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  // Counts
  const needsAttentionCount = rooms.filter((r) => r.status === 'cleaning').length;
  const availableCount = rooms.filter((r) => r.status === 'available').length;
  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
  const maintenanceCount = rooms.filter((r) => r.status === 'maintenance').length;

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    if (selectedFloor !== 'all' && r.floor !== selectedFloor) return false;
    if (statusFilter === 'needs_attention' && r.status !== 'cleaning') return false;
    if (statusFilter === 'available' && r.status !== 'available') return false;
    if (statusFilter === 'occupied' && r.status !== 'occupied') return false;
    if (statusFilter === 'maintenance' && r.status !== 'maintenance') return false;
    if (searchQuery && !r.number.toLowerCase().includes(searchQuery.toLowerCase()) && !r.roomType.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* KPI Shift Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => { setStatusFilter('needs_attention'); setActiveTab('turnaround'); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'needs_attention' && activeTab === 'turnaround'
              ? 'bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/20'
              : 'bg-card border-border hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Needs Clean</span>
            <span className="text-lg">🧹</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-500">{needsAttentionCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Dirty / In-Turnaround</div>
        </button>

        <button
          onClick={() => { setStatusFilter('available'); setActiveTab('turnaround'); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'available' && activeTab === 'turnaround'
              ? 'bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20'
              : 'bg-card border-border hover:border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clean & Ready</span>
            <span className="text-lg">✨</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-500">{availableCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Inspected For Check-In</div>
        </button>

        <button
          onClick={() => { setStatusFilter('occupied'); setActiveTab('turnaround'); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'occupied' && activeTab === 'turnaround'
              ? 'bg-blue-500/10 border-blue-500/40 ring-2 ring-blue-500/20'
              : 'bg-card border-border hover:border-blue-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Occupied</span>
            <span className="text-lg">🛎️</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-blue-500">{occupiedCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Stay-Over In-House</div>
        </button>

        <button
          onClick={() => { setStatusFilter('maintenance'); setActiveTab('turnaround'); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'maintenance' && activeTab === 'turnaround'
              ? 'bg-rose-500/10 border-rose-500/40 ring-2 ring-rose-500/20'
              : 'bg-card border-border hover:border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Maintenance</span>
            <span className="text-lg">⚠️</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-rose-500">{maintenanceCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Out of Order / Repair</div>
        </button>
      </div>

      {/* Main Tab Controls & Mobile Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-3 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl">
          <button
            onClick={() => setActiveTab('turnaround')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'turnaround' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            📱 Room Turnaround & Attendant Hub
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'audit' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            📋 Inspection History & Turnaround Logs ({logs.length})
          </button>
        </div>

        {activeTab === 'turnaround' && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search room #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-44 px-3 py-1.5 rounded-xl border border-input bg-background text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        )}
      </div>

      {activeTab === 'turnaround' ? (
        <div className="space-y-4">
          {/* Floor & Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground mr-1">Floor:</span>
            <button
              onClick={() => setSelectedFloor('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                selectedFloor === 'all'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              All Floors
            </button>
            {floors.map((fl) => (
              <button
                key={fl}
                onClick={() => setSelectedFloor(fl)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  selectedFloor === fl
                    ? 'bg-foreground text-background shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                Floor {fl}
              </button>
            ))}

            <div className="hidden sm:block h-4 w-px bg-border mx-2" />

            <span className="text-xs font-bold text-muted-foreground mr-1">Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              All ({rooms.length})
            </button>
            <button
              onClick={() => setStatusFilter('needs_attention')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                statusFilter === 'needs_attention'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              Dirty / Cleaning ({needsAttentionCount})
            </button>
          </div>

          {/* Rooms Grid */}
          {filteredRooms.length === 0 ? (
            <div className="p-12 text-center bg-card rounded-2xl border border-dashed border-border">
              <span className="text-4xl">🎉</span>
              <h3 className="mt-2 text-base font-bold text-foreground">No Rooms In This View</h3>
              <p className="text-xs text-muted-foreground mt-1">All selected rooms are up-to-date or match other filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRooms.map((room) => {
                const isCleaning = room.status === 'cleaning';
                const isAvailable = room.status === 'available';
                const isOccupied = room.status === 'occupied';
                const isMaint = room.status === 'maintenance';

                return (
                  <div
                    key={room.id}
                    className={`flex flex-col justify-between p-4 rounded-2xl border transition-all ${
                      isCleaning
                        ? 'bg-amber-500/5 border-amber-500/30 ring-1 ring-amber-500/20'
                        : isMaint
                        ? 'bg-rose-500/5 border-rose-500/30'
                        : isOccupied
                        ? 'bg-blue-500/5 border-blue-500/30'
                        : 'bg-card border-border'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-black tracking-tight text-foreground">{room.number}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                              Fl. {room.floor}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-muted-foreground mt-0.5">{room.roomType}</p>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                            isCleaning
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                              : isAvailable
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                              : isOccupied
                              ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                              : 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isCleaning
                            ? 'Needs Clean'
                            : isAvailable
                            ? 'Ready'
                            : isOccupied
                            ? 'Occupied'
                            : 'Maintenance'}
                        </span>
                      </div>
                    </div>

                    {/* Touch Quick Actions */}
                    <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
                      {isCleaning && !readOnly && (
                        <form action={turnaroundRoomAction}>
                          <input type="hidden" name="roomId" value={room.id} />
                          <input type="hidden" name="toStatus" value="available" />
                          <input type="hidden" name="attendantName" value="Floor Attendant" />
                          <button
                            type="submit"
                            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <span>✨</span> Mark Clean & Ready
                          </button>
                        </form>
                      )}

                      {isAvailable && !readOnly && (
                        <form action={turnaroundRoomAction}>
                          <input type="hidden" name="roomId" value={room.id} />
                          <input type="hidden" name="toStatus" value="cleaning" />
                          <input type="hidden" name="attendantName" value="Floor Attendant" />
                          <button
                            type="submit"
                            className="w-full py-2 px-3 rounded-xl bg-muted hover:bg-amber-500/20 active:scale-[0.98] text-foreground text-xs font-semibold transition-all border border-border flex items-center justify-center gap-1.5"
                          >
                            <span>🧹</span> Request Turnaround
                          </button>
                        </form>
                      )}

                      {isMaint && !readOnly && (
                        <form action={turnaroundRoomAction}>
                          <input type="hidden" name="roomId" value={room.id} />
                          <input type="hidden" name="toStatus" value="available" />
                          <input type="hidden" name="attendantName" value="Maintenance Tech" />
                          <input type="hidden" name="inspectionNotes" value="Maintenance repaired & certified clean." />
                          <button
                            type="submit"
                            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                          >
                            <span>✅</span> Repair Done → Set Ready
                          </button>
                        </form>
                      )}

                      {/* Secondary Actions Row */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Report Issue Button */}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => setMaintenanceRoom(room)}
                            className="py-1.5 px-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-[11px] font-bold transition-all border border-rose-500/20 flex items-center justify-center gap-1"
                          >
                            <span>⚠️</span> Report Issue
                          </button>
                        )}

                        {/* Minibar Charge Button */}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => setMinibarRoom(room)}
                            className="py-1.5 px-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 text-[11px] font-bold transition-all border border-sky-500/20 flex items-center justify-center gap-1"
                          >
                            <span>🍾</span> Minibar Bill
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Audit & Turnaround History Tab */
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Live Housekeeping Turnaround & Inspection Log</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Immutable audit trail of room status changes and maintenance logs.</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
              {logs.length} Entries Logged
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No housekeeping logs recorded yet. Changes will be audited here automatically.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 font-bold text-muted-foreground">
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Room</th>
                    <th className="py-2.5 px-3">Attendant</th>
                    <th className="py-2.5 px-3">Transition</th>
                    <th className="py-2.5 px-3">Notes / Issue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20">
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {new Date(log.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-foreground">Room {log.roomNumber}</td>
                      <td className="py-2.5 px-3 font-medium text-foreground">{log.attendantName || 'System'}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <span className="text-muted-foreground capitalize">{log.fromStatus}</span>
                          <span>→</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                              log.toStatus === 'available'
                                ? 'bg-emerald-500/20 text-emerald-600'
                                : log.toStatus === 'maintenance'
                                ? 'bg-rose-500/20 text-rose-600'
                                : 'bg-amber-500/20 text-amber-600'
                            }`}
                          >
                            {log.toStatus}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {log.maintenanceIssue ? (
                          <span className="font-semibold text-rose-500 flex items-center gap-1">
                            ⚠️ {log.maintenanceIssue}
                          </span>
                        ) : (
                          log.inspectionNotes || '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Maintenance Issue Modal */}
      {maintenanceRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-black text-foreground flex items-center gap-1.5">
                  <span>⚠️</span> Report Maintenance Issue
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Room {maintenanceRoom.number} will be moved to Out-of-Order.</p>
              </div>
              <button
                onClick={() => setMaintenanceRoom(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form action={turnaroundRoomAction} className="mt-4 space-y-4">
              <input type="hidden" name="roomId" value={maintenanceRoom.id} />
              <input type="hidden" name="toStatus" value="maintenance" />

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Attendant Name *</label>
                <input
                  type="text"
                  name="attendantName"
                  required
                  defaultValue="Floor Attendant"
                  placeholder="e.g. Ramesh K."
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Maintenance Issue / Defect *</label>
                <textarea
                  name="maintenanceIssue"
                  required
                  rows={3}
                  placeholder="e.g. AC leaking water on floor, Geyser not heating, Bathroom faucet broken..."
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMaintenanceRoom(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                >
                  Flag for Maintenance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Minibar Charge Modal */}
      {minibarRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-black text-foreground flex items-center gap-1.5">
                  <span>🍾</span> Post Minibar In-Room Charge
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Post consumed items directly to Room {minibarRoom.number}&apos;s Folio.</p>
              </div>
              <button
                onClick={() => setMinibarRoom(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form action={postMinibarChargeHousekeepingAction} className="mt-4 space-y-4">
              <input type="hidden" name="roomId" value={minibarRoom.id} />

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Select Consumed Minibar Item *</label>
                <CustomDropdown
                  options={minibarCatalog.map((item) => ({
                    value: item.id,
                    label: `${item.itemName} — ₹${item.unitPrice}`,
                    badge: item.category,
                  }))}
                  value={selectedMinibarItem}
                  onChange={(val) => setSelectedMinibarItem(val)}
                  placeholder="Select minibar item..."
                />
                <input type="hidden" name="minibarItemId" value={selectedMinibarItem} />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Quantity Consumed *</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMinibarQty(Math.max(1, minibarQty - 1))}
                    className="h-10 w-10 rounded-xl bg-muted font-bold text-base hover:bg-muted/80 flex items-center justify-center"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    max="50"
                    value={minibarQty}
                    onChange={(e) => setMinibarQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center py-2 rounded-xl border border-input bg-background text-sm font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMinibarQty(minibarQty + 1)}
                    className="h-10 w-10 rounded-xl bg-muted font-bold text-base hover:bg-muted/80 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMinibarRoom(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
                >
                  Post to Guest Folio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
