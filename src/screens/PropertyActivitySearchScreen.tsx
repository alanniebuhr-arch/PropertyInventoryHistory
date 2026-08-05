import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import type {
  AppState,
  InventoryItem,
  ItemEvent,
  ProjectPunchItem,
  PropertyTodo,
  VendorInteraction,
} from '../types';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { ActivityBucketBanner } from '../components/ActivityBucketBanner';
import {
  ItemListRow,
  PropertyInteractionListRow,
  PropertyServiceListRow,
  PropertyTodoListRow,
} from '../components/ListRows';
import { useKeyboardDoneAccessory } from '../components/KeyboardDoneAccessory';
import { sharedStyles, colors } from '../theme';
import { formatCurrency, formatDisplayDate } from '../utils';
import {
  isAfterToday,
  serviceListDateISO,
  upcomingDueAtISO,
} from '../eventRecurrence';
import {
  findAssetSearchMatch,
  findInteractionSearchMatch,
  findServiceSearchMatch,
  findTodoSearchMatch,
  type InteractionSearchMatchField,
} from '../searchSnippet';
import {
  allItemEvents,
  allItems,
  allVendorInteractions,
  eventsForProperty,
  firstPhotoUriForItem,
  ideasForProperty,
  interactionsForProperty,
  interactionsForProject,
  itemById,
  itemsForProperty,
  photosForEvent,
  photosForPropertyTodo,
  photosForPunchItem,
  photosForVendorInteraction,
  projectById,
  projectsForProperty,
  propertyById,
  propertyIdForInteraction,
  projectIdForInteraction,
  punchItemsForProject,
  roomById,
  serviceHistoryEventsForItem,
  todosForProperty,
  vendorById,
} from '../storage';
import {
  catalogLabel,
  itemCustomName,
  itemDisplayLabel,
  itemListRowLabels,
} from '../itemCatalog';
import { itemListSummaryFields } from '../itemListSummaryFields';
import { isItemOverdue, itemSearchActivityAtISO, nextDueLabelForItem } from '../itemMaintenance';
import { firstPhotoUriForVendor } from '../vendorPhotos';
import { vendorContactMethodLabel } from '../vendorContactMethod';
import { vendorStatusColor, vendorStatusLabel } from '../vendorStatus';
import { isRoomUnlocked } from '../roomAuth';
import { propertyCoverPhotoUri } from '../propertyPhotos';
import {
  activitySearchScopeKey,
  getActivitySearchPrefs,
  setActivitySearchPrefs,
} from '../activitySearchPrefs';
import {
  activityBucketCounts,
  foldActivityBucketGroups,
  type ActivityTimeBucket,
} from '../activityTimeBuckets';
import { isActivityBucketExpanded } from '../activityBucketExpandPrefs';

function itemVisibleWithRoomAuth(
  state: AppState,
  item: { roomId: string }
): boolean {
  const itemRoom = roomById(state, item.roomId);
  if (!itemRoom || itemRoom.requiresAuth !== true) return true;
  return isRoomUnlocked(itemRoom.id);
}

type ActivityEntry =
  | { kind: 'interaction'; id: string; at: string; interaction: VendorInteraction }
  | { kind: 'event'; id: string; at: string; event: ItemEvent };

type SearchResultEntry =
  | ActivityEntry
  | { kind: 'asset'; id: string; item: InventoryItem }
  | { kind: 'todo' | 'idea'; id: string; todo: PropertyTodo }
  | { kind: 'punch'; id: string; punchItem: ProjectPunchItem };

