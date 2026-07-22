import React, { useMemo, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { AppState, WaterMainDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import {
  valveTypeLabel,
  waterMainHasInfo,
  waterMainPhotoSlotsForSource,
  waterSourceLabel,
  type WaterMainPhotoSlotKey,
} from '../waterMainSlots';
import {
  addWaterMainExtraPhotos,
  clearWaterMainSlotDocument,
  clearWaterMainSlotPhoto,
  removeWaterMainExtraPhoto,
  setWaterMainSlotDocument,
  setWaterMainSlotPhoto,
  waterMainExtraPhotos,
  waterMainSlotDocumentInfo,
  waterMainSlotPhotoUri,
} from '../waterMainPhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import { WaterMainForm } from '../screens/itemDetails/WaterMainForm';

export function WaterMainDisplayView(props: {
  state: AppState;
  details: WaterMainDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: WaterMainDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange } = props;
  const [editingSection, setEditingSection] = useState<'main' | null>(null);

  const slots = waterMainPhotoSlotsForSource(details);
  const extraPhotos = waterMainExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) => waterMainSlotPhotoUri(state, details, key as WaterMainPhotoSlotKey),
        getSlotDocument: (key) =>
          waterMainSlotDocumentInfo(state, details, key as WaterMainPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as WaterMainPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as WaterMainPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as WaterMainPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setWaterMainSlotPhoto(state, itemId, key as WaterMainPhotoSlotKey, uri).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setWaterMainSlotDocument(
            state,
            itemId,
            key as WaterMainPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearWaterMainSlotPhoto(state, itemId, key as WaterMainPhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearWaterMainSlotDocument(state, itemId, key as WaterMainPhotoSlotKey).then(onSave);
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearWaterMainSlotPhoto(state, itemId, key as WaterMainPhotoSlotKey);
            next = await clearWaterMainSlotDocument(next, itemId, key as WaterMainPhotoSlotKey);
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as WaterMainPhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeWaterMainExtraPhoto(state, itemId, photoId).then(onSave);
        },
        onLabelExtra: (photoId, label, notes) => {
          onSave(setItemPhotoCaptionAndNotes(state, photoId, label, notes));
        },
      }),
    [details, extraPhotos, item?.hiddenPhotoSlotKeys, itemId, onSave, slots, state]
  );

  async function handleAddPhotos(sourceUris: string[]) {
    const next = await addWaterMainExtraPhotos(state, itemId, sourceUris);
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

  function updateDetails(next: WaterMainDetails) {
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
        title="Water main"
        isEditing={editingSection === 'main'}
        onPress={() => setEditingSection('main')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'main' ? (
          <WaterMainForm details={details} onChange={updateDetails} />
        ) : waterMainHasInfo(details) ? (
          <>
            <DetailDisplayRow label="Water source" value={waterSourceLabel(details.waterSource)} />
            <DetailDisplayRow label="Shutoff location" value={details.shutoffLocation} />
            <DetailDisplayRow label="Valve type" value={valveTypeLabel(details.valveType)} />
            {details.waterSource === 'municipal' ? (
              <DetailDisplayRow label="Meter number" value={details.meterNumber} />
            ) : null}
            {details.waterSource === 'well' ? (
              <DetailDisplayRow label="Well head location" value={details.wellHeadLocation} />
            ) : null}
            <DetailDisplayRow label="Notes" value={details.notes} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
