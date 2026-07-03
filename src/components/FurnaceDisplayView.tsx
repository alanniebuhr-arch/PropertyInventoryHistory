import React, { useMemo, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { AppState, FurnaceDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import {
  furnaceHasEquipmentInfo,
  furnaceHasInstallInfo,
  furnacePhotoSlotsForDetails,
  furnaceUsesFuelTank,
  fuelTankLocationLabel,
  fuelTankSizeLabel,
  fuelTypeLabel,
  heatDistributionLabel,
  heatSourceLabel,
  type FurnacePhotoSlotKey,
} from '../furnaceSlots';
import {
  addFurnaceExtraPhotos,
  clearFurnaceSlotPhoto,
  furnaceExtraPhotos,
  furnaceSlotPhotoUri,
  removeFurnaceExtraPhoto,
  setFurnaceExtraPhotoCaption,
  setFurnaceSlotPhoto,
} from '../furnacePhotos';
import {
  FurnaceEquipmentFields,
  FurnaceInstallFields,
  FurnaceNotesFields,
} from '../screens/itemDetails/FurnaceForm';

export function FurnaceDisplayView(props: {
  state: AppState;
  details: FurnaceDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: FurnaceDetails) => void;
  photoHeader?: ReactNode;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader } = props;
  const [editingSection, setEditingSection] = useState<'equipment' | 'install' | 'notes' | null>(
    null
  );

  const slots = furnacePhotoSlotsForDetails(details);
  const extraPhotos = furnaceExtraPhotos(state, itemId, details);

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots,
        getSlotUri: (key) => furnaceSlotPhotoUri(state, details, key as FurnacePhotoSlotKey),
        onAddSlot: (key, uri) => {
          void setFurnaceSlotPhoto(state, itemId, key as FurnacePhotoSlotKey, uri).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearFurnaceSlotPhoto(state, itemId, key as FurnacePhotoSlotKey).then(onSave);
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeFurnaceExtraPhoto(state, itemId, photoId).then(onSave);
        },
        onLabelExtra: (photoId, label) => {
          onSave(setFurnaceExtraPhotoCaption(state, photoId, label));
        },
      }),
    [details, extraPhotos, itemId, onSave, slots, state]
  );

  async function handleAddPhotos(sourceUris: string[]) {
    const next = await addFurnaceExtraPhotos(state, itemId, sourceUris);
    onSave(next);
    const item = next.items.find((entry) => entry.id === itemId);
    return item ? item.photoIds.slice(-sourceUris.length) : [];
  }

  function updateDetails(next: FurnaceDetails) {
    onDetailsChange(next);
  }

  return (
    <View>
      <PhotoSection tiles={photoTiles} slotLabelWidth={88} onAddPhotos={handleAddPhotos}>
        {photoHeader}
      </PhotoSection>

      <EditableDetailSection
        title="Equipment"
        isEditing={editingSection === 'equipment'}
        onPress={() => setEditingSection('equipment')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'equipment' ? (
          <FurnaceEquipmentFields details={details} onChange={updateDetails} />
        ) : furnaceHasEquipmentInfo(details) ? (
          <>
            {details.systemType ? (
              <DetailDisplayRow label="Heat source" value={heatSourceLabel(details.systemType)} />
            ) : null}
            {details.heatDistribution ? (
              <DetailDisplayRow
                label="Heat distribution"
                value={heatDistributionLabel(details.heatDistribution, details.heatDistributionOther)}
              />
            ) : null}
            {details.fuelType ? (
              <DetailDisplayRow
                label="Fuel type"
                value={fuelTypeLabel(details.fuelType, details.fuelTypeOther)}
              />
            ) : null}
            {furnaceUsesFuelTank(details.fuelType) ? (
              <>
                <DetailDisplayRow
                  label={fuelTankLocationLabel(details.fuelType)}
                  value={details.fuelTankLocation}
                />
                <DetailDisplayRow
                  label={fuelTankSizeLabel(details.fuelType)}
                  value={details.fuelTankSize}
                />
              </>
            ) : null}
            <DetailDisplayRow label="Make" value={details.make} />
            <DetailDisplayRow label="Model" value={details.modelNumber} />
            <DetailDisplayRow label="Serial number" value={details.serialNumber} />
            <DetailDisplayRow label="Filter size" value={details.filterSize} />
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
          <FurnaceInstallFields details={details} onChange={updateDetails} />
        ) : furnaceHasInstallInfo(details) ? (
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
        title="Notes"
        isEditing={editingSection === 'notes'}
        onPress={() => setEditingSection('notes')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'notes' ? (
          <FurnaceNotesFields details={details} onChange={updateDetails} />
        ) : details.notes?.trim() ? (
          <DetailDisplayRow label="Notes" value={details.notes} />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
