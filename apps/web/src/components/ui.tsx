import type { ReactNode } from 'react';
import type { RoomStatus } from '@erp/shared';

export const inputCls =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-lagoon';
export const btnCls =
  'inline-flex items-center justify-center rounded-md bg-lagoon px-4 py-2 text-sm font-medium text-white hover:bg-lagoon-dark disabled:opacity-50';
export const btnGhostCls =
  'inline-flex items-center justify-center rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-ground';

export function Banner({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`mb-6 rounded-md border px-4 py-3 text-sm ${error ? 'border-danger/30 bg-danger/5 text-danger' : 'border-lagoon/30 bg-lagoon-tint text-lagoon-dark'}`}
    >
      {error ?? ok}
    </p>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}

export const STATUS_META: Record<RoomStatus, { label: string; bar: string; text: string }> = {
  available: { label: 'Ready', bar: 'border-status-ready', text: 'text-status-ready' },
  occupied: { label: 'Occupied', bar: 'border-status-occupied', text: 'text-status-occupied' },
  cleaning: { label: 'Being cleaned', bar: 'border-status-cleaning', text: 'text-status-cleaning' },
  maintenance: { label: 'Out of service', bar: 'border-status-out', text: 'text-status-out' },
};

/** A room as a key tag: the number is the thing staff scan for, the left edge carries the status. */
export function RoomTile({ number, type, status, children }: { number: string; type: string; status: RoomStatus; children?: ReactNode }) {
  const meta = STATUS_META[status];
  return (
    <div className={`relative rounded-md border border-line border-l-[6px] ${meta.bar} bg-surface p-3 pr-4`}>
      <span aria-hidden className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full border-2 border-line" />
      <p className="font-display text-2xl font-bold leading-none">{number}</p>
      <p className="mt-1 text-xs text-muted">{type}</p>
      <p className={`mt-3 text-sm font-medium ${meta.text}`}>{meta.label}</p>
      {children}
    </div>
  );
}
