import React, { useMemo, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { AppState, WasteWaterDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import {
  wasteWaterHasInfo,
  wasteWaterPhotoSlotsForDetails,
  wasteWaterSystemLabel,
  type WasteWaterPhotoSlotKey,
} from '../wasteWaterSlots';
import {
  addWasteWaterExtraPhotos,
  clearWasteWaterSlotDocument,
  clearWasteWaterSlotPhoto,
  removeWasteWaterExtraPhoto,
  setWasteWaterExtraPhotoCaption,
  setWasteWaterSlotDocument,
  setWasteWaterSlotPhoto,
  wasteWaterExtraPhotos,
  wasteWaterSlotDocumentInfo,
  wasteWaterSlotPhotoUri,
} from '../wasteWaterPhotos';
import {
  WasteWaterForm,
  WasteWaterNotesFields,
} from '../screens/itemDetails/WasteWaterForm';

export function WasteWaterDisplayView(props: {
  state: AppState;
  details: WasteWaterDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: WasteWaterDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange } = props;
  const [editingSection, setEditingSection] = useState<'main' | 'notes' | null>(null);

  const slots = wasteWaterPhotoSlotsForDetails(details);
  const extraPhotos = wasteWaterExtraPhotos(state, itemId, details);

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots,
        getSlotUri: (key) => wasteWaterSlotPhotoUri(state, details, key as WasteWaterPhotoSlotKey),
        getSlotDocument: (key) =>
          wasteWaterSlotDocumentInfo(state, details, key as WasteWaterPhotoSlotKey),
        onAddSlot: (key, uri) => {
          void setWasteWaterSlotPhoto(state, itemId, key as WasteWaterPhotoSlotKey, uri).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setWasteWaterSlotDocument(
            state,
            itemId,
            key as WasteWaterPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearWasteWaterSlotPhoto(state, itemId, key as WasteWaterPhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearWasteWaterSlotDocument(state, itemId, key as WasteWaterPhotoSlotKey).then(
            onSave
          );
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeWasteWaterExtraPhoto(state, itemId, photoId).then(onSave);
        },
        onLabelExtra: (photoId, label) => {
          onSave(setWasteWaterExtraPhotoCaption(state, photoId, label));
        },
      }),
    [details, extraPhotos, itemId, onSave, slots, state]
  );

  async function handleAddPhotos(sourceUris: string[]) {
    const next = await addWasteWaterExtraPhotos(state, itemId, sourceUris);
    onSave(next);
    const item = next.items.find((entry) => entry.id === itemId);
    return item ? item.photoIds.slice(-sourceUris.length) : [];
  }

  function updateDetails(next: WasteWaterDetails) {
    onDetailsChange(next);
  }

  return (
    <View>
      <PhotoSection tiles={photoTiles} slotLabelWidth={88} onAddPhotos={handleAddPhotos} onActiveHeroLabelChange={onActiveHeroLabelChange}>
        {photoHeader}
      </PhotoSection>

      <EditableDetailSection
        title="Waste water"
        isEditing={editingSection === 'main'}
        onPress={() => setEditingSection('main')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'main' ? (
          <WasteWaterForm details={details} onChange={updateDetails} />
        ) : wasteWaterHasInfo(details) ? (
          <DetailDisplayRow
            label="System"
            value={wasteWaterSystemLabel(details.system, details.systemOther)}
          />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Notes"
        isEditing={editingSection === 'notes'}
        onPress={() => setEditingSection('notes')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'notes' ? (
          <WasteWaterNotesFields details={details} onChange={updateDetails} />
        ) : details.notes?.trim() ? (
          <DetailDisplayRow label="Notes" value={details.notes} />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
