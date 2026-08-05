import type { AppState, InventoryItem, ItemPhoto, ToiletDetails } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { withReusePhotoMeta } from './reuseExistingPhotos';
import { photosForItem } from './storage';
import { uid, nowISO } from './utils';
import { TOILET_PHOTO_SLOTS, type ToiletPhotoSlotKey } from './toiletSlots';
import {
  clearItemSlotDocument,
  clearItemSlotDocumentOnPhotoSet,
  itemSlotDocumentId,
  itemSlotDocumentInfo,
  setItemSlotDocument,
} from './itemSlotDocuments';
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';

function asToiletDetails(details: InventoryItem['details']): ToiletDetails {
  return details.kind === 'toilet' ? details : { kind: 'toilet' };
}

function photoUriForId(state: AppState, photoId?: string): string | undefined {
  if (!photoId) return undefined;
  return state.photos.find((p) => p.id === photoId)?.localUri;
}

export function toiletSlotPhotoUri(
  state: AppState,
  details: ToiletDetails,
  slotKey: ToiletPhotoSlotKey
): string | undefined {
  if (itemSlotDocumentId(details, slotKey)) return undefined;
  return photoUriForId(state, details[slotKey]);
}

export function toiletSlotDocumentInfo(
  state: AppState,
  details: ToiletDetails,
  slotKey: ToiletPhotoSlotKey
) {
  return itemSlotDocumentInfo(state, details, slotKey);
}

function toiletSlotPhotoIds(details: ToiletDetails): Set<string> {
  const ids = TOILET_PHOTO_SLOTS.map((slot) => details[slot.key]).filter(
    (id): id is string => Boolean(id)
  );
  return new Set(ids);
}

export function toiletExtraPhotos(
  state: AppState,
  itemId: string,
  details: ToiletDetails
): ItemPhoto[] {
  const slotIds = toiletSlotPhotoIds(details);
  return photosForItem(state, itemId).filter((photo) => !slotIds.has(photo.id));
}

export async function addToiletExtraPhotos(
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
      return withReusePhotoMeta(sourceUri, {
        id: photoId,
        itemId,
        localUri,
        createdAtISO: nowISO(),
      });
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

export async function removeToiletExtraPhoto(
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

export async function setToiletSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: ToiletPhotoSlotKey,
  sourceUri: string
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  let nextState = state;
  nextState = await clearItemSlotDocumentOnPhotoSet(nextState, itemId, slotKey, asToiletDetails);
  const details = asToiletDetails(nextState.items.find((i) => i.id === itemId)!.details);
  const oldPhotoId = details[slotKey];

  if (oldPhotoId) {
    nextState = await clearToiletSlotPhoto(nextState, itemId, slotKey);
  }

  const photoId = uid('photo');
  const localUri = await persistPhotoFromUri(sourceUri, photoId);
  const photo = withReusePhotoMeta(sourceUri, {
    id: photoId,
    itemId,
    localUri,
    createdAtISO: nowISO(),
  });

  const currentItem = nextState.items.find((i) => i.id === itemId)!;
  const currentDetails = asToiletDetails(currentItem.details);
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

export async function clearToiletSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: ToiletPhotoSlotKey
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  const details = asToiletDetails(item.details);
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

export function updateToiletDetails(
  state: AppState,
  itemId: string,
  details: ToiletDetails
): AppState {
  return {
    ...state,
    items: state.items.map((i) => (i.id === itemId ? { ...i, details } : i)),
  };
}

export async function setToiletSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: ToiletPhotoSlotKey,
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
    asToiletDetails,
    clearToiletSlotPhoto,
    mimeType
  );
}

export async function clearToiletSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: ToiletPhotoSlotKey
): Promise<AppState> {
  return clearItemSlotDocument(state, itemId, slotKey, asToiletDetails);
}
