import type { AppState, InventoryItem, ItemPhoto, PropertyPhoto, RoomPhoto, RoomSlotKey } from './types';
import { PROPERTY_PHOTO_SLOTS } from './propertyPhotoSlots';
import { propertyExtraPhotos } from './propertyPhotos';
import { photosForRoom } from './roomPhotos';
import { roomPhotoSlotsForRoom } from './roomPhotoSlots';
import { itemsForRoom, propertyById, roomsForProperty } from './storage';
import { APPLIANCE_PHOTO_SLOTS } from './applianceSlots';
import { AIR_CONDITIONER_PHOTO_SLOTS } from './airConditionerSlots';
import { AUTOMOBILE_PHOTO_SLOTS } from './automobileSlots';
import { ELECTRIC_PANEL_PHOTO_SLOTS } from './electricPanelSlots';
import { furnacePhotoSlotsForDetails } from './furnaceSlots';
import { waterMainPhotoSlotsForSource } from './waterMainSlots';
import { WATER_HEATER_PHOTO_SLOTS } from './waterHeaterSlots';
import { SECURITY_SYSTEM_PHOTO_SLOTS } from './securitySystemSlots';
import { RADON_MITIGATION_PHOTO_SLOTS } from './radonMitigationSlots';
import { WATER_TREATMENT_PHOTO_SLOTS } from './waterTreatmentSlots';
import { wasteWaterPhotoSlotsForDetails } from './wasteWaterSlots';
import { WELL_PUMP_PHOTO_SLOTS } from './wellPumpSlots';
import { GENERATOR_PHOTO_SLOTS } from './generatorSlots';
import { SUMP_PUMP_PHOTO_SLOTS } from './sumpPumpSlots';
import { GARAGE_DOOR_PHOTO_SLOTS } from './garageDoorSlots';
import { ROOF_PHOTO_SLOTS } from './roofSlots';
import { POOL_PHOTO_SLOTS } from './poolSlots';
import { IRRIGATION_PHOTO_SLOTS } from './irrigationSlots';
import { EV_CHARGER_PHOTO_SLOTS } from './evChargerSlots';
import { SOLAR_PHOTO_SLOTS } from './solarSlots';
import { HOT_TUB_PHOTO_SLOTS } from './hotTubSlots';

export type FavoriteHeroPhoto = {
  id: string;
  uri: string;
  label: string;
  notes?: string;
};

export type PropertyCatalogPhoto = FavoriteHeroPhoto & {
  favorite?: boolean;
  source: 'property' | 'room' | 'item';
  contextLabel: string;
  roomId?: string;
  itemId?: string;
};

type SlotDef = { key: string; shortLabel: string };

function itemLabel(item: InventoryItem): string {
  const name = item.displayName?.trim();
  if (name) return name;
  return item.itemTypeId.replace(/_/g, ' ');
}

function itemPhotoSlots(item: InventoryItem): SlotDef[] {
  switch (item.itemTypeId) {
    case 'appliance':
      return APPLIANCE_PHOTO_SLOTS;
    case 'air_conditioner':
      return AIR_CONDITIONER_PHOTO_SLOTS;
    case 'automobile':
      return AUTOMOBILE_PHOTO_SLOTS;
    case 'electric_panel':
      return ELECTRIC_PANEL_PHOTO_SLOTS;
    case 'furnace':
      return item.details.kind === 'furnace'
        ? furnacePhotoSlotsForDetails(item.details)
        : [];
    case 'water_main':
      return item.details.kind === 'water_main'
        ? waterMainPhotoSlotsForSource(item.details)
        : [];
    case 'water_heater':
      return WATER_HEATER_PHOTO_SLOTS;
    case 'security_system':
      return SECURITY_SYSTEM_PHOTO_SLOTS;
    case 'radon_mitigation':
      return RADON_MITIGATION_PHOTO_SLOTS;
    case 'water_treatment':
      return WATER_TREATMENT_PHOTO_SLOTS;
    case 'waste_water':
      return item.details.kind === 'waste_water'
        ? wasteWaterPhotoSlotsForDetails(item.details)
        : [];
    case 'well_pump':
      return WELL_PUMP_PHOTO_SLOTS;
    case 'generator':
      return GENERATOR_PHOTO_SLOTS;
    case 'sump_pump':
      return SUMP_PUMP_PHOTO_SLOTS;
    case 'garage_door':
      return GARAGE_DOOR_PHOTO_SLOTS;
    case 'roof':
      return ROOF_PHOTO_SLOTS;
    case 'pool':
      return POOL_PHOTO_SLOTS;
    case 'irrigation':
      return IRRIGATION_PHOTO_SLOTS;
    case 'ev_charger':
      return EV_CHARGER_PHOTO_SLOTS;
    case 'solar':
      return SOLAR_PHOTO_SLOTS;
    case 'hot_tub':
      return HOT_TUB_PHOTO_SLOTS;
    default:
      return [];
  }
}

