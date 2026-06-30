import type { AppState, InventoryTransferBundle } from './types';
import { EMPTY_APP_STATE } from './types';

export const TRANSFER_FORMAT_VERSION = 1 as const;
export const MAX_TRANSFER_BYTES = 50 * 1024 * 1024;

export function buildTransferBundle(params: {
  state: AppState;
  sourceLabel?: string;
  photoData?: Record<string, string>;
}): InventoryTransferBundle {
  return {
    formatVersion: TRANSFER_FORMAT_VERSION,
    kind: 'property-inventory',
    exportedAtISO: new Date().toISOString(),
    sourceLabel: params.sourceLabel,
    state: params.state,
    photoData: params.photoData,
  };
}

export function transferBundleToJson(bundle: InventoryTransferBundle): string {
  return JSON.stringify(bundle);
}

export function parseTransferBundle(raw: string):
  | { ok: true; bundle: InventoryTransferBundle }
  | { ok: false; error: string } {
  const byteLength = new TextEncoder().encode(raw).length;
  if (byteLength > MAX_TRANSFER_BYTES) {
    return {
      ok: false,
      error: `File is too large (${Math.round(byteLength / 1024)} KB). Maximum is ${MAX_TRANSFER_BYTES / (1024 * 1024)} MB.`,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Invalid JSON.' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Unrecognized transfer file.' };
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.formatVersion !== TRANSFER_FORMAT_VERSION) {
    return { ok: false, error: 'Unsupported transfer format version.' };
  }
  if (obj.kind !== 'property-inventory') {
    return { ok: false, error: 'Not a Property Inventory History export.' };
  }
  if (!obj.state || typeof obj.state !== 'object') {
    return { ok: false, error: 'Transfer file is missing data.' };
  }
  const state = obj.state as AppState;
  return {
    ok: true,
    bundle: {
      formatVersion: TRANSFER_FORMAT_VERSION,
      kind: 'property-inventory',
      exportedAtISO: typeof obj.exportedAtISO === 'string' ? obj.exportedAtISO : new Date().toISOString(),
      sourceLabel: typeof obj.sourceLabel === 'string' ? obj.sourceLabel : undefined,
      state: {
        version: 1,
        properties: Array.isArray(state.properties) ? state.properties : [],
        rooms: Array.isArray(state.rooms) ? state.rooms : [],
        items: Array.isArray(state.items) ? state.items : [],
        photos: Array.isArray(state.photos) ? state.photos : [],
        propertyPhotos: Array.isArray(state.propertyPhotos) ? state.propertyPhotos : [],
        roomPhotos: Array.isArray(state.roomPhotos) ? state.roomPhotos : [],
        events: Array.isArray(state.events) ? state.events : [],
      },
      photoData:
        obj.photoData && typeof obj.photoData === 'object'
          ? (obj.photoData as Record<string, string>)
          : undefined,
    },
  };
}

export function mergeImportState(local: AppState, incoming: AppState): AppState {
  const propertyIds = new Set(local.properties.map((p) => p.id));
  const roomIds = new Set(local.rooms.map((r) => r.id));
  const itemIds = new Set(local.items.map((i) => i.id));
  const photoIds = new Set(local.photos.map((p) => p.id));
  const propertyPhotoIds = new Set(local.propertyPhotos.map((p) => p.id));
  const roomPhotoIds = new Set(local.roomPhotos.map((p) => p.id));
  const eventIds = new Set(local.events.map((e) => e.id));

  return {
    version: 1,
    properties: [
      ...local.properties,
      ...incoming.properties.filter((p) => !propertyIds.has(p.id)),
    ],
    rooms: [...local.rooms, ...incoming.rooms.filter((r) => !roomIds.has(r.id))],
    items: [...local.items, ...incoming.items.filter((i) => !itemIds.has(i.id))],
    photos: [...local.photos, ...incoming.photos.filter((p) => !photoIds.has(p.id))],
    propertyPhotos: [
      ...local.propertyPhotos,
      ...((incoming.propertyPhotos ?? []).filter((p) => !propertyPhotoIds.has(p.id))),
    ],
    roomPhotos: [
      ...local.roomPhotos,
      ...((incoming.roomPhotos ?? []).filter((p) => !roomPhotoIds.has(p.id))),
    ],
    events: [...local.events, ...incoming.events.filter((e) => !eventIds.has(e.id))],
  };
}

export function replaceImportState(incoming: AppState): AppState {
  return incoming.version === 1 ? incoming : { ...EMPTY_APP_STATE };
}
