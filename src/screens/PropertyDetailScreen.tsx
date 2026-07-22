import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { AppState, Project, Room } from '../types';
import { ProjectGalleryTile, ProjectListRow, RoomGalleryTile, RoomListRow } from '../components/ListRows';
import { UpcomingServiceCard } from '../components/UpcomingServiceCard';
import { PropertyPhotosSection } from '../components/PropertyPhotosSection';
import { RenameModal } from '../components/RenameModal';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { sharedStyles, colors } from '../theme';
import { nowISO, uid } from '../utils';
import {
  deletePropertyCascade,
  itemById,
  nextProjectSortOrder,
  nextRoomSortOrder,
  photosForEvent,
  projectsForProperty,
  propertyById,
  roomsForProperty,
  vendorsForProject,
} from '../storage';
import { overdueCountForRoom } from '../itemMaintenance';
import { itemDisplayLabel } from '../itemCatalog';
import { firstPhotoUriForRoom } from '../roomPhotos';
import { firstPhotoUriForProject } from '../projectPhotos';
import { favoriteHeroPhotosForProperty } from '../propertyFavoritePhotos';
import { PhotoViewerModal, type ViewerPhoto } from '../components/PhotoViewerModal';
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
import { buildTransferBundle, buildPropertyUpdateBundle, sliceAppStateForProperty, summarizeChanges, transferBundleToJson } from '../transfer';
import { exportBackupToZip, exportPropertyUpdateToZip } from '../transferPackage';
import { clearPendingDeletedIds, getPendingDeletedIds } from '../syncMeta';
import {
  buildPropertyExportSnapshot,
  type PropertyExportSnapshot,
} from '../propertyExportContent';
import { PropertyExportSheet } from '../components/PropertyExportSheet';
import { shareViewAsPng } from '../shareViewImage';

export function PropertyDetailScreen(props: {
  state: AppState;
  propertyId: string;
  onBack: () => void;
  onOpenRoom: (roomId: string) => void;
  onOpenProject: (projectId: string) => void;
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
    onEditEvent,
    onLogUpcomingService,
    onSave,
  } = props;
  const insets = useSafeAreaInsets();
  const property = propertyById(state, propertyId);
  const rooms = roomsForProperty(state, propertyId);
  const projects = projectsForProperty(state, propertyId);
  const [modalOpen, setModalOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportSnapshot, setExportSnapshot] = useState<PropertyExportSnapshot | null>(null);
  const [sharingPng, setSharingPng] = useState(false);
  const exportRef = useRef<View>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState<number | null>(null);
  const [upcomingHorizon, setUpcomingHorizon] = useState<UpcomingHorizon>(
    getPropertyUpcomingHorizon
  );
  const [roomViewMode, setRoomViewMode] = useState<PropertyRoomViewMode>(getPropertyRoomViewMode);
  const [projectViewMode, setProjectViewMode] = useState<PropertyProjectViewMode>(
    getPropertyProjectViewMode
  );

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
  const favoritePhotos = favoriteHeroPhotosForProperty(state, propertyId);
  const slideshowPhotos: ViewerPhoto[] = favoritePhotos.map((photo) => ({
    id: photo.id,
    uri: photo.uri,
    label: photo.label,
    notes: photo.notes,
    onDelete: () => {},
  }));
  const upcomingEvents = filterUpcomingByHorizon(
    upcomingServiceEventsForProperty(state, propertyId),
    upcomingHorizon
  );

  function openFavoriteSlideshow() {
    if (slideshowPhotos.length === 0) {
      Alert.alert(
        'No favorite photos',
        'Mark photos as favorites with the star on property, room, or asset heroes to include them here.'
      );
      return;
    }
    setSlideshowIndex(0);
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
        { text: 'Cancel', style: 'cancel' as const },
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
      `Share a full copy of "${prop.name}" for first-time setup (Backup → Import → Merge). After that, use Share updates for ongoing changes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Data only', onPress: () => void exportProperty(false) },
        { text: 'Include photos', onPress: () => void exportProperty(true) },
      ]
    );
  }

  function promptShareUpdates() {
    const since = prop.lastSharedAtISO;
    Alert.alert(
      'Share updates',
      since
        ? `Send changes to "${prop.name}" since the last share so the other person can Import updates.`
        : `No previous share watermark yet — this will send a full update package for "${prop.name}". For a first handoff, Export property is usually clearer.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Data only', onPress: () => void sharePropertyUpdates(false) },
        { text: 'Include photos', onPress: () => void sharePropertyUpdates(true) },
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

  async function sharePropertyUpdates(includePhotos: boolean) {
    setExporting(true);
    try {
      const sinceISO = prop.lastSharedAtISO;
      const deletedIds = await getPendingDeletedIds(propertyId);
      const bundle = buildPropertyUpdateBundle({
        state,
        propertyId,
        sinceISO,
        deletedIds,
        sourceLabel: `Updates: ${prop.name}`,
      });
      if (!bundle) {
        Alert.alert('Share failed', 'Property not found.');
        return;
      }
      const changeSummary = summarizeChanges(bundle.state, bundle.deletedIds);
      if (changeSummary === 'no changes') {
        Alert.alert('Nothing to share', 'No changes since the last share.');
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
          Alert.alert('Shared', `Update package saved to ${path}`);
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
          Alert.alert('Shared', `Update package saved to ${path}`);
        }
      }
      await markPropertyShared();
    } catch (e) {
      Alert.alert('Share failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setExporting(false);
    }
  }

  function openPropertyMenu() {
    setMenuOpen(true);
  }

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    // Let the menu dismiss before opening another alert/modal.
    setTimeout(action, 50);
  }

  return (
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <ScreenBackHeader onPress={onBack}>
        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
          <Pressable
            onPress={openPropertyMenu}
            disabled={exporting || sharingPng}
            accessibilityRole="button"
            accessibilityLabel="Property options"
            accessibilityHint="Opens actions like new room, new project, slideshow, export, share updates, and delete."
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
          {prop.address ? <Text style={sharedStyles.subtitle}>{prop.address}</Text> : null}
        </PropertyPhotosSection>

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
          <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0, flex: 1 }]}>
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
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
              {upcomingHorizonLabel(upcomingHorizon)}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={22} color={colors.primary} />
          </Pressable>
        </View>
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
            <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>
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
        {rooms.length === 0 ? (
          <Text style={sharedStyles.emptyText}>Add a room like Utilities or Kitchen.</Text>
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
            <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>
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

      </ScrollView>

      {exportSnapshot ? (
        <View
          style={{ position: 'absolute', left: 0, top: 0, zIndex: 1 }}
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
                  label: 'Slideshow',
                  star: true,
                  onPress: () => runMenuAction(openFavoriteSlideshow),
                },
                {
                  key: 'export',
                  label: 'Export property',
                  onPress: () => runMenuAction(promptExportProperty),
                },
                {
                  key: 'share',
                  label: 'Share updates',
                  onPress: () => runMenuAction(promptShareUpdates),
                },
                {
                  key: 'delete',
                  label: 'Delete property',
                  danger: true,
                  onPress: () => runMenuAction(confirmDeleteProperty),
                },
              ] as const
            ).map((item) => (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => ({
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: colors.hairline,
                  opacity: pressed ? 0.7 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                })}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: 'danger' in item && item.danger ? colors.danger : colors.text,
                  }}
                >
                  {item.label}
                </Text>
                {'star' in item && item.star ? (
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

      <PhotoViewerModal
        photos={slideshowPhotos}
        index={slideshowIndex}
        onIndexChange={setSlideshowIndex}
        browseOnly
      />
    </View>
  );
}
