'use client';

import { useState } from 'react';
import { CustomDropdown } from '@/components/dropdown';
import {
  turnaroundRoomAction,
  postMinibarChargeHousekeepingAction,
  createLostAndFoundAction,
  claimLostAndFoundAction,
  toggleRoomDndAction,
} from './actions';

export interface HousekeepingRoom {
  id: string;
  number: string;
  floor: number;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
  roomType: string;
  dndStatus?: boolean;
  cleaningType?: string;
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

export interface LostAndFoundItem {
  id: string;
  roomNumber: string;
  itemName: string;
  description?: string | null;
  category: string;
  storageLocation: string;
  status: 'found' | 'claimed' | 'disposed';
  finderName: string;
  guestName?: string | null;
  guestContact?: string | null;
  foundAt: string;
  claimedAt?: string | null;
}

interface HousekeepingClientProps {
  rooms: HousekeepingRoom[];
  logs: HousekeepingLog[];
  minibarCatalog: MinibarItem[];
  lostAndFound?: LostAndFoundItem[];
  initialTab?: 'turnaround' | 'audit' | 'lost_found';
  readOnly?: boolean;
}

export function HousekeepingClient({
  rooms,
  logs,
  minibarCatalog,
  lostAndFound = [],
  initialTab = 'turnaround',
  readOnly = false,
}: HousekeepingClientProps) {
  const [activeTab, setActiveTab] = useState<'turnaround' | 'audit' | 'lost_found'>(initialTab);
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_attention' | 'available' | 'occupied' | 'maintenance'>('needs_attention');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [maintenanceRoom, setMaintenanceRoom] = useState<HousekeepingRoom | null>(null);
  const [minibarRoom, setMinibarRoom] = useState<HousekeepingRoom | null>(null);
  const [isLostFoundModalOpen, setIsLostFoundModalOpen] = useState(false);
  const [claimItem, setClaimItem] = useState<LostAndFoundItem | null>(null);
  const [selectedMinibarItem, setSelectedMinibarItem] = useState(minibarCatalog[0]?.id || '');
  const [minibarQty, setMinibarQty] = useState(1);

  // Derive unique floors
  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  // Counts
  const needsAttentionCount = rooms.filter((r) => r.status === 'cleaning').length;
  const availableCount = rooms.filter((r) => r.status === 'available').length;
  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
  const maintenanceCount = rooms.filter((r) => r.status === 'maintenance').length;
  const dndCount = rooms.filter((r) => r.dndStatus).length;

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
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'needs_attention' && activeTab === 'turnaround'
              ? 'bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/20 text-card-foreground'
              : 'bg-card border-border shadow-2xs hover:border-amber-500/30 text-card-foreground'
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
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'available' && activeTab === 'turnaround'
              ? 'bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20 text-card-foreground'
              : 'bg-card border-border shadow-2xs hover:border-emerald-500/30 text-card-foreground'
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
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'occupied' && activeTab === 'turnaround'
              ? 'bg-primary/10 border-primary/40 ring-2 ring-primary/20 text-card-foreground'
              : 'bg-card border-border shadow-2xs hover:border-primary/30 text-card-foreground'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Occupied</span>
            <span className="text-lg">🛎️</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-primary">
            {occupiedCount}
            {dndCount > 0 && <span className="ml-2 text-xs font-bold text-rose-500">({dndCount} DND)</span>}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Stay-Over In-House</div>
        </button>

        <button
          onClick={() => { setStatusFilter('maintenance'); setActiveTab('turnaround'); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'maintenance' && activeTab === 'turnaround'
              ? 'bg-rose-500/10 border-rose-500/40 ring-2 ring-rose-500/20 text-card-foreground'
              : 'bg-card border-border shadow-2xs hover:border-rose-500/30 text-card-foreground'
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-2xl shadow-2xs text-card-foreground">
        <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('turnaround')}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'turnaround'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground hover:bg-muted/50'
            }`}
          >
            📱 Room Turnaround Hub
          </button>
          <button
            onClick={() => setActiveTab('lost_found')}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'lost_found'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground hover:bg-muted/50'
            }`}
          >
            📦 Lost &amp; Found ({lostAndFound.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground hover:bg-muted/50'
            }`}
          >
            📋 Turnaround Audit Logs ({logs.length})
          </button>
        </div>

        {activeTab === 'turnaround' && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search room #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        )}

        {activeTab === 'lost_found' && !readOnly && (
          <button
            type="button"
            onClick={() => setIsLostFoundModalOpen(true)}
            className="min-h-[42px] px-5 py-2.5 rounded-xl bg-primary hover:opacity-90 text-primary-foreground text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <span className="text-base leading-none">+</span> Log Found Item
          </button>
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
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card border border-border text-foreground hover:bg-muted/40 shadow-2xs'
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
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-card border border-border text-foreground hover:bg-muted/40 shadow-2xs'
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
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card border border-border text-foreground hover:bg-muted/40 shadow-2xs'
              }`}
            >
              All ({rooms.length})
            </button>
            <button
              onClick={() => setStatusFilter('needs_attention')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                statusFilter === 'needs_attention'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-card border border-border text-foreground hover:bg-muted/40 shadow-2xs'
              }`}
            >
              Dirty / Cleaning ({needsAttentionCount})
            </button>
          </div>

          {/* Rooms Grid */}
          {filteredRooms.length === 0 ? (
            <div className="p-12 text-center bg-card rounded-2xl border border-dashed border-border text-card-foreground shadow-xs">
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
                        ? 'bg-primary/5 border-primary/25'
                        : 'bg-card border-border shadow-2xs text-card-foreground'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-2xl font-black tracking-tight text-foreground">{room.number}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                              Fl. {room.floor}
                            </span>
                            {room.dndStatus && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500 text-white animate-pulse">
                                🔴 DND
                              </span>
                            )}
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
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
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
                            className="w-full py-2 px-3 rounded-xl bg-card hover:bg-muted/50 active:scale-[0.98] text-foreground text-xs font-semibold transition-all border border-border flex items-center justify-center gap-1.5 shadow-2xs"
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
                      <div className="grid grid-cols-3 gap-1.5">
                        {/* Report Issue Button */}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => setMaintenanceRoom(room)}
                            className="py-1.5 px-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-[10px] font-bold transition-all border border-rose-500/20 flex items-center justify-center gap-1"
                          >
                            <span>⚠️</span> Issue
                          </button>
                        )}

                        {/* Minibar Charge Button */}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => setMinibarRoom(room)}
                            className="py-1.5 px-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 text-[10px] font-bold transition-all border border-sky-500/20 flex items-center justify-center gap-1"
                          >
                            <span>🍾</span> Minibar
                          </button>
                        )}

                        {/* DND Toggle Button */}
                        {!readOnly && (
                          <form action={toggleRoomDndAction}>
                            <input type="hidden" name="roomId" value={room.id} />
                            <button
                              type="submit"
                              className={`w-full py-1.5 px-1.5 rounded-xl text-[10px] font-bold transition-all border flex items-center justify-center gap-1 ${
                                room.dndStatus
                                  ? 'bg-rose-500 text-white border-rose-600'
                                  : 'bg-card hover:bg-muted/50 text-foreground border-border shadow-2xs'
                              }`}
                              title="Toggle Do Not Disturb (DND)"
                            >
                              <span>{room.dndStatus ? '🚫 DND' : '🔔 DND'}</span>
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'lost_found' ? (
        /* Lost & Found Register Tab */
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xs text-card-foreground">
          <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Lost &amp; Found Item Register</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Central custody log of items left behind in guest rooms and public spaces.</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-lg border border-border bg-muted text-foreground">
              {lostAndFound.length} Items Logged
            </span>
          </div>

          {lostAndFound.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              No lost items reported yet. Tap &ldquo;+ Log Found Item&rdquo; above to record an item.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 font-bold text-muted-foreground uppercase text-[11px] tracking-wider">
                    <th className="py-2.5 px-3">Date Found</th>
                    <th className="py-2.5 px-3">Room / Loc</th>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Locker Storage</th>
                    <th className="py-2.5 px-3">Finder</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lostAndFound.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {new Date(item.foundAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-foreground">Room {item.roomNumber}</td>
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        <div>{item.itemName}</div>
                        {item.description && <div className="text-[11px] text-muted-foreground">{item.description}</div>}
                      </td>
                      <td className="py-2.5 px-3 capitalize text-muted-foreground font-medium">{item.category}</td>
                      <td className="py-2.5 px-3 text-muted-foreground font-medium">{item.storageLocation}</td>
                      <td className="py-2.5 px-3 text-muted-foreground font-medium">{item.finderName}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.status === 'claimed'
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.guestName && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">Claimed by: {item.guestName}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.status === 'found' && !readOnly && (
                          <button
                            type="button"
                            onClick={() => setClaimItem(item)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                          >
                            Mark Claimed
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Audit & Turnaround History Tab */
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xs text-card-foreground">
          <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Live Housekeeping Turnaround &amp; Inspection Log</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Immutable audit trail of room status changes and maintenance logs.</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-lg border border-border bg-muted text-foreground">
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
                  <tr className="border-b border-border bg-muted/40 font-bold text-muted-foreground uppercase text-[11px] tracking-wider">
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Room</th>
                    <th className="py-2.5 px-3">Attendant</th>
                    <th className="py-2.5 px-3">Transition</th>
                    <th className="py-2.5 px-3">Notes / Issue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {new Date(log.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-foreground">Room {log.roomNumber}</td>
                      <td className="py-2.5 px-3 font-medium text-foreground">{log.attendantName || 'System'}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <span className="text-slate-500 capitalize">{log.fromStatus}</span>
                          <span>→</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                              log.toStatus === 'available'
                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                : log.toStatus === 'maintenance'
                                ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400'
                                : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {log.toStatus}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {log.maintenanceIssue ? (
                          <span className="font-semibold text-rose-600 flex items-center gap-1">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>⚠️</span> Report Maintenance Issue
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Room {maintenanceRoom.number} will be moved to Out-of-Order.</p>
              </div>
              <button
                onClick={() => setMaintenanceRoom(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Maintenance Issue / Defect *</label>
                <textarea
                  name="maintenanceIssue"
                  required
                  rows={3}
                  placeholder="e.g. AC leaking water on floor, Geyser not heating, Bathroom faucet broken..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMaintenanceRoom(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/40 border border-border transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 text-card-foreground">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
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
                    className="h-10 w-10 rounded-xl bg-card text-foreground font-bold text-base hover:bg-muted/40 flex items-center justify-center border border-border"
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
                    className="w-20 text-center py-2 rounded-xl border border-border bg-muted/40 text-sm font-bold text-foreground outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMinibarQty(minibarQty + 1)}
                    className="h-10 w-10 rounded-xl bg-card text-foreground font-bold text-base hover:bg-muted/40 flex items-center justify-center border border-border"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMinibarRoom(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/40 border border-border transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground shadow-xs hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                >
                  Post to Guest Folio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Found Item Modal */}
      {isLostFoundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>📦</span> Log Lost &amp; Found Item
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Register an item found in guest rooms or public areas.</p>
              </div>
              <button
                onClick={() => setIsLostFoundModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form action={createLostAndFoundAction} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Room # or Location *</label>
                <input
                  type="text"
                  name="roomNumber"
                  required
                  placeholder="e.g. 204 or Lobby Sofa"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Item Name *</label>
                <input
                  type="text"
                  name="itemName"
                  required
                  placeholder="e.g. Apple Watch Series 8, Gold Ring, Ray-Ban Sunglasses"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Category *</label>
                <select
                  name="category"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 text-xs font-medium text-foreground outline-none cursor-pointer"
                >
                  <option value="electronics">Electronics (Phones, Chargers, Laptops)</option>
                  <option value="valuables">Valuables (Jewelry, Cash, Watches)</option>
                  <option value="clothing">Clothing &amp; Footwear</option>
                  <option value="documents">Documents (Passports, IDs, Wallets)</option>
                  <option value="other">Other Sundry Items</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Storage Locker / Safe Location *</label>
                <input
                  type="text"
                  name="storageLocation"
                  required
                  defaultValue="Housekeeping Safe Locker A"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Finder Name *</label>
                <input
                  type="text"
                  name="finderName"
                  required
                  defaultValue="Floor Attendant"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLostFoundModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/40 border border-border transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground shadow-xs hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                >
                  Save Item in Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claim Lost Item Modal */}
      {claimItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>✓</span> Mark Item Claimed
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{claimItem.itemName} (Found in Room {claimItem.roomNumber})</p>
              </div>
              <button
                onClick={() => setClaimItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form action={claimLostAndFoundAction} className="mt-4 space-y-4">
              <input type="hidden" name="id" value={claimItem.id} />

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Claimant Guest Name *</label>
                <input
                  type="text"
                  name="guestName"
                  required
                  placeholder="e.g. Vikram Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Guest Contact Phone *</label>
                <input
                  type="text"
                  name="guestContact"
                  required
                  placeholder="e.g. +91 98210 11223"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClaimItem(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/40 border border-border transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all"
                >
                  Confirm Handover &amp; Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
