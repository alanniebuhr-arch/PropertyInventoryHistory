import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text, TextInput, useTextScaleControls } from '../textScale';
import type { TextInput as RNTextInput, ScrollView as RNScrollView } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, Project, ProjectPunchItem, ProjectVendor } from '../types';
import { PropertyTodoListRow, PropertyInteractionListRow, VendorGalleryTile, VendorListRow } from '../components/ListRows';
import { UpcomingReminderCard } from '../components/UpcomingServiceCard';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { ReuseExistingPhotosProvider } from '../components/ReuseExistingPhotosProvider';
import { ProjectPhotosSection } from '../components/ProjectPhotosSection';
import { ProjectExportSheet } from '../components/ProjectExportSheet';
import { ProjectShareOptionsModal } from '../components/ProjectShareOptionsModal';
import { RoomNavigationDots } from '../components/RoomNavigationDots';
import { RenameModal } from '../components/RenameModal';
import { EditableDetailSection } from '../components/EditableDetailSection';
import { CollapsibleSectionTitle } from '../components/CollapsibleSectionTitle';
import { useKeyboardDoneAccessory } from '../components/KeyboardDoneAccessory';
import { sharedStyles, colors } from '../theme';
import { uid, nowISO, formatDisplayDate } from '../utils';
import {
  deleteProjectCascade,
  interactionsForProject,
  interactionsForVendor,
  photosForPunchItem,
  photosForVendorInteraction,
  projectById,
  projectsForProperty,
  propertyById,
  punchItemsForProject,
  vendorById,
  vendorsForProject,
} from '../storage';
import { photosForProject } from '../projectPhotos';
import {
  slideshowPhotosForProject,
  type ProjectCatalogPhoto,
} from '../projectFavoritePhotos';
import { PhotoViewerModal, type ViewerPhoto } from '../components/PhotoViewerModal';
import { SlideshowEditorModal } from '../components/SlideshowEditorModal';
import { ProjectAllPhotosModal } from '../components/ProjectAllPhotosModal';
import {
  consumeProjectSearchPhotosReopen,
  markProjectSearchPhotosReopen,
} from '../projectSearchPhotosPrefs';
import { firstPhotoUriForVendor } from '../vendorPhotos';
import { deletePhotoFile } from '../photoStorage';
import { vendorStatusColor, vendorStatusLabel } from '../vendorStatus';
import {
  getProjectScrollPrefs,
  setProjectScrollPrefs,
} from '../projectScrollPrefs';
import {
  PROJECT_STATUS_OPTIONS,
  projectStatusColor,
  projectStatusLabel,
} from '../projectStatus';
import { vendorContactMethodLabel } from '../vendorContactMethod';
import { isAfterToday, isToday, upcomingInteractionsForProject } from '../eventRecurrence';
import {
  getProjectVendorViewMode,
  loadProjectVendorViewMode,
  setProjectVendorViewMode,
  type ProjectVendorViewMode,
} from '../projectVendorViewPrefs';
import {
  buildProjectExportSnapshot,
  PROJECT_SHARE_PRESET_ALL,
  type ProjectExportInclude,
  type ProjectExportSnapshot,
} from '../projectExportContent';
import { hasFavoritePhotos, type SharePhotoMode } from '../sharePhotoMode';
import { DEFAULT_SHARE_FORMAT, type ShareFormat } from '../shareFormat';
import { shareViewAsPng } from '../shareViewImage';
import { shareHtmlAsPdf } from '../shareViewPdf';
import { buildExportPdfHtml, projectSnapshotToPdfDoc } from '../exportPdfHtml';
import {
  ToolbarNewSearchControls,
  usePropertyGearNav,
  type PropertyGearNavItem,
} from '../components/PropertyGearNavItems';
import { SectionHelpTip } from '../components/SectionHelpTip';
import {
  getSectionHelpVisible,
  loadSectionHelpVisible,
  setSectionHelpVisible,
} from '../sectionHelpPrefs';
import {
  getHideRejectedVendors,
  loadHideRejectedVendors,
  setHideRejectedVendors,
} from '../hideRejectedVendorsPrefs';
import {
  getProjectSectionExpand,
  loadProjectSectionExpand,
  setProjectSectionExpand,
  getProjectActivityBucketExpand,
  setProjectActivityBucketExpand,
} from '../projectSectionExpandPrefs';
import { ActivityBucketBanner } from '../components/ActivityBucketBanner';

function vendorNotesPreview(notes?: string): string | undefined {
  const trimmed = notes?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= 180) return trimmed;
  return `${trimmed.slice(0, 180).trimEnd()}…`;
}

