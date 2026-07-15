import React, { useMemo, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { AirConditionerDetails, AppState } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import {
  AIR_CONDITIONER_PHOTO_SLOTS,
  acTypeLabel,
  airConditionerHasEquipmentInfo,
  airConditionerHasInstallInfo,
  airConditionerHasServiceInfo,
  type AirConditionerPhotoSlotKey,
} from '../airConditionerSlots';
import {
  addAirConditionerExtraPhotos,
  airConditionerExtraPhotos,
  airConditionerSlotDocumentInfo,
  airConditionerSlotPhotoUri,
  clearAirConditionerSlotDocument,
  clearAirConditionerSlotPhoto,
  removeAirConditionerExtraPhoto,
  setAirConditionerExtraPhotoCaption,
  setAirConditionerSlotDocument,
  setAirConditionerSlotPhoto,
} from '../airConditionerPhotos';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import {
  AirConditionerEquipmentFields,
  AirConditionerInstallFields,
  AirConditionerNotesFields,
  AirConditionerServiceFields,
} from '../screens/itemDetails/AirConditionerForm';

export function AirConditionerDisplayView(props: {
  state: AppState;
  details: AirConditionerDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: AirConditionerDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange } = props;
  const [editingSection, setEditingSection] = useState<
    'equipment' | 'install' | 'service' | 'notes' | null
  >(null);

  const extraPhotos = airConditionerExtraPhotos(state, itemId, details);

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: AIR_CONDITIONER_PHOTO_SLOTS,
        getSlotUri: (key) =>
          airConditionerSlotPhotoUri(state, details, key as AirConditionerPhotoSlotKey),
        getSlotDocument: (key) =>
          airConditionerSlotDocumentInfo(state, details, key as AirConditionerPhotoSlotKey),
        onAddSlot: (key, uri) => {
          void setAirConditionerSlotPhoto(
            state,
            itemId,
            key as AirConditionerPhotoSlotKey,
            uri
          ).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setAirConditionerSlotDocument(
            state,
            itemId,
            key as AirConditionerPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearAirConditionerSlotPhoto(state, itemId, key as AirConditionerPhotoSlotKey).then(
            onSave
          );
        },
        onDeleteSlotDocument: (key) => {
          void clearAirConditionerSlotDocument(
            state,
            itemId,
            key as AirConditionerPhotoSlotKey
          ).then(onSave);
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeAirConditionerExtraPhoto(state, itemId, photoId).then(onSave);
        },
        onLabelExtra: (photoId, label) => {
          onSave(setAirConditionerExtraPhotoCaption(state, photoId, label));
        },
      }),
    [details, extraPhotos, itemId, onSave, state]
  );

  async function handleAddPhotos(sourceUris: string[]) {
    const next = await addAirConditionerExtraPhotos(state, itemId, sourceUris);
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

  function updateDetails(next: AirConditionerDetails) {
    onDetailsChange(next);
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
          <AirConditionerEquipmentFields details={details} onChange={updateDetails} />
        ) : airConditionerHasEquipmentInfo(details) ? (
          <>
            {details.acType ? (
              <DetailDisplayRow label="AC type" value={acTypeLabel(details.acType)} />
            ) : null}
            <DetailDisplayRow label="Make" value={details.make} />
            <DetailDisplayRow label="Model" value={details.modelNumber} />
            <DetailDisplayRow label="Serial number" value={details.serialNumber} />
            <DetailDisplayRow label="Cooling capacity (tons)" value={details.tonnage} />
            <DetailDisplayRow label="Refrigerant type" value={details.refrigerantType} />
            <DetailDisplayRow label="Filter size" value={details.filterSize} />
            <DetailDisplayRow label="Location notes" value={details.locationNotes} />
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
          <AirConditionerInstallFields details={details} onChange={updateDetails} />
        ) : airConditionerHasInstallInfo(details) ? (
          <>
            <DetailDisplayRow
              label="Install date"
              value={formatStoredDate(details.installDateAtISO)}
            />
            <DetailDisplayRow label="Install cost" value={details.installCost} />
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
          <AirConditionerServiceFields details={details} onChange={updateDetails} />
        ) : airConditionerHasServiceInfo(details) ? (
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
          <AirConditionerNotesFields details={details} onChange={updateDetails} />
        ) : details.notes?.trim() ? (
          <DetailDisplayRow label="Notes" value={details.notes} />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
