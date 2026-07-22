import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppState, SyncDeletedIds } from './types';

const DELETED_IDS_KEY = 'pih.syncDeletedIds.v1';

type DeletedIdsByProperty = Record<string, SyncDeletedIds>;

const EMPTY_DELETED: SyncDeletedIds = {};

function mergeIdLists(a: string[] | undefined, b: string[] | undefined): string[] | undefined {
  if (!a?.length && !b?.length) return undefined;
  return [...new Set([...(a ?? []), ...(b ?? [])])];
}

export function mergeDeletedIds(a: SyncDeletedIds, b: SyncDeletedIds): SyncDeletedIds {
  return {
    properties: mergeIdLists(a.properties, b.properties),
    rooms: mergeIdLists(a.rooms, b.rooms),
    items: mergeIdLists(a.items, b.items),
    photos: mergeIdLists(a.photos, b.photos),
    propertyPhotos: mergeIdLists(a.propertyPhotos, b.propertyPhotos),
    roomPhotos: mergeIdLists(a.roomPhotos, b.roomPhotos),
    documents: mergeIdLists(a.documents, b.documents),
    events: mergeIdLists(a.events, b.events),
    projects: mergeIdLists(a.projects, b.projects),
    projectVendors: mergeIdLists(a.projectVendors, b.projectVendors),
    projectPhotos: mergeIdLists(a.projectPhotos, b.projectPhotos),
    vendorPhotos: mergeIdLists(a.vendorPhotos, b.vendorPhotos),
    vendorInteractions: mergeIdLists(a.vendorInteractions, b.vendorInteractions),
  };
}

export function countDeletedIds(deleted: SyncDeletedIds): number {
  return (
    (deleted.properties?.length ?? 0) +
    (deleted.rooms?.length ?? 0) +
    (deleted.items?.length ?? 0) +
    (deleted.photos?.length ?? 0) +
    (deleted.propertyPhotos?.length ?? 0) +
    (deleted.roomPhotos?.length ?? 0) +
    (deleted.documents?.length ?? 0) +
    (deleted.events?.length ?? 0) +
    (deleted.projects?.length ?? 0) +
    (deleted.projectVendors?.length ?? 0) +
    (deleted.projectPhotos?.length ?? 0) +
    (deleted.vendorPhotos?.length ?? 0) +
    (deleted.vendorInteractions?.length ?? 0)
  );
}

