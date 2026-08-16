import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { ScrollView as RNScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, PropertyTodo } from '../types';
import {
  ProjectGalleryTile,
  ProjectListRow,
  PropertyInteractionListRow,
  PropertyServiceListRow,
  PropertyTodoListRow,
  RoomGalleryTile,
  RoomListRow,
} from '../components/ListRows';
import { UpcomingReminderCard, UpcomingServiceCard } from '../components/UpcomingServiceCard';
import { PropertyPhotosSection } from '../components/PropertyPhotosSection';
import { ReuseExistingPhotosProvider } from '../components/ReuseExistingPhotosProvider';
import {
  ToolbarNewSearchControls,
  usePropertyGearNav,
} from '../components/PropertyGearNavItems';
import { RenameModal } from '../components/RenameModal';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { CollapsibleSectionTitle } from '../components/CollapsibleSectionTitle';
import { ActivityBucketBanner } from '../components/ActivityBucketBanner';
import { sharedStyles, colors } from '../theme';
import { formatCurrency, formatDisplayDate, nowISO, uid } from '../utils';
import {
  deletePropertyCascade,
  eventsForProperty,
  firstPhotoUriForItem,
  itemById,
  photosForEvent,
  ideasForProperty,
  interactionsForProperty,
  photosForPropertyTodo,
  projectsForProperty,
  propertyById,
  roomById,
  roomsForProperty,
  todosForProperty,
  vendorsForProject,
  vendorById,
  photosForVendorInteraction,
} from '../storage';
import { overdueCountForRoom } from '../itemMaintenance';
import { itemDisplayLabel } from '../itemCatalog';
import { firstPhotoUriForRoom } from '../roomPhotos';
import { projectStatusColor, projectStatusLabel } from '../projectStatus';
import { firstPhotoUriForProject } from '../projectPhotos';
import { firstPhotoUriForVendor } from '../vendorPhotos';
import { vendorContactMethodLabel } from '../vendorContactMethod';
import { vendorStatusColor, vendorStatusLabel } from '../vendorStatus';
import { slideshowPhotosForProperty, type PropertyCatalogPhoto } from '../propertyFavoritePhotos';
import { PhotoViewerModal, type ViewerPhoto } from '../components/PhotoViewerModal';
import { SlideshowEditorModal } from '../components/SlideshowEditorModal';
import { PropertyAllPhotosModal } from '../components/PropertyAllPhotosModal';
import {
  filterInteractionsByHorizon,
  filterTodosByHorizon,
  filterUpcomingByHorizon,
  isAfterToday,
  isToday,
  serviceListDateISO,
  upcomingDueAtISO,
  upcomingHorizonLabel,
  upcomingInteractionsForProperty,
  upcomingNotOverdueCountForRoom,
  upcomingServiceEventsForProperty,
  upcomingTodosForProperty,
  UPCOMING_HORIZON_OPTIONS,
  type UpcomingHorizon,
} from '../eventRecurrence';
import {
  getPropertyUpcomingHorizon,
  loadPropertyUpcomingHorizon,
  setPropertyUpcomingHorizon,
} from '../upcomingHorizonPrefs';
import {
  getPropertyScrollPrefs,
  setPropertyScrollPrefs,
} from '../propertyScrollPrefs';
import {
  getPropertyRoomViewMode,
  loadPropertyRoomViewMode,
  setPropertyRoomViewMode,
  type PropertyRoomViewMode,
} from '../propertyRoomViewPrefs';
import {
  getPropertyProjectViewMode,
  loadPropertyProjectViewMode,
  setPropertyProjectViewMode,
  type PropertyProjectViewMode,
} from '../propertyProjectViewPrefs';
import { Text, useTextScaleControls } from '../textScale';
import {
  buildPropertyExportSnapshot,
  PROPERTY_SHARE_PRESET_ALL,
  type PropertyExportInclude,
  type PropertyExportSnapshot,
} from '../propertyExportContent';
import { PropertyExportSheet } from '../components/PropertyExportSheet';
import { PropertyShareOptionsModal } from '../components/PropertyShareOptionsModal';
import { SectionHelpTip } from '../components/SectionHelpTip';
import { DEFAULT_SHARE_FORMAT, type ShareFormat } from '../shareFormat';
import { shareViewAsPng } from '../shareViewImage';
import { shareHtmlAsPdf } from '../shareViewPdf';
import { buildExportPdfHtml, propertySnapshotToPdfDoc } from '../exportPdfHtml';
import {
  getSectionHelpVisible,
  loadSectionHelpVisible,
  setSectionHelpVisible,
} from '../sectionHelpPrefs';
import {
  getPropertySectionExpand,
  setPropertySectionExpand,
} from '../propertySectionExpandPrefs';
import {
  consumeSearchPhotosReopen,
  markSearchPhotosReopen,
} from '../propertySearchPhotosPrefs';
import {
  activitySearchScopeKey,
  setActivitySearchPrefs,
} from '../activitySearchPrefs';

