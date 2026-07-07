import type { AppState, InventoryItem, ItemPhoto, WasteWaterDetails } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { photosForItem } from './storage';
import { uid, nowISO } from './utils';
import { wasteWaterPhotoSlotsForDetails, type WasteWaterPhotoSlotKey } from './wasteWaterSlots';
import {
  clearItemSlotDocument,
  clearItemSlotDocumentOnPhotoSet,
  itemSlotDocumentId,
  itemSlotDocumentInfo,
  setItemSlotDocument,
} from './itemSlotDocuments';
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';

function asWasteWaterDetails(details: InventoryItem['details']): WasteWaterDetails {
  return details.kind === 'waste_water' ? details : { kind: 'waste_water' };
}

function photoUriForId(state: AppState, photoId?: string): string | undefined {
  if (!photoId) return undefined;
  return state.photos.find((p) => p.id === photoId)?.localUri;
}

export function wasteWaterSlotPhotoUri(
  state: AppState,
  details: WasteWaterDetails,
  slotKey: WasteWaterPhotoSlotKey
): string | undefined {
  if (itemSlotDocumentId(details, slotKey)) return undefined;
  return photoUriForId(state, details[slotKey]);
}

export function wasteWaterSlotDocumentInfo(
  state: AppState,
  details: WasteWaterDetails,
  slotKey: WasteWaterPhotoSlotKey
) {
  return itemSlotDocumentInfo(state, details, slotKey);
}

function wasteWaterSlotPhotoIds(details: WasteWaterDetails): Set<string> {
  const ids = wasteWaterPhotoSlotsForDetails(details)
    .map((slot) => details[slot.key])
    .filter((id): id is string => Boolean(id));
  return new Set(ids);
}

export function wasteWaterExtraPhotos(
  state: AppState,
  itemId: string,
  details: WasteWaterDetails
): ItemPhoto[] {
  const slotIds = wasteWaterSlotPhotoIds(details);
  return photosForItem(state, itemId).filter((photo) => !slotIds.has(photo.id));
}

export async function addWasteWaterExtraPhotos(
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

export async function removeWasteWaterExtraPhoto(
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

export function setWasteWaterExtraPhotoCaption(
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

export async function setWasteWaterSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: WasteWaterPhotoSlotKey,
  sourceUri: string
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  let nextState = state;
  nextState = await clearItemSlotDocumentOnPhotoSet(nextState, itemId, slotKey, asWasteWaterDetails);
  const details = asWasteWaterDetails(nextState.items.find((i) => i.id === itemId)!.details);
  const oldPhotoId = details[slotKey];

  if (oldPhotoId) {
    nextState = await clearWasteWaterSlotPhoto(nextState, itemId, slotKey);
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
  const currentDetails = asWasteWaterDetails(currentItem.details);
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

export async function clearWasteWaterSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: WasteWaterPhotoSlotKey
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  const details = asWasteWaterDetails(item.details);
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

export function updateWasteWaterDetails(
  state: AppState,
  itemId: string,
  details: WasteWaterDetails
): AppState {
  return {
    ...state,
    items: state.items.map((i) => (i.id === itemId ? { ...i, details } : i)),
  };
}

export async function applyWasteWaterDetailsChange(
  state: AppState,
  itemId: string,
  prev: WasteWaterDetails,
  next: WasteWaterDetails
): Promise<AppState> {
  let nextState = state;

  if (prev.system !== next.system) {
    if (next.system !== 'sewer' && prev.sewerBillPhotoId) {
      nextState = await clearWasteWaterSlotPhoto(nextState, itemId, 'sewerBillPhotoId');
    }
    if (next.system !== 'septic' && next.system !== 'cesspool' && prev.tankLocationPhotoId) {
      nextState = await clearWasteWaterSlotPhoto(nextState, itemId, 'tankLocationPhotoId');
    }
    if (next.system !== 'septic' && prev.septicFieldPhotoId) {
      nextState = await clearWasteWaterSlotPhoto(nextState, itemId, 'septicFieldPhotoId');
    }
  }

  const currentItem = nextState.items.find((i) => i.id === itemId);
  const currentDetails = currentItem ? asWasteWaterDetails(currentItem.details) : prev;

  const normalized: WasteWaterDetails = {
    ...next,
    systemOther:
      next.system === 'other'
        ? next.systemOther?.trim() || undefined
        : undefined,
    sewerBillPhotoId: next.system === 'sewer' ? currentDetails.sewerBillPhotoId : undefined,
    tankLocationPhotoId:
      next.system === 'septic' || next.system === 'cesspool'
        ? currentDetails.tankLocationPhotoId
        : undefined,
    septicFieldPhotoId: next.system === 'septic' ? currentDetails.septicFieldPhotoId : undefined,
    wasteLineExitPhotoId: currentDetails.wasteLineExitPhotoId,
  };

  return updateWasteWaterDetails(nextState, itemId, normalized);
}

export async function setWasteWaterSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: WasteWaterPhotoSlotKey,
  sourceUri: string,
  fileName: string
): Promise<AppState> {
  return setItemSlotDocument(
    state,
    itemId,
    slotKey,
    sourceUri,
    fileName,
    asWasteWaterDetails,
    clearWasteWaterSlotPhoto
  );
}

export async function clearWasteWaterSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: WasteWaterPhotoSlotKey
): Promise<AppState> {
  return clearItemSlotDocument(state, itemId, slotKey, asWasteWaterDetails);
}
