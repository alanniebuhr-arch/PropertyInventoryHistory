import type { AppState, InventoryItem } from './types';
import { formatDisplayDate } from './utils';
import { eventsForItem, itemsForProperty, itemsForRoom, serviceHistoryEventsForItem } from './storage';
import { getNextDueForItem, isOverdue, overdueTodoCountForProperty } from './eventRecurrence';

/** Install or purchase date from item details, when that type stores one. */
export function itemInstallOrPurchaseDateISO(item: InventoryItem): string | undefined {
  const details = item.details as {
    installDateAtISO?: string;
    purchaseDateAtISO?: string;
  };
  const install = details.installDateAtISO?.trim();
  if (install) return install;
  const purchase = details.purchaseDateAtISO?.trim();
  if (purchase) return purchase;
  return undefined;
}

/** Next service due, else install/purchase — used for search list bucketing. */
export function itemSearchActivityAtISO(state: AppState, item: InventoryItem): string {
  return (
    getNextDueForItem(eventsForItem(state, item.id)) ??
    itemInstallOrPurchaseDateISO(item) ??
    ''
  );
}

export function overdueCountForItem(state: AppState, itemId: string): number {
  const events = eventsForItem(state, itemId);
  const nextDue = getNextDueForItem(events);
  return isOverdue(nextDue) ? 1 : 0;
}

export function nextDueLabelForItem(state: AppState, itemId: string): string | null {
  const nextDue = getNextDueForItem(eventsForItem(state, itemId));
  if (!nextDue) return null;
  return formatDisplayDate(nextDue);
}

/** Last / next service dates for the item header; null if neither exists. */
export function serviceLastNextForItem(
  state: AppState,
  itemId: string
): { last: string | null; next: string | null } | null {
  const lastEvent = serviceHistoryEventsForItem(state, itemId)[0];
  const last = lastEvent ? formatDisplayDate(lastEvent.occurredAtISO) : null;
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
  const eventOverdue = itemsForProperty(state, propertyId).reduce(
    (sum, item) => sum + overdueCountForItem(state, item.id),
    0
  );
  return eventOverdue + overdueTodoCountForProperty(state, propertyId);
}

export function isItemOverdue(state: AppState, itemId: string): boolean {
  return overdueCountForItem(state, itemId) > 0;
}
