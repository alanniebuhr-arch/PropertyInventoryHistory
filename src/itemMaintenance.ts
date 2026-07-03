import type { AppState } from './types';
import { formatDate } from './utils';
import { eventsForItem, itemsForProperty, itemsForRoom } from './storage';
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
