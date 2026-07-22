import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, Project, ProjectVendor } from '../types';
import { VendorGalleryTile, VendorListRow } from '../components/ListRows';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { ProjectPhotosSection } from '../components/ProjectPhotosSection';
import { ProjectExportSheet } from '../components/ProjectExportSheet';
import { RoomNavigationDots } from '../components/RoomNavigationDots';
import { RenameModal } from '../components/RenameModal';
import { EditableDetailSection } from '../components/EditableDetailSection';
import { useKeyboardDoneAccessory } from '../components/KeyboardDoneAccessory';
import { sharedStyles, colors } from '../theme';
import { uid, nowISO, formatDate } from '../utils';
import {
  deleteProjectCascade,
  interactionsForVendor,
  photosForVendorInteraction,
  projectById,
  projectsForProperty,
  propertyById,
  vendorsForProject,
} from '../storage';
import { photosForProject } from '../projectPhotos';
import { firstPhotoUriForVendor } from '../vendorPhotos';
import { deletePhotoFile } from '../photoStorage';
import { vendorStatusColor, vendorStatusLabel } from '../vendorStatus';
import { vendorContactMethodLabel } from '../vendorContactMethod';
import {
  getProjectVendorViewMode,
  loadProjectVendorViewMode,
  setProjectVendorViewMode,
  type ProjectVendorViewMode,
} from '../projectVendorViewPrefs';
import { buildProjectExportSnapshot, type ProjectExportSnapshot } from '../projectExportContent';
import { shareViewAsPng } from '../shareViewImage';

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
  onOpenVendor: (vendorId: string) => void;
  onSave: (state: AppState) => void;
}) {
  const { state, projectId, onBack, onNavigateProject, onOpenVendor, onSave } = props;
  const insets = useSafeAreaInsets();
  const vendors = vendorsForProject(state, projectId);
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [vendorViewMode, setVendorViewMode] = useState<ProjectVendorViewMode>(getProjectVendorViewMode);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [introDraft, setIntroDraft] = useState('');
  const [editingSection, setEditingSection] = useState<'description' | 'intro' | null>(null);
  const [exportSnapshot, setExportSnapshot] = useState<ProjectExportSnapshot | null>(null);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<View>(null);

  const project = projectById(state, projectId);
  const propertyProjects = project ? projectsForProperty(state, project.propertyId) : [];
  const projectIndex = project ? propertyProjects.findIndex((p) => p.id === projectId) : -1;

  useEffect(() => {
    let cancelled = false;
    void loadProjectVendorViewMode().then((mode) => {
      if (!cancelled) setVendorViewMode(mode);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (project) {
      setDescriptionDraft(project.description ?? '');
      setIntroDraft(project.vendorIntroNote ?? '');
    }
  }, [project?.id, project?.description, project?.vendorIntroNote]);

  const runProjectExport = useCallback(async () => {
    const snapshot = buildProjectExportSnapshot(state, projectId);
    if (!snapshot) {
      Alert.alert('Export failed', 'Could not build project summary.');
      return;
    }
    setExportSnapshot(snapshot);
    setExporting(true);
  }, [projectId, state]);

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
    label: 'Enter',
    onDone: () => closeSectionRef.current(),
  });

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

  function saveProjectField(patch: Partial<Pick<Project, 'description' | 'vendorIntroNote'>>) {
    onSave({
      ...state,
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, ...patch } : p
      ),
    });
  }

  function saveDescription() {
    const trimmed = descriptionDraft.trim();
    saveProjectField({ description: trimmed || undefined });
  }

  function saveIntroNote() {
    const trimmed = introDraft.trim();
    saveProjectField({ vendorIntroNote: trimmed || undefined });
  }

  function openSection(section: 'description' | 'intro') {
    if (editingSection === 'description') saveDescription();
    if (editingSection === 'intro') saveIntroNote();
    setEditingSection(section);
  }

  function closeSection() {
    if (editingSection === 'description') saveDescription();
    if (editingSection === 'intro') saveIntroNote();
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
      status: 'initial_contact',
      photoIds: [],
      documentIds: [],
      createdAtISO: nowISO(),
    };
    onSave({ ...state, projectVendors: [...state.projectVendors, vendor] });
    setAddVendorOpen(false);
    setNewVendorName('');
    onOpenVendor(vendor.id);
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
  }

  function openAddVendor() {
    setNewVendorName('');
    setAddVendorOpen(true);
  }

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    // Let the menu dismiss before opening another alert/modal.
    setTimeout(action, 50);
  }

  const vendorsSection = (
    <>
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
            Vendors
          </Text>
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
        </View>
      </View>

      {vendors.length === 0 ? (
        <Text style={sharedStyles.emptyText}>
          Add a contractor or vendor you&apos;ve contacted.
        </Text>
      ) : vendorViewMode === 'gallery' ? (
        <View style={sharedStyles.galleryRow}>
          {vendors.map((vendor) => (
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
        <>
          {vendors.map((vendor) => {
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
                lastInteractionDate={
                  lastInteraction ? formatDate(lastInteraction.occurredAtISO) : undefined
                }
                lastInteractionTitle={
                  lastInteraction
                    ? vendorContactMethodLabel(lastInteraction.contactMethod)
                    : undefined
                }
                lastInteractionNotes={lastInteraction?.notes}
                lastInteractionPhotoUri={lastInteractionPhoto?.localUri}
                onPress={() => onOpenVendor(vendor.id)}
              />
            );
          })}
          <Text
            style={[
              sharedStyles.cardMeta,
              {
                color: colors.lastService,
                textAlign: 'right',
                marginTop: 4,
                marginBottom: 4,
              },
            ]}
          >
            Last interaction
          </Text>
        </>
      )}
    </>
  );

  return (
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <ScreenBackHeader onPress={onBack}>
        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => void runProjectExport()}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Share project"
            accessibilityHint="Creates an image of this project and opens the share sheet."
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
          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Project options"
            accessibilityHint="Opens actions like new vendor and delete project."
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
        style={{ flex: 1 }}
        contentContainerStyle={[sharedStyles.content, { paddingTop: 0 }]}
        keyboardShouldPersistTaps="handled"
      >
        <ProjectPhotosSection
          state={state}
          projectId={projectId}
          onSave={onSave}
          childrenGesture={projectSwipeEnabled ? projectSwipeGestureForTitle : undefined}
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

        <EditableDetailSection
          title="Description"
          isEditing={editingSection === 'description'}
          onPress={() => openSection('description')}
          onDone={keyboardDone.dismiss}
        >
          {editingSection === 'description' ? (
            <TextInput
              style={[sharedStyles.input, sharedStyles.inputMultiline]}
              value={descriptionDraft}
              onChangeText={setDescriptionDraft}
              placeholder="What this project involves"
              placeholderTextColor={colors.textMuted}
              multiline
              autoFocus
              {...keyboardDone.textInputProps}
            />
          ) : descriptionDraft.trim() ? (
            <Text style={[sharedStyles.cardMeta, { marginTop: 0, color: colors.text }]}>
              {descriptionDraft.trim()}
            </Text>
          ) : (
            <Text style={sharedStyles.cardMeta}>Not set</Text>
          )}
        </EditableDetailSection>

        <EditableDetailSection
          title="Intro to vendors"
          isEditing={editingSection === 'intro'}
          onPress={() => openSection('intro')}
          onDone={keyboardDone.dismiss}
        >
          {editingSection === 'intro' ? (
            <TextInput
              style={[sharedStyles.input, sharedStyles.inputMultiline, { minHeight: 120 }]}
              value={introDraft}
              onChangeText={setIntroDraft}
              placeholder="Who you are, project scope, timeframe, and anything vendors should know"
              placeholderTextColor={colors.textMuted}
              multiline
              autoFocus
              {...keyboardDone.textInputProps}
            />
          ) : introDraft.trim() ? (
            <Text style={[sharedStyles.cardMeta, { marginTop: 0, color: colors.text }]}>
              {introDraft.trim()}
            </Text>
          ) : (
            <Text style={sharedStyles.cardMeta}>Not set</Text>
          )}
        </EditableDetailSection>

        {projectSwipeEnabled ? (
          <GestureDetector gesture={projectSwipeGestureForVendors}>
            <View>{vendorsSection}</View>
          </GestureDetector>
        ) : (
          vendorsSection
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
                {proj.name}
              </Text>
            </View>
            <Pressable
              onPress={() => runMenuAction(openAddVendor)}
              accessibilityRole="button"
              accessibilityLabel="New vendor"
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                New vendor
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
              <Text style={sharedStyles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
    </View>
  );
}
