import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { ScrollView as RNScrollView, TextInput as RNTextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, TextInput, useTextScaleControls } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppState, ProjectVendor, VendorContactMethod } from '../types';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { ITEM_LIST_THUMB_SIZE, PropertyInteractionListRow } from '../components/ListRows';
import { InteractionsExportSheet } from '../components/InteractionsExportSheet';
import { useKeyboardDoneAccessory } from '../components/KeyboardDoneAccessory';
import { sharedStyles, colors } from '../theme';
import { formatDisplayDate } from '../utils';
import { isAfterToday } from '../eventRecurrence';
import {
  findInteractionSearchMatch,
  type InteractionSearchMatchField,
} from '../searchSnippet';
import {
  allVendorInteractions,
  interactionsForProject,
  interactionsForProperty,
  photosForVendorInteraction,
  projectById,
  projectsForProperty,
  propertyById,
  propertyIdForInteraction,
  projectIdForInteraction,
  vendorById,
} from '../storage';
import { firstPhotoUriForVendor } from '../vendorPhotos';
import { propertyCoverPhotoUri } from '../propertyPhotos';
import {
  VENDOR_CONTACT_METHOD_OPTIONS,
  vendorContactMethodLabel,
} from '../vendorContactMethod';
import { vendorStatusColor, vendorStatusLabel } from '../vendorStatus';
import {
  buildInteractionsExportSnapshot,
  type InteractionsExportSnapshot,
} from '../interactionsExportContent';
import { DEFAULT_SHARE_FORMAT, type ShareFormat } from '../shareFormat';
import { shareViewAsPng } from '../shareViewImage';
import { shareHtmlAsPdf } from '../shareViewPdf';
import { buildExportPdfHtml, interactionsSnapshotToPdfDoc } from '../exportPdfHtml';
import { ShareFormatModal } from '../components/ShareFormatModal';
import {
  ToolbarNewSearchControls,
  usePropertyGearNav,
  type PropertyGearNavItem,
} from '../components/PropertyGearNavItems';
import {
  getInteractionListFilters,
  hasInteractionListFilters,
  interactionListFilterScopeKey,
  setInteractionListFilters,
} from '../interactionListFilterPrefs';

function vendorNameKey(name: string): string {
  return name.trim().toLowerCase();
}

const NO_VENDOR_NAME_KEY = '__no_vendor__';

