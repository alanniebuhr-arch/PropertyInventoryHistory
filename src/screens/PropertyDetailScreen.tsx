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
import type { AppState, Room } from '../types';
import { OverdueBadge, RoomListRow } from '../components/ListRows';
import { PropertyPhotosSection } from '../components/PropertyPhotosSection';
import { RenameModal } from '../components/RenameModal';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { sharedStyles } from '../theme';
import { uid } from '../utils';
import {
  deletePropertyCascade,
  itemsForProperty,
  nextRoomSortOrder,
  propertyById,
  roomsForProperty,
} from '../storage';
import { overdueCountForProperty, overdueCountForRoom } from '../itemMaintenance';
import { firstPhotoUriForRoom } from '../roomPhotos';

export function PropertyDetailScreen(props: {
  state: AppState;
  propertyId: string;
  onBack: () => void;
  onOpenRoom: (roomId: string) => void;
  onSave: (state: AppState) => void;
}) {
  const { state, propertyId, onBack, onOpenRoom, onSave } = props;
  const insets = useSafeAreaInsets();
  const property = propertyById(state, propertyId);
  const rooms = roomsForProperty(state, propertyId);
  const [modalOpen, setModalOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');

  if (!property) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>Property not found.</Text>
        <Pressable onPress={onBack} style={sharedStyles.secondaryBtn}>
          <Text style={sharedStyles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const prop = property;
  const overdue = overdueCountForProperty(state, propertyId);
  const itemCount = itemsForProperty(state, propertyId).length;

  function addRoom() {
    const trimmed = roomName.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Enter a room name (e.g. Utilities).');
      return;
    }
    const room: Room = {
      id: uid('room'),
      propertyId,
      name: trimmed,
      sortOrder: nextRoomSortOrder(state, propertyId),
      photoIds: [],
    };
    onSave({ ...state, rooms: [...state.rooms, room] });
    setModalOpen(false);
    setRoomName('');
  }

  function openRenameProperty() {
    setRenameDraft(prop.name);
    setRenameOpen(true);
  }

  function savePropertyName() {
    const trimmed = renameDraft.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Enter a property name.');
      return;
    }
    onSave({
      ...state,
      properties: state.properties.map((p) =>
        p.id === propertyId ? { ...p, name: trimmed } : p
      ),
    });
    setRenameOpen(false);
  }

  function confirmDeleteProperty() {
    const propName = prop.name;
    Alert.alert(
      'Delete property?',
      `Remove "${propName}" and all its rooms, items, photos, and events?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onSave(deletePropertyCascade(state, propertyId));
            onBack();
          },
        },
      ]
    );
  }

  return (
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <ScreenBackHeader onPress={onBack} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[sharedStyles.content, { paddingTop: 0 }]}
      >
        <PropertyPhotosSection state={state} property={prop} onSave={onSave}>
          <Pressable
            onLongPress={openRenameProperty}
            accessibilityRole="header"
            accessibilityHint="Long press to rename this property"
          >
            <Text style={sharedStyles.title}>{prop.name}</Text>
          </Pressable>
          {prop.address ? <Text style={sharedStyles.subtitle}>{prop.address}</Text> : null}
        </PropertyPhotosSection>
        <Text style={sharedStyles.cardMeta}>
          {rooms.length} room{rooms.length === 1 ? '' : 's'} · {itemCount} item{itemCount === 1 ? '' : 's'}
        </Text>
        <OverdueBadge count={overdue} />

        <Text style={sharedStyles.sectionTitle}>Rooms</Text>
        {rooms.length === 0 ? (
          <Text style={sharedStyles.emptyText}>Add a room like Utilities or Kitchen.</Text>
        ) : (
          rooms.map((r) => (
            <RoomListRow
              key={r.id}
              name={r.name}
              thumbnailUri={firstPhotoUriForRoom(state, r)}
              itemCount={state.items.filter((i) => i.roomId === r.id).length}
              overdueCount={overdueCountForRoom(state, r.id)}
              requiresAuth={r.requiresAuth}
              onPress={() => onOpenRoom(r.id)}
            />
          ))
        )}

        <Pressable
          onPress={() => {
            setRoomName('');
            setModalOpen(true);
          }}
          style={({ pressed }) => [sharedStyles.primaryBtn, pressed && sharedStyles.primaryBtnPressed]}
        >
          <Text style={sharedStyles.primaryBtnText}>Add room</Text>
        </Pressable>

        <Pressable onPress={confirmDeleteProperty} style={sharedStyles.dangerBtn}>
          <Text style={sharedStyles.dangerBtnText}>Delete property</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }} onPress={() => setModalOpen(false)}>
          <Pressable style={[sharedStyles.card, { marginBottom: 0 }]} onPress={() => {}}>
            <Text style={sharedStyles.sectionTitle}>New room</Text>
            <TextInput
              value={roomName}
              onChangeText={setRoomName}
              placeholder="Utilities, Garage, Kitchen…"
              style={sharedStyles.input}
              autoFocus
            />
            <Pressable
              onPress={addRoom}
              style={({ pressed }) => [sharedStyles.primaryBtn, pressed && sharedStyles.primaryBtnPressed]}
            >
              <Text style={sharedStyles.primaryBtnText}>Save</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <RenameModal
        visible={renameOpen}
        title="Rename property"
        value={renameDraft}
        onChangeText={setRenameDraft}
        onSave={savePropertyName}
        onClose={() => setRenameOpen(false)}
        placeholder="Property name"
      />
    </View>
  );
}
