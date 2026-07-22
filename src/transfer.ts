import type {
  AppState,
  InventoryTransferBundle,
  PropertyUpdateBundle,
  SyncDeletedIds,
} from './types';
import { EMPTY_APP_STATE } from './types';
import { PROPERTY_PHOTO_SLOTS } from './propertyPhotoSlots';
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';
import { recordUpdatedAt } from './syncStamp';
import { countDeletedIds } from './syncMeta';

export const TRANSFER_FORMAT_VERSION = 1 as const;
export const UPDATE_FORMAT_VERSION = 2 as const;
export const MAX_TRANSFER_BYTES = 50 * 1024 * 1024;

function addDocumentId(into: Set<string>, id: unknown) {
  if (typeof id === 'string' && id.length > 0) into.add(id);
}

/** Collect document ids from nested item/property details and slot maps. */
function collectDocumentIdsFromValue(value: unknown, into: Set<string>) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const entry of value) collectDocumentIdsFromValue(entry, into);
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'documentIds' && Array.isArray(child)) {
      for (const id of child) addDocumentId(into, id);
      continue;
    }
    if (key.endsWith('DocumentId')) {
      addDocumentId(into, child);
      continue;
    }
    if (key === 'slotAttachments' && child && typeof child === 'object') {
      for (const attachment of Object.values(child as Record<string, { kind?: string; id?: string }>)) {
        if (attachment?.kind === 'document') addDocumentId(into, attachment.id);
      }
      continue;
    }
    collectDocumentIdsFromValue(child, into);
  }
}

function coerceAppState(state: Partial<AppState> | AppState | undefined): AppState {
  return {
    version: 1,
    properties: Array.isArray(state?.properties) ? state!.properties : [],
    rooms: Array.isArray(state?.rooms) ? state!.rooms : [],
    items: Array.isArray(state?.items) ? state!.items : [],
    photos: Array.isArray(state?.photos) ? state!.photos : [],
    propertyPhotos: Array.isArray(state?.propertyPhotos) ? state!.propertyPhotos : [],
    roomPhotos: Array.isArray(state?.roomPhotos) ? state!.roomPhotos : [],
    documents: Array.isArray(state?.documents) ? state!.documents : [],
    events: Array.isArray(state?.events) ? state!.events : [],
    projects: Array.isArray(state?.projects) ? state!.projects : [],
    projectVendors: Array.isArray(state?.projectVendors) ? state!.projectVendors : [],
    projectPhotos: Array.isArray(state?.projectPhotos) ? state!.projectPhotos : [],
    vendorPhotos: Array.isArray(state?.vendorPhotos) ? state!.vendorPhotos : [],
    vendorInteractions: Array.isArray(state?.vendorInteractions)
      ? state!.vendorInteractions
      : [],
  };
}

/** Slice app state to a single property for transfer to another user. */
export function sliceAppStateForProperty(state: AppState, propertyId: string): AppState | null {
  const property = state.properties.find((p) => p.id === propertyId);
  if (!property) return null;

  const rooms = state.rooms.filter((r) => r.propertyId === propertyId);
  const roomIds = new Set(rooms.map((r) => r.id));
  const items = state.items.filter((i) => roomIds.has(i.roomId));
  const itemIds = new Set(items.map((i) => i.id));
  const events = state.events.filter((e) => itemIds.has(e.itemId));
  const eventIds = new Set(events.map((e) => e.id));
  const photos = state.photos.filter(
    (p) => itemIds.has(p.itemId) && (!p.eventId || eventIds.has(p.eventId))
  );
  const propertyPhotos = state.propertyPhotos.filter((p) => p.propertyId === propertyId);
  const roomPhotos = state.roomPhotos.filter((p) => roomIds.has(p.roomId));
  const projects = state.projects.filter((p) => p.propertyId === propertyId);
  const projectIds = new Set(projects.map((p) => p.id));
  const projectVendors = state.projectVendors.filter((v) => projectIds.has(v.projectId));
  const projectPhotos = state.projectPhotos.filter((p) => projectIds.has(p.projectId));
  const vendorIds = new Set(projectVendors.map((v) => v.id));
  const vendorPhotos = state.vendorPhotos.filter((p) => vendorIds.has(p.vendorId));
  const vendorInteractions = state.vendorInteractions.filter((i) => vendorIds.has(i.vendorId));

  const documentIds = new Set<string>();
  for (const slot of PROPERTY_PHOTO_SLOTS) {
    const docKey = documentIdKeyForPhotoSlot(slot.key) as keyof typeof property;
    addDocumentId(documentIds, property[docKey]);
  }
  collectDocumentIdsFromValue(rooms, documentIds);
  collectDocumentIdsFromValue(items, documentIds);
  collectDocumentIdsFromValue(projectVendors, documentIds);

  const documents = state.documents.filter((d) => documentIds.has(d.id));

  return {
    version: 1,
    properties: [property],
    rooms,
    items,
    photos,
    propertyPhotos,
    roomPhotos,
    documents,
    events,
    projects,
    projectVendors,
    projectPhotos,
    vendorPhotos,
    vendorInteractions,
  };
}

