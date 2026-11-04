import { FEATURES } from '@erp/shared';
import { Banner, btnCls, EmptyState, PageHeader, StatCard } from '@/components/ui';
import { FormSubmit } from '@/components/form-submit';
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
  const [{ error, ok }, ent, me] = await Promise.all([
    searchParams,
    requireFeature(FEATURES.HOTEL_NIGHT_AUDIT),
    getMe(),
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
      <section className="mb-6 overflow-hidden rounded-xl border border-lagoon/30 bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-lagoon/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-lagoon-dark">Hotel Operations Date</p>
            <h2 className="text-xl font-bold font-display text-ink">
              Current Business Date: <span className="text-lagoon-dark">{status.currentBusinessDate}</span>
            </h2>
            <p className="text-xs text-muted">
              {status.lastAuditedAt
                ? `Last audited: ${new Date(status.lastAuditedAt).toLocaleString('en-IN')}`
                : 'Night audit has not been run today'}
            </p>
          </div>

          {!ent.readOnly && (
            <form action={runNightAudit}>
              <FormSubmit
                className={`${btnCls} bg-lagoon-dark hover:bg-lagoon`}
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
      <section aria-labelledby="night-audit-history-title" className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="border-b border-line px-5 py-4 flex items-center justify-between">
          <div>
            <h3 id="night-audit-history-title" className="text-sm font-semibold text-ink">
              Manager Flash Reports &amp; Daily Hospitality KPIs
            </h3>
            <p className="text-xs text-muted">Historical ADR (Average Daily Rate) and RevPAR (Revenue Per Available Room)</p>
          </div>
          <span className="text-xs font-medium text-muted">{history.length} records</span>
        </div>

        {history.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No audit records yet"
              description="Executing your first night audit will record daily ADR, RevPAR, and tax breakdown."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-line bg-ground/60 font-semibold uppercase tracking-wider text-muted text-[10px]">
                <tr>
                  <th className="px-4 py-3">Business Date</th>
                  <th className="px-4 py-3">Rooms Occupied</th>
                  <th className="px-4 py-3">Occupancy %</th>
                  <th className="px-4 py-3">Room Revenue</th>
                  <th className="px-4 py-3">GST Tax Collected</th>
                  <th className="px-4 py-3">ADR</th>
                  <th className="px-4 py-3">RevPAR</th>
                  <th className="px-4 py-3">Auditor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-ground/40">
                    <td className="px-4 py-3 font-semibold text-ink">{h.businessDate}</td>
                    <td className="px-4 py-3 font-mono">{h.roomsOccupied} / {h.roomsTotal}</td>
                    <td className="px-4 py-3 font-semibold">{h.occupancyRate}%</td>
                    <td className="px-4 py-3 font-semibold text-ink">{money(h.totalRoomRevenue, currency)}</td>
                    <td className="px-4 py-3 text-muted">{money(h.totalTaxCollected, currency)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-lagoon-dark">{money(h.adr, currency)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-ink">{money(h.revpar, currency)}</td>
                    <td className="px-4 py-3 text-muted">{h.auditorName ?? 'System Cron'}</td>
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