export function ProjectDetailScreen(props: {
  state: AppState;
  projectId: string;
  onBack: () => void;
  onNavigateProject: (projectId: string) => void;
  onGoToProperty: () => void;
  onOpenInteractions: () => void;
  onSearchInteractions: () => void;
  onSearchActivity?: () => void;
  onOpenInteraction: (vendorId: string | undefined, interactionId: string) => void;
  onOpenVendor: (vendorId: string, options?: { startEditing?: boolean }) => void;
  onAddVendorInteraction: (vendorId: string) => void;
  onAddInteraction: () => void;
  onAddServiceEvent: () => void;
  onSearchAssets: () => void;
  onSearchServiceHistory: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenItem: (itemId: string, startEditingSection?: 'appliance' | 'purchase' | 'repair') => void;
  onOpenPunchItem: (punchItemId: string, options?: { startEditing?: boolean }) => void;
  onSave: (state: AppState) => void;
}) {
  const {
    state,
    projectId,
    onBack,
    onNavigateProject,
    onGoToProperty,
    onOpenInteractions,
    onSearchInteractions,
    onSearchActivity,
    onOpenInteraction,
    onOpenVendor,
    onAddVendorInteraction,
    onAddInteraction,
    onAddServiceEvent,
    onSearchAssets,
    onSearchServiceHistory,
    onOpenProject,
    onOpenItem,
    onOpenPunchItem,
    onSave,
  } = props;
  const insets = useSafeAreaInsets();
  const vendors = vendorsForProject(state, projectId);
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [addPunchOpen, setAddPunchOpen] = useState(false);
  const [newPunchTitle, setNewPunchTitle] = useState('');
  const [punchListExpanded, setPunchListExpanded] = useState(
    () => getProjectSectionExpand().punchList
  );
  const [recentInteractionsExpanded, setRecentInteractionsExpanded] = useState(
    () => getProjectSectionExpand().recentInteractions
  );
  const [activityFutureExpanded, setActivityFutureExpanded] = useState(
    () => getProjectActivityBucketExpand(projectId).activityFuture
  );
  const [activityTodayExpanded, setActivityTodayExpanded] = useState(
    () => getProjectActivityBucketExpand(projectId).activityToday
  );
  const [activityHistoryExpanded, setActivityHistoryExpanded] = useState(
    () => getProjectActivityBucketExpand(projectId).activityHistory
  );
  const [photosExpanded, setPhotosExpanded] = useState(() => getProjectSectionExpand().photos);
  const [statusExpanded, setStatusExpanded] = useState(() => getProjectSectionExpand().status);
  const [remindersExpanded, setRemindersExpanded] = useState(
    () => getProjectSectionExpand().reminders
  );
  const [descriptionExpanded, setDescriptionExpanded] = useState(
    () => getProjectSectionExpand().description
  );
  const [introExpanded, setIntroExpanded] = useState(() => getProjectSectionExpand().intro);
  const [questionsExpanded, setQuestionsExpanded] = useState(
    () => getProjectSectionExpand().questions
  );
  const [vendorsExpanded, setVendorsExpanded] = useState(() => getProjectSectionExpand().vendors);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [vendorViewMode, setVendorViewMode] = useState<ProjectVendorViewMode>(getProjectVendorViewMode);
  const textScaleControls = useTextScaleControls();
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [introDraft, setIntroDraft] = useState('');
  const [questionsDraft, setQuestionsDraft] = useState('');
  const [totalCostDraft, setTotalCostDraft] = useState('');
  const [editingSection, setEditingSection] = useState<
    'description' | 'intro' | 'questions' | null
  >(null);
  const [exportSnapshot, setExportSnapshot] = useState<ProjectExportSnapshot | null>(null);
  const [exporting, setExporting] = useState(false);
  const [shareOptionsOpen, setShareOptionsOpen] = useState(false);
  const [shareInclude, setShareInclude] = useState<ProjectExportInclude>(PROJECT_SHARE_PRESET_ALL);
  const [sharePhotoMode, setSharePhotoMode] = useState<SharePhotoMode>('all');
  const [shareFormat, setShareFormat] = useState<ShareFormat>(DEFAULT_SHARE_FORMAT);
  const [helpVisible, setHelpVisible] = useState(getSectionHelpVisible);
  const [hideRejected, setHideRejected] = useState(getHideRejectedVendors);
  const [showReorderArrows, setShowReorderArrows] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState<number | null>(null);
  const [slideshowEditorOpen, setSlideshowEditorOpen] = useState(false);
  const [slideshowPlayPhotos, setSlideshowPlayPhotos] = useState<ViewerPhoto[] | null>(null);
  const [allPhotosOpen, setAllPhotosOpen] = useState(() =>
    consumeProjectSearchPhotosReopen(projectId)
  );
  /** When Play was started from Search photos, ← Back returns there. */
  const slideshowReturnToSearchPhotosRef = useRef(false);
  const exportRef = useRef<View>(null);

  const project = projectById(state, projectId);
  const propertyId = project?.propertyId ?? '';
  const propertyProjects = project ? projectsForProperty(state, project.propertyId) : [];
  const projectIndex = project ? propertyProjects.findIndex((p) => p.id === projectId) : -1;
  const projectInteractions = interactionsForProject(state, projectId);
  const recentInteractions = projectInteractions.slice(0, 5);
  const upcomingInteractions = upcomingInteractionsForProject(state, projectId);

  type InteractionBucket = 'future' | 'today' | 'history';
  type InteractionBucketGroup = {
    bucket: InteractionBucket;
    label: string;
    interactions: (typeof projectInteractions)[number][];
  };

  function interactionBucket(at: string): InteractionBucket {
    if (isAfterToday(at)) return 'future';
    if (isToday(at)) return 'today';
    return 'history';
  }

  const INTERACTION_BUCKET_LABEL: Record<InteractionBucket, string> = {
    future: 'Future Activity',
    today: 'Today',
    history: 'History',
  };

  const interactionBucketCounts: Record<InteractionBucket, number> = {
    future: 0,
    today: 0,
    history: 0,
  };
  for (const interaction of recentInteractions) {
    interactionBucketCounts[interactionBucket(interaction.occurredAtISO)] += 1;
  }

  const recentInteractionGroups: InteractionBucketGroup[] = [];
  for (const interaction of recentInteractions) {
    const bucket = interactionBucket(interaction.occurredAtISO);
    const last = recentInteractionGroups[recentInteractionGroups.length - 1];
    if (!last || last.bucket !== bucket) {
      recentInteractionGroups.push({
        bucket,
        label: INTERACTION_BUCKET_LABEL[bucket],
        interactions: [interaction],
      });
    } else {
      last.interactions.push(interaction);
    }
  }

  function isInteractionBucketExpanded(bucket: InteractionBucket): boolean {
    if (bucket === 'future') return activityFutureExpanded;
    if (bucket === 'today') return activityTodayExpanded;
    return activityHistoryExpanded;
  }

  function toggleInteractionBucket(bucket: InteractionBucket) {
    if (bucket === 'future') {
      const next = !activityFutureExpanded;
      setActivityFutureExpanded(next);
      setProjectActivityBucketExpand(projectId, { activityFuture: next });
      return;
    }
    if (bucket === 'today') {
      const next = !activityTodayExpanded;
      setActivityTodayExpanded(next);
      setProjectActivityBucketExpand(projectId, { activityToday: next });
      return;
    }
    const next = !activityHistoryExpanded;
    setActivityHistoryExpanded(next);
    setProjectActivityBucketExpand(projectId, { activityHistory: next });
  }

  const punchItems = punchItemsForProject(state, projectId);
  const hasRejectedVendor = vendors.some((v) => v.status === 'rejected');
  const visibleVendors = hideRejected
    ? vendors.filter((v) => v.status !== 'rejected')
    : vendors;

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    // Let the menu dismiss before opening another alert/modal.
    setTimeout(action, 50);
  }

  const {
    newItems: propertyNewItems,
    searchItems: propertySearchItems,
    createModals: propertyGearCreateModals,
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

  const projectLocalNewItems: PropertyGearNavItem[] = [
    {
      key: 'vendor',
      prefix: 'New',
      keyword: 'Vendor',
      onPress: () => runMenuAction(openAddVendor),
    },
    {
      key: 'punchItem',
      prefix: 'New',
      keyword: 'Punch List Item',
      onPress: () => runMenuAction(openAddPunchItem),
    },
  ];
  const projectNewItems: PropertyGearNavItem[] = propertyId
    ? [...projectLocalNewItems, ...propertyNewItems]
    : projectLocalNewItems;
  const projectSearchItems = propertyId ? propertySearchItems : [];

  useEffect(() => {
    let cancelled = false;
    void loadProjectVendorViewMode().then((mode) => {
      if (!cancelled) setVendorViewMode(mode);
    });
    void loadSectionHelpVisible().then((visible) => {
      if (!cancelled) setHelpVisible(visible);
    });
    void loadHideRejectedVendors().then((hide) => {
      if (!cancelled) setHideRejected(hide);
    });
    void loadProjectSectionExpand().then((expand) => {
      if (cancelled) return;
      setPhotosExpanded(expand.photos);
      setStatusExpanded(expand.status);
      setRemindersExpanded(expand.reminders);
      setDescriptionExpanded(expand.description);
      setIntroExpanded(expand.intro);
      setQuestionsExpanded(expand.questions);
      setVendorsExpanded(expand.vendors);
      setPunchListExpanded(expand.punchList);
      setRecentInteractionsExpanded(expand.recentInteractions);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (project) {
      setDescriptionDraft(project.description ?? '');
      setIntroDraft(project.vendorIntroNote ?? '');
      setQuestionsDraft(project.vendorQuestionsNote ?? '');
      setTotalCostDraft(project.totalCost != null ? String(project.totalCost) : '');
    }
  }, [
    project?.id,
    project?.description,
    project?.vendorIntroNote,
    project?.vendorQuestionsNote,
    project?.totalCost,
  ]);

  useEffect(() => {
    const buckets = getProjectActivityBucketExpand(projectId);
    setActivityFutureExpanded(buckets.activityFuture);
    setActivityTodayExpanded(buckets.activityToday);
    setActivityHistoryExpanded(buckets.activityHistory);
  }, [projectId]);

  const projectGalleryHasFavorites = useMemo(
    () => hasFavoritePhotos(photosForProject(state, projectId)),
    [projectId, state]
  );

  const openShareOptions = useCallback((preset: ProjectExportInclude) => {
    setShareInclude({ ...preset });
    setSharePhotoMode('all');
    setShareFormat(DEFAULT_SHARE_FORMAT);
    setShareOptionsOpen(true);
  }, []);

  const runProjectExport = useCallback(
    async (include: ProjectExportInclude, photoMode: SharePhotoMode, format: ShareFormat) => {
      if (!Object.values(include).some(Boolean)) {
        Alert.alert('Nothing selected', 'Choose at least one section to include.');
        return;
      }
      const snapshot = buildProjectExportSnapshot(state, projectId, {
        include,
        recentInteractionsLimit: recentInteractionsExpanded ? 5 : 0,
        photoMode: include.photos && projectGalleryHasFavorites ? photoMode : 'all',
      });
      if (!snapshot) {
        Alert.alert('Export failed', 'Could not build project summary.');
        return;
      }
      setShareOptionsOpen(false);
      if (format === 'pdf') {
        setExporting(true);
        try {
          const html = await buildExportPdfHtml(projectSnapshotToPdfDoc(snapshot));
          await shareHtmlAsPdf(html, `Share ${snapshot.title}`);
        } finally {
          setExporting(false);
        }
        return;
      }
      setExportSnapshot(snapshot);
      setExporting(true);
    },
    [projectGalleryHasFavorites, projectId, recentInteractionsExpanded, state]
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

  const goToNextProject = useCallback(() => {
    if (projectIndex < 0) return;
    const target = propertyProjects[projectIndex + 1];
    if (target) onNavigateProject(target.id);
  }, [onNavigateProject, propertyProjects, projectIndex]);

  const goToPrevProject = useCallback(() => {
    if (projectIndex < 0) return;
    const target = propertyProjects[projectIndex - 1];
    if (target) onNavigateProject(target.id);
  }, [onNavigateProject, propertyProjects, projectIndex]);

  const makeProjectSwipeGesture = useCallback(
    () =>
      Gesture.Pan()
        .activeOffsetX([-40, 40])
        .failOffsetY([-28, 28])
        .onEnd((event) => {
          'worklet';
          if (event.translationX <= -56) {
            runOnJS(goToNextProject)();
          } else if (event.translationX >= 56) {
            runOnJS(goToPrevProject)();
          }
        }),
    [goToNextProject, goToPrevProject]
  );

  const projectSwipeGestureForTitle = useMemo(
    () => makeProjectSwipeGesture(),
    [makeProjectSwipeGesture]
  );
  const projectSwipeGestureForVendors = useMemo(
    () => makeProjectSwipeGesture(),
    [makeProjectSwipeGesture]
  );
  const projectSwipeEnabled = propertyProjects.length > 1;

  const closeSectionRef = useRef<() => void>(() => {});
  const keyboardDone = useKeyboardDoneAccessory({
    id: 'projectFieldDone',
    // Project detail uses gesture-handler ScrollView; native InputAccessoryView often fails.
    variant: 'overlay',
    onDone: () => closeSectionRef.current(),
  });
  const scrollRef = useRef<RNScrollView>(null);
  const savedScrollPrefs = getProjectScrollPrefs(projectId);
  const scrollYRef = useRef(savedScrollPrefs.scrollY);
  const pendingRestoreScrollYRef = useRef<number | null>(
    savedScrollPrefs.scrollY > 0 ? savedScrollPrefs.scrollY : null
  );
  const didRestoreScrollRef = useRef(savedScrollPrefs.scrollY <= 0);
  const pendingFocusRef = useRef<{ y: number; height: number } | null>(null);
  const descriptionInputRef = useRef<RNTextInput>(null);
  const introInputRef = useRef<RNTextInput>(null);
  const questionsInputRef = useRef<RNTextInput>(null);
  const totalCostInputRef = useRef<RNTextInput>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const prefs = getProjectScrollPrefs(projectId);
    scrollYRef.current = prefs.scrollY;
    pendingRestoreScrollYRef.current = prefs.scrollY > 0 ? prefs.scrollY : null;
    didRestoreScrollRef.current = prefs.scrollY <= 0;
  }, [projectId]);

  useEffect(() => {
    return () => {
      setProjectScrollPrefs(projectId, { scrollY: scrollYRef.current });
    };
  }, [projectId]);

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
  }, [projectId]);

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

  const handleFieldFocus = useCallback(
    (windowY: number, height: number) => {
      pendingFocusRef.current = { y: windowY, height };
      scrollFieldIntoView(windowY, height, keyboardHeight || 320);
    },
    [keyboardHeight, scrollFieldIntoView]
  );

  const measureAndScroll = useCallback(
    (input: RNTextInput | null) => {
      requestAnimationFrame(() => {
        input?.measureInWindow((_x: number, y: number, _w: number, height: number) => {
          handleFieldFocus(y, height);
        });
      });
    },
    [handleFieldFocus]
  );

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

  if (!project) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>Project not found.</Text>
        <Pressable onPress={onBack} style={sharedStyles.secondaryBtn}>
          <Text style={sharedStyles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const proj = project;
  const property = propertyById(state, proj.propertyId);
  const subtitleParts = [property?.name].filter(Boolean);

  const favoritePhotos = slideshowPhotosForProject(state, projectId);
  const slideshowPhotosFromState: ViewerPhoto[] = favoritePhotos.map((photo) => ({
    id: photo.id,
    uri: photo.uri,
    label: photo.label,
    notes: photo.notes,
    onDelete: () => {},
  }));
  const slideshowPhotos = slideshowPlayPhotos ?? slideshowPhotosFromState;
  const slideshowOpen = slideshowIndex != null;

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
    const photos = slideshowPhotosForProject(source, projectId);
    if (photos.length === 0) {
      Alert.alert(
        'No slideshow photos',
        'Add photos in Slideshow, or mark project photos as favorites with the star.'
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

  function viewAllProjectPhotos(photos: ProjectCatalogPhoto[], startIndex = 0) {
    if (photos.length === 0) {
      Alert.alert('No photos', 'Add photos on this project or its punch list first.');
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

  function openPhotoOwner(photo: ProjectCatalogPhoto) {
    markProjectSearchPhotosReopen(projectId);
    setAllPhotosOpen(false);
    if (photo.punchItemId) {
      onOpenPunchItem(photo.punchItemId);
      return;
    }
    if (photo.interactionId) {
      onOpenInteraction(photo.vendorId, photo.interactionId);
      return;
    }
    if (photo.vendorId) {
      onOpenVendor(photo.vendorId);
    }
  }

  function saveProjectField(
    patch: Partial<
      Pick<
        Project,
        | 'description'
        | 'vendorIntroNote'
        | 'vendorQuestionsNote'
        | 'status'
        | 'name'
        | 'totalCost'
      >
    >
  ) {
    onSave({
      ...state,
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, ...patch, updatedAtISO: nowISO() } : p
      ),
    });
  }

  function openStatusPicker() {
    Alert.alert(
      'Project status',
      undefined,
      [
        ...PROJECT_STATUS_OPTIONS.map((opt) => ({
          text: opt.label,
          onPress: () => saveProjectField({ status: opt.id }),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
      { cancelable: true }
    );
  }

  function saveTotalCost() {
    const trimmed = totalCostDraft.trim();
    if (!trimmed) {
      if (proj.totalCost != null) {
        saveProjectField({ totalCost: undefined });
      }
      setTotalCostDraft('');
      return;
    }
    const parsed = parseFloat(trimmed);
    if (Number.isNaN(parsed)) {
      setTotalCostDraft(proj.totalCost != null ? String(proj.totalCost) : '');
      return;
    }
    if (proj.totalCost !== parsed) {
      saveProjectField({ totalCost: parsed });
    }
    setTotalCostDraft(String(parsed));
  }

  function saveDescription() {
    const trimmed = descriptionDraft.trim();
    saveProjectField({ description: trimmed || undefined });
  }

  function saveIntroNote() {
    const trimmed = introDraft.trim();
    saveProjectField({ vendorIntroNote: trimmed || undefined });
  }

  function saveQuestionsNote() {
    const trimmed = questionsDraft.trim();
    saveProjectField({ vendorQuestionsNote: trimmed || undefined });
  }

  function openSection(section: 'description' | 'intro' | 'questions') {
    if (editingSection === 'description') saveDescription();
    if (editingSection === 'intro') saveIntroNote();
    if (editingSection === 'questions') saveQuestionsNote();
    setEditingSection(section);
  }

  function closeSection() {
    saveTotalCost();
    if (editingSection === 'description') saveDescription();
    if (editingSection === 'intro') saveIntroNote();
    if (editingSection === 'questions') saveQuestionsNote();
    setEditingSection(null);
  }
  closeSectionRef.current = closeSection;

  function openRenameProject() {
    setRenameDraft(proj.name);
    setRenameOpen(true);
  }

  function saveProjectName() {
    const trimmed = renameDraft.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Enter a project name.');
      return;
    }
    onSave({
      ...state,
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, name: trimmed } : p
      ),
    });
    setRenameOpen(false);
  }

  function saveNewVendor() {
    const trimmed = newVendorName.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Enter a vendor name.');
      return;
    }
    const vendor: ProjectVendor = {
      id: uid('vendor'),
      projectId,
      name: trimmed,
      status: 'researching',
      photoIds: [],
      documentIds: [],
      createdAtISO: nowISO(),
    };
    onSave({ ...state, projectVendors: [...state.projectVendors, vendor] });
    setAddVendorOpen(false);
    setNewVendorName('');
    onOpenVendor(vendor.id, { startEditing: true });
  }

  function openAddPunchItem() {
    setNewPunchTitle('');
    setAddPunchOpen(true);
  }

  function saveNewPunchItem() {
    const trimmed = newPunchTitle.trim();
    if (!trimmed) {
      Alert.alert('Title required', 'Enter a short title for this punch item.');
      return;
    }
    const punchItem: ProjectPunchItem = {
      id: uid('punch'),
      projectId,
      title: trimmed,
      done: false,
      photoIds: [],
      createdAtISO: nowISO(),
    };
    onSave({
      ...state,
      projectPunchItems: [...(state.projectPunchItems ?? []), punchItem],
    });
    setAddPunchOpen(false);
    setNewPunchTitle('');
    onOpenPunchItem(punchItem.id, { startEditing: true });
  }

  function confirmDeleteProject() {
    Alert.alert(
      'Delete project?',
      `Remove "${proj.name}" and all vendors inside?`,
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
                  onPress: async () => {
                    for (const p of photosForProject(state, projectId)) {
                      await deletePhotoFile(p.localUri);
                    }
                    onSave(deleteProjectCascade(state, projectId));
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

  function openAddVendor() {
    setNewVendorName('');
    setAddVendorOpen(true);
  }

  function toggleHelp() {
    const next = !helpVisible;
    setHelpVisible(next);
    void setSectionHelpVisible(next);
  }

  const vendorsSection = (
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
            title="Vendors"
            expanded={vendorsExpanded}
            count={visibleVendors.length}
            onExpand={() => {
              const next = !vendorsExpanded;
              setVendorsExpanded(next);
              void setProjectSectionExpand({ vendors: next });
            }}
          />
          <Pressable
            onPress={openAddVendor}
            accessibilityRole="button"
            accessibilityLabel="Add vendor"
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
              setVendorViewMode('gallery');
              void setProjectVendorViewMode('gallery');
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: vendorViewMode === 'gallery' }}
            accessibilityLabel="Compact gallery view"
            hitSlop={6}
            style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.7 : 1 })}
          >
            <MaterialIcons
              name="grid-view"
              size={22}
              color={vendorViewMode === 'gallery' ? colors.primary : colors.textMuted}
            />
          </Pressable>
          <Pressable
            onPress={() => {
              setVendorViewMode('list');
              void setProjectVendorViewMode('list');
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: vendorViewMode === 'list' }}
            accessibilityLabel="Detailed list view"
            hitSlop={6}
            style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.7 : 1 })}
          >
            <MaterialIcons
              name="view-list"
              size={22}
              color={vendorViewMode === 'list' ? colors.primary : colors.textMuted}
            />
          </Pressable>
          {vendors.length > 0 ? (
            <Pressable
              onPress={() => {
                const next = !vendorsExpanded;
                setVendorsExpanded(next);
                void setProjectSectionExpand({ vendors: next });
              }}
              accessibilityRole="button"
              accessibilityLabel={vendorsExpanded ? 'Hide vendors' : 'Show vendors'}
              accessibilityState={{ expanded: vendorsExpanded }}
              hitSlop={6}
              style={({ pressed }) => ({
                padding: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons
                name={vendorsExpanded ? 'expand-less' : 'expand-more'}
                size={24}
                color={colors.primary}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {helpVisible ? (
        <SectionHelpTip>
          All the companies you will contact to get a quote on this project. Your emails, calls,
          texts… can all be documented and easily found, viewed and shared.
        </SectionHelpTip>
      ) : null}

      {vendors.length === 0 ? (
        <Text style={sharedStyles.emptyText}>
          Add a contractor or vendor you&apos;ve contacted.
        </Text>
      ) : !vendorsExpanded ? null : visibleVendors.length === 0 ? (
        <Text style={sharedStyles.emptyText}>Rejected vendors are hidden.</Text>
      ) : vendorViewMode === 'gallery' ? (
        <View style={sharedStyles.galleryRow}>
          {visibleVendors.map((vendor) => (
            <VendorGalleryTile
              key={vendor.id}
              name={vendor.name}
              contactName={vendor.contactName}
              statusLabel={vendorStatusLabel(vendor.status)}
              statusColor={vendorStatusColor(vendor.status)}
              notesPreview={vendorNotesPreview(vendor.notes)}
              thumbnailUri={firstPhotoUriForVendor(state, vendor)}
              onPress={() => onOpenVendor(vendor.id)}
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
          {visibleVendors.map((vendor) => {
            const lastInteraction = interactionsForVendor(state, vendor.id)[0];
            const lastInteractionPhoto = lastInteraction
              ? photosForVendorInteraction(state, lastInteraction.id)[0]
              : undefined;
            return (
              <VendorListRow
                key={vendor.id}
                name={vendor.name}
                contactName={vendor.contactName}
                phone={vendor.phone}
                statusLabel={vendorStatusLabel(vendor.status)}
                statusColor={vendorStatusColor(vendor.status)}
                notesPreview={vendorNotesPreview(vendor.notes)}
                thumbnailUri={firstPhotoUriForVendor(state, vendor)}
                lastInteractionAtISO={lastInteraction?.occurredAtISO}
                lastInteractionTitle={
                  lastInteraction
                    ? vendorContactMethodLabel(lastInteraction.contactMethod)
                    : undefined
                }
                lastInteractionNotes={lastInteraction?.notes}
                lastInteractionPhotoUri={lastInteractionPhoto?.localUri}
                onPress={() => onOpenVendor(vendor.id)}
                onAddInteraction={() => onAddVendorInteraction(vendor.id)}
                onPressLastInteraction={
                  lastInteraction
                    ? () => onOpenInteraction(vendor.id, lastInteraction.id)
                    : undefined
                }
                cardBackgroundColor={colors.helpBg}
                dividerColor={colors.text}
                imageBackgroundColor={colors.helpBg}
              />
            );
          })}
          <Text
            style={[
              sharedStyles.cardMeta,
              {
                textAlign: 'right',
                marginTop: 4,
                marginBottom: 4,
              },
            ]}
          >
            Last interaction
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <ReuseExistingPhotosProvider state={state} propertyId={propertyId}>
    <KeyboardAvoidingView
      style={[sharedStyles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
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
        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pressable
            onPress={toggleHelp}
            disabled={exporting}
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
                opacity: exporting ? 0.6 : 1,
              },
              pressed && !exporting && { opacity: 0.8 },
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
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Go to property"
            accessibilityHint="Opens the property page for this project."
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
          <ToolbarNewSearchControls
            title={proj.name}
            newItems={projectNewItems}
            searchItems={projectSearchItems}
            disabled={exporting}
          />
          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Project options"
            accessibilityHint="Opens actions like play slideshow, share, and delete project."
            hitSlop={6}
            style={({ pressed }) => ({
              padding: 4,
              opacity: pressed ? 0.7 : 1,
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
          Help | Home | New
          {projectSearchItems.length > 0 ? ' | Search' : ''} | Utilities
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
          setProjectScrollPrefs(projectId, { scrollY: y });
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
        <ProjectPhotosSection
          state={state}
          projectId={projectId}
          onSave={onSave}
          showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          childrenGesture={projectSwipeEnabled ? projectSwipeGestureForTitle : undefined}
          expanded={photosExpanded}
          onToggleExpanded={() => {
            const next = !photosExpanded;
            setPhotosExpanded(next);
            void setProjectSectionExpand({ photos: next });
          }}
        >
          <RoomNavigationDots
            count={propertyProjects.length}
            activeIndex={projectIndex}
            unitLabel="Project"
            onSelect={(index) => {
              const target = propertyProjects[index];
              if (target) onNavigateProject(target.id);
            }}
          />
          <Pressable
            onLongPress={openRenameProject}
            accessibilityRole="header"
            accessibilityHint="Long press to rename this project"
          >
            <Text style={sharedStyles.title}>{proj.name}</Text>
          </Pressable>
          {subtitleParts.length > 0 ? (
            <Text style={sharedStyles.subtitle}>{subtitleParts.join(' · ')}</Text>
          ) : null}
        </ProjectPhotosSection>

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
              title="Status"
              expanded={statusExpanded}
              count={1}
              onExpand={() => {
                const next = !statusExpanded;
                setStatusExpanded(next);
                void setProjectSectionExpand({ status: next });
              }}
              showCountWhenCollapsed={false}
            />
            {!statusExpanded ? (
              <Text
                style={{
                  flex: 1,
                  marginLeft: 8,
                  fontSize: 15,
                  fontWeight: '600',
                  color: projectStatusColor(proj.status ?? 'research'),
                }}
                numberOfLines={1}
                accessibilityLabel={`Status: ${projectStatusLabel(proj.status ?? 'research')}`}
              >
                {projectStatusLabel(proj.status ?? 'research')}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <Pressable
              onPress={() => {
                const next = !statusExpanded;
                setStatusExpanded(next);
                void setProjectSectionExpand({ status: next });
              }}
              accessibilityRole="button"
              accessibilityLabel={statusExpanded ? 'Hide status' : 'Show status'}
              accessibilityState={{ expanded: statusExpanded }}
              hitSlop={6}
              style={({ pressed }) => ({
                padding: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons
                name={statusExpanded ? 'expand-less' : 'expand-more'}
                size={24}
                color={colors.primary}
              />
            </Pressable>
          </View>
          {statusExpanded ? (
            <>
              <Pressable
                onPress={openStatusPicker}
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
                accessibilityLabel={`Status: ${projectStatusLabel(proj.status ?? 'research')}`}
                accessibilityHint="Opens a list of project status options"
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: projectStatusColor(proj.status ?? 'research'),
                    fontWeight: '600',
                  }}
                >
                  {projectStatusLabel(proj.status ?? 'research')}
                </Text>
                <Text style={{ fontSize: 18, color: colors.textMuted }}>›</Text>
              </Pressable>

              <Text style={sharedStyles.fieldLabel}>Total cost</Text>
              <TextInput
                ref={totalCostInputRef}
                style={sharedStyles.input}
                value={totalCostDraft}
                onChangeText={setTotalCostDraft}
                onBlur={saveTotalCost}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                {...keyboardDone.getTextInputProps({
                  onFocus: () => measureAndScroll(totalCostInputRef.current),
                })}
              />
            </>
          ) : null}
        </View>

        {helpVisible ? (
          <SectionHelpTip>
            Add as many pictures here as you want. The pictures marked with a star will be sent to
            Vendors. Long press on pictures to add a name and description.
          </SectionHelpTip>
        ) : null}

        {upcomingInteractions.length > 0 ? (
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
                title="Reminders"
                expanded={remindersExpanded}
                count={upcomingInteractions.length}
                onExpand={() => {
                  const next = !remindersExpanded;
                  setRemindersExpanded(next);
                  void setProjectSectionExpand({ reminders: next });
                }}
              />
              <Pressable
                onPress={() => {
                  const next = !remindersExpanded;
                  setRemindersExpanded(next);
                  void setProjectSectionExpand({ reminders: next });
                }}
                accessibilityRole="button"
                accessibilityLabel={remindersExpanded ? 'Hide reminders' : 'Show reminders'}
                accessibilityState={{ expanded: remindersExpanded }}
                hitSlop={6}
                style={({ pressed }) => ({
                  marginLeft: 'auto',
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
            </View>
            {remindersExpanded ? (
              <View
                style={{
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.text,
                }}
              >
                {upcomingInteractions.map((interaction) => {
                  const vendor = interaction.vendorId
                    ? vendorById(state, interaction.vendorId)
                    : undefined;
                  const interactionPhotos = photosForVendorInteraction(state, interaction.id);
                  const methodLabel = vendorContactMethodLabel(interaction.contactMethod);
                  const notesParts = [methodLabel, interaction.notes?.trim()].filter(Boolean);
                  return (
                    <UpcomingReminderCard
                      key={interaction.id}
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
                    />
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={sharedStyles.propertySectionPanel}>
          <EditableDetailSection
            title="Description"
            isEditing={editingSection === 'description'}
            onPress={() => openSection('description')}
            onDone={keyboardDone.dismiss}
            useEditIcon
            expanded={descriptionExpanded}
            onToggleExpanded={() => {
              const next = !descriptionExpanded;
              setDescriptionExpanded(next);
              void setProjectSectionExpand({ description: next });
            }}
            showExpandControl={descriptionDraft.trim().length > 0}
          >
            {helpVisible ? (
              <SectionHelpTip>All details for this project that you want to share.</SectionHelpTip>
            ) : null}
            {editingSection === 'description' ? (
              <TextInput
                ref={descriptionInputRef}
                style={[sharedStyles.input, sharedStyles.inputMultiline]}
                value={descriptionDraft}
                onChangeText={setDescriptionDraft}
                placeholder="What this project involves"
                placeholderTextColor={colors.textMuted}
                multiline
                autoFocus
                {...keyboardDone.getTextInputProps({
                  onFocus: () => measureAndScroll(descriptionInputRef.current),
                })}
              />
            ) : descriptionDraft.trim() ? (
              <Text style={[sharedStyles.cardMeta, { marginTop: 0, color: colors.text }]}>
                {descriptionDraft.trim()}
              </Text>
            ) : null}
          </EditableDetailSection>
        </View>

        <View style={sharedStyles.propertySectionPanel}>
          <EditableDetailSection
            title="Intro to vendors"
            isEditing={editingSection === 'intro'}
            onPress={() => openSection('intro')}
            onDone={keyboardDone.dismiss}
            useEditIcon
            expanded={introExpanded}
            onToggleExpanded={() => {
              const next = !introExpanded;
              setIntroExpanded(next);
              void setProjectSectionExpand({ intro: next });
            }}
            showExpandControl={introDraft.trim().length > 0}
          >
            {helpVisible ? (
              <SectionHelpTip>
                Text that will be shared with vendors when you use Share from Utilities.
              </SectionHelpTip>
            ) : null}
            {editingSection === 'intro' ? (
              <TextInput
                ref={introInputRef}
                style={[sharedStyles.input, sharedStyles.inputMultiline, { minHeight: 120 }]}
                value={introDraft}
                onChangeText={setIntroDraft}
                placeholder="Who you are, project scope, timeframe, and anything vendors should know"
                placeholderTextColor={colors.textMuted}
                multiline
                autoFocus
                {...keyboardDone.getTextInputProps({
                  onFocus: () => measureAndScroll(introInputRef.current),
                })}
              />
            ) : introDraft.trim() ? (
              <Text style={[sharedStyles.cardMeta, { marginTop: 0, color: colors.text }]}>
                {introDraft.trim()}
              </Text>
            ) : null}
          </EditableDetailSection>
        </View>

        <View style={sharedStyles.propertySectionPanel}>
          <EditableDetailSection
            title="Private notes"
            isEditing={editingSection === 'questions'}
            onPress={() => openSection('questions')}
            onDone={keyboardDone.dismiss}
            useEditIcon
            expanded={questionsExpanded}
            onToggleExpanded={() => {
              const next = !questionsExpanded;
              setQuestionsExpanded(next);
              void setProjectSectionExpand({ questions: next });
            }}
            showExpandControl={questionsDraft.trim().length > 0}
          >
            {helpVisible ? (
              <SectionHelpTip>Notes to yourself that will not be shared with Vendors.</SectionHelpTip>
            ) : null}
            {editingSection === 'questions' ? (
              <TextInput
                ref={questionsInputRef}
                style={[sharedStyles.input, sharedStyles.inputMultiline, { minHeight: 120 }]}
                value={questionsDraft}
                onChangeText={setQuestionsDraft}
                placeholder="Private notes for yourself"
                placeholderTextColor={colors.textMuted}
                multiline
                autoFocus
                {...keyboardDone.getTextInputProps({
                  onFocus: () => measureAndScroll(questionsInputRef.current),
                })}
              />
            ) : questionsDraft.trim() ? (
              <Text style={[sharedStyles.cardMeta, { marginTop: 0, color: colors.text }]}>
                {questionsDraft.trim()}
              </Text>
            ) : null}
          </EditableDetailSection>
        </View>

        {projectSwipeEnabled ? (
          <GestureDetector gesture={projectSwipeGestureForVendors}>
            <View>{vendorsSection}</View>
          </GestureDetector>
        ) : (
          vendorsSection
        )}

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
              title="Punch list"
              expanded={punchListExpanded}
              count={punchItems.length}
              doneCount={punchItems.filter((item) => item.done).length}
              onExpand={() => {
                const next = !punchListExpanded;
                setPunchListExpanded(next);
                void setProjectSectionExpand({ punchList: next });
              }}
            />
            <Pressable
              onPress={openAddPunchItem}
              accessibilityRole="button"
              accessibilityLabel="Add punch item"
              hitSlop={6}
              style={({ pressed }) => ({
                padding: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons name="add" size={24} color={colors.primary} />
            </Pressable>
            {punchItems.length > 0 ? (
              <Pressable
                onPress={() => {
                  const next = !punchListExpanded;
                  setPunchListExpanded(next);
                  void setProjectSectionExpand({ punchList: next });
                }}
                accessibilityRole="button"
                accessibilityLabel={punchListExpanded ? 'Hide punch list' : 'Show punch list'}
                accessibilityState={{ expanded: punchListExpanded }}
                hitSlop={6}
                style={({ pressed }) => ({
                  marginLeft: 'auto',
                  padding: 4,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <MaterialIcons
                  name={punchListExpanded ? 'expand-less' : 'expand-more'}
                  size={24}
                  color={colors.primary}
                />
              </Pressable>
            ) : null}
          </View>
          {helpVisible ? (
            <SectionHelpTip>
              Track issues that must be resolved to finish this project.
            </SectionHelpTip>
          ) : null}
          {punchItems.length === 0 ? (
            <Text style={sharedStyles.emptyText}>
              Add punch items for incomplete work, defects, or final checklist tasks.
            </Text>
          ) : punchListExpanded ? (
            <View
              style={{
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.text,
              }}
            >
              {punchItems.map((item) => (
                <PropertyTodoListRow
                  key={item.id}
                  title={item.title}
                  dueLabel={item.dueAtISO ? formatDisplayDate(item.dueAtISO) : undefined}
                  notes={item.notes}
                  done={item.done}
                  thumbnailUri={photosForPunchItem(state, item.id)[0]?.localUri}
                  onPress={() => onOpenPunchItem(item.id)}
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
              expanded={recentInteractionsExpanded}
              count={projectInteractions.length}
              onExpand={() => {
                const next = !recentInteractionsExpanded;
                setRecentInteractionsExpanded(next);
                void setProjectSectionExpand({ recentInteractions: next });
              }}
            />
            {projectInteractions.length > 0 ? (
              <Pressable
                onPress={() => {
                  const next = !recentInteractionsExpanded;
                  setRecentInteractionsExpanded(next);
                  void setProjectSectionExpand({ recentInteractions: next });
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  recentInteractionsExpanded
                    ? "Hide what's happening"
                    : "Show what's happening"
                }
                accessibilityState={{ expanded: recentInteractionsExpanded }}
                hitSlop={6}
                style={({ pressed }) => ({
                  marginLeft: 'auto',
                  padding: 4,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <MaterialIcons
                  name={recentInteractionsExpanded ? 'expand-less' : 'expand-more'}
                  size={24}
                  color={colors.primary}
                />
              </Pressable>
            ) : null}
          </View>
          {projectInteractions.length === 0 ? (
            <Text style={sharedStyles.emptyText}>No interactions yet for this project.</Text>
          ) : recentInteractionsExpanded ? (
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
                {recentInteractionGroups.map((group) => {
                  const expanded = isInteractionBucketExpanded(group.bucket);
                  const isTodayBucket = group.bucket === 'today';
                  return (
                    <View key={group.bucket}>
                      <ActivityBucketBanner
                        label={group.label}
                        count={interactionBucketCounts[group.bucket]}
                        expanded={expanded}
                        variant={isTodayBucket ? 'today' : 'default'}
                        onToggle={() => toggleInteractionBucket(group.bucket)}
                        attachedToGroup
                      />
                      {expanded ? (
                        <View
                          style={[
                            sharedStyles.activityBucketGroup,
                            isTodayBucket && sharedStyles.activityBucketGroupToday,
                          ]}
                        >
                          {group.interactions.map((interaction, index) => {
                            const frameColor = isTodayBucket
                              ? colors.danger
                              : colors.sectionTitle;
                            const betweenRows = index < group.interactions.length - 1;
                            const vendor = interaction.vendorId
                              ? vendorById(state, interaction.vendorId)
                              : undefined;
                            const photo = photosForVendorInteraction(state, interaction.id)[0];
                            return (
                              <PropertyInteractionListRow
                                key={interaction.id}
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
                          })}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
              {projectInteractions.length > 5 ? (
                <Pressable
                  onPress={() => onSearchActivity?.()}
                  accessibilityRole="button"
                  accessibilityLabel={`Show all project activity, ${projectInteractions.length} items`}
                  style={({ pressed }) => ({
                    alignSelf: 'flex-start',
                    marginTop: 4,
                    marginBottom: 8,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={sharedStyles.textLink}>
                    Show all ({projectInteractions.length})
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
      )}

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
                {proj.name}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                runMenuAction(() => openShareOptions(PROJECT_SHARE_PRESET_ALL))
              }
              disabled={exporting}
              accessibilityRole="button"
              accessibilityLabel="Share"
              accessibilityState={{ disabled: exporting }}
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: exporting ? 0.35 : pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                Share
              </Text>
            </Pressable>
            <Pressable
              onPress={() => runMenuAction(() => playFavoriteSlideshow())}
              accessibilityRole="button"
              accessibilityLabel="Play slideshow"
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                Play slideshow
              </Text>
            </Pressable>
            <Pressable
              onPress={() => runMenuAction(openSlideshowEditor)}
              accessibilityRole="button"
              accessibilityLabel="Edit slideshow"
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="star" size={20} color={colors.primary} />
                <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                  Edit slideshow
                </Text>
              </View>
            </Pressable>
            {hasRejectedVendor ? (
              <Pressable
                onPress={() =>
                  runMenuAction(() => {
                    const next = !hideRejected;
                    setHideRejected(next);
                    void setHideRejectedVendors(next);
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={
                  hideRejected ? 'Show Rejected Vendors' : 'Hide Rejected Vendors'
                }
                style={({ pressed }) => ({
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: colors.hairline,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                  {hideRejected ? 'Show Rejected Vendors' : 'Hide Rejected Vendors'}
                </Text>
              </Pressable>
            ) : null}
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
              onPress={() => runMenuAction(confirmDeleteProject)}
              accessibilityRole="button"
              accessibilityLabel="Delete project"
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.danger }}>
                Delete project
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

      {propertyId ? propertyGearCreateModals : null}

      <ProjectShareOptionsModal
        visible={shareOptionsOpen}
        projectName={project.name.trim() || 'Project'}
        include={shareInclude}
        onChangeInclude={setShareInclude}
        photoMode={sharePhotoMode}
        onChangePhotoMode={setSharePhotoMode}
        showPhotoMode={projectGalleryHasFavorites}
        shareFormat={shareFormat}
        onChangeShareFormat={setShareFormat}
        onShare={() => void runProjectExport(shareInclude, sharePhotoMode, shareFormat)}
        onClose={() => setShareOptionsOpen(false)}
      />

      <RenameModal
        visible={addVendorOpen}
        title="New vendor"
        value={newVendorName}
        onChangeText={setNewVendorName}
        onSave={saveNewVendor}
        onClose={() => setAddVendorOpen(false)}
        placeholder="Company or vendor name"
        saveLabel="Create"
      />

      <RenameModal
        visible={addPunchOpen}
        title="New punch item"
        value={newPunchTitle}
        onChangeText={setNewPunchTitle}
        onSave={saveNewPunchItem}
        onClose={() => setAddPunchOpen(false)}
        placeholder="What still needs fixing"
        saveLabel="Create"
      />

      <RenameModal
        visible={renameOpen}
        title="Rename project"
        value={renameDraft}
        onChangeText={setRenameDraft}
        onSave={saveProjectName}
        onClose={() => setRenameOpen(false)}
        placeholder="Project name"
      />

      <Modal visible={exportSnapshot != null} transparent animationType="none" onRequestClose={() => {}}>
        <View
          style={{ position: 'absolute', left: 0, top: 0, opacity: 0 }}
          pointerEvents="none"
        >
          <View ref={exportRef} collapsable={false}>
            {exportSnapshot ? <ProjectExportSheet snapshot={exportSnapshot} /> : null}
          </View>
        </View>
      </Modal>

      <SlideshowEditorModal
        visible={slideshowEditorOpen}
        state={state}
        projectId={projectId}
        onSave={onSave}
        onClose={() => setSlideshowEditorOpen(false)}
        onPlay={playFavoriteSlideshow}
      />

      <ProjectAllPhotosModal
        visible={allPhotosOpen}
        state={state}
        projectId={projectId}
        onClose={() => setAllPhotosOpen(false)}
        onView={viewAllProjectPhotos}
        onOpenOwner={openPhotoOwner}
      />

      {exporting ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : null}
    </KeyboardAvoidingView>
    </ReuseExistingPhotosProvider>
  );
}
