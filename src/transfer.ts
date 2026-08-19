import type {
  AppState,
  BlightMinute,
  HomeDocument,
  InventoryTransferBundle,
  PropertyUpdateBundle,
  SyncDeletedIds,
} from './types';
import { EMPTY_APP_STATE } from './types';
import { PROPERTY_PHOTO_SLOTS } from './propertyPhotoSlots';
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';
import { recordUpdatedAt } from './syncStamp';
import { countDeletedIds } from './syncMeta';
import { livingPins, mergePins, normalizePins, pinsForProperty } from './pins';
import { mergeUseCases, normalizeUseCases } from './useCases';
import { deletePropertyCascade } from './storage';
import { itemDisplayLabel } from './itemCatalog';
import { vendorContactMethodLabel } from './vendorContactMethod';
import { formatDisplayDate } from './utils';

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

function recordsWithId<T extends { id?: unknown }>(list: unknown): T[] {
  if (!Array.isArray(list)) return [];
  return list.filter(
    (row): row is T =>
      !!row &&
      typeof row === 'object' &&
      typeof (row as { id?: unknown }).id === 'string' &&
      (row as { id: string }).id.length > 0
  );
}

/** Drop null/non-record rows so import of older or hand-edited packages cannot crash. */
export function coerceAppState(state: Partial<AppState> | AppState | undefined): AppState {
  return {
    version: 1,
    properties: recordsWithId(state?.properties),
    rooms: recordsWithId(state?.rooms),
    items: recordsWithId(state?.items),
    photos: recordsWithId(state?.photos),
    propertyPhotos: recordsWithId(state?.propertyPhotos),
    roomPhotos: recordsWithId(state?.roomPhotos),
    documents: recordsWithId(state?.documents),
    events: recordsWithId(state?.events),
    projects: recordsWithId(state?.projects),
    projectVendors: recordsWithId(state?.projectVendors),
    projectPhotos: recordsWithId(state?.projectPhotos),
    vendorPhotos: recordsWithId(state?.vendorPhotos),
    vendorInteractions: recordsWithId(state?.vendorInteractions),
    propertyTodos: recordsWithId(state?.propertyTodos),
    projectPunchItems: recordsWithId(state?.projectPunchItems),
    projectComplainants: recordsWithId(state?.projectComplainants),
    blightMinutes: recordsWithId<BlightMinute>(state?.blightMinutes),
    homeDocuments: (() => {
      const home = recordsWithId<HomeDocument>(state?.homeDocuments);
      if (home.length > 0) return home;
      return recordsWithId<BlightMinute>(state?.blightMinutes).map((minute) => ({
        id: minute.id,
        documentId: minute.documentId,
        title: minute.meetingDateISO,
        createdAtISO: minute.createdAtISO,
        updatedAtISO: minute.updatedAtISO,
      }));
    })(),
    useCases: normalizeUseCases(state?.useCases),
    pins: normalizePins(state?.pins),
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
  const vendorInteractions = state.vendorInteractions.filter((i) => {
    if (i.propertyId === propertyId) return true;
    return Boolean(i.vendorId && vendorIds.has(i.vendorId));
  });
  const interactionIds = new Set(vendorInteractions.map((i) => i.id));
  const vendorPhotos = state.vendorPhotos.filter((p) => {
    if (p.interactionId && interactionIds.has(p.interactionId)) return true;
    return Boolean(p.vendorId && vendorIds.has(p.vendorId));
  });
  const propertyTodos = state.propertyTodos.filter((t) => t.propertyId === propertyId);
  const projectPunchItems = (state.projectPunchItems ?? []).filter((item) =>
    projectIds.has(item.projectId)
  );
  const projectComplainants = (state.projectComplainants ?? []).filter((person) =>
    projectIds.has(person.projectId)
  );

  const documentIds = new Set<string>();
  for (const slot of PROPERTY_PHOTO_SLOTS) {
    const docKey = documentIdKeyForPhotoSlot(slot.key) as keyof typeof property;
    addDocumentId(documentIds, property[docKey]);
  }
  collectDocumentIdsFromValue(rooms, documentIds);
  collectDocumentIdsFromValue(items, documentIds);
  collectDocumentIdsFromValue(projects, documentIds);
  collectDocumentIdsFromValue(projectPunchItems, documentIds);
  collectDocumentIdsFromValue(projectComplainants, documentIds);
  collectDocumentIdsFromValue(propertyTodos, documentIds);
  collectDocumentIdsFromValue(projectVendors, documentIds);
  collectDocumentIdsFromValue(events, documentIds);

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
    propertyTodos,
    projectPunchItems,
    projectComplainants,
    blightMinutes: [],
    homeDocuments: [],
    useCases: normalizeUseCases(state.useCases),
    pins: pinsForProperty(state, propertyId),
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
  const propertyPhotos = full.propertyPhotos.filter((p) => isNewerThan(p, sinceISO));
  const roomPhotos = full.roomPhotos.filter((p) => isNewerThan(p, sinceISO));
  const projects = full.projects.filter((p) => isNewerThan(p, sinceISO));
  const projectPhotos = full.projectPhotos.filter((p) => isNewerThan(p, sinceISO));
  const propertyTodos = full.propertyTodos.filter((t) => isNewerThan(t, sinceISO));
  const projectPunchItems = (full.projectPunchItems ?? []).filter((item) =>
    isNewerThan(item, sinceISO)
  );
  const projectComplainants = (full.projectComplainants ?? []).filter((person) =>
    isNewerThan(person, sinceISO)
  );

  const changedVendorIds = new Set(
    full.projectVendors.filter((v) => isNewerThan(v, sinceISO)).map((v) => v.id)
  );
  const changedInteractionIds = new Set(
    full.vendorInteractions.filter((i) => isNewerThan(i, sinceISO)).map((i) => i.id)
  );

  // Include every interaction for a changed vendor, and the vendor for every changed interaction.
  for (const interaction of full.vendorInteractions) {
    const linkedVendorId = interaction.vendorId;
    if (
      changedInteractionIds.has(interaction.id) ||
      (linkedVendorId != null && changedVendorIds.has(linkedVendorId))
    ) {
      changedInteractionIds.add(interaction.id);
      if (linkedVendorId != null) changedVendorIds.add(linkedVendorId);
    }
  }

  const projectVendors = full.projectVendors.filter((v) => changedVendorIds.has(v.id));
  const vendorInteractions = full.vendorInteractions.filter((i) =>
    changedInteractionIds.has(i.id)
  );
  const vendorPhotos = full.vendorPhotos.filter(
    (p) =>
      isNewerThan(p, sinceISO) ||
      (p.vendorId != null && changedVendorIds.has(p.vendorId)) ||
      (p.interactionId != null && changedInteractionIds.has(p.interactionId))
  );

  const eventIds = new Set(events.map((e) => e.id));
  const itemIds = new Set(items.map((i) => i.id));
  const photos = full.photos.filter(
    (p) =>
      isNewerThan(p, sinceISO) ||
      (p.eventId != null && eventIds.has(p.eventId)) ||
      (itemIds.has(p.itemId) && isNewerThan(p, sinceISO))
  );

  const documentIds = new Set<string>();
  for (const property of properties.length > 0 ? properties : []) {
    for (const slot of PROPERTY_PHOTO_SLOTS) {
      const docKey = documentIdKeyForPhotoSlot(slot.key) as keyof typeof property;
      addDocumentId(documentIds, property[docKey]);
    }
  }
  collectDocumentIdsFromValue(rooms, documentIds);
  collectDocumentIdsFromValue(items, documentIds);
  collectDocumentIdsFromValue(projects, documentIds);
  collectDocumentIdsFromValue(projectPunchItems, documentIds);
  collectDocumentIdsFromValue(projectComplainants, documentIds);
  collectDocumentIdsFromValue(propertyTodos, documentIds);
  collectDocumentIdsFromValue(projectVendors, documentIds);
  collectDocumentIdsFromValue(events, documentIds);
  const documents = full.documents.filter(
    (d) => documentIds.has(d.id) || isNewerThan(d, sinceISO)
  );

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
    propertyTodos,
    projectPunchItems,
    projectComplainants,
    blightMinutes: [],
    homeDocuments: [],
    useCases: full.useCases,
    pins: full.pins,
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
  const propertyTodoIds = new Set((local.propertyTodos ?? []).map((t) => t.id));
  const projectPunchItemIds = new Set((local.projectPunchItems ?? []).map((t) => t.id));
  const projectComplainantIds = new Set((local.projectComplainants ?? []).map((c) => c.id));
  const blightMinuteIds = new Set((local.blightMinutes ?? []).map((m) => m.id));
  const homeDocumentIds = new Set((local.homeDocuments ?? []).map((d) => d.id));

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
    propertyTodos: [
      ...(local.propertyTodos ?? []),
      ...((incoming.propertyTodos ?? []).filter((t) => !propertyTodoIds.has(t.id))),
    ],
    projectPunchItems: [
      ...(local.projectPunchItems ?? []),
      ...((incoming.projectPunchItems ?? []).filter((t) => !projectPunchItemIds.has(t.id))),
    ],
    projectComplainants: [
      ...(local.projectComplainants ?? []),
      ...((incoming.projectComplainants ?? []).filter((c) => !projectComplainantIds.has(c.id))),
    ],
    blightMinutes: [
      ...(local.blightMinutes ?? []),
      ...((incoming.blightMinutes ?? []).filter((m) => !blightMinuteIds.has(m.id))),
    ],
    homeDocuments: [
      ...(local.homeDocuments ?? []),
      ...((incoming.homeDocuments ?? []).filter((d) => !homeDocumentIds.has(d.id))),
    ],
    useCases: mergeUseCases(local.useCases, incoming.useCases),
    pins: mergePins(local.pins ?? [], normalizePins(incoming.pins)),
  };
}

