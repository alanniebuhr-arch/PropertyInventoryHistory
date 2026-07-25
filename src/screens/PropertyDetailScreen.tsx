import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { AppState, Project, PropertyTodo, Room, SyncDeletedIds } from '../types';
import {
  ProjectGalleryTile,
  ProjectListRow,
  PropertyTodoListRow,
  RoomGalleryTile,
  RoomListRow,
} from '../components/ListRows';
import { UpcomingServiceCard } from '../components/UpcomingServiceCard';
import { PropertyPhotosSection } from '../components/PropertyPhotosSection';
import { RenameModal } from '../components/RenameModal';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { sharedStyles, colors } from '../theme';
import { formatDate, nowISO, uid } from '../utils';
import {
  deletePropertyCascade,
  itemById,
  nextProjectSortOrder,
  nextRoomSortOrder,
  photosForEvent,
  ideasForProperty,
  photosForPropertyTodo,
  projectsForProperty,
  propertyById,
  roomsForProperty,
  todosForProperty,
  vendorsForProject,
  interactionsForProperty,
} from '../storage';
import { overdueCountForRoom } from '../itemMaintenance';
import { itemDisplayLabel } from '../itemCatalog';
import { firstPhotoUriForRoom } from '../roomPhotos';
import { firstPhotoUriForProject } from '../projectPhotos';
import { slideshowPhotosForProperty } from '../propertyFavoritePhotos';
import { PhotoViewerModal, type ViewerPhoto } from '../components/PhotoViewerModal';
import { SlideshowEditorModal } from '../components/SlideshowEditorModal';
import {
  filterUpcomingByHorizon,
  upcomingHorizonLabel,
  upcomingNotOverdueCountForRoom,
  upcomingServiceEventsForProperty,
  UPCOMING_HORIZON_OPTIONS,
  type UpcomingHorizon,
} from '../eventRecurrence';
import {
  getPropertyUpcomingHorizon,
  loadPropertyUpcomingHorizon,
  setPropertyUpcomingHorizon,
} from '../upcomingHorizonPrefs';
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
import { Text, useTextScaleControls, TextInput } from '../textScale';
import {
  buildTransferBundle,
  buildPropertyUpdateBundle,
  mergeCollaborativeState,
  sliceAppStateForProperty,
  summarizeChanges,
  transferBundleToJson,
} from '../transfer';
import {
  cleanupExtractRoot,
  exportBackupToZip,
  exportPropertyUpdateToZip,
  importBackupFromUri,
  materializeZipMedia,
} from '../transferPackage';
import { clearPendingDeletedIds, getPendingDeletedIds } from '../syncMeta';
import { writePhotoFromBase64 } from '../photoStorage';
import { writeDocumentFromBase64 } from '../documentStorage';
import {
  buildPropertyExportSnapshot,
  type PropertyExportSnapshot,
} from '../propertyExportContent';
import { PropertyExportSheet } from '../components/PropertyExportSheet';
import { SectionHelpTip } from '../components/SectionHelpTip';
import { shareViewAsPng } from '../shareViewImage';
import {
  getSectionHelpVisible,
  loadSectionHelpVisible,
  setSectionHelpVisible,
} from '../sectionHelpPrefs';

