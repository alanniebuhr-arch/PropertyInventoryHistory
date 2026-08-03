/** Session-only: reopen Search photos after Back from a photo owner (room/asset). */
let pendingReopenPropertyId: string | null = null;

export function markSearchPhotosReopen(propertyId: string): void {
  pendingReopenPropertyId = propertyId;
}

/** Returns true once if Search photos should reopen for this property, then clears. */
export function consumeSearchPhotosReopen(propertyId: string): boolean {
  if (pendingReopenPropertyId !== propertyId) return false;
  pendingReopenPropertyId = null;
  return true;
}
