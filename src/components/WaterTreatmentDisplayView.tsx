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
  setWaterTreatmentExtraPhotoCaption,
  setWaterTreatmentSlotDocument,
  setWaterTreatmentSlotPhoto,
  waterTreatmentExtraPhotos,
  waterTreatmentSlotDocumentInfo,
  waterTreatmentSlotPhotoUri,
} from '../waterTreatmentPhotos';
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

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: WATER_TREATMENT_PHOTO_SLOTS,
        getSlotUri: (key) =>
          waterTreatmentSlotPhotoUri(state, details, key as WaterTreatmentPhotoSlotKey),
        getSlotDocument: (key) =>
          waterTreatmentSlotDocumentInfo(state, details, key as WaterTreatmentPhotoSlotKey),
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
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeWaterTreatmentExtraPhoto(state, itemId, photoId).then(onSave);
        },
        onLabelExtra: (photoId, label) => {
          onSave(setWaterTreatmentExtraPhotoCaption(state, photoId, label));
        },
      }),
    [details, extraPhotos, itemId, onSave, state]
  );

  async function handleAddPhotos(sourceUris: string[]) {
    const next = await addWaterTreatmentExtraPhotos(state, itemId, sourceUris);
    onSave(next);
    const item = next.items.find((entry) => entry.id === itemId);
    return item ? item.photoIds.slice(-sourceUris.length) : [];
  }

  function updateDetails(next: WaterTreatmentDetails) {
    onDetailsChange(next);
  }

  return (
    <View>
      <PhotoSection tiles={photoTiles} onAddPhotos={handleAddPhotos} onActiveHeroLabelChange={onActiveHeroLabelChange}>
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
