import React, { useMemo, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { AppState, ElectricPanelDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import {
  ELECTRIC_PANEL_PHOTO_SLOTS,
  electricPanelHasInfo,
  type ElectricPanelPhotoSlotKey,
} from '../electricPanelSlots';
import {
  addElectricPanelExtraPhotos,
  clearElectricPanelSlotDocument,
  clearElectricPanelSlotPhoto,
  electricPanelExtraPhotos,
  electricPanelSlotDocumentInfo,
  electricPanelSlotPhotoUri,
  removeElectricPanelExtraPhoto,
  setElectricPanelSlotDocument,
  setElectricPanelSlotPhoto,
} from '../electricPanelPhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import { ElectricPanelForm } from '../screens/itemDetails/ElectricPanelForm';

export function ElectricPanelDisplayView(props: {
  state: AppState;
  details: ElectricPanelDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: ElectricPanelDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange } = props;
  const [editingSection, setEditingSection] = useState<'panel' | null>(null);

  const extraPhotos = electricPanelExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: ELECTRIC_PANEL_PHOTO_SLOTS,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) => electricPanelSlotPhotoUri(state, details, key as ElectricPanelPhotoSlotKey),
        getSlotDocument: (key) =>
          electricPanelSlotDocumentInfo(state, details, key as ElectricPanelPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as ElectricPanelPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as ElectricPanelPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as ElectricPanelPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setElectricPanelSlotPhoto(state, itemId, key as ElectricPanelPhotoSlotKey, uri).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setElectricPanelSlotDocument(
            state,
            itemId,
            key as ElectricPanelPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearElectricPanelSlotPhoto(state, itemId, key as ElectricPanelPhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearElectricPanelSlotDocument(state, itemId, key as ElectricPanelPhotoSlotKey).then(
            onSave
          );
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearElectricPanelSlotPhoto(
              state,
              itemId,
              key as ElectricPanelPhotoSlotKey
            );
            next = await clearElectricPanelSlotDocument(
              next,
              itemId,
              key as ElectricPanelPhotoSlotKey
            );
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as ElectricPanelPhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeElectricPanelExtraPhoto(state, itemId, photoId).then(onSave);
        },
        onLabelExtra: (photoId, label, notes) => {
          onSave(setItemPhotoCaptionAndNotes(state, photoId, label, notes));
        },
      }),
    [details, extraPhotos, item?.hiddenPhotoSlotKeys, itemId, onSave, state]
  );

  async function handleAddPhotos(sourceUris: string[]) {
    const next = await addElectricPanelExtraPhotos(state, itemId, sourceUris);
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

  return (
    <View>
      <PhotoSection
        tiles={photoTiles}
        slotLabelWidth={88}
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
        title="Panel"
        isEditing={editingSection === 'panel'}
        onPress={() => setEditingSection('panel')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'panel' ? (
          <ElectricPanelForm details={details} onChange={onDetailsChange} />
        ) : electricPanelHasInfo(details) ? (
          <>
            {details.name?.trim() ? <DetailDisplayRow label="Name" value={details.name} /> : null}
            <DetailDisplayRow label="Amperage" value={details.amperage} />
            <DetailDisplayRow label="Brand" value={details.brand} />
            <DetailDisplayRow label="Location notes" value={details.locationNotes} />
            <DetailDisplayRow
              label="Last inspected"
              value={formatStoredDate(details.lastInspectedAtISO)}
            />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