export type CollaborativeMergeSummary = {
  added: number;
  updated: number;
  deleted: number;
};

export type ImportPreviewSummary = {
  added: number;
  updated: number;
  unchanged: number;
  deleted: number;
};

export type ImportChangeAction = 'added' | 'updated' | 'deleted';

export type ImportChangeKind =
  | 'property'
  | 'room'
  | 'item'
  | 'event'
  | 'project'
  | 'vendor'
  | 'interaction'
  | 'todo'
  | 'punch'
  | 'photo'
  | 'document';

export type ImportChangeEntry = {
  action: ImportChangeAction;
  kind: ImportChangeKind;
  id: string;
  label: string;
};

export type ImportPreviewResult = {
  summary: ImportPreviewSummary;
  entries: ImportChangeEntry[];
};

type TimedRecord = { id: string; updatedAtISO?: string; createdAtISO?: string };

function classifyUpsert(
  local: TimedRecord[],
  incoming: TimedRecord[]
): { added: TimedRecord[]; updated: TimedRecord[]; unchanged: TimedRecord[] } {
  const localMap = new Map(
    local.filter((r) => r && typeof r.id === 'string').map((r) => [r.id, r])
  );
  const added: TimedRecord[] = [];
  const updated: TimedRecord[] = [];
  const unchanged: TimedRecord[] = [];
  for (const remote of incoming) {
    if (!remote || typeof remote.id !== 'string') continue;
    const existing = localMap.get(remote.id);
    if (!existing) {
      added.push(remote);
      continue;
    }
    if (recordUpdatedAt(remote) > recordUpdatedAt(existing)) {
      updated.push(remote);
    } else {
      unchanged.push(remote);
    }
  }
  return { added, updated, unchanged };
}

