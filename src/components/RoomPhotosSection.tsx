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
  setRoomSlotDocument,
  setRoomSlotPhoto,
} from '../roomPhotos';
import { setRoomPhotoCaptionAndNotes, setRoomPhotoFavorite, setRoomPhotoNotes } from '../photoMeta';
import { hideRoomPhotoSlotKey, restoreRoomHiddenPhotoSlots } from '../hiddenPhotoSlots';
import { withReorderedRoomPhotoIds } from '../photoReorder';

export function RoomPhotosSection(props: {
  state: AppState;
  roomId: string;
  room: AppState['rooms'][number];
  onSave: (state: AppState) => void;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
  children?: ReactNode;
  childrenGesture?: ReturnType<typeof Gesture.Pan>;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  showReorderArrows?: boolean;
  onToggleReorderArrows?: () => void;
}) {
  const {
    state,
    roomId,
    room,
    onSave,
    onActiveHeroLabelChange,
    children,
    childrenGesture,
    expanded,
    onToggleExpanded,
    showReorderArrows,
    onToggleReorderArrows,
  } = props;

  const extraPhotos = photosForRoom(state, roomId);
  const roomSlots = useMemo(() => roomPhotoSlotsForRoom(room), [room]);
  const hasHiddenSlots = (room.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: roomSlots,
        hiddenSlotKeys: room.hiddenPhotoSlotKeys,
        getSlotUri: (key) => roomSlotPhotoUri(state, room, key as RoomSlotKey),
        getSlotDocument: (key) => roomSlotDocumentInfo(state, room, key as RoomSlotKey),
        getSlotNotes: (key) => {
          const attachment = room.slotAttachments?.[key as RoomSlotKey];
          if (!attachment || attachment.kind !== 'photo') return undefined;
          return state.roomPhotos.find((photo) => photo.id === attachment.id)?.notes;
        },
        getSlotPhotoId: (key) => {
          const attachment = room.slotAttachments?.[key as RoomSlotKey];
          return attachment?.kind === 'photo' ? attachment.id : undefined;
        },
        getSlotFavorite: (key) => {
          const attachment = room.slotAttachments?.[key as RoomSlotKey];
          if (!attachment || attachment.kind !== 'photo') return undefined;
          return state.roomPhotos.find((photo) => photo.id === attachment.id)?.favorite;
        },
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
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearRoomSlotPhoto(state, roomId, key as RoomSlotKey);
            next = await clearRoomSlotDocument(next, roomId, key as RoomSlotKey);
            onSave(hideRoomPhotoSlotKey(next, roomId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const attachment = room.slotAttachments?.[key as RoomSlotKey];
          if (attachment?.kind === 'photo') {
            onSave(setRoomPhotoNotes(state, attachment.id, notes));
          }
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setRoomPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeRoomPhoto(state, roomId, photoId).then(onSave);
        },
        onReorderExtra: (photoId, direction) => {
          onSave(
            withReorderedRoomPhotoIds(
              state,
              roomId,
              photoId,
              direction,
              extraPhotos.map((p) => p.id)
            )
          );
        },
        onLabelExtra: (photoId, caption, notes) => {
          onSave(setRoomPhotoCaptionAndNotes(state, photoId, caption, notes));
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
      hasHiddenSlots={hasHiddenSlots}
      onRestoreHiddenSlots={() => onSave(restoreRoomHiddenPhotoSlots(state, roomId))}
      expanded={expanded}
      onToggleExpanded={onToggleExpanded}
      showReorderArrows={showReorderArrows}
      onToggleReorderArrows={onToggleReorderArrows}
    >
      {children}
    </PhotoSection>
  );
}
