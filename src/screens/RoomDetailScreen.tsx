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
import type { AppState, InventoryItem, ItemTypeId } from '../types';
import { ItemListRow } from '../components/ListRows';
import { RoomPhotosSection } from '../components/RoomPhotosSection';
import { sharedStyles } from '../theme';
import { uid, nowISO } from '../utils';
import {
  deleteRoomCascade,
  eventsForItem,
  firstPhotoUriForItem,
  itemsForRoom,
  propertyById,
  roomById,
} from '../storage';
import { ITEM_CATALOG, catalogLabel, defaultDetailsForType, itemCustomName } from '../itemCatalog';
import { itemListSummaryFields } from '../itemListSummaryFields';
import {
  isItemOverdue,
  nextDueLabelForItem,
} from '../itemMaintenance';
import { formatServiceEventSummary } from '../eventRecurrence';
import { ItemDetailsForm } from '../itemDetailForms';
import { photosForRoom } from '../roomPhotos';
import { deletePhotoFile } from '../photoStorage';

export function RoomDetailScreen(props: {
  state: AppState;
  roomId: string;
  onBack: () => void;
  onOpenItem: (itemId: string, startEditingSection?: 'appliance' | 'purchase' | 'repair') => void;
  onSave: (state: AppState) => void;
}) {
  const { state, roomId, onBack, onOpenItem, onSave } = props;
  const insets = useSafeAreaInsets();
  const items = itemsForRoom(state, roomId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [otherNameOpen, setOtherNameOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pickedType, setPickedType] = useState<ItemTypeId | null>(null);
  const [otherName, setOtherName] = useState('');
  const [draftDetails, setDraftDetails] = useState(defaultDetailsForType('other'));

  const room = roomById(state, roomId);

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

  function startAddItem() {
    setPickedType(null);
    setOtherName('');
    setPickerOpen(true);
  }

  function pickType(typeId: ItemTypeId) {
    setPickedType(typeId);
    setDraftDetails(defaultDetailsForType(typeId));
    setPickerOpen(false);
    if (typeId === 'appliance') {
      createApplianceItem();
      return;
    }
    if (typeId === 'other') {
      setOtherName('');
      setOtherNameOpen(true);
    } else {
      setDetailsOpen(true);
    }
  }

  function createApplianceItem() {
    const item: InventoryItem = {
      id: uid('item'),
      roomId,
      itemTypeId: 'appliance',
      details: defaultDetailsForType('appliance'),
      photoIds: [],
      createdAtISO: nowISO(),
    };
    onSave({ ...state, items: [...state.items, item] });
    setPickedType(null);
    onOpenItem(item.id, 'appliance');
  }

  function confirmOtherName() {
    const trimmed = otherName.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Enter a name for this item.');
      return;
    }
    setOtherNameOpen(false);
    setDetailsOpen(true);
  }

  function saveNewItem() {
    if (!pickedType) return;
    if (pickedType === 'other' && !otherName.trim()) {
      Alert.alert('Name required', 'Enter a name for this item.');
      return;
    }
    const item: InventoryItem = {
      id: uid('item'),
      roomId,
      itemTypeId: pickedType,
      displayName: pickedType === 'other' ? otherName.trim() : undefined,
      details: draftDetails,
      photoIds: [],
      createdAtISO: nowISO(),
    };
    onSave({ ...state, items: [...state.items, item] });
    setDetailsOpen(false);
    setPickedType(null);
    onOpenItem(item.id);
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

  return (
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={sharedStyles.content}>
        <View style={sharedStyles.headerRow}>
          <Pressable onPress={onBack} style={sharedStyles.backBtn}>
            <Text style={sharedStyles.backBtnText}>← Back</Text>
          </Pressable>
        </View>
        <RoomPhotosSection state={state} roomId={roomId} onSave={onSave}>
          <Text style={sharedStyles.title}>{rm.name}</Text>
          {property ? <Text style={sharedStyles.subtitle}>{property.name}</Text> : null}
        </RoomPhotosSection>

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
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setPickerOpen(false)}>
          <Pressable style={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: insets.bottom + 20 }} onPress={() => {}}>
            <Text style={sharedStyles.sectionTitle}>Item type</Text>
            {ITEM_CATALOG.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => pickType(entry.id)}
                style={({ pressed }) => [sharedStyles.card, pressed && sharedStyles.cardPressed]}
              >
                <Text style={sharedStyles.cardTitle}>{entry.label}</Text>
                {entry.defaultRecurrenceHint ? (
                  <Text style={sharedStyles.cardMeta}>{entry.defaultRecurrenceHint}</Text>
                ) : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={otherNameOpen} transparent animationType="fade" onRequestClose={() => setOtherNameOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }} onPress={() => setOtherNameOpen(false)}>
          <Pressable style={[sharedStyles.card, { marginBottom: 0 }]} onPress={() => {}}>
            <Text style={sharedStyles.sectionTitle}>Item name</Text>
            <TextInput
              value={otherName}
              onChangeText={setOtherName}
              placeholder="Describe this item"
              style={sharedStyles.input}
              autoFocus
            />
            <Pressable
              onPress={confirmOtherName}
              style={({ pressed }) => [sharedStyles.primaryBtn, pressed && sharedStyles.primaryBtnPressed]}
            >
              <Text style={sharedStyles.primaryBtnText}>Continue</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={detailsOpen} transparent animationType="slide" onRequestClose={() => setDetailsOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
          <ScrollView contentContainerStyle={sharedStyles.content} keyboardShouldPersistTaps="handled">
            <Text style={sharedStyles.sectionTitle}>
              {pickedType ? catalogLabel(pickedType) : 'Item'} details
            </Text>
            {pickedType ? (
              <ItemDetailsForm
                itemTypeId={pickedType}
                details={draftDetails}
                onChange={setDraftDetails}
              />
            ) : null}
            <Pressable
              onPress={saveNewItem}
              style={({ pressed }) => [sharedStyles.primaryBtn, pressed && sharedStyles.primaryBtnPressed]}
            >
              <Text style={sharedStyles.primaryBtnText}>Save item</Text>
            </Pressable>
            <Pressable onPress={() => setDetailsOpen(false)} style={sharedStyles.secondaryBtn}>
              <Text style={sharedStyles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
