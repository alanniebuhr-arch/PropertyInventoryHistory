import type { AppState, InventoryItem, ItemDetails, Property, Room } from './types';
import { PROPERTY_PHOTO_SLOTS } from './propertyPhotoSlots';

/** Matches `VENDOR_IMAGE_CAPTION` in vendorPhotos.ts (kept local to avoid RN import cycle). */
const VENDOR_IMAGE_CAPTION = 'vendor_image';

export type PhotoReorderDirection = 'left' | 'right';

function toIdSet(ids?: ReadonlySet<string> | readonly string[]): Set<string> {
  if (!ids) return new Set();
  return ids instanceof Set ? ids : new Set(ids);
}

/** Slot photo ids on a property (never movable). */
export function propertyImmovablePhotoIds(property: Property): Set<string> {
  const ids = new Set<string>();
  for (const slot of PROPERTY_PHOTO_SLOTS) {
    const photoId = property[slot.key];
    if (photoId) ids.add(photoId);
  }
  return ids;
}

/** Slot attachment photo ids on a room (never movable). */
export function roomImmovablePhotoIds(room: Room): Set<string> {
  const ids = new Set<string>();
  for (const attachment of Object.values(room.slotAttachments ?? {})) {
    if (attachment?.kind === 'photo' && attachment.id) ids.add(attachment.id);
  }
  return ids;
}

/**
 * Item details `*PhotoId` fields are reserved slots and never movable.
 * Ignores `kind` and non-string / empty values.
 */
export function itemImmovablePhotoIds(details: ItemDetails): Set<string> {
  const ids = new Set<string>();
  for (const [key, value] of Object.entries(details)) {
    if (key === 'kind') continue;
    if (key.endsWith('PhotoId') && typeof value === 'string' && value.length > 0) {
      ids.add(value);
    }
  }
  return ids;
}

function itemImmovablePhotoIdsFromItem(item: InventoryItem): Set<string> {
  return itemImmovablePhotoIds(item.details);
}

/** Vendor image (caption `vendor_image`) is reserved and never movable. */
export function vendorImmovablePhotoIds(state: AppState, vendorId: string): Set<string> {
  const vendor = state.projectVendors.find((entry) => entry.id === vendorId);
  if (!vendor) return new Set();
  const ids = new Set<string>();
  for (const photoId of vendor.photoIds) {
    const photo = state.vendorPhotos.find((entry) => entry.id === photoId);
    if (photo && photo.caption?.trim() === VENDOR_IMAGE_CAPTION) ids.add(photo.id);
  }
  return ids;
}

/**
 * Swap `photoId` one step among freeform extras, leaving reserved/slot ids in place.
 * `extraIdsInOrder` should match the visible extra strip order (subset of `photoIds`).
 * Any id in `immovableIds` is stripped from the movable set even if listed in extras.
 */
export function reorderExtrasInPhotoIds(
  photoIds: readonly string[],
  extraIdsInOrder: readonly string[],
  photoId: string,
  direction: PhotoReorderDirection,
  immovableIds?: ReadonlySet<string> | readonly string[]
): string[] {
  const immovable = toIdSet(immovableIds);
  if (immovable.has(photoId)) return [...photoIds];
  const extraSet = new Set(extraIdsInOrder.filter((id) => !immovable.has(id)));
  const presentExtras = photoIds.filter((id) => extraSet.has(id));
  const index = presentExtras.indexOf(photoId);
  if (index < 0 || presentExtras.length < 2) return [...photoIds];
  const delta = direction === 'left' ? -1 : 1;
  const swap = (index + delta + presentExtras.length) % presentExtras.length;
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
    direction,
    itemImmovablePhotoIdsFromItem(item)
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
    direction,
    propertyImmovablePhotoIds(property)
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
    direction,
    roomImmovablePhotoIds(room)
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
    direction,
    vendorImmovablePhotoIds(state, vendorId)
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
