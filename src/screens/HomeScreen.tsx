import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, useWindowDimensions, View } from 'react-native';
import type { TextInput as RNTextInput } from 'react-native';
import { Text, TextInput, useTextScaleControls } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, PinnedRef, Project, Property } from '../types';
import { PropertyListRow, ProjectListRow, ItemListRow, RoomListRow, VendorListRow, PropertyTodoListRow, PropertyInteractionListRow, PropertyServiceListRow } from '../components/ListRows';
import { CollapsibleSectionTitle } from '../components/CollapsibleSectionTitle';
import {
  ToolbarNewSearchControls,
  type PropertyGearNavItem,
} from '../components/PropertyGearNavItems';
import { UpcomingReminderCard } from '../components/UpcomingServiceCard';
import { sharedStyles, colors } from '../theme';
import { uid, nowISO, formatCurrency, formatDisplayDate } from '../utils';
import {
  itemById,
  itemsForRoom,
  photosForEvent,
  photosForPropertyTodo,
  photosForPunchItem,
  photosForVendorInteraction,
  projectById,
  projectIdForInteraction,
  projectPunchItemById,
  projectsForProperty,
  propertyById,
  propertyIdForInteraction,
  roomById,
  serviceHistoryEventsForItem,
  todosForProperty,
  vendorById,
  vendorsForProject,
  incompleteProjects,
  nextProjectSortOrder,
  firstPhotoUriForItem,
  interactionsForVendor,
} from '../storage';
import { firstPhotoUriForRoom } from '../roomPhotos';
import { livingPins, propertyIdForPin } from '../pins';
import { propertyCoverPhotoUri } from '../propertyPhotos';
import { firstPhotoUriForProject } from '../projectPhotos';
import { firstPhotoUriForVendor } from '../vendorPhotos';
import { isItemOverdue, nextDueLabelForItem, overdueCountForProperty, overdueCountForRoom } from '../itemMaintenance';
import { itemDisplayLabel, itemListRowLabels } from '../itemCatalog';
import { itemListSummaryFields } from '../itemListSummaryFields';
import { vendorContactMethodLabel } from '../vendorContactMethod';
import { vendorStatusColor, vendorStatusLabel } from '../vendorStatus';
import { projectStatusColor, projectStatusLabel } from '../projectStatus';
import {
  upcomingHorizonLabel,
  upcomingNotOverdueCountForRoom,
  upcomingReminderCountForProperty,
  upcomingReminderEntriesForProperty,
  upcomingReminderEntriesAll,
  upcomingDueAtISO,
  isAfterToday,
  isOverdue,
  serviceListDateISO,
  UPCOMING_HORIZON_OPTIONS,
  type UpcomingHorizon,
} from '../eventRecurrence';
import {
  getPropertyUpcomingHorizon,
  loadPropertyUpcomingHorizon,
  setPropertyUpcomingHorizon,
} from '../upcomingHorizonPrefs';
import {
  getHomePropertiesExpanded,
  getHomeProjectsExpanded,
  getHomePinsExpanded,
  getHomeRemindersExpanded,
  setHomePropertiesExpanded,
  setHomeProjectsExpanded,
  setHomePinsExpanded,
  setHomeRemindersExpanded,
} from '../homeSectionExpandPrefs';
import { applyPropertyTemplate, type DwellingType } from '../propertyTemplate';
import { useKeyboardDoneAccessory } from '../components/KeyboardDoneAccessory';
import { useKeyboardSheetScroll } from '../components/useKeyboardSheetScroll';

function safeCompute<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

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
                { color: selected ? '#f7f5f1' : colors.text, textAlign: 'center' },
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

function dueSoonPeriodLabel(horizon: UpcomingHorizon): string {
  switch (horizon) {
    case '1m':
      return 'within 1 month';
    case '3m':
      return 'within 3 months';
    case '6m':
      return 'within 6 months';
    case '1y':
      return 'within 1 year';
    case 'all':
      return '(all time)';
  }
}

