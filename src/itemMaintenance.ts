import type { AppState } from './types';
import { formatDate } from './utils';
import { eventsForItem, itemsForProperty, itemsForRoom, serviceHistoryEventsForItem } from './storage';
import { getNextDueForItem, isOverdue } from './eventRecurrence';

export function overdueCountForItem(state: AppState, itemId: string): number {
  const events = eventsForItem(state, itemId);
  const nextDue = getNextDueForItem(events);
  return isOverdue(nextDue) ? 1 : 0;
}

export function nextDueLabelForItem(state: AppState, itemId: string): string | null {
  const nextDue = getNextDueForItem(eventsForItem(state, itemId));
  if (!nextDue) return null;
  return formatDate(nextDue);
}

/** Last / next service dates for the item header; null if neither exists. */
export function serviceLastNextForItem(
  state: AppState,
  itemId: string
): { last: string | null; next: string | null } | null {
  const lastEvent = serviceHistoryEventsForItem(state, itemId)[0];
  const last = lastEvent ? formatDate(lastEvent.occurredAtISO) : null;
  const next = nextDueLabelForItem(state, itemId);
  if (!last && !next) return null;
  return { last, next };
}

export function overdueCountForRoom(state: AppState, roomId: string): number {
  return itemsForRoom(state, roomId).reduce(
    (sum, item) => sum + overdueCountForItem(state, item.id),
    0
  );
}

export function overdueCountForProperty(state: AppState, propertyId: string): number {
  return itemsForProperty(state, propertyId).reduce(
    (sum, item) => sum + overdueCountForItem(state, item.id),
    0
  );
}

export function isItemOverdue(state: AppState, itemId: string): boolean {
  return overdueCountForItem(state, itemId) > 0;
}
