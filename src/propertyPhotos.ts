import type { AppState, Property } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { slotDocumentInfo } from './documents';
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';
import { addDocumentToState, removeDocumentFromState } from './slotDocumentOps';
import { uid, nowISO } from './utils';
import { PROPERTY_PHOTO_SLOTS, type PropertyPhotoSlotKey } from './propertyPhotoSlots';

function propertySlotPhotoIds(property: Property): Set<string> {
  const ids = new Set<string>();
  for (const slot of PROPERTY_PHOTO_SLOTS) {
    const photoId = property[slot.key];
    if (photoId) ids.add(photoId);
  }
  return ids;
}

function propertyDocumentId(
  property: Property,
  slotKey: PropertyPhotoSlotKey
): string | undefined {
  const docKey = documentIdKeyForPhotoSlot(slotKey) as keyof Property;
  return property[docKey] as string | undefined;
}

function photoUriForId(state: AppState, photoId?: string): string | undefined {
  if (!photoId) return undefined;
  return state.propertyPhotos.find((p) => p.id === photoId)?.localUri;
}

export function propertySlotPhotoUri(
  state: AppState,
  property: Property,
  slotKey: PropertyPhotoSlotKey
): string | undefined {
  if (propertyDocumentId(property, slotKey)) return undefined;
  return photoUriForId(state, property[slotKey]);
}

export function propertySlotDocumentInfo(
  state: AppState,
  property: Property,
  slotKey: PropertyPhotoSlotKey
) {
  if (property[slotKey]) return undefined;
  return slotDocumentInfo(state, propertyDocumentId(property, slotKey));
}

export function propertyCoverPhotoUri(state: AppState, property: Property): string | undefined {
  return propertySlotPhotoUri(state, property, 'frontPhotoId');
}

async function removePropertySlotDocument(
  state: AppState,
  propertyId: string,
  slotKey: PropertyPhotoSlotKey
): Promise<AppState> {
  const property = state.properties.find((p) => p.id === propertyId);
  if (!property) return state;

  const docKey = documentIdKeyForPhotoSlot(slotKey) as keyof Property;
  const documentId = property[docKey] as string | undefined;
  if (!documentId) return state;

  const nextState = await removeDocumentFromState(state, documentId);
  return {
    ...nextState,
    properties: nextState.properties.map((p) =>
      p.id === propertyId ? { ...p, [docKey]: undefined } : p
    ),
  };
}

export async function setPropertySlotPhoto(
  state: AppState,
  propertyId: string,
  slotKey: PropertyPhotoSlotKey,
  sourceUri: string
): Promise<AppState> {
  const property = state.properties.find((p) => p.id === propertyId);
  if (!property) return state;

  let nextState = state;
  const oldPhotoId = property[slotKey];

  if (oldPhotoId) {
    nextState = await clearPropertySlotPhoto(nextState, propertyId, slotKey);
  }
  if (propertyDocumentId(property, slotKey)) {
    nextState = await removePropertySlotDocument(nextState, propertyId, slotKey);
  }

  const photoId = uid('photo');
  const localUri = await persistPhotoFromUri(sourceUri, photoId);
  const photo = {
    id: photoId,
    propertyId,
    localUri,
    createdAtISO: nowISO(),
  };

  const docKey = documentIdKeyForPhotoSlot(slotKey) as keyof Property;

  return {
    ...nextState,
    propertyPhotos: [...nextState.propertyPhotos, photo],
    properties: nextState.properties.map((p) =>
      p.id === propertyId ? { ...p, [slotKey]: photoId, [docKey]: undefined } : p
    ),
  };
}

export async function setPropertySlotDocument(
  state: AppState,
  propertyId: string,
  slotKey: PropertyPhotoSlotKey,
  sourceUri: string,
  fileName: string
): Promise<AppState> {
  const property = state.properties.find((p) => p.id === propertyId);
  if (!property) return state;

  let nextState = state;
  const oldPhotoId = property[slotKey];
  if (oldPhotoId) {
    nextState = await clearPropertySlotPhoto(nextState, propertyId, slotKey);
  }
  if (propertyDocumentId(property, slotKey)) {
    nextState = await removePropertySlotDocument(nextState, propertyId, slotKey);
  }

  const { state: withDoc, document } = await addDocumentToState(nextState, sourceUri, fileName);
  const docKey = documentIdKeyForPhotoSlot(slotKey) as keyof Property;

  return {
    ...withDoc,
    properties: withDoc.properties.map((p) =>
      p.id === propertyId
        ? { ...p, [slotKey]: undefined, [docKey]: document.id }
        : p
    ),
  };
}

