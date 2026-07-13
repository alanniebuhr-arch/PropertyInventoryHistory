import type { AppState, AutomobileDetails, InventoryItem, ItemPhoto } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { photosForItem } from './storage';
import { uid, nowISO } from './utils';
import { AUTOMOBILE_PHOTO_SLOTS, type AutomobilePhotoSlotKey } from './automobileSlots';
import {
  clearItemSlotDocument,
  clearItemSlotDocumentOnPhotoSet,
  itemSlotDocumentId,
  itemSlotDocumentInfo,
  setItemSlotDocument,
} from './itemSlotDocuments';
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';

function asAutomobileDetails(details: InventoryItem['details']): AutomobileDetails {
  return details.kind === 'automobile' ? details : { kind: 'automobile' };
}

function photoUriForId(state: AppState, photoId?: string): string | undefined {
  if (!photoId) return undefined;
  return state.photos.find((p) => p.id === photoId)?.localUri;
}

export function automobileSlotPhotoUri(
  state: AppState,
  details: AutomobileDetails,
  slotKey: AutomobilePhotoSlotKey
): string | undefined {
  if (itemSlotDocumentId(details, slotKey)) return undefined;
  return photoUriForId(state, details[slotKey]);
}

export function automobileSlotDocumentInfo(
  state: AppState,
  details: AutomobileDetails,
  slotKey: AutomobilePhotoSlotKey
) {
  return itemSlotDocumentInfo(state, details, slotKey);
}

function automobileSlotPhotoIds(details: AutomobileDetails): Set<string> {
  const ids = AUTOMOBILE_PHOTO_SLOTS.map((slot) => details[slot.key]).filter((id): id is string =>
    Boolean(id)
  );
  return new Set(ids);
}

export function automobileExtraPhotos(
  state: AppState,
  itemId: string,
  details: AutomobileDetails
): ItemPhoto[] {
  const slotIds = automobileSlotPhotoIds(details);
  return photosForItem(state, itemId).filter((photo) => !slotIds.has(photo.id));
}

export async function addAutomobileExtraPhotos(
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

export async function removeAutomobileExtraPhoto(
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

export function setAutomobileExtraPhotoCaption(
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

export async function setAutomobileSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: AutomobilePhotoSlotKey,
  sourceUri: string
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  let nextState = state;
  nextState = await clearItemSlotDocumentOnPhotoSet(nextState, itemId, slotKey, asAutomobileDetails);
  const details = asAutomobileDetails(nextState.items.find((i) => i.id === itemId)!.details);
  const oldPhotoId = details[slotKey];

  if (oldPhotoId) {
    nextState = await clearAutomobileSlotPhoto(nextState, itemId, slotKey);
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
  const currentDetails = asAutomobileDetails(currentItem.details);
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

export async function clearAutomobileSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: AutomobilePhotoSlotKey
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  const details = asAutomobileDetails(item.details);
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

export function updateAutomobileDetails(
  state: AppState,
  itemId: string,
  details: AutomobileDetails
): AppState {
  return {
    ...state,
    items: state.items.map((i) => (i.id === itemId ? { ...i, details } : i)),
  };
}

export async function setAutomobileSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: AutomobilePhotoSlotKey,
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
    asAutomobileDetails,
    clearAutomobileSlotPhoto,
    mimeType
  );
}

export async function clearAutomobileSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: AutomobilePhotoSlotKey
): Promise<AppState> {
  return clearItemSlotDocument(state, itemId, slotKey, asAutomobileDetails);
}
