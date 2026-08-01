import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type TextInput as RNTextInput,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppState, InventoryItem, ItemTypeId, Project, Room } from '../types';
import { GearKeywordLabel } from './GearKeywordLabel';
import { ItemTypePickerModal } from './ItemTypePickerModal';
import { RenameModal } from './RenameModal';
import { useKeyboardDoneAccessory } from './KeyboardDoneAccessory';
import { useKeyboardSheetScroll } from './useKeyboardSheetScroll';
import { sharedStyles, colors } from '../theme';
import { Text, TextInput } from '../textScale';
import { nowISO, uid } from '../utils';
import {
  eventsForProperty,
  interactionsForProperty,
  itemsForProperty,
  nextProjectSortOrder,
  nextRoomSortOrder,
  roomsForProperty,
} from '../storage';
import {
  catalogLabel,
  createInventoryItem,
  namePlaceholderForItemType,
} from '../itemCatalog';

/** Material Icons names, plus Community Icons used where Material has no match (e.g. shovel). */
export type PropertyGearNavIcon =
  | React.ComponentProps<typeof MaterialIcons>['name']
  | 'shovel';

export type PropertyGearNavItem = {
  key: string;
  prefix: 'New' | 'Search';
  keyword: string;
  onPress: () => void;
  /** Leading icon matching toolbar shortcuts (Assets / Interactions / Services / Room). */
  icon?: PropertyGearNavIcon;
  /** Short right-justified blurb on New menu rows. */
  helpText?: string;
};

function PropertyGearNavIconView(props: { name: PropertyGearNavIcon; size?: number }) {
  const size = props.size ?? 22;
  if (props.name === 'shovel') {
    return <MaterialCommunityIcons name="shovel" size={size} color={colors.primary} />;
  }
  return <MaterialIcons name={props.name} size={size} color={colors.primary} />;
}

export type PropertyGearNavActions = {
  onAddInteraction: () => void;
  onAddServiceEvent: () => void;
  onSearchAssets: () => void;
  onSearchInteractions: () => void;
  onSearchServiceHistory: () => void;
  /** When set, shows Search Activity (Property Detail only). */
  onSearchActivity?: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenItem: (itemId: string, startEditingSection?: 'appliance' | 'purchase' | 'repair') => void;
  onSave: (state: AppState) => void;
};

/**
 * Shared Property New/Search gear block + Project/Room/Asset create modals.
 * When `roomId` is set, New Asset skips the room picker.
 */