export function PropertyInteractionsScreen(props: {
  state: AppState;
  propertyId?: string;
  projectId?: string;
  /** When opening from a vendor, pre-select that vendor in the filter. */
  initialVendorId?: string;
  /** When true, show Search even if under the usual threshold (does not focus the field). */
  focusSearch?: boolean;
  onBack: () => void;
  /** Omit on the all-properties list (Home); home icon is hidden. */
  onGoToProperty?: () => void;
  onOpenInteraction: (
    vendorId: string | undefined,
    interactionId: string,
    options?: { searchQuery?: string; searchMatchField?: InteractionSearchMatchField }
  ) => void;
  onOpenVendor: (vendorId: string) => void;
  /** Opens new interaction for a resolved property (and optional vendor). */
  onAddInteraction?: (propertyId: string, vendorId?: string) => void;
  onAddServiceEvent?: () => void;
  onSearchAssets?: () => void;
  onSearchServiceHistory?: () => void;
  onSearchActivity?: () => void;
  onOpenProject?: (projectId: string) => void;
  onOpenItem?: (itemId: string, startEditingSection?: 'appliance' | 'purchase' | 'repair') => void;
  onSave?: (state: AppState) => void;
}) {
  const {
    state,
    propertyId,
    projectId,
    initialVendorId,
    focusSearch = false,
    onBack,
    onGoToProperty,
    onOpenInteraction,
    onOpenVendor,
    onAddInteraction,
    onAddServiceEvent,
    onSearchAssets,
    onSearchServiceHistory,
    onSearchActivity,
    onOpenProject,
    onOpenItem,
    onSave,
  } = props;
  const insets = useSafeAreaInsets();
  const textScaleControls = useTextScaleControls();
  const keyboardDone = useKeyboardDoneAccessory({
    id: 'propertyInteractionsDone',
    variant: 'overlay',
  });
  const exportRef = useRef<View>(null);
  const scrollRef = useRef<RNScrollView>(null);
  const scrollYRef = useRef(0);
  const searchInputRef = useRef<RNTextInput>(null);
  const pendingFocusRef = useRef<{ y: number; height: number } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isAllScope = !propertyId && !projectId;
  const scopeKey = interactionListFilterScopeKey({ propertyId, projectId });
  const savedFilters = getInteractionListFilters(scopeKey);
  const hasSavedFilters = hasInteractionListFilters(scopeKey);
  const routePropertyId =
    propertyId ??
    (projectId ? projectById(state, projectId)?.propertyId : undefined);

  const [selectedVendorNameKey, setSelectedVendorNameKey] = useState<string | null>(() => {
    if (initialVendorId) {
      const initial = vendorById(state, initialVendorId);
      return initial ? vendorNameKey(initial.name) : savedFilters.selectedVendorNameKey;
    }
    return savedFilters.selectedVendorNameKey;
  });
  const [vendorMenuOpen, setVendorMenuOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(() => {
    if (hasSavedFilters) return savedFilters.selectedPropertyId;
    // First visit: seed property/project routes to the route property so the list
    // matches how the screen was opened; all-scope stays "All properties".
    return routePropertyId ?? savedFilters.selectedPropertyId;
  });
  const [propertyMenuOpen, setPropertyMenuOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    if (hasSavedFilters) return savedFilters.selectedProjectId;
    // First visit on project route: keep the list scoped to that project.
    return projectId ?? savedFilters.selectedProjectId;
  });
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [selectedContactMethod, setSelectedContactMethod] = useState<VendorContactMethod | null>(
    savedFilters.selectedContactMethod
  );
  const [contactMethodMenuOpen, setContactMethodMenuOpen] = useState(false);
  const [selectedImportantOnly, setSelectedImportantOnly] = useState(
    savedFilters.selectedImportantOnly
  );
  const [importantMenuOpen, setImportantMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(savedFilters.searchQuery);
  const [menuOpen, setMenuOpen] = useState(false);
  const [forceShowSearch, setForceShowSearch] = useState(
    focusSearch || savedFilters.forceShowSearch
  );
  const [exporting, setExporting] = useState(false);
  const [exportSnapshot, setExportSnapshot] = useState<InteractionsExportSnapshot | null>(null);
  const [shareOptionsOpen, setShareOptionsOpen] = useState(false);
  const [shareFormat, setShareFormat] = useState<ShareFormat>(DEFAULT_SHARE_FORMAT);

  useEffect(() => {
    setInteractionListFilters(scopeKey, {
      selectedPropertyId,
      selectedProjectId,
      selectedVendorNameKey,
      selectedContactMethod,
      selectedImportantOnly,
      searchQuery,
      forceShowSearch,
    });
  }, [
    scopeKey,
    selectedPropertyId,
    selectedProjectId,
    selectedVendorNameKey,
    selectedContactMethod,
    selectedImportantOnly,
    searchQuery,
    forceShowSearch,
  ]);

  const property = propertyId ? propertyById(state, propertyId) : undefined;
  const project = projectId ? projectById(state, projectId) : undefined;
  const propertyForScope =
    property ?? (project ? propertyById(state, project.propertyId) : undefined);
  const gearPropertyId = selectedPropertyId ?? propertyForScope?.id ?? '';
  const showPropertyGearNav = Boolean(gearPropertyId);

  /** Every property (picker when more than one), on all routes. */
  const propertiesInList = useMemo(
    () => [...state.properties].sort((a, b) => a.name.localeCompare(b.name)),
    [state.properties]
  );

  const showPropertyPicker = propertiesInList.length > 1;

  const propertyScopedInteractions = useMemo(() => {
    if (selectedPropertyId) {
      return interactionsForProperty(state, selectedPropertyId);
    }
    // "All properties" — including when the user overrides a property/project route.
    if (showPropertyPicker || isAllScope) {
      return allVendorInteractions(state);
    }
    // Single-property app: keep route scope.
    if (projectId) return interactionsForProject(state, projectId);
    if (propertyId) return interactionsForProperty(state, propertyId);
    return allVendorInteractions(state);
  }, [
    isAllScope,
    projectId,
    propertyId,
    selectedPropertyId,
    showPropertyPicker,
    state,
  ]);

  const projectsInList = useMemo(() => {
    if (!selectedPropertyId) return [];
    return projectsForProperty(state, selectedPropertyId);
  }, [selectedPropertyId, state]);

  const showProjectPicker = projectsInList.length > 1;

  const projectScopedInteractions = useMemo(() => {
    if (!selectedProjectId) return propertyScopedInteractions;
    const vendorIds = new Set(
      state.projectVendors
        .filter((vendor) => vendor.projectId === selectedProjectId)
        .map((vendor) => vendor.id)
    );
    return propertyScopedInteractions.filter(
      (interaction) =>
        interaction.projectId === selectedProjectId ||
        Boolean(interaction.vendorId && vendorIds.has(interaction.vendorId))
    );
  }, [propertyScopedInteractions, selectedProjectId, state.projectVendors]);

  const vendorsInList = useMemo(() => {
    /** Distinct company names in the current project scope (same name may span projects). */
    const byName = new Map<
      string,
      { nameKey: string; displayName: string; representative?: ProjectVendor }
    >();
    let hasNoVendor = false;
    for (const interaction of projectScopedInteractions) {
      if (!interaction.vendorId) {
        hasNoVendor = true;
        continue;
      }
      const vendor = vendorById(state, interaction.vendorId);
      if (!vendor) continue;
      const nameKey = vendorNameKey(vendor.name);
      if (!nameKey || byName.has(nameKey)) continue;
      byName.set(nameKey, {
        nameKey,
        displayName: vendor.name.trim() || vendor.name,
        representative: vendor,
      });
    }
    const entries = [...byName.values()].sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );
    if (hasNoVendor) {
      entries.push({
        nameKey: NO_VENDOR_NAME_KEY,
        displayName: 'No vendor',
      });
    }
    return entries;
  }, [projectScopedInteractions, state]);

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    setTimeout(action, 50);
  }

  function openAddInteraction() {
    if (!onAddInteraction) return;
    const solePropertyId =
      propertiesInList.length === 1 ? propertiesInList[0]!.id : undefined;
    const resolvedPropertyId =
      selectedPropertyId ??
      solePropertyId ??
      propertyId ??
      project?.propertyId;
    if (!resolvedPropertyId) {
      Alert.alert(
        'Select a property',
        'Choose a property in the filter before adding an interaction.'
      );
      return;
    }
    const vendorFromFilter =
      selectedVendorNameKey && selectedVendorNameKey !== NO_VENDOR_NAME_KEY
        ? vendorsInList.find((entry) => entry.nameKey === selectedVendorNameKey)?.representative
        : undefined;
    onAddInteraction(
      resolvedPropertyId,
      initialVendorId ?? vendorFromFilter?.id
    );
  }

  const noop = () => {};
  const {
    newItems: propertyNewItems,
    searchItems: propertySearchItems,
    createModals: propertyGearCreateModals,
  } = usePropertyGearNav({
    state,
    propertyId: gearPropertyId,
    runMenuAction,
    actions: {
      onAddInteraction: openAddInteraction,
      onAddServiceEvent: onAddServiceEvent ?? noop,
      onSearchAssets: onSearchAssets ?? noop,
      onSearchInteractions: () => {
        setForceShowSearch(true);
      },
      onSearchServiceHistory: onSearchServiceHistory ?? noop,
      onSearchActivity,
      onOpenProject: onOpenProject ?? noop,
      onOpenItem: onOpenItem ?? noop,
      onSave: onSave ?? noop,
    },
  });

  const interactionsFallbackNewItems: PropertyGearNavItem[] = onAddInteraction
    ? [
        {
          key: 'interaction',
          prefix: 'New',
          keyword: 'Interaction',
          icon: 'forum',
          onPress: () => runMenuAction(openAddInteraction),
        },
      ]
    : [];
  const interactionsFallbackSearchItems: PropertyGearNavItem[] = [
    {
      key: 'searchInteractions',
      prefix: 'Search',
      keyword: 'Interactions',
      icon: 'forum',
      helpText: 'Conversations',
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
  const toolbarNewItems = showPropertyGearNav
    ? propertyNewItems
    : interactionsFallbackNewItems;
  const toolbarSearchItems = showPropertyGearNav
    ? propertySearchItems
    : interactionsFallbackSearchItems;

  const vendorScopedInteractions = useMemo(
    () =>
      selectedVendorNameKey
        ? projectScopedInteractions.filter((interaction) => {
            if (selectedVendorNameKey === NO_VENDOR_NAME_KEY) {
              return !interaction.vendorId;
            }
            if (!interaction.vendorId) return false;
            const vendor = vendorById(state, interaction.vendorId);
            return Boolean(vendor && vendorNameKey(vendor.name) === selectedVendorNameKey);
          })
        : projectScopedInteractions,
    [projectScopedInteractions, selectedVendorNameKey, state]
  );

  const contactMethodsInList = useMemo(() => {
    const present = new Set(vendorScopedInteractions.map((i) => i.contactMethod));
    return VENDOR_CONTACT_METHOD_OPTIONS.filter((opt) => present.has(opt.id));
  }, [vendorScopedInteractions]);

  useEffect(() => {
    if (
      selectedContactMethod &&
      !contactMethodsInList.some((method) => method.id === selectedContactMethod)
    ) {
      setSelectedContactMethod(null);
    }
  }, [contactMethodsInList, selectedContactMethod]);

  const hasImportantInList = useMemo(
    () => vendorScopedInteractions.some((interaction) => interaction.important === true),
    [vendorScopedInteractions]
  );

  useEffect(() => {
    if (selectedImportantOnly && !hasImportantInList) {
      setSelectedImportantOnly(false);
    }
  }, [hasImportantInList, selectedImportantOnly]);

  const showVendorPicker = vendorsInList.length > 1;
  const showContactMethodPicker = contactMethodsInList.length > 1;
  const showImportantPicker = hasImportantInList;
  const showSearch = projectScopedInteractions.length >= 3 || forceShowSearch;

  useEffect(() => {
    if (
      selectedVendorNameKey &&
      !vendorsInList.some((entry) => entry.nameKey === selectedVendorNameKey)
    ) {
      setSelectedVendorNameKey(null);
    }
  }, [selectedVendorNameKey, vendorsInList]);

  useEffect(() => {
    if (
      selectedPropertyId &&
      !propertiesInList.some((entry) => entry.id === selectedPropertyId)
    ) {
      setSelectedPropertyId(null);
    }
  }, [propertiesInList, selectedPropertyId]);

  useEffect(() => {
    if (
      selectedProjectId &&
      !projectsInList.some((project) => project.id === selectedProjectId)
    ) {
      setSelectedProjectId(null);
    }
  }, [projectsInList, selectedProjectId]);

  const effectiveVendorNameKey =
    selectedVendorNameKey &&
    vendorsInList.some((entry) => entry.nameKey === selectedVendorNameKey)
      ? selectedVendorNameKey
      : vendorsInList.length === 1
        ? vendorsInList[0]!.nameKey
        : null;

  const singleVendorEntry =
    effectiveVendorNameKey != null
      ? vendorsInList.find((entry) => entry.nameKey === effectiveVendorNameKey)
      : undefined;
  const singleVendor = singleVendorEntry?.representative;
  const singleVendorMode =
    Boolean(singleVendorEntry) &&
    (vendorsInList.length === 1 || selectedVendorNameKey != null);

  const filteredInteractions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return projectScopedInteractions.filter((interaction) => {
      if (selectedVendorNameKey) {
        if (selectedVendorNameKey === NO_VENDOR_NAME_KEY) {
          if (interaction.vendorId) return false;
        } else {
          const vendor = interaction.vendorId
            ? vendorById(state, interaction.vendorId)
            : undefined;
          if (!vendor || vendorNameKey(vendor.name) !== selectedVendorNameKey) return false;
        }
      }
      if (selectedContactMethod && interaction.contactMethod !== selectedContactMethod) {
        return false;
      }
      if (selectedImportantOnly && interaction.important !== true) {
        return false;
      }
      if (!query) return true;
      const vendor = interaction.vendorId
        ? vendorById(state, interaction.vendorId)
        : undefined;
      const interactionProjectId = projectIdForInteraction(state, interaction);
      const vendorProject = interactionProjectId
        ? projectById(state, interactionProjectId)
        : undefined;
      const propertyIdValue = propertyIdForInteraction(state, interaction);
      const vendorProperty = propertyIdValue
        ? propertyById(state, propertyIdValue)
        : undefined;
      const methodLabel = vendorContactMethodLabel(interaction.contactMethod);
      const dateLabel = formatDisplayDate(interaction.occurredAtISO);
      const haystack = [
        interaction.contactName,
        vendor?.name,
        interaction.notes,
        methodLabel,
        dateLabel,
        vendorProject?.name,
        vendorProperty?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [
    projectScopedInteractions,
    searchQuery,
    selectedContactMethod,
    selectedImportantOnly,
    selectedVendorNameKey,
    state,
  ]);

  const selectedPropertyLabel =
    selectedPropertyId == null
      ? 'All properties'
      : (propertiesInList.find((entry) => entry.id === selectedPropertyId)?.name ??
        'All properties');
  const selectedProperty =
    selectedPropertyId == null
      ? undefined
      : propertiesInList.find((entry) => entry.id === selectedPropertyId);
  const selectedPropertyCoverUri = selectedProperty
    ? propertyCoverPhotoUri(state, selectedProperty)
    : undefined;

  const subtitle =
    selectedPropertyId != null
      ? selectedPropertyLabel
      : showPropertyPicker || isAllScope
        ? 'All properties'
        : (project?.name ?? property?.name ?? 'All properties');
  const scopeMissing = projectId ? !project : propertyId ? !property : false;
  const showingAcrossProperties =
    selectedPropertyId == null && (showPropertyPicker || isAllScope);

  const selectedProjectLabel =
    selectedProjectId == null
      ? 'All projects'
      : (projectsInList.find((entry) => entry.id === selectedProjectId)?.name ?? 'All projects');

  const selectedVendorLabel =
    selectedVendorNameKey == null
      ? 'All vendors'
      : (vendorsInList.find((entry) => entry.nameKey === selectedVendorNameKey)?.displayName ??
        'All vendors');

  const selectedContactMethodLabel =
    selectedContactMethod == null
      ? 'All methods'
      : vendorContactMethodLabel(selectedContactMethod);

  const selectedImportantLabel = selectedImportantOnly ? 'Important only' : 'All';

  const openShareOptions = useCallback(() => {
    setShareFormat(DEFAULT_SHARE_FORMAT);
    setShareOptionsOpen(true);
  }, []);

  const runInteractionsExport = useCallback(
    async (format: ShareFormat = DEFAULT_SHARE_FORMAT) => {
      if (!subtitle) {
        Alert.alert('Share failed', 'Could not build interactions summary.');
        return;
      }
      const filterLines = [
        selectedPropertyId != null ? `Property: ${selectedPropertyLabel}` : undefined,
        selectedProjectId != null ? `Project: ${selectedProjectLabel}` : undefined,
        selectedVendorNameKey != null ? `Vendor: ${selectedVendorLabel}` : undefined,
        selectedContactMethod != null ? `Method: ${selectedContactMethodLabel}` : undefined,
        selectedImportantOnly ? `Important: ${selectedImportantLabel}` : undefined,
        searchQuery.trim() ? `Search: ${searchQuery.trim()}` : undefined,
      ].filter((line): line is string => Boolean(line));

      const snapshot = buildInteractionsExportSnapshot({
        state,
        interactions: filteredInteractions,
        scopeTitle: subtitle,
        scopeMetaLines:
          project && propertyForScope && project.name !== propertyForScope.name
            ? [propertyForScope.name]
            : [],
        filterLines,
      });
      setShareOptionsOpen(false);
      if (format === 'pdf') {
        setExporting(true);
        try {
          const html = await buildExportPdfHtml(interactionsSnapshotToPdfDoc(snapshot));
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
      filteredInteractions,
      project,
      propertyForScope,
      searchQuery,
      selectedContactMethod,
      selectedContactMethodLabel,
      selectedImportantLabel,
      selectedImportantOnly,
      selectedProjectId,
      selectedProjectLabel,
      selectedPropertyId,
      selectedPropertyLabel,
      selectedVendorNameKey,
      selectedVendorLabel,
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

  // After keyboardHeight updates content padding, re-measure and scroll. Empty /
  // short lists cannot scroll on the first keyboard-show pass because padding
  // has not grown yet — this second pass is what keeps Search visible.
  useEffect(() => {
    if (keyboardHeight <= 0 || !pendingFocusRef.current) return;
    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.measureInWindow((_x, y, _w, height) => {
        pendingFocusRef.current = { y, height };
        scrollFieldIntoView(y, height, keyboardHeight);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [keyboardHeight, scrollFieldIntoView]);

  if (scopeMissing || !subtitle) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>
          {projectId ? 'Project not found.' : 'Property not found.'}
        </Text>
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
          {onGoToProperty ? (
            <Pressable
              onPress={onGoToProperty}
              disabled={exporting}
              accessibilityRole="button"
              accessibilityLabel="Go to property"
              accessibilityHint="Opens the property page for these interactions."
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
            accessibilityLabel="Share interactions"
            accessibilityHint="Creates an image of the current interactions list and opens the share sheet."
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
            title="Interactions search"
            newItems={toolbarNewItems}
            searchItems={toolbarSearchItems}
            disabled={exporting}
          />
          <Pressable
            onPress={() => setMenuOpen(true)}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Interactions options"
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
            // Extra bottom space when keyboard is open so empty / short lists can still
            // scroll the Search field above the keyboard.
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
        <Text style={sharedStyles.title}>Interactions search</Text>
        <Text style={sharedStyles.subtitle}>{subtitle}</Text>

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
                    setVendorMenuOpen(false);
                    setContactMethodMenuOpen(false);
                    setImportantMenuOpen(false);
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
                        setSelectedProjectId(null);
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
                setVendorMenuOpen(false);
                setContactMethodMenuOpen(false);
                setImportantMenuOpen(false);
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

        {showVendorPicker ? (
          <View
            style={{
              marginTop: showProjectPicker || showPropertyPicker ? 0 : 4,
              marginBottom: 8,
            }}
          >
            <Text style={sharedStyles.fieldLabel}>Vendor</Text>
            <Pressable
              onPress={() => {
                setProjectMenuOpen(false);
                setPropertyMenuOpen(false);
                setContactMethodMenuOpen(false);
                setImportantMenuOpen(false);
                setVendorMenuOpen((open) => !open);
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
              accessibilityLabel="Filter by vendor"
              accessibilityHint="Opens a list of vendors"
              accessibilityState={{ expanded: vendorMenuOpen }}
            >
              <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                {selectedVendorLabel}
              </Text>
              <MaterialIcons
                name={vendorMenuOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
                size={24}
                color={colors.textMuted}
              />
            </Pressable>
            {vendorMenuOpen ? (
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
                    setSelectedVendorNameKey(null);
                    setVendorMenuOpen(false);
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
                  accessibilityState={{ selected: selectedVendorNameKey == null }}
                >
                  <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>All vendors</Text>
                  {selectedVendorNameKey == null ? (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
                {vendorsInList.map((entry, index) => {
                  const selected = selectedVendorNameKey === entry.nameKey;
                  return (
                    <Pressable
                      key={entry.nameKey}
                      onPress={() => {
                        setSelectedVendorNameKey(entry.nameKey);
                        setVendorMenuOpen(false);
                      }}
                      style={({ pressed }) => [
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          borderBottomWidth: index < vendorsInList.length - 1 ? 1 : 0,
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

        {showContactMethodPicker ? (
          <View style={{ marginBottom: 8 }}>
            <Text style={sharedStyles.fieldLabel}>How contacted</Text>
            <Pressable
              onPress={() => {
                setProjectMenuOpen(false);
                setPropertyMenuOpen(false);
                setVendorMenuOpen(false);
                setImportantMenuOpen(false);
                setContactMethodMenuOpen((open) => !open);
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
              accessibilityLabel="Filter by how contacted"
              accessibilityHint="Opens a list of contact methods"
              accessibilityState={{ expanded: contactMethodMenuOpen }}
            >
              <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                {selectedContactMethodLabel}
              </Text>
              <MaterialIcons
                name={contactMethodMenuOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
                size={24}
                color={colors.textMuted}
              />
            </Pressable>
            {contactMethodMenuOpen ? (
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
                    setSelectedContactMethod(null);
                    setContactMethodMenuOpen(false);
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
                  accessibilityState={{ selected: selectedContactMethod == null }}
                >
                  <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>All methods</Text>
                  {selectedContactMethod == null ? (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
                {contactMethodsInList.map((method, index) => {
                  const selected = selectedContactMethod === method.id;
                  return (
                    <Pressable
                      key={method.id}
                      onPress={() => {
                        setSelectedContactMethod(method.id);
                        setContactMethodMenuOpen(false);
                      }}
                      style={({ pressed }) => [
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          borderBottomWidth: index < contactMethodsInList.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                          backgroundColor: pressed ? colors.bg : 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                        {method.label}
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

        {showImportantPicker ? (
          <View style={{ marginBottom: 8 }}>
            <Text style={sharedStyles.fieldLabel}>Important</Text>
            <Pressable
              onPress={() => {
                setProjectMenuOpen(false);
                setPropertyMenuOpen(false);
                setVendorMenuOpen(false);
                setContactMethodMenuOpen(false);
                setImportantMenuOpen((open) => !open);
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
              accessibilityLabel="Filter by important"
              accessibilityHint="Opens important filter options"
              accessibilityState={{ expanded: importantMenuOpen }}
            >
              <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                {selectedImportantLabel}
              </Text>
              <MaterialIcons
                name={importantMenuOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
                size={24}
                color={colors.textMuted}
              />
            </Pressable>
            {importantMenuOpen ? (
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
                    setSelectedImportantOnly(false);
                    setImportantMenuOpen(false);
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
                  accessibilityState={{ selected: !selectedImportantOnly }}
                >
                  <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>All</Text>
                  {!selectedImportantOnly ? (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
                <Pressable
                  onPress={() => {
                    setSelectedImportantOnly(true);
                    setImportantMenuOpen(false);
                  }}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      backgroundColor: pressed ? colors.bg : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedImportantOnly }}
                >
                  <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>Important only</Text>
                  {selectedImportantOnly ? (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
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
              placeholder="Contact, company, notes…"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              clearButtonMode="while-editing"
              {...keyboardDone.getTextInputProps({
                onFocus: handleSearchFocus,
              })}
            />
          </View>
        ) : null}

        {projectScopedInteractions.length === 0 ? (
          <Text style={[sharedStyles.emptyText, { marginTop: 24 }]}>No interactions yet.</Text>
        ) : filteredInteractions.length === 0 ? (
          <Text style={[sharedStyles.emptyText, { marginTop: 24 }]}>No matching interactions.</Text>
        ) : (
          <View style={{ marginTop: 12, gap: 10 }}>
            {singleVendorMode && singleVendor ? (
              <Pressable
                onPress={() => onOpenVendor(singleVendor.id)}
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
                accessibilityLabel={`Open vendor ${singleVendor.name}`}
              >
                {firstPhotoUriForVendor(state, singleVendor) ? (
                  <Image
                    source={{ uri: firstPhotoUriForVendor(state, singleVendor) }}
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
                  {singleVendor.name}
                </Text>
              </Pressable>
            ) : null}

            {filteredInteractions.map((interaction) => {
              const vendor = interaction.vendorId
                ? vendorById(state, interaction.vendorId)
                : undefined;
              const photo = photosForVendorInteraction(state, interaction.id)[0];
              const interactionProjectId = projectIdForInteraction(state, interaction);
              const vendorProject = interactionProjectId
                ? projectById(state, interactionProjectId)
                : undefined;
              const vendorProperty = vendorProject
                ? propertyById(state, vendorProject.propertyId)
                : interaction.propertyId
                  ? propertyById(state, interaction.propertyId)
                  : undefined;
              const scopeLabel = showingAcrossProperties
                ? vendorProperty &&
                  vendorProject &&
                  vendorProperty.name !== vendorProject.name
                  ? `${vendorProperty.name} · ${vendorProject.name}`
                  : (vendorProperty?.name ?? vendorProject?.name)
                : selectedPropertyId || propertyId
                  ? vendorProject?.name
                  : undefined;
              const methodLabel = vendorContactMethodLabel(interaction.contactMethod);
              const dateLabel = formatDisplayDate(interaction.occurredAtISO);
              const propertyForMatchId = propertyIdForInteraction(state, interaction);
              const propertyForMatch = propertyForMatchId
                ? propertyById(state, propertyForMatchId)
                : undefined;
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
                      propertyName: propertyForMatch?.name,
                    })
                  : undefined;
              return (
                <PropertyInteractionListRow
                  key={interaction.id}
                  projectName={scopeLabel}
                  contactName={interaction.contactName}
                  companyName={vendor?.name ?? 'No vendor'}
                  companyPhotoUri={vendor ? firstPhotoUriForVendor(state, vendor) : undefined}
                  hideCompanyPhoto={singleVendorMode || !vendor}
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
                    searchQuery.trim() || searchMatch ? searchQuery.trim() : undefined
                  }
                  matchHint={searchMatch?.matchHint}
                  photoUri={photo?.localUri}
                  important={interaction.important === true}
                  cardBackgroundColor={
                    isAfterToday(interaction.occurredAtISO)
                      ? colors.upcomingCardBg
                      : undefined
                  }
                  onPress={() =>
                    onOpenInteraction(
                      interaction.vendorId,
                      interaction.id,
                      searchMatch
                        ? {
                            searchQuery: searchQuery.trim(),
                            searchMatchField: searchMatch.field,
                          }
                        : undefined
                    )
                  }
                  onPressVendor={
                    vendor ? () => onOpenVendor(vendor.id) : undefined
                  }
                />
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
                Interactions search
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
        title="Share interactions"
        shareFormat={shareFormat}
        onChangeShareFormat={setShareFormat}
        onShare={() => void runInteractionsExport(shareFormat)}
        onClose={() => setShareOptionsOpen(false)}
      />

      <Modal visible={exportSnapshot != null} transparent animationType="none" onRequestClose={() => {}}>
        <View
          style={{ position: 'absolute', left: 0, top: 0, opacity: 0 }}
          pointerEvents="none"
        >
          <View ref={exportRef} collapsable={false}>
            {exportSnapshot ? <InteractionsExportSheet snapshot={exportSnapshot} /> : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
