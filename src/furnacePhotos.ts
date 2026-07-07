import type { AppState, FurnaceDetails, InventoryItem, ItemPhoto } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { photosForItem } from './storage';
import { uid, nowISO } from './utils';
import { furnacePhotoSlotsForDetails, furnaceUsesFuelShutoff, furnaceUsesFuelTank, type FurnacePhotoSlotKey } from './furnaceSlots';
import {
  clearItemSlotDocument,
  clearItemSlotDocumentOnPhotoSet,
  itemSlotDocumentId,
  itemSlotDocumentInfo,
  setItemSlotDocument,
} from './itemSlotDocuments';
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';

function asFurnaceDetails(details: InventoryItem['details']): FurnaceDetails {
  return details.kind === 'furnace' ? details : { kind: 'furnace' };
}

function photoUriForId(state: AppState, photoId?: string): string | undefined {
  if (!photoId) return undefined;
  return state.photos.find((p) => p.id === photoId)?.localUri;
}

export function furnaceSlotPhotoUri(
  state: AppState,
  details: FurnaceDetails,
  slotKey: FurnacePhotoSlotKey
): string | undefined {
  if (itemSlotDocumentId(details, slotKey)) return undefined;
  return photoUriForId(state, details[slotKey]);
}

export function furnaceSlotDocumentInfo(
  state: AppState,
  details: FurnaceDetails,
  slotKey: FurnacePhotoSlotKey
) {
  return itemSlotDocumentInfo(state, details, slotKey);
}

function furnaceSlotPhotoIds(details: FurnaceDetails): Set<string> {
  const ids = furnacePhotoSlotsForDetails(details)
    .map((slot) => details[slot.key])
    .filter((id): id is string => Boolean(id));
  return new Set(ids);
}

export function furnaceExtraPhotos(
  state: AppState,
  itemId: string,
  details: FurnaceDetails
): ItemPhoto[] {
  const slotIds = furnaceSlotPhotoIds(details);
  return photosForItem(state, itemId).filter((photo) => !slotIds.has(photo.id));
}

export async function addFurnaceExtraPhotos(
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

export async function removeFurnaceExtraPhoto(
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

export function setFurnaceExtraPhotoCaption(
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

export async function setFurnaceSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: FurnacePhotoSlotKey,
  sourceUri: string
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  let nextState = state;
  nextState = await clearItemSlotDocumentOnPhotoSet(nextState, itemId, slotKey, asFurnaceDetails);
  const details = asFurnaceDetails(nextState.items.find((i) => i.id === itemId)!.details);
  const oldPhotoId = details[slotKey];

  if (oldPhotoId) {
    nextState = await clearFurnaceSlotPhoto(nextState, itemId, slotKey);
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
  const currentDetails = asFurnaceDetails(currentItem.details);
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

export async function clearFurnaceSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: FurnacePhotoSlotKey
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  const details = asFurnaceDetails(item.details);
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

export function updateFurnaceDetails(
  state: AppState,
  itemId: string,
  details: FurnaceDetails
): AppState {
  return {
    ...state,
    items: state.items.map((i) => (i.id === itemId ? { ...i, details } : i)),
  };
}

export async function applyFurnaceDetailsChange(
  state: AppState,
  itemId: string,
  prev: FurnaceDetails,
  next: FurnaceDetails
): Promise<AppState> {
  let nextState = state;

  if (prev.systemType && !next.systemType) {
    for (const slotKey of [
      'systemFrontPhotoId',
      'systemSidePhotoId',
      'systemTagPhotoId',
      'fuelShutoffPhotoId',
      'fuelTankPhotoId',
      'receiptPhotoId',
    ] as FurnacePhotoSlotKey[]) {
      if (prev[slotKey]) {
        nextState = await clearFurnaceSlotPhoto(nextState, itemId, slotKey);
      }
    }
  }

  const prevUsesFuelShutoff = furnaceUsesFuelShutoff(prev.fuelType);
  const nextUsesFuelShutoff = furnaceUsesFuelShutoff(next.fuelType);
  if (prevUsesFuelShutoff && !nextUsesFuelShutoff && prev.fuelShutoffPhotoId) {
    nextState = await clearFurnaceSlotPhoto(nextState, itemId, 'fuelShutoffPhotoId');
  }

  const prevUsesFuelTank = furnaceUsesFuelTank(prev.fuelType);
  const nextUsesFuelTank = furnaceUsesFuelTank(next.fuelType);
  if (prevUsesFuelTank && !nextUsesFuelTank && prev.fuelTankPhotoId) {
    nextState = await clearFurnaceSlotPhoto(nextState, itemId, 'fuelTankPhotoId');
  }

  const currentItem = nextState.items.find((i) => i.id === itemId);
  const currentDetails = currentItem ? asFurnaceDetails(currentItem.details) : prev;

  const normalized: FurnaceDetails = {
    ...next,
    systemFrontPhotoId: next.systemType ? currentDetails.systemFrontPhotoId : undefined,
    systemSidePhotoId: next.systemType ? currentDetails.systemSidePhotoId : undefined,
    systemTagPhotoId: next.systemType ? currentDetails.systemTagPhotoId : undefined,
    fuelShutoffPhotoId: nextUsesFuelShutoff ? currentDetails.fuelShutoffPhotoId : undefined,
    fuelTankPhotoId: nextUsesFuelTank ? currentDetails.fuelTankPhotoId : undefined,
    fuelTankLocation: nextUsesFuelTank ? next.fuelTankLocation?.trim() || undefined : undefined,
    fuelTankSize: nextUsesFuelTank ? next.fuelTankSize?.trim() || undefined : undefined,
    receiptPhotoId: next.systemType ? currentDetails.receiptPhotoId : undefined,
  };

  return updateFurnaceDetails(nextState, itemId, normalized);
}

export async function setFurnaceSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: FurnacePhotoSlotKey,
  sourceUri: string,
  fileName: string
): Promise<AppState> {
  return setItemSlotDocument(
    state,
    itemId,
    slotKey,
    sourceUri,
    fileName,
    asFurnaceDetails,
    clearFurnaceSlotPhoto
  );
}

export async function clearFurnaceSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: FurnacePhotoSlotKey
): Promise<AppState> {
  return clearItemSlotDocument(state, itemId, slotKey, asFurnaceDetails);
}
