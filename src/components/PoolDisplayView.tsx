import React, { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../textScale';
import type { AppState, PoolDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import { withReorderedItemPhotoIds } from '../photoReorder';
import {
  POOL_PHOTO_SLOTS,
  poolHasEquipmentInfo,
  poolHasInstallInfo,
  poolHasPoolInfo,
  poolHasServiceInfo,
  poolTypeLabel,
  type PoolPhotoSlotKey,
} from '../poolSlots';
import {
  addPoolExtraPhotos,
  clearPoolSlotDocument,
  clearPoolSlotPhoto,
  removePoolExtraPhoto,
  poolExtraPhotos,
  poolSlotDocumentInfo,
  poolSlotPhotoUri,
  setPoolSlotDocument,
  setPoolSlotPhoto,
} from '../poolPhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import {
  PoolEquipmentFields,
  PoolInstallFields,
  PoolNotesFields,
  PoolPoolFields,
  PoolServiceFields,
} from '../screens/itemDetails/PoolForm';

export function PoolDisplayView(props: {
  state: AppState;
  details: PoolDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: PoolDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
  showReorderArrows?: boolean;
  onToggleReorderArrows?: () => void;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange, showReorderArrows, onToggleReorderArrows } = props;
  const [editingSection, setEditingSection] = useState<
    'pool' | 'equipment' | 'install' | 'service' | 'notes' | null
  >(null);

  const extraPhotos = poolExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: POOL_PHOTO_SLOTS,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) => poolSlotPhotoUri(state, details, key as PoolPhotoSlotKey),
        getSlotDocument: (key) => poolSlotDocumentInfo(state, details, key as PoolPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as PoolPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as PoolPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as PoolPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setPoolSlotPhoto(state, itemId, key as PoolPhotoSlotKey, uri).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setPoolSlotDocument(
            state,
            itemId,
            key as PoolPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearPoolSlotPhoto(state, itemId, key as PoolPhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearPoolSlotDocument(state, itemId, key as PoolPhotoSlotKey).then(onSave);
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearPoolSlotPhoto(state, itemId, key as PoolPhotoSlotKey);
            next = await clearPoolSlotDocument(next, itemId, key as PoolPhotoSlotKey);
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as PoolPhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removePoolExtraPhoto(state, itemId, photoId).then(onSave);
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
    const next = await addPoolExtraPhotos(state, itemId, sourceUris);
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

  function updateDetails(next: PoolDetails) {
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
        onToggleReorderArrows={onToggleReorderArrows}
        hasHiddenSlots={hasHiddenSlots}
        onRestoreHiddenSlots={() => onSave(restoreItemHiddenPhotoSlots(state, itemId))}
      >
        {photoHeader}
      </PhotoSection>

      <EditableDetailSection
        title="Pool"
        isEditing={editingSection === 'pool'}
        onPress={() => setEditingSection('pool')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'pool' ? (
          <PoolPoolFields details={details} onChange={updateDetails} />
        ) : poolHasPoolInfo(details) ? (
          <>
            <DetailDisplayRow
              label="Pool type"
              value={poolTypeLabel(details.poolType, details.poolTypeOther)}
            />
            <DetailDisplayRow label="Volume (gallons)" value={details.volumeGallons} />
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
          <PoolEquipmentFields details={details} onChange={updateDetails} />
        ) : poolHasEquipmentInfo(details) ? (
          <>
            <DetailDisplayRow label="Filter make" value={details.filterMake} />
            <DetailDisplayRow label="Filter model" value={details.filterModel} />
            <DetailDisplayRow label="Pump make" value={details.pumpMake} />
            <DetailDisplayRow label="Pump model" value={details.pumpModel} />
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
          <PoolInstallFields details={details} onChange={updateDetails} />
        ) : poolHasInstallInfo(details) ? (
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
          <PoolServiceFields details={details} onChange={updateDetails} />
        ) : poolHasServiceInfo(details) ? (
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
          <PoolNotesFields details={details} onChange={updateDetails} />
        ) : details.notes?.trim() ? (
          <DetailDisplayRow label="Notes" value={details.notes} />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