function joinLabel(...parts: (string | undefined | null)[]): string {
  return parts.map((p) => p?.trim()).filter(Boolean).join(' · ');
}

function labelForDeletedId(
  local: AppState,
  kind: ImportChangeKind,
  id: string
): string {
  switch (kind) {
    case 'property':
      return local.properties.find((p) => p.id === id)?.name ?? 'Property';
    case 'room': {
      const room = local.rooms.find((r) => r.id === id);
      if (!room) return 'Room';
      const property = local.properties.find((p) => p.id === room.propertyId);
      return joinLabel(property?.name, room.name) || 'Room';
    }
    case 'item': {
      const item = local.items.find((i) => i.id === id);
      if (!item) return 'Asset';
      const room = local.rooms.find((r) => r.id === item.roomId);
      return joinLabel(room?.name, itemDisplayLabel(item)) || 'Asset';
    }
    case 'event': {
      const event = local.events.find((e) => e.id === id);
      if (!event) return 'Event';
      const item = local.items.find((i) => i.id === event.itemId);
      return joinLabel(item ? itemDisplayLabel(item) : undefined, event.title) || 'Event';
    }
    case 'project':
      return local.projects.find((p) => p.id === id)?.name ?? 'Project';
    case 'vendor': {
      const vendor = local.projectVendors.find((v) => v.id === id);
      if (!vendor) return 'Vendor';
      const project = local.projects.find((p) => p.id === vendor.projectId);
      return joinLabel(project?.name, vendor.name) || 'Vendor';
    }
    case 'interaction': {
      const interaction = local.vendorInteractions.find((i) => i.id === id);
      if (!interaction) return 'Interaction';
      const vendor = interaction.vendorId
        ? local.projectVendors.find((v) => v.id === interaction.vendorId)
        : undefined;
      return (
        joinLabel(
          vendor?.name ?? interaction.contactName,
          vendorContactMethodLabel(interaction.contactMethod),
          formatDisplayDate(interaction.occurredAtISO)
        ) || 'Interaction'
      );
    }
    case 'todo': {
      const todo = (local.propertyTodos ?? []).find((t) => t.id === id);
      return todo?.title?.trim() || 'To-do';
    }
    case 'punch': {
      const item = (local.projectPunchItems ?? []).find((t) => t.id === id);
      return item?.title?.trim() || 'Punch item';
    }
    case 'photo': {
      return labelForPhoto(local, null, id);
    }
    case 'document': {
      const document = local.documents.find((d) => d.id === id);
      return document?.fileName?.trim() || 'Document';
    }
    default:
      return 'Record';
  }
}

