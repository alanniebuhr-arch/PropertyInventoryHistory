import type { AppState, InventoryItem, IrrigationDetails, ItemPhoto } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { photosForItem } from './storage';
import { uid, nowISO } from './utils';
import { IRRIGATION_PHOTO_SLOTS, type IrrigationPhotoSlotKey } from './irrigationSlots';
import {
  clearItemSlotDocument,
  clearItemSlotDocumentOnPhotoSet,
  itemSlotDocumentId,
  itemSlotDocumentInfo,
  setItemSlotDocument,
} from './itemSlotDocuments';
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';

function asIrrigationDetails(details: InventoryItem['details']): IrrigationDetails {
  return details.kind === 'irrigation' ? details : { kind: 'irrigation' };
}

function photoUriForId(state: AppState, photoId?: string): string | undefined {
  if (!photoId) return undefined;
  return state.photos.find((p) => p.id === photoId)?.localUri;
}

export function irrigationSlotPhotoUri(
  state: AppState,
  details: IrrigationDetails,
  slotKey: IrrigationPhotoSlotKey
): string | undefined {
  if (itemSlotDocumentId(details, slotKey)) return undefined;
  return photoUriForId(state, details[slotKey]);
}

export function irrigationSlotDocumentInfo(
  state: AppState,
  details: IrrigationDetails,
  slotKey: IrrigationPhotoSlotKey
) {
  return itemSlotDocumentInfo(state, details, slotKey);
}

function irrigationSlotPhotoIds(details: IrrigationDetails): Set<string> {
  const ids = IRRIGATION_PHOTO_SLOTS.map((slot) => details[slot.key]).filter(
    (id): id is string => Boolean(id)
  );
  return new Set(ids);
}

export function irrigationExtraPhotos(
  state: AppState,
  itemId: string,
  details: IrrigationDetails
): ItemPhoto[] {
  const slotIds = irrigationSlotPhotoIds(details);
  return photosForItem(state, itemId).filter((photo) => !slotIds.has(photo.id));
}

export async function addIrrigationExtraPhotos(
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

export async function removeIrrigationExtraPhoto(
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

export async function setIrrigationSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: IrrigationPhotoSlotKey,
  sourceUri: string
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  let nextState = state;
  nextState = await clearItemSlotDocumentOnPhotoSet(
    nextState,
    itemId,
    slotKey,
    asIrrigationDetails
  );
  const details = asIrrigationDetails(nextState.items.find((i) => i.id === itemId)!.details);
  const oldPhotoId = details[slotKey];

  if (oldPhotoId) {
    nextState = await clearIrrigationSlotPhoto(nextState, itemId, slotKey);
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
  const currentDetails = asIrrigationDetails(currentItem.details);
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

export async function clearIrrigationSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: IrrigationPhotoSlotKey
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  const details = asIrrigationDetails(item.details);
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

export function updateIrrigationDetails(
  state: AppState,
  itemId: string,
  details: IrrigationDetails
): AppState {
  return {
    ...state,
    items: state.items.map((i) => (i.id === itemId ? { ...i, details } : i)),
  };
}

export async function setIrrigationSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: IrrigationPhotoSlotKey,
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
    asIrrigationDetails,
    clearIrrigationSlotPhoto,
    mimeType
  );
}

export async function clearIrrigationSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: IrrigationPhotoSlotKey
): Promise<AppState> {
  return clearItemSlotDocument(state, itemId, slotKey, asIrrigationDetails);
}
