import type { ReactNode } from 'react';
import type { RoomStatus } from '@erp/shared';
import { getRoomTypeTheme } from '@/lib/room-types';

export const inputCls =
  'min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141417] px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white shadow-2xs placeholder:text-slate-400 transition duration-150 focus-visible:border-slate-900 dark:focus-visible:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:focus-visible:ring-white focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

export const selectCls =
  'min-h-[44px] w-full appearance-none cursor-pointer rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141417] px-3.5 pr-10 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-2xs hover:border-slate-300 dark:hover:border-white/20 focus-visible:border-slate-900 dark:focus-visible:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:focus-visible:ring-white focus-visible:ring-offset-1 transition duration-150 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

export const btnCls =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold shadow-xs hover:opacity-90 active:scale-[0.99] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export const btnGhostCls =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 active:scale-[0.99] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50';

export const btnDangerCls =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5 text-sm font-semibold text-rose-700 dark:text-rose-300 shadow-2xs hover:bg-rose-100 dark:hover:bg-rose-950/50 active:scale-[0.99] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500';

export { Banner, type BannerProps } from './banner';

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
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-slate-200/80 dark:border-white/10 pb-6">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-500 dark:text-slate-400 font-normal">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
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
      className={`inline-flex min-h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${color}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full shrink-0 ${pulseColor}`} />
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

// Refined, accessible, modern luxury status colors
const STATUS_COLORS: Record<RoomStatus | 'reserved' | 'checked_in' | 'checked_out' | 'cancelled', string> = {
  available: 'border-emerald-200/80 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200',
  occupied: 'border-blue-200/80 bg-blue-50/80 text-blue-900 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-200',
  cleaning: 'border-amber-200/80 bg-amber-50/80 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200',
  maintenance: 'border-slate-200/80 bg-slate-100/80 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  reserved: 'border-indigo-200/80 bg-indigo-50/80 text-indigo-900 dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-200',
  checked_in: 'border-blue-200/80 bg-blue-50/80 text-blue-900 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-200',
  checked_out: 'border-slate-200/80 bg-slate-100/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  cancelled: 'border-rose-200/80 bg-rose-50/80 text-rose-900 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200',
};

const STATUS_PULSE: Record<RoomStatus | 'reserved' | 'checked_in' | 'checked_out' | 'cancelled', string> = {
  available: 'bg-emerald-500',
  occupied: 'bg-blue-500',
  cleaning: 'bg-amber-500',
  maintenance: 'bg-slate-400',
  reserved: 'bg-indigo-500',
  checked_in: 'bg-blue-500',
  checked_out: 'bg-slate-400',
  cancelled: 'bg-rose-500',
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
  const roomTheme = getRoomTypeTheme(type);

  return (
    <article className={`group relative min-w-0 rounded-2xl border border-slate-200/90 ${roomTheme.lightBg} p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300`}>
      {/* Bundled Notes Signature Horizontal Accent Dash */}
      <span
        aria-hidden
        className={`mb-3 h-1.5 w-6 rounded-full ${roomTheme.dash} block shadow-2xs`}
      />

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
              className="font-display text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-950 dark:text-white truncate select-all"
              title={`Room ${number}`}
            >
              Room {number}
            </h3>
            <StatusBadge status={status} />
          </div>

          {/* Subtitle: Bundled Notes Material 3 Room Type Pill & Floor */}
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${roomTheme.badge}`}>
              <span>{roomTheme.icon}</span>
              <span className="truncate">{type}</span>
            </span>
            {floor !== undefined && (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                · Floor {floor}
              </span>
            )}
          </div>

          {/* Bottom Context Pill */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 dark:border-white/10 pt-3 text-xs font-bold">
            <span
              className={`inline-flex items-center gap-1.5 ${
                isReady
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : isOccupied
                  ? 'text-blue-700 dark:text-blue-400'
                  : isCleaning
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-600 dark:text-slate-400'
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
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/90 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md min-w-0">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <p className="text-xs sm:text-[13px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 truncate">
          {label}
        </p>
        {icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 font-display text-2xl sm:text-3xl lg:text-3xl 2xl:text-4xl font-black tracking-tight text-slate-950 dark:text-white tabular-nums break-words min-w-0 truncate">
        {value}
      </div>
      {detail && <p className="mt-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 truncate">{detail}</p>}
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

export { CustomDropdown, type DropdownOption, type CustomDropdownProps } from './dropdown';
export { CustomDatePicker, type CustomDatePickerProps } from './date-picker';