function labelForPhoto(local: AppState, incoming: AppState | null, id: string): string {
  const states = incoming ? [incoming, local] : [local];

  for (const state of states) {
    const itemPhoto = state.photos.find((p) => p.id === id);
    if (itemPhoto) {
      const item =
        (incoming?.items.find((i) => i.id === itemPhoto.itemId) ??
          local.items.find((i) => i.id === itemPhoto.itemId));
      const room = item
        ? (incoming?.rooms.find((r) => r.id === item.roomId) ??
          local.rooms.find((r) => r.id === item.roomId))
        : undefined;
      if (itemPhoto.eventId) {
        const event =
          incoming?.events.find((e) => e.id === itemPhoto.eventId) ??
          local.events.find((e) => e.id === itemPhoto.eventId);
        return (
          joinLabel(
            'Event photo',
            item ? itemDisplayLabel(item) : undefined,
            event?.title,
            itemPhoto.caption
          ) || 'Event photo'
        );
      }
      return (
        joinLabel(
          'Asset photo',
          room?.name,
          item ? itemDisplayLabel(item) : undefined,
          itemPhoto.caption
        ) || 'Asset photo'
      );
    }

    const propertyPhoto = state.propertyPhotos.find((p) => p.id === id);
    if (propertyPhoto) {
      const property =
        incoming?.properties.find((p) => p.id === propertyPhoto.propertyId) ??
        local.properties.find((p) => p.id === propertyPhoto.propertyId);
      if (propertyPhoto.todoId) {
        const todo =
          (incoming?.propertyTodos ?? []).find((t) => t.id === propertyPhoto.todoId) ??
          (local.propertyTodos ?? []).find((t) => t.id === propertyPhoto.todoId);
        return (
          joinLabel(
            'To-do photo',
            property?.name,
            todo?.title,
            propertyPhoto.caption
          ) || 'To-do photo'
        );
      }
      return (
        joinLabel('Property photo', property?.name, propertyPhoto.caption) || 'Property photo'
      );
    }

    const roomPhoto = state.roomPhotos.find((p) => p.id === id);
    if (roomPhoto) {
      const room =
        incoming?.rooms.find((r) => r.id === roomPhoto.roomId) ??
        local.rooms.find((r) => r.id === roomPhoto.roomId);
      const property = room
        ? (incoming?.properties.find((p) => p.id === room.propertyId) ??
          local.properties.find((p) => p.id === room.propertyId))
        : undefined;
      return (
        joinLabel('Room photo', property?.name, room?.name, roomPhoto.caption) || 'Room photo'
      );
    }

    const projectPhoto = state.projectPhotos.find((p) => p.id === id);
    if (projectPhoto) {
      const project =
        incoming?.projects.find((p) => p.id === projectPhoto.projectId) ??
        local.projects.find((p) => p.id === projectPhoto.projectId);
      return (
        joinLabel('Project photo', project?.name, projectPhoto.caption) || 'Project photo'
      );
    }

    const vendorPhoto = state.vendorPhotos.find((p) => p.id === id);
    if (vendorPhoto) {
      const vendor =
        incoming?.projectVendors.find((v) => v.id === vendorPhoto.vendorId) ??
        local.projectVendors.find((v) => v.id === vendorPhoto.vendorId);
      if (vendorPhoto.interactionId) {
        const interaction =
          incoming?.vendorInteractions.find((i) => i.id === vendorPhoto.interactionId) ??
          local.vendorInteractions.find((i) => i.id === vendorPhoto.interactionId);
        return (
          joinLabel(
            'Interaction photo',
            vendor?.name,
            interaction ? vendorContactMethodLabel(interaction.contactMethod) : undefined,
            interaction ? formatDisplayDate(interaction.occurredAtISO) : undefined,
            vendorPhoto.caption
          ) || 'Interaction photo'
        );
      }
      return joinLabel('Vendor photo', vendor?.name, vendorPhoto.caption) || 'Vendor photo';
    }
  }

  return 'Photo';
}

