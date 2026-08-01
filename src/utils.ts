export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** Section heading: append (N) when collapsed with items. */
export function collapsedSectionLabel(
  title: string,
  expanded: boolean,
  count: number
): string {
  if (expanded || count <= 0) return title;
  return `${title} (${count})`;
}

type DatePart = 'month' | 'day' | 'year';
type DatePartOrder = [DatePart, DatePart, DatePart];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function normalizeStoredDate(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return `${iso}T12:00:00.000Z`;
  return iso;
}

/** Locale month/day/year order and separator from the device. */
export function getLocaleDatePattern(): { order: DatePartOrder; separator: string } {
  const parts = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).formatToParts(new Date(Date.UTC(2023, 10, 22))); // Nov 22 — unambiguous

  const order: DatePart[] = [];
  let separator = '/';
  for (const part of parts) {
    if (part.type === 'literal' && part.value.trim()) {
      separator = part.value.trim()[0] ?? separator;
    } else if (part.type === 'month' || part.type === 'day' || part.type === 'year') {
      order.push(part.type);
    }
  }
  if (order.length !== 3) {
    return { order: ['month', 'day', 'year'], separator: '/' };
  }
  return { order: order as DatePartOrder, separator };
}

/** Example placeholder matching the device locale (e.g. MM/DD/YYYY or DD/MM/YYYY). */
export function dateInputPlaceholder(): string {
  const { order, separator } = getLocaleDatePattern();
  const token: Record<DatePart, string> = { month: 'MM', day: 'DD', year: 'YYYY' };
  return order.map((part) => token[part]).join(separator);
}

/** Label with locale date format hint, e.g. "Install date (DD/MM/YYYY)". */
export function dateFieldLabel(base: string): string {
  return `${base} (${dateInputPlaceholder()})`;
}

function ymdFromParts(year: number, month: number, day: number): string | undefined {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
  if (year < 1000 || year > 9999) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return undefined;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function ymdFromOrderedValues(values: [number, number, number], order: DatePartOrder): string | undefined {
  const parts: Record<DatePart, number> = { month: 0, day: 0, year: 0 };
  order.forEach((part, index) => {
    parts[part] = values[index];
  });
  return ymdFromParts(parts.year, parts.month, parts.day);
}

/** Display a stored ISO or YYYY-MM-DD date in the device locale. */
export function formatDate(iso: string): string {
  const d = new Date(normalizeStoredDate(iso));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  });
}

/** Weekday name for a stored ISO or YYYY-MM-DD date (UTC calendar day). */
export function formatWeekday(iso: string): string {
  const d = new Date(normalizeStoredDate(iso));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { weekday: 'long', timeZone: 'UTC' });
}

/**
 * Signed whole calendar days from local today to the stored date.
 * Negative = past, 0 = today, positive = future. Null if invalid.
 */
function daysFromTodayForDisplay(iso: string, now: Date = new Date()): number | null {
  const d = new Date(normalizeStoredDate(iso));
  if (Number.isNaN(d.getTime())) return null;
  const dueUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((dueUtc - todayUtc) / (24 * 60 * 60 * 1000));
}

function formatRelativeUnit(count: number, singular: string, plural: string, past: boolean): string {
  const label = count === 1 ? singular : plural;
  return past ? `(${count} ${label} ago)` : `(${count} ${label})`;
}

function formatRelativeDays(days: number): string {
  if (days === 0) return '(today)';
  const past = days < 0;
  const abs = Math.abs(days);
  if (abs > 365) {
    const yearsLabel = (abs / 365).toFixed(1);
    const unit = Number(yearsLabel) === 1 ? 'year' : 'years';
    return past ? `(${yearsLabel} ${unit} ago)` : `(${yearsLabel} ${unit})`;
  }
  if (abs > 30) {
    return formatRelativeUnit(Math.floor(abs / 30), 'month', 'months', past);
  }
  return formatRelativeUnit(abs, 'day', 'days', past);
}

/**
 * User-facing date: locale date, weekday, and relative span
 * e.g. "09/01/2026 Tuesday (10 days)" or "07/20/2026 Monday (5 days ago)".
 */