async function loadAllDeleted(): Promise<DeletedIdsByProperty> {
  try {
    const raw = await AsyncStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DeletedIdsByProperty;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function saveAllDeleted(map: DeletedIdsByProperty): Promise<void> {
  await AsyncStorage.setItem(DELETED_IDS_KEY, JSON.stringify(map));
}

export async function getPendingDeletedIds(propertyId: string): Promise<SyncDeletedIds> {
  const all = await loadAllDeleted();
  return all[propertyId] ?? { ...EMPTY_DELETED };
}

export async function appendPendingDeletedIds(
  propertyId: string,
  deleted: SyncDeletedIds
): Promise<void> {
  if (countDeletedIds(deleted) === 0) return;
  const all = await loadAllDeleted();
  all[propertyId] = mergeDeletedIds(all[propertyId] ?? {}, deleted);
  await saveAllDeleted(all);
}

export async function clearPendingDeletedIds(propertyId: string): Promise<void> {
  const all = await loadAllDeleted();
  if (!(propertyId in all)) return;
  delete all[propertyId];
  await saveAllDeleted(all);
}

export async function clearAllPendingDeletedIds(): Promise<void> {
  await saveAllDeleted({});
}

type IdRecord = { id: string };

function missingIds(prev: IdRecord[], next: IdRecord[]): string[] {
  const nextIds = new Set(next.map((r) => r.id));
  return prev.filter((r) => !nextIds.has(r.id)).map((r) => r.id);
}

/** Infer which property owns a room. */
function propertyIdForRoom(state: AppState, roomId: string): string | undefined {
  return state.rooms.find((r) => r.id === roomId)?.propertyId;
}

function propertyIdForItem(state: AppState, itemId: string): string | undefined {
  const item = state.items.find((i) => i.id === itemId);
  return item ? propertyIdForRoom(state, item.roomId) : undefined;
}

function propertyIdForProject(state: AppState, projectId: string): string | undefined {
  return state.projects.find((p) => p.id === projectId)?.propertyId;
}

function propertyIdForVendor(state: AppState, vendorId: string): string | undefined {
  const vendor = state.projectVendors.find((v) => v.id === vendorId);
  return vendor ? propertyIdForProject(state, vendor.projectId) : undefined;
}

function addToMap(
  map: Map<string, SyncDeletedIds>,
  propertyId: string | undefined,
  key: keyof SyncDeletedIds,
  ids: string[]
) {
  if (!propertyId || ids.length === 0) return;
  const current = map.get(propertyId) ?? {};
  const prevList = current[key] ?? [];
  map.set(propertyId, { ...current, [key]: [...new Set([...prevList, ...ids])] });
}

/**
 * Compare previous and next app state; return deleted IDs grouped by property.
 * Uses the previous state for ownership lookup.
 */
export function inferDeletedIdsByProperty(
  prev: AppState,
  next: AppState
): Map<string, SyncDeletedIds> {
  const map = new Map<string, SyncDeletedIds>();

  for (const id of missingIds(prev.properties, next.properties)) {
    addToMap(map, id, 'properties', [id]);
  }
  for (const room of prev.rooms) {
    if (!next.rooms.some((r) => r.id === room.id)) {
      addToMap(map, room.propertyId, 'rooms', [room.id]);
    }
  }
  for (const item of prev.items) {
    if (!next.items.some((i) => i.id === item.id)) {
      addToMap(map, propertyIdForItem(prev, item.id), 'items', [item.id]);
    }
  }
  for (const photo of prev.photos) {
    if (!next.photos.some((p) => p.id === photo.id)) {
      addToMap(map, propertyIdForItem(prev, photo.itemId), 'photos', [photo.id]);
    }
  }
  for (const photo of prev.propertyPhotos) {
    if (!next.propertyPhotos.some((p) => p.id === photo.id)) {
      addToMap(map, photo.propertyId, 'propertyPhotos', [photo.id]);
    }
  }
  for (const photo of prev.roomPhotos) {
    if (!next.roomPhotos.some((p) => p.id === photo.id)) {
      addToMap(map, propertyIdForRoom(prev, photo.roomId), 'roomPhotos', [photo.id]);
    }
  }
  for (const doc of prev.documents) {
    if (!next.documents.some((d) => d.id === doc.id)) {
      // Documents can belong to several parents; tag under every property that referenced them.
      for (const property of prev.properties) {
        const sliceIds = new Set(
          [
            property.frontDocumentId,
            property.leftSideDocumentId,
            property.rightSideDocumentId,
            property.backDocumentId,
            property.fieldCardDocumentId,
            property.plotPlanDocumentId,
          ].filter(Boolean) as string[]
        );
        for (const room of prev.rooms.filter((r) => r.propertyId === property.id)) {
          for (const att of Object.values(room.slotAttachments ?? {})) {
            if (att?.kind === 'document') sliceIds.add(att.id);
          }
        }
        for (const item of prev.items.filter((i) =>
          prev.rooms.some((r) => r.id === i.roomId && r.propertyId === property.id)
        )) {
          for (const id of item.documentIds ?? []) sliceIds.add(id);
        }
        for (const project of prev.projects.filter((p) => p.propertyId === property.id)) {
          for (const vendor of prev.projectVendors.filter((v) => v.projectId === project.id)) {
            for (const id of vendor.documentIds ?? []) sliceIds.add(id);
          }
        }
        if (sliceIds.has(doc.id)) addToMap(map, property.id, 'documents', [doc.id]);
      }
    }
  }
  for (const event of prev.events) {
    if (!next.events.some((e) => e.id === event.id)) {
      addToMap(map, propertyIdForItem(prev, event.itemId), 'events', [event.id]);
    }
  }
  for (const project of prev.projects) {
    if (!next.projects.some((p) => p.id === project.id)) {
      addToMap(map, project.propertyId, 'projects', [project.id]);
    }
  }
  for (const vendor of prev.projectVendors) {
    if (!next.projectVendors.some((v) => v.id === vendor.id)) {
      addToMap(map, propertyIdForProject(prev, vendor.projectId), 'projectVendors', [vendor.id]);
    }
  }
  for (const photo of prev.projectPhotos) {
    if (!next.projectPhotos.some((p) => p.id === photo.id)) {
      addToMap(map, propertyIdForProject(prev, photo.projectId), 'projectPhotos', [photo.id]);
    }
  }
  for (const photo of prev.vendorPhotos) {
    if (!next.vendorPhotos.some((p) => p.id === photo.id)) {
      addToMap(map, propertyIdForVendor(prev, photo.vendorId), 'vendorPhotos', [photo.id]);
    }
  }
  for (const interaction of prev.vendorInteractions) {
    if (!next.vendorInteractions.some((i) => i.id === interaction.id)) {
      addToMap(
        map,
        propertyIdForVendor(prev, interaction.vendorId),
        'vendorInteractions',
        [interaction.id]
      );
    }
  }

  return map;
}

export async function recordInferredDeletions(prev: AppState, next: AppState): Promise<void> {
  const prevIds = new Set(prev.properties.map((p) => p.id));
  const nextIds = new Set(next.properties.map((p) => p.id));
  const overlap = [...prevIds].some((id) => nextIds.has(id));
  if (prev.properties.length > 0 && next.properties.length > 0 && !overlap) {
    // Likely a full Replace import — reset delete tracking instead of accumulating.
    await clearAllPendingDeletedIds();
    return;
  }
  if (prev.properties.length > 0 && next.properties.length === 0) {
    await clearAllPendingDeletedIds();
    return;
  }

  const byProperty = inferDeletedIdsByProperty(prev, next);
  for (const [propertyId, deleted] of byProperty) {
    await appendPendingDeletedIds(propertyId, deleted);
  }
}
