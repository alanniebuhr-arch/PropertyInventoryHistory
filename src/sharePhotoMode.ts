/** Export-time choice for which photos to include in a shared image. */
export type SharePhotoMode = 'all' | 'favorites';

export function hasFavoritePhotos(photos: { favorite?: boolean }[]): boolean {
  return photos.some((photo) => photo.favorite === true);
}

export function filterFavoritePhotos<T extends { favorite?: boolean }>(photos: T[]): T[] {
  return photos.filter((photo) => photo.favorite === true);
}

export function applySharePhotoMode<T extends { favorite?: boolean }>(
  photos: T[],
  mode: SharePhotoMode = 'all'
): T[] {
  return mode === 'favorites' ? filterFavoritePhotos(photos) : photos;
}
