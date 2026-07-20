import type { AppState, ProjectVendor, VendorPhoto } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { uid, nowISO } from './utils';

export function photosForVendor(state: AppState, vendorId: string): VendorPhoto[] {
  const vendor = state.projectVendors.find((v) => v.id === vendorId);
  if (!vendor) return [];
  return vendor.photoIds
    .map((photoId) => state.vendorPhotos.find((p) => p.id === photoId))
    .filter((p): p is VendorPhoto => p != null);
}

export function firstPhotoUriForVendor(state: AppState, vendor: ProjectVendor): string | undefined {
  return photosForVendor(state, vendor.id)[0]?.localUri;
}

export async function addVendorPhotos(
  state: AppState,
  vendorId: string,
  sourceUris: string[]
): Promise<AppState> {
  if (sourceUris.length === 0) return state;
  const vendor = state.projectVendors.find((v) => v.id === vendorId);
  if (!vendor) return state;

  const newPhotos: VendorPhoto[] = await Promise.all(
    sourceUris.map(async (sourceUri) => {
      const photoId = uid('photo');
      const localUri = await persistPhotoFromUri(sourceUri, photoId);
      return {
        id: photoId,
        vendorId,
        localUri,
        createdAtISO: nowISO(),
      };
    })
  );

  const newPhotoIds = newPhotos.map((p) => p.id);
  return {
    ...state,
    vendorPhotos: [...state.vendorPhotos, ...newPhotos],
    projectVendors: state.projectVendors.map((v) =>
      v.id === vendorId ? { ...v, photoIds: [...v.photoIds, ...newPhotoIds] } : v
    ),
  };
}

export async function removeVendorPhoto(
  state: AppState,
  vendorId: string,
  photoId: string
): Promise<AppState> {
  const photo = state.vendorPhotos.find((p) => p.id === photoId);
  if (photo) await deletePhotoFile(photo.localUri);

  return {
    ...state,
    vendorPhotos: state.vendorPhotos.filter((p) => p.id !== photoId),
    projectVendors: state.projectVendors.map((v) =>
      v.id === vendorId ? { ...v, photoIds: v.photoIds.filter((id) => id !== photoId) } : v
    ),
  };
}
