import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  Switch,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppState, InventoryItem, ItemTypeId } from '../types';
import { ItemListRow } from '../components/ListRows';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { RoomPhotosSection } from '../components/RoomPhotosSection';
import { RoomNavigationDots } from '../components/RoomNavigationDots';
import { RenameModal } from '../components/RenameModal';
import { ItemTypePickerModal } from '../components/ItemTypePickerModal';
import { sharedStyles } from '../theme';
import {
  deleteRoomCascade,
  eventsForItem,
  firstPhotoUriForItem,
  itemsForRoom,
  propertyById,
  roomById,
  roomsForProperty,
} from '../storage';
import {
  catalogLabel,
  createInventoryItem,
  itemCustomName,
  namePlaceholderForItemType,
} from '../itemCatalog';
import { itemListSummaryFields } from '../itemListSummaryFields';
import {
  isItemOverdue,
  nextDueLabelForItem,
} from '../itemMaintenance';
import { formatServiceEventSummary } from '../eventRecurrence';
import { photosForRoom } from '../roomPhotos';
import { deletePhotoFile } from '../photoStorage';
import { authenticateForRoom, markRoomUnlocked } from '../roomAuth';

export function RoomDetailScreen(props: {
  state: AppState;
  roomId: string;
  onBack: () => void;
  onNavigateRoom: (roomId: string) => void;
  onOpenItem: (itemId: string, startEditingSection?: 'appliance' | 'purchase' | 'repair') => void;
  onSave: (state: AppState) => void;
}) {
  const { state, roomId, onBack, onNavigateRoom, onOpenItem, onSave } = props;
  const insets = useSafeAreaInsets();
  const items = itemsForRoom(state, roomId);

  const [addItemPickerOpen, setAddItemPickerOpen] = useState(false);
  const [pendingItemType, setPendingItemType] = useState<ItemTypeId | null>(null);
  const [addItemNameOpen, setAddItemNameOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [heroPhotoLabel, setHeroPhotoLabel] = useState<string | undefined>();

  const room = roomById(state, roomId);
  const propertyRooms = room ? roomsForProperty(state, room.propertyId) : [];
  const roomIndex = room ? propertyRooms.findIndex((r) => r.id === roomId) : -1;

  const goToNextRoom = useCallback(() => {
    if (roomIndex < 0) return;
    const target = propertyRooms[roomIndex + 1];
    if (target) onNavigateRoom(target.id);
  }, [onNavigateRoom, propertyRooms, roomIndex]);

  const goToPrevRoom = useCallback(() => {
    if (roomIndex < 0) return;
    const target = propertyRooms[roomIndex - 1];
    if (target) onNavigateRoom(target.id);
  }, [onNavigateRoom, propertyRooms, roomIndex]);

  const makeRoomSwipeGesture = useCallback(
    () =>
      Gesture.Pan()
        .activeOffsetX([-40, 40])
        .failOffsetY([-28, 28])
        .onEnd((event) => {
          'worklet';
          if (event.translationX <= -56) {
            runOnJS(goToNextRoom)();
          } else if (event.translationX >= 56) {
            runOnJS(goToPrevRoom)();
          }
        }),
    [goToNextRoom, goToPrevRoom]
  );

  const roomSwipeGestureForTitle = useMemo(
    () => makeRoomSwipeGesture(),
    [makeRoomSwipeGesture]
  );
  const roomSwipeGestureForItems = useMemo(
    () => makeRoomSwipeGesture(),
    [makeRoomSwipeGesture]
  );
  const roomSwipeEnabled = propertyRooms.length > 1;

  if (!room) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>Room not found.</Text>
        <Pressable onPress={onBack} style={sharedStyles.secondaryBtn}>
          <Text style={sharedStyles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const rm = room;
  const property = propertyById(state, rm.propertyId);
  const subtitleParts = [property?.name, heroPhotoLabel].filter(Boolean);

  function startAddItem() {
    setPendingItemType(null);
    setNewItemName('');
    setAddItemPickerOpen(true);
  }

  function pickItemType(itemTypeId: ItemTypeId) {
    setPendingItemType(itemTypeId);
    setNewItemName('');
    setAddItemPickerOpen(false);
    setAddItemNameOpen(true);
  }

  function cancelAddItemName() {
    setAddItemNameOpen(false);
    setPendingItemType(null);
    setNewItemName('');
  }

  function saveNewItem() {
    if (!pendingItemType) return;
    const trimmed = newItemName.trim();
    if (pendingItemType === 'other' && !trimmed) {
      Alert.alert('Name required', 'Enter a name for this item.');
      return;
    }
    const item: InventoryItem = createInventoryItem(roomId, pendingItemType, trimmed);
    onSave({ ...state, items: [...state.items, item] });
    setAddItemNameOpen(false);
    setPendingItemType(null);
    setNewItemName('');
    onOpenItem(item.id, pendingItemType === 'appliance' ? 'appliance' : undefined);
  }

  function openRenameRoom() {
    setRenameDraft(rm.name);
    setRenameOpen(true);
  }

  function saveRoomName() {
    const trimmed = renameDraft.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Enter a room name.');
      return;
    }
    onSave({
      ...state,
      rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, name: trimmed } : r)),
    });
    setRenameOpen(false);
  }

  async function toggleRequiresAuth(next: boolean) {
    const ok = await authenticateForRoom(rm.name);
    if (!ok) return;
    onSave({
      ...state,
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, requiresAuth: next } : r
      ),
    });
    if (next) {
      markRoomUnlocked(roomId);
    }
  }

  function confirmDeleteRoom() {
    const roomName = rm.name;
    Alert.alert(
      'Delete room?',
      `Remove "${roomName}" and all items inside?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const p of photosForRoom(state, roomId)) {
              await deletePhotoFile(p.localUri);
            }
            onSave(deleteRoomCascade(state, roomId));
            onBack();
          },
        },
      ]
    );
  }

  const itemsSection = (
    <>
      <Text style={sharedStyles.sectionTitle}>Items</Text>
      {items.length === 0 ? (
        <Text style={sharedStyles.emptyText}>Add items like water heater, heating, or electric panel.</Text>
      ) : (
        items.map((item) => {
          const lastEvent = eventsForItem(state, item.id)[0];
          return (
            <ItemListRow
              key={item.id}
              label={catalogLabel(item.itemTypeId)}
              nameLabel={itemCustomName(item)}
              thumbnailUri={firstPhotoUriForItem(state, item)}
              detailFields={itemListSummaryFields(item)}
              lastServiceSummary={
                lastEvent ? formatServiceEventSummary(lastEvent) : undefined
              }
              nextDueLabel={nextDueLabelForItem(state, item.id)}
              overdue={isItemOverdue(state, item.id)}
              onPress={() => onOpenItem(item.id)}
            />
          );
        })
      )}

      <Pressable
        onPress={startAddItem}
        style={({ pressed }) => [sharedStyles.primaryBtn, pressed && sharedStyles.primaryBtnPressed]}
      >
        <Text style={sharedStyles.primaryBtnText}>Add item</Text>
      </Pressable>

      <Pressable onPress={confirmDeleteRoom} style={sharedStyles.dangerBtn}>
        <Text style={sharedStyles.dangerBtnText}>Delete room</Text>
      </Pressable>

      <View
        style={[
          sharedStyles.card,
          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        ]}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={sharedStyles.cardTitle}>Require authentication</Text>
          <Text style={sharedStyles.cardMeta}>Uses Face ID or device passcode</Text>
        </View>
        <Switch
          value={rm.requiresAuth === true}
          onValueChange={(value) => void toggleRequiresAuth(value)}
        />
      </View>
    </>
  );

  return (
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <ScreenBackHeader onPress={onBack} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[sharedStyles.content, { paddingTop: 0 }]}
      >
        <RoomPhotosSection
          state={state}
          roomId={roomId}
          room={rm}
          onSave={onSave}
          onActiveHeroLabelChange={setHeroPhotoLabel}
          childrenGesture={roomSwipeEnabled ? roomSwipeGestureForTitle : undefined}
        >
          <RoomNavigationDots
            count={propertyRooms.length}
            activeIndex={roomIndex}
            onSelect={(index) => {
              const target = propertyRooms[index];
              if (target) onNavigateRoom(target.id);
            }}
          />
          <Pressable
            onLongPress={openRenameRoom}
            accessibilityRole="header"
            accessibilityHint="Long press to rename this room"
          >
            <Text style={sharedStyles.title}>{rm.name}</Text>
          </Pressable>
          {subtitleParts.length > 0 ? (
            <Text style={sharedStyles.subtitle}>{subtitleParts.join(' · ')}</Text>
          ) : null}
        </RoomPhotosSection>

        {roomSwipeEnabled ? (
          <GestureDetector gesture={roomSwipeGestureForItems}>
            <View>{itemsSection}</View>
          </GestureDetector>
        ) : (
          itemsSection
        )}
      </ScrollView>

      <ItemTypePickerModal
        visible={addItemPickerOpen}
        onSelect={pickItemType}
        onClose={() => setAddItemPickerOpen(false)}
      />

      <RenameModal
        visible={addItemNameOpen}
        title={pendingItemType ? `New ${catalogLabel(pendingItemType)}` : 'New item'}
        value={newItemName}
        onChangeText={setNewItemName}
        onSave={saveNewItem}
        onClose={cancelAddItemName}
        placeholder={pendingItemType ? namePlaceholderForItemType(pendingItemType) : 'Item name'}
        saveLabel="Create"
      />

      <RenameModal
        visible={renameOpen}
        title="Rename room"
        value={renameDraft}
        onChangeText={setRenameDraft}
        onSave={saveRoomName}
        onClose={() => setRenameOpen(false)}
        placeholder="Room name"
      />
    </View>
  );
}
