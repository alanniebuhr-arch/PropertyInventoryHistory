import type { AppState, Property, PropertyPhoto } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { uid, nowISO } from './utils';
import type { PropertyPhotoSlotKey } from './propertyPhotoSlots';

function photoUriForId(state: AppState, photoId?: string): string | undefined {
  if (!photoId) return undefined;
  return state.propertyPhotos.find((p) => p.id === photoId)?.localUri;
}

export function propertySlotPhotoUri(
  state: AppState,
  property: Property,
  slotKey: PropertyPhotoSlotKey
): string | undefined {
  return photoUriForId(state, property[slotKey]);
}

export function propertyCoverPhotoUri(state: AppState, property: Property): string | undefined {
  return propertySlotPhotoUri(state, property, 'frontPhotoId');
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

  const photoId = uid('photo');
  const localUri = await persistPhotoFromUri(sourceUri, photoId);
  const photo: PropertyPhoto = {
    id: photoId,
    propertyId,
    localUri,
    createdAtISO: nowISO(),
  };

  return {
    ...nextState,
    propertyPhotos: [...nextState.propertyPhotos, photo],
    properties: nextState.properties.map((p) =>
      p.id === propertyId ? { ...p, [slotKey]: photoId } : p
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
