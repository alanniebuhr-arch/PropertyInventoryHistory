import type { AppState, InventoryItem, ItemPhoto, WellPumpDetails } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { withReusePhotoMeta } from './reuseExistingPhotos';
import { photosForItem } from './storage';
import { uid, nowISO } from './utils';
import { WELL_PUMP_PHOTO_SLOTS, type WellPumpPhotoSlotKey } from './wellPumpSlots';
import {
  clearItemSlotDocument,
  clearItemSlotDocumentOnPhotoSet,
  itemSlotDocumentId,
  itemSlotDocumentInfo,
  setItemSlotDocument,
} from './itemSlotDocuments';
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';

function asWellPumpDetails(details: InventoryItem['details']): WellPumpDetails {
  return details.kind === 'well_pump' ? details : { kind: 'well_pump' };
}

function photoUriForId(state: AppState, photoId?: string): string | undefined {
  if (!photoId) return undefined;
  return state.photos.find((p) => p.id === photoId)?.localUri;
}

export function wellPumpSlotPhotoUri(
  state: AppState,
  details: WellPumpDetails,
  slotKey: WellPumpPhotoSlotKey
): string | undefined {
  if (itemSlotDocumentId(details, slotKey)) return undefined;
  return photoUriForId(state, details[slotKey]);
}

export function wellPumpSlotDocumentInfo(
  state: AppState,
  details: WellPumpDetails,
  slotKey: WellPumpPhotoSlotKey
) {
  return itemSlotDocumentInfo(state, details, slotKey);
}

function wellPumpSlotPhotoIds(details: WellPumpDetails): Set<string> {
  const ids = WELL_PUMP_PHOTO_SLOTS.map((slot) => details[slot.key]).filter(
    (id): id is string => Boolean(id)
  );
  return new Set(ids);
}

export function wellPumpExtraPhotos(
  state: AppState,
  itemId: string,
  details: WellPumpDetails
): ItemPhoto[] {
  const slotIds = wellPumpSlotPhotoIds(details);
  return photosForItem(state, itemId).filter((photo) => !slotIds.has(photo.id));
}

export async function addWellPumpExtraPhotos(
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

export async function removeWellPumpExtraPhoto(
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

export async function setWellPumpSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: WellPumpPhotoSlotKey,
  sourceUri: string
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  let nextState = state;
  nextState = await clearItemSlotDocumentOnPhotoSet(nextState, itemId, slotKey, asWellPumpDetails);
  const details = asWellPumpDetails(nextState.items.find((i) => i.id === itemId)!.details);
  const oldPhotoId = details[slotKey];

  if (oldPhotoId) {
    nextState = await clearWellPumpSlotPhoto(nextState, itemId, slotKey);
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
  const currentDetails = asWellPumpDetails(currentItem.details);
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

export async function clearWellPumpSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: WellPumpPhotoSlotKey
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  const details = asWellPumpDetails(item.details);
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

export function updateWellPumpDetails(
  state: AppState,
  itemId: string,
  details: WellPumpDetails
): AppState {
  return {
    ...state,
    items: state.items.map((i) => (i.id === itemId ? { ...i, details } : i)),
  };
}

export async function setWellPumpSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: WellPumpPhotoSlotKey,
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
    asWellPumpDetails,
    clearWellPumpSlotPhoto,
    mimeType
  );
}

export async function clearWellPumpSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: WellPumpPhotoSlotKey
): Promise<AppState> {
  return clearItemSlotDocument(state, itemId, slotKey, asWellPumpDetails);
}
