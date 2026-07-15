import React, { useMemo, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { AppState, ApplianceDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import {
  APPLIANCE_PHOTO_SLOTS,
  applianceHasIdentityInfo,
  applianceHasPurchaseInfo,
  applianceHasRepairInfo,
  type AppliancePhotoSlotKey,
} from '../applianceSlots';
import {
  addApplianceExtraPhotos,
  applianceExtraPhotos,
  applianceSlotDocumentInfo,
  applianceSlotPhotoUri,
  clearApplianceSlotDocument,
  clearApplianceSlotPhoto,
  removeApplianceExtraPhoto,
  setApplianceExtraPhotoCaption,
  setApplianceSlotDocument,
  setApplianceSlotPhoto,
} from '../appliancePhotos';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import {
  ApplianceIdentityFields,
  AppliancePurchaseFields,
  ApplianceRepairFields,
} from '../screens/itemDetails/ApplianceForm';

export type ApplianceEditingSection = 'appliance' | 'purchase' | 'repair';

export function ApplianceDisplayView(props: {
  state: AppState;
  details: ApplianceDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: ApplianceDetails) => void;
  initialEditingSection?: ApplianceEditingSection;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
}) {
  const { state, details, itemId, onSave, onDetailsChange, initialEditingSection, photoHeader, onActiveHeroLabelChange } = props;
  const [editingSection, setEditingSection] = useState<ApplianceEditingSection | null>(
    initialEditingSection ?? null
  );

  const extraPhotos = applianceExtraPhotos(state, itemId, details);

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: APPLIANCE_PHOTO_SLOTS,
        getSlotUri: (key) => applianceSlotPhotoUri(state, details, key as AppliancePhotoSlotKey),
        getSlotDocument: (key) =>
          applianceSlotDocumentInfo(state, details, key as AppliancePhotoSlotKey),
        onAddSlot: (key, uri) => {
          void setApplianceSlotPhoto(state, itemId, key as AppliancePhotoSlotKey, uri).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setApplianceSlotDocument(
            state,
            itemId,
            key as AppliancePhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearApplianceSlotPhoto(state, itemId, key as AppliancePhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearApplianceSlotDocument(state, itemId, key as AppliancePhotoSlotKey).then(onSave);
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeApplianceExtraPhoto(state, itemId, photoId).then(onSave);
        },
        onLabelExtra: (photoId, label) => {
          onSave(setApplianceExtraPhotoCaption(state, photoId, label));
        },
      }),
    [details, extraPhotos, itemId, onSave, state]
  );

  async function handleAddPhotos(sourceUris: string[]) {
    const next = await addApplianceExtraPhotos(state, itemId, sourceUris);
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

  function openSection(section: ApplianceEditingSection) {
    setEditingSection(section);
  }

  function closeSection() {
    setEditingSection(null);
  }

  function updateDetails(next: ApplianceDetails) {
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
      >
        {photoHeader}
      </PhotoSection>

      <EditableDetailSection
        title="Appliance"
        isEditing={editingSection === 'appliance'}
        onPress={() => openSection('appliance')}
        onDone={closeSection}
      >
        {editingSection === 'appliance' ? (
          <ApplianceIdentityFields details={details} onChange={updateDetails} />
        ) : applianceHasIdentityInfo(details) ? (
          <>
            {details.nickname?.trim() ? (
              <DetailDisplayRow label="Name" value={details.nickname} />
            ) : null}
            <DetailDisplayRow label="Manufacturer" value={details.manufacturer} />
            <DetailDisplayRow label="Model #" value={details.modelNumber} />
            <DetailDisplayRow label="Serial #" value={details.serialNumber} />
            <DetailDisplayRow label="Notes" value={details.notes} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Purchase"
        isEditing={editingSection === 'purchase'}
        onPress={() => openSection('purchase')}
        onDone={closeSection}
      >
        {editingSection === 'purchase' ? (
          <AppliancePurchaseFields details={details} onChange={updateDetails} />
        ) : applianceHasPurchaseInfo(details) ? (
          <>
            <DetailDisplayRow label="Where purchased" value={details.purchaseLocation} />
            <DetailDisplayRow
              label="Date purchased"
              value={formatStoredDate(details.purchaseDateAtISO)}
            />
            <DetailDisplayRow label="Total paid" value={details.purchasePrice} />
            <DetailDisplayRow label="Purchase notes" value={details.purchaseNotes} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Repair contact"
        isEditing={editingSection === 'repair'}
        onPress={() => openSection('repair')}
        onDone={closeSection}
      >
        {editingSection === 'repair' ? (
          <ApplianceRepairFields details={details} onChange={updateDetails} />
        ) : applianceHasRepairInfo(details) ? (
          <>
            <DetailDisplayRow label="Company" value={details.repairCompany} />
            <DetailDisplayRow label="Phone" value={details.repairPhone} />
            <DetailDisplayRow label="Website" value={details.repairWebsite} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
