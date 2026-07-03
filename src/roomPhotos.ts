import type { AppState, Room, RoomPhoto } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { uid, nowISO } from './utils';

export function photosForRoom(state: AppState, roomId: string): RoomPhoto[] {
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) return [];
  return room.photoIds
    .map((photoId) => state.roomPhotos.find((p) => p.id === photoId))
    .filter((p): p is RoomPhoto => p != null);
}

export function firstPhotoUriForRoom(state: AppState, room: Room): string | undefined {
  return photosForRoom(state, room.id)[0]?.localUri;
}

export async function addRoomPhotos(
  state: AppState,
  roomId: string,
  sourceUris: string[]
): Promise<AppState> {
  if (sourceUris.length === 0) return state;
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) return state;

  const newPhotos: RoomPhoto[] = await Promise.all(
    sourceUris.map(async (sourceUri) => {
      const photoId = uid('photo');
      const localUri = await persistPhotoFromUri(sourceUri, photoId);
      return {
        id: photoId,
        roomId,
        localUri,
        createdAtISO: nowISO(),
      };
    })
  );

  const newPhotoIds = newPhotos.map((p) => p.id);
  return {
    ...state,
    roomPhotos: [...state.roomPhotos, ...newPhotos],
    rooms: state.rooms.map((r) =>
      r.id === roomId ? { ...r, photoIds: [...r.photoIds, ...newPhotoIds] } : r
    ),
  };
}

export async function removeRoomPhoto(
  state: AppState,
  roomId: string,
  photoId: string
): Promise<AppState> {
  const photo = state.roomPhotos.find((p) => p.id === photoId);
  if (photo) await deletePhotoFile(photo.localUri);

  return {
    ...state,
    roomPhotos: state.roomPhotos.filter((p) => p.id !== photoId),
    rooms: state.rooms.map((r) =>
      r.id === roomId ? { ...r, photoIds: r.photoIds.filter((id) => id !== photoId) } : r
    ),
  };
}

export function setRoomPhotoCaption(
  state: AppState,
  photoId: string,
  caption: string
): AppState {
  const trimmed = caption.trim();
  return {
    ...state,
    roomPhotos: state.roomPhotos.map((photo) =>
      photo.id === photoId ? { ...photo, caption: trimmed || undefined } : photo
    ),
  };
}