export function HomeScreen(props: {
  state: AppState;
  onOpenProperty: (propertyId: string) => void;
  onOpenInteractions: () => void;
  onSearchInteractions: () => void;
  onOpenServices: () => void;
  onSearchServiceHistory: () => void;
  onOpenAssets: () => void;
  onSearchAssets: () => void;
  onSearchActivity: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onOpenEvent: (itemId: string, eventId: string) => void;
  onOpenTodo: (propertyId: string, todoId: string) => void;
  onOpenProject: (projectId: string) => void;
  onOpenRoom: (roomId: string) => void;
  onOpenItem: (itemId: string) => void;
  onOpenVendor: (vendorId: string) => void;
  onOpenPunchItem: (projectId: string, punchItemId: string) => void;
  onOpenInteraction: (
    vendorId: string | undefined,
    interactionId: string,
    propertyId: string
  ) => void;
  onSave: (state: AppState) => void;
}) {
  const {
    state,
    onOpenProperty,
    onSearchInteractions,
    onSearchServiceHistory,
    onSearchAssets,
    onSearchActivity,
    onOpenExport,
    onOpenImport,
    onOpenEvent,
    onOpenTodo,
    onOpenProject,
    onOpenRoom,
    onOpenItem,
    onOpenVendor,
    onOpenPunchItem,
    onOpenInteraction,
    onSave,
  } = props;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [dwellingType, setDwellingType] = useState<DwellingType>('house');
  const [useDefaultLayout, setUseDefaultLayout] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [upcomingHorizon, setUpcomingHorizon] = useState<UpcomingHorizon>(
    getPropertyUpcomingHorizon
  );
  const [expandedReminderPropertyId, setExpandedReminderPropertyId] = useState<string | null>(
    null
  );
  const [propertiesExpanded, setPropertiesExpanded] = useState(getHomePropertiesExpanded);
  const [projectsExpanded, setProjectsExpanded] = useState(getHomeProjectsExpanded);
  const [pinsExpanded, setPinsExpanded] = useState(getHomePinsExpanded);
  const [homeRemindersExpanded, setHomeRemindersExpandedState] = useState(
    getHomeRemindersExpanded
  );
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [newProjectPropertyId, setNewProjectPropertyId] = useState<string | undefined>();
  const textScaleControls = useTextScaleControls();
  const nameInputRef = useRef<RNTextInput>(null);
  const addressInputRef = useRef<RNTextInput>(null);
  const projectNameInputRef = useRef<RNTextInput>(null);
  const projectDescInputRef = useRef<RNTextInput>(null);
  const {
    scrollRef: propertySheetScrollRef,
    onScroll: onPropertySheetScroll,
    measureAndScroll: measurePropertySheetField,
    contentBottomInset: propertySheetBottomInset,
  } = useKeyboardSheetScroll();
  const {
    scrollRef: projectSheetScrollRef,
    onScroll: onProjectSheetScroll,
    measureAndScroll: measureProjectSheetField,
    contentBottomInset: projectSheetBottomInset,
  } = useKeyboardSheetScroll();
  const keyboardDone = useKeyboardDoneAccessory({
    id: 'homeNewPropertyDone',
    variant: 'overlay',
  });
  const projectKeyboardDone = useKeyboardDoneAccessory({
    id: 'homeNewProjectDone',
    variant: 'overlay',
  });

  useEffect(() => {
    let cancelled = false;
    void loadPropertyUpcomingHorizon().then((horizon) => {
      if (!cancelled) setUpcomingHorizon(horizon);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function openAdd() {
    setName('');
    setAddress('');
    setDwellingType('house');
    setUseDefaultLayout(true);
    setModalOpen(true);
  }

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    setTimeout(action, 50);
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

  function togglePropertiesExpanded() {
    const next = !propertiesExpanded;
    setPropertiesExpanded(next);
    void setHomePropertiesExpanded(next);
  }

  function toggleProjectsExpanded() {
    const next = !projectsExpanded;
    setProjectsExpanded(next);
    void setHomeProjectsExpanded(next);
  }

  function togglePinsExpanded() {
    const next = !pinsExpanded;
    setPinsExpanded(next);
    void setHomePinsExpanded(next);
  }

  function toggleHomeRemindersExpanded() {
    const next = !homeRemindersExpanded;
    setHomeRemindersExpandedState(next);
    void setHomeRemindersExpanded(next);
  }

  const sorted = safeCompute(
    () => [...state.properties].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    []
  );
  const activeProjects = safeCompute(() => incompleteProjects(state), []);
  const pinnedItems = safeCompute(() => livingPins(state), []);
  const allReminders = safeCompute(
    () => upcomingReminderEntriesAll(state, upcomingHorizon),
    []
  );
  const overdueReminderCount = allReminders.filter((entry) => isOverdue(entry.dueAt)).length;

  function openPinned(pin: PinnedRef) {
    switch (pin.kind) {
      case 'property':
        onOpenProperty(pin.id);
        return;
      case 'project':
        onOpenProject(pin.id);
        return;
      case 'room':
        onOpenRoom(pin.id);
        return;
      case 'item':
        onOpenItem(pin.id);
        return;
      case 'event': {
        const event = state.events.find((e) => e.id === pin.id);
        if (event) onOpenEvent(event.itemId, event.id);
        return;
      }
      case 'vendor':
        onOpenVendor(pin.id);
        return;
      case 'todo': {
        const todo = state.propertyTodos.find((t) => t.id === pin.id);
        if (todo) onOpenTodo(todo.propertyId, todo.id);
        return;
      }
      case 'punch': {
        const punch = projectPunchItemById(state, pin.id);
        if (punch) onOpenPunchItem(punch.projectId, punch.id);
        return;
      }
      case 'interaction': {
        const interaction = state.vendorInteractions.find((i) => i.id === pin.id);
        if (!interaction) return;
        const propertyId = propertyIdForPin(state, pin);
        if (!propertyId) return;
        onOpenInteraction(interaction.vendorId, interaction.id, propertyId);
      }
    }
  }

  function openProjectSheet(propertyId: string) {
    setNewProjectPropertyId(propertyId);
    setProjectName('');
    setProjectDescription('');
    setProjectModalOpen(true);
  }

  function openAddProject() {
    if (sorted.length === 0) {
      Alert.alert('Add a property first', 'Create a property before adding a project.');
      return;
    }
    if (sorted.length === 1) {
      openProjectSheet(sorted[0].id);
      return;
    }
    Alert.alert('Property', undefined, [
      ...sorted.map((property) => ({
        text: property.name,
        onPress: () => openProjectSheet(property.id),
      })),
      { text: 'Done', style: 'cancel' as const },
    ]);
  }

  function saveNewProject() {
    if (!newProjectPropertyId) return;
    const trimmed = projectName.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Enter a project name (e.g. Pool renovation).');
      return;
    }
    const description = projectDescription.trim();
    const project: Project = {
      id: uid('project'),
      propertyId: newProjectPropertyId,
      name: trimmed,
      description: description || undefined,
      status: 'research',
      photoIds: [],
      documentIds: [],
      sortOrder: nextProjectSortOrder(state, newProjectPropertyId),
      createdAtISO: nowISO(),
    };
    onSave({ ...state, projects: [...state.projects, project] });
    setProjectModalOpen(false);
    setProjectName('');
    setProjectDescription('');
    setNewProjectPropertyId(undefined);
    onOpenProject(project.id);
  }
  const periodLabel = dueSoonPeriodLabel(upcomingHorizon);
  const hasInteractions = (state.vendorInteractions ?? []).length > 0;
  const hasServices = (state.events ?? []).length > 0;
  const hasAssets = (state.items ?? []).length > 0;

  const homeNewItems: PropertyGearNavItem[] = [
    {
      key: 'property',
      prefix: 'New',
      keyword: 'Property',
      onPress: () => runMenuAction(openAdd),
    },
    {
      key: 'project',
      prefix: 'New',
      keyword: 'Project',
      icon: 'shovel',
      helpText: 'Organize a job',
      onPress: () => runMenuAction(openAddProject),
    },
  ];
  const homeSearchItems: PropertyGearNavItem[] = [
    ...(hasAssets
      ? [
          {
            key: 'searchAssets',
            prefix: 'Search' as const,
            keyword: 'Assets',
            icon: 'inventory' as const,
            helpText: 'Things',
            onPress: () => runMenuAction(onSearchAssets),
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
            onPress: () => runMenuAction(onSearchInteractions),
          },
        ]
      : []),
    ...(hasServices
      ? [
          {
            key: 'searchServices',
            prefix: 'Search' as const,
            keyword: 'Service Events',
            icon: 'handyman' as const,
            helpText: 'on Assets',
            onPress: () => runMenuAction(onSearchServiceHistory),
          },
        ]
      : []),
    ...(hasAssets || hasInteractions || hasServices
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

  return (
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <View style={sharedStyles.screenHeader}>
        <View style={[sharedStyles.headerRow, { marginBottom: 0, alignItems: 'flex-start' }]}>
          <Text style={[sharedStyles.title, { flex: 1, fontSize: 22 }]}>
            Property Asset Manager
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ToolbarNewSearchControls
              title="Property Asset Manager"
              newItems={homeNewItems}
              searchItems={homeSearchItems}
            />
            <Pressable
              onPress={() => setMenuOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Home options"
              accessibilityHint="Opens actions like export or import data."
              hitSlop={6}
              style={({ pressed }) => ({
                padding: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons name="settings" size={24} color={colors.primary} />
            </Pressable>
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 2,
          }}
        >
          <Text style={[sharedStyles.subtitle, { marginBottom: 0, flex: 1 }]}>
            Manage assets and projects on your properties.
          </Text>
          <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>
              Look ahead
            </Text>
            <Pressable
              onPress={openUpcomingHorizonPicker}
              accessibilityRole="button"
              accessibilityLabel={`Look ahead: ${upcomingHorizonLabel(upcomingHorizon)}`}
              accessibilityHint="Opens a list of time ranges for upcoming reminder counts."
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 2,
                opacity: pressed ? 0.7 : 1,
                paddingVertical: 2,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                {upcomingHorizonLabel(upcomingHorizon)}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={22} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={[sharedStyles.content, { paddingTop: 0 }]}>
        {allReminders.length > 0 ? (
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
            expanded={homeRemindersExpanded}
            count={allReminders.length}
            overdueCount={overdueReminderCount}
            onExpand={toggleHomeRemindersExpanded}
          />
          <Pressable
            onPress={toggleHomeRemindersExpanded}
            accessibilityRole="button"
            accessibilityLabel={
              homeRemindersExpanded ? 'Hide reminders' : 'Show reminders'
            }
            accessibilityState={{ expanded: homeRemindersExpanded }}
            hitSlop={6}
            style={({ pressed }) => ({
              padding: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons
              name={homeRemindersExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color={colors.primary}
            />
          </Pressable>
        </View>
        {homeRemindersExpanded ? (
          <View>
            {allReminders.map((entry) => {
              const propertyName = propertyById(state, entry.propertyId)?.name;
              if (entry.kind === 'event') {
                const e = entry.event;
                const item = itemById(state, e.itemId);
                const eventPhotos = photosForEvent(state, e.id);
                return (
                  <UpcomingReminderCard
                    key={`event:${e.id}`}
                    title={
                      item
                        ? `${itemDisplayLabel(item)}${e.title?.trim() ? ` · ${e.title.trim()}` : ''}`
                        : e.title?.trim() || 'Service'
                    }
                    dueAtISO={entry.dueAt}
                    notes={e.notes}
                    thumbnailUri={eventPhotos[0]?.localUri}
                    scopeLabel={propertyName}
                    onPress={() => onOpenEvent(e.itemId, e.id)}
                    noun="service"
                  />
                );
              }
              if (entry.kind === 'interaction') {
                const interaction = entry.interaction;
                const vendor = interaction.vendorId
                  ? vendorById(state, interaction.vendorId)
                  : undefined;
                const interactionPhotos = photosForVendorInteraction(
                  state,
                  interaction.id
                );
                const methodLabel = vendorContactMethodLabel(interaction.contactMethod);
                const notesParts = [methodLabel, interaction.notes?.trim()].filter(Boolean);
                return (
                  <UpcomingReminderCard
                    key={`interaction:${interaction.id}`}
                    title={
                      vendor?.name?.trim() ||
                      interaction.contactName?.trim() ||
                      'Interaction'
                    }
                    dueAtISO={interaction.occurredAtISO}
                    notes={notesParts.join(' · ') || undefined}
                    thumbnailUri={
                      interactionPhotos[0]?.localUri ??
                      (vendor ? firstPhotoUriForVendor(state, vendor) : undefined)
                    }
                    scopeLabel={propertyName}
                    onPress={() =>
                      onOpenInteraction(
                        interaction.vendorId,
                        interaction.id,
                        entry.propertyId
                      )
                    }
                    noun="interaction"
                    important={interaction.important === true}
                  />
                );
              }
              const todo = entry.todo;
              const todoPhotos = photosForPropertyTodo(state, todo.id);
              return (
                <UpcomingReminderCard
                  key={`todo:${todo.id}`}
                  title={todo.title}
                  dueAtISO={todo.dueAtISO}
                  notes={todo.notes}
                  thumbnailUri={todoPhotos[0]?.localUri}
                  scopeLabel={propertyName}
                  onPress={() => onOpenTodo(entry.propertyId, todo.id)}
                  noun="to-do"
                />
              );
            })}
          </View>
        ) : null}
          </View>
        ) : null}
        {pinnedItems.length > 0 ? (
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
            title="Pinned"
            expanded={pinsExpanded}
            count={pinnedItems.length}
            onExpand={togglePinsExpanded}
          />
          <Pressable
            onPress={togglePinsExpanded}
            accessibilityRole="button"
            accessibilityLabel={pinsExpanded ? 'Hide pinned' : 'Show pinned'}
            accessibilityState={{ expanded: pinsExpanded }}
            hitSlop={6}
            style={({ pressed }) => ({
              padding: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons
              name={pinsExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color={colors.primary}
            />
          </Pressable>
        </View>
        {pinsExpanded ? (
          <View>
            {pinnedItems.map((pin) => {
              if (pin.kind === 'property') {
                const property = propertyById(state, pin.id);
                if (!property) return null;
                return (
                  <PropertyListRow
                    key={`${pin.kind}:${pin.id}`}
                    name={property.name}
                    address={property.address}
                    thumbnailUri={propertyCoverPhotoUri(state, property)}
                    projectCount={projectsForProperty(state, property.id).length}
                    todoCount={todosForProperty(state, property.id).length}
                    overdueCount={safeCompute(() => overdueCountForProperty(state, property.id), 0)}
                    reminderCount={safeCompute(
                      () => upcomingReminderCountForProperty(state, property.id, upcomingHorizon),
                      0
                    )}
                    dueSoonPeriodLabel={periodLabel}
                    onPress={() => openPinned(pin)}
                  />
                );
              }
              if (pin.kind === 'project') {
                const project = projectById(state, pin.id);
                if (!project) return null;
                const vendors = vendorsForProject(state, project.id);
                const waitingForQuoteCount = vendors.filter(
                  (v) => v.status === 'waiting_for_quote'
                ).length;
                const propertyName = propertyById(state, project.propertyId)?.name;
                return (
                  <ProjectListRow
                    key={`${pin.kind}:${pin.id}`}
                    name={project.name}
                    scopeLabel={propertyName}
                    thumbnailUri={firstPhotoUriForProject(state, project)}
                    vendorCount={vendors.length}
                    waitingForQuoteCount={waitingForQuoteCount}
                    statusLabel={projectStatusLabel(project.status ?? 'research')}
                    statusColor={projectStatusColor(project.status ?? 'research')}
                    totalCostLabel={
                      project.totalCost != null
                        ? formatCurrency(project.totalCost)
                        : undefined
                    }
                    onPress={() => openPinned(pin)}
                    card
                  />
                );
              }
              if (pin.kind === 'room') {
                const room = roomById(state, pin.id);
                if (!room) return null;
                const propertyName = propertyById(state, room.propertyId)?.name;
                return (
                  <RoomListRow
                    key={`${pin.kind}:${pin.id}`}
                    name={room.name}
                    scopeLabel={propertyName}
                    thumbnailUri={firstPhotoUriForRoom(state, room)}
                    itemCount={itemsForRoom(state, room.id).length}
                    overdueCount={safeCompute(() => overdueCountForRoom(state, room.id), 0)}
                    upcomingCount={safeCompute(
                      () => upcomingNotOverdueCountForRoom(state, room.id, upcomingHorizon),
                      0
                    )}
                    requiresAuth={room.requiresAuth}
                    onPress={() => openPinned(pin)}
                  />
                );
              }
              if (pin.kind === 'item') {
                const item = itemById(state, pin.id);
                if (!item) return null;
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
                    key={`${pin.kind}:${pin.id}`}
                    label={label}
                    nameLabel={nameLabel}
                    scopeLabel={scopeLabel}
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
                    overdue={safeCompute(() => isItemOverdue(state, item.id), false)}
                    onPress={() => openPinned(pin)}
                    cardBackgroundColor={colors.historyCardBg}
                    cornerIcon="inventory"
                  />
                );
              }
              if (pin.kind === 'event') {
                const event = state.events.find((e) => e.id === pin.id);
                if (!event) return null;
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
                const scopeLabel =
                  eventProperty && eventRoom && eventProperty.name !== eventRoom.name
                    ? `${eventProperty.name} · ${eventRoom.name}`
                    : (eventProperty?.name ?? eventRoom?.name);
                return (
                  <PropertyServiceListRow
                    key={`${pin.kind}:${pin.id}`}
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
                    photoUri={photo?.localUri}
                    onPress={() => openPinned(pin)}
                    onPressItem={() => onOpenItem(event.itemId)}
                    cardBackgroundColor={colors.upcomingCardBg}
                    ownerBackgroundColor={colors.upcomingInteractionOwnerBg}
                    ownerCornerIcon="inventory"
                    cornerIcon="handyman"
                  />
                );
              }
              if (pin.kind === 'vendor') {
                const vendor = vendorById(state, pin.id);
                if (!vendor) return null;
                const project = projectById(state, vendor.projectId);
                const propertyName = project
                  ? propertyById(state, project.propertyId)?.name
                  : undefined;
                const lastInteraction = interactionsForVendor(state, vendor.id)[0];
                const lastInteractionPhoto = lastInteraction
                  ? photosForVendorInteraction(state, lastInteraction.id)[0]
                  : undefined;
                const scopeLabel = [propertyName, project?.name].filter(Boolean).join(' · ');
                return (
                  <VendorListRow
                    key={`${pin.kind}:${pin.id}`}
                    name={vendor.name}
                    scopeLabel={scopeLabel || undefined}
                    contactName={vendor.contactName}
                    phone={vendor.phone}
                    statusLabel={vendorStatusLabel(vendor.status)}
                    statusColor={vendorStatusColor(vendor.status)}
                    notesPreview={vendor.notes?.trim() || undefined}
                    thumbnailUri={firstPhotoUriForVendor(state, vendor)}
                    lastInteractionAtISO={lastInteraction?.occurredAtISO}
                    lastInteractionTitle={
                      lastInteraction
                        ? vendorContactMethodLabel(lastInteraction.contactMethod)
                        : undefined
                    }
                    lastInteractionNotes={lastInteraction?.notes}
                    lastInteractionPhotoUri={lastInteractionPhoto?.localUri}
                    onPress={() => openPinned(pin)}
                    onPressLastInteraction={
                      lastInteraction
                        ? () => {
                            const propertyId =
                              propertyIdForInteraction(state, lastInteraction) ??
                              project?.propertyId;
                            if (!propertyId) return;
                            onOpenInteraction(
                              lastInteraction.vendorId,
                              lastInteraction.id,
                              propertyId
                            );
                          }
                        : undefined
                    }
                    cardBackgroundColor={colors.helpBg}
                    imageBackgroundColor={colors.helpBg}
                  />
                );
              }
              if (pin.kind === 'todo') {
                const todo = state.propertyTodos.find((t) => t.id === pin.id);
                if (!todo) return null;
                const todoProperty = propertyById(state, todo.propertyId);
                const photo = photosForPropertyTodo(state, todo.id)[0];
                const dueLabel = todo.dueAtISO
                  ? formatDisplayDate(todo.dueAtISO)
                  : undefined;
                const kind = todo.kind === 'idea' ? 'idea' : 'todo';
                const notes = todoProperty
                  ? [todoProperty.name, todo.notes?.trim()].filter(Boolean).join(' · ')
                  : todo.notes;
                return (
                  <PropertyTodoListRow
                    key={`${pin.kind}:${pin.id}`}
                    title={todo.title}
                    dueLabel={dueLabel}
                    notes={notes}
                    done={todo.done}
                    thumbnailUri={photo?.localUri}
                    variant={kind}
                    onPress={() => openPinned(pin)}
                    cardBackgroundColor={colors.historyCardBg}
                    cornerIcon={kind === 'idea' ? 'notes' : 'checklist'}
                  />
                );
              }
              if (pin.kind === 'punch') {
                const punchItem = projectPunchItemById(state, pin.id);
                if (!punchItem) return null;
                const punchProject = projectById(state, punchItem.projectId);
                const punchProperty = punchProject
                  ? propertyById(state, punchProject.propertyId)
                  : undefined;
                const photo = photosForPunchItem(state, punchItem.id)[0];
                const dueLabel = punchItem.dueAtISO
                  ? formatDisplayDate(punchItem.dueAtISO)
                  : undefined;
                const notes = [
                  punchProperty?.name,
                  punchProject?.name,
                  punchItem.notes?.trim(),
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <PropertyTodoListRow
                    key={`${pin.kind}:${pin.id}`}
                    title={punchItem.title}
                    dueLabel={dueLabel}
                    notes={notes || undefined}
                    done={punchItem.done}
                    thumbnailUri={photo?.localUri}
                    onPress={() => openPinned(pin)}
                    cardBackgroundColor={colors.historyCardBg}
                    cornerIcon="assignment"
                  />
                );
              }
              const interaction = state.vendorInteractions.find((i) => i.id === pin.id);
              if (!interaction) return null;
              const vendor = interaction.vendorId
                ? vendorById(state, interaction.vendorId)
                : undefined;
              const photo = photosForVendorInteraction(state, interaction.id)[0];
              const vendorProjectId = projectIdForInteraction(state, interaction);
              const vendorProject = vendorProjectId
                ? projectById(state, vendorProjectId)
                : undefined;
              const interactionPropertyId = propertyIdForInteraction(state, interaction);
              const interactionProperty = interactionPropertyId
                ? propertyById(state, interactionPropertyId)
                : undefined;
              const methodLabel = vendorContactMethodLabel(interaction.contactMethod);
              const scopeLabel =
                interactionProperty &&
                vendorProject &&
                interactionProperty.name !== vendorProject.name
                  ? `${interactionProperty.name} · ${vendorProject.name}`
                  : (interactionProperty?.name ?? vendorProject?.name);
              return (
                <PropertyInteractionListRow
                  key={`${pin.kind}:${pin.id}`}
                  projectName={scopeLabel}
                  contactName={interaction.contactName}
                  companyName={vendor?.name ?? 'No vendor'}
                  companyPhotoUri={
                    vendor ? firstPhotoUriForVendor(state, vendor) : undefined
                  }
                  hideCompanyPhoto={!vendor}
                  vendorStatusLabel={vendor ? vendorStatusLabel(vendor.status) : undefined}
                  vendorStatusColor={vendor ? vendorStatusColor(vendor.status) : undefined}
                  dateISO={interaction.occurredAtISO}
                  methodLabel={methodLabel}
                  notes={interaction.notes}
                  photoUri={photo?.localUri}
                  important={interaction.important === true}
                  onPress={() => openPinned(pin)}
                  onPressVendor={vendor ? () => onOpenVendor(vendor.id) : undefined}
                  cardBackgroundColor={colors.bg}
                  ownerBackgroundColor={colors.interactionOwnerBg}
                  ownerCornerIcon="storefront"
                  cornerIcon="forum"
                  stackRelative
                />
              );
            })}
          </View>
        ) : null}
          </View>
        ) : null}
        {activeProjects.length > 0 ? (
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
              title="Projects"
              expanded={projectsExpanded}
              count={activeProjects.length}
              onExpand={toggleProjectsExpanded}
            />
            <Pressable
              onPress={openAddProject}
              accessibilityRole="button"
              accessibilityLabel="New Project"
              hitSlop={6}
              style={({ pressed }) => ({
                padding: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons name="add" size={24} color={colors.primary} />
            </Pressable>
          </View>
          <Pressable
            onPress={toggleProjectsExpanded}
            accessibilityRole="button"
            accessibilityLabel={projectsExpanded ? 'Hide projects' : 'Show projects'}
            accessibilityState={{ expanded: projectsExpanded }}
            hitSlop={6}
            style={({ pressed }) => ({
              padding: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons
              name={projectsExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color={colors.primary}
            />
          </Pressable>
        </View>
        {projectsExpanded ? (
          activeProjects.map((project, index) => {
              const vendors = vendorsForProject(state, project.id);
              const waitingForQuoteCount = vendors.filter(
                (v) => v.status === 'waiting_for_quote'
              ).length;
              const propertyName = propertyById(state, project.propertyId)?.name;
              return (
                <ProjectListRow
                  key={project.id}
                  name={project.name}
                  scopeLabel={propertyName}
                  thumbnailUri={firstPhotoUriForProject(state, project)}
                  vendorCount={vendors.length}
                  waitingForQuoteCount={waitingForQuoteCount}
                  statusLabel={projectStatusLabel(project.status ?? 'research')}
                  statusColor={projectStatusColor(project.status ?? 'research')}
                  totalCostLabel={
                    project.totalCost != null
                      ? formatCurrency(project.totalCost)
                      : undefined
                  }
                  onPress={() => onOpenProject(project.id)}
                  card
                  striped={index % 2 === 1}
                />
              );
            })
        ) : null}
          </View>
        ) : null}
        {sorted.length > 0 ? (
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
              title="Properties"
              expanded={propertiesExpanded}
              count={sorted.length}
              onExpand={togglePropertiesExpanded}
            />
            <Pressable
              onPress={openAdd}
              accessibilityRole="button"
              accessibilityLabel="New Property"
              hitSlop={6}
              style={({ pressed }) => ({
                padding: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons name="add" size={24} color={colors.primary} />
            </Pressable>
          </View>
          <Pressable
            onPress={togglePropertiesExpanded}
            accessibilityRole="button"
            accessibilityLabel={propertiesExpanded ? 'Hide properties' : 'Show properties'}
            accessibilityState={{ expanded: propertiesExpanded }}
            hitSlop={6}
            style={({ pressed }) => ({
              padding: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons
              name={propertiesExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color={colors.primary}
            />
          </Pressable>
        </View>
        {propertiesExpanded ? (
          sorted.map((p, index) => {
            const projects = projectsForProperty(state, p.id);
            const todos = todosForProperty(state, p.id);
            const remindersExpanded = expandedReminderPropertyId === p.id;
            const reminderEntries = remindersExpanded
              ? upcomingReminderEntriesForProperty(state, p.id, upcomingHorizon)
              : [];
            return (
              <PropertyListRow
                key={p.id}
                name={p.name}
                address={p.address}
                thumbnailUri={propertyCoverPhotoUri(state, p)}
                projectCount={projects.length}
                todoCount={todos.length}
                overdueCount={safeCompute(() => overdueCountForProperty(state, p.id), 0)}
                reminderCount={safeCompute(
                  () => upcomingReminderCountForProperty(state, p.id, upcomingHorizon),
                  0
                )}
                dueSoonPeriodLabel={periodLabel}
                striped={index % 2 === 1}
                remindersExpanded={remindersExpanded}
                onToggleReminders={() =>
                  setExpandedReminderPropertyId((current) =>
                    current === p.id ? null : p.id
                  )
                }
                onPress={() => onOpenProperty(p.id)}
              >
                {reminderEntries.map((entry) => {
                  if (entry.kind === 'event') {
                    const e = entry.event;
                    const item = itemById(state, e.itemId);
                    const eventPhotos = photosForEvent(state, e.id);
                    return (
                      <UpcomingReminderCard
                        key={`event:${e.id}`}
                        title={
                          item
                            ? `${itemDisplayLabel(item)}${e.title?.trim() ? ` · ${e.title.trim()}` : ''}`
                            : e.title?.trim() || 'Service'
                        }
                        dueAtISO={entry.dueAt}
                        notes={e.notes}
                        thumbnailUri={eventPhotos[0]?.localUri}
                        onPress={() => onOpenEvent(e.itemId, e.id)}
                        noun="service"
                      />
                    );
                  }
                  if (entry.kind === 'interaction') {
                    const interaction = entry.interaction;
                    const vendor = interaction.vendorId
                      ? vendorById(state, interaction.vendorId)
                      : undefined;
                    const interactionPhotos = photosForVendorInteraction(
                      state,
                      interaction.id
                    );
                    const methodLabel = vendorContactMethodLabel(interaction.contactMethod);
                    const notesParts = [methodLabel, interaction.notes?.trim()].filter(Boolean);
                    return (
                      <UpcomingReminderCard
                        key={`interaction:${interaction.id}`}
                        title={
                          vendor?.name?.trim() ||
                          interaction.contactName?.trim() ||
                          'Interaction'
                        }
                        dueAtISO={interaction.occurredAtISO}
                        notes={notesParts.join(' · ') || undefined}
                        thumbnailUri={
                          interactionPhotos[0]?.localUri ??
                          (vendor ? firstPhotoUriForVendor(state, vendor) : undefined)
                        }
                        onPress={() =>
                          onOpenInteraction(interaction.vendorId, interaction.id, p.id)
                        }
                        noun="interaction"
                        important={interaction.important === true}
                      />
                    );
                  }
                  const todo = entry.todo;
                  const todoPhotos = photosForPropertyTodo(state, todo.id);
                  return (
                    <UpcomingReminderCard
                      key={`todo:${todo.id}`}
                      title={todo.title}
                      dueAtISO={todo.dueAtISO}
                      notes={todo.notes}
                      thumbnailUri={todoPhotos[0]?.localUri}
                      onPress={() => onOpenTodo(p.id, todo.id)}
                      noun="to-do"
                    />
                  );
                })}
              </PropertyListRow>
            );
          })
        ) : null}
          </View>
        ) : null}
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
                Property Asset Manager
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
              onPress={() => runMenuAction(onOpenImport)}
              accessibilityRole="button"
              accessibilityLabel="Import data"
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                Import data
              </Text>
            </Pressable>
            <Pressable
              onPress={() => runMenuAction(onOpenExport)}
              accessibilityRole="button"
              accessibilityLabel="Export data"
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                Export data
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

      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={{ flex: 1 }}>
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
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  borderWidth: StyleSheet.hairlineWidth,
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
                  ref={propertySheetScrollRef}
                  onScroll={onPropertySheetScroll}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                  bounces={false}
                  contentContainerStyle={{ paddingBottom: propertySheetBottomInset }}
                >
                  <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>New property</Text>
                  <Text style={sharedStyles.fieldLabel}>Name</Text>
                  <TextInput
                    ref={nameInputRef}
                    value={name}
                    onChangeText={setName}
                    placeholder="Unit 1, Main Street duplex…"
                    style={sharedStyles.input}
                    {...keyboardDone.getTextInputProps({
                      onFocus: () => measurePropertySheetField(nameInputRef.current),
                    })}
                  />
                  <Text style={sharedStyles.fieldLabel}>Address (optional)</Text>
                  <TextInput
                    ref={addressInputRef}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="123 Main St"
                    style={sharedStyles.input}
                    {...keyboardDone.getTextInputProps({
                      onFocus: () => measurePropertySheetField(addressInputRef.current),
                    })}
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
                      <Text style={[sharedStyles.fieldLabel, { marginTop: 0 }]}>
                        Use default layout
                      </Text>
                      <Text style={sharedStyles.cardMeta}>
                        Adds standard rooms and inventory assets (from 24 Cedar Road layout).
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
          {keyboardDone.accessory}
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
                  {newProjectPropertyId && sorted.length > 1 ? (
                    <Text style={[sharedStyles.cardMeta, { marginBottom: 8 }]}>
                      {propertyById(state, newProjectPropertyId)?.name}
                    </Text>
                  ) : null}
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
                    onPress={saveNewProject}
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
    </View>
  );
}
