import React, { useMemo, type ReactNode } from 'react';
import type { AppState } from '../types';
import { PhotoSection } from './PhotoSection';
import { buildExtraOnlyPhotoTiles } from '../photoSectionBuilders';
import { addRoomPhotos, photosForRoom, removeRoomPhoto, setRoomPhotoCaption } from '../roomPhotos';

export function RoomPhotosSection(props: {
  state: AppState;
  roomId: string;
  onSave: (state: AppState) => void;
  children?: ReactNode;
}) {
  const { state, roomId, onSave, children } = props;

  const roomPhotos = photosForRoom(state, roomId);

  const photoTiles = useMemo(
    () =>
      buildExtraOnlyPhotoTiles({
        photos: roomPhotos,
        onDeletePhoto: (photoId) => {
          void removeRoomPhoto(state, roomId, photoId).then(onSave);
        },
        onLabelPhoto: (photoId, caption) => {
          onSave(setRoomPhotoCaption(state, photoId, caption));
        },
      }),
    [onSave, roomId, roomPhotos, state]
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
      hint={roomPhotos.length === 0 ? 'Add photos of this room.' : undefined}
      onAddPhotos={handleAddRoomPhotos}
    >
      {children}
    </PhotoSection>
  );
}
