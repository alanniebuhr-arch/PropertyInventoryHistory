import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppState, Property } from '../types';
import { PropertyListRow } from '../components/ListRows';
import { sharedStyles, colors } from '../theme';
import { uid, nowISO } from '../utils';
import {
  itemsForProperty,
  roomsForProperty,
} from '../storage';
import { propertyCoverPhotoUri } from '../propertyPhotos';
import { upcomingServiceCountForProperty } from '../eventRecurrence';
import { applyPropertyTemplate, type DwellingType } from '../propertyTemplate';

function DwellingPicker(props: {
  value: DwellingType;
  onChange: (value: DwellingType) => void;
}) {
  const { value, onChange } = props;
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
      {(
        [
          { id: 'house' as const, label: 'House' },
          { id: 'apartment' as const, label: 'Apartment' },
        ] as const
      ).map((option) => {
        const selected = value === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[
              sharedStyles.secondaryBtn,
              {
                flex: 1,
                marginTop: 0,
                paddingVertical: 10,
                backgroundColor: selected ? colors.primary : colors.card,
                borderColor: selected ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                sharedStyles.secondaryBtnText,
                { color: selected ? '#fff' : colors.text, textAlign: 'center' },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function HomeScreen(props: {
  state: AppState;
  onOpenProperty: (propertyId: string) => void;
  onOpenTransfer: () => void;
  onSave: (state: AppState) => void;
}) {
  const { state, onOpenProperty, onOpenTransfer, onSave } = props;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [dwellingType, setDwellingType] = useState<DwellingType>('house');
  const [useDefaultLayout, setUseDefaultLayout] = useState(true);

  function openAdd() {
    setName('');
    setAddress('');
    setDwellingType('house');
    setUseDefaultLayout(true);
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
    let nextState: AppState = { ...state, properties: [...state.properties, property] };
    if (useDefaultLayout) {
      nextState = applyPropertyTemplate(nextState, property.id, dwellingType);
    }
    onSave(nextState);
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
                dueSoonCount={upcomingServiceCountForProperty(state, p.id)}
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

      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
            onPress={() => setModalOpen(false)}
          >
            <Pressable
              style={{
                backgroundColor: colors.card,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                borderWidth: 1,
                borderBottomWidth: 0,
                borderColor: colors.border,
                maxHeight: windowHeight * 0.92,
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: insets.bottom + 20,
              }}
              onPress={() => {}}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
                bounces={false}
              >
                <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>New property</Text>
                <Text style={sharedStyles.fieldLabel}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Unit 1, Main Street duplex…"
                  style={sharedStyles.input}
                />
                <Text style={sharedStyles.fieldLabel}>Address (optional)</Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="123 Main St"
                  style={sharedStyles.input}
                />
                <Text style={sharedStyles.fieldLabel}>Dwelling type</Text>
                <DwellingPicker value={dwellingType} onChange={setDwellingType} />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 12,
                    marginBottom: 4,
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[sharedStyles.fieldLabel, { marginTop: 0 }]}>Use default layout</Text>
                    <Text style={sharedStyles.cardMeta}>
                      Adds standard rooms and inventory items (from 24 Cedar Road layout).
                    </Text>
                  </View>
                  <Switch value={useDefaultLayout} onValueChange={setUseDefaultLayout} />
                </View>
                <Pressable
                  onPress={saveProperty}
                  style={({ pressed }) => [
                    sharedStyles.primaryBtn,
                    pressed && sharedStyles.primaryBtnPressed,
                  ]}
                >
                  <Text style={sharedStyles.primaryBtnText}>Save</Text>
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
