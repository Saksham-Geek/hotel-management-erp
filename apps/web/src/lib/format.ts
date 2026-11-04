/**
 * Shared Client-Safe Human-Readable Formatting Utilities
 * Eliminates technical ISO strings (e.g. 2026-10-31T18:30:00.000Z)
 * and formats clean, legible dates, times, and currency amounts.
 */

export function formatDate(val: string | Date | null | undefined): string {
  if (!val) return '—';
  try {
    const d = typeof val === 'string' ? new Date(val) : val;
    if (isNaN(d.getTime())) return String(val).slice(0, 10);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(val).slice(0, 10);
  }
}

export function formatDateTime(val: string | Date | null | undefined): string {
  if (!val) return '—';
  try {
    const d = typeof val === 'string' ? new Date(val) : val;
    if (isNaN(d.getTime())) return String(val);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return String(val);
  }
}

export function formatStayDates(checkIn: string, checkOut: string): string {
  if (!checkIn || !checkOut) return '—';
  try {
    const dIn = new Date(checkIn);
    const dOut = new Date(checkOut);
    if (isNaN(dIn.getTime()) || isNaN(dOut.getTime())) {
      return `${checkIn.slice(0, 10)} → ${checkOut.slice(0, 10)}`;
    }
    const inStr = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(dIn);
    const outStr = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(dOut);
    return `${inStr} → ${outStr}`;
  } catch {
    return `${checkIn.slice(0, 10)} → ${checkOut.slice(0, 10)}`;
  }
}

export function formatMoney(amount: number | null | undefined, currency = 'INR'): string {
  const safe = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0,
  }).format(safe);
}
