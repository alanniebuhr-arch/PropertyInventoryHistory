import type { AppState } from './types';

const FALLBACK_ISO = '1970-01-01T00:00:00.000Z';

type WithUpdated = { updatedAtISO?: string; createdAtISO?: string };
type WithId = WithUpdated & { id: string };

export function recordUpdatedAt(record: WithUpdated): string {
  return record.updatedAtISO ?? record.createdAtISO ?? FALLBACK_ISO;
}

export function ensureUpdatedAt<T extends WithUpdated>(record: T): T {
  if (record.updatedAtISO) return record;
  return { ...record, updatedAtISO: record.createdAtISO ?? FALLBACK_ISO };
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function stampCollection<T extends WithId>(prevList: T[], nextList: T[], now: string): T[] {
  const prevById = new Map(prevList.map((r) => [r.id, r]));
  return nextList.map((record) => {
    const prev = prevById.get(record.id);
    if (!prev) {
      return { ...record, updatedAtISO: record.updatedAtISO ?? now };
    }
    const prevCore = { ...prev, updatedAtISO: undefined };
    const nextCore = { ...record, updatedAtISO: undefined };
    if (stableJson(prevCore) === stableJson(nextCore)) {
      return ensureUpdatedAt(record);
    }
    const prevTs = recordUpdatedAt(prev);
    const nextTs = record.updatedAtISO;
    if (nextTs && nextTs > prevTs) {
      return record;
    }
    return { ...record, updatedAtISO: now };
  });
}

/** Stamp updatedAtISO on records that changed vs previous persisted state. */
export function stampChangedRecords(prev: AppState, next: AppState, now: string): AppState {
  return {
    version: 1,
    properties: stampCollection(prev.properties, next.properties, now),
    rooms: stampCollection(prev.rooms, next.rooms, now),
    items: stampCollection(prev.items, next.items, now),
    photos: stampCollection(prev.photos, next.photos, now),
    propertyPhotos: stampCollection(prev.propertyPhotos, next.propertyPhotos, now),
    roomPhotos: stampCollection(prev.roomPhotos, next.roomPhotos, now),
    documents: stampCollection(prev.documents, next.documents, now),
    events: stampCollection(prev.events, next.events, now),
    projects: stampCollection(prev.projects, next.projects, now),
    projectVendors: stampCollection(prev.projectVendors, next.projectVendors, now),
    projectPhotos: stampCollection(prev.projectPhotos, next.projectPhotos, now),
    vendorPhotos: stampCollection(prev.vendorPhotos, next.vendorPhotos, now),
    vendorInteractions: stampCollection(prev.vendorInteractions, next.vendorInteractions, now),
  };
}
