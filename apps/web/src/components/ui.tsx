import type { ReactNode } from 'react';
import type { RoomStatus } from '@erp/shared';

export const inputCls =
  'min-h-10 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm placeholder:text-muted/70 transition focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/15 disabled:cursor-not-allowed disabled:bg-ground disabled:text-muted';
export const btnCls =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
export const btnGhostCls =
  'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-sm transition hover:bg-ground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
export const btnDangerCls =
  'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-danger/20 bg-surface px-3 py-1.5 text-sm font-semibold text-danger shadow-sm transition hover:bg-danger/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger';

export function Banner({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
        error
          ? 'border-danger/20 bg-danger/5 text-danger'
          : 'border-status-ready/20 bg-status-ready/5 text-status-ready'
      }`}
    >
      <span aria-hidden className="mt-0.5 font-bold">{error ? '!' : '✓'}</span>
      <span>{error ?? ok}</span>
    </p>
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-7">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-lagoon-dark">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-5 text-muted">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
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
  return (
    <span className={`inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${color}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {content}
    </span>
  );
}

const STATUS_LABELS: Record<RoomStatus | 'reserved' | 'checked_in' | 'checked_out' | 'cancelled', string> = {
  available: 'Ready', occupied: 'Occupied', cleaning: 'Cleaning', maintenance: 'Maintenance',
  reserved: 'Booked', checked_in: 'In house', checked_out: 'Checked out', cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<RoomStatus | 'reserved' | 'checked_in' | 'checked_out' | 'cancelled', string> = {
  available: 'bg-status-ready/10 text-status-ready',
  occupied: 'bg-status-occupied/10 text-status-occupied',
  cleaning: 'bg-status-cleaning/10 text-status-cleaning',
  maintenance: 'bg-status-out/10 text-status-out',
  reserved: 'bg-status-occupied/10 text-status-occupied',
  checked_in: 'bg-status-ready/10 text-status-ready',
  checked_out: 'bg-status-out/10 text-status-out',
  cancelled: 'bg-danger/10 text-danger',
};

export const STATUS_META: Record<RoomStatus, { label: string; bar: string; text: string }> = {
  available: { label: 'Ready', bar: 'bg-status-ready', text: 'text-status-ready' },
  occupied: { label: 'Occupied', bar: 'bg-status-occupied', text: 'text-status-occupied' },
  cleaning: { label: 'Being cleaned', bar: 'bg-status-cleaning', text: 'text-status-cleaning' },
  maintenance: { label: 'Out of service', bar: 'bg-status-out', text: 'text-status-out' },
};

export function RoomTile({
  number,
  type,
  status,
  children,
}: {
  number: string;
  type: string;
  status: RoomStatus;
  children?: ReactNode;
}) {
  const meta = STATUS_META[status];
  return (
    <article className="min-w-0 rounded-xl border border-line bg-surface shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3 p-3.5">
        <span aria-hidden className={`mt-1 h-8 w-1 shrink-0 rounded-full ${meta.bar}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-display text-xl font-bold leading-6 text-ink">{number}</p>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 truncate text-xs text-muted" title={type}>{type}</p>
        </div>
      </div>
      {children && <div className="border-t border-line px-3.5 py-3">{children}</div>}
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
  value: string | number;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted sm:text-sm">{label}</p>
        {icon && <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ground text-muted">{icon}</span>}
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted">{detail}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface/70 px-5 py-10 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
