import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
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
import { buildTransferBundle, sliceAppStateForProperty, transferBundleToJson } from '../transfer';
import { exportBackupToZip } from '../transferPackage';

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
      `Share "${prop.name}" so another user can import it (Export / import backup → Merge).`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Data only', onPress: () => void exportProperty(false) },
        { text: 'Include photos', onPress: () => void exportProperty(true) },
      ]
    );
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
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <ScreenBackHeader onPress={onBack} />
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
          <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0, flex: 1 }]}>
            Rooms
          </Text>
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

        <Pressable
          onPress={() => {
            setRoomName('');
            setModalOpen(true);
          }}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            paddingVertical: 12,
            opacity: pressed ? 0.7 : 1,
            marginTop: 8,
          })}
        >
          <Text style={sharedStyles.textLink}>Add room</Text>
        </Pressable>

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
            Projects
          </Text>
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

        <Pressable
          onPress={() => {
            setProjectName('');
            setProjectDescription('');
            setProjectModalOpen(true);
          }}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            paddingVertical: 12,
            opacity: pressed ? 0.7 : 1,
            marginTop: 8,
          })}
        >
          <Text style={sharedStyles.textLink}>Add project</Text>
        </Pressable>

        <Pressable
          onPress={openFavoriteSlideshow}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            paddingVertical: 8,
            opacity: pressed ? 0.7 : 1,
            marginTop: 0,
          })}
          accessibilityRole="button"
          accessibilityLabel="Slideshow"
          accessibilityHint="Shows favorite photos from this property in full screen."
        >
          <Text style={sharedStyles.textLink}>Slideshow</Text>
        </Pressable>

        <Pressable
          onPress={promptExportProperty}
          disabled={exporting}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            paddingVertical: 8,
            opacity: exporting ? 0.5 : pressed ? 0.7 : 1,
            marginTop: 4,
          })}
          accessibilityRole="button"
          accessibilityLabel="Export property"
          accessibilityHint="Shares this property so another user can import it."
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[sharedStyles.textLink, { color: colors.textMuted }]}>Export property</Text>
          )}
        </Pressable>

        <Pressable onPress={confirmDeleteProperty} style={sharedStyles.dangerBtn}>
          <Text style={sharedStyles.dangerBtnText}>Delete property</Text>
        </Pressable>
      </ScrollView>

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