function slotPhotoIdFromDetails(item: InventoryItem, slotKey: string): string | undefined {
  const details = item.details as Record<string, unknown>;
  const value = details[slotKey];
  return typeof value === 'string' && value ? value : undefined;
}

function photoLabel(
  photo: Pick<PropertyPhoto | RoomPhoto | ItemPhoto, 'caption'>,
  fallback: string
): string {
  const caption = photo.caption?.trim();
  if (caption === 'receipt') return 'Receipt';
  return fallback.trim() || caption || 'Photo';
}

/**
 * All property / room / asset photos for a property (for Slideshow picker),
 * in default traversal order.
 */
export function allHeroPhotosForProperty(
  state: AppState,
  propertyId: string
): PropertyCatalogPhoto[] {
  const property = state.properties.find((entry) => entry.id === propertyId);
  if (!property) return [];

  const result: PropertyCatalogPhoto[] = [];
  const seen = new Set<string>();

  function push(
    photo: Pick<PropertyPhoto | RoomPhoto | ItemPhoto, 'id' | 'localUri' | 'caption' | 'notes' | 'favorite'>,
    label: string,
    source: PropertyCatalogPhoto['source'],
    contextLabel: string,
    owner?: { roomId?: string; itemId?: string }
  ) {
    if (!photo.localUri || seen.has(photo.id)) return;
    seen.add(photo.id);
    result.push({
      id: photo.id,
      uri: photo.localUri,
      label: photoLabel(photo, label),
      notes: photo.notes?.trim() || undefined,
      favorite: photo.favorite === true,
      source,
      contextLabel,
      roomId: owner?.roomId,
      itemId: owner?.itemId,
    });
  }

  for (const slot of PROPERTY_PHOTO_SLOTS) {
    const photoId = property[slot.key];
    if (!photoId) continue;
    const photo = state.propertyPhotos.find((entry) => entry.id === photoId);
    if (photo) push(photo, slot.shortLabel, 'property', property.name);
  }

  for (const photo of propertyExtraPhotos(state, propertyId)) {
    push(photo, photo.caption?.trim() || 'Photo', 'property', property.name);
  }

  for (const room of roomsForProperty(state, propertyId)) {
    for (const slot of roomPhotoSlotsForRoom(room)) {
      const attachment = room.slotAttachments?.[slot.key as RoomSlotKey];
      if (!attachment || attachment.kind !== 'photo') continue;
      const photo = state.roomPhotos.find((entry) => entry.id === attachment.id);
      if (photo) push(photo, slot.shortLabel, 'room', room.name, { roomId: room.id });
    }

    for (const photo of photosForRoom(state, room.id)) {
      push(photo, photo.caption?.trim() || room.name, 'room', room.name, { roomId: room.id });
    }

    for (const item of itemsForRoom(state, room.id)) {
      const itemPhotos = state.photos.filter((photo) => photo.itemId === item.id);
      const slotIds = new Set<string>();
      const slots = itemPhotoSlots(item);
      const assetLabel = itemLabel(item);
      const owner = { roomId: room.id, itemId: item.id };
      for (const slot of slots) {
        const photoId = slotPhotoIdFromDetails(item, slot.key);
        if (!photoId) continue;
        slotIds.add(photoId);
        const photo = itemPhotos.find((entry) => entry.id === photoId);
        if (photo) push(photo, slot.shortLabel, 'item', assetLabel, owner);
      }

      for (const photo of itemPhotos) {
        if (slotIds.has(photo.id)) continue;
        const caption = photo.caption?.trim();
        push(
          photo,
          caption === 'receipt' ? 'Receipt' : caption || assetLabel,
          'item',
          assetLabel,
          owner
        );
      }
    }
  }

  return result;
}

/**
 * Favorite hero photos for a property in default traversal order
 * (used when slideshowPhotoIds has never been set).
 */
export function favoriteHeroPhotosForProperty(
  state: AppState,
  propertyId: string
): FavoriteHeroPhoto[] {
  return allHeroPhotosForProperty(state, propertyId)
    .filter((photo) => photo.favorite)
    .map(({ id, uri, label, notes }) => ({ id, uri, label, notes }));
}

function catalogById(
  state: AppState,
  propertyId: string
): Map<string, PropertyCatalogPhoto> {
  return new Map(allHeroPhotosForProperty(state, propertyId).map((photo) => [photo.id, photo]));
}

/** Resolved Slideshow list: explicit order when set, otherwise starred favorites. */
export function slideshowPhotosForProperty(
  state: AppState,
  propertyId: string
): FavoriteHeroPhoto[] {
  const property = propertyById(state, propertyId);
  if (!property) return [];

  if (property.slideshowPhotoIds === undefined) {
    return favoriteHeroPhotosForProperty(state, propertyId);
  }

  const byId = catalogById(state, propertyId);
  const result: FavoriteHeroPhoto[] = [];
  for (const id of property.slideshowPhotoIds) {
    const photo = byId.get(id);
    if (photo) {
      result.push({
        id: photo.id,
        uri: photo.uri,
        label: photo.label,
        notes: photo.notes,
      });
    }
  }
  return result;
}

