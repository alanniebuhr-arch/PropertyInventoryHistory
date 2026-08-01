import type { AppState, EvChargerDetails, InventoryItem, ItemPhoto } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { photosForItem } from './storage';
import { uid, nowISO } from './utils';
import { EV_CHARGER_PHOTO_SLOTS, type EvChargerPhotoSlotKey } from './evChargerSlots';
import {
  clearItemSlotDocument,
  clearItemSlotDocumentOnPhotoSet,
  itemSlotDocumentId,
  itemSlotDocumentInfo,
  setItemSlotDocument,
} from './itemSlotDocuments';
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';

function asEvChargerDetails(details: InventoryItem['details']): EvChargerDetails {
  return details.kind === 'ev_charger' ? details : { kind: 'ev_charger' };
}

function photoUriForId(state: AppState, photoId?: string): string | undefined {
  if (!photoId) return undefined;
  return state.photos.find((p) => p.id === photoId)?.localUri;
}

export function evChargerSlotPhotoUri(
  state: AppState,
  details: EvChargerDetails,
  slotKey: EvChargerPhotoSlotKey
): string | undefined {
  if (itemSlotDocumentId(details, slotKey)) return undefined;
  return photoUriForId(state, details[slotKey]);
}

export function evChargerSlotDocumentInfo(
  state: AppState,
  details: EvChargerDetails,
  slotKey: EvChargerPhotoSlotKey
) {
  return itemSlotDocumentInfo(state, details, slotKey);
}

function evChargerSlotPhotoIds(details: EvChargerDetails): Set<string> {
  const ids = EV_CHARGER_PHOTO_SLOTS.map((slot) => details[slot.key]).filter(
    (id): id is string => Boolean(id)
  );
  return new Set(ids);
}

export function evChargerExtraPhotos(
  state: AppState,
  itemId: string,
  details: EvChargerDetails
): ItemPhoto[] {
  const slotIds = evChargerSlotPhotoIds(details);
  return photosForItem(state, itemId).filter((photo) => !slotIds.has(photo.id));
}

export async function addEvChargerExtraPhotos(
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

export async function removeEvChargerExtraPhoto(
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

export async function setEvChargerSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: EvChargerPhotoSlotKey,
  sourceUri: string
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  let nextState = state;
  nextState = await clearItemSlotDocumentOnPhotoSet(
    nextState,
    itemId,
    slotKey,
    asEvChargerDetails
  );
  const details = asEvChargerDetails(nextState.items.find((i) => i.id === itemId)!.details);
  const oldPhotoId = details[slotKey];

  if (oldPhotoId) {
    nextState = await clearEvChargerSlotPhoto(nextState, itemId, slotKey);
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
  const currentDetails = asEvChargerDetails(currentItem.details);
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

export async function clearEvChargerSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: EvChargerPhotoSlotKey
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  const details = asEvChargerDetails(item.details);
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

export function updateEvChargerDetails(
  state: AppState,
  itemId: string,
  details: EvChargerDetails
): AppState {
  return {
    ...state,
    items: state.items.map((i) => (i.id === itemId ? { ...i, details } : i)),
  };
}

export async function setEvChargerSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: EvChargerPhotoSlotKey,
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
    asEvChargerDetails,
    clearEvChargerSlotPhoto,
    mimeType
  );
}

export async function clearEvChargerSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: EvChargerPhotoSlotKey
): Promise<AppState> {
  return clearItemSlotDocument(state, itemId, slotKey, asEvChargerDetails);
}
