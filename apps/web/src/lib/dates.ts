export type DateInput = Date | string | number | null | undefined;

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Safely parses any date string, ISO timestamp, epoch, or Date object into a valid Date in UTC.
 * Specifically handles 'YYYY-MM-DD' without timezone bias.
 */
export function toDate(input?: DateInput): Date | null {
  if (input === null || input === undefined || input === '') return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    }
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats an ISO date or timestamp into a deterministic "DD Mon YYYY" format
 * (e.g. "22 May 2027") using UTC.
 * 
 * Crucial for React 19 SSR: Prevents hydration mismatch errors between server
 * (which may run under en-GB/system locale) and client browsers (which run under user locale).
 */
export function formatDeterministicDate(val?: DateInput): string {
  const d = toDate(val);
  if (!d) return '';
  const day = pad(d.getUTCDate());
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Formats an ISO date into "DD Mon" format (e.g. "22 May").
 */
export function formatDeterministicShortDate(val?: DateInput): string {
  const d = toDate(val);
  if (!d) return '';
  const day = pad(d.getUTCDate());
  const month = MONTHS[d.getUTCMonth()];
  return `${day} ${month}`;
}

/**
 * Formats an ISO date into "Mon YYYY" format (e.g. "Nov 2026").
 */
export function formatDeterministicMonthYear(val?: DateInput): string {
  const d = toDate(val);
  if (!d) return '';
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${month} ${year}`;
}

/**
 * Formats an ISO date/time into a deterministic "DD Mon YYYY, hh:mm AM/PM" format
 * (e.g. "22 May 2027, 02:30 PM") using UTC.
 */
export function formatDeterministicDateTime(
  val?: DateInput,
  includeSeconds = false,
): string {
  const d = toDate(val);
  if (!d) return '';
  const datePart = formatDeterministicDate(d);
  let hours = d.getUTCHours();
  const minutes = pad(d.getUTCMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const formattedHours = pad(hours);
  const seconds = includeSeconds ? `:${pad(d.getUTCSeconds())}` : '';
  return `${datePart}, ${formattedHours}:${minutes}${seconds} ${ampm}`;
}

/**
 * Formats an ISO date/time into a deterministic "hh:mm AM/PM" format
 * (e.g. "02:30 PM") using UTC.
 */
export function formatDeterministicTime(
  val?: DateInput,
  includeSeconds = false,
): string {
  const d = toDate(val);
  if (!d) return '';
  let hours = d.getUTCHours();
  const minutes = pad(d.getUTCMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const seconds = includeSeconds ? `:${pad(d.getUTCSeconds())}` : '';
  return `${pad(hours)}:${minutes}${seconds} ${ampm}`;
}

/**
 * Formats weekday short name (e.g. "Tue", "Wed").
 */
export function formatDeterministicWeekdayShort(val?: DateInput): string {
  const d = toDate(val);
  if (!d) return '';
  return DAYS[d.getUTCDay()];
}

/**
 * Formats date with weekday (e.g. "Tue, 24 Nov" or "Tue, 24 Nov 2026").
 */
export function formatDeterministicDateWithWeekday(
  val?: DateInput,
  includeYear = false,
): string {
  const d = toDate(val);
  if (!d) return '';
  const day = DAYS[d.getUTCDay()];
  const date = pad(d.getUTCDate());
  const month = MONTHS[d.getUTCMonth()];
  if (includeYear) {
    return `${day}, ${date} ${month} ${d.getUTCFullYear()}`;
  }
  return `${day}, ${date} ${month}`;
}

/**
 * Formats stay check-in to check-out dates (e.g. "24 Nov → 26 Nov 2026").
 */
export function formatDeterministicStayDates(
  checkIn?: DateInput,
  checkOut?: DateInput,
): string {
  if (!checkIn || !checkOut) return '—';
  const inStr = formatDeterministicShortDate(checkIn);
  const outStr = formatDeterministicDate(checkOut);
  if (!inStr || !outStr) return '—';
  return `${inStr} → ${outStr}`;
}