function labelForIncoming(
  local: AppState,
  incoming: AppState,
  kind: ImportChangeKind,
  id: string
): string {
  switch (kind) {
    case 'property':
      return (
        incoming.properties.find((p) => p.id === id)?.name ??
        local.properties.find((p) => p.id === id)?.name ??
        'Property'
      );
    case 'room': {
      const room =
        incoming.rooms.find((r) => r.id === id) ?? local.rooms.find((r) => r.id === id);
      if (!room) return 'Room';
      const property =
        incoming.properties.find((p) => p.id === room.propertyId) ??
        local.properties.find((p) => p.id === room.propertyId);
      return joinLabel(property?.name, room.name) || 'Room';
    }
    case 'item': {
      const item =
        incoming.items.find((i) => i.id === id) ?? local.items.find((i) => i.id === id);
      if (!item) return 'Asset';
      const room =
        incoming.rooms.find((r) => r.id === item.roomId) ??
        local.rooms.find((r) => r.id === item.roomId);
      return joinLabel(room?.name, itemDisplayLabel(item)) || 'Asset';
    }
    case 'event': {
      const event =
        incoming.events.find((e) => e.id === id) ?? local.events.find((e) => e.id === id);
      if (!event) return 'Event';
      const item =
        incoming.items.find((i) => i.id === event.itemId) ??
        local.items.find((i) => i.id === event.itemId);
      return joinLabel(item ? itemDisplayLabel(item) : undefined, event.title) || 'Event';
    }
    case 'project':
      return (
        incoming.projects.find((p) => p.id === id)?.name ??
        local.projects.find((p) => p.id === id)?.name ??
        'Project'
      );
    case 'vendor': {
      const vendor =
        incoming.projectVendors.find((v) => v.id === id) ??
        local.projectVendors.find((v) => v.id === id);
      if (!vendor) return 'Vendor';
      const project =
        incoming.projects.find((p) => p.id === vendor.projectId) ??
        local.projects.find((p) => p.id === vendor.projectId);
      return joinLabel(project?.name, vendor.name) || 'Vendor';
    }
    case 'interaction': {
      const interaction =
        incoming.vendorInteractions.find((i) => i.id === id) ??
        local.vendorInteractions.find((i) => i.id === id);
      if (!interaction) return 'Interaction';
      const vendor = interaction.vendorId
        ? (incoming.projectVendors.find((v) => v.id === interaction.vendorId) ??
          local.projectVendors.find((v) => v.id === interaction.vendorId))
        : undefined;
      return (
        joinLabel(
          vendor?.name ?? interaction.contactName,
          vendorContactMethodLabel(interaction.contactMethod),
          formatDisplayDate(interaction.occurredAtISO)
        ) || 'Interaction'
      );
    }
    case 'todo': {
      const todo =
        (incoming.propertyTodos ?? []).find((t) => t.id === id) ??
        (local.propertyTodos ?? []).find((t) => t.id === id);
      return todo?.title?.trim() || 'To-do';
    }
    case 'punch': {
      const item =
        (incoming.projectPunchItems ?? []).find((t) => t.id === id) ??
        (local.projectPunchItems ?? []).find((t) => t.id === id);
      return item?.title?.trim() || 'Punch item';
    }
    case 'photo': {
      return labelForPhoto(local, incoming, id);
    }
    case 'document': {
      const document =
        incoming.documents.find((d) => d.id === id) ??
        local.documents.find((d) => d.id === id);
      return document?.fileName?.trim() || 'Document';
    }
    default:
      return 'Record';
  }
}

