import React, { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../textScale';
import type { AppState, SumpPumpDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import { withReorderedItemPhotoIds } from '../photoReorder';
import {
  SUMP_PUMP_PHOTO_SLOTS,
  sumpPumpHasEquipmentInfo,
  sumpPumpHasInstallInfo,
  sumpPumpHasServiceInfo,
  sumpPumpHasSystemInfo,
  sumpPumpRoleLabel,
  type SumpPumpPhotoSlotKey,
} from '../sumpPumpSlots';
import {
  addSumpPumpExtraPhotos,
  clearSumpPumpSlotDocument,
  clearSumpPumpSlotPhoto,
  removeSumpPumpExtraPhoto,
  sumpPumpExtraPhotos,
  sumpPumpSlotDocumentInfo,
  sumpPumpSlotPhotoUri,
  setSumpPumpSlotDocument,
  setSumpPumpSlotPhoto,
} from '../sumpPumpPhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import {
  SumpPumpEquipmentFields,
  SumpPumpInstallFields,
  SumpPumpNotesFields,
  SumpPumpServiceFields,
  SumpPumpSystemFields,
} from '../screens/itemDetails/SumpPumpForm';

export function SumpPumpDisplayView(props: {
  state: AppState;
  details: SumpPumpDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: SumpPumpDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
  showReorderArrows?: boolean;
  onToggleReorderArrows?: () => void;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange, showReorderArrows, onToggleReorderArrows } = props;
  const [editingSection, setEditingSection] = useState<
    'system' | 'equipment' | 'install' | 'service' | 'notes' | null
  >(null);

  const extraPhotos = sumpPumpExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: SUMP_PUMP_PHOTO_SLOTS,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) => sumpPumpSlotPhotoUri(state, details, key as SumpPumpPhotoSlotKey),
        getSlotDocument: (key) =>
          sumpPumpSlotDocumentInfo(state, details, key as SumpPumpPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as SumpPumpPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as SumpPumpPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as SumpPumpPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setSumpPumpSlotPhoto(state, itemId, key as SumpPumpPhotoSlotKey, uri).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setSumpPumpSlotDocument(
            state,
            itemId,
            key as SumpPumpPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearSumpPumpSlotPhoto(state, itemId, key as SumpPumpPhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearSumpPumpSlotDocument(state, itemId, key as SumpPumpPhotoSlotKey).then(onSave);
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearSumpPumpSlotPhoto(state, itemId, key as SumpPumpPhotoSlotKey);
            next = await clearSumpPumpSlotDocument(next, itemId, key as SumpPumpPhotoSlotKey);
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as SumpPumpPhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeSumpPumpExtraPhoto(state, itemId, photoId).then(onSave);
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
    const next = await addSumpPumpExtraPhotos(state, itemId, sourceUris);
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

  function updateDetails(next: SumpPumpDetails) {
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
        title="System"
        isEditing={editingSection === 'system'}
        onPress={() => setEditingSection('system')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'system' ? (
          <SumpPumpSystemFields details={details} onChange={updateDetails} />
        ) : sumpPumpHasSystemInfo(details) ? (
          <>
            <DetailDisplayRow label="Pump role" value={sumpPumpRoleLabel(details.pumpRole)} />
            <DetailDisplayRow label="Location notes" value={details.locationNotes} />
            <DetailDisplayRow label="Discharge location" value={details.dischargeLocation} />
            <DetailDisplayRow label="Battery backup notes" value={details.batteryBackupNotes} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Equipment"
        isEditing={editingSection === 'equipment'}
        onPress={() => setEditingSection('equipment')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'equipment' ? (
          <SumpPumpEquipmentFields details={details} onChange={updateDetails} />
        ) : sumpPumpHasEquipmentInfo(details) ? (
          <>
            <DetailDisplayRow label="Make" value={details.make} />
            <DetailDisplayRow label="Model" value={details.modelNumber} />
            <DetailDisplayRow label="Serial number" value={details.serialNumber} />
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
          <SumpPumpInstallFields details={details} onChange={updateDetails} />
        ) : sumpPumpHasInstallInfo(details) ? (
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
          <SumpPumpServiceFields details={details} onChange={updateDetails} />
        ) : sumpPumpHasServiceInfo(details) ? (
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
          <SumpPumpNotesFields details={details} onChange={updateDetails} />
        ) : details.notes?.trim() ? (
          <DetailDisplayRow label="Notes" value={details.notes} />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
