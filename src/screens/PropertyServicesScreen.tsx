import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState as RnAppState,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type AppStateStatus,
} from 'react-native';
import type { ScrollView as RNScrollView, TextInput as RNTextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, TextInput, useTextScaleControls } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppState, InventoryItem, ItemEvent } from '../types';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { ActivityBucketBanner } from '../components/ActivityBucketBanner';
import { ITEM_LIST_THUMB_SIZE, PropertyServiceListRow } from '../components/ListRows';
import { ServicesExportSheet } from '../components/ServicesExportSheet';
import {
  ToolbarNewSearchControls,
  usePropertyGearNav,
  type PropertyGearNavItem,
} from '../components/PropertyGearNavItems';
import { useKeyboardDoneAccessory } from '../components/KeyboardDoneAccessory';
import { sharedStyles, colors } from '../theme';
import { formatDisplayDate } from '../utils';
import { itemDisplayLabel } from '../itemCatalog';
import { isAfterToday, serviceListDateISO, upcomingDueAtISO } from '../eventRecurrence';
import {
  allItemEvents,
  eventsForProperty,
  eventsForRoom,
  firstPhotoUriForItem,
  itemById,
  photosForEvent,
  propertyById,
  roomById,
  roomsForProperty,
} from '../storage';
import {
  authenticateForRoom,
  isRoomUnlocked,
  markRoomUnlocked,
} from '../roomAuth';
import {
  buildServicesExportSnapshot,
  type ServicesExportSnapshot,
} from '../servicesExportContent';
import { DEFAULT_SHARE_FORMAT, type ShareFormat } from '../shareFormat';
import { shareViewAsPng } from '../shareViewImage';
import { shareHtmlAsPdf } from '../shareViewPdf';
import { buildExportPdfHtml, servicesSnapshotToPdfDoc } from '../exportPdfHtml';
import { ShareFormatModal } from '../components/ShareFormatModal';
import {
  activityBucketCounts,
  foldActivityBucketGroups,
  type ActivityTimeBucket,
} from '../activityTimeBuckets';
import {
  activityBucketExpandKey,
  getActivityBucketExpand,
  isActivityBucketExpanded,
  setActivityBucketExpand,
} from '../activityBucketExpandPrefs';

type ServiceStatusFilter = 'open' | 'done';

function itemNameKey(item: InventoryItem): string {
  return itemDisplayLabel(item).trim().toLowerCase();
}

function isOpenService(event: ItemEvent): boolean {
  return upcomingDueAtISO(event) != null;
}

function itemVisibleWithRoomAuth(
  state: AppState,
  item: { roomId: string }
): boolean {
  const itemRoom = roomById(state, item.roomId);
  if (!itemRoom || itemRoom.requiresAuth !== true) return true;
  return isRoomUnlocked(itemRoom.id);
}

