import type { AppState, ItemEvent, ItemEventRecurrence, RecurrenceInterval } from './types';
import { formatCurrency, formatDate } from './utils';

const MONTHS_BY_INTERVAL: Record<
  Exclude<RecurrenceInterval, 'custom' | 'once'>,
  number
> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
  every_2_years: 24,
  every_3_years: 36,
};

export function intervalMonths(recurrence: ItemEventRecurrence): number {
  if (recurrence.interval === 'once') return 0;
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
  if (recurrence.interval === 'once') {
    return recurrence.nextDueAtISO ?? occurredAtISO;
  }
  return addMonths(occurredAtISO, intervalMonths(recurrence));
}

export function advanceRecurrenceAfterEvent(event: ItemEvent): ItemEventRecurrence | undefined {
  if (!event.recurrence) return undefined;
  if (event.recurrence.interval === 'once') {
    return event.recurrence;
  }
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

/** Events that still have a scheduled next due, or a service date today/future, earliest first. */
export function upcomingServiceEvents(events: ItemEvent[]): ItemEvent[] {
  return events
    .filter((e) => Boolean(upcomingDueAtISO(e)))
    .slice()
    .sort((a, b) => upcomingDueAtISO(a)!.localeCompare(upcomingDueAtISO(b)!));
}

/** Upcoming scheduled events across all items in a room, earliest first. */
export function upcomingServiceEventsForRoom(state: AppState, roomId: string): ItemEvent[] {
  const itemIds = new Set(
    state.items.filter((item) => item.roomId === roomId).map((item) => item.id)
  );
  return upcomingServiceEvents(state.events.filter((event) => itemIds.has(event.itemId)));
}

/** Upcoming scheduled events across all properties, earliest first. */
export function upcomingServiceEventsForApp(state: AppState): ItemEvent[] {
  return upcomingServiceEvents(state.events);
}

/** Upcoming scheduled events across all items in a property, earliest first. */
export function upcomingServiceEventsForProperty(
  state: AppState,
  propertyId: string
): ItemEvent[] {
  const roomIds = new Set(
    state.rooms.filter((room) => room.propertyId === propertyId).map((room) => room.id)
  );
  const itemIds = new Set(
    state.items.filter((item) => roomIds.has(item.roomId)).map((item) => item.id)
  );
  return upcomingServiceEvents(state.events.filter((event) => itemIds.has(event.itemId)));
}

export type UpcomingHorizon = '1m' | '3m' | '6m' | '1y' | 'all';

export const UPCOMING_HORIZON_OPTIONS: { id: UpcomingHorizon; label: string }[] = [
  { id: '1m', label: '1 month' },
  { id: '3m', label: '3 months' },
  { id: '6m', label: '6 months' },
  { id: '1y', label: '1 Year' },
  { id: 'all', label: 'All time' },
];

export function upcomingHorizonLabel(horizon: UpcomingHorizon): string {
  return UPCOMING_HORIZON_OPTIONS.find((opt) => opt.id === horizon)?.label ?? 'All time';
}

/** Keep dues on/before the horizon cutoff from today (overdue always included). */
export function filterUpcomingByHorizon(
  events: ItemEvent[],
  horizon: UpcomingHorizon,
  now: Date = new Date()
): ItemEvent[] {
  if (horizon === 'all') return events;

  const months =
    horizon === '1m' ? 1 : horizon === '3m' ? 3 : horizon === '6m' ? 6 : 12;
  const cutoff = new Date(now.getFullYear(), now.getMonth() + months, now.getDate());
  const cutoffKey = calendarKey({
    year: cutoff.getFullYear(),
    month: cutoff.getMonth() + 1,
    day: cutoff.getDate(),
  });

  return events.filter((event) => {
    const dueAt = upcomingDueAtISO(event);
    const due = calendarYmdFromISO(dueAt);
    if (!due) return false;
    return calendarKey(due) <= cutoffKey;
  });
}

/** Count of scheduled service events overdue or due within the given horizon. */
export function upcomingServiceCountForProperty(
  state: AppState,
  propertyId: string,
  horizon: UpcomingHorizon = '1m'
): number {
  return filterUpcomingByHorizon(
    upcomingServiceEventsForProperty(state, propertyId),
    horizon
  ).length;
}

/** Count of scheduled service events for a room overdue or due within the given horizon. */
export function upcomingServiceCountForRoom(
  state: AppState,
  roomId: string,
  horizon: UpcomingHorizon = '1m'
): number {
  return filterUpcomingByHorizon(upcomingServiceEventsForRoom(state, roomId), horizon).length;
}

/** Upcoming (not yet overdue) service events for a room within the horizon. */
export function upcomingNotOverdueCountForRoom(
  state: AppState,
  roomId: string,
  horizon: UpcomingHorizon = '1m'
): number {
  return filterUpcomingByHorizon(upcomingServiceEventsForRoom(state, roomId), horizon).filter(
    (event) => !isOverdue(upcomingDueAtISO(event))
  ).length;
}

/** Clear the reminder on a source event after it was logged as a new history entry. */
export function clearEventNextDue(event: ItemEvent): ItemEvent {
  if (!event.recurrence?.nextDueAtISO) return event;
  if (event.recurrence.interval === 'once') {
    return { ...event, recurrence: undefined };
  }
  return {
    ...event,
    recurrence: {
      ...event.recurrence,
      nextDueAtISO: undefined,
    },
  };
}

/**
 * Future-dated service logs must keep a nextDue so they stay on Schedule after
 * the service date ages past today (until the user marks them completed).
 * Does not overwrite an explicit next due from “Schedule next service”.
 */
export function ensureFutureDatedEventScheduled(
  occurredAtISO: string,
  recurrence: ItemEventRecurrence | undefined,
  scheduleNotes?: string
): ItemEventRecurrence | undefined {
  if (recurrence?.nextDueAtISO) return recurrence;
  if (!isAfterToday(occurredAtISO)) return recurrence;
  return {
    interval: 'once',
    nextDueAtISO: occurredAtISO,
    notes: scheduleNotes?.trim() || recurrence?.notes,
  };
}

function calendarDayKey(iso: string | null | undefined): number | null {
  const due = calendarYmdFromISO(iso);
  return due ? calendarKey(due) : null;
}

/** True when two ISO timestamps fall on the same calendar day. */
export function sameCalendarDay(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = calendarDayKey(a);
  const kb = calendarDayKey(b);
  return ka != null && kb != null && ka === kb;
}

export function isOverdue(nextDueAtISO: string | null | undefined): boolean {
  return daysOverdue(nextDueAtISO) > 0;
}

/** Whole days past due (0 if not overdue or invalid). */
export function daysOverdue(nextDueAtISO: string | null | undefined, now: Date = new Date()): number {
  const due = calendarYmdFromISO(nextDueAtISO);
  if (!due) return 0;
  const today = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
  const dueUtc = Date.UTC(due.year, due.month - 1, due.day);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  const days = Math.round((dueUtc - todayUtc) / (24 * 60 * 60 * 1000));
  return days < 0 ? -days : 0;
}

/** Calendar Y-M-D from stored ISO (app dates use UTC noon / YYYY-MM-DD). */
export function calendarYmdFromISO(
  iso: string | null | undefined
): { year: number; month: number; day: number } | null {
  if (!iso) return null;
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (ymd) {
    return { year: Number(ymd[1]), month: Number(ymd[2]), day: Number(ymd[3]) };
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function calendarKey(parts: { year: number; month: number; day: number }): number {
  return parts.year * 10000 + parts.month * 100 + parts.day;
}

/** True when the stored calendar date is strictly after local today. */
export function isAfterToday(
  iso: string | null | undefined,
  now: Date = new Date()
): boolean {
  const due = calendarYmdFromISO(iso);
  if (!due) return false;
  const today = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
  return calendarKey(due) > calendarKey(today);
}

/** True when the stored calendar date is today or later (vs local today). */
export function isOnOrAfterToday(
  iso: string | null | undefined,
  now: Date = new Date()
): boolean {
  const due = calendarYmdFromISO(iso);
  if (!due) return false;
  const today = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
  return calendarKey(due) >= calendarKey(today);
}

/**
 * Date used for upcoming lists: the earliest of scheduled next due and a
 * future service date (planned visit). A service dated today is treated as
 * completed history and does not keep the event in upcoming by itself.
 */
export function upcomingDueAtISO(event: ItemEvent): string | undefined {
  const candidates: string[] = [];
  if (event.recurrence?.nextDueAtISO) {
    candidates.push(event.recurrence.nextDueAtISO);
  }
  if (isAfterToday(event.occurredAtISO)) {
    candidates.push(event.occurredAtISO);
  }
  if (candidates.length === 0) return undefined;
  candidates.sort();
  return candidates[0];
}

export type UpcomingUrgency = 'overdue' | 'week' | 'month' | 'none';

/** Most urgent band for due proximity (date-only, calendar days from today). */
export function upcomingUrgency(
  nextDueAtISO: string | null | undefined,
  now: Date = new Date()
): UpcomingUrgency {
  const due = calendarYmdFromISO(nextDueAtISO);
  if (!due) return 'none';
  const today = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
  const dueUtc = Date.UTC(due.year, due.month - 1, due.day);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  const days = Math.round((dueUtc - todayUtc) / (24 * 60 * 60 * 1000));
  if (days < 0) return 'overdue';
  if (days <= 7) return 'week';
  if (days <= 30) return 'month';
  return 'none';
}

export function recurrenceIntervalLabel(interval: RecurrenceInterval, customMonths?: number): string {
  switch (interval) {
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'annual':
      return 'Annual';
    case 'every_2_years':
      return 'Every 2 years';
    case 'every_3_years':
      return 'Every 3 years';
    case 'custom':
      return `Every ${Math.max(1, customMonths ?? 12)} mo.`;
    case 'once':
      return 'One-time';
    default:
      return 'Recurring';
  }
}

export function recurrenceLabel(recurrence: ItemEventRecurrence): string {
  const intervalLabel = recurrenceIntervalLabel(
    recurrence.interval,
    recurrence.intervalMonths
  );
  if (recurrence.nextDueAtISO) {
    return `${intervalLabel} · due ${formatDate(recurrence.nextDueAtISO)}`;
  }
  return intervalLabel;
}

export const EVENT_TYPE_LABELS: Record<ItemEvent['eventType'], string> = {
  maintenance: 'Maintenance',
  inspection: 'Inspection',
  repair: 'Repair',
  replacement: 'Replacement',
  improvement: 'Improvement',
  fuel_delivery: 'Fuel delivery',
  other: 'Other',
};

/** One-line summary for list views (title, date, optional cost, optional notes). */
export function formatServiceEventSummary(event: ItemEvent): string {
  const parts = [event.title, formatDate(event.occurredAtISO)];
  if (event.cost != null) {
    parts.push(formatCurrency(event.cost));
  }
  const notes = event.notes?.trim();
  if (notes) {
    parts.push(notes);
  }
  return parts.join(' · ');
}