export function usePropertyGearNav(options: {
  state: AppState;
  propertyId: string;
  roomId?: string;
  runMenuAction: (action: () => void) => void;
  actions: PropertyGearNavActions;
}): {
  /** @deprecated Prefer newItems + searchItems */
  items: PropertyGearNavItem[];
  newItems: PropertyGearNavItem[];
  searchItems: PropertyGearNavItem[];
  createModals: React.ReactNode;
  openAddRoom: () => void;
  openAddProject: () => void;
  startAddAsset: () => void;
} {
  const { state, propertyId, roomId, runMenuAction, actions } = options;
  const insets = useSafeAreaInsets();
  const rooms = roomsForProperty(state, propertyId);
  const hasInteractions = interactionsForProperty(state, propertyId).length > 0;
  const hasServices = eventsForProperty(state, propertyId).length > 0;
  const hasAssets = itemsForProperty(state, propertyId).length > 0;

  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [addAssetRoomPickerOpen, setAddAssetRoomPickerOpen] = useState(false);
  const [addAssetTargetRoomId, setAddAssetTargetRoomId] = useState<string | null>(null);
  const [addItemPickerOpen, setAddItemPickerOpen] = useState(false);
  const [pendingItemType, setPendingItemType] = useState<ItemTypeId | null>(null);
  const [addItemNameOpen, setAddItemNameOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const roomNameInputRef = useRef<RNTextInput>(null);
  const projectNameInputRef = useRef<RNTextInput>(null);
  const projectDescInputRef = useRef<RNTextInput>(null);
  const {
    scrollRef: roomSheetScrollRef,
    onScroll: onRoomSheetScroll,
    measureAndScroll: measureRoomSheetField,
    contentBottomInset: roomSheetBottomInset,
  } = useKeyboardSheetScroll();
  const {
    scrollRef: projectSheetScrollRef,
    onScroll: onProjectSheetScroll,
    measureAndScroll: measureProjectSheetField,
    contentBottomInset: projectSheetBottomInset,
  } = useKeyboardSheetScroll();
  const roomKeyboardDone = useKeyboardDoneAccessory({
    id: `propertyGearNewRoomDone:${propertyId}`,
    variant: 'overlay',
  });
  const projectKeyboardDone = useKeyboardDoneAccessory({
    id: `propertyGearNewProjectDone:${propertyId}`,
    variant: 'overlay',
  });

  function openAddRoom() {
    setRoomName('');
    setRoomModalOpen(true);
  }

  function openAddProject() {
    setProjectName('');
    setProjectDescription('');
    setProjectModalOpen(true);
  }

  function openAddItemTypePicker(targetRoomId: string) {
    setAddAssetTargetRoomId(targetRoomId);
    setPendingItemType(null);
    setNewItemName('');
    setAddItemPickerOpen(true);
  }

  function startAddAsset() {
    if (roomId) {
      openAddItemTypePicker(roomId);
      return;
    }
    if (rooms.length === 0) {
      Alert.alert('Add a room first', 'Create a room before adding an asset to this property.');
      return;
    }
    if (rooms.length === 1) {
      openAddItemTypePicker(rooms[0].id);
      return;
    }
    setAddAssetRoomPickerOpen(true);
  }

  function pickRoomForAsset(pickedRoomId: string) {
    setAddAssetRoomPickerOpen(false);
    openAddItemTypePicker(pickedRoomId);
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
    setAddAssetTargetRoomId(null);
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
    actions.onSave({ ...state, rooms: [...state.rooms, room] });
    setRoomModalOpen(false);
    setRoomName('');
  }

  function addProject() {
    const trimmed = projectName.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Enter a project name (e.g. Pool renovation).');
      return;
    }
    const description = projectDescription.trim();
    const project: Project = {
      id: uid('project'),
      propertyId,
      name: trimmed,
      description: description || undefined,
      status: 'research',
      photoIds: [],
      sortOrder: nextProjectSortOrder(state, propertyId),
      createdAtISO: nowISO(),
    };
    actions.onSave({ ...state, projects: [...state.projects, project] });
    setProjectModalOpen(false);
    setProjectName('');
    setProjectDescription('');
    actions.onOpenProject(project.id);
  }

  function saveNewItem() {
    if (!pendingItemType || !addAssetTargetRoomId) return;
    const trimmed = newItemName.trim();
    if (pendingItemType === 'other' && !trimmed) {
      Alert.alert('Name required', 'Enter a name for this asset.');
      return;
    }
    const item: InventoryItem = createInventoryItem(
      addAssetTargetRoomId,
      pendingItemType,
      trimmed
    );
    actions.onSave({ ...state, items: [...state.items, item] });
    setAddItemNameOpen(false);
    setPendingItemType(null);
    setNewItemName('');
    setAddAssetTargetRoomId(null);
    actions.onOpenItem(item.id, pendingItemType === 'appliance' ? 'appliance' : undefined);
  }

  const newItems: PropertyGearNavItem[] = [
    {
      key: 'room',
      prefix: 'New',
      keyword: 'Room',
      icon: 'meeting-room',
      helpText: 'Asset container',
      onPress: () => runMenuAction(openAddRoom),
    },
    {
      key: 'asset',
      prefix: 'New',
      keyword: 'Asset',
      icon: 'inventory',
      helpText: 'A thing',
      onPress: () => runMenuAction(startAddAsset),
    },
    {
      key: 'serviceEvent',
      prefix: 'New',
      keyword: 'Service Event',
      icon: 'handyman',
      helpText: 'Track Asset',
      onPress: () => runMenuAction(actions.onAddServiceEvent),
    },
    {
      key: 'project',
      prefix: 'New',
      keyword: 'Project',
      icon: 'shovel',
      helpText: 'Organize a job',
      onPress: () => runMenuAction(openAddProject),
    },
    {
      key: 'interaction',
      prefix: 'New',
      keyword: 'Interaction',
      icon: 'forum',
      helpText: 'Conversation summary',
      onPress: () => runMenuAction(actions.onAddInteraction),
    },
  ];

  const searchItems: PropertyGearNavItem[] = [
    ...(hasAssets
      ? [
          {
            key: 'searchAssets',
            prefix: 'Search' as const,
            keyword: 'Assets',
            icon: 'inventory' as const,
            helpText: 'Things',
            onPress: () => runMenuAction(actions.onSearchAssets),
          },
        ]
      : []),
    ...(hasInteractions
      ? [
          {
            key: 'searchInteractions',
            prefix: 'Search' as const,
            keyword: 'Interactions',
            icon: 'forum' as const,
            helpText: 'Conversations',
            onPress: () => runMenuAction(actions.onSearchInteractions),
          },
        ]
      : []),
    ...(hasServices
      ? [
          {
            key: 'searchServiceHistory',
            prefix: 'Search' as const,
            keyword: 'Service Events',
            icon: 'handyman' as const,
            helpText: 'on Assets',
            onPress: () => runMenuAction(actions.onSearchServiceHistory),
          },
        ]
      : []),
    ...(actions.onSearchActivity && (hasInteractions || hasServices || hasAssets)
      ? [
          {
            key: 'searchActivity',
            prefix: 'Search' as const,
            keyword: 'All',
            icon: 'history' as const,
            onPress: () => runMenuAction(actions.onSearchActivity!),
          },
        ]
      : []),
  ];

  const items: PropertyGearNavItem[] = [...newItems, ...searchItems];

  const createModals = (
    <>
      <Modal
        visible={roomModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRoomModalOpen(false)}
      >
        <View style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Pressable
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.4)',
                justifyContent: 'flex-end',
              }}
              onPress={() => setRoomModalOpen(false)}
            >
              <Pressable
                style={{
                  backgroundColor: colors.card,
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderBottomWidth: 0,
                  borderColor: colors.border,
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: insets.bottom + 20,
                }}
                onPress={() => {}}
              >
                <ScrollView
                  ref={roomSheetScrollRef}
                  onScroll={onRoomSheetScroll}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                  contentContainerStyle={{ paddingBottom: roomSheetBottomInset }}
                >
                  <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>New room</Text>
                  <TextInput
                    ref={roomNameInputRef}
                    value={roomName}
                    onChangeText={setRoomName}
                    placeholder="Utilities, Garage, Kitchen…"
                    style={sharedStyles.input}
                    autoFocus
                    {...roomKeyboardDone.getTextInputProps({
                      onFocus: () => measureRoomSheetField(roomNameInputRef.current),
                    })}
                  />
                  <Pressable
                    onPress={addRoom}
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
          {roomKeyboardDone.accessory}
        </View>
      </Modal>

      <Modal
        visible={projectModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProjectModalOpen(false)}
      >
        <View style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Pressable
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.4)',
                justifyContent: 'flex-end',
              }}
              onPress={() => setProjectModalOpen(false)}
            >
              <Pressable
                style={{
                  backgroundColor: colors.card,
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderBottomWidth: 0,
                  borderColor: colors.border,
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: insets.bottom + 20,
                }}
                onPress={() => {}}
              >
                <ScrollView
                  ref={projectSheetScrollRef}
                  onScroll={onProjectSheetScroll}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                  contentContainerStyle={{ paddingBottom: projectSheetBottomInset }}
                >
                  <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>New project</Text>
                  <TextInput
                    ref={projectNameInputRef}
                    value={projectName}
                    onChangeText={setProjectName}
                    placeholder="Pool renovation, kitchen remodel…"
                    style={sharedStyles.input}
                    autoFocus
                    {...projectKeyboardDone.getTextInputProps({
                      onFocus: () => measureProjectSheetField(projectNameInputRef.current),
                    })}
                  />
                  <TextInput
                    ref={projectDescInputRef}
                    value={projectDescription}
                    onChangeText={setProjectDescription}
                    placeholder="Optional description"
                    style={[sharedStyles.input, sharedStyles.inputMultiline, { marginTop: 8 }]}
                    multiline
                    {...projectKeyboardDone.getTextInputProps({
                      onFocus: () => measureProjectSheetField(projectDescInputRef.current),
                    })}
                  />
                  <Pressable
                    onPress={addProject}
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
          {projectKeyboardDone.accessory}
        </View>
      </Modal>

      <Modal
        visible={addAssetRoomPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAddAssetRoomPickerOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            padding: 24,
          }}
          onPress={() => setAddAssetRoomPickerOpen(false)}
        >
          <Pressable style={[sharedStyles.card, { marginBottom: 0 }]} onPress={() => {}}>
            <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 4 }]}>
              Choose room
            </Text>
            {rooms.map((room) => (
              <Pressable
                key={room.id}
                onPress={() => pickRoomForAsset(room.id)}
                accessibilityRole="button"
                accessibilityLabel={room.name}
                style={({ pressed }) => ({
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: colors.hairline,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                  {room.name}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setAddAssetRoomPickerOpen(false)}
              style={({ pressed }) => [
                sharedStyles.secondaryBtn,
                { marginTop: 8 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={sharedStyles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ItemTypePickerModal
        visible={addItemPickerOpen}
        onSelect={pickItemType}
        onClose={() => {
          setAddItemPickerOpen(false);
          setAddAssetTargetRoomId(null);
        }}
      />

      <RenameModal
        visible={addItemNameOpen}
        title={pendingItemType ? `New ${catalogLabel(pendingItemType)}` : 'New asset'}
        value={newItemName}
        onChangeText={setNewItemName}
        onSave={saveNewItem}
        onClose={cancelAddItemName}
        placeholder={pendingItemType ? namePlaceholderForItemType(pendingItemType) : 'Asset name'}
        saveLabel="Create"
      />
    </>
  );

  return {
    items,
    newItems,
    searchItems,
    createModals,
    openAddRoom,
    openAddProject,
    startAddAsset,
  };
}

const toolbarIconBtnStyle = {
  width: 42,
  height: 36,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.border,
  borderRadius: 4,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: 'transparent' as const,
};

/** Bordered toolbar shortcut button (matches inventory / handyman / forum). */
export function ToolbarNavIconButton(props: {
  icon: PropertyGearNavIcon;
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { icon, accessibilityLabel, accessibilityHint, onPress, disabled } = props;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={8}
      style={({ pressed }) => [
        toolbarIconBtnStyle,
        { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      <PropertyGearNavIconView name={icon} />
    </Pressable>
  );
}

/** Renders New/Search menu rows (optional leading icon + GearKeywordLabel). */
export function PropertyGearNavRows(props: {
  items: PropertyGearNavItem[];
  onItemPress?: (item: PropertyGearNavItem) => void;
}) {
  return (
    <>
      {props.items.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => (props.onItemPress ? props.onItemPress(item) : item.onPress())}
          accessibilityRole="button"
          accessibilityLabel={
            item.helpText
              ? `${item.prefix} ${item.keyword}, ${item.helpText}`
              : `${item.prefix} ${item.keyword}`
          }
          style={({ pressed }) => ({
            paddingVertical: 14,
            borderTopWidth: 1,
            borderTopColor: colors.hairline,
            opacity: pressed ? 0.7 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          })}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              flexShrink: 1,
            }}
          >
            {item.icon ? <PropertyGearNavIconView name={item.icon} /> : null}
            <GearKeywordLabel prefix={item.prefix} keyword={item.keyword} />
          </View>
          {item.helpText ? (
            <Text
              style={{
                marginLeft: 'auto',
                flexShrink: 1,
                textAlign: 'right',
                fontSize: 12,
                lineHeight: 16,
                color: colors.textMuted,
              }}
              numberOfLines={2}
            >
              {item.helpText}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </>
  );
}

/** Modal chrome matching Gear: title banner, nav rows, Done. */
export function PropertyGearNavMenuModal(props: {
  visible: boolean;
  title: string;
  items: PropertyGearNavItem[];
  onClose: () => void;
}) {
  const { visible, title, items, onClose } = props;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          padding: 24,
        }}
        onPress={onClose}
      >
        <Pressable style={[sharedStyles.card, { marginBottom: 0 }]} onPress={() => {}}>
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 12,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                color: colors.card,
                fontSize: 15,
                fontWeight: '700',
                textAlign: 'center',
              }}
            >
              {title}
            </Text>
          </View>
          <PropertyGearNavRows
            items={items}
            onItemPress={(item) => {
              onClose();
              item.onPress();
            }}
          />
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              sharedStyles.secondaryBtn,
              { marginTop: 8 },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={sharedStyles.secondaryBtnText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Toolbar + / search buttons + menus. Place immediately left of settings.
 * Hides Search when searchItems is empty; hides New when newItems is empty.
 */
export function ToolbarNewSearchControls(props: {
  title: string;
  newItems: PropertyGearNavItem[];
  searchItems: PropertyGearNavItem[];
  disabled?: boolean;
}) {
  const { title, newItems, searchItems, disabled } = props;
  const [newOpen, setNewOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      {newItems.length > 0 ? (
        <ToolbarNavIconButton
          icon="add"
          accessibilityLabel="New"
          accessibilityHint="Opens create actions."
          disabled={disabled}
          onPress={() => setNewOpen(true)}
        />
      ) : null}
      {searchItems.length > 0 ? (
        <ToolbarNavIconButton
          icon="search"
          accessibilityLabel="Search"
          accessibilityHint="Opens search actions."
          disabled={disabled}
          onPress={() => setSearchOpen(true)}
        />
      ) : null}
      <PropertyGearNavMenuModal
        visible={newOpen}
        title={title}
        items={newItems}
        onClose={() => setNewOpen(false)}
      />
      <PropertyGearNavMenuModal
        visible={searchOpen}
        title={title}
        items={searchItems}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
