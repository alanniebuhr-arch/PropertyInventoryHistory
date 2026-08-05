import type { AppState, ProjectVendor, VendorPhoto } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { withReusePhotoMeta } from './reuseExistingPhotos';
import { uid, nowISO } from './utils';

/** Stable caption marking the reserved Vendor image slot. */
export const VENDOR_IMAGE_CAPTION = 'vendor_image';

export function isVendorImagePhoto(photo: Pick<VendorPhoto, 'caption'>): boolean {
  return photo.caption?.trim() === VENDOR_IMAGE_CAPTION;
}

export function photosForVendor(state: AppState, vendorId: string): VendorPhoto[] {
  const vendor = state.projectVendors.find((v) => v.id === vendorId);
  if (!vendor) return [];
  return vendor.photoIds
    .map((photoId) => state.vendorPhotos.find((p) => p.id === photoId))
    .filter((p): p is VendorPhoto => p != null);
}

export function vendorImagePhoto(state: AppState, vendorId: string): VendorPhoto | undefined {
  return photosForVendor(state, vendorId).find(isVendorImagePhoto);
}

export function extraPhotosForVendor(state: AppState, vendorId: string): VendorPhoto[] {
  return photosForVendor(state, vendorId).filter((photo) => !isVendorImagePhoto(photo));
}

export function vendorPhotoDisplayLabel(photo: Pick<VendorPhoto, 'caption'>): string {
  if (isVendorImagePhoto(photo)) return 'Vendor image';
  return photo.caption?.trim() || 'Photo';
}

export function firstPhotoUriForVendor(state: AppState, vendor: ProjectVendor): string | undefined {
  const photos = photosForVendor(state, vendor.id);
  return (photos.find(isVendorImagePhoto) ?? photos[0])?.localUri;
}

export async function setVendorImagePhoto(
  state: AppState,
  vendorId: string,
  sourceUri: string
): Promise<AppState> {
  const vendor = state.projectVendors.find((v) => v.id === vendorId);
  if (!vendor) return state;

  let nextState = state;
  const existing = vendorImagePhoto(nextState, vendorId);
  if (existing) {
    nextState = await removeVendorPhoto(nextState, vendorId, existing.id);
  }

  const photoId = uid('photo');
  const localUri = await persistPhotoFromUri(sourceUri, photoId);
  const newPhoto: VendorPhoto = {
    id: photoId,
    vendorId,
    localUri,
    caption: VENDOR_IMAGE_CAPTION,
    createdAtISO: nowISO(),
  };

  const currentVendor = nextState.projectVendors.find((v) => v.id === vendorId);
  if (!currentVendor) return nextState;

  return {
    ...nextState,
    vendorPhotos: [...nextState.vendorPhotos, newPhoto],
    projectVendors: nextState.projectVendors.map((v) =>
      v.id === vendorId
        ? { ...v, photoIds: [photoId, ...v.photoIds.filter((id) => id !== photoId)] }
        : v
    ),
  };
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
      return withReusePhotoMeta(sourceUri, {
        id: photoId,
        vendorId,
        localUri,
        createdAtISO: nowISO(),
      });
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