function pushClassified(
  entries: ImportChangeEntry[],
  summary: ImportPreviewSummary,
  local: AppState,
  incoming: AppState,
  kind: ImportChangeKind,
  localRows: TimedRecord[],
  incomingRows: TimedRecord[]
) {
  const { added, updated, unchanged } = classifyUpsert(localRows, incomingRows);
  summary.added += added.length;
  summary.updated += updated.length;
  summary.unchanged += unchanged.length;
  for (const row of added) {
    entries.push({
      action: 'added',
      kind,
      id: row.id,
      label: labelForIncoming(local, incoming, kind, row.id),
    });
  }
  for (const row of updated) {
    entries.push({
      action: 'updated',
      kind,
      id: row.id,
      label: labelForIncoming(local, incoming, kind, row.id),
    });
  }
}

function pushDeleted(
  entries: ImportChangeEntry[],
  local: AppState,
  kind: ImportChangeKind,
  ids: string[] | undefined
) {
  for (const id of ids ?? []) {
    entries.push({
      action: 'deleted',
      kind,
      id,
      label: labelForDeletedId(local, kind, id),
    });
  }
}

/**
 * Dry-run of collaborative merge: counts plus labeled added/updated/deleted entries.
 * Does not mutate app state.
 */
export function previewCollaborativeImport(
  local: AppState,
  incoming: AppState,
  deletedIds: SyncDeletedIds = {}
): ImportPreviewResult {
  const summary: ImportPreviewSummary = {
    added: 0,
    updated: 0,
    unchanged: 0,
    deleted: countDeletedIds(deletedIds),
  };
  const entries: ImportChangeEntry[] = [];

  pushClassified(entries, summary, local, incoming, 'property', local.properties, incoming.properties);
  pushClassified(entries, summary, local, incoming, 'room', local.rooms, incoming.rooms);
  pushClassified(entries, summary, local, incoming, 'item', local.items, incoming.items);
  pushClassified(entries, summary, local, incoming, 'event', local.events, incoming.events);
  pushClassified(entries, summary, local, incoming, 'project', local.projects, incoming.projects ?? []);
  pushClassified(
    entries,
    summary,
    local,
    incoming,
    'vendor',
    local.projectVendors,
    incoming.projectVendors ?? []
  );
  pushClassified(
    entries,
    summary,
    local,
    incoming,
    'interaction',
    local.vendorInteractions,
    incoming.vendorInteractions ?? []
  );
  pushClassified(
    entries,
    summary,
    local,
    incoming,
    'todo',
    local.propertyTodos ?? [],
    incoming.propertyTodos ?? []
  );
  pushClassified(
    entries,
    summary,
    local,
    incoming,
    'punch',
    local.projectPunchItems ?? [],
    incoming.projectPunchItems ?? []
  );

  const localPhotos = [
    ...local.photos,
    ...local.propertyPhotos,
    ...local.roomPhotos,
    ...local.projectPhotos,
    ...local.vendorPhotos,
  ];
  const incomingPhotos = [
    ...incoming.photos,
    ...(incoming.propertyPhotos ?? []),
    ...(incoming.roomPhotos ?? []),
    ...(incoming.projectPhotos ?? []),
    ...(incoming.vendorPhotos ?? []),
  ];
  pushClassified(entries, summary, local, incoming, 'photo', localPhotos, incomingPhotos);
  pushClassified(
    entries,
    summary,
    local,
    incoming,
    'document',
    local.documents,
    incoming.documents ?? []
  );

  pushDeleted(entries, local, 'property', deletedIds.properties);
  pushDeleted(entries, local, 'room', deletedIds.rooms);
  pushDeleted(entries, local, 'item', deletedIds.items);
  pushDeleted(entries, local, 'event', deletedIds.events);
  pushDeleted(entries, local, 'project', deletedIds.projects);
  pushDeleted(entries, local, 'vendor', deletedIds.projectVendors);
  pushDeleted(entries, local, 'interaction', deletedIds.vendorInteractions);
  pushDeleted(entries, local, 'todo', deletedIds.propertyTodos);
  pushDeleted(entries, local, 'punch', deletedIds.projectPunchItems);
  pushDeleted(entries, local, 'photo', [
    ...(deletedIds.photos ?? []),
    ...(deletedIds.propertyPhotos ?? []),
    ...(deletedIds.roomPhotos ?? []),
    ...(deletedIds.projectPhotos ?? []),
    ...(deletedIds.vendorPhotos ?? []),
  ]);
  pushDeleted(entries, local, 'document', deletedIds.documents);

  const actionOrder: Record<ImportChangeAction, number> = {
    added: 0,
    updated: 1,
    deleted: 2,
  };
  entries.sort((a, b) => {
    const byAction = actionOrder[a.action] - actionOrder[b.action];
    if (byAction !== 0) return byAction;
    const byKind = (a.kind ?? '').localeCompare(b.kind ?? '');
    if (byKind !== 0) return byKind;
    return (a.label ?? '').localeCompare(b.label ?? '');
  });

  return { summary, entries };
}