export function PropertyServicesScreen(props: {
  state: AppState;
  propertyId?: string;
  roomId?: string;
  /** When opening from an item, pre-select that item in the filter. */
  initialItemId?: string;
  /** When opening from property with a room deep-link, pre-select that room. */
  initialRoomId?: string;
  /** When true, show Search even if under the usual threshold (does not focus the field). */
  focusSearch?: boolean;
  onBack: () => void;
  /** Omit on the all-properties list (Home); home icon is hidden. */
  onGoToProperty?: () => void;
  onOpenEvent: (itemId: string, eventId: string) => void;
  onOpenItem: (itemId: string, startEditingSection?: 'appliance' | 'purchase' | 'repair') => void;
  onAddInteraction?: () => void;
  onAddServiceEvent?: () => void;
  onSearchAssets?: () => void;
  onSearchInteractions?: () => void;
  onSearchActivity?: () => void;
  onOpenProject?: (projectId: string) => void;
  onSave?: (state: AppState) => void;
}) {
  const {
    state,
    propertyId,
    roomId,
    initialItemId,
    initialRoomId,
    focusSearch = false,
    onBack,
    onGoToProperty,
    onOpenEvent,
    onOpenItem,
    onAddInteraction,
    onAddServiceEvent,
    onSearchAssets,
    onSearchInteractions,
    onSearchActivity,
    onOpenProject,
    onSave,
  } = props;
  const insets = useSafeAreaInsets();
  const textScaleControls = useTextScaleControls();
  const keyboardDone = useKeyboardDoneAccessory({
    id: 'propertyServicesDone',
    variant: 'overlay',
  });
  const exportRef = useRef<View>(null);
  const scrollRef = useRef<RNScrollView>(null);
  const scrollYRef = useRef(0);
  const searchInputRef = useRef<RNTextInput>(null);
  const pendingFocusRef = useRef<{ y: number; height: number } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isAllScope = !propertyId && !roomId;
  const isRoomScope = Boolean(roomId);

  const [selectedItemNameKey, setSelectedItemNameKey] = useState<string | null>(() => {
    if (!initialItemId) return null;
    const initial = itemById(state, initialItemId);
    return initial ? itemNameKey(initial) : null;
  });
  const [itemMenuOpen, setItemMenuOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [propertyMenuOpen, setPropertyMenuOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    () => (!roomId ? initialRoomId ?? null : null)
  );
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ServiceStatusFilter | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [forceShowSearch, setForceShowSearch] = useState(focusSearch);
  const [exporting, setExporting] = useState(false);
  const [exportSnapshot, setExportSnapshot] = useState<ServicesExportSnapshot | null>(null);
  const [shareOptionsOpen, setShareOptionsOpen] = useState(false);
  const [shareFormat, setShareFormat] = useState<ShareFormat>(DEFAULT_SHARE_FORMAT);
  /** Bumps when room unlock session may have changed (resume / unlock). */
  const [roomAuthEpoch, setRoomAuthEpoch] = useState(0);
  const [roomAuthPending, setRoomAuthPending] = useState(false);

  const servicesExpandKey = activityBucketExpandKey(
    'services',
    propertyId ? `property:${propertyId}` : roomId ? `room:${roomId}` : 'all'
  );
  const savedBucketExpand = getActivityBucketExpand(servicesExpandKey);
  const [activityFutureExpanded, setActivityFutureExpanded] = useState(
    () => savedBucketExpand.activityFuture
  );
  const [activityTodayExpanded, setActivityTodayExpanded] = useState(
    () => savedBucketExpand.activityToday
  );
  const [activityHistoryExpanded, setActivityHistoryExpanded] = useState(
    () => savedBucketExpand.activityHistory
  );
  const [activityUndatedExpanded, setActivityUndatedExpanded] = useState(
    () => savedBucketExpand.activityUndated
  );

  useEffect(() => {
    setActivityBucketExpand(servicesExpandKey, {
      activityFuture: activityFutureExpanded,
      activityToday: activityTodayExpanded,
      activityHistory: activityHistoryExpanded,
      activityUndated: activityUndatedExpanded,
    });
  }, [
    servicesExpandKey,
    activityFutureExpanded,
    activityTodayExpanded,
    activityHistoryExpanded,
    activityUndatedExpanded,
  ]);

  useEffect(() => {
    const prefs = getActivityBucketExpand(servicesExpandKey);
    setActivityFutureExpanded(prefs.activityFuture);
    setActivityTodayExpanded(prefs.activityToday);
    setActivityHistoryExpanded(prefs.activityHistory);
    setActivityUndatedExpanded(prefs.activityUndated);
  }, [servicesExpandKey]);

  const property = propertyId ? propertyById(state, propertyId) : undefined;
  const room = roomId ? roomById(state, roomId) : undefined;
  const propertyForScope =
    property ?? (room ? propertyById(state, room.propertyId) : undefined);
  const gearPropertyId = propertyForScope?.id ?? '';
  const showPropertyGearNav = Boolean(gearPropertyId);
  const roomRequiresAuth = room?.requiresAuth === true;
  const roomName = room?.name;

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    setTimeout(action, 50);
  }

  const noop = () => {};
  const {
    newItems: propertyNewItems,
    searchItems: propertySearchItems,
    createModals: propertyGearCreateModals,
  } = usePropertyGearNav({
    state,
    propertyId: gearPropertyId,
    roomId,
    runMenuAction,
    actions: {
      onAddInteraction: onAddInteraction ?? noop,
      onAddServiceEvent: onAddServiceEvent ?? noop,
      onSearchAssets: onSearchAssets ?? noop,
      onSearchInteractions: onSearchInteractions ?? noop,
      onSearchServiceHistory: () => {
        setForceShowSearch(true);
      },
      onSearchActivity,
      onOpenProject: onOpenProject ?? noop,
      onOpenItem,
      onSave: onSave ?? noop,
    },
  });

  const servicesFallbackSearchItems: PropertyGearNavItem[] = [
    {
      key: 'searchServices',
      prefix: 'Search',
      keyword: 'Service Events',
      icon: 'handyman',
      helpText: 'on Assets',
      onPress: () => runMenuAction(showSearchField),
    },
    ...(onSearchActivity
      ? [
          {
            key: 'searchActivity',
            prefix: 'Search' as const,
            keyword: 'All',
            icon: 'history' as const,
            onPress: () => runMenuAction(onSearchActivity),
          },
        ]
      : []),
  ];
  const toolbarNewItems = showPropertyGearNav ? propertyNewItems : [];
  const toolbarSearchItems = showPropertyGearNav
    ? propertySearchItems
    : servicesFallbackSearchItems;

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'active' || next === 'background' || next === 'inactive') {
        setRoomAuthEpoch((n) => n + 1);
      }
    };
    const sub = RnAppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  // roomServices: same credential gate as entering the room (openRoom in App).
  useEffect(() => {
    if (!roomId || !roomRequiresAuth || !roomName) {
      setRoomAuthPending(false);
      return;
    }
    if (isRoomUnlocked(roomId)) {
      setRoomAuthPending(false);
      return;
    }

    // Don't prompt Face ID while backgrounding; retry when active.
    if (RnAppState.currentState !== 'active') {
      setRoomAuthPending(true);
      return;
    }

    let cancelled = false;
    setRoomAuthPending(true);
    void (async () => {
      const ok = await authenticateForRoom(roomName);
      if (cancelled) return;
      if (ok) {
        markRoomUnlocked(roomId);
        setRoomAuthEpoch((n) => n + 1);
        setRoomAuthPending(false);
      } else {
        setRoomAuthPending(false);
        onBack();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId, roomRequiresAuth, roomName, roomAuthEpoch, onBack]);

  const events = useMemo(() => {
    const base = roomId
      ? eventsForRoom(state, roomId)
      : propertyId
        ? eventsForProperty(state, propertyId)
        : allItemEvents(state);
    return base.filter((event) => {
      const item = itemById(state, event.itemId);
      return item ? itemVisibleWithRoomAuth(state, item) : false;
    });
  }, [state, propertyId, roomId, roomAuthEpoch]);

  const propertiesInList = useMemo(() => {
    if (!isAllScope) return [];
    const byId = new Map<string, NonNullable<ReturnType<typeof propertyById>>>();
    for (const event of events) {
      const item = itemById(state, event.itemId);
      if (!item) continue;
      const eventRoom = roomById(state, item.roomId);
      if (!eventRoom) continue;
      const prop = propertyById(state, eventRoom.propertyId);
      if (prop) byId.set(prop.id, prop);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [events, isAllScope, state]);

  const showPropertyPicker = propertiesInList.length > 1;

  const propertyScopedEvents = useMemo(() => {
    if (!isAllScope || !selectedPropertyId) return events;
    return events.filter((event) => {
      const item = itemById(state, event.itemId);
      if (!item) return false;
      const eventRoom = roomById(state, item.roomId);
      return eventRoom?.propertyId === selectedPropertyId;
    });
  }, [events, isAllScope, selectedPropertyId, state]);

  const roomsInList = useMemo(() => {
    if (roomId) return [];
    const propertyScopeId = propertyId ?? (isAllScope ? selectedPropertyId : undefined);
    if (!propertyScopeId) return [];
    const rooms = roomsForProperty(state, propertyScopeId);
    const roomIdsWithEvents = new Set<string>();
    for (const event of propertyScopedEvents) {
      const item = itemById(state, event.itemId);
      if (item) roomIdsWithEvents.add(item.roomId);
    }
    return rooms
      .filter((r) => roomIdsWithEvents.has(r.id))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [isAllScope, propertyId, propertyScopedEvents, roomId, selectedPropertyId, state]);

  const showRoomPicker = roomsInList.length > 1;

  const roomScopedEvents = useMemo(() => {
    if (roomId) return propertyScopedEvents;
    if (!selectedRoomId) return propertyScopedEvents;
    return propertyScopedEvents.filter((event) => {
      const item = itemById(state, event.itemId);
      return item?.roomId === selectedRoomId;
    });
  }, [propertyScopedEvents, roomId, selectedRoomId, state]);

  const itemsInList = useMemo(() => {
    /** Distinct asset display names in the current room scope (same name may span rooms). */
    const byName = new Map<
      string,
      { nameKey: string; displayName: string; representative: InventoryItem }
    >();
    for (const event of roomScopedEvents) {
      const item = itemById(state, event.itemId);
      if (!item) continue;
      const nameKey = itemNameKey(item);
      if (!nameKey || byName.has(nameKey)) continue;
      byName.set(nameKey, {
        nameKey,
        displayName: itemDisplayLabel(item),
        representative: item,
      });
    }
    return [...byName.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [roomScopedEvents, state]);

  const showItemPicker = itemsInList.length > 1;

  const itemScopedEvents = useMemo(
    () =>
      selectedItemNameKey
        ? roomScopedEvents.filter((event) => {
            const item = itemById(state, event.itemId);
            return Boolean(item && itemNameKey(item) === selectedItemNameKey);
          })
        : roomScopedEvents,
    [roomScopedEvents, selectedItemNameKey, state]
  );

  const statusesInList = useMemo(() => {
    const present = new Set<ServiceStatusFilter>();
    for (const event of itemScopedEvents) {
      present.add(isOpenService(event) ? 'open' : 'done');
    }
    const order: ServiceStatusFilter[] = ['open', 'done'];
    return order.filter((status) => present.has(status));
  }, [itemScopedEvents]);

  const showStatusPicker = statusesInList.length > 1;
  const showSearch = roomScopedEvents.length >= 3 || forceShowSearch;

  useEffect(() => {
    if (
      selectedItemNameKey &&
      !itemsInList.some((entry) => entry.nameKey === selectedItemNameKey)
    ) {
      setSelectedItemNameKey(null);
    }
  }, [itemsInList, selectedItemNameKey]);

  useEffect(() => {
    if (
      selectedPropertyId &&
      !propertiesInList.some((entry) => entry.id === selectedPropertyId)
    ) {
      setSelectedPropertyId(null);
    }
  }, [propertiesInList, selectedPropertyId]);

  useEffect(() => {
    if (selectedRoomId && !roomsInList.some((entry) => entry.id === selectedRoomId)) {
      setSelectedRoomId(null);
    }
  }, [roomsInList, selectedRoomId]);

  useEffect(() => {
    if (selectedStatus && !statusesInList.includes(selectedStatus)) {
      setSelectedStatus(null);
    }
  }, [selectedStatus, statusesInList]);

  const effectiveItemNameKey =
    selectedItemNameKey &&
    itemsInList.some((entry) => entry.nameKey === selectedItemNameKey)
      ? selectedItemNameKey
      : itemsInList.length === 1
        ? itemsInList[0]!.nameKey
        : null;

  const singleItemEntry =
    effectiveItemNameKey != null
      ? itemsInList.find((entry) => entry.nameKey === effectiveItemNameKey)
      : undefined;
  const singleItem = singleItemEntry?.representative;
  const singleItemMode =
    Boolean(singleItemEntry) &&
    (itemsInList.length === 1 || selectedItemNameKey != null);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return itemScopedEvents.filter((event) => {
      if (selectedStatus === 'open' && !isOpenService(event)) return false;
      if (selectedStatus === 'done' && isOpenService(event)) return false;
      if (!query) return true;
      const item = itemById(state, event.itemId);
      if (!item) return false;
      const eventRoom = roomById(state, item.roomId);
      const eventProperty = eventRoom
        ? propertyById(state, eventRoom.propertyId)
        : undefined;
      const dateLabel = formatDisplayDate(serviceListDateISO(event));
      const haystack = [
        event.title,
        itemDisplayLabel(item),
        eventRoom?.name,
        eventProperty?.name,
        event.notes,
        event.serviceCompany,
        dateLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [itemScopedEvents, searchQuery, selectedStatus, state]);

  const serviceBucketGroups = useMemo(
    () =>
      foldActivityBucketGroups(filteredEvents, (event) => serviceListDateISO(event)),
    [filteredEvents]
  );
  const serviceBucketCounts = activityBucketCounts(serviceBucketGroups);
  const expandPrefs = {
    activityFuture: activityFutureExpanded,
    activityToday: activityTodayExpanded,
    activityHistory: activityHistoryExpanded,
    activityUndated: activityUndatedExpanded,
  };

  function toggleServiceBucket(bucket: ActivityTimeBucket) {
    if (bucket === 'future') {
      setActivityFutureExpanded((v) => !v);
      return;
    }
    if (bucket === 'today') {
      setActivityTodayExpanded((v) => !v);
      return;
    }
    if (bucket === 'undated') {
      setActivityUndatedExpanded((v) => !v);
      return;
    }
    setActivityHistoryExpanded((v) => !v);
  }

  const subtitle =
    room?.name ?? property?.name ?? (isAllScope ? 'All properties' : undefined);
  const scopeMissing = roomId ? !room : propertyId ? !property : false;

  const selectedPropertyLabel =
    selectedPropertyId == null
      ? 'All properties'
      : (propertiesInList.find((entry) => entry.id === selectedPropertyId)?.name ??
        'All properties');

  const selectedRoomLabel =
    selectedRoomId == null
      ? 'All rooms'
      : (roomsInList.find((entry) => entry.id === selectedRoomId)?.name ?? 'All rooms');

  const selectedItemLabel =
    selectedItemNameKey == null
      ? 'All assets'
      : (itemsInList.find((entry) => entry.nameKey === selectedItemNameKey)?.displayName ??
        'All assets');

  const selectedStatusLabel =
    selectedStatus == null ? 'All statuses' : selectedStatus === 'open' ? 'Open' : 'Done';

  const openShareOptions = useCallback(() => {
    setShareFormat(DEFAULT_SHARE_FORMAT);
    setShareOptionsOpen(true);
  }, []);

  const runServicesExport = useCallback(
    async (format: ShareFormat = DEFAULT_SHARE_FORMAT) => {
      if (!subtitle) {
        Alert.alert('Share failed', 'Could not build services summary.');
        return;
      }
      const filterLines = [
        selectedPropertyId != null ? `Property: ${selectedPropertyLabel}` : undefined,
        selectedRoomId != null ? `Room: ${selectedRoomLabel}` : undefined,
        selectedItemNameKey != null ? `Asset: ${selectedItemLabel}` : undefined,
        selectedStatus != null ? `Status: ${selectedStatusLabel}` : undefined,
        searchQuery.trim() ? `Search: ${searchQuery.trim()}` : undefined,
      ].filter((line): line is string => Boolean(line));

      const snapshot = buildServicesExportSnapshot({
        state,
        events: filteredEvents,
        scopeTitle: subtitle,
        scopeMetaLines:
          room && propertyForScope && room.name !== propertyForScope.name
            ? [propertyForScope.name]
            : [],
        filterLines,
      });
      setShareOptionsOpen(false);
      if (format === 'pdf') {
        setExporting(true);
        try {
          const html = await buildExportPdfHtml(servicesSnapshotToPdfDoc(snapshot));
          await shareHtmlAsPdf(html, `Share ${snapshot.title}`);
        } finally {
          setExporting(false);
        }
        return;
      }
      setExportSnapshot(snapshot);
      setExporting(true);
    },
    [
      filteredEvents,
      propertyForScope,
      room,
      searchQuery,
      selectedItemNameKey,
      selectedItemLabel,
      selectedPropertyId,
      selectedPropertyLabel,
      selectedRoomId,
      selectedRoomLabel,
      selectedStatus,
      selectedStatusLabel,
      state,
      subtitle,
    ]
  );

  useEffect(() => {
    if (!exportSnapshot || !exporting) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        await shareViewAsPng(exportRef, `Share ${exportSnapshot.title}`);
        if (!cancelled) {
          setExportSnapshot(null);
          setExporting(false);
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [exportSnapshot, exporting]);

  const scrollFieldIntoView = useCallback(
    (windowY: number, height: number, kbHeight: number) => {
      const visibleBottom = Dimensions.get('window').height - kbHeight - insets.bottom - 24;
      const fieldBottom = windowY + height;
      if (fieldBottom > visibleBottom) {
        scrollRef.current?.scrollTo({
          y: scrollYRef.current + (fieldBottom - visibleBottom),
          animated: true,
        });
      }
    },
    [insets.bottom]
  );

  const handleSearchFocus = useCallback(() => {
    requestAnimationFrame(() => {
      searchInputRef.current?.measureInWindow((_x, y, _w, height) => {
        pendingFocusRef.current = { y, height };
        scrollFieldIntoView(y, height, keyboardHeight || 320);
      });
    });
  }, [keyboardHeight, scrollFieldIntoView]);

  const showSearchField = useCallback(() => {
    setForceShowSearch(true);
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const kbHeight = e.endCoordinates.height;
        setKeyboardHeight(kbHeight);
        const pending = pendingFocusRef.current;
        if (pending) {
          scrollFieldIntoView(pending.y, pending.height, kbHeight);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        pendingFocusRef.current = null;
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollFieldIntoView]);

  function closeOtherMenus(except: 'property' | 'room' | 'item' | 'status') {
    if (except !== 'property') setPropertyMenuOpen(false);
    if (except !== 'room') setRoomMenuOpen(false);
    if (except !== 'item') setItemMenuOpen(false);
    if (except !== 'status') setStatusMenuOpen(false);
  }

  if (scopeMissing || !subtitle) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>
          {roomId ? 'Room not found.' : 'Property not found.'}
        </Text>
        <Pressable onPress={onBack} style={sharedStyles.secondaryBtn}>
          <Text style={sharedStyles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (roomId && roomRequiresAuth && (roomAuthPending || !isRoomUnlocked(roomId))) {
    return (
      <View
        style={[
          sharedStyles.screen,
          {
            paddingTop: insets.top,
            padding: 16,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[sharedStyles.emptyText, { marginTop: 16 }]}>
          Unlocking {roomName ?? 'room'}…
        </Text>
        <Pressable onPress={onBack} style={[sharedStyles.secondaryBtn, { marginTop: 16 }]}>
          <Text style={sharedStyles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
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
          {onGoToProperty ? (
            <Pressable
              onPress={onGoToProperty}
              disabled={exporting}
              accessibilityRole="button"
              accessibilityLabel="Go to property"
              accessibilityHint="Opens the property page for these services."
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
                  opacity: exporting ? 0.6 : 1,
                },
                pressed && !exporting && { opacity: 0.8 },
              ]}
            >
              <MaterialIcons name="home" size={22} color={colors.primary} />
            </Pressable>
          ) : null}
          <ToolbarNewSearchControls
            title="Services"
            newItems={toolbarNewItems}
            searchItems={toolbarSearchItems}
            disabled={exporting}
          />
          <Pressable
            onPress={() => setMenuOpen(true)}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Services options"
            accessibilityHint="Opens actions like share and text size."
            hitSlop={6}
            style={({ pressed }) => ({
              padding: 4,
              opacity: exporting ? 0.5 : pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons name="settings" size={24} color={colors.primary} />
          </Pressable>
        </View>
      </ScreenBackHeader>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[
          sharedStyles.content,
          {
            paddingTop: 0,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : 40,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onScroll={(e) => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <Text style={sharedStyles.title}>Services history</Text>
        <Text style={sharedStyles.subtitle}>{subtitle}</Text>

        {showPropertyPicker ? (
          <View style={{ marginTop: 4, marginBottom: 8 }}>
            <Text style={sharedStyles.fieldLabel}>Property</Text>
            <Pressable
              onPress={() => {
                closeOtherMenus('property');
                setPropertyMenuOpen((open) => !open);
              }}
              style={({ pressed }) => [
                sharedStyles.input,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Filter by property"
              accessibilityHint="Opens a list of properties"
              accessibilityState={{ expanded: propertyMenuOpen }}
            >
              <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                {selectedPropertyLabel}
              </Text>
              <MaterialIcons
                name={propertyMenuOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
                size={24}
                color={colors.textMuted}
              />
            </Pressable>
            {propertyMenuOpen ? (
              <View
                style={{
                  marginTop: 4,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  backgroundColor: colors.card,
                  overflow: 'hidden',
                }}
              >
                <Pressable
                  onPress={() => {
                    setSelectedPropertyId(null);
                    setSelectedRoomId(null);
                    setPropertyMenuOpen(false);
                  }}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      backgroundColor: pressed ? colors.bg : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedPropertyId == null }}
                >
                  <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>All properties</Text>
                  {selectedPropertyId == null ? (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
                {propertiesInList.map((entry, index) => {
                  const selected = selectedPropertyId === entry.id;
                  return (
                    <Pressable
                      key={entry.id}
                      onPress={() => {
                        setSelectedPropertyId(entry.id);
                        setSelectedRoomId(null);
                        setPropertyMenuOpen(false);
                      }}
                      style={({ pressed }) => [
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          borderBottomWidth: index < propertiesInList.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                          backgroundColor: pressed ? colors.bg : 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                        {entry.name}
                      </Text>
                      {selected ? (
                        <MaterialIcons name="check" size={20} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        {showRoomPicker ? (
          <View style={{ marginTop: showPropertyPicker ? 0 : 4, marginBottom: 8 }}>
            <Text style={sharedStyles.fieldLabel}>Room</Text>
            <Pressable
              onPress={() => {
                closeOtherMenus('room');
                setRoomMenuOpen((open) => !open);
              }}
              style={({ pressed }) => [
                sharedStyles.input,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Filter by room"
              accessibilityHint="Opens a list of rooms"
              accessibilityState={{ expanded: roomMenuOpen }}
            >
              <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                {selectedRoomLabel}
              </Text>
              <MaterialIcons
                name={roomMenuOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
                size={24}
                color={colors.textMuted}
              />
            </Pressable>
            {roomMenuOpen ? (
              <View
                style={{
                  marginTop: 4,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  backgroundColor: colors.card,
                  overflow: 'hidden',
                }}
              >
                <Pressable
                  onPress={() => {
                    setSelectedRoomId(null);
                    setRoomMenuOpen(false);
                  }}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      backgroundColor: pressed ? colors.bg : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedRoomId == null }}
                >
                  <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>All rooms</Text>
                  {selectedRoomId == null ? (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
                {roomsInList.map((entry, index) => {
                  const selected = selectedRoomId === entry.id;
                  return (
                    <Pressable
                      key={entry.id}
                      onPress={() => {
                        setSelectedRoomId(entry.id);
                        setRoomMenuOpen(false);
                      }}
                      style={({ pressed }) => [
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          borderBottomWidth: index < roomsInList.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                          backgroundColor: pressed ? colors.bg : 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                        {entry.name}
                      </Text>
                      {selected ? (
                        <MaterialIcons name="check" size={20} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        {showItemPicker ? (
          <View
            style={{
              marginTop: showRoomPicker || showPropertyPicker ? 0 : 4,
              marginBottom: 8,
            }}
          >
            <Text style={sharedStyles.fieldLabel}>Asset</Text>
            <Pressable
              onPress={() => {
                closeOtherMenus('item');
                setItemMenuOpen((open) => !open);
              }}
              style={({ pressed }) => [
                sharedStyles.input,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Filter by asset"
              accessibilityHint="Opens a list of assets"
              accessibilityState={{ expanded: itemMenuOpen }}
            >
              <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                {selectedItemLabel}
              </Text>
              <MaterialIcons
                name={itemMenuOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
                size={24}
                color={colors.textMuted}
              />
            </Pressable>
            {itemMenuOpen ? (
              <View
                style={{
                  marginTop: 4,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  backgroundColor: colors.card,
                  overflow: 'hidden',
                }}
              >
                <Pressable
                  onPress={() => {
                    setSelectedItemNameKey(null);
                    setItemMenuOpen(false);
                  }}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      backgroundColor: pressed ? colors.bg : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedItemNameKey == null }}
                >
                  <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>All assets</Text>
                  {selectedItemNameKey == null ? (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
                {itemsInList.map((entry, index) => {
                  const selected = selectedItemNameKey === entry.nameKey;
                  return (
                    <Pressable
                      key={entry.nameKey}
                      onPress={() => {
                        setSelectedItemNameKey(entry.nameKey);
                        setItemMenuOpen(false);
                      }}
                      style={({ pressed }) => [
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          borderBottomWidth: index < itemsInList.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                          backgroundColor: pressed ? colors.bg : 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                        {entry.displayName}
                      </Text>
                      {selected ? (
                        <MaterialIcons name="check" size={20} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        {showStatusPicker ? (
          <View style={{ marginBottom: 8 }}>
            <Text style={sharedStyles.fieldLabel}>Status</Text>
            <Pressable
              onPress={() => {
                closeOtherMenus('status');
                setStatusMenuOpen((open) => !open);
              }}
              style={({ pressed }) => [
                sharedStyles.input,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Filter by status"
              accessibilityHint="Opens Open or Done"
              accessibilityState={{ expanded: statusMenuOpen }}
            >
              <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                {selectedStatusLabel}
              </Text>
              <MaterialIcons
                name={statusMenuOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
                size={24}
                color={colors.textMuted}
              />
            </Pressable>
            {statusMenuOpen ? (
              <View
                style={{
                  marginTop: 4,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  backgroundColor: colors.card,
                  overflow: 'hidden',
                }}
              >
                <Pressable
                  onPress={() => {
                    setSelectedStatus(null);
                    setStatusMenuOpen(false);
                  }}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      backgroundColor: pressed ? colors.bg : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedStatus == null }}
                >
                  <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>All statuses</Text>
                  {selectedStatus == null ? (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
                {statusesInList.map((status, index) => {
                  const selected = selectedStatus === status;
                  const label = status === 'open' ? 'Open' : 'Done';
                  return (
                    <Pressable
                      key={status}
                      onPress={() => {
                        setSelectedStatus(status);
                        setStatusMenuOpen(false);
                      }}
                      style={({ pressed }) => [
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          borderBottomWidth: index < statusesInList.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                          backgroundColor: pressed ? colors.bg : 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                        {label}
                      </Text>
                      {selected ? (
                        <MaterialIcons name="check" size={20} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        {showSearch ? (
          <View style={{ marginBottom: 8 }}>
            <Text style={sharedStyles.fieldLabel}>Search</Text>
            <TextInput
              ref={searchInputRef}
              style={sharedStyles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Title, asset, notes…"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              clearButtonMode="while-editing"
              {...keyboardDone.getTextInputProps({
                onFocus: handleSearchFocus,
              })}
            />
          </View>
        ) : null}

        {roomScopedEvents.length === 0 ? (
          <Text style={[sharedStyles.emptyText, { marginTop: 24 }]}>No services yet.</Text>
        ) : filteredEvents.length === 0 ? (
          <Text style={[sharedStyles.emptyText, { marginTop: 24 }]}>No matching services.</Text>
        ) : (
          <View style={{ marginTop: 12 }}>
            {singleItemMode && singleItem ? (
              <Pressable
                onPress={() => onOpenItem(singleItem.id)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 4,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open asset ${itemDisplayLabel(singleItem)}`}
              >
                {firstPhotoUriForItem(state, singleItem) ? (
                  <Image
                    source={{ uri: firstPhotoUriForItem(state, singleItem) }}
                    style={{
                      width: ITEM_LIST_THUMB_SIZE,
                      height: ITEM_LIST_THUMB_SIZE,
                      borderRadius: 2,
                      backgroundColor: colors.photoPlaceholder,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: ITEM_LIST_THUMB_SIZE,
                      height: ITEM_LIST_THUMB_SIZE,
                      borderRadius: 2,
                      backgroundColor: colors.photoPlaceholder,
                    }}
                  />
                )}
                <Text style={[sharedStyles.cardTitle, { flex: 1 }]} numberOfLines={2}>
                  {itemDisplayLabel(singleItem)}
                </Text>
              </Pressable>
            ) : null}

            {serviceBucketGroups.map((group) => {
              const expanded = isActivityBucketExpanded(expandPrefs, group.bucket);
              const isTodayBucket = group.bucket === 'today';
              const frameColor = isTodayBucket ? colors.danger : colors.sectionTitle;
              return (
                <View key={group.bucket}>
                  <ActivityBucketBanner
                    label={group.label}
                    count={serviceBucketCounts[group.bucket]}
                    expanded={expanded}
                    variant={isTodayBucket ? 'today' : 'default'}
                    onToggle={() => toggleServiceBucket(group.bucket)}
                    attachedToGroup
                  />
                  {expanded ? (
                    <View
                      style={[
                        sharedStyles.activityBucketGroup,
                        isTodayBucket && sharedStyles.activityBucketGroupToday,
                      ]}
                    >
                      {group.entries.map((event, index) => {
                        const item = itemById(state, event.itemId);
                        if (!item) return null;
                        const betweenRows = index < group.entries.length - 1;
                        const photo = photosForEvent(state, event.id)[0];
                        const eventRoom = roomById(state, item.roomId);
                        const eventProperty = eventRoom
                          ? propertyById(state, eventRoom.propertyId)
                          : undefined;
                        const scopeLabel = isAllScope
                          ? eventProperty &&
                            eventRoom &&
                            eventProperty.name !== eventRoom.name
                            ? `${eventProperty.name} · ${eventRoom.name}`
                            : (eventProperty?.name ?? eventRoom?.name)
                          : isRoomScope
                            ? undefined
                            : eventRoom?.name;
                        const open = isOpenService(event);
                        const eventDateISO = serviceListDateISO(event);
                        return (
                          <PropertyServiceListRow
                            key={event.id}
                            scopeLabel={scopeLabel}
                            itemName={itemDisplayLabel(item)}
                            itemPhotoUri={firstPhotoUriForItem(state, item)}
                            hideItemPhoto={singleItemMode}
                            dateLabel={formatDisplayDate(eventDateISO)}
                            dateISO={eventDateISO}
                            stackRelative={isAfterToday(eventDateISO)}
                            statusLabel={open ? 'Open' : 'Done'}
                            title={event.title}
                            notes={event.notes}
                            company={event.serviceCompany}
                            photoUri={photo?.localUri}
                            onPress={() => onOpenEvent(event.itemId, event.id)}
                            onPressItem={() => onOpenItem(event.itemId)}
                            cardBackgroundColor={colors.upcomingCardBg}
                            ownerBackgroundColor={colors.upcomingInteractionOwnerBg}
                            dividerColor={frameColor}
                            dividerWidth={betweenRows ? 2 : 0}
                            ownerCornerIcon="inventory"
                            cornerIcon="handyman"
                          />
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {keyboardDone.accessory}

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
                Services
              </Text>
            </View>
            <Pressable
              onPress={() => runMenuAction(openShareOptions)}
              disabled={exporting}
              accessibilityRole="button"
              accessibilityLabel="Share services"
              accessibilityHint="Creates an image of the current services list and opens the share sheet."
              accessibilityState={{ disabled: exporting }}
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: exporting ? 0.35 : pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>Share</Text>
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

      {showPropertyGearNav ? propertyGearCreateModals : null}

      <ShareFormatModal
        visible={shareOptionsOpen}
        title="Share services"
        shareFormat={shareFormat}
        onChangeShareFormat={setShareFormat}
        onShare={() => void runServicesExport(shareFormat)}
        onClose={() => setShareOptionsOpen(false)}
      />

      <Modal visible={exportSnapshot != null} transparent animationType="none" onRequestClose={() => {}}>
        <View
          style={{ position: 'absolute', left: 0, top: 0, opacity: 0 }}
          pointerEvents="none"
        >
          <View ref={exportRef} collapsable={false}>
            {exportSnapshot ? <ServicesExportSheet snapshot={exportSnapshot} /> : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
