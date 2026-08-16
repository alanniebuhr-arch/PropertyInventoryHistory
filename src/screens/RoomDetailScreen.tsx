import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTextScaleControls } from '../textScale';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState } from '../types';
import { ItemGalleryTile, ItemListRow } from '../components/ListRows';
import { UpcomingServiceCard } from '../components/UpcomingServiceCard';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { RoomPhotosSection } from '../components/RoomPhotosSection';
import { ReuseExistingPhotosProvider } from '../components/ReuseExistingPhotosProvider';
import { RoomNavigationDots } from '../components/RoomNavigationDots';
import { RenameModal } from '../components/RenameModal';
import {
  ToolbarNewSearchControls,
  usePropertyGearNav,
} from '../components/PropertyGearNavItems';
import { sharedStyles, colors } from '../theme';
import {
  deleteRoomCascade,
  firstPhotoUriForItem,
  itemById,
  itemsForRoom,
  photosForEvent,
  propertyById,
  roomById,
  roomsForProperty,
  serviceHistoryEventsForItem,
} from '../storage';
import { itemDisplayLabel, itemListRowLabels } from '../itemCatalog';
import { itemListSummaryFields } from '../itemListSummaryFields';
import {
  isItemOverdue,
  nextDueLabelForItem,
} from '../itemMaintenance';
import {
  filterUpcomingByHorizon,
  upcomingHorizonLabel,
  upcomingServiceEventsForRoom,
  UPCOMING_HORIZON_OPTIONS,
  type UpcomingHorizon,
} from '../eventRecurrence';
import { CollapsibleSectionTitle } from '../components/CollapsibleSectionTitle';
import { formatCurrency, formatDisplayDate } from '../utils';
import {
  getPropertyUpcomingHorizon,
  loadPropertyUpcomingHorizon,
  setPropertyUpcomingHorizon,
} from '../upcomingHorizonPrefs';
import {
  getRoomItemViewMode,
  loadRoomItemViewMode,
  setRoomItemViewMode,
  type RoomItemViewMode,
} from '../roomItemViewPrefs';
import { photosForRoom, addRoomPhotos } from '../roomPhotos';
import { deletePhotoFile } from '../photoStorage';
import { deleteDocumentFile } from '../documentStorage';
import { pickFileAttachment } from '../fileAttachment';
import { addRoomExtraDocuments } from '../roomExtraDocuments';
import { isPinned, togglePin } from '../pins';
import { PinGearMenuItem } from '../components/PinGearMenuItem';
import { authenticateForRoom, markRoomUnlocked } from '../roomAuth';
import { SectionHelpTip } from '../components/SectionHelpTip';
import {
  getSectionHelpVisible,
  loadSectionHelpVisible,
  setSectionHelpVisible,
} from '../sectionHelpPrefs';
import {
  getRoomSectionExpand,
  loadRoomSectionExpand,
  setRoomSectionExpand,
} from '../roomSectionExpandPrefs';

