import React, { useMemo, type ReactNode } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import type { AppState } from '../types';
import { PhotoSection } from './PhotoSection';
import { buildExtraOnlyPhotoTiles } from '../photoSectionBuilders';
import {
  addProjectPhotos,
  photosForProject,
  removeProjectPhoto,
} from '../projectPhotos';
import {
  setProjectPhotoCaptionAndNotes,
  setProjectPhotoFavorite,
} from '../photoMeta';

export function ProjectPhotosSection(props: {
  state: AppState;
  projectId: string;
  onSave: (state: AppState) => void;
  children?: ReactNode;
  childrenGesture?: ReturnType<typeof Gesture.Pan>;
}) {
  const { state, projectId, onSave, children, childrenGesture } = props;

  const extraPhotos = photosForProject(state, projectId);

  const photoTiles = useMemo(
    () =>
      buildExtraOnlyPhotoTiles({
        photos: extraPhotos.map((photo) => ({
          id: photo.id,
          localUri: photo.localUri,
          caption: photo.caption,
          notes: photo.notes,
          favorite: photo.favorite,
        })),
        onDeletePhoto: (photoId) => {
          void removeProjectPhoto(state, projectId, photoId).then(onSave);
        },
        onLabelPhoto: (photoId, label, notes) => {
          onSave(setProjectPhotoCaptionAndNotes(state, photoId, label, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setProjectPhotoFavorite(state, photoId, favorite));
        },
      }),
    [extraPhotos, onSave, projectId, state]
  );

  async function handleAddPhotos(sourceUris: string[]) {
    if (sourceUris.length === 0) return;
    const next = await addProjectPhotos(state, projectId, sourceUris);
    onSave(next);
    const added = photosForProject(next, projectId).slice(-sourceUris.length);
    return added.map((photo) => photo.id);
  }

  return (
    <PhotoSection
      tiles={photoTiles}
      onAddPhotos={handleAddPhotos}
      childrenGesture={childrenGesture}
    >
      {children}
    </PhotoSection>
  );
}
