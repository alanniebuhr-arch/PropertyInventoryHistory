import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AppState,
  FurnaceDetails,
  InventoryItem,
  ItemDetails,
  ItemEvent,
  ItemPhoto,
  ItemTypeId,
  Property,
  Room,
} from './types';
import { EMPTY_APP_STATE } from './types';
import { defaultDetailsForType } from './itemCatalog';
import { APPLIANCE_PHOTO_SLOTS } from './applianceSlots';

const STORAGE_KEY = 'property_inventory_state_v1';

function normalizeFurnaceDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'furnace') return defaultDetailsForType('furnace');
  const legacy = details as FurnaceDetails & { modelSerial?: string; installYear?: string };
  return {
    kind: 'furnace',
    make: details.make,
    fuelType: details.fuelType,
    modelNumber: details.modelNumber ?? legacy.modelSerial,
    serialNumber: details.serialNumber,
    filterSize: details.filterSize,
    installDateAtISO: details.installDateAtISO ?? legacy.installYear,
    installerName: details.installerName,
    installerPhone: details.installerPhone,
  };
}

function normalizeDetails(itemTypeId: ItemTypeId, details: ItemDetails): ItemDetails {
  if (itemTypeId === 'furnace') return normalizeFurnaceDetails(details);
  const expectedKind = itemTypeId === 'other' ? 'other' : itemTypeId;
  if (details.kind === expectedKind) return details;
  return defaultDetailsForType(itemTypeId);
}

function normalizeItem(raw: InventoryItem): InventoryItem {
  const itemTypeId = raw.itemTypeId ?? 'other';
  return {
    id: raw.id,
    roomId: raw.roomId,
    itemTypeId,
    displayName: raw.displayName,
    details: normalizeDetails(itemTypeId, raw.details ?? defaultDetailsForType(itemTypeId)),
    photoIds: Array.isArray(raw.photoIds) ? raw.photoIds : [],
    createdAtISO: raw.createdAtISO ?? new Date().toISOString(),
  };
}

function normalizeEvent(raw: ItemEvent): ItemEvent {
  return {
    ...raw,
    photoIds: Array.isArray(raw.photoIds) ? raw.photoIds : [],
  };
}

function normalizeState(raw: Partial<AppState> | null | undefined): AppState {
  if (!raw || raw.version !== 1) return { ...EMPTY_APP_STATE };

  const properties = Array.isArray(raw.properties) ? raw.properties : [];
  const rooms = Array.isArray(raw.rooms) ? raw.rooms : [];
  const items = (Array.isArray(raw.items) ? raw.items : []).map(normalizeItem);
  const photos = Array.isArray(raw.photos) ? raw.photos : [];
  const propertyPhotos = Array.isArray(raw.propertyPhotos) ? raw.propertyPhotos : [];
  const roomPhotos = Array.isArray(raw.roomPhotos) ? raw.roomPhotos : [];
  const events = (Array.isArray(raw.events) ? raw.events : []).map(normalizeEvent);

  const propertyIds = new Set(properties.map((p) => p.id));
  const cleanPropertyPhotos = propertyPhotos.filter((p) => propertyIds.has(p.propertyId));
  const validPropertyPhotoIds = new Set(cleanPropertyPhotos.map((p) => p.id));
  const cleanProperties = properties.map((p) => {
    const legacy = p as Property & { coverPhotoId?: string };
    const frontPhotoId =
      p.frontPhotoId ??
      (legacy.coverPhotoId && validPropertyPhotoIds.has(legacy.coverPhotoId)
        ? legacy.coverPhotoId
        : undefined);
    const validSlot = (id?: string) =>
      id && validPropertyPhotoIds.has(id) ? id : undefined;
    return {
      ...p,
      frontPhotoId: validSlot(frontPhotoId),
      leftSidePhotoId: validSlot(p.leftSidePhotoId),
      rightSidePhotoId: validSlot(p.rightSidePhotoId),
      backPhotoId: validSlot(p.backPhotoId),
    };
  });
  const roomIds = new Set(rooms.filter((r) => propertyIds.has(r.propertyId)).map((r) => r.id));
  const cleanRoomPhotos = roomPhotos.filter((p) => roomIds.has(p.roomId));
  const validRoomPhotoIds = new Set(cleanRoomPhotos.map((p) => p.id));
  const cleanRooms = rooms
    .filter((r) => propertyIds.has(r.propertyId))
    .map((r) => ({
      ...r,
      photoIds: (Array.isArray(r.photoIds) ? r.photoIds : []).filter((id) =>
        validRoomPhotoIds.has(id)
      ),
    }));
  const itemIds = new Set(items.filter((i) => roomIds.has(i.roomId)).map((i) => i.id));
  const eventIds = new Set(events.filter((e) => itemIds.has(e.itemId)).map((e) => e.id));

  const cleanItems = items.filter((i) => roomIds.has(i.roomId));
  const cleanEvents = events.filter((e) => itemIds.has(e.itemId));
  const cleanPhotos = photos.filter(
    (p) => itemIds.has(p.itemId) && (!p.eventId || eventIds.has(p.eventId))
  );

  return {
    version: 1,
    properties: cleanProperties,
    rooms: cleanRooms,
    items: cleanItems.map((i) => ({
      ...i,
      photoIds: i.photoIds.filter((pid) =>
        cleanPhotos.some((p) => p.id === pid && !p.eventId)
      ),
    })),
    photos: cleanPhotos,
    propertyPhotos: cleanPropertyPhotos,
    roomPhotos: cleanRoomPhotos,
    events: cleanEvents.map((e) => ({
      ...e,
      photoIds: e.photoIds.filter((pid) => cleanPhotos.some((p) => p.id === pid)),
    })),
  };
}

