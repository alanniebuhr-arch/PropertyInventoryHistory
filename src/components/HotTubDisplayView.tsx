import React, { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../textScale';
import type { AppState, HotTubDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import { withReorderedItemPhotoIds } from '../photoReorder';
import {
  HOT_TUB_PHOTO_SLOTS,
  hotTubHasEquipmentInfo,
  hotTubHasInstallInfo,
  hotTubHasMaintenanceInfo,
  hotTubHasServiceInfo,
  type HotTubPhotoSlotKey,
} from '../hotTubSlots';
import {
  addHotTubExtraPhotos,
  clearHotTubSlotDocument,
  clearHotTubSlotPhoto,
  removeHotTubExtraPhoto,
  hotTubExtraPhotos,
  hotTubSlotDocumentInfo,
  hotTubSlotPhotoUri,
  setHotTubSlotDocument,
  setHotTubSlotPhoto,
} from '../hotTubPhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import {
  HotTubEquipmentFields,
  HotTubInstallFields,
  HotTubMaintenanceFields,
  HotTubNotesFields,
  HotTubServiceFields,
} from '../screens/itemDetails/HotTubForm';

export function HotTubDisplayView(props: {
  state: AppState;
  details: HotTubDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: HotTubDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
  showReorderArrows?: boolean;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange, showReorderArrows } =
    props;
  const [editingSection, setEditingSection] = useState<
    'equipment' | 'maintenance' | 'install' | 'service' | 'notes' | null
  >(null);

  const extraPhotos = hotTubExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: HOT_TUB_PHOTO_SLOTS,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) => hotTubSlotPhotoUri(state, details, key as HotTubPhotoSlotKey),
        getSlotDocument: (key) =>
          hotTubSlotDocumentInfo(state, details, key as HotTubPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as HotTubPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as HotTubPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as HotTubPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setHotTubSlotPhoto(state, itemId, key as HotTubPhotoSlotKey, uri).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setHotTubSlotDocument(
            state,
            itemId,
            key as HotTubPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearHotTubSlotPhoto(state, itemId, key as HotTubPhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearHotTubSlotDocument(state, itemId, key as HotTubPhotoSlotKey).then(onSave);
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearHotTubSlotPhoto(state, itemId, key as HotTubPhotoSlotKey);
            next = await clearHotTubSlotDocument(next, itemId, key as HotTubPhotoSlotKey);
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as HotTubPhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeHotTubExtraPhoto(state, itemId, photoId).then(onSave);
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
    const next = await addHotTubExtraPhotos(state, itemId, sourceUris);
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

  function updateDetails(next: HotTubDetails) {
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
        title="Hot tub"
        isEditing={editingSection === 'equipment'}
        onPress={() => setEditingSection('equipment')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'equipment' ? (
          <HotTubEquipmentFields details={details} onChange={updateDetails} />
        ) : hotTubHasEquipmentInfo(details) ? (
          <>
            <DetailDisplayRow label="Make" value={details.make} />
            <DetailDisplayRow label="Model" value={details.modelNumber} />
            <DetailDisplayRow label="Serial number" value={details.serialNumber} />
            <DetailDisplayRow label="Capacity (persons)" value={details.capacityPersons} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Equipment & maintenance"
        isEditing={editingSection === 'maintenance'}
        onPress={() => setEditingSection('maintenance')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'maintenance' ? (
          <HotTubMaintenanceFields details={details} onChange={updateDetails} />
        ) : hotTubHasMaintenanceInfo(details) ? (
          <>
            <DetailDisplayRow label="Filter model" value={details.filterModel} />
            <DetailDisplayRow label="Heater type" value={details.heaterType} />
            <DetailDisplayRow label="Chemical notes" value={details.chemicalNotes} />
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
          <HotTubInstallFields details={details} onChange={updateDetails} />
        ) : hotTubHasInstallInfo(details) ? (
          <DetailDisplayRow
            label="Install date"
            value={formatStoredDate(details.installDateAtISO)}
          />
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
          <HotTubServiceFields details={details} onChange={updateDetails} />
        ) : hotTubHasServiceInfo(details) ? (
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
          <HotTubNotesFields details={details} onChange={updateDetails} />
        ) : details.notes?.trim() ? (
          <DetailDisplayRow label="Notes" value={details.notes} />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