export function PropertyDetailScreen(props: {
  state: AppState;
  propertyId: string;
  onBack: () => void;
  onOpenRoom: (roomId: string) => void;
  onOpenProject: (projectId: string) => void;
  onOpenInteractions: () => void;
  onOpenTodo: (
    todoId: string,
    options?: { startEditing?: boolean; kind?: 'todo' | 'idea' }
  ) => void;
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
    onOpenTodo,
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
  const hasInteractions = interactionsForProperty(state, propertyId).length > 0;
  const [modalOpen, setModalOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [addTodoOpen, setAddTodoOpen] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [addIdeaOpen, setAddIdeaOpen] = useState(false);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportSnapshot, setExportSnapshot] = useState<PropertyExportSnapshot | null>(null);
  const [sharingPng, setSharingPng] = useState(false);
  const exportRef = useRef<View>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState<number | null>(null);
  const [slideshowEditorOpen, setSlideshowEditorOpen] = useState(false);
  /** Snapshot used while the viewer is open so Play uses the order just committed. */
  const [slideshowPlayPhotos, setSlideshowPlayPhotos] = useState<ViewerPhoto[] | null>(null);
  const [upcomingHorizon, setUpcomingHorizon] = useState<UpcomingHorizon>(
    getPropertyUpcomingHorizon
  );
  const [roomViewMode, setRoomViewMode] = useState<PropertyRoomViewMode>(getPropertyRoomViewMode);
  const [projectViewMode, setProjectViewMode] = useState<PropertyProjectViewMode>(
    getPropertyProjectViewMode
  );
  const [helpVisible, setHelpVisible] = useState(getSectionHelpVisible);
  const textScaleControls = useTextScaleControls();

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

  const runPropertyImageExport = useCallback(async () => {
    const snapshot = buildPropertyExportSnapshot(state, propertyId);
    if (!snapshot) {
      Alert.alert('Export failed', 'Could not build property summary.');
      return;
    }
    setExportSnapshot(snapshot);
    setSharingPng(true);
  }, [propertyId, state]);

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
    setSlideshowIndex(0);
  }

  const upcomingEvents = filterUpcomingByHorizon(
    upcomingServiceEventsForProperty(state, propertyId),
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
    onSave({ ...state, rooms: [...state.rooms, room] });
    setModalOpen(false);
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
      photoIds: [],
      sortOrder: nextProjectSortOrder(state, propertyId),
      createdAtISO: nowISO(),
    };
    onSave({ ...state, projects: [...state.projects, project] });
    setProjectModalOpen(false);
    setProjectName('');
    setProjectDescription('');
    onOpenProject(project.id);
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
            onSave(deletePropertyCascade(state, propertyId));
            onBack();
          },
        },
      ]
    );
  }

  function promptExportProperty() {
    Alert.alert(
      'Export property',
      `Share a full copy of "${prop.name}" for first-time setup on another device (Backup → Import → Merge). For ongoing collaboration on this property, use Save updates / Load updates.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Data only', onPress: () => void exportProperty(false) },
        { text: 'Include photos', onPress: () => void exportProperty(true) },
      ]
    );
  }

  function promptSaveUpdates() {
    Alert.alert(
      'Save updates',
      `Save a complete update package for "${prop.name}" (including vendors and interactions) to send to a collaborator. They use Load updates on the same property.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Data only', onPress: () => void savePropertyUpdates(false) },
        { text: 'Include photos', onPress: () => void savePropertyUpdates(true) },
      ]
    );
  }

  async function markPropertyShared() {
    const sharedAt = nowISO();
    await clearPendingDeletedIds(propertyId);
    onSave({
      ...state,
      properties: state.properties.map((p) =>
        p.id === propertyId ? { ...p, lastSharedAtISO: sharedAt, updatedAtISO: sharedAt } : p
      ),
    });
  }

  async function exportProperty(includePhotos: boolean) {
    const sliced = sliceAppStateForProperty(state, propertyId);
    if (!sliced) {
      Alert.alert('Export failed', 'Property not found.');
      return;
    }
    setExporting(true);
    try {
      const safeName = prop.name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'property';
      const sourceLabel = `Property: ${prop.name}`;
      if (includePhotos) {
        const path = await exportBackupToZip(sliced, {
          fileNamePrefix: safeName,
          sourceLabel,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(path, {
            mimeType: 'application/zip',
            UTI: 'public.zip-archive',
            dialogTitle: `Export ${prop.name}`,
          });
        } else {
          Alert.alert('Exported', `Backup saved to ${path}`);
        }
        await markPropertyShared();
        return;
      }

      const bundle = buildTransferBundle({ state: sliced, sourceLabel });
      const json = transferBundleToJson(bundle);
      const fileName = `${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
      const path = `${FileSystem.cacheDirectory ?? ''}${fileName}`;
      await FileSystem.writeAsStringAsync(path, json);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/json',
          dialogTitle: `Export ${prop.name}`,
        });
      } else {
        Alert.alert('Exported', `Backup saved to ${path}`);
      }
      await markPropertyShared();
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setExporting(false);
    }
  }

  async function savePropertyUpdates(includePhotos: boolean) {
    setExporting(true);
    try {
      // Always package the full property slice so vendors/interactions are never dropped
      // by a stale lastSharedAtISO watermark.
      const deletedIds = await getPendingDeletedIds(propertyId);
      const bundle = buildPropertyUpdateBundle({
        state,
        propertyId,
        deletedIds,
        sourceLabel: `Updates: ${prop.name}`,
      });
      if (!bundle) {
        Alert.alert('Save failed', 'Property not found.');
        return;
      }

      const safeName = prop.name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'property';
      if (includePhotos) {
        const path = await exportPropertyUpdateToZip(bundle, { fileNamePrefix: safeName });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(path, {
            mimeType: 'application/zip',
            UTI: 'public.zip-archive',
            dialogTitle: `Updates for ${prop.name}`,
          });
        } else {
          Alert.alert('Saved', `Update package saved to ${path}`);
        }
      } else {
        const json = transferBundleToJson(bundle);
        const fileName = `${safeName}-updates-${new Date().toISOString().slice(0, 10)}.json`;
        const path = `${FileSystem.cacheDirectory ?? ''}${fileName}`;
        await FileSystem.writeAsStringAsync(path, json);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(path, {
            mimeType: 'application/json',
            dialogTitle: `Updates for ${prop.name}`,
          });
        } else {
          Alert.alert('Saved', `Update package saved to ${path}`);
        }
      }
      await markPropertyShared();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setExporting(false);
    }
  }

  async function materializeEmbeddedPhotoData(
    merged: AppState,
    photoData: Record<string, string> | undefined
  ): Promise<AppState> {
    if (!photoData) return merged;
    let next = merged;
    const collections = [
      'photos',
      'propertyPhotos',
      'roomPhotos',
      'projectPhotos',
      'vendorPhotos',
    ] as const;
    for (const key of collections) {
      const updated: AppState[typeof key] = [];
      for (const photo of next[key]) {
        const b64 = photoData[photo.id];
        if (!b64) {
          updated.push(photo as never);
          continue;
        }
        const localUri = await writePhotoFromBase64(photo.id, b64);
        updated.push({ ...photo, localUri } as never);
      }
      next = { ...next, [key]: updated };
    }
    const docs: AppState['documents'] = [];
    for (const doc of next.documents) {
      const b64 = photoData[doc.id];
      if (!b64) {
        docs.push(doc);
        continue;
      }
      const localUri = await writeDocumentFromBase64(doc.id, b64, doc.fileName);
      docs.push({ ...doc, localUri });
    }
    return { ...next, documents: docs };
  }

  async function applyPropertyUpdateLoad(
    incoming: AppState,
    packagePropertyId: string,
    deletedIds: SyncDeletedIds,
    mediaFiles?: Record<string, string>,
    extractRoot?: string,
    photoData?: Record<string, string>
  ) {
    if (packagePropertyId !== propertyId) {
      Alert.alert(
        'Wrong property',
        'This update package belongs to a different property. Open that property and use Load updates there.'
      );
      await cleanupExtractRoot(extractRoot);
      return;
    }

    setExporting(true);
    try {
      let payload = incoming;
      if (mediaFiles) {
        payload = await materializeZipMedia(incoming, mediaFiles);
      }
      payload = await materializeEmbeddedPhotoData(payload, photoData);
      const { state: merged, summary } = mergeCollaborativeState(state, payload, deletedIds);
      onSave(merged);
      // Let the spinner clear before the success alert (iOS often drops alerts during modal transitions).
      setExporting(false);
      await new Promise((r) => setTimeout(r, 250));
      Alert.alert(
        'Updates loaded',
        `Added ${summary.added}, updated ${summary.updated}, deleted ${summary.deleted}.`
      );
    } catch (e) {
      Alert.alert('Load failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      await cleanupExtractRoot(extractRoot);
      setExporting(false);
    }
  }

  async function loadPropertyUpdates() {
    let extractRoot: string | undefined;
    try {
      // Do not set exporting yet — a spinner during DocumentPicker (especially right after the
      // gear modal closes) often prevents the picker from appearing on iOS.
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }

      setExporting(true);
      const asset = result.assets[0];
      const imported = await importBackupFromUri(asset.uri, {
        fileName: asset.name,
        mimeType: asset.mimeType,
      });
      setExporting(false);
      // Document picker dismissal can swallow the next Alert if shown immediately.
      await new Promise((r) => setTimeout(r, 300));

      if (!imported.ok) {
        Alert.alert('Invalid file', imported.error);
        return;
      }

      const confirmLoad = (
        message: string,
        onConfirm: () => void,
        onCancel?: () => void
      ) => {
        Alert.alert('Load updates', message, [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => onCancel?.(),
          },
          { text: 'Load', onPress: onConfirm },
        ]);
      };

      if (imported.kind === 'zip') {
        extractRoot = imported.extractRoot;
        if (imported.result.packageKind === 'property-update') {
          const pkgPropertyId = imported.result.propertyId;
          if (!pkgPropertyId) {
            Alert.alert('Invalid file', 'Update package is missing property id.');
            await cleanupExtractRoot(extractRoot);
            return;
          }
          const summary = summarizeChanges(
            imported.result.state,
            imported.result.deletedIds ?? {}
          );
          const zipState = imported.result.state;
          const zipDeleted = imported.result.deletedIds ?? {};
          const zipMedia = imported.result.mediaFiles;
          const zipRoot = imported.extractRoot;
          confirmLoad(
            `Apply updates to "${prop.name}"?\n\nIncludes: ${summary}. Newer edits win when both sides changed the same record.`,
            () =>
              void applyPropertyUpdateLoad(
                zipState,
                pkgPropertyId,
                zipDeleted,
                zipMedia,
                zipRoot
              ),
            () => void cleanupExtractRoot(zipRoot)
          );
          return;
        }

        const sliced = sliceAppStateForProperty(imported.result.state, propertyId);
        if (!sliced || sliced.properties.length === 0) {
          Alert.alert(
            'Wrong property',
            'This file does not contain the current property. Use Export property / Save updates for this property.'
          );
          await cleanupExtractRoot(extractRoot);
          return;
        }
        const summary = summarizeChanges(sliced);
        const zipMedia = imported.result.mediaFiles;
        const zipRoot = imported.extractRoot;
        confirmLoad(
          `Merge exported data into "${prop.name}"?\n\nIncludes: ${summary}. Newer edits win when both sides changed the same record.`,
          () => void applyPropertyUpdateLoad(sliced, propertyId, {}, zipMedia, zipRoot),
          () => void cleanupExtractRoot(zipRoot)
        );
        return;
      }

      if (imported.packageKind === 'property-update') {
        const summary = summarizeChanges(imported.state, imported.deletedIds);
        confirmLoad(
          `Apply updates to "${prop.name}"?\n\nIncludes: ${summary}. Newer edits win when both sides changed the same record.`,
          () =>
            void applyPropertyUpdateLoad(
              imported.state,
              imported.propertyId,
              imported.deletedIds
            )
        );
        return;
      }

      const sliced = sliceAppStateForProperty(imported.state, propertyId);
      if (!sliced || sliced.properties.length === 0) {
        Alert.alert(
          'Wrong property',
          'This file does not contain the current property. Use Export property / Save updates for this property.'
        );
        return;
      }
      const summary = summarizeChanges(sliced);
      const photoData = imported.photoData;
      confirmLoad(
        `Merge exported data into "${prop.name}"?\n\nIncludes: ${summary}. Newer edits win when both sides changed the same record.`,
        () =>
          void applyPropertyUpdateLoad(
            sliced,
            propertyId,
            {},
            undefined,
            undefined,
            photoData
          )
      );
    } catch (e) {
      Alert.alert('Load failed', e instanceof Error ? e.message : 'Unknown error');
      await cleanupExtractRoot(extractRoot);
    } finally {
      setExporting(false);
    }
  }

  function openPropertyMenu() {
    setMenuOpen(true);
  }

  function toggleHelp() {
    const next = !helpVisible;
    setHelpVisible(next);
    void setSectionHelpVisible(next);
  }

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    // Let the menu dismiss before opening another alert/modal.
    setTimeout(action, 50);
  }

  /** Extra delay so DocumentPicker can present after the gear modal finishes closing. */
  function runMenuActionAfterModal(action: () => void) {
    setMenuOpen(false);
    setTimeout(action, 400);
  }

  return (
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <ScreenBackHeader onPress={onBack}>
        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={toggleHelp}
            disabled={exporting || sharingPng}
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
                opacity: exporting || sharingPng ? 0.6 : 1,
              },
              pressed && !exporting && !sharingPng && { opacity: 0.8 },
            ]}
          >
            <MaterialIcons
              name={helpVisible ? 'help' : 'help-outline'}
              size={22}
              color={helpVisible ? colors.helpText : colors.primary}
            />
          </Pressable>
          <Pressable
            onPress={() => playFavoriteSlideshow()}
            disabled={exporting || sharingPng}
            accessibilityRole="button"
            accessibilityLabel="Play slideshow"
            accessibilityHint="Opens the favorite photo slideshow."
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
                opacity: exporting || sharingPng ? 0.6 : 1,
              },
              pressed && !exporting && !sharingPng && { opacity: 0.8 },
            ]}
          >
            <MaterialIcons name="slideshow" size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => void runPropertyImageExport()}
            disabled={exporting || sharingPng}
            accessibilityRole="button"
            accessibilityLabel="Share property"
            accessibilityHint="Creates an image of this property and opens the share sheet."
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
                opacity: exporting || sharingPng ? 0.6 : 1,
              },
              pressed && !exporting && !sharingPng && { opacity: 0.8 },
            ]}
          >
            {sharingPng ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="ios-share" size={22} color={colors.primary} />
            )}
          </Pressable>
          {hasInteractions ? (
            <Pressable
              onPress={onOpenInteractions}
              disabled={exporting || sharingPng}
              accessibilityRole="button"
              accessibilityLabel="Property interactions"
              accessibilityHint="Opens recent vendor interactions for this property."
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
                  opacity: exporting || sharingPng ? 0.6 : 1,
                },
                pressed && !exporting && !sharingPng && { opacity: 0.8 },
              ]}
            >
              <MaterialIcons name="forum" size={22} color={colors.primary} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={openPropertyMenu}
            disabled={exporting || sharingPng}
            accessibilityRole="button"
            accessibilityLabel="Property options"
            accessibilityHint="Opens actions like new room, new project, edit slideshow, export, save or load updates, and delete."
            hitSlop={6}
            style={({ pressed }) => ({
              padding: 4,
              opacity: exporting || sharingPng ? 0.5 : pressed ? 0.7 : 1,
            })}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="settings" size={24} color={colors.primary} />
            )}
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
          Help | Slideshow | Share
          {hasInteractions ? ' | Interactions' : ''} | Utilities
        </Text>
      ) : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[sharedStyles.content, { paddingTop: 0 }]}
      >
        <PropertyPhotosSection state={state} property={prop} onSave={onSave}>
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
              your property is very useful. Use the star symbol under the large picture to add it to
              your slideshow. Add any additional pictures. Long press on small photos to change
              label, notes and delete.
            </SectionHelpTip>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 8,
            marginBottom: 8,
          }}
        >
          <Text
            style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0, flex: 1 }]}
          >
            Service schedule
          </Text>
          <Pressable
            onPress={openUpcomingHorizonPicker}
            accessibilityRole="button"
            accessibilityLabel={`Upcoming range: ${upcomingHorizonLabel(upcomingHorizon)}`}
            accessibilityHint="Opens a list of time ranges for upcoming service."
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
        </View>
        {helpVisible ? (
          <SectionHelpTip>
            Use the months selector above right to control how far into the future of this Property
            schedule should be shown.
          </SectionHelpTip>
        ) : null}
        {upcomingEvents.length === 0 ? (
          <Text style={[sharedStyles.cardMeta, { marginBottom: 16 }]}>
            No upcoming service scheduled.
          </Text>
        ) : (
          <View style={{ marginBottom: 16 }}>
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
                />
              );
            })}
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 8,
            marginBottom: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 4 }}>
            <Text
              style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}
            >
              Rooms
            </Text>
            <Pressable
              onPress={() => {
                setRoomName('');
                setModalOpen(true);
              }}
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
        ) : roomViewMode === 'gallery' ? (
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
          rooms.map((r) => (
            <RoomListRow
              key={r.id}
              name={r.name}
              thumbnailUri={firstPhotoUriForRoom(state, r)}
              itemCount={state.items.filter((i) => i.roomId === r.id).length}
              overdueCount={overdueCountForRoom(state, r.id)}
              upcomingCount={upcomingNotOverdueCountForRoom(state, r.id, upcomingHorizon)}
              requiresAuth={r.requiresAuth}
              onPress={() => onOpenRoom(r.id)}
            />
          ))
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 8,
            marginBottom: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 4 }}>
            <Text
              style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}
            >
              Projects
            </Text>
            <Pressable
              onPress={() => {
                setProjectName('');
                setProjectDescription('');
                setProjectModalOpen(true);
              }}
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
        ) : projectViewMode === 'gallery' ? (
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
                  onPress={() => onOpenProject(p.id)}
                />
              );
            })}
          </View>
        ) : (
          projects.map((p) => {
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
                onPress={() => onOpenProject(p.id)}
              />
            );
          })
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginTop: 8,
            marginBottom: 8,
          }}
        >
          <Text
            style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}
          >
            To do
          </Text>
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
        ) : (
          todos.map((todo) => (
            <PropertyTodoListRow
              key={todo.id}
              title={todo.title}
              dueLabel={todo.dueAtISO ? formatDate(todo.dueAtISO) : undefined}
              notes={todo.notes}
              done={todo.done}
              thumbnailUri={photosForPropertyTodo(state, todo.id)[0]?.localUri}
              onPress={() => onOpenTodo(todo.id, { kind: 'todo' })}
            />
          ))
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginTop: 8,
            marginBottom: 8,
          }}
        >
          <Text
            style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}
          >
            Ideas
          </Text>
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
        </View>
        {helpVisible ? (
          <SectionHelpTip>
            Loosely thought out topics for this property. Ideas still need details added and may
            someday move to a Project or To Do depending on complexity. Similar to TO DO but may
            never be done.
          </SectionHelpTip>
        ) : null}
        {ideas.length === 0 ? (
          <Text style={sharedStyles.emptyText}>
            Capture rough ideas for this property before they become to-dos or projects.
          </Text>
        ) : (
          ideas.map((idea) => (
            <PropertyTodoListRow
              key={idea.id}
              title={idea.title}
              dueLabel={idea.dueAtISO ? formatDate(idea.dueAtISO) : undefined}
              notes={idea.notes}
              done={idea.done}
              thumbnailUri={photosForPropertyTodo(state, idea.id)[0]?.localUri}
              onPress={() => onOpenTodo(idea.id, { kind: 'idea' })}
              variant="idea"
            />
          ))
        )}

      </ScrollView>

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
                  key: 'room',
                  label: 'New room',
                  onPress: () =>
                    runMenuAction(() => {
                      setRoomName('');
                      setModalOpen(true);
                    }),
                },
                {
                  key: 'project',
                  label: 'New project',
                  onPress: () =>
                    runMenuAction(() => {
                      setProjectName('');
                      setProjectDescription('');
                      setProjectModalOpen(true);
                    }),
                },
                {
                  key: 'slideshow',
                  label: 'Edit slideshow',
                  star: true,
                  onPress: () => runMenuAction(openSlideshowEditor),
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
                  key: 'export',
                  label: 'Export property',
                  onPress: () => runMenuAction(promptExportProperty),
                },
                {
                  key: 'saveUpdates',
                  label: 'Save updates',
                  onPress: () => runMenuAction(promptSaveUpdates),
                },
                {
                  key: 'loadUpdates',
                  label: 'Load updates',
                  onPress: () => runMenuActionAfterModal(() => void loadPropertyUpdates()),
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
              <Text style={sharedStyles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }} onPress={() => setModalOpen(false)}>
          <Pressable style={[sharedStyles.card, { marginBottom: 0 }]} onPress={() => {}}>
            <Text style={sharedStyles.sectionTitle}>New room</Text>
            <TextInput
              value={roomName}
              onChangeText={setRoomName}
              placeholder="Utilities, Garage, Kitchen…"
              style={sharedStyles.input}
              autoFocus
            />
            <Pressable
              onPress={addRoom}
              style={({ pressed }) => [sharedStyles.primaryBtn, pressed && sharedStyles.primaryBtnPressed]}
            >
              <Text style={sharedStyles.primaryBtnText}>Save</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={projectModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProjectModalOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}
          onPress={() => setProjectModalOpen(false)}
        >
          <Pressable style={[sharedStyles.card, { marginBottom: 0 }]} onPress={() => {}}>
            <Text style={sharedStyles.sectionTitle}>New project</Text>
            <TextInput
              value={projectName}
              onChangeText={setProjectName}
              placeholder="Pool renovation, kitchen remodel…"
              style={sharedStyles.input}
              autoFocus
            />
            <TextInput
              value={projectDescription}
              onChangeText={setProjectDescription}
              placeholder="Optional description"
              style={[sharedStyles.input, sharedStyles.inputMultiline, { marginTop: 8 }]}
              multiline
            />
            <Pressable
              onPress={addProject}
              style={({ pressed }) => [sharedStyles.primaryBtn, pressed && sharedStyles.primaryBtnPressed]}
            >
              <Text style={sharedStyles.primaryBtnText}>Save</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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

      <PhotoViewerModal
        photos={slideshowPhotos}
        index={slideshowIndex}
        onIndexChange={(index) => {
          setSlideshowIndex(index);
          if (index == null) setSlideshowPlayPhotos(null);
        }}
        browseOnly
      />
    </View>
  );
}