export function PropertyActivitySearchScreen(props: {
  state: AppState;
  /** When omitted, search across all properties. */
  propertyId?: string;
  /** When set with propertyId, seed the project filter to this project. */
  projectId?: string;
  onBack: () => void;
  onGoToProperty?: (propertyId: string) => void;
  onOpenInteraction: (
    vendorId: string | undefined,
    interactionId: string,
    options?: {
      searchQuery?: string;
      searchMatchField?: InteractionSearchMatchField;
      propertyId?: string;
    }
  ) => void;
  onOpenEvent: (itemId: string, eventId: string) => void;
  onOpenItem: (itemId: string) => void;
  onOpenTodo: (todoId: string, options?: { kind?: 'todo' | 'idea' }) => void;
  onOpenPunchItem: (punchItemId: string) => void;
  onOpenVendor: (vendorId: string) => void;
}) {
  const {
    state,
    propertyId: routePropertyId,
    projectId: routeProjectId,
    onBack,
    onGoToProperty,
    onOpenInteraction,
    onOpenEvent,
    onOpenItem,
    onOpenTodo,
    onOpenPunchItem,
    onOpenVendor,
  } = props;
  const insets = useSafeAreaInsets();
  const textScaleControls = useTextScaleControls();
  const keyboardDone = useKeyboardDoneAccessory({
    id: 'propertyActivitySearchDone',
    variant: 'overlay',
  });
  const scrollRef = useRef<RNScrollView>(null);
  const searchInputRef = useRef<RNTextInput>(null);
  const pendingFocusRef = useRef<{ y: number; height: number } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    () => routePropertyId ?? null
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    if (routeProjectId) return routeProjectId;
    return getActivitySearchPrefs(activitySearchScopeKey(routePropertyId)).selectedProjectId;
  });
  const [propertyMenuOpen, setPropertyMenuOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const scopeKey = activitySearchScopeKey(selectedPropertyId ?? undefined);
  const savedPrefs = getActivitySearchPrefs(scopeKey);
  const scrollYRef = useRef(savedPrefs.scrollY);
  const pendingRestoreScrollYRef = useRef<number | null>(
    savedPrefs.scrollY > 0 ? savedPrefs.scrollY : null
  );
  const didRestoreScrollRef = useRef(savedPrefs.scrollY <= 0);
  const [searchQuery, setSearchQuery] = useState(savedPrefs.searchQuery);
  const [menuOpen, setMenuOpen] = useState(false);
  /** Bumps when room unlock session may have changed (resume). */
  const [roomAuthEpoch, setRoomAuthEpoch] = useState(0);
  const [activityFutureExpanded, setActivityFutureExpanded] = useState(
    () => savedPrefs.activityFuture
  );
  const [activityTodayExpanded, setActivityTodayExpanded] = useState(
    () => savedPrefs.activityToday
  );
  const [activityHistoryExpanded, setActivityHistoryExpanded] = useState(
    () => savedPrefs.activityHistory
  );
  const [activityUndatedExpanded, setActivityUndatedExpanded] = useState(
    () => savedPrefs.activityUndated
  );

  const propertiesInList = useMemo(
    () => [...state.properties].sort((a, b) => a.name.localeCompare(b.name)),
    [state.properties]
  );
  const showPropertyPicker = propertiesInList.length > 1;

  const projectsInList = useMemo(() => {
    if (!selectedPropertyId) return [];
    return projectsForProperty(state, selectedPropertyId);
  }, [selectedPropertyId, state]);
  const showProjectPicker = Boolean(selectedPropertyId) && projectsInList.length > 0;

  const isAllScope = selectedPropertyId == null;
  const property = selectedPropertyId
    ? propertyById(state, selectedPropertyId)
    : undefined;
  const routeProperty = routePropertyId
    ? propertyById(state, routePropertyId)
    : undefined;

  const selectedPropertyLabel =
    selectedPropertyId == null
      ? 'All properties'
      : (propertiesInList.find((entry) => entry.id === selectedPropertyId)?.name ??
        'All properties');
  const selectedPropertyCoverUri = property
    ? propertyCoverPhotoUri(state, property)
    : undefined;
  const selectedProjectLabel =
    selectedProjectId == null
      ? 'All projects'
      : (projectsInList.find((entry) => entry.id === selectedProjectId)?.name ??
        'All projects');

  useEffect(() => {
    if (
      selectedPropertyId &&
      !propertiesInList.some((entry) => entry.id === selectedPropertyId)
    ) {
      setSelectedPropertyId(null);
      setSelectedProjectId(null);
    }
  }, [propertiesInList, selectedPropertyId]);

  useEffect(() => {
    if (
      selectedProjectId &&
      !projectsInList.some((entry) => entry.id === selectedProjectId)
    ) {
      setSelectedProjectId(null);
    }
  }, [projectsInList, selectedProjectId]);

  useEffect(() => {
    if (!selectedPropertyId) {
      setSelectedProjectId(null);
      setProjectMenuOpen(false);
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    const prefs = getActivitySearchPrefs(scopeKey);
    scrollYRef.current = prefs.scrollY;
    pendingRestoreScrollYRef.current = prefs.scrollY > 0 ? prefs.scrollY : null;
    didRestoreScrollRef.current = prefs.scrollY <= 0;
    setActivityFutureExpanded(prefs.activityFuture);
    setActivityTodayExpanded(prefs.activityToday);
    setActivityHistoryExpanded(prefs.activityHistory);
    setActivityUndatedExpanded(prefs.activityUndated);
  }, [scopeKey]);

  useEffect(() => {
    setActivitySearchPrefs(scopeKey, { searchQuery });
  }, [scopeKey, searchQuery]);

  useEffect(() => {
    setActivitySearchPrefs(scopeKey, { selectedProjectId });
  }, [scopeKey, selectedProjectId]);

  useEffect(() => {
    return () => {
      setActivitySearchPrefs(scopeKey, { scrollY: scrollYRef.current });
    };
  }, [scopeKey]);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'active' || next === 'background' || next === 'inactive') {
        setRoomAuthEpoch((n) => n + 1);
      }
    };
    const sub = RnAppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  const activityAll = useMemo((): ActivityEntry[] => {
    void roomAuthEpoch;
    const interactions = selectedProjectId
      ? interactionsForProject(state, selectedProjectId)
      : selectedPropertyId
        ? interactionsForProperty(state, selectedPropertyId)
        : allVendorInteractions(state);
    const events = selectedProjectId
      ? []
      : (selectedPropertyId
          ? eventsForProperty(state, selectedPropertyId)
          : allItemEvents(state)
        ).filter((event) => {
          const item = itemById(state, event.itemId);
          return item ? itemVisibleWithRoomAuth(state, item) : false;
        });
    return [
      ...interactions.map((interaction) => ({
        kind: 'interaction' as const,
        id: interaction.id,
        at: interaction.occurredAtISO,
        interaction,
      })),
      ...events.map((event) => ({
        kind: 'event' as const,
        id: event.id,
        at: serviceListDateISO(event),
        event,
      })),
    ].sort((a, b) => b.at.localeCompare(a.at));
  }, [state, selectedPropertyId, selectedProjectId, roomAuthEpoch]);

  const filteredResults = useMemo((): SearchResultEntry[] => {
    void roomAuthEpoch;
    const query = searchQuery.trim();

    const matchedActivity = !query
      ? activityAll
      : activityAll.filter((entry) => {
          if (entry.kind === 'interaction') {
            const interaction = entry.interaction;
            const vendor = interaction.vendorId
              ? vendorById(state, interaction.vendorId)
              : undefined;
            const vendorProjectId = projectIdForInteraction(state, interaction);
            const vendorProject = vendorProjectId
              ? projectById(state, vendorProjectId)
              : undefined;
            const interactionPropertyId = propertyIdForInteraction(state, interaction);
            const interactionProperty = interactionPropertyId
              ? propertyById(state, interactionPropertyId)
              : undefined;
            return Boolean(
              findInteractionSearchMatch({
                query,
                notes: interaction.notes,
                contactName: interaction.contactName,
                vendorName: vendor?.name,
                methodLabel: vendorContactMethodLabel(interaction.contactMethod),
                dateLabel: formatDisplayDate(interaction.occurredAtISO),
                projectName: vendorProject?.name,
                propertyName: interactionProperty?.name ?? property?.name,
              })
            );
          }
          const event = entry.event;
          const item = itemById(state, event.itemId);
          if (!item) return false;
          const eventRoom = roomById(state, item.roomId);
          const eventProperty = eventRoom
            ? propertyById(state, eventRoom.propertyId)
            : undefined;
          return Boolean(
            findServiceSearchMatch({
              query,
              title: event.title,
              assetLabel: itemDisplayLabel(item),
              roomName: eventRoom?.name,
              propertyName: eventProperty?.name ?? property?.name,
              notes: event.notes,
              company: event.serviceCompany,
              dateLabel: formatDisplayDate(serviceListDateISO(event)),
            })
          );
        });

    // Assets / todos / punch are searchable kinds — include them with an empty
    // query too so Undated (and other) buckets aren't search-only.
    const assetPool = selectedProjectId
      ? []
      : selectedPropertyId
        ? itemsForProperty(state, selectedPropertyId)
        : allItems(state);
    const matchedAssets = assetPool
      .filter((item) => itemVisibleWithRoomAuth(state, item))
      .filter((item) => {
        if (!query) return true;
        const itemRoom = roomById(state, item.roomId);
        const itemProperty = itemRoom
          ? propertyById(state, itemRoom.propertyId)
          : undefined;
        const detailsNotes =
          'notes' in item.details ? item.details.notes : undefined;
        const summaryValues = itemListSummaryFields(item)
          .map((field) => field.value)
          .join(' ');
        return Boolean(
          findAssetSearchMatch({
            query,
            label: itemDisplayLabel(item),
            typeLabel: catalogLabel(item.itemTypeId),
            customName: itemCustomName(item),
            roomName: itemRoom?.name,
            propertyName: itemProperty?.name ?? property?.name,
            notes: typeof detailsNotes === 'string' ? detailsNotes : undefined,
            summaryValues,
          })
        );
      })
      .slice()
      .sort((a, b) => itemDisplayLabel(a).localeCompare(itemDisplayLabel(b)))
      .map((item) => ({ kind: 'asset' as const, id: item.id, item }));

    const todoPool = selectedProjectId
      ? []
      : selectedPropertyId
        ? [
            ...todosForProperty(state, selectedPropertyId),
            ...ideasForProperty(state, selectedPropertyId),
          ]
        : state.propertyTodos.slice();
    const matchedTodos = todoPool
      .filter((todo) => {
        if (!query) return true;
        const todoProperty = propertyById(state, todo.propertyId);
        return Boolean(
          findTodoSearchMatch({
            query,
            title: todo.title,
            notes: todo.notes,
            dateLabel: todo.dueAtISO
              ? formatDisplayDate(todo.dueAtISO)
              : undefined,
            propertyName: todoProperty?.name ?? property?.name,
          })
        );
      })
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((todo) => ({
        kind: (todo.kind === 'idea' ? 'idea' : 'todo') as 'todo' | 'idea',
        id: todo.id,
        todo,
      }));

    const punchPool = selectedProjectId
      ? punchItemsForProject(state, selectedProjectId)
      : selectedPropertyId
        ? projectsForProperty(state, selectedPropertyId).flatMap((project) =>
            punchItemsForProject(state, project.id)
          )
        : state.projectPunchItems.slice();
    const matchedPunchItems = punchPool
      .filter((punchItem) => {
        if (!query) return true;
        const punchProject = projectById(state, punchItem.projectId);
        const punchProperty = punchProject
          ? propertyById(state, punchProject.propertyId)
          : undefined;
        return Boolean(
          findTodoSearchMatch({
            query,
            title: punchItem.title,
            notes: punchItem.notes,
            dateLabel: punchItem.dueAtISO
              ? formatDisplayDate(punchItem.dueAtISO)
              : undefined,
            propertyName: punchProperty?.name ?? property?.name,
            projectName: punchProject?.name,
          })
        );
      })
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((punchItem) => ({
        kind: 'punch' as const,
        id: punchItem.id,
        punchItem,
      }));

    return [...matchedActivity, ...matchedAssets, ...matchedTodos, ...matchedPunchItems];
  }, [
    activityAll,
    property?.name,
    selectedProjectId,
    selectedPropertyId,
    roomAuthEpoch,
    searchQuery,
    state,
  ]);

  function searchEntryAt(entry: SearchResultEntry): string {
    if (entry.kind === 'interaction' || entry.kind === 'event') return entry.at;
    if (entry.kind === 'todo' || entry.kind === 'idea') {
      return entry.todo.dueAtISO?.trim() || '';
    }
    if (entry.kind === 'punch') {
      return entry.punchItem.dueAtISO?.trim() || '';
    }
    return itemSearchActivityAtISO(state, entry.item);
  }

  const searchBucketGroups = useMemo(
    () => foldActivityBucketGroups(filteredResults, searchEntryAt),
    [filteredResults, state]
  );

  const searchBucketCounts = activityBucketCounts(searchBucketGroups);

  const expandPrefs = {
    activityFuture: activityFutureExpanded,
    activityToday: activityTodayExpanded,
    activityHistory: activityHistoryExpanded,
    activityUndated: activityUndatedExpanded,
  };

  function toggleSearchBucket(bucket: ActivityTimeBucket) {
    if (bucket === 'future') {
      const next = !activityFutureExpanded;
      setActivityFutureExpanded(next);
      setActivitySearchPrefs(scopeKey, { activityFuture: next });
      return;
    }
    if (bucket === 'today') {
      const next = !activityTodayExpanded;
      setActivityTodayExpanded(next);
      setActivitySearchPrefs(scopeKey, { activityToday: next });
      return;
    }
    if (bucket === 'undated') {
      const next = !activityUndatedExpanded;
      setActivityUndatedExpanded(next);
      setActivitySearchPrefs(scopeKey, { activityUndated: next });
      return;
    }
    const next = !activityHistoryExpanded;
    setActivityHistoryExpanded(next);
    setActivitySearchPrefs(scopeKey, { activityHistory: next });
  }

  /** True when locked-room assets/events are omitted from what would otherwise appear. */
  const skippedLockedContent = useMemo(() => {
    void roomAuthEpoch;
    // Project scope has no room assets/events — locked rooms are irrelevant.
    if (selectedProjectId) return false;

    const query = searchQuery.trim();
    const eventPool = selectedPropertyId
      ? eventsForProperty(state, selectedPropertyId)
      : allItemEvents(state);
    const lockedEvents = eventPool.filter((event) => {
      const item = itemById(state, event.itemId);
      return item ? !itemVisibleWithRoomAuth(state, item) : false;
    });

    if (!query) return lockedEvents.length > 0;

    for (const event of lockedEvents) {
      const item = itemById(state, event.itemId);
      if (!item) continue;
      const eventRoom = roomById(state, item.roomId);
      const eventProperty = eventRoom
        ? propertyById(state, eventRoom.propertyId)
        : undefined;
      if (
        findServiceSearchMatch({
          query,
          title: event.title,
          assetLabel: itemDisplayLabel(item),
          roomName: eventRoom?.name,
          propertyName: eventProperty?.name ?? property?.name,
          notes: event.notes,
          company: event.serviceCompany,
          dateLabel: formatDisplayDate(serviceListDateISO(event)),
        })
      ) {
        return true;
      }
    }

    const assetPool = selectedPropertyId
      ? itemsForProperty(state, selectedPropertyId)
      : allItems(state);
    for (const item of assetPool) {
      if (itemVisibleWithRoomAuth(state, item)) continue;
      const itemRoom = roomById(state, item.roomId);
      const itemProperty = itemRoom
        ? propertyById(state, itemRoom.propertyId)
        : undefined;
      const detailsNotes =
        'notes' in item.details ? item.details.notes : undefined;
      const summaryValues = itemListSummaryFields(item)
        .map((field) => field.value)
        .join(' ');
      if (
        findAssetSearchMatch({
          query,
          label: itemDisplayLabel(item),
          typeLabel: catalogLabel(item.itemTypeId),
          customName: itemCustomName(item),
          roomName: itemRoom?.name,
          propertyName: itemProperty?.name ?? property?.name,
          notes: typeof detailsNotes === 'string' ? detailsNotes : undefined,
          summaryValues,
        })
      ) {
        return true;
      }
    }
    return false;
  }, [
    property?.name,
    selectedProjectId,
    selectedPropertyId,
    roomAuthEpoch,
    searchQuery,
    state,
  ]);

  // Fallback if content never grows past saved y (shorter result set).
  useEffect(() => {
    if (didRestoreScrollRef.current) return;
    const y = pendingRestoreScrollYRef.current;
    if (y == null || y <= 0) {
      didRestoreScrollRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      if (didRestoreScrollRef.current) return;
      didRestoreScrollRef.current = true;
      pendingRestoreScrollYRef.current = null;
      scrollRef.current?.scrollTo({ y, animated: false });
      scrollYRef.current = y;
    }, 120);
    return () => clearTimeout(timer);
  }, [filteredResults]);

  const scrollFieldIntoView = useCallback((y: number, height: number, kbHeight: number) => {
    const windowHeight = Dimensions.get('window').height;
    const visibleBottom = windowHeight - kbHeight - 24;
    const fieldBottom = y + height - scrollYRef.current;
    if (fieldBottom > visibleBottom) {
      scrollRef.current?.scrollTo({
        y: scrollYRef.current + (fieldBottom - visibleBottom),
        animated: true,
      });
    }
  }, []);

  const handleSearchFocus = useCallback(() => {
    requestAnimationFrame(() => {
      searchInputRef.current?.measureInWindow((_x, y, _w, height) => {
        pendingFocusRef.current = { y, height };
        scrollFieldIntoView(y, height, keyboardHeight || 320);
      });
    });
  }, [keyboardHeight, scrollFieldIntoView]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      pendingFocusRef.current = null;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (keyboardHeight <= 0 || !pendingFocusRef.current) return;
    const { y, height } = pendingFocusRef.current;
    const frame = requestAnimationFrame(() => {
      scrollFieldIntoView(y, height, keyboardHeight);
    });
    return () => cancelAnimationFrame(frame);
  }, [keyboardHeight, scrollFieldIntoView]);

  if (routePropertyId && !routeProperty) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>Property not found.</Text>
        <Pressable onPress={onBack} style={sharedStyles.secondaryBtn}>
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
          {selectedPropertyId && onGoToProperty ? (
            <Pressable
              onPress={() => onGoToProperty(selectedPropertyId)}
              accessibilityRole="button"
              accessibilityLabel="Go to property"
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
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <MaterialIcons name="home" size={22} color={colors.primary} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Search all options"
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
          const y = e.nativeEvent.contentOffset.y;
          scrollYRef.current = y;
          setActivitySearchPrefs(scopeKey, { scrollY: y });
        }}
        onContentSizeChange={(_w, h) => {
          if (didRestoreScrollRef.current) return;
          const y = pendingRestoreScrollYRef.current;
          if (y == null || y <= 0) {
            didRestoreScrollRef.current = true;
            return;
          }
          // Wait until list content is tall enough; RN clamps if still short at end.
          if (h < y) return;
          didRestoreScrollRef.current = true;
          pendingRestoreScrollYRef.current = null;
          requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ y, animated: false });
            scrollYRef.current = y;
          });
        }}
        scrollEventThrottle={16}
      >
        <Text style={sharedStyles.title}>Search all</Text>
        {!showPropertyPicker ? (
          <Text style={sharedStyles.subtitle}>
            {property?.name ?? (isAllScope ? 'All properties' : '')}
          </Text>
        ) : null}

        {showPropertyPicker ? (
          <View style={{ marginTop: 4, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {selectedPropertyCoverUri ? (
                <Image
                  source={{ uri: selectedPropertyCoverUri }}
                  style={{
                    width: 73,
                    height: 73,
                    borderRadius: 2,
                    backgroundColor: colors.photoPlaceholder,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 73,
                    height: 73,
                    borderRadius: 2,
                    backgroundColor: colors.photoPlaceholder,
                  }}
                />
              )}
              <View style={{ flex: 1 }}>
                <Text style={sharedStyles.fieldLabel}>Property</Text>
                <Pressable
                  onPress={() => {
                    setProjectMenuOpen(false);
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
              </View>
            </View>
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
                    setSelectedProjectId(null);
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
                  const rowCoverUri = propertyCoverPhotoUri(state, entry);
                  return (
                    <Pressable
                      key={entry.id}
                      onPress={() => {
                        setSelectedPropertyId(entry.id);
                        setSelectedProjectId(
                          getActivitySearchPrefs(activitySearchScopeKey(entry.id))
                            .selectedProjectId
                        );
                        setPropertyMenuOpen(false);
                      }}
                      style={({ pressed }) => [
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
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
                      {rowCoverUri ? (
                        <Image
                          source={{ uri: rowCoverUri }}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 2,
                            backgroundColor: colors.photoPlaceholder,
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 2,
                            backgroundColor: colors.photoPlaceholder,
                          }}
                        />
                      )}
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

        {showProjectPicker ? (
          <View style={{ marginTop: showPropertyPicker ? 0 : 4, marginBottom: 8 }}>
            <Text style={sharedStyles.fieldLabel}>Project</Text>
            <Pressable
              onPress={() => {
                setPropertyMenuOpen(false);
                setProjectMenuOpen((open) => !open);
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
              accessibilityLabel="Filter by project"
              accessibilityHint="Opens a list of projects"
              accessibilityState={{ expanded: projectMenuOpen }}
            >
              <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                {selectedProjectLabel}
              </Text>
              <MaterialIcons
                name={projectMenuOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
                size={24}
                color={colors.textMuted}
              />
            </Pressable>
            {projectMenuOpen ? (
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
                    setSelectedProjectId(null);
                    setProjectMenuOpen(false);
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
                  accessibilityState={{ selected: selectedProjectId == null }}
                >
                  <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>All projects</Text>
                  {selectedProjectId == null ? (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
                {projectsInList.map((entry, index) => {
                  const selected = selectedProjectId === entry.id;
                  return (
                    <Pressable
                      key={entry.id}
                      onPress={() => {
                        setSelectedProjectId(entry.id);
                        setProjectMenuOpen(false);
                      }}
                      style={({ pressed }) => [
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          borderBottomWidth: index < projectsInList.length - 1 ? 1 : 0,
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

        <View style={{ marginBottom: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 4,
              marginBottom: 6,
              marginTop: showPropertyPicker || showProjectPicker ? 4 : 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[sharedStyles.fieldLabel, { marginBottom: 0, marginTop: 0 }]}>
                Search
              </Text>
              {skippedLockedContent ? (
                <MaterialIcons
                  name="lock"
                  size={16}
                  color={colors.textMuted}
                  accessibilityLabel="Some matching results are hidden in locked rooms"
                />
              ) : null}
            </View>
            <Text
              style={[sharedStyles.fieldLabel, { marginBottom: 0, marginTop: 0 }]}
              accessibilityLabel={`${filteredResults.length} results`}
            >
              ({filteredResults.length})
            </Text>
          </View>
          <TextInput
            ref={searchInputRef}
            style={sharedStyles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Interactions, services, assets, to-dos, punch list…"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            clearButtonMode="while-editing"
            {...keyboardDone.getTextInputProps({
              onFocus: handleSearchFocus,
            })}
          />
        </View>

        {filteredResults.length === 0 ? (
          <Text style={[sharedStyles.emptyText, { marginTop: 24 }]}>
            {searchQuery.trim().length === 0 ? 'No activity yet.' : 'No matching results.'}
          </Text>
        ) : (
          <View style={{ marginTop: 12 }}>
            {searchBucketGroups.map((group) => {
              const expanded = isActivityBucketExpanded(expandPrefs, group.bucket);
              const isTodayBucket = group.bucket === 'today';
              const frameColor = isTodayBucket ? colors.danger : colors.sectionTitle;
              return (
                <View key={group.bucket}>
                  <ActivityBucketBanner
                    label={group.label}
                    count={searchBucketCounts[group.bucket]}
                    expanded={expanded}
                    variant={isTodayBucket ? 'today' : 'default'}
                    onToggle={() => toggleSearchBucket(group.bucket)}
                    attachedToGroup
                  />
                  {expanded ? (
                    <View
                      style={[
                        sharedStyles.activityBucketGroup,
                        isTodayBucket && sharedStyles.activityBucketGroupToday,
                      ]}
                    >
                      {group.entries.map((entry, index) => {
                        const betweenRows = index < group.entries.length - 1;
                        const dividerWidth = betweenRows ? 2 : 0;

                        if (entry.kind === 'interaction') {
                          const interaction = entry.interaction;
                          const vendor = interaction.vendorId
                            ? vendorById(state, interaction.vendorId)
                            : undefined;
                          const photo = photosForVendorInteraction(state, interaction.id)[0];
                          const vendorProjectId = projectIdForInteraction(state, interaction);
                          const vendorProject = vendorProjectId
                            ? projectById(state, vendorProjectId)
                            : undefined;
                          const interactionPropertyId = propertyIdForInteraction(
                            state,
                            interaction
                          );
                          const interactionProperty = interactionPropertyId
                            ? propertyById(state, interactionPropertyId)
                            : undefined;
                          const methodLabel = vendorContactMethodLabel(
                            interaction.contactMethod
                          );
                          const dateLabel = formatDisplayDate(interaction.occurredAtISO);
                          const scopeLabel = isAllScope
                            ? interactionProperty &&
                              vendorProject &&
                              interactionProperty.name !== vendorProject.name
                              ? `${interactionProperty.name} · ${vendorProject.name}`
                              : (interactionProperty?.name ?? vendorProject?.name)
                            : vendorProject?.name;
                          const searchMatch =
                            searchQuery.trim().length > 0
                              ? findInteractionSearchMatch({
                                  query: searchQuery,
                                  notes: interaction.notes,
                                  contactName: interaction.contactName,
                                  vendorName: vendor?.name,
                                  methodLabel,
                                  dateLabel,
                                  projectName: vendorProject?.name,
                                  propertyName:
                                    interactionProperty?.name ?? property?.name,
                                })
                              : undefined;
                          return (
                            <PropertyInteractionListRow
                              key={`interaction:${interaction.id}`}
                              projectName={scopeLabel}
                              contactName={interaction.contactName}
                              companyName={vendor?.name ?? 'No vendor'}
                              companyPhotoUri={
                                vendor ? firstPhotoUriForVendor(state, vendor) : undefined
                              }
                              hideCompanyPhoto={!vendor}
                              vendorStatusLabel={
                                vendor ? vendorStatusLabel(vendor.status) : undefined
                              }
                              vendorStatusColor={
                                vendor ? vendorStatusColor(vendor.status) : undefined
                              }
                              dateISO={interaction.occurredAtISO}
                              methodLabel={methodLabel}
                              notes={interaction.notes}
                              searchSnippet={searchMatch?.searchSnippet}
                              highlightQuery={
                                searchQuery.trim() || searchMatch
                                  ? searchQuery.trim()
                                  : undefined
                              }
                              matchHint={searchMatch?.matchHint}
                              photoUri={photo?.localUri}
                              important={interaction.important === true}
                              onPress={() =>
                                onOpenInteraction(interaction.vendorId, interaction.id, {
                                  ...(searchMatch
                                    ? {
                                        searchQuery: searchQuery.trim(),
                                        searchMatchField: searchMatch.field,
                                      }
                                    : {}),
                                  propertyId: interactionPropertyId,
                                })
                              }
                              onPressVendor={
                                vendor ? () => onOpenVendor(vendor.id) : undefined
                              }
                              cardBackgroundColor={colors.bg}
                              ownerBackgroundColor={colors.interactionOwnerBg}
                              dividerColor={frameColor}
                              dividerWidth={dividerWidth}
                              ownerCornerIcon="storefront"
                              cornerIcon="forum"
                              stackRelative
                            />
                          );
                        }

                        if (entry.kind === 'todo' || entry.kind === 'idea') {
                          const todo = entry.todo;
                          const todoProperty = propertyById(state, todo.propertyId);
                          const photo = photosForPropertyTodo(state, todo.id)[0];
                          const dueLabel = todo.dueAtISO
                            ? formatDisplayDate(todo.dueAtISO)
                            : undefined;
                          const notes =
                            isAllScope && todoProperty
                              ? [todoProperty.name, todo.notes?.trim()]
                                  .filter(Boolean)
                                  .join(' · ')
                              : todo.notes;
                          return (
                            <PropertyTodoListRow
                              key={`${entry.kind}:${todo.id}`}
                              title={todo.title}
                              dueLabel={dueLabel}
                              notes={notes}
                              done={todo.done}
                              thumbnailUri={photo?.localUri}
                              variant={entry.kind}
                              onPress={() => onOpenTodo(todo.id, { kind: entry.kind })}
                              cardBackgroundColor={colors.historyCardBg}
                              dividerColor={frameColor}
                              dividerWidth={dividerWidth}
                              cornerIcon={entry.kind === 'idea' ? 'notes' : 'checklist'}
                            />
                          );
                        }

                        if (entry.kind === 'punch') {
                          const punchItem = entry.punchItem;
                          const punchProject = projectById(state, punchItem.projectId);
                          const punchProperty = punchProject
                            ? propertyById(state, punchProject.propertyId)
                            : undefined;
                          const photo = photosForPunchItem(state, punchItem.id)[0];
                          const dueLabel = punchItem.dueAtISO
                            ? formatDisplayDate(punchItem.dueAtISO)
                            : undefined;
                          const scopeParts =
                            selectedProjectId == null
                              ? [
                                  isAllScope ? punchProperty?.name : undefined,
                                  punchProject?.name,
                                ].filter(Boolean)
                              : [];
                          const notes = [...scopeParts, punchItem.notes?.trim()]
                            .filter(Boolean)
                            .join(' · ');
                          return (
                            <PropertyTodoListRow
                              key={`punch:${punchItem.id}`}
                              title={punchItem.title}
                              dueLabel={dueLabel}
                              notes={notes || undefined}
                              done={punchItem.done}
                              thumbnailUri={photo?.localUri}
                              onPress={() => onOpenPunchItem(punchItem.id)}
                              cardBackgroundColor={colors.historyCardBg}
                              dividerColor={frameColor}
                              dividerWidth={dividerWidth}
                              cornerIcon="assignment"
                            />
                          );
                        }

                        if (entry.kind === 'asset') {
                          const item = entry.item;
                          const lastEvent = serviceHistoryEventsForItem(state, item.id)[0];
                          const { label, nameLabel } = itemListRowLabels(item);
                          const itemRoom = roomById(state, item.roomId);
                          const itemProperty = itemRoom
                            ? propertyById(state, itemRoom.propertyId)
                            : undefined;
                          const scopeLabel = isAllScope
                            ? itemProperty &&
                              itemRoom &&
                              itemProperty.name !== itemRoom.name
                              ? `${itemProperty.name} · ${itemRoom.name}`
                              : (itemProperty?.name ?? itemRoom?.name)
                            : itemRoom?.name;
                          return (
                            <ItemListRow
                              key={`asset:${item.id}`}
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
                              dividerWidth={dividerWidth}
                              cornerIcon="inventory"
                            />
                          );
                        }

                        const event = entry.event;
                        const item = itemById(state, event.itemId);
                        if (!item) return null;
                        const eventRoom = roomById(state, item.roomId);
                        const eventProperty = eventRoom
                          ? propertyById(state, eventRoom.propertyId)
                          : undefined;
                        const photo = photosForEvent(state, event.id)[0];
                        const open = upcomingDueAtISO(event) != null;
                        const eventDateISO = serviceListDateISO(event);
                        const dateLabel = formatDisplayDate(eventDateISO);
                        const scopeLabel = isAllScope
                          ? eventProperty &&
                            eventRoom &&
                            eventProperty.name !== eventRoom.name
                            ? `${eventProperty.name} · ${eventRoom.name}`
                            : (eventProperty?.name ?? eventRoom?.name)
                          : eventRoom?.name;
                        const searchMatch =
                          searchQuery.trim().length > 0
                            ? findServiceSearchMatch({
                                query: searchQuery,
                                title: event.title,
                                assetLabel: itemDisplayLabel(item),
                                roomName: eventRoom?.name,
                                propertyName: eventProperty?.name ?? property?.name,
                                notes: event.notes,
                                company: event.serviceCompany,
                                dateLabel,
                              })
                            : undefined;
                        return (
                          <PropertyServiceListRow
                            key={`event:${event.id}`}
                            scopeLabel={scopeLabel}
                            itemName={itemDisplayLabel(item)}
                            itemPhotoUri={firstPhotoUriForItem(state, item)}
                            dateLabel={dateLabel}
                            dateISO={eventDateISO}
                            stackRelative={isAfterToday(eventDateISO)}
                            statusLabel={open ? 'Open' : 'Done'}
                            title={event.title}
                            notes={event.notes}
                            company={event.serviceCompany}
                            searchSnippet={searchMatch?.searchSnippet}
                            highlightQuery={
                              searchQuery.trim() || searchMatch
                                ? searchQuery.trim()
                                : undefined
                            }
                            matchHint={searchMatch?.matchHint}
                            photoUri={photo?.localUri}
                            onPress={() => onOpenEvent(event.itemId, event.id)}
                            onPressItem={() => onOpenItem(event.itemId)}
                            cardBackgroundColor={colors.upcomingCardBg}
                            ownerBackgroundColor={colors.upcomingInteractionOwnerBg}
                            dividerColor={frameColor}
                            dividerWidth={dividerWidth}
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
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            padding: 24,
          }}
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
                Search all
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
    </View>
  );
}
