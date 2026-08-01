import React, { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../textScale';
import type { AppState, WellPumpDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import { withReorderedItemPhotoIds } from '../photoReorder';
import {
  WELL_PUMP_PHOTO_SLOTS,
  wellPumpHasEquipmentInfo,
  wellPumpHasInstallInfo,
  wellPumpHasServiceInfo,
  wellPumpHasWellInfo,
  type WellPumpPhotoSlotKey,
} from '../wellPumpSlots';
import {
  addWellPumpExtraPhotos,
  clearWellPumpSlotDocument,
  clearWellPumpSlotPhoto,
  removeWellPumpExtraPhoto,
  wellPumpExtraPhotos,
  wellPumpSlotDocumentInfo,
  wellPumpSlotPhotoUri,
  setWellPumpSlotDocument,
  setWellPumpSlotPhoto,
} from '../wellPumpPhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import {
  WellPumpEquipmentFields,
  WellPumpInstallFields,
  WellPumpNotesFields,
  WellPumpServiceFields,
  WellPumpWellFields,
} from '../screens/itemDetails/WellPumpForm';

export function WellPumpDisplayView(props: {
  state: AppState;
  details: WellPumpDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: WellPumpDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
  showReorderArrows?: boolean;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange, showReorderArrows } =
    props;
  const [editingSection, setEditingSection] = useState<
    'equipment' | 'well' | 'install' | 'service' | 'notes' | null
  >(null);

  const extraPhotos = wellPumpExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: WELL_PUMP_PHOTO_SLOTS,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) => wellPumpSlotPhotoUri(state, details, key as WellPumpPhotoSlotKey),
        getSlotDocument: (key) =>
          wellPumpSlotDocumentInfo(state, details, key as WellPumpPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as WellPumpPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as WellPumpPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as WellPumpPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setWellPumpSlotPhoto(state, itemId, key as WellPumpPhotoSlotKey, uri).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setWellPumpSlotDocument(
            state,
            itemId,
            key as WellPumpPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearWellPumpSlotPhoto(state, itemId, key as WellPumpPhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearWellPumpSlotDocument(state, itemId, key as WellPumpPhotoSlotKey).then(onSave);
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearWellPumpSlotPhoto(state, itemId, key as WellPumpPhotoSlotKey);
            next = await clearWellPumpSlotDocument(next, itemId, key as WellPumpPhotoSlotKey);
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as WellPumpPhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeWellPumpExtraPhoto(state, itemId, photoId).then(onSave);
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
    const next = await addWellPumpExtraPhotos(state, itemId, sourceUris);
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

  function updateDetails(next: WellPumpDetails) {
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
          <WellPumpEquipmentFields details={details} onChange={updateDetails} />
        ) : wellPumpHasEquipmentInfo(details) ? (
          <>
            <DetailDisplayRow label="Pump make" value={details.pumpMake} />
            <DetailDisplayRow label="Pump model" value={details.pumpModel} />
            <DetailDisplayRow label="Pump serial number" value={details.pumpSerialNumber} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Well"
        isEditing={editingSection === 'well'}
        onPress={() => setEditingSection('well')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'well' ? (
          <WellPumpWellFields details={details} onChange={updateDetails} />
        ) : wellPumpHasWellInfo(details) ? (
          <>
            <DetailDisplayRow label="Well depth" value={details.wellDepth} />
            <DetailDisplayRow label="Yield (GPM)" value={details.yieldGpm} />
            <DetailDisplayRow label="Pressure tank size" value={details.pressureTankSize} />
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
          <WellPumpInstallFields details={details} onChange={updateDetails} />
        ) : wellPumpHasInstallInfo(details) ? (
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
          <WellPumpServiceFields details={details} onChange={updateDetails} />
        ) : wellPumpHasServiceInfo(details) ? (
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
          <WellPumpNotesFields details={details} onChange={updateDetails} />
        ) : details.notes?.trim() ? (
          <DetailDisplayRow label="Notes" value={details.notes} />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
