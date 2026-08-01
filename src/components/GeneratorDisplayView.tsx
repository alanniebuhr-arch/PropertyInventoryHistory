import React, { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../textScale';
import type { AppState, GeneratorDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import { withReorderedItemPhotoIds } from '../photoReorder';
import {
  GENERATOR_PHOTO_SLOTS,
  generatorFuelTypeLabel,
  generatorHasEquipmentInfo,
  generatorHasExerciseInfo,
  generatorHasInstallInfo,
  generatorHasServiceInfo,
  type GeneratorPhotoSlotKey,
} from '../generatorSlots';
import {
  addGeneratorExtraPhotos,
  clearGeneratorSlotDocument,
  clearGeneratorSlotPhoto,
  removeGeneratorExtraPhoto,
  generatorExtraPhotos,
  generatorSlotDocumentInfo,
  generatorSlotPhotoUri,
  setGeneratorSlotDocument,
  setGeneratorSlotPhoto,
} from '../generatorPhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import {
  GeneratorEquipmentFields,
  GeneratorExerciseFields,
  GeneratorInstallFields,
  GeneratorNotesFields,
  GeneratorServiceFields,
} from '../screens/itemDetails/GeneratorForm';

export function GeneratorDisplayView(props: {
  state: AppState;
  details: GeneratorDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: GeneratorDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
  showReorderArrows?: boolean;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange, showReorderArrows } =
    props;
  const [editingSection, setEditingSection] = useState<
    'equipment' | 'exercise' | 'install' | 'service' | 'notes' | null
  >(null);

  const extraPhotos = generatorExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: GENERATOR_PHOTO_SLOTS,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) => generatorSlotPhotoUri(state, details, key as GeneratorPhotoSlotKey),
        getSlotDocument: (key) =>
          generatorSlotDocumentInfo(state, details, key as GeneratorPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as GeneratorPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as GeneratorPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as GeneratorPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setGeneratorSlotPhoto(state, itemId, key as GeneratorPhotoSlotKey, uri).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setGeneratorSlotDocument(
            state,
            itemId,
            key as GeneratorPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearGeneratorSlotPhoto(state, itemId, key as GeneratorPhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearGeneratorSlotDocument(state, itemId, key as GeneratorPhotoSlotKey).then(onSave);
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearGeneratorSlotPhoto(state, itemId, key as GeneratorPhotoSlotKey);
            next = await clearGeneratorSlotDocument(next, itemId, key as GeneratorPhotoSlotKey);
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as GeneratorPhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeGeneratorExtraPhoto(state, itemId, photoId).then(onSave);
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
    const next = await addGeneratorExtraPhotos(state, itemId, sourceUris);
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

  function updateDetails(next: GeneratorDetails) {
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
          <GeneratorEquipmentFields details={details} onChange={updateDetails} />
        ) : generatorHasEquipmentInfo(details) ? (
          <>
            <DetailDisplayRow
              label="Fuel type"
              value={generatorFuelTypeLabel(details.fuelType, details.fuelTypeOther)}
            />
            <DetailDisplayRow label="Make" value={details.make} />
            <DetailDisplayRow label="Model" value={details.modelNumber} />
            <DetailDisplayRow label="Serial number" value={details.serialNumber} />
            <DetailDisplayRow label="Wattage" value={details.wattage} />
            <DetailDisplayRow
              label="Transfer switch location"
              value={details.transferSwitchLocation}
            />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Exercise & runtime"
        isEditing={editingSection === 'exercise'}
        onPress={() => setEditingSection('exercise')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'exercise' ? (
          <GeneratorExerciseFields details={details} onChange={updateDetails} />
        ) : generatorHasExerciseInfo(details) ? (
          <>
            <DetailDisplayRow label="Runtime hours" value={details.runtimeHours} />
            <DetailDisplayRow
              label="Last exercise date"
              value={formatStoredDate(details.lastExerciseAtISO)}
            />
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
          <GeneratorInstallFields details={details} onChange={updateDetails} />
        ) : generatorHasInstallInfo(details) ? (
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
          <GeneratorServiceFields details={details} onChange={updateDetails} />
        ) : generatorHasServiceInfo(details) ? (
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
          <GeneratorNotesFields details={details} onChange={updateDetails} />
        ) : details.notes?.trim() ? (
          <DetailDisplayRow label="Notes" value={details.notes} />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
