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

/**
 * Formats an ISO date or timestamp string into a deterministic "DD Mon YYYY" format
 * (e.g. "22 May 2027") using UTC.
 * 
 * Crucial for React 19 SSR: Prevents hydration mismatch errors between server
 * (which may run under en-GB/system locale) and client browsers (which run under user locale).
 */
export function formatDeterministicDate(isoDateStr?: string | null): string {
  if (!isoDateStr) return '';
  const d = new Date(isoDateStr);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}