export async function loadAppState(): Promise<AppState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...EMPTY_APP_STATE };
  try {
    return normalizeState(JSON.parse(raw) as AppState);
  } catch {
    return { ...EMPTY_APP_STATE };
  }
}

export async function saveAppState(state: AppState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
}

export function propertyById(state: AppState, id: string): Property | undefined {
  return state.properties.find((p) => p.id === id);
}

export function roomsForProperty(state: AppState, propertyId: string): Room[] {
  return state.rooms
    .filter((r) => r.propertyId === propertyId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function roomById(state: AppState, id: string): Room | undefined {
  return state.rooms.find((r) => r.id === id);
}

export function itemsForRoom(state: AppState, roomId: string): InventoryItem[] {
  return state.items
    .filter((i) => i.roomId === roomId)
    .sort((a, b) => a.createdAtISO.localeCompare(b.createdAtISO));
}

export function itemById(state: AppState, id: string): InventoryItem | undefined {
  return state.items.find((i) => i.id === id);
}

/** Item-level photos only (not tied to a service event). */
export function photosForItem(state: AppState, itemId: string): ItemPhoto[] {
  return state.photos
    .filter((p) => p.itemId === itemId && !p.eventId)
    .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
}

/** First item-level photo URI for list thumbnails (appliance slot order, else photoIds order). */
export function firstPhotoUriForItem(state: AppState, item: InventoryItem): string | undefined {
  const itemPhotos = state.photos.filter((p) => p.itemId === item.id && !p.eventId);
  if (itemPhotos.length === 0) return undefined;

  if (item.itemTypeId === 'appliance' && item.details.kind === 'appliance') {
    for (const slot of APPLIANCE_PHOTO_SLOTS) {
      const photoId = item.details[slot.key];
      if (photoId) {
        const photo = itemPhotos.find((p) => p.id === photoId);
        if (photo) return photo.localUri;
      }
    }
  }

  for (const photoId of item.photoIds) {
    const photo = itemPhotos.find((p) => p.id === photoId);
    if (photo) return photo.localUri;
  }

  return itemPhotos[0]?.localUri;
}

export function photosForEvent(state: AppState, eventId: string): ItemPhoto[] {
  return state.photos
    .filter((p) => p.eventId === eventId)
    .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
}

export function eventsForItem(state: AppState, itemId: string): ItemEvent[] {
  return state.events
    .filter((e) => e.itemId === itemId)
    .sort((a, b) => b.occurredAtISO.localeCompare(a.occurredAtISO));
}

export function itemsForProperty(state: AppState, propertyId: string): InventoryItem[] {
  const roomIds = new Set(roomsForProperty(state, propertyId).map((r) => r.id));
  return state.items.filter((i) => roomIds.has(i.roomId));
}

export function eventsForProperty(state: AppState, propertyId: string): ItemEvent[] {
  const itemIds = new Set(itemsForProperty(state, propertyId).map((i) => i.id));
  return state.events.filter((e) => itemIds.has(e.itemId));
}

export function nextRoomSortOrder(state: AppState, propertyId: string): number {
  const rooms = roomsForProperty(state, propertyId);
  if (rooms.length === 0) return 0;
  return Math.max(...rooms.map((r) => r.sortOrder)) + 1;
}

export function deletePropertyCascade(state: AppState, propertyId: string): AppState {
  const roomIds = new Set(state.rooms.filter((r) => r.propertyId === propertyId).map((r) => r.id));
  const itemIds = new Set(state.items.filter((i) => roomIds.has(i.roomId)).map((i) => i.id));
  return {
    ...state,
    properties: state.properties.filter((p) => p.id !== propertyId),
    rooms: state.rooms.filter((r) => r.propertyId !== propertyId),
    items: state.items.filter((i) => !roomIds.has(i.roomId)),
    photos: state.photos.filter((p) => !itemIds.has(p.itemId)),
    propertyPhotos: state.propertyPhotos.filter((p) => p.propertyId !== propertyId),
    roomPhotos: state.roomPhotos.filter((p) => !roomIds.has(p.roomId)),
    events: state.events.filter((e) => !itemIds.has(e.itemId)),
  };
}

export function deleteRoomCascade(state: AppState, roomId: string): AppState {
  const itemIds = new Set(state.items.filter((i) => i.roomId === roomId).map((i) => i.id));
  return {
    ...state,
    rooms: state.rooms.filter((r) => r.id !== roomId),
    items: state.items.filter((i) => i.roomId !== roomId),
    photos: state.photos.filter((p) => !itemIds.has(p.itemId)),
    roomPhotos: state.roomPhotos.filter((p) => p.roomId !== roomId),
    events: state.events.filter((e) => !itemIds.has(e.itemId)),
  };
}

export function deleteItemCascade(state: AppState, itemId: string): AppState {
  return {
    ...state,
    items: state.items.filter((i) => i.id !== itemId),
    photos: state.photos.filter((p) => p.itemId !== itemId),
    events: state.events.filter((e) => e.itemId !== itemId),
  };
}

export function deleteEventCascade(state: AppState, eventId: string): AppState {
  return {
    ...state,
    events: state.events.filter((e) => e.id !== eventId),
    photos: state.photos.filter((p) => p.eventId !== eventId),
  };
}
