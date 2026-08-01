import type { AppState, InventoryItem } from './types';
import { catalogLabel, itemCustomName, itemDisplayLabel, itemListRowLabels } from './itemCatalog';
import {
  firstPhotoUriForItem,
  propertyById,
  roomById,
} from './storage';
import { formatDate, nowISO } from './utils';

export type AssetsExportPhoto = { uri: string; label: string; notes?: string };
export type AssetsExportEntry = {
  title: string;
  lines: string[];
  photos: AssetsExportPhoto[];
};

export type AssetsExportSnapshot = {
  title: string;
  subtitle: string;
  metaLines: string[];
  assets: AssetsExportEntry[];
  exportedAtLabel: string;
};

export function buildAssetsExportSnapshot(args: {
  state: AppState;
  items: InventoryItem[];
  /** Property or room name shown as the primary context line. */
  scopeTitle: string;
  /** Extra context (e.g. property name when scoped to a room). */
  scopeMetaLines?: string[];
  /** Active filter labels (property, room, type, search). */
  filterLines?: string[];
}): AssetsExportSnapshot {
  const { state, items, scopeTitle, scopeMetaLines = [], filterLines = [] } = args;

  const metaLines = [...scopeMetaLines, ...filterLines]
    .map((line) => line.trim())
    .filter(Boolean);

  const entries = items.map((item) => {
    const room = roomById(state, item.roomId);
    const property = room ? propertyById(state, room.propertyId) : undefined;
    const { label, nameLabel } = itemListRowLabels(item);
    const typeLabel = catalogLabel(item.itemTypeId);
    const customName = itemCustomName(item);

    const lines = [
      nameLabel && nameLabel !== label ? nameLabel : undefined,
      typeLabel !== label ? typeLabel : undefined,
      customName && customName !== label && customName !== nameLabel ? customName : undefined,
      room?.name && property?.name !== scopeTitle && room.name !== scopeTitle
        ? property && room.name !== property.name
          ? `${property.name} · ${room.name}`
          : room.name
        : property?.name && property.name !== scopeTitle
          ? property.name
          : undefined,
    ].filter((line): line is string => Boolean(line));

    const thumbUri = firstPhotoUriForItem(state, item);
    const thumbNotes = thumbUri
      ? state.photos.find((p) => p.localUri === thumbUri)?.notes?.trim() || undefined
      : undefined;

    return {
      title: label || itemDisplayLabel(item),
      lines,
      photos: thumbUri ? [{ uri: thumbUri, label: 'Photo', notes: thumbNotes }] : [],
    };
  });

  return {
    title: 'Assets',
    subtitle: 'Property Asset Manager',
    metaLines: [scopeTitle, ...metaLines],
    assets: entries,
    exportedAtLabel: `Exported ${formatDate(nowISO())}`,
  };
}
