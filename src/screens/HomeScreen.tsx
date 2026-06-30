import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppState, Property } from '../types';
import { PropertyListRow } from '../components/ListRows';
import { sharedStyles } from '../theme';
import { uid, nowISO } from '../utils';
import {
  itemsForProperty,
  roomsForProperty,
} from '../storage';
import { propertyCoverPhotoUri } from '../propertyPhotos';
import { overdueCountForProperty } from '../itemMaintenance';

export function HomeScreen(props: {
  state: AppState;
  onOpenProperty: (propertyId: string) => void;
  onOpenTransfer: () => void;
  onSave: (state: AppState) => void;
}) {
  const { state, onOpenProperty, onOpenTransfer, onSave } = props;
  const insets = useSafeAreaInsets();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  function openAdd() {
    setName('');
    setAddress('');
    setModalOpen(true);
  }

  function saveProperty() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Enter a property or unit name.');
      return;
    }
    const property: Property = {
      id: uid('prop'),
      name: trimmed,
      address: address.trim() || undefined,
      createdAtISO: nowISO(),
    };
    onSave({ ...state, properties: [...state.properties, property] });
    setModalOpen(false);
  }

  const sorted = [...state.properties].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={sharedStyles.content}>
        <Text style={sharedStyles.title}>Property Inventory History</Text>
        <Text style={sharedStyles.subtitle}>Track rooms, items, maintenance, and photos.</Text>

        {sorted.length === 0 ? (
          <Text style={sharedStyles.emptyText}>
            No properties yet. Add a rental unit or property to get started.
          </Text>
        ) : (
          sorted.map((p) => {
            const rooms = roomsForProperty(state, p.id);
            const items = itemsForProperty(state, p.id);
            return (
              <PropertyListRow
                key={p.id}
                name={p.name}
                address={p.address}
                thumbnailUri={propertyCoverPhotoUri(state, p)}
                roomCount={rooms.length}
                itemCount={items.length}
                overdueCount={overdueCountForProperty(state, p.id)}
                onPress={() => onOpenProperty(p.id)}
              />
            );
          })
        )}

        <Pressable
          onPress={openAdd}
          style={({ pressed }) => [sharedStyles.primaryBtn, pressed && sharedStyles.primaryBtnPressed]}
        >
          <Text style={sharedStyles.primaryBtnText}>Add property</Text>
        </Pressable>

        <Pressable onPress={onOpenTransfer} style={sharedStyles.secondaryBtn}>
          <Text style={sharedStyles.secondaryBtnText}>Export / import backup</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }} onPress={() => setModalOpen(false)}>
          <Pressable style={[sharedStyles.card, { marginBottom: 0 }]} onPress={() => {}}>
            <Text style={sharedStyles.sectionTitle}>New property</Text>
            <Text style={sharedStyles.fieldLabel}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Unit 1, Main Street duplex…"
              style={sharedStyles.input}
              autoFocus
            />
            <Text style={sharedStyles.fieldLabel}>Address (optional)</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="123 Main St"
              style={sharedStyles.input}
            />
            <Pressable
              onPress={saveProperty}
              style={({ pressed }) => [sharedStyles.primaryBtn, pressed && sharedStyles.primaryBtnPressed]}
            >
              <Text style={sharedStyles.primaryBtnText}>Save</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
