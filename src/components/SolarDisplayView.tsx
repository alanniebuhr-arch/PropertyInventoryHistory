import React, { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../textScale';
import type { AppState, SolarDetails } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate } from '../itemDetailDisplayHelpers';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import { withReorderedItemPhotoIds } from '../photoReorder';
import {
  SOLAR_PHOTO_SLOTS,
  solarHasInstallInfo,
  solarHasInverterInfo,
  solarHasProductionInfo,
  solarHasSystemInfo,
  type SolarPhotoSlotKey,
} from '../solarSlots';
import {
  addSolarExtraPhotos,
  clearSolarSlotDocument,
  clearSolarSlotPhoto,
  removeSolarExtraPhoto,
  solarExtraPhotos,
  solarSlotDocumentInfo,
  solarSlotPhotoUri,
  setSolarSlotDocument,
  setSolarSlotPhoto,
} from '../solarPhotos';
import { setItemPhotoCaptionAndNotes, setItemPhotoFavorite, setItemPhotoNotes } from '../photoMeta';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { hideItemPhotoSlotKey, restoreItemHiddenPhotoSlots } from '../hiddenPhotoSlots';
import {
  SolarInstallFields,
  SolarInverterFields,
  SolarNotesFields,
  SolarProductionFields,
  SolarSystemFields,
} from '../screens/itemDetails/SolarForm';

export function SolarDisplayView(props: {
  state: AppState;
  details: SolarDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: SolarDetails) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
  showReorderArrows?: boolean;
}) {
  const { state, details, itemId, onSave, onDetailsChange, photoHeader, onActiveHeroLabelChange, showReorderArrows } =
    props;
  const [editingSection, setEditingSection] = useState<
    'system' | 'inverter' | 'production' | 'install' | 'notes' | null
  >(null);

  const extraPhotos = solarExtraPhotos(state, itemId, details);
  const item = state.items.find((entry) => entry.id === itemId);
  const hasHiddenSlots = (item?.hiddenPhotoSlotKeys?.length ?? 0) > 0;

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: SOLAR_PHOTO_SLOTS,
        hiddenSlotKeys: item?.hiddenPhotoSlotKeys,
        getSlotUri: (key) => solarSlotPhotoUri(state, details, key as SolarPhotoSlotKey),
        getSlotDocument: (key) => solarSlotDocumentInfo(state, details, key as SolarPhotoSlotKey),
        getSlotNotes: (key) => {
          const photoId = details[key as SolarPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.notes : undefined;
        },
        getSlotPhotoId: (key) => details[key as SolarPhotoSlotKey],
        getSlotFavorite: (key) => {
          const photoId = details[key as SolarPhotoSlotKey];
          return photoId ? state.photos.find((photo) => photo.id === photoId)?.favorite : undefined;
        },
        onAddSlot: (key, uri) => {
          void setSolarSlotPhoto(state, itemId, key as SolarPhotoSlotKey, uri).then(onSave);
        },
        onAddSlotDocument: (key, picked) => {
          void setSolarSlotDocument(
            state,
            itemId,
            key as SolarPhotoSlotKey,
            picked.uri,
            picked.fileName,
            picked.mimeType
          ).then(onSave);
        },
        onDeleteSlot: (key) => {
          void clearSolarSlotPhoto(state, itemId, key as SolarPhotoSlotKey).then(onSave);
        },
        onDeleteSlotDocument: (key) => {
          void clearSolarSlotDocument(state, itemId, key as SolarPhotoSlotKey).then(onSave);
        },
        onRemoveSlot: (key) => {
          void (async () => {
            let next = await clearSolarSlotPhoto(state, itemId, key as SolarPhotoSlotKey);
            next = await clearSolarSlotDocument(next, itemId, key as SolarPhotoSlotKey);
            onSave(hideItemPhotoSlotKey(next, itemId, key));
          })();
        },
        onLabelSlot: (key, notes) => {
          const photoId = details[key as SolarPhotoSlotKey];
          if (photoId) onSave(setItemPhotoNotes(state, photoId, notes));
        },
        onToggleFavorite: (photoId, favorite) => {
          onSave(setItemPhotoFavorite(state, photoId, favorite));
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removeSolarExtraPhoto(state, itemId, photoId).then(onSave);
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
    const next = await addSolarExtraPhotos(state, itemId, sourceUris);
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

  function updateDetails(next: SolarDetails) {
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
          <SolarSystemFields details={details} onChange={updateDetails} />
        ) : solarHasSystemInfo(details) ? (
          <>
            <DetailDisplayRow label="System size (kW)" value={details.systemSizeKw} />
            <DetailDisplayRow label="Panel make" value={details.panelMake} />
            <DetailDisplayRow label="Panel model" value={details.panelModel} />
            <DetailDisplayRow label="Panel count" value={details.panelCount} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Inverter"
        isEditing={editingSection === 'inverter'}
        onPress={() => setEditingSection('inverter')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'inverter' ? (
          <SolarInverterFields details={details} onChange={updateDetails} />
        ) : solarHasInverterInfo(details) ? (
          <>
            <DetailDisplayRow label="Inverter make" value={details.inverterMake} />
            <DetailDisplayRow label="Inverter model" value={details.inverterModel} />
            <DetailDisplayRow
              label="Inverter serial number"
              value={details.inverterSerialNumber}
            />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>

      <EditableDetailSection
        title="Production & account"
        isEditing={editingSection === 'production'}
        onPress={() => setEditingSection('production')}
        onDone={() => setEditingSection(null)}
      >
        {editingSection === 'production' ? (
          <SolarProductionFields details={details} onChange={updateDetails} />
        ) : solarHasProductionInfo(details) ? (
          <DetailDisplayRow
            label="Production account notes"
            value={details.productionAccountNotes}
          />
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
          <SolarInstallFields details={details} onChange={updateDetails} />
        ) : solarHasInstallInfo(details) ? (
          <>
            <DetailDisplayRow
              label="Install date"
              value={formatStoredDate(details.installDateAtISO)}
            />
            <DetailDisplayRow label="Installer name" value={details.installerName} />
            <DetailDisplayRow label="Installer phone" value={details.installerPhone} />
            <DetailDisplayRow label="Warranty notes" value={details.warrantyNotes} />
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
          <SolarNotesFields details={details} onChange={updateDetails} />
        ) : details.notes?.trim() ? (
          <DetailDisplayRow label="Notes" value={details.notes} />
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableDetailSection>
    </View>
  );
}
