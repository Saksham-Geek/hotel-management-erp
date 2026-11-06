import { redirect } from 'next/navigation';
import { FEATURES } from '@erp/shared';
import { Banner, btnCls, EmptyState, PageHeader, StatCard } from '@/components/ui';
import { FormSubmit } from '@/components/form-submit';
import { formatDate } from '@/lib/format';
import { api, getMe, requireFeature } from '@/lib/api';
import { runNightAudit } from './actions';

interface NightAuditStatus {
  currentBusinessDate: string;
  isAuditInProgress: boolean;
  lastAuditedAt: string | null;
  totalRooms: number;
  inHouseRooms: number;
  pendingArrivals: number;
  pendingDepartures: number;
  occupancyRate: number;
}

interface NightAuditLog {
  id: string;
  businessDate: string;
  roomsTotal: number;
  roomsOccupied: number;
  occupancyRate: number;
  totalRoomRevenue: number;
  totalTaxCollected: number;
  adr: number;
  revpar: number;
  completedAt: string;
  auditorName: string | null;
}

export default async function NightAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const me = await getMe();
  if (me.role !== 'owner' && me.role !== 'manager') {
    redirect(
      '/dashboard?error=' +
        encodeURIComponent(
          'Access Restricted: Night Audit & Day Close is restricted to General Managers and Property Owners.',
        ),
    );
  }

  const [{ error, ok }, ent] = await Promise.all([
    searchParams,
    requireFeature(FEATURES.HOTEL_NIGHT_AUDIT),
  ]);

  const [status, history] = await Promise.all([
    api<NightAuditStatus>('/hotel/night-audit/status').catch(() => ({
      currentBusinessDate: new Date().toISOString().slice(0, 10),
      isAuditInProgress: false,
      lastAuditedAt: null,
      totalRooms: 0,
      inHouseRooms: 0,
      pendingArrivals: 0,
      pendingDepartures: 0,
      occupancyRate: 0,
    })),
    api<NightAuditLog[]>('/hotel/night-audit/history').catch(() => []),
  ]);

  const currency = me.property?.currency ?? 'INR';

  return (
    <>
      <PageHeader
        title="Night Audit &amp; Day Close"
        eyebrow="Financial Rollover"
        description="Close the operational hotel business date, auto-post daily room &amp; tax charges, and audit ADR/RevPAR performance."
      />
      <Banner error={error} ok={ok} />

      {/* Operational Business Date Banner */}
      <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 bg-slate-50/80 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hotel Operations Date</p>
            <h2 className="text-xl font-bold font-display text-slate-950 mt-1">
              Current Business Date: <span className="text-slate-900 font-mono font-bold">{status.currentBusinessDate}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {status.lastAuditedAt
                ? `Last audited: ${new Date(status.lastAuditedAt).toLocaleString('en-IN')}`
                : 'Night audit has not been run today'}
            </p>
          </div>

          {!ent.readOnly && (
            <form action={runNightAudit}>
              <FormSubmit
                className={btnCls}
                pendingLabel="Executing Night Audit…"
              >
                Execute Night Audit &amp; Advance Day →
              </FormSubmit>
            </form>
          )}
        </div>

        {/* Audit Readiness Indicators */}
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          <StatCard
            label="In-House Rooms"
            value={status.inHouseRooms}
            detail={`of ${status.totalRooms} total rooms`}
          />
          <StatCard
            label="Current Occupancy"
            value={`${status.occupancyRate}%`}
            detail="Active guest stays"
          />
          <StatCard
            label="Pending Arrivals"
            value={status.pendingArrivals}
            detail={status.pendingArrivals > 0 ? 'Resolve or mark no-show' : 'All arrivals processed'}
          />
          <StatCard
            label="Pending Departures"
            value={status.pendingDepartures}
            detail={status.pendingDepartures > 0 ? 'Due-outs to check out' : 'All departures cleared'}
          />
        </div>
      </section>

      {/* Audit History & Manager Flash Reports */}
      <section aria-labelledby="night-audit-history-title" className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <div className="border-b border-line px-6 sm:px-7 py-5 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 id="night-audit-history-title" className="font-display text-lg font-black text-slate-950">
              Manager Flash Reports &amp; Daily Hospitality KPIs
            </h3>
            <p className="mt-0.5 text-sm text-slate-600 font-medium">Historical ADR (Average Daily Rate) and RevPAR (Revenue Per Available Room)</p>
          </div>
          <span className="rounded-full bg-white border border-slate-300 px-4 py-1.5 text-xs sm:text-sm font-bold text-slate-900 shadow-xs">
            {history.length} records
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-10">
            <EmptyState
              title="No audit records yet"
              description="Executing your first night audit will record daily ADR, RevPAR, and tax breakdown."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-line bg-slate-100/90 font-black uppercase tracking-wider text-slate-800 text-xs">
                <tr>
                  <th className="px-5 py-4">Business Date</th>
                  <th className="px-5 py-4">Rooms Occupied</th>
                  <th className="px-5 py-4">Occupancy %</th>
                  <th className="px-5 py-4">Room Revenue</th>
                  <th className="px-5 py-4">GST Tax Collected</th>
                  <th className="px-5 py-4">ADR</th>
                  <th className="px-5 py-4">RevPAR</th>
                  <th className="px-5 py-4">Auditor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm sm:text-[15px]">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-950 whitespace-nowrap">{formatDate(h.businessDate)}</td>
                    <td className="px-5 py-4 font-mono font-semibold text-slate-900">{h.roomsOccupied} / {h.roomsTotal}</td>
                    <td className="px-5 py-4 font-bold text-slate-950">{h.occupancyRate}%</td>
                    <td className="px-5 py-4 font-black text-slate-950">{money(h.totalRoomRevenue, currency)}</td>
                    <td className="px-5 py-4 text-slate-700 font-medium">{money(h.totalTaxCollected, currency)}</td>
                    <td className="px-5 py-4 font-mono font-black text-teal-900">{money(h.adr, currency)}</td>
                    <td className="px-5 py-4 font-mono font-black text-slate-950">{money(h.revpar, currency)}</td>
                    <td className="px-5 py-4 text-slate-600 font-medium">{h.auditorName ?? 'System Cron'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function money(amount: number | null | undefined, currency = 'INR') {
  const safe = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 }).format(safe);
}
