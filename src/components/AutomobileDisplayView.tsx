import React, { useMemo, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { AppState, AutomobileDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import {
  AUTOMOBILE_PHOTO_SLOTS,
  automobileHasMaintenanceInfo,
  automobileHasPurchaseInfo,
  automobileHasServiceInfo,
  automobileHasVehicleInfo,
  type AutomobilePhotoSlotKey,
} from '../automobileSlots';
import {
  addAutomobileExtraPhotos,
  automobileExtraPhotos,
  automobileSlotDocumentInfo,
  automobileSlotPhotoUri,
  clearAutomobileSlotDocument,
  clearAutomobileSlotPhoto,
  removeAutomobileExtraPhoto,
  setAutomobileSlotDocument,
  setAutomobileSlotPhoto,
} from '../automobilePhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import {
  AutomobileMaintenanceFields,
  AutomobileNotesFields,
  AutomobilePurchaseFields,
  AutomobileServiceFields,
  AutomobileVehicleFields,
} from '../screens/itemDetails/AutomobileForm';

export function AutomobileDisplayView(props: {
  state: AppState;
  details: AutomobileDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: AutomobileDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange } = props;
  const [editingSection, setEditingSection] = useState<
    'vehicle' | 'purchase' | 'maintenance' | 'service' | 'notes' | null
  >(null);

  const extraPhotos = automobileExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: AUTOMOBILE_PHOTO_SLOTS,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) =>
          automobileSlotPhotoUri(state, details, key as AutomobilePhotoSlotKey),
        getSlotDocument: (key) =>
          automobileSlotDocumentInfo(state, details, key as AutomobilePhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as AutomobilePhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as AutomobilePhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as AutomobilePhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setAutomobileSlotPhoto(state, itemId, key as AutomobilePhotoSlotKey, uri).then(
            onSave
          );
        },
        onAddSlotDocument: (key, picked) => {
          void setAutomobileSlotDocument(
            state,
            itemId,
            key as AutomobilePhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearAutomobileSlotPhoto(state, itemId, key as AutomobilePhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearAutomobileSlotDocument(state, itemId, key as AutomobilePhotoSlotKey).then(
            onSave
          );
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearAutomobileSlotPhoto(state, itemId, key as AutomobilePhotoSlotKey);
            next = await clearAutomobileSlotDocument(next, itemId, key as AutomobilePhotoSlotKey);
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as AutomobilePhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeAutomobileExtraPhoto(state, itemId, photoId).then(onSave);
        },
        onLabelExtra: (photoId, label, notes) => {
          onSave(setItemPhotoCaptionAndNotes(state, photoId, label, notes));
        },
      }),
    [details, extraPhotos, item?.hiddenPhotoSlotKeys, itemId, onSave, state]
  );

  async function handleAddPhotos(sourceUris: string[]) {
    const next = await addAutomobileExtraPhotos(state, itemId, sourceUris);
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

  function updateDetails(next: AutomobileDetails) {
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
        hasHiddenSlots={hasHiddenSlots}
        onRestoreHiddenSlots={() => onSave(restoreItemHiddenPhotoSlots(state, itemId))}
      >
        {photoHeader}
      </PhotoSection>

      <EditableDetailSection
        title="Vehicle"
        isEditing={editingSection === 'vehicle'}
        onPress={() => setEditingSection('vehicle')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'vehicle' ? (
          <AutomobileVehicleFields details={details} onChange={updateDetails} />
        ) : automobileHasVehicleInfo(details) ? (
          <>
            <DetailDisplayRow label="Nickname" value={details.nickname} />
            <DetailDisplayRow label="Year" value={details.year} />
            <DetailDisplayRow label="Make" value={details.make} />
            <DetailDisplayRow label="Model" value={details.model} />
            <DetailDisplayRow label="Trim" value={details.trim} />
            <DetailDisplayRow label="VIN" value={details.vin} />
            <DetailDisplayRow label="License plate" value={details.licensePlate} />
            <DetailDisplayRow label="Color" value={details.color} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Purchase"
        isEditing={editingSection === 'purchase'}
        onPress={() => setEditingSection('purchase')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'purchase' ? (
          <AutomobilePurchaseFields details={details} onChange={updateDetails} />
        ) : automobileHasPurchaseInfo(details) ? (
          <>
            <DetailDisplayRow
              label="Purchase date"
              value={formatStoredDate(details.purchaseDateAtISO)}
            />
            <DetailDisplayRow label="Purchase price" value={details.purchasePrice} />
            <DetailDisplayRow label="Where purchased" value={details.purchaseLocation} />
            <DetailDisplayRow label="Mileage at purchase" value={details.purchaseMileage} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Maintenance"
        isEditing={editingSection === 'maintenance'}
        onPress={() => setEditingSection('maintenance')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'maintenance' ? (
          <AutomobileMaintenanceFields details={details} onChange={updateDetails} />
        ) : automobileHasMaintenanceInfo(details) ? (
          <>
            <DetailDisplayRow label="Current mileage" value={details.currentMileage} />
            <DetailDisplayRow label="Oil type" value={details.oilType} />
            <DetailDisplayRow label="Oil filter" value={details.oilFilter} />
            <DetailDisplayRow label="Tire size" value={details.tireSize} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Service & insurance"
        isEditing={editingSection === 'service'}
        onPress={() => setEditingSection('service')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'service' ? (
          <AutomobileServiceFields details={details} onChange={updateDetails} />
        ) : automobileHasServiceInfo(details) ? (
          <>
            <DetailDisplayRow label="Service shop" value={details.serviceCompany} />
            <DetailDisplayRow label="Service phone" value={details.servicePhone} />
            <DetailDisplayRow label="Insurance company" value={details.insuranceCompany} />
            <DetailDisplayRow label="Insurance phone" value={details.insurancePhone} />
            <DetailDisplayRow label="Policy number" value={details.insurancePolicyNumber} />
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
          <AutomobileNotesFields details={details} onChange={updateDetails} />
        ) : details.notes?.trim() ? (
          <DetailDisplayRow label="Notes" value={details.notes} />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