function isNewerThan(record: { updatedAtISO?: string; createdAtISO?: string }, sinceISO: string) {
  return recordUpdatedAt(record) > sinceISO;
}

/** Slice a property to records changed after sinceISO (or full slice if sinceISO omitted). */
export function slicePropertyChanges(
  state: AppState,
  propertyId: string,
  sinceISO?: string
): AppState | null {
  const full = sliceAppStateForProperty(state, propertyId);
  if (!full) return null;
  if (!sinceISO) return full;

  const properties = full.properties.filter((p) => isNewerThan(p, sinceISO));
  const rooms = full.rooms.filter((r) => isNewerThan(r, sinceISO));
  const items = full.items.filter((i) => isNewerThan(i, sinceISO));
  const events = full.events.filter((e) => isNewerThan(e, sinceISO));
  const photos = full.photos.filter((p) => isNewerThan(p, sinceISO));
  const propertyPhotos = full.propertyPhotos.filter((p) => isNewerThan(p, sinceISO));
  const roomPhotos = full.roomPhotos.filter((p) => isNewerThan(p, sinceISO));
  const projects = full.projects.filter((p) => isNewerThan(p, sinceISO));
  const projectVendors = full.projectVendors.filter((v) => isNewerThan(v, sinceISO));
  const projectPhotos = full.projectPhotos.filter((p) => isNewerThan(p, sinceISO));
  const vendorPhotos = full.vendorPhotos.filter((p) => isNewerThan(p, sinceISO));
  const vendorInteractions = full.vendorInteractions.filter((i) => isNewerThan(i, sinceISO));
  const documents = full.documents.filter((d) => isNewerThan(d, sinceISO));

  return {
    version: 1,
    properties,
    rooms,
    items,
    photos,
    propertyPhotos,
    roomPhotos,
    documents,
    events,
    projects,
    projectVendors,
    projectPhotos,
    vendorPhotos,
    vendorInteractions,
  };
}

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

export function buildPropertyUpdateBundle(params: {
  state: AppState;
  propertyId: string;
  sinceISO?: string;
  deletedIds?: SyncDeletedIds;
  sourceLabel?: string;
}): PropertyUpdateBundle | null {
  const sliced = slicePropertyChanges(params.state, params.propertyId, params.sinceISO);
  if (!sliced) return null;
  return {
    formatVersion: UPDATE_FORMAT_VERSION,
    kind: 'property-update',
    exportedAtISO: new Date().toISOString(),
    sourceLabel: params.sourceLabel,
    propertyId: params.propertyId,
    sinceISO: params.sinceISO,
    state: sliced,
    deletedIds: params.deletedIds ?? {},
  };
}

export function transferBundleToJson(
  bundle: InventoryTransferBundle | PropertyUpdateBundle
): string {
  return JSON.stringify(bundle);
}

export type ParsedTransfer =
  | { ok: true; kind: 'property-inventory'; bundle: InventoryTransferBundle }
  | { ok: true; kind: 'property-update'; bundle: PropertyUpdateBundle }
  | { ok: false; error: string };

export function parseTransferBundle(raw: string): ParsedTransfer {
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

  if (obj.kind === 'property-update') {
    if (obj.formatVersion !== UPDATE_FORMAT_VERSION) {
      return { ok: false, error: 'Unsupported update package format version.' };
    }
    if (typeof obj.propertyId !== 'string' || !obj.propertyId) {
      return { ok: false, error: 'Update package is missing property id.' };
    }
    if (!obj.state || typeof obj.state !== 'object') {
      return { ok: false, error: 'Update package is missing data.' };
    }
    return {
      ok: true,
      kind: 'property-update',
      bundle: {
        formatVersion: UPDATE_FORMAT_VERSION,
        kind: 'property-update',
        exportedAtISO:
          typeof obj.exportedAtISO === 'string' ? obj.exportedAtISO : new Date().toISOString(),
        sourceLabel: typeof obj.sourceLabel === 'string' ? obj.sourceLabel : undefined,
        propertyId: obj.propertyId,
        sinceISO: typeof obj.sinceISO === 'string' ? obj.sinceISO : undefined,
        state: coerceAppState(obj.state as AppState),
        deletedIds:
          obj.deletedIds && typeof obj.deletedIds === 'object'
            ? (obj.deletedIds as SyncDeletedIds)
            : {},
      },
    };
  }

  if (obj.formatVersion !== TRANSFER_FORMAT_VERSION) {
    return { ok: false, error: 'Unsupported transfer format version.' };
  }
  if (obj.kind !== 'property-inventory') {
    return { ok: false, error: 'Not a Property Asset Manager export.' };
  }
  if (!obj.state || typeof obj.state !== 'object') {
    return { ok: false, error: 'Transfer file is missing data.' };
  }
  return {
    ok: true,
    kind: 'property-inventory',
    bundle: {
      formatVersion: TRANSFER_FORMAT_VERSION,
      kind: 'property-inventory',
      exportedAtISO:
        typeof obj.exportedAtISO === 'string' ? obj.exportedAtISO : new Date().toISOString(),
      sourceLabel: typeof obj.sourceLabel === 'string' ? obj.sourceLabel : undefined,
      state: coerceAppState(obj.state as AppState),
      photoData:
        obj.photoData && typeof obj.photoData === 'object'
          ? (obj.photoData as Record<string, string>)
          : undefined,
    },
  };
}