export function PropertyDetailScreen(props: {
  state: AppState;
  propertyId: string;
  onBack: () => void;
  onOpenRoom: (roomId: string) => void;
  onOpenProject: (projectId: string) => void;
  onOpenInteractions: () => void;
  onSearchInteractions: () => void;
  onOpenServices: () => void;
  onSearchServiceHistory: () => void;
  onSearchActivity: () => void;
  onOpenAssets: () => void;
  onSearchAssets: () => void;
  onOpenTodo: (
    todoId: string,
    options?: { startEditing?: boolean; kind?: 'todo' | 'idea' }
  ) => void;
  onOpenInteraction: (vendorId: string | undefined, interactionId: string) => void;
  onOpenVendor: (vendorId: string) => void;
  onAddInteraction: () => void;
  onAddServiceEvent: () => void;
  onOpenItem: (itemId: string, startEditingSection?: 'appliance' | 'purchase' | 'repair') => void;
  onEditEvent: (itemId: string, eventId: string) => void;
  onLogUpcomingService: (itemId: string, completeFromEventId: string) => void;
  onSave: (state: AppState) => void;
}) {
  const {
    state,
    propertyId,
    onBack,
    onOpenRoom,
    onOpenProject,
    onOpenInteractions,
    onSearchInteractions,
    onOpenServices,
    onSearchServiceHistory,
    onSearchActivity,
    onSearchAssets,
    onOpenTodo,
    onOpenInteraction,
    onOpenVendor,
    onAddInteraction,
    onAddServiceEvent,
    onOpenItem,
    onEditEvent,
    onLogUpcomingService,
    onSave,
  } = props;
  const insets = useSafeAreaInsets();
  const property = propertyById(state, propertyId);
  const rooms = roomsForProperty(state, propertyId);
  const projects = projectsForProperty(state, propertyId);
  const todos = todosForProperty(state, propertyId);
  const ideas = ideasForProperty(state, propertyId);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [addTodoOpen, setAddTodoOpen] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [addIdeaOpen, setAddIdeaOpen] = useState(false);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [exportSnapshot, setExportSnapshot] = useState<PropertyExportSnapshot | null>(null);
  const [sharingPng, setSharingPng] = useState(false);
  const [shareOptionsOpen, setShareOptionsOpen] = useState(false);
  const [shareInclude, setShareInclude] = useState<PropertyExportInclude>(PROPERTY_SHARE_PRESET_ALL);
  const [shareFormat, setShareFormat] = useState<ShareFormat>(DEFAULT_SHARE_FORMAT);
  const exportRef = useRef<View>(null);
  const savedScrollPrefs = getPropertyScrollPrefs(propertyId);
  const scrollRef = useRef<RNScrollView>(null);
  const scrollYRef = useRef(savedScrollPrefs.scrollY);
  const pendingRestoreScrollYRef = useRef<number | null>(
    savedScrollPrefs.scrollY > 0 ? savedScrollPrefs.scrollY : null
  );
  const didRestoreScrollRef = useRef(savedScrollPrefs.scrollY <= 0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReorderArrows, setShowReorderArrows] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState<number | null>(null);
  const [slideshowEditorOpen, setSlideshowEditorOpen] = useState(false);
  const [allPhotosOpen, setAllPhotosOpen] = useState(() =>
    consumeSearchPhotosReopen(propertyId)
  );
  /** Snapshot used while the viewer is open so Play uses the order just committed. */
  const [slideshowPlayPhotos, setSlideshowPlayPhotos] = useState<ViewerPhoto[] | null>(null);
  /** When Play was started from Search photos, ← Back returns there. */
  const slideshowReturnToSearchPhotosRef = useRef(false);
  const [upcomingHorizon, setUpcomingHorizon] = useState<UpcomingHorizon>(
    getPropertyUpcomingHorizon
  );
  const [roomViewMode, setRoomViewMode] = useState<PropertyRoomViewMode>(getPropertyRoomViewMode);
  const [projectViewMode, setProjectViewMode] = useState<PropertyProjectViewMode>(
    getPropertyProjectViewMode
  );
  const [helpVisible, setHelpVisible] = useState(getSectionHelpVisible);
  const [photosExpanded, setPhotosExpanded] = useState(
    () => getPropertySectionExpand(propertyId).photos
  );
  const [remindersExpanded, setRemindersExpanded] = useState(
    () => getPropertySectionExpand(propertyId).reminders
  );
  const [projectsExpanded, setProjectsExpanded] = useState(
    () => getPropertySectionExpand(propertyId).projects
  );
  const [roomsExpanded, setRoomsExpanded] = useState(
    () => getPropertySectionExpand(propertyId).rooms
  );
  const [todosExpanded, setTodosExpanded] = useState(
    () => getPropertySectionExpand(propertyId).todos
  );
  const [ideasExpanded, setIdeasExpanded] = useState(
    () => getPropertySectionExpand(propertyId).ideas
  );
  const [recentActivityExpanded, setRecentActivityExpanded] = useState(
    () => getPropertySectionExpand(propertyId).recentActivity
  );
  const [activityFutureExpanded, setActivityFutureExpanded] = useState(
    () => getPropertySectionExpand(propertyId).activityFuture
  );
  const [activityTodayExpanded, setActivityTodayExpanded] = useState(
    () => getPropertySectionExpand(propertyId).activityToday
  );
  const [activityHistoryExpanded, setActivityHistoryExpanded] = useState(
    () => getPropertySectionExpand(propertyId).activityHistory
  );
  const textScaleControls = useTextScaleControls();

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    // Let the menu dismiss before opening another alert/modal.
    setTimeout(action, 50);
  }

  const {
    newItems: propertyNewItems,
    searchItems: propertySearchItems,
    createModals: propertyGearCreateModals,
    openAddRoom,
    openAddProject,
  } = usePropertyGearNav({
    state,
    propertyId,
    runMenuAction,
    actions: {
      onAddInteraction,
      onAddServiceEvent,
      onSearchAssets,
      onSearchInteractions,
      onSearchServiceHistory,
      onSearchActivity,
      onSearchPhotos: openAllPhotos,
      onOpenProject,
      onOpenItem,
      onSave,
    },
  });

  useEffect(() => {
    const prefs = getPropertyScrollPrefs(propertyId);
    scrollYRef.current = prefs.scrollY;
    pendingRestoreScrollYRef.current = prefs.scrollY > 0 ? prefs.scrollY : null;
    didRestoreScrollRef.current = prefs.scrollY <= 0;
  }, [propertyId]);

  useEffect(() => {
    return () => {
      setPropertyScrollPrefs(propertyId, { scrollY: scrollYRef.current });
    };
  }, [propertyId]);

  // Fallback if content never grows past saved y (shorter page after edits).
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
  }, [propertyId]);

  useEffect(() => {
    let cancelled = false;
    void loadPropertyUpcomingHorizon().then((horizon) => {
      if (!cancelled) setUpcomingHorizon(horizon);
    });
    void loadPropertyRoomViewMode().then((mode) => {
      if (!cancelled) setRoomViewMode(mode);
    });
    void loadPropertyProjectViewMode().then((mode) => {
      if (!cancelled) setProjectViewMode(mode);
    });
    void loadSectionHelpVisible().then((visible) => {
      if (!cancelled) setHelpVisible(visible);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const expand = getPropertySectionExpand(propertyId);
    setPhotosExpanded(expand.photos);
    setRemindersExpanded(expand.reminders);
    setProjectsExpanded(expand.projects);
    setRoomsExpanded(expand.rooms);
    setTodosExpanded(expand.todos);
    setIdeasExpanded(expand.ideas);
    setRecentActivityExpanded(expand.recentActivity);
    setActivityFutureExpanded(expand.activityFuture);
    setActivityTodayExpanded(expand.activityToday);
    setActivityHistoryExpanded(expand.activityHistory);
  }, [propertyId]);

  const openShareOptions = useCallback(() => {
    setShareInclude({ ...PROPERTY_SHARE_PRESET_ALL });
    setShareFormat(DEFAULT_SHARE_FORMAT);
    setShareOptionsOpen(true);
  }, []);

  const runPropertyImageExport = useCallback(
    async (include: PropertyExportInclude, format: ShareFormat) => {
      if (!Object.values(include).some(Boolean)) {
        Alert.alert('Nothing selected', 'Choose at least one section to include.');
        return;
      }
      const snapshot = buildPropertyExportSnapshot(state, propertyId, { include });
      if (!snapshot) {
        Alert.alert('Export failed', 'Could not build property summary.');
        return;
      }
      setShareOptionsOpen(false);
      if (format === 'pdf') {
        setSharingPng(true);
        try {
          const html = await buildExportPdfHtml(propertySnapshotToPdfDoc(snapshot));
          await shareHtmlAsPdf(html, `Share ${snapshot.title}`);
        } finally {
          setSharingPng(false);
        }
        return;
      }
      setExportSnapshot(snapshot);
      setSharingPng(true);
    },
    [propertyId, state]
  );

  useEffect(() => {
    if (!exportSnapshot || !sharingPng) return;

    let cancelled = false;
    // Give the off-screen sheet (and its images) time to lay out before capture.
    const timer = setTimeout(() => {
      void (async () => {
        await shareViewAsPng(exportRef, `Share ${exportSnapshot.title}`);
        if (!cancelled) {
          setExportSnapshot(null);
          setSharingPng(false);
        }
      })();
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [exportSnapshot, sharingPng]);

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
  const favoritePhotos = slideshowPhotosForProperty(state, propertyId);
  const slideshowPhotosFromState: ViewerPhoto[] = favoritePhotos.map((photo) => ({
    id: photo.id,
    uri: photo.uri,
    label: photo.label,
    notes: photo.notes,
    onDelete: () => {},
  }));
  const slideshowPhotos = slideshowPlayPhotos ?? slideshowPhotosFromState;

  function openSlideshowEditor() {
    setSlideshowEditorOpen(true);
  }

  function openAllPhotos() {
    setAllPhotosOpen(true);
  }

  function closeSlideshow() {
    setSlideshowIndex(null);
    setSlideshowPlayPhotos(null);
    if (slideshowReturnToSearchPhotosRef.current) {
      slideshowReturnToSearchPhotosRef.current = false;
      setAllPhotosOpen(true);
    }
  }

  /** Slideshow: ← Back exits. Swipe or Previous/Next change photos. */
  function handleHeaderBack() {
    if (slideshowIndex != null) {
      closeSlideshow();
      return;
    }
    onBack();
  }

  function playFavoriteSlideshow(playState?: AppState) {
    const source = playState ?? state;
    const photos = slideshowPhotosForProperty(source, propertyId);
    if (photos.length === 0) {
      Alert.alert(
        'No slideshow photos',
        'Add photos in Slideshow, or mark photos as favorites with the star on property, room, or asset heroes.'
      );
      return;
    }
    if (playState) {
      onSave(playState);
    }
    slideshowReturnToSearchPhotosRef.current = false;
    setSlideshowPlayPhotos(
      photos.map((photo) => ({
        id: photo.id,
        uri: photo.uri,
        label: photo.label,
        notes: photo.notes,
        onDelete: () => {},
      }))
    );
    setSlideshowEditorOpen(false);
    setAllPhotosOpen(false);
    setSlideshowIndex(0);
  }

  function viewAllPropertyPhotos(photos: PropertyCatalogPhoto[], startIndex = 0) {
    if (photos.length === 0) {
      Alert.alert('No photos', 'Add photos on this property, its rooms, or assets first.');
      return;
    }
    const safeIndex = Math.max(0, Math.min(startIndex, photos.length - 1));
    slideshowReturnToSearchPhotosRef.current = true;
    setSlideshowPlayPhotos(
      photos.map((photo) => ({
        id: photo.id,
        uri: photo.uri,
        label: photo.label,
        notes: photo.notes,
        onDelete: () => {},
      }))
    );
    setAllPhotosOpen(false);
    setSlideshowIndex(safeIndex);
  }

  function openPhotoOwner(photo: PropertyCatalogPhoto) {
    markSearchPhotosReopen(propertyId);
    setAllPhotosOpen(false);
    if (photo.itemId) {
      onOpenItem(photo.itemId);
      return;
    }
    if (photo.roomId) {
      onOpenRoom(photo.roomId);
    }
  }

  const upcomingEvents = filterUpcomingByHorizon(
    upcomingServiceEventsForProperty(state, propertyId),
    upcomingHorizon
  );
  const upcomingTodos = filterTodosByHorizon(
    upcomingTodosForProperty(state, propertyId),
    upcomingHorizon
  );
  const upcomingInteractions = filterInteractionsByHorizon(
    upcomingInteractionsForProperty(state, propertyId),
    upcomingHorizon
  );
  type ReminderEntry =
    | { kind: 'event'; id: string; dueAt: string; event: (typeof upcomingEvents)[number] }
    | { kind: 'todo'; id: string; dueAt: string; todo: (typeof upcomingTodos)[number] }
    | {
        kind: 'interaction';
        id: string;
        dueAt: string;
        interaction: (typeof upcomingInteractions)[number];
      };
  const upcomingReminders: ReminderEntry[] = [
    ...upcomingEvents.map((event) => ({
      kind: 'event' as const,
      id: event.id,
      dueAt: upcomingDueAtISO(event)!,
      event,
    })),
    ...upcomingTodos.map((todo) => ({
      kind: 'todo' as const,
      id: todo.id,
      dueAt: todo.dueAtISO!,
      todo,
    })),
    ...upcomingInteractions.map((interaction) => ({
      kind: 'interaction' as const,
      id: interaction.id,
      dueAt: interaction.occurredAtISO,
      interaction,
    })),
  ].sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  type ActivityEntry =
    | {
        kind: 'interaction';
        id: string;
        at: string;
        interaction: ReturnType<typeof interactionsForProperty>[number];
      }
    | {
        kind: 'event';
        id: string;
        at: string;
        event: ReturnType<typeof eventsForProperty>[number];
      };
  const propertyInteractions = interactionsForProperty(state, propertyId);
  const propertyEvents = eventsForProperty(state, propertyId);
  const recentActivityAll: ActivityEntry[] = [
    ...propertyInteractions.map((interaction) => ({
      kind: 'interaction' as const,
      id: interaction.id,
      at: interaction.occurredAtISO,
      interaction,
    })),
    ...propertyEvents.map((event) => ({
      kind: 'event' as const,
      id: event.id,
      at: serviceListDateISO(event),
      event,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const recentActivity = recentActivityAll.slice(0, 10);

  type ActivityBucket = 'future' | 'today' | 'history';
  type ActivityBucketGroup = {
    bucket: ActivityBucket;
    label: string;
    entries: ActivityEntry[];
  };

  function activityBucket(at: string): ActivityBucket {
    if (isAfterToday(at)) return 'future';
    if (isToday(at)) return 'today';
    return 'history';
  }

  const ACTIVITY_BUCKET_LABEL: Record<ActivityBucket, string> = {
    future: 'Future Activity',
    today: 'Today',
    history: 'History',
  };

  const activityBucketCounts: Record<ActivityBucket, number> = {
    future: 0,
    today: 0,
    history: 0,
  };
  for (const entry of recentActivity) {
    activityBucketCounts[activityBucket(entry.at)] += 1;
  }

  const recentActivityGroups: ActivityBucketGroup[] = [];
  for (const entry of recentActivity) {
    const bucket = activityBucket(entry.at);
    const last = recentActivityGroups[recentActivityGroups.length - 1];
    if (!last || last.bucket !== bucket) {
      recentActivityGroups.push({
        bucket,
        label: ACTIVITY_BUCKET_LABEL[bucket],
        entries: [entry],
      });
    } else {
      last.entries.push(entry);
    }
  }

  function isActivityBucketExpanded(bucket: ActivityBucket): boolean {
    if (bucket === 'future') return activityFutureExpanded;
    if (bucket === 'today') return activityTodayExpanded;
    return activityHistoryExpanded;
  }

  function toggleActivityBucket(bucket: ActivityBucket) {
    if (bucket === 'future') {
      const next = !activityFutureExpanded;
      setActivityFutureExpanded(next);
      void setPropertySectionExpand(propertyId, { activityFuture: next });
      return;
    }
    if (bucket === 'today') {
      const next = !activityTodayExpanded;
      setActivityTodayExpanded(next);
      void setPropertySectionExpand(propertyId, { activityToday: next });
      return;
    }
    const next = !activityHistoryExpanded;
    setActivityHistoryExpanded(next);
    void setPropertySectionExpand(propertyId, { activityHistory: next });
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

  function openAddReminderPicker() {
    Alert.alert('New reminder', undefined, [
      { text: 'Service Event', onPress: () => onAddServiceEvent() },
      { text: 'To-do', onPress: () => openAddTodo() },
      { text: 'Interaction', onPress: () => onAddInteraction() },
      { text: 'Cancel', style: 'cancel' },
    ]);
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

  function openAddTodo() {
    setNewTodoTitle('');
    setAddTodoOpen(true);
  }

  function saveNewTodo() {
    const trimmed = newTodoTitle.trim();
    if (!trimmed) {
      Alert.alert('Title required', 'Enter a short title for this to-do.');
      return;
    }
    const todo: PropertyTodo = {
      id: uid('todo'),
      propertyId,
      title: trimmed,
      done: false,
      photoIds: [],
      documentIds: [],
      createdAtISO: nowISO(),
    };
    onSave({ ...state, propertyTodos: [...state.propertyTodos, todo] });
    setAddTodoOpen(false);
    setNewTodoTitle('');
    onOpenTodo(todo.id, { startEditing: true, kind: 'todo' });
  }

  function openAddIdea() {
    setNewIdeaTitle('');
    setAddIdeaOpen(true);
  }

  function saveNewIdea() {
    const trimmed = newIdeaTitle.trim();
    if (!trimmed) {
      Alert.alert('Title required', 'Enter a short title for this idea.');
      return;
    }
    const idea: PropertyTodo = {
      id: uid('todo'),
      propertyId,
      kind: 'idea',
      title: trimmed,
      done: false,
      photoIds: [],
      documentIds: [],
      createdAtISO: nowISO(),
    };
    onSave({ ...state, propertyTodos: [...state.propertyTodos, idea] });
    setAddIdeaOpen(false);
    setNewIdeaTitle('');
    onOpenTodo(idea.id, { startEditing: true, kind: 'idea' });
  }

  function confirmDeleteProperty() {
    const propName = prop.name;
    Alert.alert(
      'Delete property?',
      `Remove "${propName}" and all its rooms, projects, assets, photos, and events?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete permanently',
                  style: 'destructive',
                  onPress: () => {
                    onSave(deletePropertyCascade(state, propertyId));
                    onBack();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  function openPropertyMenu() {
    setMenuOpen(true);
  }

  function toggleHelp() {
    const next = !helpVisible;
    setHelpVisible(next);
    void setSectionHelpVisible(next);
  }

  const slideshowOpen = slideshowIndex != null;

  return (
    <ReuseExistingPhotosProvider state={state} propertyId={propertyId}>
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <ScreenBackHeader onPress={handleHeaderBack}>
        {slideshowOpen ? (
          <Text
            style={{
              marginLeft: 'auto',
              color: colors.textMuted,
              fontSize: 15,
              fontWeight: '600',
            }}
            accessibilityLabel={`Slide ${(slideshowIndex ?? 0) + 1} of ${slideshowPhotos.length}`}
          >
            {(slideshowIndex ?? 0) + 1} / {slideshowPhotos.length}
          </Text>
        ) : (
        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={toggleHelp}
            disabled={sharingPng}
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
                opacity: sharingPng ? 0.6 : 1,
              },
              pressed && !sharingPng && { opacity: 0.8 },
            ]}
          >
            <MaterialIcons
              name={helpVisible ? 'help' : 'help-outline'}
              size={22}
              color={helpVisible ? colors.helpText : colors.primary}
            />
          </Pressable>
          <ToolbarNewSearchControls
            title={prop.name}
            newItems={propertyNewItems}
            searchItems={propertySearchItems}
            disabled={sharingPng}
          />
          <Pressable
            onPress={openPropertyMenu}
            disabled={sharingPng}
            accessibilityRole="button"
            accessibilityLabel="Property options"
            accessibilityHint="Opens actions like play slideshow, share, and delete."
            hitSlop={6}
            style={({ pressed }) => ({
              padding: 4,
              opacity: sharingPng ? 0.5 : pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons name="settings" size={24} color={colors.primary} />
          </Pressable>
        </View>
        )}
      </ScreenBackHeader>
      {helpVisible && !slideshowOpen ? (
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
          Help | New
          {propertySearchItems.length > 0 ? ' | Search' : ''} | Utilities
        </Text>
      ) : null}
      {slideshowOpen ? (
        <PhotoViewerModal
          photos={slideshowPhotos}
          index={slideshowIndex}
          onIndexChange={(index) => {
            if (index == null) {
              closeSlideshow();
              return;
            }
            setSlideshowIndex(index);
          }}
          browseOnly
        />
      ) : (
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[sharedStyles.content, { paddingTop: 0 }]}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          scrollYRef.current = y;
          setPropertyScrollPrefs(propertyId, { scrollY: y });
        }}
        onContentSizeChange={(_w, h) => {
          if (didRestoreScrollRef.current) return;
          const y = pendingRestoreScrollYRef.current;
          if (y == null || y <= 0) {
            didRestoreScrollRef.current = true;
            return;
          }
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
        <PropertyPhotosSection
          state={state}
          property={prop}
          onSave={onSave}
          showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          expanded={photosExpanded}
          onToggleExpanded={() => {
            const next = !photosExpanded;
            setPhotosExpanded(next);
            void setPropertySectionExpand(propertyId, { photos: next });
          }}
        >
          <Pressable
            onLongPress={openRenameProperty}
            accessibilityRole="header"
            accessibilityHint="Long press to rename this property"
          >
            <Text style={sharedStyles.title}>{prop.name}</Text>
          </Pressable>
          {prop.address ? (
            <Text style={sharedStyles.subtitle}>{prop.address}</Text>
          ) : null}
        </PropertyPhotosSection>

        {helpVisible ? (
          <View style={{ marginTop: 8 }}>
            <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 8 }]}>
              Photos
            </Text>
            <SectionHelpTip>
              Fill in the reserved photos of your Property. Quick and easy access to all views of
              your property is very useful to have in your pocket. Use the star symbol under the
              large picture to add it to your slideshow. Add any additional pictures. Long press on
              small photos to change label, notes and delete.
            </SectionHelpTip>
          </View>
        ) : null}

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
              title="Reminders"
              expanded={remindersExpanded}
              count={upcomingReminders.length}
              onExpand={() => {
                const next = !remindersExpanded;
                setRemindersExpanded(next);
                void setPropertySectionExpand(propertyId, { reminders: next });
              }}
            />
            <Pressable
              onPress={openAddReminderPicker}
              accessibilityRole="button"
              accessibilityLabel="Add reminder"
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
              <Text
                style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}
              >
                {upcomingHorizonLabel(upcomingHorizon)}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={22} color={colors.primary} />
            </Pressable>
            {upcomingReminders.length > 0 ? (
              <Pressable
                onPress={() => {
                  const next = !remindersExpanded;
                  setRemindersExpanded(next);
                  void setPropertySectionExpand(propertyId, { reminders: next });
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
            Use the months selector above right to control how far into the future reminders are
            shown. Includes asset service dates, dated to-dos, and future vendor interactions.
          </SectionHelpTip>
        ) : null}
        {upcomingReminders.length === 0 ? (
          <Text style={sharedStyles.cardMeta}>
            No upcoming reminders.
          </Text>
        ) : remindersExpanded ? (
          <View
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.text,
            }}
          >
            {upcomingReminders.map((entry) => {
              if (entry.kind === 'event') {
                const e = entry.event;
                const item = itemById(state, e.itemId);
                const eventPhotos = photosForEvent(state, e.id);
                return (
                  <UpcomingServiceCard
                    key={`event:${e.id}`}
                    event={e}
                    leadingLabel={item ? itemDisplayLabel(item) : undefined}
                    thumbnailUri={eventPhotos[0]?.localUri}
                    onPressDetails={() => onEditEvent(e.itemId, e.id)}
                    onLogService={() => onLogUpcomingService(e.itemId, e.id)}
                    cardBackgroundColor={colors.upcomingCardBg}
                    dividerColor={colors.text}
                    cornerIcon="handyman"
                  />
                );
              }
              if (entry.kind === 'interaction') {
                const interaction = entry.interaction;
                const vendor = interaction.vendorId
                  ? vendorById(state, interaction.vendorId)
                  : undefined;
                const interactionPhotos = photosForVendorInteraction(state, interaction.id);
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
                    onPress={() => onOpenInteraction(interaction.vendorId, interaction.id)}
                    noun="interaction"
                    important={interaction.important === true}
                    cardBackgroundColor={colors.helpBg}
                    dividerColor={colors.text}
                    cornerIcon="forum"
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
                  onPress={() => onOpenTodo(todo.id, { kind: 'todo' })}
                  noun="to-do"
                  cardBackgroundColor={colors.historyCardBg}
                  dividerColor={colors.text}
                  cornerIcon="checklist"
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
              title="Projects"
              expanded={projectsExpanded}
              count={projects.length}
              onExpand={() => {
                const next = !projectsExpanded;
                setProjectsExpanded(next);
                void setPropertySectionExpand(propertyId, { projects: next });
              }}
            />
            <Pressable
              onPress={openAddProject}
              accessibilityRole="button"
              accessibilityLabel="Add project"
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
                setProjectViewMode('gallery');
                void setPropertyProjectViewMode('gallery');
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: projectViewMode === 'gallery' }}
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
                color={projectViewMode === 'gallery' ? colors.primary : colors.textMuted}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                setProjectViewMode('list');
                void setPropertyProjectViewMode('list');
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: projectViewMode === 'list' }}
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
                color={projectViewMode === 'list' ? colors.primary : colors.textMuted}
              />
            </Pressable>
            {projects.length > 0 ? (
              <Pressable
                onPress={() => {
                  const next = !projectsExpanded;
                  setProjectsExpanded(next);
                  void setPropertySectionExpand(propertyId, { projects: next });
                }}
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
            ) : null}
          </View>
        </View>
        {helpVisible ? (
          <SectionHelpTip>
            Projects help you define a quote to provide contractors and then organize your
            interactions with each contractor until you reach a decision.
          </SectionHelpTip>
        ) : null}
        {projects.length === 0 ? (
          <Text style={sharedStyles.emptyText}>
            Add a project to track contractor bids, like a pool renovation.
          </Text>
        ) : !projectsExpanded ? null : projectViewMode === 'gallery' ? (
          <View style={sharedStyles.galleryRow}>
            {projects.map((p) => {
              const vendors = vendorsForProject(state, p.id);
              const waitingForQuoteCount = vendors.filter(
                (v) => v.status === 'waiting_for_quote'
              ).length;
              return (
                <ProjectGalleryTile
                  key={p.id}
                  name={p.name}
                  thumbnailUri={firstPhotoUriForProject(state, p)}
                  vendorCount={vendors.length}
                  waitingForQuoteCount={waitingForQuoteCount}
                  statusLabel={projectStatusLabel(p.status ?? 'research')}
                  statusColor={projectStatusColor(p.status ?? 'research')}
                  totalCostLabel={
                    p.totalCost != null ? formatCurrency(p.totalCost) : undefined
                  }
                  onPress={() => onOpenProject(p.id)}
                />
              );
            })}
          </View>
        ) : (
          <View
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.text,
            }}
          >
            {projects.map((p) => {
              const vendors = vendorsForProject(state, p.id);
              const waitingForQuoteCount = vendors.filter(
                (v) => v.status === 'waiting_for_quote'
              ).length;
              return (
                <ProjectListRow
                  key={p.id}
                  name={p.name}
                  thumbnailUri={firstPhotoUriForProject(state, p)}
                  vendorCount={vendors.length}
                  waitingForQuoteCount={waitingForQuoteCount}
                  statusLabel={projectStatusLabel(p.status ?? 'research')}
                  statusColor={projectStatusColor(p.status ?? 'research')}
                  totalCostLabel={
                    p.totalCost != null ? formatCurrency(p.totalCost) : undefined
                  }
                  onPress={() => onOpenProject(p.id)}
                  dividerColor={colors.text}
                />
              );
            })}
          </View>
        )}
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
              title="Rooms"
              expanded={roomsExpanded}
              count={rooms.length}
              onExpand={() => {
                const next = !roomsExpanded;
                setRoomsExpanded(next);
                void setPropertySectionExpand(propertyId, { rooms: next });
              }}
            />
            <Pressable
              onPress={openAddRoom}
              accessibilityRole="button"
              accessibilityLabel="Add room"
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
                setRoomViewMode('gallery');
                void setPropertyRoomViewMode('gallery');
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: roomViewMode === 'gallery' }}
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
                color={roomViewMode === 'gallery' ? colors.primary : colors.textMuted}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                setRoomViewMode('list');
                void setPropertyRoomViewMode('list');
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: roomViewMode === 'list' }}
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
                color={roomViewMode === 'list' ? colors.primary : colors.textMuted}
              />
            </Pressable>
            {rooms.length > 0 ? (
              <Pressable
                onPress={() => {
                  const next = !roomsExpanded;
                  setRoomsExpanded(next);
                  void setPropertySectionExpand(propertyId, { rooms: next });
                }}
                accessibilityRole="button"
                accessibilityLabel={roomsExpanded ? 'Hide rooms' : 'Show rooms'}
                accessibilityState={{ expanded: roomsExpanded }}
                hitSlop={6}
                style={({ pressed }) => ({
                  padding: 4,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <MaterialIcons
                  name={roomsExpanded ? 'expand-less' : 'expand-more'}
                  size={24}
                  color={colors.primary}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
        {helpVisible ? (
          <SectionHelpTip>
            Use rooms as containers for equipment you want to track (Heating, appliances, cars,
            septic system, tractor...).
          </SectionHelpTip>
        ) : null}
        {rooms.length === 0 ? (
          <Text style={sharedStyles.emptyText}>
            Add a room like Utilities or Kitchen.
          </Text>
        ) : !roomsExpanded ? null : roomViewMode === 'gallery' ? (
          <View style={sharedStyles.galleryRow}>
            {rooms.map((r) => (
              <RoomGalleryTile
                key={r.id}
                name={r.name}
                thumbnailUri={firstPhotoUriForRoom(state, r)}
                itemCount={state.items.filter((i) => i.roomId === r.id).length}
                overdueCount={overdueCountForRoom(state, r.id)}
                upcomingCount={upcomingNotOverdueCountForRoom(state, r.id, upcomingHorizon)}
                requiresAuth={r.requiresAuth}
                onPress={() => onOpenRoom(r.id)}
              />
            ))}
          </View>
        ) : (
          <View
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.text,
            }}
          >
            {rooms.map((r) => (
              <RoomListRow
                key={r.id}
                name={r.name}
                thumbnailUri={firstPhotoUriForRoom(state, r)}
                itemCount={state.items.filter((i) => i.roomId === r.id).length}
                overdueCount={overdueCountForRoom(state, r.id)}
                upcomingCount={upcomingNotOverdueCountForRoom(state, r.id, upcomingHorizon)}
                requiresAuth={r.requiresAuth}
                onPress={() => onOpenRoom(r.id)}
                dividerColor={colors.text}
              />
            ))}
          </View>
        )}
        </View>

        <View style={sharedStyles.propertySectionPanel}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginBottom: 8,
          }}
        >
          <CollapsibleSectionTitle
            title="To do"
            expanded={todosExpanded}
            count={todos.length}
            onExpand={() => {
              const next = !todosExpanded;
              setTodosExpanded(next);
              void setPropertySectionExpand(propertyId, { todos: next });
            }}
          />
          <Pressable
            onPress={openAddTodo}
            accessibilityRole="button"
            accessibilityLabel="Add to-do"
            hitSlop={6}
            style={({ pressed }) => ({
              padding: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons name="add" size={24} color={colors.primary} />
          </Pressable>
          {todos.length > 0 ? (
            <Pressable
              onPress={() => {
                const next = !todosExpanded;
                setTodosExpanded(next);
                void setPropertySectionExpand(propertyId, { todos: next });
              }}
              accessibilityRole="button"
              accessibilityLabel={todosExpanded ? 'Hide to do' : 'Show to do'}
              accessibilityState={{ expanded: todosExpanded }}
              hitSlop={6}
              style={({ pressed }) => ({
                marginLeft: 'auto',
                padding: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons
                name={todosExpanded ? 'expand-less' : 'expand-more'}
                size={24}
                color={colors.primary}
              />
            </Pressable>
          ) : null}
        </View>
        {helpVisible ? (
          <SectionHelpTip>
            Quick simple list of items for the current Property. Fix an outlet, Vacuum under fridge,
            Cleanup around garbage cans.
          </SectionHelpTip>
        ) : null}
        {todos.length === 0 ? (
          <Text style={sharedStyles.emptyText}>
            Track property tasks like repairs, follow-ups, or seasonal chores.
          </Text>
        ) : todosExpanded ? (
          <View
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.text,
            }}
          >
            {todos.map((todo) => (
              <PropertyTodoListRow
                key={todo.id}
                title={todo.title}
                dueLabel={todo.dueAtISO ? formatDisplayDate(todo.dueAtISO) : undefined}
                notes={todo.notes}
                done={todo.done}
                thumbnailUri={photosForPropertyTodo(state, todo.id)[0]?.localUri}
                onPress={() => onOpenTodo(todo.id, { kind: 'todo' })}
                cardBackgroundColor={colors.helpBg}
                dividerColor={colors.text}
              />
            ))}
          </View>
        ) : null}
        </View>

        <View style={sharedStyles.propertySectionPanel}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginBottom: 8,
          }}
        >
          <CollapsibleSectionTitle
            title="Ideas"
            expanded={ideasExpanded}
            count={ideas.length}
            onExpand={() => {
              const next = !ideasExpanded;
              setIdeasExpanded(next);
              void setPropertySectionExpand(propertyId, { ideas: next });
            }}
          />
          <Pressable
            onPress={openAddIdea}
            accessibilityRole="button"
            accessibilityLabel="Add idea"
            hitSlop={6}
            style={({ pressed }) => ({
              padding: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons name="add" size={24} color={colors.primary} />
          </Pressable>
          {ideas.length > 0 ? (
            <Pressable
              onPress={() => {
                const next = !ideasExpanded;
                setIdeasExpanded(next);
                void setPropertySectionExpand(propertyId, { ideas: next });
              }}
              accessibilityRole="button"
              accessibilityLabel={ideasExpanded ? 'Hide ideas' : 'Show ideas'}
              accessibilityState={{ expanded: ideasExpanded }}
              hitSlop={6}
              style={({ pressed }) => ({
                marginLeft: 'auto',
                padding: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons
                name={ideasExpanded ? 'expand-less' : 'expand-more'}
                size={24}
                color={colors.primary}
              />
            </Pressable>
          ) : null}
        </View>
        {helpVisible ? (
          <SectionHelpTip>
            Capture rough ideas for this property before they become to-dos or projects. Loosely
            thought out topics for this property. Ideas still need details added and may someday
            move to a Project or To Do depending on complexity. Similar to TO DO but may never be
            done.
          </SectionHelpTip>
        ) : null}
        {ideas.length === 0 ? null : ideasExpanded ? (
          <View
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.text,
            }}
          >
            {ideas.map((idea) => (
              <PropertyTodoListRow
                key={idea.id}
                title={idea.title}
                dueLabel={idea.dueAtISO ? formatDisplayDate(idea.dueAtISO) : undefined}
                notes={idea.notes}
                done={idea.done}
                thumbnailUri={photosForPropertyTodo(state, idea.id)[0]?.localUri}
                onPress={() => onOpenTodo(idea.id, { kind: 'idea' })}
                variant="idea"
                cardBackgroundColor={colors.helpBg}
                dividerColor={colors.text}
              />
            ))}
          </View>
        ) : null}
        </View>

        <View style={sharedStyles.propertySectionPanel}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              marginBottom: 8,
            }}
          >
            <CollapsibleSectionTitle
              title="What's happening"
              expanded={recentActivityExpanded}
              count={recentActivityAll.length}
              onExpand={() => {
                const next = !recentActivityExpanded;
                setRecentActivityExpanded(next);
                void setPropertySectionExpand(propertyId, { recentActivity: next });
              }}
            />
            {recentActivityAll.length > 0 ? (
              <Pressable
                onPress={() => {
                  const next = !recentActivityExpanded;
                  setRecentActivityExpanded(next);
                  void setPropertySectionExpand(propertyId, { recentActivity: next });
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  recentActivityExpanded ? 'Hide recent activity' : 'Show recent activity'
                }
                accessibilityState={{ expanded: recentActivityExpanded }}
                hitSlop={6}
                style={({ pressed }) => ({
                  marginLeft: 'auto',
                  padding: 4,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <MaterialIcons
                  name={recentActivityExpanded ? 'expand-less' : 'expand-more'}
                  size={24}
                  color={colors.primary}
                />
              </Pressable>
            ) : null}
          </View>
          {helpVisible ? (
            <SectionHelpTip>
              Latest vendor interactions and asset service events for this property, newest first.
            </SectionHelpTip>
          ) : null}
          {recentActivityAll.length === 0 ? (
            <Text style={sharedStyles.emptyText}>No recent activity yet.</Text>
          ) : recentActivityExpanded ? (
            <>
              <View
                style={[
                  sharedStyles.activityBucketList,
                  {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.text,
                  },
                ]}
              >
                {recentActivityGroups.map((group) => {
                  const expanded = isActivityBucketExpanded(group.bucket);
                  const isTodayBucket = group.bucket === 'today';
                  return (
                    <View key={group.bucket}>
                      <ActivityBucketBanner
                        label={group.label}
                        count={activityBucketCounts[group.bucket]}
                        expanded={expanded}
                        variant={isTodayBucket ? 'today' : 'default'}
                        onToggle={() => toggleActivityBucket(group.bucket)}
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
                            const frameColor = isTodayBucket
                              ? colors.danger
                              : colors.sectionTitle;
                            const betweenRows = index < group.entries.length - 1;
                            if (entry.kind === 'interaction') {
                              const interaction = entry.interaction;
                              const vendor = interaction.vendorId
                                ? vendorById(state, interaction.vendorId)
                                : undefined;
                              const photo = photosForVendorInteraction(state, interaction.id)[0];
                              return (
                                <PropertyInteractionListRow
                                  key={`interaction:${interaction.id}`}
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
                                  methodLabel={vendorContactMethodLabel(interaction.contactMethod)}
                                  notes={interaction.notes}
                                  photoUri={photo?.localUri}
                                  important={interaction.important === true}
                                  onPress={() =>
                                    onOpenInteraction(interaction.vendorId, interaction.id)
                                  }
                                  onPressVendor={
                                    vendor ? () => onOpenVendor(vendor.id) : undefined
                                  }
                                  cardBackgroundColor={colors.bg}
                                  ownerBackgroundColor={colors.interactionOwnerBg}
                                  dividerColor={frameColor}
                                  dividerWidth={betweenRows ? 2 : 0}
                                  ownerCornerIcon="storefront"
                                  cornerIcon="forum"
                                  stackRelative={isAfterToday(interaction.occurredAtISO)}
                                />
                              );
                            }
                            const event = entry.event;
                            const item = itemById(state, event.itemId);
                            if (!item) return null;
                            const eventRoom = roomById(state, item.roomId);
                            const photo = photosForEvent(state, event.id)[0];
                            const open = upcomingDueAtISO(event) != null;
                            const eventDateISO = serviceListDateISO(event);
                            return (
                              <PropertyServiceListRow
                                key={`event:${event.id}`}
                                scopeLabel={eventRoom?.name}
                                itemName={itemDisplayLabel(item)}
                                itemPhotoUri={firstPhotoUriForItem(state, item)}
                                dateLabel={formatDisplayDate(eventDateISO)}
                                dateISO={eventDateISO}
                                stackRelative={isAfterToday(eventDateISO)}
                                statusLabel={open ? 'Open' : 'Done'}
                                title={event.title}
                                notes={event.notes}
                                company={event.serviceCompany}
                                photoUri={photo?.localUri}
                                onPress={() => onEditEvent(event.itemId, event.id)}
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
              {recentActivityAll.length > 10 ? (
                <Pressable
                  onPress={() => {
                    setActivitySearchPrefs(activitySearchScopeKey(propertyId), {
                      selectedProjectId: null,
                    });
                    onSearchActivity();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Show all recent activity, ${recentActivityAll.length} items`}
                  style={({ pressed }) => ({
                    alignSelf: 'flex-start',
                    marginTop: 4,
                    marginBottom: 8,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={sharedStyles.textLink}>
                    Show all ({recentActivityAll.length})
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>

      </ScrollView>
      )}

      {exportSnapshot ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            // Above the sharing spinner so iOS can snapshot this hierarchy.
            zIndex: 3,
            // Nearly invisible — still mounted on-screen for capture.
            opacity: 0.02,
          }}
          pointerEvents="none"
          collapsable={false}
        >
          <View ref={exportRef} collapsable={false}>
            <PropertyExportSheet snapshot={exportSnapshot} />
          </View>
        </View>
      ) : null}

      <PropertyShareOptionsModal
        visible={shareOptionsOpen}
        include={shareInclude}
        onChangeInclude={setShareInclude}
        shareFormat={shareFormat}
        onChangeShareFormat={setShareFormat}
        onShare={() => void runPropertyImageExport(shareInclude, shareFormat)}
        onClose={() => setShareOptionsOpen(false)}
      />

      {sharingPng ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2,
            backgroundColor: 'rgba(0,0,0,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : null}

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
                {prop.name}
              </Text>
            </View>
            {(
              [
                {
                  key: 'share',
                  label: 'Share',
                  onPress: () => runMenuAction(openShareOptions),
                  disabled: sharingPng,
                },
                {
                  key: 'playSlideshow',
                  label: 'Play slideshow',
                  onPress: () => runMenuAction(() => playFavoriteSlideshow()),
                },
                {
                  key: 'slideshow',
                  label: 'Edit slideshow',
                  star: true,
                  onPress: () => runMenuAction(openSlideshowEditor),
                },
                {
                  key: 'reorderPhoto',
                  label: showReorderArrows ? 'Reorder Photo: On' : 'Reorder Photo: Off',
                  onPress: () => runMenuAction(() => setShowReorderArrows((prev) => !prev)),
                },
                {
                  key: 'textLarger',
                  label: 'Text larger',
                  onPress: () => {
                    if (!textScaleControls.canMakeLarger) return;
                    textScaleControls.makeLarger();
                  },
                  disabled: !textScaleControls.canMakeLarger,
                },
                {
                  key: 'textSmaller',
                  label: 'Text smaller',
                  onPress: () => {
                    if (!textScaleControls.canMakeSmaller) return;
                    textScaleControls.makeSmaller();
                  },
                  disabled: !textScaleControls.canMakeSmaller,
                },
                {
                  key: 'delete',
                  label: 'Delete property',
                  danger: true,
                  onPress: () => runMenuAction(confirmDeleteProperty),
                },
              ] as Array<{
                key: string;
                label: string;
                onPress: () => void;
                danger?: boolean;
                star?: boolean;
                disabled?: boolean;
              }>
            ).map((item) => (
                <Pressable
                  key={item.key}
                  onPress={item.disabled ? undefined : item.onPress}
                  disabled={item.disabled}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ disabled: item.disabled === true }}
                  style={({ pressed }) => ({
                    paddingVertical: 14,
                    borderTopWidth: 1,
                    borderTopColor: colors.hairline,
                    opacity: item.disabled ? 0.35 : pressed ? 0.7 : 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: item.danger ? colors.danger : colors.text,
                    }}
                  >
                    {item.label}
                  </Text>
                  {item.star ? (
                    <Text style={{ fontSize: 13, lineHeight: 16, color: '#000' }}>★</Text>
                  ) : null}
                </Pressable>
              ))}
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
        title="Rename property"
        value={renameDraft}
        onChangeText={setRenameDraft}
        onSave={savePropertyName}
        onClose={() => setRenameOpen(false)}
        placeholder="Property name"
      />

      <RenameModal
        visible={addTodoOpen}
        title="New to-do"
        value={newTodoTitle}
        onChangeText={setNewTodoTitle}
        onSave={saveNewTodo}
        onClose={() => setAddTodoOpen(false)}
        placeholder="What needs to be done"
        saveLabel="Create"
      />

      <RenameModal
        visible={addIdeaOpen}
        title="New idea"
        value={newIdeaTitle}
        onChangeText={setNewIdeaTitle}
        onSave={saveNewIdea}
        onClose={() => setAddIdeaOpen(false)}
        placeholder="A rough idea for this property"
        saveLabel="Create"
      />

      <SlideshowEditorModal
        visible={slideshowEditorOpen}
        state={state}
        propertyId={propertyId}
        onSave={onSave}
        onClose={() => setSlideshowEditorOpen(false)}
        onPlay={playFavoriteSlideshow}
      />

      <PropertyAllPhotosModal
        visible={allPhotosOpen}
        state={state}
        propertyId={propertyId}
        onClose={() => setAllPhotosOpen(false)}
        onView={viewAllPropertyPhotos}
        onOpenOwner={openPhotoOwner}
      />
    </View>
    </ReuseExistingPhotosProvider>
  );
}