export async function clearPropertySlotDocument(
  state: AppState,
  propertyId: string,
  slotKey: PropertyPhotoSlotKey
): Promise<AppState> {
  return removePropertySlotDocument(state, propertyId, slotKey);
}

export function propertyExtraPhotos(state: AppState, propertyId: string) {
  const property = state.properties.find((p) => p.id === propertyId);
  if (!property) return [];
  const slotIds = propertySlotPhotoIds(property);
  return (property.photoIds ?? [])
    .filter((id) => !slotIds.has(id))
    .map((photoId) => state.propertyPhotos.find((p) => p.id === photoId))
    .filter((p): p is NonNullable<typeof p> => p != null);
}

export function propertyExtraPhotoUri(
  state: AppState,
  propertyId: string,
  photoId: string
): string | undefined {
  return state.propertyPhotos.find((p) => p.id === photoId && p.propertyId === propertyId)?.localUri;
}

export function propertyPhotoUriForHeroId(
  state: AppState,
  property: Property,
  heroId: string
): string | undefined {
  const slot = PROPERTY_PHOTO_SLOTS.find((entry) => entry.key === heroId);
  if (slot) return propertySlotPhotoUri(state, property, slot.key);
  return propertyExtraPhotoUri(state, property.id, heroId);
}

export async function addPropertyExtraPhotos(
  state: AppState,
  propertyId: string,
  sourceUris: string[]
): Promise<AppState> {
  if (sourceUris.length === 0) return state;
  const property = state.properties.find((p) => p.id === propertyId);
  if (!property) return state;

  const newPhotos = await Promise.all(
    sourceUris.map(async (sourceUri) => {
      const photoId = uid('photo');
      const localUri = await persistPhotoFromUri(sourceUri, photoId);
      return {
        id: photoId,
        propertyId,
        localUri,
        createdAtISO: nowISO(),
      };
    })
  );

  const newPhotoIds = newPhotos.map((photo) => photo.id);
  return {
    ...state,
    propertyPhotos: [...state.propertyPhotos, ...newPhotos],
    properties: state.properties.map((entry) =>
      entry.id === propertyId
        ? { ...entry, photoIds: [...(entry.photoIds ?? []), ...newPhotoIds] }
        : entry
    ),
  };
}

export async function removePropertyExtraPhoto(
  state: AppState,
  propertyId: string,
  photoId: string
): Promise<AppState> {
  const photo = state.propertyPhotos.find((p) => p.id === photoId);
  if (photo) await deletePhotoFile(photo.localUri);

  return {
    ...state,
    propertyPhotos: state.propertyPhotos.filter((p) => p.id !== photoId),
    properties: state.properties.map((entry) =>
      entry.id === propertyId
        ? { ...entry, photoIds: (entry.photoIds ?? []).filter((id) => id !== photoId) }
        : entry
    ),
  };
}

export function setPropertyExtraPhotoCaption(
  state: AppState,
  photoId: string,
  caption: string
): AppState {
  const trimmed = caption.trim();
  return {
    ...state,
    propertyPhotos: state.propertyPhotos.map((photo) =>
      photo.id === photoId ? { ...photo, caption: trimmed || undefined } : photo
    ),
  };
}

export async function clearPropertySlotPhoto(
  state: AppState,
  propertyId: string,
  slotKey: PropertyPhotoSlotKey
): Promise<AppState> {
  const property = state.properties.find((p) => p.id === propertyId);
  if (!property) return state;

  const photoId = property[slotKey];
  if (!photoId) return state;

  const photo = state.propertyPhotos.find((p) => p.id === photoId);
  if (photo) await deletePhotoFile(photo.localUri);

  return {
    ...state,
    propertyPhotos: state.propertyPhotos.filter((p) => p.id !== photoId),
    properties: state.properties.map((p) =>
      p.id === propertyId ? { ...p, [slotKey]: undefined } : p
    ),
  };
}
