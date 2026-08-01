import type { AppState, ItemEventType, ItemPhoto } from './types';
import { catalogLabel, itemDisplayLabel } from './itemCatalog';
import { EVENT_TYPE_LABELS, recurrenceLabel } from './eventRecurrence';
import { itemById, propertyById, roomById } from './storage';
import { formatCurrency, formatDate, formatDisplayDate, nowISO } from './utils';
import { applySharePhotoMode, type SharePhotoMode } from './sharePhotoMode';

export type EventExportRow = { label: string; value: string };
export type EventExportPhoto = { uri: string; label: string; notes?: string };

export type EventExportSnapshot = {
  title: string;
  subtitle: string;
  metaLines: string[];
  rows: EventExportRow[];
  photos: EventExportPhoto[];
  scheduleLine?: string;
  exportedAtLabel: string;
};

function row(label: string, value?: string | null): EventExportRow | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return { label, value: trimmed };
}

export function buildEventExportSnapshot(params: {
  state: AppState;
  itemId: string;
  title: string;
  eventType: ItemEventType;
  occurredAtISO: string;
  notes?: string;
  serviceCompany?: string;
  cost?: number;
  scheduleLabel?: string;
  photos: ItemPhoto[];
  photoMode?: SharePhotoMode;
}): EventExportSnapshot | null {
  const item = itemById(params.state, params.itemId);
  if (!item) return null;

  const room = roomById(params.state, item.roomId);
  const property = room ? propertyById(params.state, room.propertyId) : undefined;
  const assetLabel = itemDisplayLabel({ ...item, details: item.details });

  const metaLines = [
    property?.name,
    room?.name,
    catalogLabel(item.itemTypeId),
    property?.address,
  ]
    .filter((line): line is string => Boolean(line?.trim()))
    .map((line) => line.trim());

  const rows = [
    row('Type', EVENT_TYPE_LABELS[params.eventType]),
    row('Date', formatDisplayDate(params.occurredAtISO)),
    row('Service company', params.serviceCompany),
    row('Cost', params.cost != null ? formatCurrency(params.cost) : undefined),
    row('Notes', params.notes),
  ].filter((entry): entry is EventExportRow => entry != null);

  const photos = applySharePhotoMode(params.photos, params.photoMode ?? 'all').map((photo) => ({
    uri: photo.localUri,
    label: photo.caption === 'receipt' ? 'Receipt' : photo.caption?.trim() || 'Photo',
    notes: photo.notes?.trim() || undefined,
  }));

  return {
    title: params.title.trim() || 'Service event',
    subtitle: assetLabel,
    metaLines,
    rows,
    photos,
    scheduleLine: params.scheduleLabel?.trim() || undefined,
    exportedAtLabel: `Exported ${formatDate(nowISO())}`,
  };
}

export function scheduleLabelFromRecurrence(
  recurrence: { interval: string; nextDueAtISO?: string; notes?: string; intervalMonths?: number } | undefined
): string | undefined {
  if (!recurrence) return undefined;
  return recurrenceLabel(recurrence as Parameters<typeof recurrenceLabel>[0]);
}
