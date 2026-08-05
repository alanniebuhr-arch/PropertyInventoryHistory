import React, { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../textScale';
import type { AppState, ToiletDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import { withReorderedItemPhotoIds } from '../photoReorder';
import {
  TOILET_PHOTO_SLOTS,
  toiletFlushTypeLabel,
  toiletHasEquipmentInfo,
  toiletHasInstallInfo,
  toiletHasValvesInfo,
  type ToiletPhotoSlotKey,
} from '../toiletSlots';
import {
  addToiletExtraPhotos,
  clearToiletSlotDocument,
  clearToiletSlotPhoto,
  removeToiletExtraPhoto,
  setToiletSlotDocument,
  setToiletSlotPhoto,
  toiletExtraPhotos,
  toiletSlotDocumentInfo,
  toiletSlotPhotoUri,
} from '../toiletPhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import {
  ToiletEquipmentFields,
  ToiletInstallFields,
  ToiletNotesFields,
  ToiletValvesFields,
} from '../screens/itemDetails/ToiletForm';

export function ToiletDisplayView(props: {
  state: AppState;
  details: ToiletDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: ToiletDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
  showReorderArrows?: boolean;
  onToggleReorderArrows?: () => void;
}) {
  const {
    state,
    details,
    itemId,
    onSave,
    onDetailsChange,
    photoHeader,
    onActiveHeroLabelChange,
    showReorderArrows,
    onToggleReorderArrows,
  } = props;
  const [editingSection, setEditingSection] = useState<
    'equipment' | 'valves' | 'install' | 'notes' | null
  >(null);

  const extraPhotos = toiletExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: TOILET_PHOTO_SLOTS,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) => toiletSlotPhotoUri(state, details, key as ToiletPhotoSlotKey),
        getSlotDocument: (key) =>
          toiletSlotDocumentInfo(state, details, key as ToiletPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as ToiletPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as ToiletPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as ToiletPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setToiletSlotPhoto(state, itemId, key as ToiletPhotoSlotKey, uri).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setToiletSlotDocument(
            state,
            itemId,
            key as ToiletPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearToiletSlotPhoto(state, itemId, key as ToiletPhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearToiletSlotDocument(state, itemId, key as ToiletPhotoSlotKey).then(onSave);
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearToiletSlotPhoto(state, itemId, key as ToiletPhotoSlotKey);
            next = await clearToiletSlotDocument(next, itemId, key as ToiletPhotoSlotKey);
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as ToiletPhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeToiletExtraPhoto(state, itemId, photoId).then(onSave);
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
    const next = await addToiletExtraPhotos(state, itemId, sourceUris);
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

  function updateDetails(next: ToiletDetails) {
    onDetailsChange(next);
  }

  return (
    <View>
      <PhotoSection
        tiles={photoTiles}
        slotLabelWidth={100}
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
        title="Equipment"
        isEditing={editingSection === 'equipment'}
        onPress={() => setEditingSection('equipment')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'equipment' ? (
          <ToiletEquipmentFields details={details} onChange={updateDetails} />
        ) : toiletHasEquipmentInfo(details) ? (
          <>
            <DetailDisplayRow label="Make" value={details.make} />
            <DetailDisplayRow label="Model" value={details.modelNumber} />
            <DetailDisplayRow label="Serial number" value={details.serialNumber} />
            <DetailDisplayRow
              label="Flush type"
              value={toiletFlushTypeLabel(details.flushType, details.flushTypeOther)}
            />
            <DetailDisplayRow label="Gallons per flush" value={details.gallonsPerFlush} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Valves"
        isEditing={editingSection === 'valves'}
        onPress={() => setEditingSection('valves')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'valves' ? (
          <ToiletValvesFields details={details} onChange={updateDetails} />
        ) : toiletHasValvesInfo(details) ? (
          <>
            <DetailDisplayRow label="Flush valve kit" value={details.flushValveKit} />
            <DetailDisplayRow label="Fill valve kit" value={details.fillValveKit} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Install"
        isEditing={editingSection === 'install'}
        onPress={() => setEditingSection('install')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'install' ? (
          <ToiletInstallFields details={details} onChange={updateDetails} />
        ) : toiletHasInstallInfo(details) ? (
          <DetailDisplayRow
            label="Install date"
            value={formatStoredDate(details.installDateAtISO)}
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
          <ToiletNotesFields details={details} onChange={updateDetails} />
        ) : details.notes?.trim() ? (
          <DetailDisplayRow label="Notes" value={details.notes} />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
