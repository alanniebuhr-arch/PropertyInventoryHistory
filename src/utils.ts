export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

function formatDateParts(d: Date): string {
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${month}/${day}/${year}`;
}

/** Display a stored ISO or YYYY-MM-DD date as MM/DD/YYYY. */
export function formatDate(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return formatDate(`${iso}T12:00:00.000Z`);
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatDateParts(d);
}

/** Format a stored date for text input fields as MM/DD/YYYY. */
export function dateInputValue(stored?: string): string {
  if (!stored?.trim()) return '';
  return formatDate(stored);
}

/** Parse MM/DD/YYYY or YYYY-MM-DD input to YYYY-MM-DD for storage. */
export function parseDateInputValue(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (mdy) {
    const month = Number(mdy[1]);
    const day = Number(mdy[2]);
    const year = Number(mdy[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymd) return trimmed;

  return undefined;
}

/** Parse date input to noon UTC ISO for event and detail timestamps. */
export function parseDateInputToISO(input: string): string | undefined {
  const ymd = parseDateInputValue(input);
  if (!ymd) return undefined;
  return `${ymd}T12:00:00.000Z`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount);
}
