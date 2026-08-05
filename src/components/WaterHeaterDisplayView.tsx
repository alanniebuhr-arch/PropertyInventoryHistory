import React, { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../textScale';
import type { AppState, WaterHeaterDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import { withReorderedItemPhotoIds } from '../photoReorder';
import { fuelTypeLabel } from '../furnaceSlots';
import {
  WATER_HEATER_PHOTO_SLOTS,
  waterHeaterHasInfo,
  type WaterHeaterPhotoSlotKey,
} from '../waterHeaterSlots';
import {
  addWaterHeaterExtraPhotos,
  clearWaterHeaterSlotDocument,
  clearWaterHeaterSlotPhoto,
  removeWaterHeaterExtraPhoto,
  setWaterHeaterSlotDocument,
  setWaterHeaterSlotPhoto,
  waterHeaterExtraPhotos,
  waterHeaterSlotDocumentInfo,
  waterHeaterSlotPhotoUri,
} from '../waterHeaterPhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import { WaterHeaterForm } from '../screens/itemDetails/WaterHeaterForm';

export function WaterHeaterDisplayView(props: {
  state: AppState;
  details: WaterHeaterDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: WaterHeaterDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
  showReorderArrows?: boolean;
  onToggleReorderArrows?: () => void;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange, showReorderArrows, onToggleReorderArrows } = props;
  const [editingSection, setEditingSection] = useState<'heater' | null>(null);

  const extraPhotos = waterHeaterExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: WATER_HEATER_PHOTO_SLOTS,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) => waterHeaterSlotPhotoUri(state, details, key as WaterHeaterPhotoSlotKey),
        getSlotDocument: (key) =>
          waterHeaterSlotDocumentInfo(state, details, key as WaterHeaterPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as WaterHeaterPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as WaterHeaterPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as WaterHeaterPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setWaterHeaterSlotPhoto(state, itemId, key as WaterHeaterPhotoSlotKey, uri).then(
            onSave
          );
        },
        onAddSlotDocument: (key, picked) => {
          void setWaterHeaterSlotDocument(
            state,
            itemId,
            key as WaterHeaterPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearWaterHeaterSlotPhoto(state, itemId, key as WaterHeaterPhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearWaterHeaterSlotDocument(state, itemId, key as WaterHeaterPhotoSlotKey).then(
            onSave
          );
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearWaterHeaterSlotPhoto(
              state,
              itemId,
              key as WaterHeaterPhotoSlotKey
            );
            next = await clearWaterHeaterSlotDocument(next, itemId, key as WaterHeaterPhotoSlotKey);
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as WaterHeaterPhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeWaterHeaterExtraPhoto(state, itemId, photoId).then(onSave);
        },
        onReorderExtra: (photoId, direction) => {
          onSave(
            withReorderedItemPhotoIds(
              state,
              itemId,
              photoId,
              direction,
              extraPhotos.map((p) => p.id)
            )
          );
        },
        onLabelExtra: (photoId, label, notes) => {
          onSave(setItemPhotoCaptionAndNotes(state, photoId, label, notes));
        },
      }),
    [details, extraPhotos, item?.hiddenPhotoSlotKeys, itemId, onSave, state]
  );

  async function handleAddPhotos(sourceUris: string[]) {
    const next = await addWaterHeaterExtraPhotos(state, itemId, sourceUris);
    onSave(next);
    const current = next.items.find((entry) => entry.id === itemId);
    return current ? current.photoIds.slice(-sourceUris.length) : [];
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

  function updateDetails(next: WaterHeaterDetails) {
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
        showReorderArrows={showReorderArrows}
        onToggleReorderArrows={onToggleReorderArrows}
        hasHiddenSlots={hasHiddenSlots}
        onRestoreHiddenSlots={() => onSave(restoreItemHiddenPhotoSlots(state, itemId))}
      >
        {photoHeader}
      </PhotoSection>

      <EditableDetailSection
        title="Water heater"
        isEditing={editingSection === 'heater'}
        onPress={() => setEditingSection('heater')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'heater' ? (
          <WaterHeaterForm details={details} onChange={updateDetails} />
        ) : waterHeaterHasInfo(details) ? (
          <>
            <DetailDisplayRow
              label="Fuel type"
              value={fuelTypeLabel(details.fuelType, details.fuelTypeOther)}
            />
            <DetailDisplayRow label="Make" value={details.make} />
            <DetailDisplayRow label="Model" value={details.modelNumber} />
            <DetailDisplayRow label="Serial number" value={details.serialNumber} />
            <DetailDisplayRow label="Notes" value={details.notes} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
