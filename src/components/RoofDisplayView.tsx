import React, { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../textScale';
import type { AppState, RoofDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import { withReorderedItemPhotoIds } from '../photoReorder';
import {
  ROOF_PHOTO_SLOTS,
  roofHasContractorInfo,
  roofHasRoofInfo,
  roofHasWarrantyInfo,
  roofMaterialLabel,
  type RoofPhotoSlotKey,
} from '../roofSlots';
import {
  addRoofExtraPhotos,
  clearRoofSlotDocument,
  clearRoofSlotPhoto,
  removeRoofExtraPhoto,
  roofExtraPhotos,
  roofSlotDocumentInfo,
  roofSlotPhotoUri,
  setRoofSlotDocument,
  setRoofSlotPhoto,
} from '../roofPhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import {
  RoofContractorFields,
  RoofNotesFields,
  RoofRoofFields,
  RoofWarrantyFields,
} from '../screens/itemDetails/RoofForm';

export function RoofDisplayView(props: {
  state: AppState;
  details: RoofDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: RoofDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
  showReorderArrows?: boolean;
  onToggleReorderArrows?: () => void;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange, showReorderArrows, onToggleReorderArrows } = props;
  const [editingSection, setEditingSection] = useState<
    'roof' | 'warranty' | 'contractor' | 'notes' | null
  >(null);

  const extraPhotos = roofExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: ROOF_PHOTO_SLOTS,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) => roofSlotPhotoUri(state, details, key as RoofPhotoSlotKey),
        getSlotDocument: (key) => roofSlotDocumentInfo(state, details, key as RoofPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as RoofPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as RoofPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as RoofPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setRoofSlotPhoto(state, itemId, key as RoofPhotoSlotKey, uri).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setRoofSlotDocument(
            state,
            itemId,
            key as RoofPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearRoofSlotPhoto(state, itemId, key as RoofPhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearRoofSlotDocument(state, itemId, key as RoofPhotoSlotKey).then(onSave);
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearRoofSlotPhoto(state, itemId, key as RoofPhotoSlotKey);
            next = await clearRoofSlotDocument(next, itemId, key as RoofPhotoSlotKey);
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as RoofPhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeRoofExtraPhoto(state, itemId, photoId).then(onSave);
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
    const next = await addRoofExtraPhotos(state, itemId, sourceUris);
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

  function updateDetails(next: RoofDetails) {
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
        title="Roof"
        isEditing={editingSection === 'roof'}
        onPress={() => setEditingSection('roof')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'roof' ? (
          <RoofRoofFields details={details} onChange={updateDetails} />
        ) : roofHasRoofInfo(details) ? (
          <>
            <DetailDisplayRow
              label="Material"
              value={roofMaterialLabel(details.material, details.materialOther)}
            />
            <DetailDisplayRow label="Color" value={details.color} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Install & warranty"
        isEditing={editingSection === 'warranty'}
        onPress={() => setEditingSection('warranty')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'warranty' ? (
          <RoofWarrantyFields details={details} onChange={updateDetails} />
        ) : roofHasWarrantyInfo(details) ? (
          <>
            <DetailDisplayRow
              label="Install date"
              value={formatStoredDate(details.installDateAtISO)}
            />
            <DetailDisplayRow
              label="Warranty expires"
              value={formatStoredDate(details.warrantyExpiresAtISO)}
            />
            <DetailDisplayRow
              label="Last inspected"
              value={formatStoredDate(details.lastInspectedAtISO)}
            />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Contractor"
        isEditing={editingSection === 'contractor'}
        onPress={() => setEditingSection('contractor')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'contractor' ? (
          <RoofContractorFields details={details} onChange={updateDetails} />
        ) : roofHasContractorInfo(details) ? (
          <>
            <DetailDisplayRow label="Contractor name" value={details.contractorName} />
            <DetailDisplayRow label="Contractor phone" value={details.contractorPhone} />
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
          <RoofNotesFields details={details} onChange={updateDetails} />
        ) : details.notes?.trim() ? (
          <DetailDisplayRow label="Notes" value={details.notes} />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
