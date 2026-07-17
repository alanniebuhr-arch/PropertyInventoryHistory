import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { AppState, Room } from '../types';
import { RoomListRow } from '../components/ListRows';
import { UpcomingServiceCard } from '../components/UpcomingServiceCard';
import { PropertyPhotosSection } from '../components/PropertyPhotosSection';
import { RenameModal } from '../components/RenameModal';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { sharedStyles, colors } from '../theme';
import { uid } from '../utils';
import {
  deletePropertyCascade,
  itemById,
  nextRoomSortOrder,
  propertyById,
  roomsForProperty,
} from '../storage';
import { overdueCountForRoom } from '../itemMaintenance';
import { itemDisplayLabel } from '../itemCatalog';
import { firstPhotoUriForRoom } from '../roomPhotos';
import {
  filterUpcomingByHorizon,
  upcomingHorizonLabel,
  upcomingServiceEventsForProperty,
  UPCOMING_HORIZON_OPTIONS,
  type UpcomingHorizon,
} from '../eventRecurrence';
import {
  getPropertyUpcomingHorizon,
  loadPropertyUpcomingHorizon,
  setPropertyUpcomingHorizon,
} from '../upcomingHorizonPrefs';
import { buildTransferBundle, sliceAppStateForProperty, transferBundleToJson } from '../transfer';
import { exportBackupToZip } from '../transferPackage';

export function PropertyDetailScreen(props: {
  state: AppState;
  propertyId: string;
  onBack: () => void;
  onOpenRoom: (roomId: string) => void;
  onEditEvent: (itemId: string, eventId: string) => void;
  onLogUpcomingService: (itemId: string, completeFromEventId: string) => void;
  onSave: (state: AppState) => void;
}) {
  const {
    state,
    propertyId,
    onBack,
    onOpenRoom,
    onEditEvent,
    onLogUpcomingService,
    onSave,
  } = props;
  const insets = useSafeAreaInsets();
  const property = propertyById(state, propertyId);
  const rooms = roomsForProperty(state, propertyId);
  const [modalOpen, setModalOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [exporting, setExporting] = useState(false);
  const [upcomingHorizon, setUpcomingHorizon] = useState<UpcomingHorizon>(
    getPropertyUpcomingHorizon
  );

  useEffect(() => {
    let cancelled = false;
    void loadPropertyUpcomingHorizon().then((horizon) => {
      if (!cancelled) setUpcomingHorizon(horizon);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
  const upcomingEvents = filterUpcomingByHorizon(
    upcomingServiceEventsForProperty(state, propertyId),
    upcomingHorizon
  );

  function selectUpcomingHorizon(horizon: UpcomingHorizon) {
    setUpcomingHorizon(horizon);
    void setPropertyUpcomingHorizon(horizon);
  }

  function openUpcomingHorizonPicker() {
    Alert.alert(
      'Show upcoming through',
      undefined,
      [
        ...UPCOMING_HORIZON_OPTIONS.map((opt) => ({
          text: opt.label,
          onPress: () => selectUpcomingHorizon(opt.id),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }

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

  function promptExportProperty() {
    Alert.alert(
      'Export property',
      `Share "${prop.name}" so another user can import it (Export / import backup → Merge).`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Data only', onPress: () => void exportProperty(false) },
        { text: 'Include photos', onPress: () => void exportProperty(true) },
      ]
    );
  }

  async function exportProperty(includePhotos: boolean) {
    const sliced = sliceAppStateForProperty(state, propertyId);
    if (!sliced) {
      Alert.alert('Export failed', 'Property not found.');
      return;
    }
    setExporting(true);
    try {
      const safeName = prop.name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'property';
      const sourceLabel = `Property: ${prop.name}`;
      if (includePhotos) {
        const path = await exportBackupToZip(sliced, {
          fileNamePrefix: safeName,
          sourceLabel,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(path, {
            mimeType: 'application/zip',
            UTI: 'public.zip-archive',
            dialogTitle: `Export ${prop.name}`,
          });
        } else {
          Alert.alert('Exported', `Backup saved to ${path}`);
        }
        return;
      }

      const bundle = buildTransferBundle({ state: sliced, sourceLabel });
      const json = transferBundleToJson(bundle);
      const fileName = `${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
      const path = `${FileSystem.cacheDirectory ?? ''}${fileName}`;
      await FileSystem.writeAsStringAsync(path, json);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/json',
          dialogTitle: `Export ${prop.name}`,
        });
      } else {
        Alert.alert('Exported', `Backup saved to ${path}`);
      }
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setExporting(false);
    }
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

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 8,
            marginBottom: 8,
          }}
        >
          <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0, flex: 1 }]}>
            Services upcoming
          </Text>
          <Pressable
            onPress={openUpcomingHorizonPicker}
            accessibilityRole="button"
            accessibilityLabel={`Upcoming range: ${upcomingHorizonLabel(upcomingHorizon)}`}
            accessibilityHint="Opens a list of time ranges for upcoming service."
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
              opacity: pressed ? 0.7 : 1,
              paddingVertical: 4,
              paddingLeft: 8,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
              {upcomingHorizonLabel(upcomingHorizon)}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={22} color={colors.primary} />
          </Pressable>
        </View>
        {upcomingEvents.length === 0 ? (
          <Text style={[sharedStyles.cardMeta, { marginBottom: 16 }]}>
            No upcoming service scheduled.
          </Text>
        ) : (
          <View style={{ marginBottom: 16 }}>
            {upcomingEvents.map((e) => {
              const item = itemById(state, e.itemId);
              return (
                <UpcomingServiceCard
                  key={e.id}
                  event={e}
                  leadingLabel={item ? itemDisplayLabel(item) : undefined}
                  onPressDetails={() => onEditEvent(e.itemId, e.id)}
                  onLogService={() => onLogUpcomingService(e.itemId, e.id)}
                />
              );
            })}
          </View>
        )}

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

        <Pressable
          onPress={promptExportProperty}
          disabled={exporting}
          style={({ pressed }) => [
            sharedStyles.secondaryBtn,
            pressed && !exporting && { opacity: 0.85 },
            exporting && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Export property"
          accessibilityHint="Shares this property so another user can import it."
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={sharedStyles.secondaryBtnText}>Export property</Text>
          )}
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
