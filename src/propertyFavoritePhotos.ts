import type { AppState, InventoryItem, ItemPhoto, PropertyPhoto, RoomPhoto, RoomSlotKey } from './types';
import { PROPERTY_PHOTO_SLOTS } from './propertyPhotoSlots';
import { propertyExtraPhotos } from './propertyPhotos';
import { photosForRoom } from './roomPhotos';
import { roomPhotoSlotsForRoom } from './roomPhotoSlots';
import { itemsForRoom, roomsForProperty } from './storage';
import { APPLIANCE_PHOTO_SLOTS } from './applianceSlots';
import { AIR_CONDITIONER_PHOTO_SLOTS } from './airConditionerSlots';
import { AUTOMOBILE_PHOTO_SLOTS } from './automobileSlots';
import { ELECTRIC_PANEL_PHOTO_SLOTS } from './electricPanelSlots';
import { furnacePhotoSlotsForDetails } from './furnaceSlots';
import { waterMainPhotoSlotsForSource } from './waterMainSlots';
import { WATER_TREATMENT_PHOTO_SLOTS } from './waterTreatmentSlots';
import { wasteWaterPhotoSlotsForDetails } from './wasteWaterSlots';

export type FavoriteHeroPhoto = {
  id: string;
  uri: string;
  label: string;
  notes?: string;
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
    case 'water_treatment':
      return WATER_TREATMENT_PHOTO_SLOTS;
    case 'waste_water':
      return item.details.kind === 'waste_water'
        ? wasteWaterPhotoSlotsForDetails(item.details)
        : [];
    default:
      return [];
  }
}

function slotPhotoIdFromDetails(item: InventoryItem, slotKey: string): string | undefined {
  const details = item.details as Record<string, unknown>;
  const value = details[slotKey];
  return typeof value === 'string' && value ? value : undefined;
}

/**
 * Favorite hero photos for a property, ordered for Slideshow:
 * property slots → property extras → rooms (sortOrder) slots/extras → items (slots → extras/events).
 */
export function favoriteHeroPhotosForProperty(
  state: AppState,
  propertyId: string
): FavoriteHeroPhoto[] {
  const property = state.properties.find((entry) => entry.id === propertyId);
  if (!property) return [];

  const result: FavoriteHeroPhoto[] = [];
  const seen = new Set<string>();

  function pushFavorite(
    photo: Pick<PropertyPhoto | RoomPhoto | ItemPhoto, 'id' | 'localUri' | 'caption' | 'notes' | 'favorite'>,
    label: string
  ) {
    if (!photo.favorite || !photo.localUri || seen.has(photo.id)) return;
    seen.add(photo.id);
    const caption = photo.caption?.trim();
    result.push({
      id: photo.id,
      uri: photo.localUri,
      label: label.trim() || (caption === 'receipt' ? 'Receipt' : caption) || 'Photo',
      notes: photo.notes?.trim() || undefined,
    });
  }

  for (const slot of PROPERTY_PHOTO_SLOTS) {
    const photoId = property[slot.key];
    if (!photoId) continue;
    const photo = state.propertyPhotos.find((entry) => entry.id === photoId);
    if (photo) pushFavorite(photo, slot.shortLabel);
  }

  for (const photo of propertyExtraPhotos(state, propertyId)) {
    pushFavorite(photo, photo.caption?.trim() || 'Photo');
  }

  for (const room of roomsForProperty(state, propertyId)) {
    for (const slot of roomPhotoSlotsForRoom(room)) {
      const attachment = room.slotAttachments?.[slot.key as RoomSlotKey];
      if (!attachment || attachment.kind !== 'photo') continue;
      const photo = state.roomPhotos.find((entry) => entry.id === attachment.id);
      if (photo) pushFavorite(photo, slot.shortLabel);
    }

    for (const photo of photosForRoom(state, room.id)) {
      pushFavorite(photo, photo.caption?.trim() || room.name);
    }

    for (const item of itemsForRoom(state, room.id)) {
      const itemPhotos = state.photos.filter((photo) => photo.itemId === item.id);
      const slotIds = new Set<string>();
      const slots = itemPhotoSlots(item);
      for (const slot of slots) {
        const photoId = slotPhotoIdFromDetails(item, slot.key);
        if (!photoId) continue;
        slotIds.add(photoId);
        const photo = itemPhotos.find((entry) => entry.id === photoId);
        if (photo) pushFavorite(photo, slot.shortLabel);
      }

      for (const photo of itemPhotos) {
        if (slotIds.has(photo.id)) continue;
        const caption = photo.caption?.trim();
        pushFavorite(
          photo,
          caption === 'receipt'
            ? 'Receipt'
            : caption || itemLabel(item)
        );
      }
    }
  }

  return result;
}
