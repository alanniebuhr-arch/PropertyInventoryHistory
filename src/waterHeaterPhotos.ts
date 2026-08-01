import type { AppState, InventoryItem, ItemPhoto, WaterHeaterDetails } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { photosForItem } from './storage';
import { uid, nowISO } from './utils';
import { WATER_HEATER_PHOTO_SLOTS, type WaterHeaterPhotoSlotKey } from './waterHeaterSlots';
import {
  clearItemSlotDocument,
  clearItemSlotDocumentOnPhotoSet,
  itemSlotDocumentId,
  itemSlotDocumentInfo,
  setItemSlotDocument,
} from './itemSlotDocuments';
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';

function asWaterHeaterDetails(details: InventoryItem['details']): WaterHeaterDetails {
  return details.kind === 'water_heater' ? details : { kind: 'water_heater' };
}

function photoUriForId(state: AppState, photoId?: string): string | undefined {
  if (!photoId) return undefined;
  return state.photos.find((p) => p.id === photoId)?.localUri;
}

export function waterHeaterSlotPhotoUri(
  state: AppState,
  details: WaterHeaterDetails,
  slotKey: WaterHeaterPhotoSlotKey
): string | undefined {
  if (itemSlotDocumentId(details, slotKey)) return undefined;
  return photoUriForId(state, details[slotKey]);
}

export function waterHeaterSlotDocumentInfo(
  state: AppState,
  details: WaterHeaterDetails,
  slotKey: WaterHeaterPhotoSlotKey
) {
  return itemSlotDocumentInfo(state, details, slotKey);
}

function waterHeaterSlotPhotoIds(details: WaterHeaterDetails): Set<string> {
  const ids = WATER_HEATER_PHOTO_SLOTS.map((slot) => details[slot.key]).filter(
    (id): id is string => Boolean(id)
  );
  return new Set(ids);
}

export function waterHeaterExtraPhotos(
  state: AppState,
  itemId: string,
  details: WaterHeaterDetails
): ItemPhoto[] {
  const slotIds = waterHeaterSlotPhotoIds(details);
  return photosForItem(state, itemId).filter((photo) => !slotIds.has(photo.id));
}

export async function addWaterHeaterExtraPhotos(
  state: AppState,
  itemId: string,
  sourceUris: string[]
): Promise<AppState> {
  if (sourceUris.length === 0) return state;

  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  const newPhotos: ItemPhoto[] = await Promise.all(
    sourceUris.map(async (sourceUri) => {
      const photoId = uid('photo');
      const localUri = await persistPhotoFromUri(sourceUri, photoId);
      return {
        id: photoId,
        itemId,
        localUri,
        createdAtISO: nowISO(),
      };
    })
  );

  const updatedItem: InventoryItem = {
    ...item,
    photoIds: [...item.photoIds, ...newPhotos.map((p) => p.id)],
  };

  return {
    ...state,
    photos: [...state.photos, ...newPhotos],
    items: state.items.map((i) => (i.id === itemId ? updatedItem : i)),
  };
}

export async function removeWaterHeaterExtraPhoto(
  state: AppState,
  itemId: string,
  photoId: string
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  const photo = state.photos.find((p) => p.id === photoId);
  if (photo) await deletePhotoFile(photo.localUri);

  const updatedItem: InventoryItem = {
    ...item,
    photoIds: item.photoIds.filter((id) => id !== photoId),
  };

  return {
    ...state,
    photos: state.photos.filter((p) => p.id !== photoId),
    items: state.items.map((i) => (i.id === itemId ? updatedItem : i)),
  };
}

export async function setWaterHeaterSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: WaterHeaterPhotoSlotKey,
  sourceUri: string
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  let nextState = state;
  nextState = await clearItemSlotDocumentOnPhotoSet(nextState, itemId, slotKey, asWaterHeaterDetails);
  const details = asWaterHeaterDetails(nextState.items.find((i) => i.id === itemId)!.details);
  const oldPhotoId = details[slotKey];

  if (oldPhotoId) {
    nextState = await clearWaterHeaterSlotPhoto(nextState, itemId, slotKey);
  }

  const photoId = uid('photo');
  const localUri = await persistPhotoFromUri(sourceUri, photoId);
  const photo: ItemPhoto = {
    id: photoId,
    itemId,
    localUri,
    createdAtISO: nowISO(),
  };

  const currentItem = nextState.items.find((i) => i.id === itemId)!;
  const currentDetails = asWaterHeaterDetails(currentItem.details);
  const docKey = documentIdKeyForPhotoSlot(slotKey);
  const updatedItem: InventoryItem = {
    ...currentItem,
    details: { ...currentDetails, [slotKey]: photoId, [docKey]: undefined },
    photoIds: [...currentItem.photoIds, photoId],
  };

  return {
    ...nextState,
    photos: [...nextState.photos, photo],
    items: nextState.items.map((i) => (i.id === itemId ? updatedItem : i)),
  };
}

export async function clearWaterHeaterSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: WaterHeaterPhotoSlotKey
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  const details = asWaterHeaterDetails(item.details);
  const photoId = details[slotKey];
  if (!photoId) return state;

  const photo = state.photos.find((p) => p.id === photoId);
  if (photo) await deletePhotoFile(photo.localUri);

  const updatedItem: InventoryItem = {
    ...item,
    details: { ...details, [slotKey]: undefined },
    photoIds: item.photoIds.filter((id) => id !== photoId),
  };

  return {
    ...state,
    photos: state.photos.filter((p) => p.id !== photoId),
    items: state.items.map((i) => (i.id === itemId ? updatedItem : i)),
  };
}

export function updateWaterHeaterDetails(
  state: AppState,
  itemId: string,
  details: WaterHeaterDetails
): AppState {
  return {
    ...state,
    items: state.items.map((i) => (i.id === itemId ? { ...i, details } : i)),
  };
}

export async function setWaterHeaterSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: WaterHeaterPhotoSlotKey,
  sourceUri: string,
  fileName: string,
  mimeType?: string
): Promise<AppState> {
  return setItemSlotDocument(
    state,
    itemId,
    slotKey,
    sourceUri,
    fileName,
    asWaterHeaterDetails,
    clearWaterHeaterSlotPhoto,
    mimeType
  );
}

export async function clearWaterHeaterSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: WaterHeaterPhotoSlotKey
): Promise<AppState> {
  return clearItemSlotDocument(state, itemId, slotKey, asWaterHeaterDetails);
}