function updatePropertySlideshowIds(
  state: AppState,
  propertyId: string,
  slideshowPhotoIds: string[]
): AppState {
  return {
    ...state,
    properties: state.properties.map((property) =>
      property.id === propertyId ? { ...property, slideshowPhotoIds } : property
    ),
  };
}

/** Initialize slideshowPhotoIds from current favorites if the property has never customized order. */
export function ensureSlideshowPhotoIds(state: AppState, propertyId: string): AppState {
  const property = propertyById(state, propertyId);
  if (!property || property.slideshowPhotoIds !== undefined) return state;
  return updatePropertySlideshowIds(
    state,
    propertyId,
    favoriteHeroPhotosForProperty(state, propertyId).map((photo) => photo.id)
  );
}

export function setSlideshowPhotoIds(
  state: AppState,
  propertyId: string,
  slideshowPhotoIds: string[]
): AppState {
  return updatePropertySlideshowIds(state, propertyId, slideshowPhotoIds);
}

/** Move photo to 1-based position; other slides shift. Clamps to 1..N. */
export function moveSlideshowPhotoToOrder(
  state: AppState,
  propertyId: string,
  photoId: string,
  oneBasedOrder: number
): AppState {
  let next = ensureSlideshowPhotoIds(state, propertyId);
  const property = propertyById(next, propertyId);
  if (!property?.slideshowPhotoIds) return next;

  const ids = property.slideshowPhotoIds.filter((id) => id !== photoId);
  if (!property.slideshowPhotoIds.includes(photoId)) return next;

  const max = ids.length + 1;
  const target = Math.max(1, Math.min(max, Math.round(oneBasedOrder))) - 1;
  ids.splice(target, 0, photoId);
  return updatePropertySlideshowIds(next, propertyId, ids);
}

function setFavoriteFlagOnPhoto(state: AppState, photoId: string, favorite: boolean): AppState {
  if (state.propertyPhotos.some((photo) => photo.id === photoId)) {
    return {
      ...state,
      propertyPhotos: state.propertyPhotos.map((photo) =>
        photo.id === photoId ? { ...photo, favorite: favorite || undefined } : photo
      ),
    };
  }
  if (state.roomPhotos.some((photo) => photo.id === photoId)) {
    return {
      ...state,
      roomPhotos: state.roomPhotos.map((photo) =>
        photo.id === photoId ? { ...photo, favorite: favorite || undefined } : photo
      ),
    };
  }
  if (state.photos.some((photo) => photo.id === photoId)) {
    return {
      ...state,
      photos: state.photos.map((photo) =>
        photo.id === photoId ? { ...photo, favorite: favorite || undefined } : photo
      ),
    };
  }
  return state;
}

export function propertyIdForSlideshowPhoto(
  state: AppState,
  photoId: string
): string | undefined {
  const propertyPhoto = state.propertyPhotos.find((photo) => photo.id === photoId);
  if (propertyPhoto) return propertyPhoto.propertyId;

  const roomPhoto = state.roomPhotos.find((photo) => photo.id === photoId);
  if (roomPhoto) {
    return state.rooms.find((room) => room.id === roomPhoto.roomId)?.propertyId;
  }

  const itemPhoto = state.photos.find((photo) => photo.id === photoId);
  if (itemPhoto) {
    const room = state.rooms.find((entry) =>
      state.items.some((item) => item.id === itemPhoto.itemId && item.roomId === entry.id)
    );
    return room?.propertyId;
  }

  return undefined;
}

/**
 * Include/exclude a photo in the Slideshow list and keep the hero ★ in sync.
 */
export function setSlideshowPhotoIncluded(
  state: AppState,
  propertyId: string,
  photoId: string,
  included: boolean
): AppState {
  let next = ensureSlideshowPhotoIds(state, propertyId);
  const property = propertyById(next, propertyId);
  if (!property) return next;

  const catalog = catalogById(next, propertyId);
  if (!catalog.has(photoId)) return next;

  const current = property.slideshowPhotoIds ?? [];
  const has = current.includes(photoId);
  let slideshowPhotoIds = current;
  if (included && !has) {
    slideshowPhotoIds = [...current, photoId];
  } else if (!included && has) {
    slideshowPhotoIds = current.filter((id) => id !== photoId);
  }

  next = updatePropertySlideshowIds(next, propertyId, slideshowPhotoIds);
  next = setFavoriteFlagOnPhoto(next, photoId, included);
  return next;
}

/** Keep Slideshow membership in sync when a hero ★ is toggled. */
export function syncSlideshowAfterFavoriteChange(
  state: AppState,
  photoId: string,
  favorite: boolean
): AppState {
  const propertyId = propertyIdForSlideshowPhoto(state, photoId);
  if (!propertyId) return state;
  return setSlideshowPhotoIncluded(state, propertyId, photoId, favorite);
}