export function formatDisplayDate(iso: string, now: Date = new Date()): string {
  const { date, rest } = formatDisplayDateParts(iso, now);
  return rest ? `${date} ${rest}` : date;
}

/** Calendar date vs weekday/relative parts (for split styling). */
export function formatDisplayDateParts(
  iso: string,
  now: Date = new Date()
): { date: string; rest: string } {
  return {
    date: formatDate(iso),
    rest: formatWeekdayWithRelative(iso, now),
  };
}

/** Weekday + relative days only (when the numeric date is already shown).
 * Weekday is omitted when the relative span is months or years (> 30 days). */
export function formatWeekdayWithRelative(iso: string, now: Date = new Date()): string {
  const days = daysFromTodayForDisplay(iso, now);
  const relative = days == null ? '' : formatRelativeDays(days);
  const showWeekday = days == null || Math.abs(days) <= 30;
  const weekday = showWeekday ? formatWeekday(iso) : '';
  if (weekday && relative) return `${weekday} ${relative}`;
  return weekday || relative;
}

/** Format a stored date for text input fields using the device locale. */
export function dateInputValue(stored?: string): string {
  if (!stored?.trim()) return '';
  return formatDate(stored);
}

/**
 * Parse a typed date (locale order, or ISO YYYY-MM-DD) to YYYY-MM-DD for storage.
 * Uses the device locale when the value is unambiguous for that locale; otherwise
 * tries common alternate orders.
 */
export function parseDateInputValue(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const match = /^(\d{1,4})[/.\-](\d{1,2})[/.\-](\d{1,4})$/.exec(trimmed);
  if (!match) return undefined;

  const a = Number(match[1]);
  const b = Number(match[2]);
  const c = Number(match[3]);
  const values: [number, number, number] = [a, b, c];
  const { order } = getLocaleDatePattern();

  // Clear year-first numeric forms: 2026/01/22
  if (match[1].length === 4 || a > 31) {
    return ymdFromParts(a, b, c);
  }

  const localeParsed = ymdFromOrderedValues(values, order);
  if (localeParsed) return localeParsed;

  const alternatives: DatePartOrder[] = [
    ['month', 'day', 'year'],
    ['day', 'month', 'year'],
    ['year', 'month', 'day'],
  ];
  for (const alt of alternatives) {
    if (alt[0] === order[0] && alt[1] === order[1] && alt[2] === order[2]) continue;
    const parsed = ymdFromOrderedValues(values, alt);
    if (parsed) return parsed;
  }
  return undefined;
}

/** Parse date input to noon UTC ISO for event and detail timestamps. */
export function parseDateInputToISO(input: string): string | undefined {
  const ymd = parseDateInputValue(input);
  if (!ymd) return undefined;
  return `${ymd}T12:00:00.000Z`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Format a free-text amount for display as $#,### (no decimals). */
export function formatCurrencyDisplay(input?: string | null): string {
  const raw = input?.trim() ?? '';
  if (!raw) return '';
  const cleaned = raw.replace(/[^0-9.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') return raw;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return raw;
  return formatCurrency(n);
}

/**
 * Format a phone number as (XXX) XXX-XXXX.
 * Leading US country code 1 is kept as "1 (...)" when 11 digits are present.
 * Incomplete numbers are formatted as far as digits allow.
 */
export function formatPhoneNumber(input?: string | null): string {
  const raw = input?.trim() ?? '';
  if (!raw) return '';

  let digits = raw.replace(/\D/g, '');
  let prefix = '';
  if (digits.length === 11 && digits.startsWith('1')) {
    prefix = '1 ';
    digits = digits.slice(1);
  } else if (digits.length > 10 && digits.startsWith('1')) {
    prefix = '1 ';
    digits = digits.slice(1, 11);
  } else if (digits.length > 10) {
    digits = digits.slice(0, 10);
  }

  if (digits.length === 0) return '';
  if (digits.length < 4) return `${prefix}(${digits}`;
  if (digits.length < 7) return `${prefix}(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `${prefix}(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}