/** Add-only merge for first-time / backup imports (legacy behavior). */
export function mergeImportState(local: AppState, incoming: AppState): AppState {
  const propertyIds = new Set(local.properties.map((p) => p.id));
  const roomIds = new Set(local.rooms.map((r) => r.id));
  const itemIds = new Set(local.items.map((i) => i.id));
  const photoIds = new Set(local.photos.map((p) => p.id));
  const propertyPhotoIds = new Set(local.propertyPhotos.map((p) => p.id));
  const roomPhotoIds = new Set(local.roomPhotos.map((p) => p.id));
  const documentIds = new Set(local.documents.map((d) => d.id));
  const eventIds = new Set(local.events.map((e) => e.id));
  const projectIds = new Set(local.projects.map((p) => p.id));
  const projectVendorIds = new Set(local.projectVendors.map((v) => v.id));
  const projectPhotoIds = new Set(local.projectPhotos.map((p) => p.id));
  const vendorPhotoIds = new Set(local.vendorPhotos.map((p) => p.id));
  const vendorInteractionIds = new Set(local.vendorInteractions.map((i) => i.id));

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
    documents: [
      ...local.documents,
      ...((incoming.documents ?? []).filter((d) => !documentIds.has(d.id))),
    ],
    events: [...local.events, ...incoming.events.filter((e) => !eventIds.has(e.id))],
    projects: [
      ...local.projects,
      ...((incoming.projects ?? []).filter((p) => !projectIds.has(p.id))),
    ],
    projectVendors: [
      ...local.projectVendors,
      ...((incoming.projectVendors ?? []).filter((v) => !projectVendorIds.has(v.id))),
    ],
    projectPhotos: [
      ...local.projectPhotos,
      ...((incoming.projectPhotos ?? []).filter((p) => !projectPhotoIds.has(p.id))),
    ],
    vendorPhotos: [
      ...local.vendorPhotos,
      ...((incoming.vendorPhotos ?? []).filter((p) => !vendorPhotoIds.has(p.id))),
    ],
    vendorInteractions: [
      ...local.vendorInteractions,
      ...((incoming.vendorInteractions ?? []).filter((i) => !vendorInteractionIds.has(i.id))),
    ],
  };
}

export type CollaborativeMergeSummary = {
  added: number;
  updated: number;
  deleted: number;
};

function upsertById<T extends { id: string; updatedAtISO?: string; createdAtISO?: string }>(
  local: T[],
  incoming: T[],
  summary: CollaborativeMergeSummary
): T[] {
  const map = new Map(local.map((r) => [r.id, r]));
  for (const remote of incoming) {
    const existing = map.get(remote.id);
    if (!existing) {
      map.set(remote.id, remote);
      summary.added += 1;
      continue;
    }
    const localTs = recordUpdatedAt(existing);
    const remoteTs = recordUpdatedAt(remote);
    if (remoteTs > localTs) {
      map.set(remote.id, remote);
      summary.updated += 1;
    }
  }
  return [...map.values()];
}