export function RoomDetailScreen(props: {
  state: AppState;
  roomId: string;
  onBack: () => void;
  onNavigateRoom: (roomId: string) => void;
  onGoToProperty: () => void;
  onOpenServices: () => void;
  onSearchServiceHistory: () => void;
  onSearchActivity?: () => void;
  onOpenAssets: () => void;
  onSearchAssets: () => void;
  onSearchInteractions: () => void;
  onAddInteraction: () => void;
  onAddServiceEvent: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenItem: (itemId: string, startEditingSection?: 'appliance' | 'purchase' | 'repair') => void;
  onEditEvent: (itemId: string, eventId: string) => void;
  onLogUpcomingService: (itemId: string, completeFromEventId: string) => void;
  onSave: (state: AppState) => void;
}) {
  const {
    state,
    roomId,
    onBack,
    onNavigateRoom,
    onGoToProperty,
    onSearchServiceHistory,
    onSearchActivity,
    onSearchAssets,
    onSearchInteractions,
    onAddInteraction,
    onAddServiceEvent,
    onOpenProject,
    onOpenItem,
    onEditEvent,
    onLogUpcomingService,
    onSave,
  } = props;
  const insets = useSafeAreaInsets();
  const items = itemsForRoom(state, roomId);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReorderArrows, setShowReorderArrows] = useState(false);
  const [upcomingHorizon, setUpcomingHorizon] = useState<UpcomingHorizon>(
    getPropertyUpcomingHorizon
  );
  const [itemViewMode, setItemViewMode] = useState<RoomItemViewMode>(getRoomItemViewMode);
  const [helpVisible, setHelpVisible] = useState(getSectionHelpVisible);
  const [photosExpanded, setPhotosExpanded] = useState(() => getRoomSectionExpand().photos);
  const [remindersExpanded, setRemindersExpanded] = useState(
    () => getRoomSectionExpand().reminders
  );
  const [assetsExpanded, setAssetsExpanded] = useState(() => getRoomSectionExpand().assets);
  const textScaleControls = useTextScaleControls();

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    setTimeout(action, 50);
  }

  const room = roomById(state, roomId);
  const propertyId = room?.propertyId ?? '';

  const {
    newItems: propertyNewItems,
    searchItems: propertySearchItems,
    createModals: propertyGearCreateModals,
    startAddAsset,
  } = usePropertyGearNav({
    state,
    propertyId,
    roomId,
    runMenuAction,
    actions: {
      onAddInteraction,
      onAddServiceEvent,
      onSearchAssets,
      onSearchInteractions,
      onSearchServiceHistory,
      onSearchActivity,
      onOpenProject,
      onOpenItem,
      onSave,
    },
  });

  useEffect(() => {
    let cancelled = false;
    void loadPropertyUpcomingHorizon().then((horizon) => {
      if (!cancelled) setUpcomingHorizon(horizon);
    });
    void loadRoomItemViewMode().then((mode) => {
      if (!cancelled) setItemViewMode(mode);
    });
    void loadSectionHelpVisible().then((visible) => {
      if (!cancelled) setHelpVisible(visible);
    });
    void loadRoomSectionExpand().then((expand) => {
      if (cancelled) return;
      setPhotosExpanded(expand.photos);
      setRemindersExpanded(expand.reminders);
      setAssetsExpanded(expand.assets);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
  const subtitleParts = [property?.name].filter(Boolean);
  const upcomingEvents = filterUpcomingByHorizon(
    upcomingServiceEventsForRoom(state, roomId),
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
        { text: 'Done', style: 'cancel' as const },
      ]
    );
  }

  function toggleHelp() {
    const next = !helpVisible;
    setHelpVisible(next);
    void setSectionHelpVisible(next);
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

  function startLoadFile() {
    void pickFileAttachment()
      .then((picked) => {
        setMenuOpen(false);
        if (!picked) return;
        if (picked.kind === 'image') {
          void addRoomPhotos(state, roomId, [picked.uri]).then(onSave);
          return;
        }
        void addRoomExtraDocuments(state, roomId, [picked]).then(onSave);
      })
      .catch(() => {
        setMenuOpen(false);
      });
  }

  function confirmDeleteRoom() {
    const roomName = rm.name;
    Alert.alert(
      'Delete room?',
      `Remove "${roomName}" and all assets inside?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const p of photosForRoom(state, roomId)) {
              await deletePhotoFile(p.localUri);
            }
            for (const documentId of rm.documentIds ?? []) {
              const doc = state.documents.find((d) => d.id === documentId);
              if (doc) await deleteDocumentFile(doc.localUri);
            }
            for (const attachment of Object.values(rm.slotAttachments ?? {})) {
              if (attachment?.kind !== 'document') continue;
              const doc = state.documents.find((d) => d.id === attachment.id);
              if (doc) await deleteDocumentFile(doc.localUri);
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
      <View style={sharedStyles.propertySectionPanel}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 8,
          }}
        >
          <CollapsibleSectionTitle
            title="Reminders"
            expanded={remindersExpanded}
            count={upcomingEvents.length}
            onExpand={() => {
              const next = !remindersExpanded;
              setRemindersExpanded(next);
              void setRoomSectionExpand({ reminders: next });
            }}
            containerStyle={{ flex: 1 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Pressable
              onPress={openUpcomingHorizonPicker}
              accessibilityRole="button"
              accessibilityLabel={`Upcoming range: ${upcomingHorizonLabel(upcomingHorizon)}`}
              accessibilityHint="Opens a list of time ranges for upcoming reminders."
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
            {upcomingEvents.length > 0 ? (
              <Pressable
                onPress={() => {
                  const next = !remindersExpanded;
                  setRemindersExpanded(next);
                  void setRoomSectionExpand({ reminders: next });
                }}
                accessibilityRole="button"
                accessibilityLabel={remindersExpanded ? 'Hide reminders' : 'Show reminders'}
                accessibilityState={{ expanded: remindersExpanded }}
                hitSlop={6}
                style={({ pressed }) => ({
                  padding: 4,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <MaterialIcons
                  name={remindersExpanded ? 'expand-less' : 'expand-more'}
                  size={24}
                  color={colors.primary}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
        {helpVisible ? (
          <SectionHelpTip>
            Review upcoming reminders for every asset in this room. Change the time range to focus on
            what needs attention next.
          </SectionHelpTip>
        ) : null}
        {upcomingEvents.length === 0 ? (
          <Text style={sharedStyles.cardMeta}>No upcoming reminders.</Text>
        ) : remindersExpanded ? (
          <View
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.text,
            }}
          >
            {upcomingEvents.map((e) => {
              const item = itemById(state, e.itemId);
              const eventPhotos = photosForEvent(state, e.id);
              return (
                <UpcomingServiceCard
                  key={e.id}
                  event={e}
                  leadingLabel={item ? itemDisplayLabel(item) : undefined}
                  thumbnailUri={eventPhotos[0]?.localUri}
                  onPressDetails={() => onEditEvent(e.itemId, e.id)}
                  onLogService={() => onLogUpcomingService(e.itemId, e.id)}
                  cardBackgroundColor={colors.helpBg}
                  dividerColor={colors.text}
                />
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={sharedStyles.propertySectionPanel}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 4 }}>
            <CollapsibleSectionTitle
              title="Assets"
              expanded={assetsExpanded}
              count={items.length}
              onExpand={() => {
                const next = !assetsExpanded;
                setAssetsExpanded(next);
                void setRoomSectionExpand({ assets: next });
              }}
            />
            <Pressable
              onPress={startAddAsset}
              accessibilityRole="button"
              accessibilityLabel="Add asset"
              hitSlop={6}
              style={({ pressed }) => ({
                padding: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons name="add" size={24} color={colors.primary} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Pressable
              onPress={() => {
                setItemViewMode('gallery');
                void setRoomItemViewMode('gallery');
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: itemViewMode === 'gallery' }}
              accessibilityLabel="Compact gallery view"
              hitSlop={6}
              style={({ pressed }) => ({
                padding: 6,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons
                name="grid-view"
                size={22}
                color={itemViewMode === 'gallery' ? colors.primary : colors.textMuted}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                setItemViewMode('list');
                void setRoomItemViewMode('list');
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: itemViewMode === 'list' }}
              accessibilityLabel="Detailed list view"
              hitSlop={6}
              style={({ pressed }) => ({
                padding: 6,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons
                name="view-list"
                size={22}
                color={itemViewMode === 'list' ? colors.primary : colors.textMuted}
              />
            </Pressable>
            {items.length > 0 ? (
              <Pressable
                onPress={() => {
                  const next = !assetsExpanded;
                  setAssetsExpanded(next);
                  void setRoomSectionExpand({ assets: next });
                }}
                accessibilityRole="button"
                accessibilityLabel={assetsExpanded ? 'Hide assets' : 'Show assets'}
                accessibilityState={{ expanded: assetsExpanded }}
                hitSlop={6}
                style={({ pressed }) => ({
                  padding: 4,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <MaterialIcons
                  name={assetsExpanded ? 'expand-less' : 'expand-more'}
                  size={24}
                  color={colors.primary}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
        {helpVisible ? (
          <SectionHelpTip>
            Add equipment, appliances, vehicles, utilities, and other assets you want to document,
            maintain, and track in this room.
          </SectionHelpTip>
        ) : null}
        {items.length === 0 ? (
          <Text style={sharedStyles.emptyText}>
            Add assets like water heater, heating, or electrical panel.
          </Text>
        ) : !assetsExpanded ? null : itemViewMode === 'gallery' ? (
          <View style={sharedStyles.galleryRow}>
            {items.map((item) => {
              const { label, nameLabel } = itemListRowLabels(item);
              return (
                <ItemGalleryTile
                  key={item.id}
                  label={label}
                  nameLabel={nameLabel}
                  thumbnailUri={firstPhotoUriForItem(state, item)}
                  nextDueLabel={nextDueLabelForItem(state, item.id)}
                  overdue={isItemOverdue(state, item.id)}
                  onPress={() => onOpenItem(item.id)}
                />
              );
            })}
          </View>
        ) : (
          <>
            <View
              style={{
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.text,
              }}
            >
              {items.map((item) => {
                const lastEvent = serviceHistoryEventsForItem(state, item.id)[0];
                const { label, nameLabel } = itemListRowLabels(item);
                return (
                  <ItemListRow
                    key={item.id}
                    label={label}
                    nameLabel={nameLabel}
                    thumbnailUri={firstPhotoUriForItem(state, item)}
                    detailFields={
                      item.itemTypeId === 'automobile' ? undefined : itemListSummaryFields(item)
                    }
                    lastServiceDate={
                      lastEvent ? formatDisplayDate(lastEvent.occurredAtISO) : undefined
                    }
                    lastServiceTitle={lastEvent?.title}
                    lastServiceNotes={lastEvent?.notes}
                    lastServiceCost={
                      lastEvent?.cost != null ? formatCurrency(lastEvent.cost) : undefined
                    }
                    nextDueLabel={nextDueLabelForItem(state, item.id)}
                    overdue={isItemOverdue(state, item.id)}
                    onPress={() => onOpenItem(item.id)}
                    cardBackgroundColor={colors.helpBg}
                    dividerColor={colors.text}
                  />
                );
              })}
            </View>
            <Text
              style={[
                sharedStyles.cardMeta,
                {
                  color: colors.lastService,
                  textAlign: 'right',
                  marginTop: 4,
                  marginBottom: 4,
                },
              ]}
            >
              Last service
            </Text>
          </>
        )}
      </View>
    </>
  );

  return (
    <ReuseExistingPhotosProvider state={state} propertyId={propertyId}>
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <ScreenBackHeader onPress={onBack}>
        <View
          style={{
            marginLeft: 'auto',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Pressable
            onPress={toggleHelp}
            accessibilityRole="button"
            accessibilityLabel={helpVisible ? 'Hide section help' : 'Show section help'}
            accessibilityState={{ selected: helpVisible }}
            accessibilityHint="Toggles short explanations under each section."
            hitSlop={8}
            style={({ pressed }) => [
              {
                width: 42,
                height: 36,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                borderRadius: 4,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: helpVisible ? colors.helpBg : 'transparent',
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <MaterialIcons
              name={helpVisible ? 'help' : 'help-outline'}
              size={22}
              color={helpVisible ? colors.helpText : colors.primary}
            />
          </Pressable>
          <Pressable
            onPress={onGoToProperty}
            accessibilityRole="button"
            accessibilityLabel="Go to property"
            accessibilityHint="Opens the property page for this room."
            hitSlop={8}
            style={({ pressed }) => [
              {
                width: 42,
                height: 36,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                borderRadius: 4,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <MaterialIcons name="home" size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => void toggleRequiresAuth(!(rm.requiresAuth === true))}
            accessibilityRole="button"
            accessibilityLabel={
              rm.requiresAuth === true
                ? 'Remove authentication requirement'
                : 'Require authentication'
            }
            accessibilityHint={
              rm.requiresAuth === true
                ? 'Turns off Face ID or passcode for this room.'
                : 'Requires Face ID or device passcode to open this room.'
            }
            accessibilityState={{ checked: rm.requiresAuth === true }}
            hitSlop={8}
            style={({ pressed }) => [
              {
                width: 42,
                height: 36,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                borderRadius: 4,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <MaterialIcons
              name={rm.requiresAuth === true ? 'lock' : 'lock-open'}
              size={22}
              color={colors.primary}
            />
          </Pressable>
          <ToolbarNewSearchControls
            title={rm.name}
            newItems={propertyNewItems}
            searchItems={propertySearchItems}
          />
          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Room options"
            accessibilityHint="Opens actions like text size and delete."
            hitSlop={6}
            style={({ pressed }) => ({
              padding: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons name="settings" size={24} color={colors.primary} />
          </Pressable>
        </View>
      </ScreenBackHeader>
      {helpVisible ? (
        <Text
          style={{
            marginHorizontal: 20,
            marginBottom: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: colors.helpBg,
            textAlign: 'right',
            fontSize: 12,
            lineHeight: 16,
            color: colors.helpText,
          }}
        >
          Help | Home | Lock | New
          {propertySearchItems.length > 0 ? ' | Search' : ''} | Utilities
        </Text>
      ) : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[sharedStyles.content, { paddingTop: 0 }]}
      >
        <RoomPhotosSection
          state={state}
          roomId={roomId}
          room={rm}
          onSave={onSave}
          showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          childrenGesture={roomSwipeEnabled ? roomSwipeGestureForTitle : undefined}
          expanded={photosExpanded}
          onToggleExpanded={() => {
            const next = !photosExpanded;
            setPhotosExpanded(next);
            void setRoomSectionExpand({ photos: next });
          }}
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

        {helpVisible ? (
          <View style={{ marginTop: 8 }}>
            <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 8 }]}>
              Photos
            </Text>
            <SectionHelpTip>
              Add pictures that document this room and its condition. Long press a small photo to
              change its label or notes, or to delete it.
            </SectionHelpTip>
          </View>
        ) : null}

        {roomSwipeEnabled ? (
          <GestureDetector gesture={roomSwipeGestureForItems}>
            <View>{itemsSection}</View>
          </GestureDetector>
        ) : (
          itemsSection
        )}
      </ScrollView>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}
          onPress={() => setMenuOpen(false)}
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
                {rm.name}
              </Text>
            </View>
            <PinGearMenuItem
              pinned={isPinned(state, 'room', rm.id)}
              onToggle={() => {
                setMenuOpen(false);
                onSave(togglePin(state, 'room', rm.id));
              }}
            />
            <Pressable
              onPress={startLoadFile}
              accessibilityRole="button"
              accessibilityLabel="Load file"
              accessibilityHint="Attaches a document or photo to this room."
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                Load file
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                runMenuAction(() => setShowReorderArrows((prev) => !prev))
              }
              accessibilityRole="button"
              accessibilityLabel={
                showReorderArrows ? 'Reorder Photo: On' : 'Reorder Photo: Off'
              }
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                {showReorderArrows ? 'Reorder Photo: On' : 'Reorder Photo: Off'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (!textScaleControls.canMakeLarger) return;
                textScaleControls.makeLarger();
              }}
              disabled={!textScaleControls.canMakeLarger}
              accessibilityRole="button"
              accessibilityLabel="Text larger"
              accessibilityState={{ disabled: !textScaleControls.canMakeLarger }}
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: !textScaleControls.canMakeLarger ? 0.35 : pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                Text larger
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!textScaleControls.canMakeSmaller) return;
                textScaleControls.makeSmaller();
              }}
              disabled={!textScaleControls.canMakeSmaller}
              accessibilityRole="button"
              accessibilityLabel="Text smaller"
              accessibilityState={{ disabled: !textScaleControls.canMakeSmaller }}
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: !textScaleControls.canMakeSmaller ? 0.35 : pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                Text smaller
              </Text>
            </Pressable>
            <Pressable
              onPress={() => runMenuAction(confirmDeleteRoom)}
              accessibilityRole="button"
              accessibilityLabel="Delete room"
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.danger }}>
                Delete room
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMenuOpen(false)}
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

      {propertyGearCreateModals}

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
    </ReuseExistingPhotosProvider>
  );
}
