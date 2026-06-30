import type { ItemEvent, ItemEventRecurrence, RecurrenceInterval } from './types';
import { formatCurrency, formatDate } from './utils';

const MONTHS_BY_INTERVAL: Record<Exclude<RecurrenceInterval, 'custom'>, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

export function intervalMonths(recurrence: ItemEventRecurrence): number {
  if (recurrence.interval === 'custom') {
    return Math.max(1, recurrence.intervalMonths ?? 12);
  }
  return MONTHS_BY_INTERVAL[recurrence.interval];
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export function computeNextDueFromOccurrence(
  occurredAtISO: string,
  recurrence: ItemEventRecurrence
): string {
  return addMonths(occurredAtISO, intervalMonths(recurrence));
}

export function advanceRecurrenceAfterEvent(event: ItemEvent): ItemEventRecurrence | undefined {
  if (!event.recurrence) return undefined;
  return {
    ...event.recurrence,
    nextDueAtISO: computeNextDueFromOccurrence(event.occurredAtISO, event.recurrence),
  };
}

export function getNextDueForItem(events: ItemEvent[]): string | null {
  const withDue = events
    .map((e) => e.recurrence?.nextDueAtISO)
    .filter((d): d is string => Boolean(d));
  if (withDue.length === 0) return null;
  withDue.sort();
  return withDue[0] ?? null;
}

export function isOverdue(nextDueAtISO: string | null | undefined): boolean {
  if (!nextDueAtISO) return false;
  const due = new Date(nextDueAtISO);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export function recurrenceLabel(recurrence: ItemEventRecurrence): string {
  switch (recurrence.interval) {
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'annual':
      return 'Annual';
    case 'custom':
      return `Every ${intervalMonths(recurrence)} mo.`;
    default:
      return 'Recurring';
  }
}

export const EVENT_TYPE_LABELS: Record<ItemEvent['eventType'], string> = {
  maintenance: 'Maintenance',
  inspection: 'Inspection',
  repair: 'Repair',
  replacement: 'Replacement',
  other: 'Other',
};

/** One-line summary for list views (title, date, optional cost). */
export function formatServiceEventSummary(event: ItemEvent): string {
  const parts = [event.title, formatDate(event.occurredAtISO)];
  if (event.cost != null) {
    parts.push(formatCurrency(event.cost));
  }
  return parts.join(' · ');
}
