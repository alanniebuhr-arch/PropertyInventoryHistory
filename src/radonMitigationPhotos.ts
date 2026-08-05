import type { AppState, InventoryItem, ItemPhoto, RadonMitigationDetails } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { withReusePhotoMeta } from './reuseExistingPhotos';
import { photosForItem } from './storage';
import { uid, nowISO } from './utils';
import {
  RADON_MITIGATION_PHOTO_SLOTS,
  type RadonMitigationPhotoSlotKey,
} from './radonMitigationSlots';
import {
  clearItemSlotDocument,
  clearItemSlotDocumentOnPhotoSet,
  itemSlotDocumentId,
  itemSlotDocumentInfo,
  setItemSlotDocument,
} from './itemSlotDocuments';
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';

function asRadonMitigationDetails(details: InventoryItem['details']): RadonMitigationDetails {
  return details.kind === 'radon_mitigation' ? details : { kind: 'radon_mitigation' };
}

function photoUriForId(state: AppState, photoId?: string): string | undefined {
  if (!photoId) return undefined;
  return state.photos.find((p) => p.id === photoId)?.localUri;
}

export function radonMitigationSlotPhotoUri(
  state: AppState,
  details: RadonMitigationDetails,
  slotKey: RadonMitigationPhotoSlotKey
): string | undefined {
  if (itemSlotDocumentId(details, slotKey)) return undefined;
  return photoUriForId(state, details[slotKey]);
}

export function radonMitigationSlotDocumentInfo(
  state: AppState,
  details: RadonMitigationDetails,
  slotKey: RadonMitigationPhotoSlotKey
) {
  return itemSlotDocumentInfo(state, details, slotKey);
}

function radonMitigationSlotPhotoIds(details: RadonMitigationDetails): Set<string> {
  const ids = RADON_MITIGATION_PHOTO_SLOTS.map((slot) => details[slot.key]).filter(
    (id): id is string => Boolean(id)
  );
  return new Set(ids);
}

export function radonMitigationExtraPhotos(
  state: AppState,
  itemId: string,
  details: RadonMitigationDetails
): ItemPhoto[] {
  const slotIds = radonMitigationSlotPhotoIds(details);
  return photosForItem(state, itemId).filter((photo) => !slotIds.has(photo.id));
}

export async function addRadonMitigationExtraPhotos(
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

export async function removeRadonMitigationExtraPhoto(
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

export async function setRadonMitigationSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: RadonMitigationPhotoSlotKey,
  sourceUri: string
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  let nextState = state;
  nextState = await clearItemSlotDocumentOnPhotoSet(
    nextState,
    itemId,
    slotKey,
    asRadonMitigationDetails
  );
  const details = asRadonMitigationDetails(nextState.items.find((i) => i.id === itemId)!.details);
  const oldPhotoId = details[slotKey];

  if (oldPhotoId) {
    nextState = await clearRadonMitigationSlotPhoto(nextState, itemId, slotKey);
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
  const currentDetails = asRadonMitigationDetails(currentItem.details);
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

export async function clearRadonMitigationSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: RadonMitigationPhotoSlotKey
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  const details = asRadonMitigationDetails(item.details);
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

export function updateRadonMitigationDetails(
  state: AppState,
  itemId: string,
  details: RadonMitigationDetails
): AppState {
  return {
    ...state,
    items: state.items.map((i) => (i.id === itemId ? { ...i, details } : i)),
  };
}

export async function setRadonMitigationSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: RadonMitigationPhotoSlotKey,
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
    asRadonMitigationDetails,
    clearRadonMitigationSlotPhoto,
    mimeType
  );
}

export async function clearRadonMitigationSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: RadonMitigationPhotoSlotKey
): Promise<AppState> {
  return clearItemSlotDocument(state, itemId, slotKey, asRadonMitigationDetails);
}
