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
  setPropertyExtraPhotoCaption,
  setPropertySlotDocument,
  setPropertySlotPhoto,
} from '../propertyPhotos';

export function PropertyPhotosSection(props: {
  state: AppState;
  property: Property;
  onSave: (state: AppState) => void;
  children?: ReactNode;
}) {
  const { state, property, onSave, children } = props;

  const extraPhotos = propertyExtraPhotos(state, property.id);

  const photoTiles = useMemo(
    () =>
      buildPropertyPhotoTiles({
        getSlotUri: (key) => propertySlotPhotoUri(state, property, key as PropertyPhotoSlotKey),
        getSlotDocument: (key) =>
          propertySlotDocumentInfo(state, property, key as PropertyPhotoSlotKey),
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
            picked.fileName
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
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removePropertyExtraPhoto(state, property.id, photoId).then(onSave);
        },
        onLabelExtra: (photoId, label) => {
          onSave(setPropertyExtraPhotoCaption(state, photoId, label));
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
    <PhotoSection tiles={photoTiles} onAddPhotos={handleAddExtraPhotos}>
      {children}
    </PhotoSection>
  );
}
