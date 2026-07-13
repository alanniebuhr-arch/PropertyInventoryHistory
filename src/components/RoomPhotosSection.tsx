import React, { useMemo, type ReactNode } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import type { AppState } from '../types';
import { PhotoSection } from './PhotoSection';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import { roomPhotoSlotsForRoom } from '../roomPhotoSlots';
import type { RoomSlotKey } from '../types';
import {
  addRoomPhotos,
  clearRoomSlotDocument,
  clearRoomSlotPhoto,
  photosForRoom,
  removeRoomPhoto,
  roomSlotDocumentInfo,
  roomSlotPhotoUri,
  setRoomPhotoCaption,
  setRoomSlotDocument,
  setRoomSlotPhoto,
} from '../roomPhotos';

export function RoomPhotosSection(props: {
  state: AppState;
  roomId: string;
  room: AppState['rooms'][number];
  onSave: (state: AppState) => void;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
  children?: ReactNode;
  childrenGesture?: ReturnType<typeof Gesture.Pan>;
}) {
  const { state, roomId, room, onSave, onActiveHeroLabelChange, children, childrenGesture } = props;

  const extraPhotos = photosForRoom(state, roomId);
  const roomSlots = useMemo(() => roomPhotoSlotsForRoom(room), [room]);

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: roomSlots,
        getSlotUri: (key) => roomSlotPhotoUri(state, room, key as RoomSlotKey),
        getSlotDocument: (key) => roomSlotDocumentInfo(state, room, key as RoomSlotKey),
        onAddSlot: (key, uri) => {
          void setRoomSlotPhoto(state, roomId, key as RoomSlotKey, uri).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setRoomSlotDocument(
            state,
            roomId,
            key as RoomSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearRoomSlotPhoto(state, roomId, key as RoomSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearRoomSlotDocument(state, roomId, key as RoomSlotKey).then(onSave);
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeRoomPhoto(state, roomId, photoId).then(onSave);
        },
        onLabelExtra: (photoId, caption) => {
          onSave(setRoomPhotoCaption(state, photoId, caption));
        },
      }),
    [extraPhotos, onSave, room, roomId, roomSlots, state]
  );

  async function handleAddRoomPhotos(sourceUris: string[]) {
    if (sourceUris.length === 0) return;
    const next = await addRoomPhotos(state, roomId, sourceUris);
    onSave(next);
    return photosForRoom(next, roomId)
      .slice(-sourceUris.length)
      .map((photo) => photo.id);
  }

  return (
    <PhotoSection
      tiles={photoTiles}
      hint={extraPhotos.length === 0 ? 'Add photos of this room.' : undefined}
      onAddPhotos={handleAddRoomPhotos}
      onActiveHeroLabelChange={onActiveHeroLabelChange}
      childrenGesture={childrenGesture}
    >
      {children}
    </PhotoSection>
  );
}
