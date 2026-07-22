import React, { useMemo, type ReactNode } from 'react';
import type { AppState, Property } from '../types';
import { PhotoSection } from './PhotoSection';
import { buildPropertyPhotoTiles } from '../photoSectionBuilders';
import { type PropertyPhotoSlotKey } from '../propertyPhotoSlots';
import {
  addPropertyExtraPhotos,
  clearPropertySlotDocument,
  clearPropertySlotPhoto,
  propertyExtraPhotos,
  propertySlotDocumentInfo,
  propertySlotPhotoUri,
  removePropertyExtraPhoto,
  setPropertySlotDocument,
  setPropertySlotPhoto,
} from '../propertyPhotos';
import {
  setPropertyPhotoCaptionAndNotes,
  setPropertyPhotoFavorite,
  setPropertyPhotoNotes,
} from '../photoMeta';
import {
  hidePropertyPhotoSlotKey,
  restorePropertyHiddenPhotoSlots,
} from '../hiddenPhotoSlots';

export function PropertyPhotosSection(props: {
  state: AppState;
  property: Property;
  onSave: (state: AppState) => void;
  children?: ReactNode;
}) {
  const { state, property, onSave, children } = props;

  const extraPhotos = propertyExtraPhotos(state, property.id);
  const hasHiddenSlots = (property.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildPropertyPhotoTiles({
        hiddenSlotKeys: property.hiddenPhotoSlotKeys,
        getSlotUri: (key) => propertySlotPhotoUri(state, property, key as PropertyPhotoSlotKey),
        getSlotDocument: (key) =>
          propertySlotDocumentInfo(state, property, key as PropertyPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = property[key as PropertyPhotoSlotKey];
          return photoId
            ? state.propertyPhotos.find((photo) => photo.id === photoId)?.notes
            : undefined;
        },
        getSlotPhotoId: (key) => property[key as PropertyPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = property[key as PropertyPhotoSlotKey];
          return photoId
            ? state.propertyPhotos.find((photo) => photo.id === photoId)?.favorite
            : undefined;
        },
        onAddSlot: (key, uri) => {
          void setPropertySlotPhoto(state, property.id, key as PropertyPhotoSlotKey, uri).then(
            onSave
          );
        },
        onAddSlotDocument: (key, picked) => {
          void setPropertySlotDocument(
            state,
            property.id,
            key as PropertyPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearPropertySlotPhoto(state, property.id, key as PropertyPhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearPropertySlotDocument(state, property.id, key as PropertyPhotoSlotKey).then(
            onSave
          );
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearPropertySlotPhoto(
              state,
              property.id,
              key as PropertyPhotoSlotKey
            );
            next = await clearPropertySlotDocument(
              next,
              property.id,
              key as PropertyPhotoSlotKey
            );
            onSave(hidePropertyPhotoSlotKey(next, property.id, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = property[key as PropertyPhotoSlotKey];
          if (photoId) onSave(setPropertyPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setPropertyPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removePropertyExtraPhoto(state, property.id, photoId).then(onSave);
        },
        onLabelExtra: (photoId, label, notes) => {
          onSave(setPropertyPhotoCaptionAndNotes(state, photoId, label, notes));
        },
      }),
    [extraPhotos, onSave, property, state]
  );

  async function handleAddExtraPhotos(sourceUris: string[]) {
    if (sourceUris.length === 0) return;
    const next = await addPropertyExtraPhotos(state, property.id, sourceUris);
    onSave(next);
    const added = propertyExtraPhotos(next, property.id).slice(-sourceUris.length);
    return added.map((photo) => photo.id);
  }

  return (
    <PhotoSection
      tiles={photoTiles}
      onAddPhotos={handleAddExtraPhotos}
      hasHiddenSlots={hasHiddenSlots}
      onRestoreHiddenSlots={() => onSave(restorePropertyHiddenPhotoSlots(state, property.id))}
    >
      {children}
    </PhotoSection>
  );
}
