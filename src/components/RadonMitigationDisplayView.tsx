import React, { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../textScale';
import type { AppState, RadonMitigationDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import { withReorderedItemPhotoIds } from '../photoReorder';
import {
  RADON_MITIGATION_PHOTO_SLOTS,
  radonMitigationHasEquipmentInfo,
  radonMitigationHasInstallInfo,
  radonMitigationHasServiceInfo,
  radonMitigationHasSystemInfo,
  radonMitigationHasTestInfo,
  radonMitigationSystemTypeLabel,
  type RadonMitigationPhotoSlotKey,
} from '../radonMitigationSlots';
import {
  addRadonMitigationExtraPhotos,
  clearRadonMitigationSlotDocument,
  clearRadonMitigationSlotPhoto,
  removeRadonMitigationExtraPhoto,
  radonMitigationExtraPhotos,
  radonMitigationSlotDocumentInfo,
  radonMitigationSlotPhotoUri,
  setRadonMitigationSlotDocument,
  setRadonMitigationSlotPhoto,
} from '../radonMitigationPhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import {
  RadonMitigationEquipmentFields,
  RadonMitigationInstallFields,
  RadonMitigationNotesFields,
  RadonMitigationServiceFields,
  RadonMitigationSystemFields,
  RadonMitigationTestFields,
} from '../screens/itemDetails/RadonMitigationForm';

export function RadonMitigationDisplayView(props: {
  state: AppState;
  details: RadonMitigationDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: RadonMitigationDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
  showReorderArrows?: boolean;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange, showReorderArrows } =
    props;
  const [editingSection, setEditingSection] = useState<
    'system' | 'equipment' | 'test' | 'install' | 'service' | 'notes' | null
  >(null);

  const extraPhotos = radonMitigationExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: RADON_MITIGATION_PHOTO_SLOTS,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) =>
          radonMitigationSlotPhotoUri(state, details, key as RadonMitigationPhotoSlotKey),
        getSlotDocument: (key) =>
          radonMitigationSlotDocumentInfo(state, details, key as RadonMitigationPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as RadonMitigationPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as RadonMitigationPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as RadonMitigationPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setRadonMitigationSlotPhoto(
            state,
            itemId,
            key as RadonMitigationPhotoSlotKey,
            uri
          ).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setRadonMitigationSlotDocument(
            state,
            itemId,
            key as RadonMitigationPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearRadonMitigationSlotPhoto(
            state,
            itemId,
            key as RadonMitigationPhotoSlotKey
          ).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearRadonMitigationSlotDocument(
            state,
            itemId,
            key as RadonMitigationPhotoSlotKey
          ).then(onSave);
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearRadonMitigationSlotPhoto(
              state,
              itemId,
              key as RadonMitigationPhotoSlotKey
            );
            next = await clearRadonMitigationSlotDocument(
              next,
              itemId,
              key as RadonMitigationPhotoSlotKey
            );
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as RadonMitigationPhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeRadonMitigationExtraPhoto(state, itemId, photoId).then(onSave);
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
    const next = await addRadonMitigationExtraPhotos(state, itemId, sourceUris);
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

  function updateDetails(next: RadonMitigationDetails) {
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
          <RadonMitigationSystemFields details={details} onChange={updateDetails} />
        ) : radonMitigationHasSystemInfo(details) ? (
          <>
            <DetailDisplayRow
              label="System type"
              value={radonMitigationSystemTypeLabel(details.systemType, details.systemTypeOther)}
            />
            <DetailDisplayRow label="Fan location" value={details.fanLocation} />
            <DetailDisplayRow label="Suction point location" value={details.suctionPointLocation} />
            <DetailDisplayRow label="Discharge location" value={details.dischargeLocation} />
            <DetailDisplayRow label="Manometer reading" value={details.manometerReading} />
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
          <RadonMitigationEquipmentFields details={details} onChange={updateDetails} />
        ) : radonMitigationHasEquipmentInfo(details) ? (
          <>
            <DetailDisplayRow label="Fan make" value={details.fanMake} />
            <DetailDisplayRow label="Fan model" value={details.fanModel} />
            <DetailDisplayRow label="Fan serial number" value={details.fanSerialNumber} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Radon test"
        isEditing={editingSection === 'test'}
        onPress={() => setEditingSection('test')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'test' ? (
          <RadonMitigationTestFields details={details} onChange={updateDetails} />
        ) : radonMitigationHasTestInfo(details) ? (
          <>
            <DetailDisplayRow
              label="Last test date"
              value={formatStoredDate(details.lastTestDateAtISO)}
            />
            <DetailDisplayRow label="Last test result" value={details.lastTestResult} />
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
          <RadonMitigationInstallFields details={details} onChange={updateDetails} />
        ) : radonMitigationHasInstallInfo(details) ? (
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
          <RadonMitigationServiceFields details={details} onChange={updateDetails} />
        ) : radonMitigationHasServiceInfo(details) ? (
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
          <RadonMitigationNotesFields details={details} onChange={updateDetails} />
        ) : details.notes?.trim() ? (
          <DetailDisplayRow label="Notes" value={details.notes} />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
