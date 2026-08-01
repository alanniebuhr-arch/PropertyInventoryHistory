import type { AppState } from './types';

export type PhotoReorderDirection = 'left' | 'right';

/**
 * Swap `photoId` one step among freeform extras, leaving reserved/slot ids in place.
 * `extraIdsInOrder` should match the visible extra strip order (subset of `photoIds`).
 */
export function reorderExtrasInPhotoIds(
  photoIds: readonly string[],
  extraIdsInOrder: readonly string[],
  photoId: string,
  direction: PhotoReorderDirection
): string[] {
  const extraSet = new Set(extraIdsInOrder);
  const presentExtras = photoIds.filter((id) => extraSet.has(id));
  const index = presentExtras.indexOf(photoId);
  if (index < 0) return [...photoIds];
  const swap = direction === 'left' ? index - 1 : index + 1;
  if (swap < 0 || swap >= presentExtras.length) return [...photoIds];
  const nextExtras = [...presentExtras];
  const current = nextExtras[index]!;
  nextExtras[index] = nextExtras[swap]!;
  nextExtras[swap] = current;
  let i = 0;
  return photoIds.map((id) => (extraSet.has(id) ? nextExtras[i++]! : id));
}

/** Reorder objects by id, optionally restricting which entries can move. */
export function reorderItemsById<T extends { id: string }>(
  items: readonly T[],
  id: string,
  direction: PhotoReorderDirection,
  isMovable: (item: T) => boolean = () => true
): T[] {
  const ids = items.map((item) => item.id);
  const movableIds = items.filter(isMovable).map((item) => item.id);
  const nextIds = reorderExtrasInPhotoIds(ids, movableIds, id, direction);
  const byId = new Map(items.map((item) => [item.id, item]));
  return nextIds.map((nextId) => byId.get(nextId)!).filter(Boolean);
}

export function withReorderedItemPhotoIds(
  state: AppState,
  itemId: string,
  photoId: string,
  direction: PhotoReorderDirection,
  extraPhotoIds: readonly string[]
): AppState {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return state;
  const nextPhotoIds = reorderExtrasInPhotoIds(
    item.photoIds,
    extraPhotoIds,
    photoId,
    direction
  );
  if (nextPhotoIds.every((id, index) => id === item.photoIds[index])) return state;
  return {
    ...state,
    items: state.items.map((entry) =>
      entry.id === itemId ? { ...entry, photoIds: nextPhotoIds } : entry
    ),
  };
}

export function withReorderedPropertyPhotoIds(
  state: AppState,
  propertyId: string,
  photoId: string,
  direction: PhotoReorderDirection,
  extraPhotoIds: readonly string[]
): AppState {
  const property = state.properties.find((entry) => entry.id === propertyId);
  if (!property) return state;
  const currentIds = property.photoIds ?? [];
  const nextPhotoIds = reorderExtrasInPhotoIds(
    currentIds,
    extraPhotoIds,
    photoId,
    direction
  );
  if (nextPhotoIds.every((id, index) => id === currentIds[index])) return state;
  return {
    ...state,
    properties: state.properties.map((entry) =>
      entry.id === propertyId ? { ...entry, photoIds: nextPhotoIds } : entry
    ),
  };
}

export function withReorderedRoomPhotoIds(
  state: AppState,
  roomId: string,
  photoId: string,
  direction: PhotoReorderDirection,
  extraPhotoIds: readonly string[]
): AppState {
  const room = state.rooms.find((entry) => entry.id === roomId);
  if (!room) return state;
  const nextPhotoIds = reorderExtrasInPhotoIds(
    room.photoIds,
    extraPhotoIds,
    photoId,
    direction
  );
  if (nextPhotoIds.every((id, index) => id === room.photoIds[index])) return state;
  return {
    ...state,
    rooms: state.rooms.map((entry) =>
      entry.id === roomId ? { ...entry, photoIds: nextPhotoIds } : entry
    ),
  };
}

export function withReorderedVendorPhotoIds(
  state: AppState,
  vendorId: string,
  photoId: string,
  direction: PhotoReorderDirection,
  extraPhotoIds: readonly string[]
): AppState {
  const vendor = state.projectVendors.find((entry) => entry.id === vendorId);
  if (!vendor) return state;
  const nextPhotoIds = reorderExtrasInPhotoIds(
    vendor.photoIds,
    extraPhotoIds,
    photoId,
    direction
  );
  if (nextPhotoIds.every((id, index) => id === vendor.photoIds[index])) return state;
  return {
    ...state,
    projectVendors: state.projectVendors.map((entry) =>
      entry.id === vendorId ? { ...entry, photoIds: nextPhotoIds } : entry
    ),
  };
}

export function withReorderedProjectPhotoIds(
  state: AppState,
  projectId: string,
  photoId: string,
  direction: PhotoReorderDirection,
  extraPhotoIds: readonly string[]
): AppState {
  const project = state.projects.find((entry) => entry.id === projectId);
  if (!project) return state;
  const nextPhotoIds = reorderExtrasInPhotoIds(
    project.photoIds,
    extraPhotoIds,
    photoId,
    direction
  );
  if (nextPhotoIds.every((id, index) => id === project.photoIds[index])) return state;
  return {
    ...state,
    projects: state.projects.map((entry) =>
      entry.id === projectId ? { ...entry, photoIds: nextPhotoIds } : entry
    ),
  };
}
