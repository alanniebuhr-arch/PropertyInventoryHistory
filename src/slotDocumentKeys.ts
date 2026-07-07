/** e.g. fieldCardPhotoId → fieldCardDocumentId */
export function documentIdKeyForPhotoSlot(photoSlotKey: string): string {
  if (!photoSlotKey.endsWith('PhotoId')) {
    throw new Error(`Expected a *PhotoId slot key, got ${photoSlotKey}`);
  }
  return `${photoSlotKey.slice(0, -'PhotoId'.length)}DocumentId`;
}
