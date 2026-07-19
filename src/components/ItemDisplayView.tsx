import React, { useMemo, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { ItemDetails, ItemPhoto, ItemTypeId } from '../types';
import { DetailDisplayRow } from './DetailDisplayRow';
import { EditableDetailSection } from './EditableDetailSection';
import { PhotoSection } from './PhotoSection';
import { sharedStyles } from '../theme';
import { formatStoredDate, hasAnyValue } from '../itemDetailDisplayHelpers';
import { buildExtraOnlyPhotoTiles } from '../photoSectionBuilders';
import type { DocumentListRow } from './DocumentListSection';
import { GasMainForm } from '../screens/itemDetails/GasMainForm';
import { WaterHeaterForm } from '../screens/itemDetails/WaterHeaterForm';
import {
  InternetAccountFields,
  InternetServiceFields,
} from '../screens/itemDetails/InternetForm';
import { OtherItemNotesFields } from '../screens/itemDetails/OtherItemForm';
import { FormField } from '../screens/itemDetails/FormField';

type GalleryPhoto = Pick<ItemPhoto, 'id' | 'localUri' | 'caption' | 'notes' | 'favorite'>;

export function ItemDisplayView(props: {
  itemTypeId: ItemTypeId;
  details: ItemDetails;
  displayName?: string;
  photos: GalleryPhoto[];
  onAddPhoto: (uri: string) => void;
  onAddPhotos: (uris: string[]) => Promise<string[] | void> | string[] | void;
  onAddDocuments?: (
    picked: { uri: string; fileName: string; mimeType: string }[]
  ) => void | Promise<void>;
  extraDocumentRows?: DocumentListRow[];
  onDeletePhoto: (photoId: string) => void;
  onPhotoCaptionChange?: (photoId: string, caption: string, notes: string) => void;
  onPhotoFavoriteChange?: (photoId: string, favorite: boolean) => void;
  onDetailsChange: (details: ItemDetails) => void;
  onDisplayNameChange?: (displayName: string) => void;
  photoHeader?: ReactNode;
  onActiveHeroLabelChange?: (label: string | undefined) => void;
}) {
  const {
    itemTypeId,
    details,
    displayName,
    photos,
    onAddPhoto,
    onAddPhotos,
    onAddDocuments,
    extraDocumentRows,
    onDeletePhoto,
    onPhotoCaptionChange,
    onPhotoFavoriteChange,
    onDetailsChange,
    onDisplayNameChange,
    photoHeader,
    onActiveHeroLabelChange,
  } = props;

  const [editingSection, setEditingSection] = useState<string | null>(null);

  const photoTiles = useMemo(
    () =>
      buildExtraOnlyPhotoTiles({
        photos,
        onDeletePhoto,
        onLabelPhoto: onPhotoCaptionChange,
        onToggleFavorite: onPhotoFavoriteChange,
      }),
    [onDeletePhoto, onPhotoCaptionChange, onPhotoFavoriteChange, photos]
  );

  function updateDetails(next: ItemDetails) {
    onDetailsChange(next);
  }

  function openSection(sectionId: string) {
    setEditingSection(sectionId);
  }

  function closeSection() {
    setEditingSection(null);
  }

  function renderDetailSections() {
    switch (itemTypeId) {
      case 'furnace':
        return null;

      case 'air_conditioner':
        return null;

      case 'automobile':
        return null;

      case 'electric_panel':
        return null;

      case 'water_main':
        return null;

      case 'waste_water':
        return null;

      case 'gas_main': {
        const main = details.kind === 'gas_main' ? details : { kind: 'gas_main' as const };
        return (
          <EditableDetailSection
            title="Gas main"
            isEditing={editingSection === 'main'}
            onPress={() => openSection('main')}
            onDone={closeSection}
          >
            {editingSection === 'main' ? (
              <GasMainForm details={main} onChange={updateDetails} />
            ) : hasAnyValue([main.shutoffLocation, main.provider, main.meterNumber]) ? (
              <>
                <DetailDisplayRow label="Shutoff location" value={main.shutoffLocation} />
                <DetailDisplayRow label="Provider" value={main.provider} />
                <DetailDisplayRow label="Meter number" value={main.meterNumber} />
              </>
            ) : (
              <Text style={sharedStyles.cardMeta}>Not set</Text>
            )}
          </EditableDetailSection>
        );
      }

      case 'water_heater': {
        const heater = details.kind === 'water_heater' ? details : { kind: 'water_heater' as const };
        return (
          <EditableDetailSection
            title="Water heater"
            isEditing={editingSection === 'heater'}
            onPress={() => openSection('heater')}
            onDone={closeSection}
          >
            {editingSection === 'heater' ? (
              <WaterHeaterForm details={heater} onChange={updateDetails} />
            ) : hasAnyValue([heater.make, heater.modelNumber, heater.serialNumber, heater.notes]) ? (
              <>
                <DetailDisplayRow label="Make" value={heater.make} />
                <DetailDisplayRow label="Model" value={heater.modelNumber} />
                <DetailDisplayRow label="Serial number" value={heater.serialNumber} />
                <DetailDisplayRow label="Notes" value={heater.notes} />
              </>
            ) : (
              <Text style={sharedStyles.cardMeta}>Not set</Text>
            )}
          </EditableDetailSection>
        );
      }

      case 'internet': {
        const internet = details.kind === 'internet' ? details : { kind: 'internet' as const };
        return (
          <>
            <EditableDetailSection
              title="Service"
              isEditing={editingSection === 'service'}
              onPress={() => openSection('service')}
              onDone={closeSection}
            >
              {editingSection === 'service' ? (
                <InternetServiceFields details={internet} onChange={updateDetails} />
              ) : hasAnyValue([internet.isp, internet.routerModel, internet.wifiSsid]) ? (
                <>
                  <DetailDisplayRow label="ISP" value={internet.isp} />
                  <DetailDisplayRow label="Router model" value={internet.routerModel} />
                  <DetailDisplayRow label="Wi‑Fi SSID" value={internet.wifiSsid} />
                </>
              ) : (
                <Text style={sharedStyles.cardMeta}>Not set</Text>
              )}
            </EditableDetailSection>

            <EditableDetailSection
              title="Account"
              isEditing={editingSection === 'account'}
              onPress={() => openSection('account')}
              onDone={closeSection}
            >
              {editingSection === 'account' ? (
                <InternetAccountFields details={internet} onChange={updateDetails} />
              ) : internet.accountNotes?.trim() ? (
                <DetailDisplayRow label="Account notes" value={internet.accountNotes} />
              ) : (
                <Text style={sharedStyles.cardMeta}>Not set</Text>
              )}
            </EditableDetailSection>
          </>
        );
      }

      case 'other':
      default: {
        const other = details.kind === 'other' ? details : { kind: 'other' as const };
        return (
          <EditableDetailSection
            title="Asset"
            isEditing={editingSection === 'item'}
            onPress={() => openSection('item')}
            onDone={closeSection}
          >
            {editingSection === 'item' ? (
              <>
                {onDisplayNameChange ? (
                  <FormField
                    label="Name"
                    value={displayName ?? ''}
                    onChangeText={onDisplayNameChange}
                    placeholder="Describe this asset"
                  />
                ) : null}
                <OtherItemNotesFields details={other} onChange={updateDetails} />
              </>
            ) : hasAnyValue([displayName, other.notes]) ? (
              <>
                <DetailDisplayRow label="Name" value={displayName} />
                <DetailDisplayRow label="Notes" value={other.notes} />
              </>
            ) : (
              <Text style={sharedStyles.cardMeta}>Not set</Text>
            )}
          </EditableDetailSection>
        );
      }
    }
  }

  return (
    <View>
      <PhotoSection
        tiles={photoTiles}
        onAddPhotos={onAddPhotos}
        onAddDocuments={onAddDocuments}
        extraDocumentRows={extraDocumentRows}
        onActiveHeroLabelChange={onActiveHeroLabelChange}
      >
        {photoHeader}
      </PhotoSection>
      {renderDetailSections()}
    </View>
  );
}
