import React, { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../textScale';
import type { AppState, IrrigationDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import { withReorderedItemPhotoIds } from '../photoReorder';
import {
  IRRIGATION_PHOTO_SLOTS,
  irrigationHasInstallInfo,
  irrigationHasServiceInfo,
  irrigationHasSystemInfo,
  type IrrigationPhotoSlotKey,
} from '../irrigationSlots';
import {
  addIrrigationExtraPhotos,
  clearIrrigationSlotDocument,
  clearIrrigationSlotPhoto,
  removeIrrigationExtraPhoto,
  irrigationExtraPhotos,
  irrigationSlotDocumentInfo,
  irrigationSlotPhotoUri,
  setIrrigationSlotDocument,
  setIrrigationSlotPhoto,
} from '../irrigationPhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import {
  IrrigationInstallFields,
  IrrigationNotesFields,
  IrrigationServiceFields,
  IrrigationSystemFields,
} from '../screens/itemDetails/IrrigationForm';

export function IrrigationDisplayView(props: {
  state: AppState;
  details: IrrigationDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: IrrigationDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
  showReorderArrows?: boolean;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange, showReorderArrows } =
    props;
  const [editingSection, setEditingSection] = useState<
    'system' | 'install' | 'service' | 'notes' | null
  >(null);

  const extraPhotos = irrigationExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: IRRIGATION_PHOTO_SLOTS,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) => irrigationSlotPhotoUri(state, details, key as IrrigationPhotoSlotKey),
        getSlotDocument: (key) =>
          irrigationSlotDocumentInfo(state, details, key as IrrigationPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as IrrigationPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as IrrigationPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as IrrigationPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setIrrigationSlotPhoto(state, itemId, key as IrrigationPhotoSlotKey, uri).then(
            onSave
          );
        },
        onAddSlotDocument: (key, picked) => {
          void setIrrigationSlotDocument(
            state,
            itemId,
            key as IrrigationPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearIrrigationSlotPhoto(state, itemId, key as IrrigationPhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearIrrigationSlotDocument(state, itemId, key as IrrigationPhotoSlotKey).then(
            onSave
          );
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearIrrigationSlotPhoto(
              state,
              itemId,
              key as IrrigationPhotoSlotKey
            );
            next = await clearIrrigationSlotDocument(next, itemId, key as IrrigationPhotoSlotKey);
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as IrrigationPhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeIrrigationExtraPhoto(state, itemId, photoId).then(onSave);
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
    const next = await addIrrigationExtraPhotos(state, itemId, sourceUris);
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

  function updateDetails(next: IrrigationDetails) {
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
          <IrrigationSystemFields details={details} onChange={updateDetails} />
        ) : irrigationHasSystemInfo(details) ? (
          <>
            <DetailDisplayRow label="Controller make" value={details.controllerMake} />
            <DetailDisplayRow label="Controller model" value={details.controllerModel} />
            <DetailDisplayRow label="Zone count" value={details.zoneCount} />
            <DetailDisplayRow label="Backflow location" value={details.backflowLocation} />
            <DetailDisplayRow label="Winterize notes" value={details.winterizeNotes} />
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
          <IrrigationInstallFields details={details} onChange={updateDetails} />
        ) : irrigationHasInstallInfo(details) ? (
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
          <IrrigationServiceFields details={details} onChange={updateDetails} />
        ) : irrigationHasServiceInfo(details) ? (
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
          <IrrigationNotesFields details={details} onChange={updateDetails} />
        ) : details.notes?.trim() ? (
          <DetailDisplayRow label="Notes" value={details.notes} />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
