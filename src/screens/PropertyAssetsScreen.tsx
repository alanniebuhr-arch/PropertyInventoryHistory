import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState as RnAppState,
  Dimensions,
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
import type { AppState, ItemTypeId } from '../types';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { ActivityBucketBanner } from '../components/ActivityBucketBanner';
import { ItemListRow } from '../components/ListRows';
import { AssetsExportSheet } from '../components/AssetsExportSheet';
import {
  ToolbarNewSearchControls,
  usePropertyGearNav,
  type PropertyGearNavItem,
} from '../components/PropertyGearNavItems';
import { useKeyboardDoneAccessory } from '../components/KeyboardDoneAccessory';
import { sharedStyles, colors } from '../theme';
import { formatCurrency, formatDisplayDate } from '../utils';
import {
  catalogLabel,
  itemCustomName,
  itemDisplayLabel,
  itemListRowLabels,
} from '../itemCatalog';
import { isEmptyInventoryItem, itemListSummaryFields } from '../itemListSummaryFields';
import {
  isItemOverdue,
  itemSearchActivityAtISO,
  nextDueLabelForItem,
} from '../itemMaintenance';
import {
  allItems,
  firstPhotoUriForItem,
  itemsForProperty,
  itemsForRoom,
  propertyById,
  roomById,
  roomsForProperty,
  serviceHistoryEventsForItem,
} from '../storage';
import {
  authenticateForRoom,
  isRoomUnlocked,
  markRoomUnlocked,
} from '../roomAuth';
import {
  buildAssetsExportSnapshot,
  type AssetsExportSnapshot,
} from '../assetsExportContent';
import { DEFAULT_SHARE_FORMAT, type ShareFormat } from '../shareFormat';
import { shareViewAsPng } from '../shareViewImage';
import { shareHtmlAsPdf } from '../shareViewPdf';
import { buildExportPdfHtml, assetsSnapshotToPdfDoc } from '../exportPdfHtml';
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

function itemVisibleWithRoomAuth(
  state: AppState,
  item: { roomId: string }
): boolean {
  const itemRoom = roomById(state, item.roomId);
  if (!itemRoom || itemRoom.requiresAuth !== true) return true;
  return isRoomUnlocked(itemRoom.id);
}

