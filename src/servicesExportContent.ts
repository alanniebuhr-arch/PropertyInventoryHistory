import type { AppState, ItemEvent } from './types';
import { itemDisplayLabel } from './itemCatalog';
import { serviceListDateISO, upcomingDueAtISO } from './eventRecurrence';
import {
  itemById,
  photosForEvent,
  propertyById,
  roomById,
} from './storage';
import { formatDate, formatDisplayDate, nowISO } from './utils';

export type ServicesExportPhoto = { uri: string; label: string; notes?: string };
export type ServicesExportEntry = {
  title: string;
  lines: string[];
  photos: ServicesExportPhoto[];
};

export type ServicesExportSnapshot = {
  title: string;
  subtitle: string;
  metaLines: string[];
  services: ServicesExportEntry[];
  exportedAtLabel: string;
};

export function buildServicesExportSnapshot(args: {
  state: AppState;
  events: ItemEvent[];
  /** Property or room name shown as the primary context line. */
  scopeTitle: string;
  /** Extra context (e.g. property name when scoped to a room). */
  scopeMetaLines?: string[];
  /** Active filter labels (room, item, status, search). */
  filterLines?: string[];
}): ServicesExportSnapshot {
  const { state, events, scopeTitle, scopeMetaLines = [], filterLines = [] } = args;

  const metaLines = [...scopeMetaLines, ...filterLines]
    .map((line) => line.trim())
    .filter(Boolean);

  const entries = events.flatMap((event) => {
    const item = itemById(state, event.itemId);
    if (!item) return [];

    const room = roomById(state, item.roomId);
    const property = room ? propertyById(state, room.propertyId) : undefined;
    const isOpen = upcomingDueAtISO(event) != null;
    const statusLabel = isOpen ? 'Open' : 'Done';
    const itemLabel = itemDisplayLabel(item);

    const lines = [
      itemLabel,
      room?.name && property?.name !== scopeTitle && room.name !== scopeTitle
        ? property && room.name !== property.name
          ? `${property.name} · ${room.name}`
          : room.name
        : property?.name && property.name !== scopeTitle
          ? property.name
          : undefined,
      event.notes?.trim() || undefined,
      event.serviceCompany?.trim() || undefined,
    ].filter((line): line is string => Boolean(line));

    return [
      {
        title: `${formatDisplayDate(serviceListDateISO(event))} · ${statusLabel}${
          event.title.trim() ? ` · ${event.title.trim()}` : ''
        }`,
        lines,
        photos: photosForEvent(state, event.id).map((photo) => ({
          uri: photo.localUri,
          label: photo.caption?.trim() || 'Photo',
          notes: photo.notes?.trim() || undefined,
        })),
      },
    ];
  });

  return {
    title: 'Services',
    subtitle: 'Property Asset Manager',
    metaLines: [scopeTitle, ...metaLines],
    services: entries,
    exportedAtLabel: `Exported ${formatDate(nowISO())}`,
  };
}