function applyDeletedIds(state: AppState, deleted: SyncDeletedIds): AppState {
  const drop = {
    properties: new Set(deleted.properties ?? []),
    rooms: new Set(deleted.rooms ?? []),
    items: new Set(deleted.items ?? []),
    photos: new Set(deleted.photos ?? []),
    propertyPhotos: new Set(deleted.propertyPhotos ?? []),
    roomPhotos: new Set(deleted.roomPhotos ?? []),
    documents: new Set(deleted.documents ?? []),
    events: new Set(deleted.events ?? []),
    projects: new Set(deleted.projects ?? []),
    projectVendors: new Set(deleted.projectVendors ?? []),
    projectPhotos: new Set(deleted.projectPhotos ?? []),
    vendorPhotos: new Set(deleted.vendorPhotos ?? []),
    vendorInteractions: new Set(deleted.vendorInteractions ?? []),
  };

  return {
    version: 1,
    properties: state.properties.filter((p) => !drop.properties.has(p.id)),
    rooms: state.rooms.filter((r) => !drop.rooms.has(r.id)),
    items: state.items.filter((i) => !drop.items.has(i.id)),
    photos: state.photos.filter((p) => !drop.photos.has(p.id)),
    propertyPhotos: state.propertyPhotos.filter((p) => !drop.propertyPhotos.has(p.id)),
    roomPhotos: state.roomPhotos.filter((p) => !drop.roomPhotos.has(p.id)),
    documents: state.documents.filter((d) => !drop.documents.has(d.id)),
    events: state.events.filter((e) => !drop.events.has(e.id)),
    projects: state.projects.filter((p) => !drop.projects.has(p.id)),
    projectVendors: state.projectVendors.filter((v) => !drop.projectVendors.has(v.id)),
    projectPhotos: state.projectPhotos.filter((p) => !drop.projectPhotos.has(p.id)),
    vendorPhotos: state.vendorPhotos.filter((p) => !drop.vendorPhotos.has(p.id)),
    vendorInteractions: state.vendorInteractions.filter(
      (i) => !drop.vendorInteractions.has(i.id)
    ),
  };
}

/** Upsert by ID using latest updatedAtISO; then apply deletedIds. */
export function mergeCollaborativeState(
  local: AppState,
  incoming: AppState,
  deletedIds: SyncDeletedIds = {}
): { state: AppState; summary: CollaborativeMergeSummary } {
  const summary: CollaborativeMergeSummary = {
    added: 0,
    updated: 0,
    deleted: countDeletedIds(deletedIds),
  };

  let merged: AppState = {
    version: 1,
    properties: upsertById(local.properties, incoming.properties, summary),
    rooms: upsertById(local.rooms, incoming.rooms, summary),
    items: upsertById(local.items, incoming.items, summary),
    photos: upsertById(local.photos, incoming.photos, summary),
    propertyPhotos: upsertById(local.propertyPhotos, incoming.propertyPhotos ?? [], summary),
    roomPhotos: upsertById(local.roomPhotos, incoming.roomPhotos ?? [], summary),
    documents: upsertById(local.documents, incoming.documents ?? [], summary),
    events: upsertById(local.events, incoming.events, summary),
    projects: upsertById(local.projects, incoming.projects ?? [], summary),
    projectVendors: upsertById(local.projectVendors, incoming.projectVendors ?? [], summary),
    projectPhotos: upsertById(local.projectPhotos, incoming.projectPhotos ?? [], summary),
    vendorPhotos: upsertById(local.vendorPhotos, incoming.vendorPhotos ?? [], summary),
    vendorInteractions: upsertById(
      local.vendorInteractions,
      incoming.vendorInteractions ?? [],
      summary
    ),
  };

  if (countDeletedIds(deletedIds) > 0) {
    merged = applyDeletedIds(merged, deletedIds);
  }

  return { state: merged, summary };
}

export function replaceImportState(incoming: AppState): AppState {
  return incoming.version === 1 ? incoming : { ...EMPTY_APP_STATE };
}

export function summarizeChanges(state: AppState, deletedIds: SyncDeletedIds = {}): string {
  const counts = [
    state.properties.length && `${state.properties.length} propert${state.properties.length === 1 ? 'y' : 'ies'}`,
    state.rooms.length && `${state.rooms.length} room${state.rooms.length === 1 ? '' : 's'}`,
    state.items.length && `${state.items.length} asset${state.items.length === 1 ? '' : 's'}`,
    state.events.length && `${state.events.length} event${state.events.length === 1 ? '' : 's'}`,
    state.projects.length && `${state.projects.length} project${state.projects.length === 1 ? '' : 's'}`,
    state.projectVendors.length &&
      `${state.projectVendors.length} vendor${state.projectVendors.length === 1 ? '' : 's'}`,
    state.vendorInteractions.length &&
      `${state.vendorInteractions.length} interaction${state.vendorInteractions.length === 1 ? '' : 's'}`,
    (state.photos.length +
      state.propertyPhotos.length +
      state.roomPhotos.length +
      state.projectPhotos.length +
      state.vendorPhotos.length) &&
      `${
        state.photos.length +
        state.propertyPhotos.length +
        state.roomPhotos.length +
        state.projectPhotos.length +
        state.vendorPhotos.length
      } photo${
        state.photos.length +
          state.propertyPhotos.length +
          state.roomPhotos.length +
          state.projectPhotos.length +
          state.vendorPhotos.length ===
        1
          ? ''
          : 's'
      }`,
  ].filter(Boolean);
  const deleted = countDeletedIds(deletedIds);
  if (deleted > 0) counts.push(`${deleted} deletion${deleted === 1 ? '' : 's'}`);
  return counts.length > 0 ? counts.join(', ') : 'no changes';
}
