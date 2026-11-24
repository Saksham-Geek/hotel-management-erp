import {
  formatDeterministicDate,
  formatDeterministicDateTime,
  formatDeterministicStayDates,
} from './dates';

/**
 * Shared Client-Safe Human-Readable Formatting Utilities
 * Eliminates technical ISO strings (e.g. 2026-10-31T18:30:00.000Z)
 * and formats clean, legible dates, times, and currency amounts.
 */

export function formatDate(val: string | Date | null | undefined): string {
  if (!val) return '—';
  return formatDeterministicDate(val) || '—';
}

export function formatDateTime(val: string | Date | null | undefined): string {
  if (!val) return '—';
  return formatDeterministicDateTime(val) || '—';
}

export function formatStayDates(checkIn: string, checkOut: string): string {
  if (!checkIn || !checkOut) return '—';
  return formatDeterministicStayDates(checkIn, checkOut);
}

export function formatMoney(amount: number | null | undefined, currency = 'INR'): string {
  const safe = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0,
  }).format(safe);
}