function upsertById<T extends { id: string; updatedAtISO?: string; createdAtISO?: string }>(
  local: T[],
  incoming: T[],
  summary: CollaborativeMergeSummary
): T[] {
  const map = new Map(local.filter((r) => r && typeof r.id === 'string').map((r) => [r.id, r]));
  for (const remote of incoming) {
    if (!remote || typeof remote.id !== 'string') continue;
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
    propertyTodos: new Set(deleted.propertyTodos ?? []),
    projectPunchItems: new Set(deleted.projectPunchItems ?? []),
    projectComplainants: new Set(deleted.projectComplainants ?? []),
    blightMinutes: new Set(deleted.blightMinutes ?? []),
    homeDocuments: new Set(deleted.homeDocuments ?? []),
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
    propertyTodos: (state.propertyTodos ?? []).filter((t) => !drop.propertyTodos.has(t.id)),
    projectPunchItems: (state.projectPunchItems ?? []).filter(
      (t) => !drop.projectPunchItems.has(t.id)
    ),
    projectComplainants: (state.projectComplainants ?? []).filter(
      (c) => !drop.projectComplainants.has(c.id)
    ),
    blightMinutes: (state.blightMinutes ?? []).filter((m) => !drop.blightMinutes.has(m.id)),
    homeDocuments: (state.homeDocuments ?? []).filter((d) => !drop.homeDocuments.has(d.id)),
    useCases: state.useCases ?? normalizeUseCases(state.useCases),
    pins: livingPins({
      ...state,
      properties: state.properties.filter((p) => !drop.properties.has(p.id)),
      rooms: state.rooms.filter((r) => !drop.rooms.has(r.id)),
      items: state.items.filter((i) => !drop.items.has(i.id)),
      events: state.events.filter((e) => !drop.events.has(e.id)),
      projectVendors: state.projectVendors.filter((v) => !drop.projectVendors.has(v.id)),
      vendorInteractions: state.vendorInteractions.filter(
        (i) => !drop.vendorInteractions.has(i.id)
      ),
      propertyTodos: (state.propertyTodos ?? []).filter((t) => !drop.propertyTodos.has(t.id)),
      projectPunchItems: (state.projectPunchItems ?? []).filter(
        (t) => !drop.projectPunchItems.has(t.id)
      ),
    }),
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
    propertyTodos: upsertById(local.propertyTodos ?? [], incoming.propertyTodos ?? [], summary),
    projectPunchItems: upsertById(
      local.projectPunchItems ?? [],
      incoming.projectPunchItems ?? [],
      summary
    ),
    projectComplainants: upsertById(
      local.projectComplainants ?? [],
      incoming.projectComplainants ?? [],
      summary
    ),
    blightMinutes: upsertById(
      local.blightMinutes ?? [],
      incoming.blightMinutes ?? [],
      summary
    ),
    homeDocuments: upsertById(
      local.homeDocuments ?? [],
      incoming.homeDocuments ?? [],
      summary
    ),
    useCases: mergeUseCases(local.useCases, incoming.useCases),
    pins: mergePins(local.pins ?? [], normalizePins(incoming.pins)),
  };

  if (countDeletedIds(deletedIds) > 0) {
    merged = applyDeletedIds(merged, deletedIds);
  }

  return { state: merged, summary };
}

export function replaceImportState(incoming: AppState): AppState {
  return incoming.version === 1 ? incoming : { ...EMPTY_APP_STATE };
}

/** Wipe one local property, then insert the incoming slice (other properties untouched). */
export function replacePropertyImportState(
  local: AppState,
  incoming: AppState,
  propertyId: string,
  deletedIds: SyncDeletedIds = {}
): AppState {
  const without = deletePropertyCascade(local, propertyId);
  return mergeCollaborativeState(without, incoming, deletedIds).state;
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
    (state.propertyTodos?.length ?? 0) &&
      `${state.propertyTodos!.length} to-do${state.propertyTodos!.length === 1 ? '' : 's'}`,
    (state.projectPunchItems?.length ?? 0) &&
      `${state.projectPunchItems!.length} punch item${state.projectPunchItems!.length === 1 ? '' : 's'}`,
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
