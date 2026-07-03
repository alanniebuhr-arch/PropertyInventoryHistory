import type { AppState, InventoryItem, ItemPhoto, WaterMainDetails } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { photosForItem } from './storage';
import { uid, nowISO } from './utils';
import { waterMainPhotoSlotsForSource, type WaterMainPhotoSlotKey } from './waterMainSlots';

function asWaterMainDetails(details: InventoryItem['details']): WaterMainDetails {
  return details.kind === 'water_main' ? details : { kind: 'water_main' };
}

function photoUriForId(state: AppState, photoId?: string): string | undefined {
  if (!photoId) return undefined;
  return state.photos.find((p) => p.id === photoId)?.localUri;
}

export function waterMainSlotPhotoUri(
  state: AppState,
  details: WaterMainDetails,
  slotKey: WaterMainPhotoSlotKey
): string | undefined {
  return photoUriForId(state, details[slotKey]);
}

function waterMainSlotPhotoIds(details: WaterMainDetails): Set<string> {
  const ids = waterMainPhotoSlotsForSource(details)
    .map((slot) => details[slot.key])
    .filter((id): id is string => Boolean(id));
  return new Set(ids);
}

export function waterMainExtraPhotos(
  state: AppState,
  itemId: string,
  details: WaterMainDetails
): ItemPhoto[] {
  const slotIds = waterMainSlotPhotoIds(details);
  return photosForItem(state, itemId).filter((photo) => !slotIds.has(photo.id));
}

export async function addWaterMainExtraPhotos(
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

export async function removeWaterMainExtraPhoto(
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

export function setWaterMainExtraPhotoCaption(
  state: AppState,
  photoId: string,
  caption: string
): AppState {
  const trimmed = caption.trim();
  return {
    ...state,
    photos: state.photos.map((photo) =>
      photo.id === photoId ? { ...photo, caption: trimmed || undefined } : photo
    ),
  };
}

export async function setWaterMainSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: WaterMainPhotoSlotKey,
  sourceUri: string
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  let nextState = state;
  const details = asWaterMainDetails(item.details);
  const oldPhotoId = details[slotKey];

  if (oldPhotoId) {
    nextState = await clearWaterMainSlotPhoto(nextState, itemId, slotKey);
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
  const currentDetails = asWaterMainDetails(currentItem.details);
  const updatedItem: InventoryItem = {
    ...currentItem,
    details: { ...currentDetails, [slotKey]: photoId },
    photoIds: [...currentItem.photoIds, photoId],
  };

  return {
    ...nextState,
    photos: [...nextState.photos, photo],
    items: nextState.items.map((i) => (i.id === itemId ? updatedItem : i)),
  };
}

export async function clearWaterMainSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: WaterMainPhotoSlotKey
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  const details = asWaterMainDetails(item.details);
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

export function updateWaterMainDetails(
  state: AppState,
  itemId: string,
  details: WaterMainDetails
): AppState {
  return {
    ...state,
    items: state.items.map((i) => (i.id === itemId ? { ...i, details } : i)),
  };
}

export async function applyWaterMainDetailsChange(
  state: AppState,
  itemId: string,
  prev: WaterMainDetails,
  next: WaterMainDetails
): Promise<AppState> {
  let nextState = state;

  if (prev.waterSource !== next.waterSource) {
    if (next.waterSource !== 'municipal' && prev.waterBillPhotoId) {
      nextState = await clearWaterMainSlotPhoto(nextState, itemId, 'waterBillPhotoId');
    }
    if (next.waterSource !== 'municipal' && prev.undergroundShutoffPhotoId) {
      nextState = await clearWaterMainSlotPhoto(nextState, itemId, 'undergroundShutoffPhotoId');
    }
    if (next.waterSource !== 'well' && prev.wellHeadPhotoId) {
      nextState = await clearWaterMainSlotPhoto(nextState, itemId, 'wellHeadPhotoId');
    }
  }

  const currentItem = nextState.items.find((i) => i.id === itemId);
  const currentDetails = currentItem ? asWaterMainDetails(currentItem.details) : prev;

  const normalized: WaterMainDetails = {
    ...next,
    meterNumber: next.waterSource === 'municipal' ? next.meterNumber : undefined,
    waterBillPhotoId:
      next.waterSource === 'municipal' ? currentDetails.waterBillPhotoId : undefined,
    undergroundShutoffPhotoId:
      next.waterSource === 'municipal' ? currentDetails.undergroundShutoffPhotoId : undefined,
    wellHeadPhotoId: next.waterSource === 'well' ? currentDetails.wellHeadPhotoId : undefined,
  };

  return updateWaterMainDetails(nextState, itemId, normalized);
}