export function PropertyAssetsScreen(props: {
  state: AppState;
  propertyId?: string;
  roomId?: string;
  /** When opening with a type deep-link, pre-select that type in the filter. */
  initialItemTypeId?: ItemTypeId;
  /** When opening from property with a room deep-link, pre-select that room. */
  initialRoomId?: string;
  /** When true, show Search even if under the usual threshold (does not focus the field). */
  focusSearch?: boolean;
  onBack: () => void;
  /** Omit on the all-properties list (Home); home icon is hidden. */
  onGoToProperty?: () => void;
  onOpenItem: (itemId: string, startEditingSection?: 'appliance' | 'purchase' | 'repair') => void;
  onAddInteraction?: () => void;
  onAddServiceEvent?: () => void;
  onSearchInteractions?: () => void;
  onSearchServiceHistory?: () => void;
  onSearchActivity?: () => void;
  onOpenProject?: (projectId: string) => void;
  onSave?: (state: AppState) => void;
}) {
  const {
    state,
    propertyId,
    roomId,
    initialItemTypeId,
    initialRoomId,
    focusSearch = false,
    onBack,
    onGoToProperty,
    onOpenItem,
    onAddInteraction,
    onAddServiceEvent,
    onSearchInteractions,
    onSearchServiceHistory,
    onSearchActivity,
    onOpenProject,
    onSave,
  } = props;
  const insets = useSafeAreaInsets();
  const textScaleControls = useTextScaleControls();
  const keyboardDone = useKeyboardDoneAccessory({
    id: 'propertyAssetsDone',
    variant: 'overlay',
  });
  const exportRef = useRef<View>(null);
  const scrollRef = useRef<RNScrollView>(null);
  const scrollYRef = useRef(0);
  const searchInputRef = useRef<RNTextInput>(null);
  const pendingFocusRef = useRef<{ y: number; height: number } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isAllScope = !propertyId && !roomId;

  const [selectedItemTypeId, setSelectedItemTypeId] = useState<ItemTypeId | null>(
    () => initialItemTypeId ?? null
  );
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [propertyMenuOpen, setPropertyMenuOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    () => (!roomId ? initialRoomId ?? null : null)
  );
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [forceShowSearch, setForceShowSearch] = useState(focusSearch);
  const [exporting, setExporting] = useState(false);
  const [exportSnapshot, setExportSnapshot] = useState<AssetsExportSnapshot | null>(null);
  const [shareOptionsOpen, setShareOptionsOpen] = useState(false);
  const [shareFormat, setShareFormat] = useState<ShareFormat>(DEFAULT_SHARE_FORMAT);
  /** Bumps when room unlock session may have changed (resume / unlock). */
  const [roomAuthEpoch, setRoomAuthEpoch] = useState(0);
  const [roomAuthPending, setRoomAuthPending] = useState(false);

  const assetsExpandKey = activityBucketExpandKey(
    'assets',
    propertyId ? `property:${propertyId}` : roomId ? `room:${roomId}` : 'all'
  );
  const savedBucketExpand = getActivityBucketExpand(assetsExpandKey);
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
    setActivityBucketExpand(assetsExpandKey, {
      activityFuture: activityFutureExpanded,
      activityToday: activityTodayExpanded,
      activityHistory: activityHistoryExpanded,
      activityUndated: activityUndatedExpanded,
    });
  }, [
    assetsExpandKey,
    activityFutureExpanded,
    activityTodayExpanded,
    activityHistoryExpanded,
    activityUndatedExpanded,
  ]);

  useEffect(() => {
    const prefs = getActivityBucketExpand(assetsExpandKey);
    setActivityFutureExpanded(prefs.activityFuture);
    setActivityTodayExpanded(prefs.activityToday);
    setActivityHistoryExpanded(prefs.activityHistory);
    setActivityUndatedExpanded(prefs.activityUndated);
  }, [assetsExpandKey]);

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
      onSearchAssets: () => {
        setForceShowSearch(true);
      },
      onSearchInteractions: onSearchInteractions ?? noop,
      onSearchServiceHistory: onSearchServiceHistory ?? noop,
      onSearchActivity,
      onOpenProject: onOpenProject ?? noop,
      onOpenItem,
      onSave: onSave ?? noop,
    },
  });

  const assetsFallbackSearchItems: PropertyGearNavItem[] = [
    {
      key: 'searchAssets',
      prefix: 'Search',
      keyword: 'Assets',
      icon: 'inventory',
      helpText: 'Things',
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
    : assetsFallbackSearchItems;

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'active' || next === 'background' || next === 'inactive') {
        setRoomAuthEpoch((n) => n + 1);
      }
    };
    const sub = RnAppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  // roomAssets: same credential gate as entering the room (openRoom in App).
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

  const items = useMemo(() => {
    const base = roomId
      ? itemsForRoom(state, roomId)
      : propertyId
        ? itemsForProperty(state, propertyId)
        : allItems(state);
    return base.filter(
      (item) => itemVisibleWithRoomAuth(state, item) && !isEmptyInventoryItem(item)
    );
  }, [state, propertyId, roomId, roomAuthEpoch]);

  const propertiesInList = useMemo(() => {
    if (!isAllScope) return [];
    const byId = new Map<string, NonNullable<ReturnType<typeof propertyById>>>();
    for (const item of items) {
      const itemRoom = roomById(state, item.roomId);
      if (!itemRoom) continue;
      const prop = propertyById(state, itemRoom.propertyId);
      if (prop) byId.set(prop.id, prop);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, isAllScope, state]);

  const showPropertyPicker = propertiesInList.length > 1;

  const propertyScopedItems = useMemo(() => {
    if (!isAllScope || !selectedPropertyId) return items;
    return items.filter((item) => {
      const itemRoom = roomById(state, item.roomId);
      return itemRoom?.propertyId === selectedPropertyId;
    });
  }, [items, isAllScope, selectedPropertyId, state]);

  const roomsInList = useMemo(() => {
    if (roomId) return [];
    const propertyScopeId = propertyId ?? (isAllScope ? selectedPropertyId : undefined);
    if (!propertyScopeId) return [];
    const rooms = roomsForProperty(state, propertyScopeId);
    const roomIdsWithItems = new Set(propertyScopedItems.map((item) => item.roomId));
    return rooms
      .filter((r) => roomIdsWithItems.has(r.id))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [isAllScope, propertyId, propertyScopedItems, roomId, selectedPropertyId, state]);

  const showRoomPicker = roomsInList.length > 1;

  const roomScopedItems = useMemo(() => {
    if (roomId) return propertyScopedItems;
    if (!selectedRoomId) return propertyScopedItems;
    return propertyScopedItems.filter((item) => item.roomId === selectedRoomId);
  }, [propertyScopedItems, roomId, selectedRoomId]);

  const typesInList = useMemo(() => {
    const byId = new Map<ItemTypeId, string>();
    for (const item of roomScopedItems) {
      if (byId.has(item.itemTypeId)) continue;
      byId.set(item.itemTypeId, catalogLabel(item.itemTypeId));
    }
    return [...byId.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }, [roomScopedItems]);

  const showTypePicker = typesInList.length > 1;
  const showSearch = roomScopedItems.length >= 3 || forceShowSearch;

  useEffect(() => {
    if (
      selectedItemTypeId &&
      !typesInList.some((entry) => entry.id === selectedItemTypeId)
    ) {
      setSelectedItemTypeId(null);
    }
  }, [typesInList, selectedItemTypeId]);

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

  const typeScopedItems = useMemo(
    () =>
      selectedItemTypeId
        ? roomScopedItems.filter((item) => item.itemTypeId === selectedItemTypeId)
        : roomScopedItems,
    [roomScopedItems, selectedItemTypeId]
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return typeScopedItems;
    return typeScopedItems.filter((item) => {
      const itemRoom = roomById(state, item.roomId);
      const itemProperty = itemRoom
        ? propertyById(state, itemRoom.propertyId)
        : undefined;
      const detailsNotes =
        'notes' in item.details ? item.details.notes : undefined;
      const summaryValues = itemListSummaryFields(item)
        .map((field) => field.value)
        .join(' ');
      const haystack = [
        itemDisplayLabel(item),
        catalogLabel(item.itemTypeId),
        itemCustomName(item),
        itemRoom?.name,
        itemProperty?.name,
        detailsNotes,
        summaryValues,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [searchQuery, state, typeScopedItems]);

  const assetBucketGroups = useMemo(
    () =>
      foldActivityBucketGroups(filteredItems, (item) =>
        itemSearchActivityAtISO(state, item)
      ),
    [filteredItems, state]
  );
  const assetBucketCounts = activityBucketCounts(assetBucketGroups);
  const expandPrefs = {
    activityFuture: activityFutureExpanded,
    activityToday: activityTodayExpanded,
    activityHistory: activityHistoryExpanded,
    activityUndated: activityUndatedExpanded,
  };

  function toggleAssetBucket(bucket: ActivityTimeBucket) {
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

  const selectedTypeLabel =
    selectedItemTypeId == null
      ? 'All types'
      : (typesInList.find((entry) => entry.id === selectedItemTypeId)?.label ?? 'All types');

  const openShareOptions = useCallback(() => {
    setShareFormat(DEFAULT_SHARE_FORMAT);
    setShareOptionsOpen(true);
  }, []);

  const runAssetsExport = useCallback(
    async (format: ShareFormat = DEFAULT_SHARE_FORMAT) => {
      if (!subtitle) {
        Alert.alert('Share failed', 'Could not build assets summary.');
        return;
      }
      const filterLines = [
        selectedPropertyId != null ? `Property: ${selectedPropertyLabel}` : undefined,
        selectedRoomId != null ? `Room: ${selectedRoomLabel}` : undefined,
        selectedItemTypeId != null ? `Type: ${selectedTypeLabel}` : undefined,
        searchQuery.trim() ? `Search: ${searchQuery.trim()}` : undefined,
      ].filter((line): line is string => Boolean(line));

      const snapshot = buildAssetsExportSnapshot({
        state,
        items: filteredItems,
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
          const html = await buildExportPdfHtml(assetsSnapshotToPdfDoc(snapshot));
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
      filteredItems,
      propertyForScope,
      room,
      searchQuery,
      selectedItemTypeId,
      selectedPropertyId,
      selectedPropertyLabel,
      selectedRoomId,
      selectedRoomLabel,
      selectedTypeLabel,
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

  function closeOtherMenus(except: 'property' | 'room' | 'type') {
    if (except !== 'property') setPropertyMenuOpen(false);
    if (except !== 'room') setRoomMenuOpen(false);
    if (except !== 'type') setTypeMenuOpen(false);
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
              accessibilityHint="Opens the property page for these assets."
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
          <Pressable
            onPress={openShareOptions}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Share assets"
            accessibilityHint="Creates an image of the current assets list and opens the share sheet."
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
            {exporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="ios-share" size={22} color={colors.primary} />
            )}
          </Pressable>
          <ToolbarNewSearchControls
            title="Assets"
            newItems={toolbarNewItems}
            searchItems={toolbarSearchItems}
            disabled={exporting}
          />
          <Pressable
            onPress={() => setMenuOpen(true)}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Assets options"
            accessibilityHint="Opens actions like text size."
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
        <Text style={sharedStyles.title}>Assets</Text>
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

        {showTypePicker ? (
          <View
            style={{
              marginTop: showRoomPicker || showPropertyPicker ? 0 : 4,
              marginBottom: 8,
            }}
          >
            <Text style={sharedStyles.fieldLabel}>Type</Text>
            <Pressable
              onPress={() => {
                closeOtherMenus('type');
                setTypeMenuOpen((open) => !open);
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
              accessibilityLabel="Filter by type"
              accessibilityHint="Opens a list of asset types"
              accessibilityState={{ expanded: typeMenuOpen }}
            >
              <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                {selectedTypeLabel}
              </Text>
              <MaterialIcons
                name={typeMenuOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
                size={24}
                color={colors.textMuted}
              />
            </Pressable>
            {typeMenuOpen ? (
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
                    setSelectedItemTypeId(null);
                    setTypeMenuOpen(false);
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
                  accessibilityState={{ selected: selectedItemTypeId == null }}
                >
                  <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>All types</Text>
                  {selectedItemTypeId == null ? (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
                {typesInList.map((entry, index) => {
                  const selected = selectedItemTypeId === entry.id;
                  return (
                    <Pressable
                      key={entry.id}
                      onPress={() => {
                        setSelectedItemTypeId(entry.id);
                        setTypeMenuOpen(false);
                      }}
                      style={({ pressed }) => [
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          borderBottomWidth: index < typesInList.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                          backgroundColor: pressed ? colors.bg : 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                        {entry.label}
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
              placeholder="Name, type, room…"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              clearButtonMode="while-editing"
              {...keyboardDone.getTextInputProps({
                onFocus: handleSearchFocus,
              })}
            />
          </View>
        ) : null}

        {roomScopedItems.length === 0 ? (
          <Text style={[sharedStyles.emptyText, { marginTop: 24 }]}>No assets yet.</Text>
        ) : filteredItems.length === 0 ? (
          <Text style={[sharedStyles.emptyText, { marginTop: 24 }]}>No matching assets.</Text>
        ) : (
          <View style={{ marginTop: 12 }}>
            {assetBucketGroups.map((group) => {
              const expanded = isActivityBucketExpanded(expandPrefs, group.bucket);
              const isTodayBucket = group.bucket === 'today';
              const frameColor = isTodayBucket ? colors.danger : colors.sectionTitle;
              return (
                <View key={group.bucket}>
                  <ActivityBucketBanner
                    label={group.label}
                    count={assetBucketCounts[group.bucket]}
                    expanded={expanded}
                    variant={isTodayBucket ? 'today' : 'default'}
                    onToggle={() => toggleAssetBucket(group.bucket)}
                    attachedToGroup
                  />
                  {expanded ? (
                    <View
                      style={[
                        sharedStyles.activityBucketGroup,
                        isTodayBucket && sharedStyles.activityBucketGroupToday,
                      ]}
                    >
                      {group.entries.map((item, index) => {
                        const betweenRows = index < group.entries.length - 1;
                        const lastEvent = serviceHistoryEventsForItem(state, item.id)[0];
                        const { label, nameLabel } = itemListRowLabels(item);
                        const itemRoom = roomById(state, item.roomId);
                        const itemProperty = itemRoom
                          ? propertyById(state, itemRoom.propertyId)
                          : undefined;
                        const scopeLabel =
                          itemProperty && itemRoom && itemProperty.name !== itemRoom.name
                            ? `${itemProperty.name} · ${itemRoom.name}`
                            : (itemProperty?.name ?? itemRoom?.name);
                        return (
                          <ItemListRow
                            key={item.id}
                            label={label}
                            nameLabel={nameLabel}
                            scopeLabel={scopeLabel}
                            thumbnailUri={firstPhotoUriForItem(state, item)}
                            detailFields={
                              item.itemTypeId === 'automobile'
                                ? undefined
                                : itemListSummaryFields(item)
                            }
                            lastServiceDate={
                              lastEvent
                                ? formatDisplayDate(lastEvent.occurredAtISO)
                                : undefined
                            }
                            lastServiceTitle={lastEvent?.title}
                            lastServiceNotes={lastEvent?.notes}
                            lastServiceCost={
                              lastEvent?.cost != null
                                ? formatCurrency(lastEvent.cost)
                                : undefined
                            }
                            nextDueLabel={nextDueLabelForItem(state, item.id)}
                            overdue={isItemOverdue(state, item.id)}
                            onPress={() => onOpenItem(item.id)}
                            cardBackgroundColor={colors.historyCardBg}
                            dividerColor={frameColor}
                            dividerWidth={betweenRows ? 2 : 0}
                            cornerIcon="inventory"
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
                Assets
              </Text>
            </View>
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
        title="Share assets"
        shareFormat={shareFormat}
        onChangeShareFormat={setShareFormat}
        onShare={() => void runAssetsExport(shareFormat)}
        onClose={() => setShareOptionsOpen(false)}
      />

      <Modal visible={exportSnapshot != null} transparent animationType="none" onRequestClose={() => {}}>
        <View
          style={{ position: 'absolute', left: 0, top: 0, opacity: 0 }}
          pointerEvents="none"
        >
          <View ref={exportRef} collapsable={false}>
            {exportSnapshot ? <AssetsExportSheet snapshot={exportSnapshot} /> : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
