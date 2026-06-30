import React from 'react';
import { Text, View } from 'react-native';
import type { AppState, Property } from '../types';
import { PhotoSlot } from './PhotoSlot';
import { sharedStyles } from '../theme';
import { PROPERTY_EXTERIOR_PHOTO_SLOTS } from '../propertyPhotoSlots';
import {
  clearPropertySlotPhoto,
  propertySlotPhotoUri,
  setPropertySlotPhoto,
} from '../propertyPhotos';

function chunkSlots<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

export function PropertyCoverPhotoSection(props: {
  state: AppState;
  property: Property;
  onSave: (state: AppState) => void;
}) {
  const { state, property, onSave } = props;

  async function addPhoto(
    slotKey: (typeof PROPERTY_EXTERIOR_PHOTO_SLOTS)[number]['key'],
    uri: string
  ) {
    const next = await setPropertySlotPhoto(state, property.id, slotKey, uri);
    onSave(next);
  }

  async function removePhoto(slotKey: (typeof PROPERTY_EXTERIOR_PHOTO_SLOTS)[number]['key']) {
    const next = await clearPropertySlotPhoto(state, property.id, slotKey);
    onSave(next);
  }

  const rows = chunkSlots(PROPERTY_EXTERIOR_PHOTO_SLOTS, 2);

  return (
    <View>
      <Text style={sharedStyles.sectionTitle}>Exterior photos</Text>
      {rows.map((row, rowIndex) => (
        <View
          key={row.map((slot) => slot.key).join('-')}
          style={{
            flexDirection: 'row',
            gap: 12,
            marginBottom: rowIndex < rows.length - 1 ? 16 : 0,
          }}
        >
          {row.map((slot) => (
            <View key={slot.key} style={{ flex: 1 }}>
              <PhotoSlot
                label={slot.label}
                hint={slot.hint}
                photoUri={propertySlotPhotoUri(state, property, slot.key)}
                onAdd={(uri) => void addPhoto(slot.key, uri)}
                onRemove={() => void removePhoto(slot.key)}
                hideActionButtons
                compact
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
