'use client';

import { useState } from 'react';
import { btnCls, btnGhostCls, CustomDropdown, inputCls, StatCard } from '@/components/ui';
import { FormSubmit } from '@/components/form-submit';
import { saveChannelConnection, simulateOtaBooking, syncChannel } from './actions';

export interface OtaChannelItem {
  key: string;
  name: string;
  logo: string;
  apiType: string;
  defaultCommission: number;
  portalUrl: string;
  hotelCode: string;
  isActive: boolean;
  syncMode: string;
  commissionRate: number;
  lastSyncAt: string | null;
  lastSyncStatus: string;
  lastSyncMessage: string | null;
}

export interface OtaSyncLog {
  id: string;
  channelKey: string;
  direction: 'inbound' | 'outbound';
  eventType: string;
  status: string;
  summary: string;
  payload: any;
  createdAt: string;
}

export function ChannelView({
  channels,
  stats,
  logs,
  roomTypes,
  currency,
  readOnly,
}: {
  channels: OtaChannelItem[];
  stats: { otaBookingsCount: number; totalCommissionAmount: number; totalOtaRevenue: number };
  logs: OtaSyncLog[];
  roomTypes: { id: string; name: string; baseRate: number }[];
  currency: string;
  readOnly: boolean;
}) {
  const [selectedChannel, setSelectedChannel] = useState<OtaChannelItem | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);

  const activeChannelsCount = channels.filter((c) => c.isActive).length;

  return (
    <div className="space-y-8">
      {/* KPI Overview Bar */}
      <section aria-label="OTA Performance" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active Connected OTAs"
          value={`${activeChannelsCount} / ${channels.length}`}
          detail="2-way live ARI availability sync"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          label="OTA Bookings (Month)"
          value={stats.otaBookingsCount}
          detail="Directly ingested reservations"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="OTA Revenue"
          value={new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(stats.totalOtaRevenue)}
          detail="Gross volume via online channels"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="OTA Commission"
          value={new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(stats.totalCommissionAmount)}
          detail="Average 15% - 18% channel fees"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
            </svg>
          }
        />
      </section>

      {/* Simulator Quick Action Banner */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-slate-900" />
              <h3 className="text-sm font-bold text-slate-950">
                Live OTA Ingestion Simulator
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500 max-w-xl font-normal">
              Test how live bookings from <strong>MakeMyTrip</strong> or <strong>Booking.com</strong> flow automatically into your Room Rack (Tape Chart), Front Desk occupancy, and Cashiering Folio.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSimulatorOpen((o) => !o)}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors shrink-0"
          >
            {simulatorOpen ? '✕ Close Simulator' : '⚡ Simulate Incoming OTA Booking'}
          </button>
        </div>
      )}

      {/* Simulator Modal / Inline Panel */}
      {simulatorOpen && !readOnly && (
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-xl animate-in fade-in-50 duration-200">
          <div className="border-b border-line pb-4 mb-5">
            <h4 className="font-display text-lg font-extrabold text-ink">
              Simulate Instant OTA Booking Notification (Webhook)
            </h4>
            <p className="text-xs text-muted">
              Sends an inbound booking payload into the ERP. A room will be allocated, guest profile registered, and GST folio created.
            </p>
          </div>

          <form action={simulateOtaBooking} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">Originating OTA Channel</label>
              <CustomDropdown
                name="channelKey"
                defaultValue="makemytrip"
                options={[
                  { value: 'makemytrip', label: '🇮🇳 MakeMyTrip & Goibibo (Ingot API)' },
                  { value: 'booking_com', label: '🌐 Booking.com (Connectivity API)' },
                  { value: 'agoda', label: '🌏 Agoda (YCS Partner API)' },
                  { value: 'expedia', label: '✈️ Expedia Group (QuickConnect)' },
                  { value: 'airbnb', label: '🏡 Airbnb (Host API)' },
                ]}
                aria-label="Originating OTA Channel"
              />
            </div>

            <label className="block text-xs font-bold text-ink">
              Guest Full Name
              <input name="guestName" defaultValue="Pooja Sharma" required className={`${inputCls} mt-1.5`} />
            </label>

            <label className="block text-xs font-bold text-ink">
              Guest Phone
              <input name="guestPhone" defaultValue="+91 98201 54321" className={`${inputCls} mt-1.5`} />
            </label>

            <label className="block text-xs font-bold text-ink">
              Check-In Date
              <input name="checkIn" type="date" defaultValue={todayStr} required className={`${inputCls} mt-1.5`} />
            </label>

            <label className="block text-xs font-bold text-ink">
              Check-Out Date
              <input name="checkOut" type="date" defaultValue={tomorrowStr} required className={`${inputCls} mt-1.5`} />
            </label>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">Preferred Room Category</label>
              <CustomDropdown
                name="roomTypeId"
                defaultValue=""
                placeholder="Any Available Room Category"
                options={[
                  { value: '', label: 'Any Available Room Category' },
                  ...roomTypes.map((rt) => ({
                    value: rt.id,
                    label: `${rt.name} (Base: ₹${rt.baseRate})`,
                    badge: `₹${rt.baseRate}`,
                  })),
                ]}
                aria-label="Preferred Room Category"
              />
            </div>

            <label className="block text-xs font-bold text-ink">
              Total Booking Tariff (INR)
              <input name="totalAmount" type="number" defaultValue={7800} min={100} step={100} required className={`${inputCls} mt-1.5 font-mono font-bold`} />
            </label>

            <label className="block text-xs font-bold text-ink">
              OTA Commission Rate (%)
              <input name="commissionRate" type="number" defaultValue={18} min={0} max={40} className={`${inputCls} mt-1.5 font-mono`} />
            </label>

            <div className="flex items-end">
              <FormSubmit
                className={`${btnCls} w-full bg-teal-600 hover:bg-teal-500 font-extrabold text-sm py-2.5 shadow-md`}
                pendingLabel="Ingesting OTA Booking…"
              >
                📥 Inject OTA Booking Now
              </FormSubmit>
            </div>
          </form>
        </div>
      )}

      {/* Connected Channel Cards */}
      <section aria-labelledby="ota-channels-title" className="space-y-4">
        <div>
          <h2 id="ota-channels-title" className="font-display text-xl font-black text-ink">
            Supported Online Booking Channels
          </h2>
          <p className="text-xs text-muted">
            Configure your Hotel ID and API Key to synchronize room availability, rates, and incoming reservations in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {channels.map((channel) => (
            <article
              key={channel.key}
              className={`relative overflow-hidden rounded-3xl border bg-surface p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                channel.isActive
                  ? 'border-teal-500/30 ring-1 ring-teal-500/20'
                  : 'border-line/90'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ground text-2xl shadow-xs border border-line/60">
                    {channel.logo}
                  </span>
                  <div>
                    <h3 className="font-display text-base font-extrabold text-ink">
                      {channel.name}
                    </h3>
                    <p className="text-[11px] font-semibold text-muted">
                      {channel.apiType}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                    channel.isActive
                      ? 'border border-emerald-300 bg-emerald-100 text-emerald-950'
                      : 'border border-slate-300 bg-slate-100 text-slate-800'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      channel.isActive ? 'bg-emerald-600 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  {channel.isActive ? 'Connected' : 'Not Connected'}
                </span>
              </div>

              <div className="mt-5 space-y-2 border-t border-line/70 pt-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted font-medium">Channel Property ID:</span>
                  <span className="font-mono font-bold text-ink">
                    {channel.hotelCode || <span className="text-muted italic">Unconfigured</span>}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted font-medium">Standard Commission:</span>
                  <span className="font-mono font-black text-slate-950">
                    {channel.commissionRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted font-medium">Sync Mode:</span>
                  <span className="font-bold capitalize text-teal-900">
                    {channel.syncMode.replace('_', ' ')}
                  </span>
                </div>
                {channel.lastSyncAt && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted">Last Synchronized:</span>
                    <span className="font-semibold text-slate-700">
                      {new Date(channel.lastSyncAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>

              {channel.lastSyncMessage && (
                <div className="mt-3 rounded-xl bg-ground/80 p-2.5 text-[11px] font-medium text-muted">
                  <p className="line-clamp-2">💬 {channel.lastSyncMessage}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-5 flex items-center gap-2 pt-2 border-t border-line/50">
                <button
                  type="button"
                  onClick={() => setSelectedChannel(channel)}
                  className={`${btnGhostCls} flex-1 text-xs font-extrabold`}
                >
                  ⚙️ Configure API
                </button>

                <form action={syncChannel} className="flex-1">
                  <input type="hidden" name="channelKey" value={channel.key} />
                  <FormSubmit
                    className={`${btnCls} w-full text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white`}
                    pendingLabel="Pushing ARI…"
                  >
                    🔄 Sync Now
                  </FormSubmit>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Configuration Modal */}
      {selectedChannel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-lg rounded-3xl border border-line bg-surface p-7 shadow-2xl">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedChannel.logo}</span>
                <div>
                  <h3 className="font-display text-lg font-black text-ink">
                    Configure {selectedChannel.name} Integration
                  </h3>
                  <p className="text-xs text-muted">
                    Enter your property credentials from the {selectedChannel.name} Extranet.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChannel(null)}
                className="rounded-xl p-1.5 text-muted hover:bg-ground hover:text-ink text-base"
              >
                ✕
              </button>
            </div>

            <form action={saveChannelConnection} className="mt-5 space-y-4">
              <input type="hidden" name="channelKey" value={selectedChannel.key} />
              <input type="hidden" name="channelName" value={selectedChannel.name} />

              <label className="block text-xs font-bold text-ink">
                Hotel / Property ID on {selectedChannel.name}
                <input
                  name="hotelCode"
                  required
                  defaultValue={selectedChannel.hotelCode}
                  placeholder="e.g. MMT-DEL-9842"
                  className={`${inputCls} mt-1 font-mono`}
                />
              </label>

              <label className="block text-xs font-bold text-ink">
                Channel API Key / Client ID
                <input
                  name="apiKey"
                  type="password"
                  placeholder="Enter API Key from Extranet"
                  className={`${inputCls} mt-1 font-mono`}
                />
                <span className="text-[10px] text-muted">Encrypted with AES-256-GCM before database storage.</span>
              </label>

              <label className="block text-xs font-bold text-ink">
                API Secret Token
                <input
                  name="apiSecret"
                  type="password"
                  placeholder="Enter Secret Token"
                  className={`${inputCls} mt-1 font-mono`}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-ink">
                  Commission Percentage (%)
                  <input
                    name="commissionRate"
                    type="number"
                    defaultValue={selectedChannel.commissionRate}
                    min={0}
                    max={50}
                    step={0.5}
                    className={`${inputCls} mt-1 font-mono`}
                  />
                </label>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Sync Mode</label>
                  <CustomDropdown
                    name="syncMode"
                    defaultValue={selectedChannel.syncMode}
                    size="sm"
                    options={[
                      { value: 'two_way', label: 'Two-Way (ARI Push + Booking Pull)' },
                      { value: 'inbound_only', label: 'Inbound Bookings Only' },
                      { value: 'outbound_only', label: 'Outbound Rates & Inventory Only' },
                    ]}
                    aria-label="Sync Mode"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 pt-2 cursor-pointer">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked={selectedChannel.isActive || true}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs font-bold text-ink">
                  Enable active synchronization for {selectedChannel.name}
                </span>
              </label>

              <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedChannel(null)}
                  className={btnGhostCls}
                >
                  Cancel
                </button>
                <FormSubmit
                  className={`${btnCls} bg-teal-600 hover:bg-teal-500 font-extrabold text-sm`}
                  pendingLabel="Verifying &amp; Saving…"
                >
                  Save &amp; Connect Channel
                </FormSubmit>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sync Activity Stream */}
      <section aria-labelledby="sync-logs-title" className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 sm:px-7 py-5 bg-slate-50/60">
          <div>
            <h3 id="sync-logs-title" className="font-display text-lg font-bold text-slate-950">
              Channel Manager Sync Activity Stream
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 font-normal">Recent inbound reservations, rate updates, and inventory allocations</p>
          </div>
          <span className="rounded-full bg-white border border-slate-200 px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
            {logs.length} Recent Events
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 font-medium">
            No sync activity recorded yet. Click <strong>Sync Now</strong> or use the <strong>Simulator</strong> above to generate real-time events.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50/80 uppercase tracking-wider text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Channel</th>
                  <th className="px-6 py-4">Direction</th>
                  <th className="px-6 py-4">Event Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Activity Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm sm:text-[15px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4.5 font-mono text-xs text-slate-500 whitespace-nowrap font-medium">
                      {new Date(log.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-6 py-4.5 font-semibold uppercase tracking-wider text-slate-900">
                      {log.channelKey.replace('_', '.')}
                    </td>
                    <td className="px-6 py-4.5">
                      <span
                        className={`inline-flex rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider border ${
                          log.direction === 'inbound'
                            ? 'bg-blue-50 text-blue-700 border-blue-200/80'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                        }`}
                      >
                        {log.direction}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 font-mono text-xs font-semibold text-slate-700">
                      {log.eventType}
                    </td>
                    <td className="px-6 py-4.5">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800 text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 font-normal text-slate-800 leading-relaxed">
                      {log.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
