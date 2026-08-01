import React, { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../textScale';
import type { AppState, GarageDoorDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import { withReorderedItemPhotoIds } from '../photoReorder';
import {
  GARAGE_DOOR_PHOTO_SLOTS,
  garageDoorHasEquipmentInfo,
  garageDoorHasInstallInfo,
  garageDoorHasServiceInfo,
  type GarageDoorPhotoSlotKey,
} from '../garageDoorSlots';
import {
  addGarageDoorExtraPhotos,
  clearGarageDoorSlotDocument,
  clearGarageDoorSlotPhoto,
  removeGarageDoorExtraPhoto,
  garageDoorExtraPhotos,
  garageDoorSlotDocumentInfo,
  garageDoorSlotPhotoUri,
  setGarageDoorSlotDocument,
  setGarageDoorSlotPhoto,
} from '../garageDoorPhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import {
  GarageDoorEquipmentFields,
  GarageDoorInstallFields,
  GarageDoorNotesFields,
  GarageDoorServiceFields,
} from '../screens/itemDetails/GarageDoorForm';

export function GarageDoorDisplayView(props: {
  state: AppState;
  details: GarageDoorDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: GarageDoorDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
  showReorderArrows?: boolean;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange, showReorderArrows } =
    props;
  const [editingSection, setEditingSection] = useState<
    'equipment' | 'install' | 'service' | 'notes' | null
  >(null);

  const extraPhotos = garageDoorExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: GARAGE_DOOR_PHOTO_SLOTS,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) => garageDoorSlotPhotoUri(state, details, key as GarageDoorPhotoSlotKey),
        getSlotDocument: (key) =>
          garageDoorSlotDocumentInfo(state, details, key as GarageDoorPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as GarageDoorPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as GarageDoorPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as GarageDoorPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setGarageDoorSlotPhoto(state, itemId, key as GarageDoorPhotoSlotKey, uri).then(
            onSave
          );
        },
        onAddSlotDocument: (key, picked) => {
          void setGarageDoorSlotDocument(
            state,
            itemId,
            key as GarageDoorPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearGarageDoorSlotPhoto(state, itemId, key as GarageDoorPhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearGarageDoorSlotDocument(state, itemId, key as GarageDoorPhotoSlotKey).then(
            onSave
          );
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearGarageDoorSlotPhoto(
              state,
              itemId,
              key as GarageDoorPhotoSlotKey
            );
            next = await clearGarageDoorSlotDocument(next, itemId, key as GarageDoorPhotoSlotKey);
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as GarageDoorPhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeGarageDoorExtraPhoto(state, itemId, photoId).then(onSave);
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
    const next = await addGarageDoorExtraPhotos(state, itemId, sourceUris);
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

  function updateDetails(next: GarageDoorDetails) {
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
          <GarageDoorEquipmentFields details={details} onChange={updateDetails} />
        ) : garageDoorHasEquipmentInfo(details) ? (
          <>
            <DetailDisplayRow label="Opener make" value={details.openerMake} />
            <DetailDisplayRow label="Opener model" value={details.openerModel} />
            <DetailDisplayRow label="Opener serial number" value={details.openerSerialNumber} />
            <DetailDisplayRow label="Spring type" value={details.springType} />
            <DetailDisplayRow label="Programming notes" value={details.programmingNotes} />
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
          <GarageDoorInstallFields details={details} onChange={updateDetails} />
        ) : garageDoorHasInstallInfo(details) ? (
          <>
            <DetailDisplayRow
              label="Install date"
              value={formatStoredDate(details.installDateAtISO)}
            />
            <DetailDisplayRow label="Installer name" value={details.installerName} />
            <DetailDisplayRow label="Installer phone" value={details.installerPhone} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Service contact"
        isEditing={editingSection === 'service'}
        onPress={() => setEditingSection('service')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'service' ? (
          <GarageDoorServiceFields details={details} onChange={updateDetails} />
        ) : garageDoorHasServiceInfo(details) ? (
          <>
            <DetailDisplayRow label="Service company" value={details.serviceCompany} />
            <DetailDisplayRow label="Service phone" value={details.servicePhone} />
          </>
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
          <GarageDoorNotesFields details={details} onChange={updateDetails} />
        ) : details.notes?.trim() ? (
          <DetailDisplayRow label="Notes" value={details.notes} />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
