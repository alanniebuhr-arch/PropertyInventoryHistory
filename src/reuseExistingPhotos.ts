import type { AppState } from './types';

export type ReuseExistingPhotoPick = {
  uri: string;
  /** Source photo caption (label), when set. */
  caption?: string;
  notes?: string;
};

export type ReuseExistingPhotosRequest = {
  multi: boolean;
  resolve: (picks: ReuseExistingPhotoPick[] | undefined) => void;
};

export type ReuseExistingPhotosHost = {
  state: AppState;
  propertyId: string;
  open: (request: ReuseExistingPhotosRequest) => void;
};

let activeHost: ReuseExistingPhotosHost | null = null;

/** Pending caption/notes keyed by source URI, consumed when the copy is created. */
const pendingMetaByUri = new Map<string, { caption?: string; notes?: string }>();

/** Register the on-screen host that can show the reuse picker (property-scoped). */
export function registerReuseExistingPhotosHost(
  host: ReuseExistingPhotosHost | null
): void {
  activeHost = host;
}

export function isReuseExistingPhotosAvailable(): boolean {
  return activeHost != null && Boolean(activeHost.propertyId);
}

/** Open the reuse picker; resolves to selected photos (uri + caption/notes). */
export function requestReuseExistingPhotos(options: {
  multi: boolean;
}): Promise<ReuseExistingPhotoPick[] | undefined> {
  return new Promise((resolve) => {
    if (!activeHost) {
      resolve(undefined);
      return;
    }
    activeHost.open({ multi: options.multi, resolve });
  });
}

export function getReuseExistingPhotosHost(): ReuseExistingPhotosHost | null {
  return activeHost;
}

/** Stash caption/notes so the next persist from these URIs copies them onto new rows. */
export function stashReusePhotoMeta(picks: ReuseExistingPhotoPick[]): void {
  for (const pick of picks) {
    const caption = pick.caption?.trim() || undefined;
    const notes = pick.notes?.trim() || undefined;
    if (!caption && !notes) continue;
    pendingMetaByUri.set(pick.uri, { caption, notes });
  }
}

/** Take and clear stashed meta for a source URI (if any). */
export function consumeReusePhotoMeta(
  sourceUri: string
): { caption?: string; notes?: string } | undefined {
  const meta = pendingMetaByUri.get(sourceUri);
  if (!meta) return undefined;
  pendingMetaByUri.delete(sourceUri);
  return meta;
}

/** Merge stashed reuse caption/notes into a newly created photo record. */
export function withReusePhotoMeta<T extends object>(sourceUri: string, photo: T): T {
  const meta = consumeReusePhotoMeta(sourceUri);
  if (!meta) return photo;
  const existing = photo as T & { caption?: string; notes?: string };
  // Keep an explicit caption already set on the new row (e.g. vendor image / receipt).
  return {
    ...photo,
    ...(meta.caption && !existing.caption?.trim() ? { caption: meta.caption } : {}),
    ...(meta.notes && !existing.notes?.trim() ? { notes: meta.notes } : {}),
  };
}
