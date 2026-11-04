import type { ReactNode } from 'react';
import type { RoomStatus } from '@erp/shared';

export const inputCls =
  'min-h-10 w-full rounded-xl border border-line/80 bg-surface px-3.5 py-2 text-xs text-ink shadow-sm placeholder:text-muted/60 transition duration-150 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:bg-ground disabled:text-muted';

export const btnCls =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export const btnGhostCls =
  'inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-ground hover:border-slate-300 active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50';

export const btnDangerCls =
  'inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-100/80 active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500';

export function Banner({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 text-xs font-medium shadow-sm transition-all animate-in fade-in-50 duration-200 ${
        error
          ? 'border-rose-300 bg-rose-100 text-rose-950'
          : 'border-emerald-300 bg-emerald-100 text-emerald-950'
      }`}
    >
      <span
        aria-hidden
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-black ${
          error ? 'bg-rose-200 text-rose-950' : 'bg-emerald-200 text-emerald-950'
        }`}
      >
        {error ? '!' : '✓'}
      </span>
      <div className="flex-1 leading-5">
        <span className="font-extrabold">{error ? 'Error: ' : 'Success: '}</span>
        {error ?? ok}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-line/60 pb-5">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-teal-300 bg-teal-100 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-[.18em] text-teal-950 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-600 animate-pulse" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-xs sm:text-sm leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </div>
  );
}

export function StatusBadge({
  status,
  label,
}: {
  status: RoomStatus | 'reserved' | 'checked_in' | 'checked_out' | 'cancelled';
  label?: string;
}) {
  const content = label ?? STATUS_LABELS[status];
  const color = STATUS_COLORS[status];
  const pulseColor = STATUS_PULSE[status];
  return (
    <span
      className={`inline-flex min-h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-black tracking-wider uppercase shadow-2xs ${color}`}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full shrink-0 ${pulseColor}`} />
      <span>{content}</span>
    </span>
  );
}

const STATUS_LABELS: Record<RoomStatus | 'reserved' | 'checked_in' | 'checked_out' | 'cancelled', string> = {
  available: 'Ready',
  occupied: 'Occupied',
  cleaning: 'Cleaning',
  maintenance: 'Maintenance',
  reserved: 'Booked',
  checked_in: 'In House',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
};

// Ultra-readable, high-contrast, accessible status colors
const STATUS_COLORS: Record<RoomStatus | 'reserved' | 'checked_in' | 'checked_out' | 'cancelled', string> = {
  available: 'border-emerald-300 bg-emerald-100 text-emerald-950 font-extrabold',
  occupied: 'border-blue-300 bg-blue-100 text-blue-950 font-extrabold',
  cleaning: 'border-amber-300 bg-amber-100 text-amber-950 font-extrabold',
  maintenance: 'border-slate-300 bg-slate-200 text-slate-900 font-extrabold',
  reserved: 'border-indigo-300 bg-indigo-100 text-indigo-950 font-extrabold',
  checked_in: 'border-teal-300 bg-teal-100 text-teal-950 font-extrabold',
  checked_out: 'border-slate-300 bg-slate-100 text-slate-800 font-extrabold',
  cancelled: 'border-rose-300 bg-rose-100 text-rose-950 font-extrabold',
};

const STATUS_PULSE: Record<RoomStatus | 'reserved' | 'checked_in' | 'checked_out' | 'cancelled', string> = {
  available: 'bg-emerald-600 shadow-[0_0_6px_rgba(5,150,105,0.8)]',
  occupied: 'bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.8)]',
  cleaning: 'bg-amber-600 shadow-[0_0_6px_rgba(217,119,6,0.8)]',
  maintenance: 'bg-slate-500',
  reserved: 'bg-indigo-600 shadow-[0_0_6px_rgba(79,70,229,0.8)]',
  checked_in: 'bg-teal-600 shadow-[0_0_6px_rgba(13,148,136,0.8)]',
  checked_out: 'bg-slate-500',
  cancelled: 'bg-rose-600 shadow-[0_0_6px_rgba(225,29,72,0.8)]',
};

export const STATUS_META: Record<RoomStatus, { label: string; bar: string; text: string }> = {
  available: { label: 'Ready', bar: 'bg-emerald-500', text: 'text-emerald-950' },
  occupied: { label: 'Occupied', bar: 'bg-blue-500', text: 'text-blue-950' },
  cleaning: { label: 'Being cleaned', bar: 'bg-amber-500', text: 'text-amber-950' },
  maintenance: { label: 'Out of service', bar: 'bg-slate-400', text: 'text-slate-800' },
};

export function RoomTile({
  number,
  type,
  status,
  floor,
  children,
}: {
  number: string;
  type: string;
  status: RoomStatus;
  floor?: number;
  children?: ReactNode;
}) {
  const meta = STATUS_META[status];
  const isOccupied = status === 'occupied';
  const isReady = status === 'available';
  const isCleaning = status === 'cleaning';

  return (
    <article className="group relative min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300">
      <div className="flex items-start gap-4">
        {/* Left vertical status pillar */}
        <span
          aria-hidden
          className={`mt-1 h-12 w-2 shrink-0 rounded-full ${meta.bar} shadow-xs transition-transform duration-200 group-hover:scale-y-110`}
        />

        <div className="min-w-0 flex-1">
          {/* Header: Room Name & Status Badge */}
          <div className="flex items-center justify-between gap-2">
            <h3
              className="font-display text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-950 truncate select-all"
              style={{ color: '#020617' }}
              title={`Room ${number}`}
            >
              Room {number}
            </h3>
            <StatusBadge status={status} />
          </div>

          {/* Subtitle: Room Type and Floor specs */}
          <p
            className="mt-1 truncate text-xs font-bold text-slate-700"
            style={{ color: '#334155' }}
            title={type}
          >
            {type} {floor !== undefined ? `· Floor ${floor}` : ''}
          </p>

          {/* Bottom Context Pill */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-bold">
            <span
              className={`inline-flex items-center gap-1.5 ${
                isReady
                  ? 'text-emerald-700'
                  : isOccupied
                  ? 'text-blue-700'
                  : isCleaning
                  ? 'text-amber-700'
                  : 'text-slate-600'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isReady
                    ? 'bg-emerald-500'
                    : isOccupied
                    ? 'bg-blue-500'
                    : isCleaning
                    ? 'bg-amber-500'
                    : 'bg-slate-400'
                }`}
              />
              {isReady
                ? 'Ready for Guest Check-In'
                : isOccupied
                ? 'Active In-House Guest'
                : isCleaning
                ? 'Housekeeping In Progress'
                : 'Out of Order / Maintenance'}
            </span>
          </div>

          {children}
        </div>
      </div>
    </article>
  );
}

export function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line/80 bg-surface p-5 shadow-sm transition-all duration-200 hover:border-slate-300">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
        {icon && (
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-ground text-slate-800">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-black tracking-tight text-ink sm:text-3xl">
        {value}
      </p>
      {detail && <p className="mt-1 text-xs font-medium text-muted">{detail}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-2xl border-2 border-dashed border-line/80 bg-surface/40 px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ground text-muted text-xl font-bold">
        🏨
      </div>
      <h3 className="mt-4 font-display text-base font-bold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-muted leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
