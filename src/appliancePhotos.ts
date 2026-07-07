import type { AppState, ApplianceDetails, InventoryItem, ItemPhoto } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { photosForItem } from './storage';
import { uid, nowISO } from './utils';
import { APPLIANCE_PHOTO_SLOTS, type AppliancePhotoSlotKey } from './applianceSlots';
import {
  clearItemSlotDocument,
  clearItemSlotDocumentOnPhotoSet,
  itemSlotDocumentId,
  itemSlotDocumentInfo,
  setItemSlotDocument,
} from './itemSlotDocuments';
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';

function asApplianceDetails(details: InventoryItem['details']): ApplianceDetails {
  return details.kind === 'appliance' ? details : { kind: 'appliance' };
}

function photoUriForId(state: AppState, photoId?: string): string | undefined {
  if (!photoId) return undefined;
  return state.photos.find((p) => p.id === photoId)?.localUri;
}

export function applianceSlotPhotoUri(
  state: AppState,
  details: ApplianceDetails,
  slotKey: AppliancePhotoSlotKey
): string | undefined {
  if (itemSlotDocumentId(details, slotKey)) return undefined;
  return photoUriForId(state, details[slotKey]);
}

export function applianceSlotDocumentInfo(
  state: AppState,
  details: ApplianceDetails,
  slotKey: AppliancePhotoSlotKey
) {
  return itemSlotDocumentInfo(state, details, slotKey);
}

function applianceSlotPhotoIds(details: ApplianceDetails): Set<string> {
  const ids = APPLIANCE_PHOTO_SLOTS.map((slot) => details[slot.key]).filter(
    (id): id is string => Boolean(id)
  );
  return new Set(ids);
}

/** Item photos that are not assigned to a named appliance slot. */
export function applianceExtraPhotos(
  state: AppState,
  itemId: string,
  details: ApplianceDetails
): ItemPhoto[] {
  const slotIds = applianceSlotPhotoIds(details);
  return photosForItem(state, itemId).filter((photo) => !slotIds.has(photo.id));
}

export async function addApplianceExtraPhotos(
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

export async function removeApplianceExtraPhoto(
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

export function setApplianceExtraPhotoCaption(
  state: AppState,
  photoId: string,
  caption: string
): AppState {
  const trimmed = caption.trim();
  return {
    ...state,
    photos: state.photos.map((photo) =>
      photo.id === photoId
        ? { ...photo, caption: trimmed || undefined }
        : photo
    ),
  };
}

export async function setApplianceSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: AppliancePhotoSlotKey,
  sourceUri: string
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  let nextState = state;
  nextState = await clearItemSlotDocumentOnPhotoSet(nextState, itemId, slotKey, asApplianceDetails);
  const details = asApplianceDetails(nextState.items.find((i) => i.id === itemId)!.details);
  const oldPhotoId = details[slotKey];

  if (oldPhotoId) {
    nextState = await clearApplianceSlotPhoto(nextState, itemId, slotKey);
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
  const currentDetails = asApplianceDetails(currentItem.details);
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

export async function clearApplianceSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: AppliancePhotoSlotKey
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  const details = asApplianceDetails(item.details);
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

export function updateApplianceDetails(
  state: AppState,
  itemId: string,
  details: ApplianceDetails
): AppState {
  return {
    ...state,
    items: state.items.map((i) =>
      i.id === itemId ? { ...i, details } : i
    ),
  };
}

export async function setApplianceSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: AppliancePhotoSlotKey,
  sourceUri: string,
  fileName: string
): Promise<AppState> {
  return setItemSlotDocument(
    state,
    itemId,
    slotKey,
    sourceUri,
    fileName,
    asApplianceDetails,
    clearApplianceSlotPhoto
  );
}

export async function clearApplianceSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: AppliancePhotoSlotKey
): Promise<AppState> {
  return clearItemSlotDocument(state, itemId, slotKey, asApplianceDetails);
}
