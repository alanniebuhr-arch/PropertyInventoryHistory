import type { AppState, GeneratorDetails, InventoryItem, ItemPhoto } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { withReusePhotoMeta } from './reuseExistingPhotos';
import { photosForItem } from './storage';
import { uid, nowISO } from './utils';
import { GENERATOR_PHOTO_SLOTS, type GeneratorPhotoSlotKey } from './generatorSlots';
import {
  clearItemSlotDocument,
  clearItemSlotDocumentOnPhotoSet,
  itemSlotDocumentId,
  itemSlotDocumentInfo,
  setItemSlotDocument,
} from './itemSlotDocuments';
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';

function asGeneratorDetails(details: InventoryItem['details']): GeneratorDetails {
  return details.kind === 'generator' ? details : { kind: 'generator' };
}

function photoUriForId(state: AppState, photoId?: string): string | undefined {
  if (!photoId) return undefined;
  return state.photos.find((p) => p.id === photoId)?.localUri;
}

export function generatorSlotPhotoUri(
  state: AppState,
  details: GeneratorDetails,
  slotKey: GeneratorPhotoSlotKey
): string | undefined {
  if (itemSlotDocumentId(details, slotKey)) return undefined;
  return photoUriForId(state, details[slotKey]);
}

export function generatorSlotDocumentInfo(
  state: AppState,
  details: GeneratorDetails,
  slotKey: GeneratorPhotoSlotKey
) {
  return itemSlotDocumentInfo(state, details, slotKey);
}

function generatorSlotPhotoIds(details: GeneratorDetails): Set<string> {
  const ids = GENERATOR_PHOTO_SLOTS.map((slot) => details[slot.key]).filter(
    (id): id is string => Boolean(id)
  );
  return new Set(ids);
}

export function generatorExtraPhotos(
  state: AppState,
  itemId: string,
  details: GeneratorDetails
): ItemPhoto[] {
  const slotIds = generatorSlotPhotoIds(details);
  return photosForItem(state, itemId).filter((photo) => !slotIds.has(photo.id));
}

export async function addGeneratorExtraPhotos(
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

export async function removeGeneratorExtraPhoto(
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

export async function setGeneratorSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: GeneratorPhotoSlotKey,
  sourceUri: string
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  let nextState = state;
  nextState = await clearItemSlotDocumentOnPhotoSet(nextState, itemId, slotKey, asGeneratorDetails);
  const details = asGeneratorDetails(nextState.items.find((i) => i.id === itemId)!.details);
  const oldPhotoId = details[slotKey];

  if (oldPhotoId) {
    nextState = await clearGeneratorSlotPhoto(nextState, itemId, slotKey);
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
  const currentDetails = asGeneratorDetails(currentItem.details);
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

export async function clearGeneratorSlotPhoto(
  state: AppState,
  itemId: string,
  slotKey: GeneratorPhotoSlotKey
): Promise<AppState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  const details = asGeneratorDetails(item.details);
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

export function updateGeneratorDetails(
  state: AppState,
  itemId: string,
  details: GeneratorDetails
): AppState {
  return {
    ...state,
    items: state.items.map((i) => (i.id === itemId ? { ...i, details } : i)),
  };
}

export async function setGeneratorSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: GeneratorPhotoSlotKey,
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
    asGeneratorDetails,
    clearGeneratorSlotPhoto,
    mimeType
  );
}

export async function clearGeneratorSlotDocument(
  state: AppState,
  itemId: string,
  slotKey: GeneratorPhotoSlotKey
): Promise<AppState> {
  return clearItemSlotDocument(state, itemId, slotKey, asGeneratorDetails);
}
