import React, { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../textScale';
import type { AppState, SecuritySystemDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import { withReorderedItemPhotoIds } from '../photoReorder';
import {
  SECURITY_SYSTEM_PHOTO_SLOTS,
  securitySystemHasEquipmentInfo,
  securitySystemHasInstallInfo,
  securitySystemHasMonitoringInfo,
  securitySystemHasServiceInfo,
  securitySystemHasSystemInfo,
  securitySystemTypeLabel,
  type SecuritySystemPhotoSlotKey,
} from '../securitySystemSlots';
import {
  addSecuritySystemExtraPhotos,
  clearSecuritySystemSlotDocument,
  clearSecuritySystemSlotPhoto,
  removeSecuritySystemExtraPhoto,
  securitySystemExtraPhotos,
  securitySystemSlotDocumentInfo,
  securitySystemSlotPhotoUri,
  setSecuritySystemSlotDocument,
  setSecuritySystemSlotPhoto,
} from '../securitySystemPhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import {
  SecuritySystemEquipmentFields,
  SecuritySystemInstallFields,
  SecuritySystemMonitoringFields,
  SecuritySystemNotesFields,
  SecuritySystemServiceFields,
  SecuritySystemSystemFields,
} from '../screens/itemDetails/SecuritySystemForm';

export function SecuritySystemDisplayView(props: {
  state: AppState;
  details: SecuritySystemDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: SecuritySystemDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
  showReorderArrows?: boolean;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange, showReorderArrows } =
    props;
  const [editingSection, setEditingSection] = useState<
    'system' | 'monitoring' | 'equipment' | 'install' | 'service' | 'notes' | null
  >(null);

  const extraPhotos = securitySystemExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: SECURITY_SYSTEM_PHOTO_SLOTS,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) =>
          securitySystemSlotPhotoUri(state, details, key as SecuritySystemPhotoSlotKey),
        getSlotDocument: (key) =>
          securitySystemSlotDocumentInfo(state, details, key as SecuritySystemPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as SecuritySystemPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as SecuritySystemPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as SecuritySystemPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setSecuritySystemSlotPhoto(
            state,
            itemId,
            key as SecuritySystemPhotoSlotKey,
            uri
          ).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setSecuritySystemSlotDocument(
            state,
            itemId,
            key as SecuritySystemPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearSecuritySystemSlotPhoto(
            state,
            itemId,
            key as SecuritySystemPhotoSlotKey
          ).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearSecuritySystemSlotDocument(
            state,
            itemId,
            key as SecuritySystemPhotoSlotKey
          ).then(onSave);
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearSecuritySystemSlotPhoto(
              state,
              itemId,
              key as SecuritySystemPhotoSlotKey
            );
            next = await clearSecuritySystemSlotDocument(
              next,
              itemId,
              key as SecuritySystemPhotoSlotKey
            );
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as SecuritySystemPhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeSecuritySystemExtraPhoto(state, itemId, photoId).then(onSave);
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
    const next = await addSecuritySystemExtraPhotos(state, itemId, sourceUris);
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

  function updateDetails(next: SecuritySystemDetails) {
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
        title="System"
        isEditing={editingSection === 'system'}
        onPress={() => setEditingSection('system')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'system' ? (
          <SecuritySystemSystemFields details={details} onChange={updateDetails} />
        ) : securitySystemHasSystemInfo(details) ? (
          <>
            <DetailDisplayRow
              label="System type"
              value={securitySystemTypeLabel(details.systemType, details.systemTypeOther)}
            />
            <DetailDisplayRow label="Control panel location" value={details.panelLocation} />
            <DetailDisplayRow label="Keypad location" value={details.keypadLocation} />
            <DetailDisplayRow label="Access notes" value={details.accessNotes} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Monitoring"
        isEditing={editingSection === 'monitoring'}
        onPress={() => setEditingSection('monitoring')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'monitoring' ? (
          <SecuritySystemMonitoringFields details={details} onChange={updateDetails} />
        ) : securitySystemHasMonitoringInfo(details) ? (
          <>
            <DetailDisplayRow label="Monitoring company" value={details.monitoringCompany} />
            <DetailDisplayRow label="Account number" value={details.accountNumber} />
            <DetailDisplayRow label="Monitoring phone" value={details.monitoringPhone} />
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
          <SecuritySystemEquipmentFields details={details} onChange={updateDetails} />
        ) : securitySystemHasEquipmentInfo(details) ? (
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
          <SecuritySystemInstallFields details={details} onChange={updateDetails} />
        ) : securitySystemHasInstallInfo(details) ? (
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
          <SecuritySystemServiceFields details={details} onChange={updateDetails} />
        ) : securitySystemHasServiceInfo(details) ? (
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
          <SecuritySystemNotesFields details={details} onChange={updateDetails} />
        ) : details.notes?.trim() ? (
          <DetailDisplayRow label="Notes" value={details.notes} />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
