import React, { useMemo, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { AppState, WaterTreatmentDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import {
  WATER_TREATMENT_PHOTO_SLOTS,
  waterTreatmentHasInfo,
  type WaterTreatmentPhotoSlotKey,
} from '../waterTreatmentSlots';
import {
  addWaterTreatmentExtraPhotos,
  clearWaterTreatmentSlotDocument,
  clearWaterTreatmentSlotPhoto,
  removeWaterTreatmentExtraPhoto,
  setWaterTreatmentSlotDocument,
  setWaterTreatmentSlotPhoto,
  waterTreatmentExtraPhotos,
  waterTreatmentSlotDocumentInfo,
  waterTreatmentSlotPhotoUri,
} from '../waterTreatmentPhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import { WaterTreatmentForm } from '../screens/itemDetails/WaterTreatmentForm';

export function WaterTreatmentDisplayView(props: {
  state: AppState;
  details: WaterTreatmentDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: WaterTreatmentDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange } = props;
  const [editingSection, setEditingSection] = useState<'treatment' | null>(null);

  const extraPhotos = waterTreatmentExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: WATER_TREATMENT_PHOTO_SLOTS,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) =>
          waterTreatmentSlotPhotoUri(state, details, key as WaterTreatmentPhotoSlotKey),
        getSlotDocument: (key) =>
          waterTreatmentSlotDocumentInfo(state, details, key as WaterTreatmentPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as WaterTreatmentPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as WaterTreatmentPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as WaterTreatmentPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setWaterTreatmentSlotPhoto(
            state,
            itemId,
            key as WaterTreatmentPhotoSlotKey,
            uri
          ).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setWaterTreatmentSlotDocument(
            state,
            itemId,
            key as WaterTreatmentPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearWaterTreatmentSlotPhoto(state, itemId, key as WaterTreatmentPhotoSlotKey).then(
            onSave
          );
        },
        onDeleteSlotDocument: (key) => {
          void clearWaterTreatmentSlotDocument(
            state,
            itemId,
            key as WaterTreatmentPhotoSlotKey
          ).then(onSave);
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearWaterTreatmentSlotPhoto(
              state,
              itemId,
              key as WaterTreatmentPhotoSlotKey
            );
            next = await clearWaterTreatmentSlotDocument(
              next,
              itemId,
              key as WaterTreatmentPhotoSlotKey
            );
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as WaterTreatmentPhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeWaterTreatmentExtraPhoto(state, itemId, photoId).then(onSave);
        },
        onLabelExtra: (photoId, label, notes) => {
          onSave(setItemPhotoCaptionAndNotes(state, photoId, label, notes));
        },
      }),
    [details, extraPhotos, item?.hiddenPhotoSlotKeys, itemId, onSave, state]
  );

  async function handleAddPhotos(sourceUris: string[]) {
    const next = await addWaterTreatmentExtraPhotos(state, itemId, sourceUris);
    onSave(next);
    const item = next.items.find((entry) => entry.id === itemId);
    return item ? item.photoIds.slice(-sourceUris.length) : [];
  }

  const extraDocumentRows = useMemo(
    () =>
      itemExtraDocumentRows(state, state.items.find((entry) => entry.id === itemId), (documentId) => {
        void removeItemExtraDocument(state, itemId, documentId).then(onSave);
      }),
    [itemId, onSave, state]
  );

  async function handleAddDocuments(
    picked: { uri: string; fileName: string; mimeType: string }[]
  ) {
    onSave(await addItemExtraDocuments(state, itemId, picked));
  }

  function updateDetails(next: WaterTreatmentDetails) {
    onDetailsChange(next);
  }

  return (
    <View>
      <PhotoSection
        tiles={photoTiles}
        onAddPhotos={handleAddPhotos}
        onAddDocuments={handleAddDocuments}
        extraDocumentRows={extraDocumentRows}
        onActiveHeroLabelChange={onActiveHeroLabelChange}
        hasHiddenSlots={hasHiddenSlots}
        onRestoreHiddenSlots={() => onSave(restoreItemHiddenPhotoSlots(state, itemId))}
      >
        {photoHeader}
      </PhotoSection>

      <EditableDetailSection
        title="Water treatment"
        isEditing={editingSection === 'treatment'}
        onPress={() => setEditingSection('treatment')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'treatment' ? (
          <WaterTreatmentForm details={details} onChange={updateDetails} />
        ) : waterTreatmentHasInfo(details) ? (
          <>
            <DetailDisplayRow label="System type" value={details.systemType} />
            <DetailDisplayRow label="Filter name" value={details.filterName} />
            <DetailDisplayRow label="Notes" value={details.notes} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
