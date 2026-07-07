import type { AppState, Room, RoomPhoto, RoomSlotKey, SlotAttachment } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { slotDocumentInfo } from './documents';
import { addDocumentToState, removeDocumentFromState } from './slotDocumentOps';
import { uid, nowISO } from './utils';
import { roomPhotoSlotsForRoom } from './roomPhotoSlots';

function roomSlotAttachmentIds(room: Room): Set<string> {
  const validKeys = new Set(roomPhotoSlotsForRoom(room).map((slot) => slot.key));
  const ids = new Set<string>();
  for (const [key, attachment] of Object.entries(room.slotAttachments ?? {})) {
    if (!validKeys.has(key as RoomSlotKey) || !attachment) continue;
    ids.add(attachment.id);
  }
  return ids;
}

export function photosForRoom(state: AppState, roomId: string): RoomPhoto[] {
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) return [];
  const slotIds = roomSlotAttachmentIds(room);
  return room.photoIds
    .filter((photoId) => !slotIds.has(photoId))
    .map((photoId) => state.roomPhotos.find((p) => p.id === photoId))
    .filter((p): p is RoomPhoto => p != null);
}

export function roomSlotPhotoUri(
  state: AppState,
  room: Room,
  slotKey: RoomSlotKey
): string | undefined {
  const attachment = room.slotAttachments?.[slotKey];
  if (!attachment || attachment.kind !== 'photo') return undefined;
  return state.roomPhotos.find((p) => p.id === attachment.id)?.localUri;
}

export function roomSlotDocumentInfo(
  state: AppState,
  room: Room,
  slotKey: RoomSlotKey
) {
  const attachment = room.slotAttachments?.[slotKey];
  if (!attachment || attachment.kind !== 'document') return undefined;
  return slotDocumentInfo(state, attachment.id);
}

export function firstPhotoUriForRoom(state: AppState, room: Room): string | undefined {
  for (const slot of roomPhotoSlotsForRoom(room)) {
    const slotUri = roomSlotPhotoUri(state, room, slot.key);
    if (slotUri) return slotUri;
  }
  return photosForRoom(state, room.id)[0]?.localUri;
}

async function clearRoomSlotAttachment(
  state: AppState,
  roomId: string,
  slotKey: RoomSlotKey
): Promise<AppState> {
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) return state;

  const attachment = room.slotAttachments?.[slotKey];
  if (!attachment) return state;

  let nextState = state;
  if (attachment.kind === 'photo') {
    const photo = state.roomPhotos.find((p) => p.id === attachment.id);
    if (photo) await deletePhotoFile(photo.localUri);
    nextState = {
      ...nextState,
      roomPhotos: nextState.roomPhotos.filter((p) => p.id !== attachment.id),
      rooms: nextState.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              photoIds: r.photoIds.filter((id) => id !== attachment.id),
              slotAttachments: {
                ...r.slotAttachments,
                [slotKey]: undefined,
              },
            }
          : r
      ),
    };
  } else {
    nextState = await removeDocumentFromState(nextState, attachment.id);
    nextState = {
      ...nextState,
      rooms: nextState.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              slotAttachments: {
                ...r.slotAttachments,
                [slotKey]: undefined,
              },
            }
          : r
      ),
    };
  }

  return nextState;
}

export async function setRoomSlotPhoto(
  state: AppState,
  roomId: string,
  slotKey: RoomSlotKey,
  sourceUri: string
): Promise<AppState> {
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) return state;

  let nextState = await clearRoomSlotAttachment(state, roomId, slotKey);

  const photoId = uid('photo');
  const localUri = await persistPhotoFromUri(sourceUri, photoId);
  const photo: RoomPhoto = {
    id: photoId,
    roomId,
    localUri,
    createdAtISO: nowISO(),
  };

  const attachment: SlotAttachment = { kind: 'photo', id: photoId };

  return {
    ...nextState,
    roomPhotos: [...nextState.roomPhotos, photo],
    rooms: nextState.rooms.map((r) =>
      r.id === roomId
        ? {
            ...r,
            photoIds: [...r.photoIds, photoId],
            slotAttachments: { ...r.slotAttachments, [slotKey]: attachment },
          }
        : r
    ),
  };
}

export async function clearRoomSlotPhoto(
  state: AppState,
  roomId: string,
  slotKey: RoomSlotKey
): Promise<AppState> {
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) return state;
  const attachment = room.slotAttachments?.[slotKey];
  if (!attachment || attachment.kind !== 'photo') return state;
  return clearRoomSlotAttachment(state, roomId, slotKey);
}

export async function setRoomSlotDocument(
  state: AppState,
  roomId: string,
  slotKey: RoomSlotKey,
  sourceUri: string,
  fileName: string
): Promise<AppState> {
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) return state;

  let nextState = await clearRoomSlotAttachment(state, roomId, slotKey);
  const { state: withDoc, document } = await addDocumentToState(nextState, sourceUri, fileName);
  const attachment: SlotAttachment = { kind: 'document', id: document.id };

  return {
    ...withDoc,
    rooms: withDoc.rooms.map((r) =>
      r.id === roomId
        ? {
            ...r,
            slotAttachments: { ...r.slotAttachments, [slotKey]: attachment },
          }
        : r
    ),
  };
}

export async function clearRoomSlotDocument(
  state: AppState,
  roomId: string,
  slotKey: RoomSlotKey
): Promise<AppState> {
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) return state;
  const attachment = room.slotAttachments?.[slotKey];
  if (!attachment || attachment.kind !== 'document') return state;
  return clearRoomSlotAttachment(state, roomId, slotKey);
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
