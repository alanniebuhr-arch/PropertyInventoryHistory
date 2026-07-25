import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { ScrollView as RNScrollView, TextInput as RNTextInput } from 'react-native';
import { Text, TextInput, useTextScaleControls } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, ProjectVendor, VendorStatus } from '../types';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { VendorPhotosSection } from '../components/VendorPhotosSection';
import { VendorExportSheet } from '../components/VendorExportSheet';
import { VendorInteractionListRow } from '../components/ListRows';
import { DetailDisplayRow } from '../components/DetailDisplayRow';
import { useKeyboardDoneAccessory } from '../components/KeyboardDoneAccessory';
import { sharedStyles, colors } from '../theme';
import {
  deleteVendorCascade,
  interactionsForProject,
  interactionsForVendor,
  photosForVendorInteraction,
  projectById,
  vendorById,
} from '../storage';
import { photosForVendor } from '../vendorPhotos';
import { deletePhotoFile } from '../photoStorage';
import { VENDOR_STATUS_OPTIONS, vendorStatusLabel } from '../vendorStatus';
import { vendorContactMethodLabel } from '../vendorContactMethod';
import { formatDate } from '../utils';
import { buildVendorExportSnapshot, type VendorExportSnapshot } from '../vendorExportContent';
import { shareViewAsPng } from '../shareViewImage';

const headerIconBtn = {
  width: 42,
  height: 36,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.border,
  borderRadius: 4,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: 'transparent' as const,
};

export function VendorDetailScreen(props: {
  state: AppState;
  vendorId: string;
  startEditing?: boolean;
  onBack: () => void;
  onGoToProperty: () => void;
  onOpenInteractions: () => void;
  onAddInteraction: () => void;
  onEditInteraction: (interactionId: string) => void;
  onSave: (state: AppState) => void;
}) {
  const {
    state,
    vendorId,
    startEditing = false,
    onBack,
    onGoToProperty,
    onOpenInteractions,
    onAddInteraction,
    onEditInteraction,
    onSave,
  } = props;
  const insets = useSafeAreaInsets();
  const vendor = vendorById(state, vendorId);
  const project = vendor ? projectById(state, vendor.projectId) : undefined;
  const interactions = interactionsForVendor(state, vendorId);
  const projectInteractionCount = vendor
    ? interactionsForProject(state, vendor.projectId).length
    : 0;

  const [nameDraft, setNameDraft] = useState('');
  const [contactDraft, setContactDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [websiteDraft, setWebsiteDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [companySummaryDraft, setCompanySummaryDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<VendorStatus>('researching');
  const [isEditing, setIsEditing] = useState(startEditing);
  const [exportSnapshot, setExportSnapshot] = useState<VendorExportSnapshot | null>(null);
  const [exporting, setExporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const exportRef = useRef<View>(null);
  const scrollRef = useRef<RNScrollView>(null);
  const scrollYRef = useRef(0);
  const pendingFocusRef = useRef<{ y: number; height: number } | null>(null);
  const notesInputRef = useRef<RNTextInput>(null);
  const summaryInputRef = useRef<RNTextInput>(null);
  const textScaleControls = useTextScaleControls();

  const keyboardDone = useKeyboardDoneAccessory({
    id: 'vendorDetailEditDone',
    label: 'Enter',
  });

  useEffect(() => {
    if (vendor) {
      setNameDraft(vendor.name);
      setContactDraft(vendor.contactName ?? '');
      setPhoneDraft(vendor.phone ?? '');
      setWebsiteDraft(vendor.website ?? '');
      setNotesDraft(vendor.notes ?? '');
      setCompanySummaryDraft(vendor.companySummary ?? '');
      setStatusDraft(vendor.status);
    }
  }, [
    vendor?.id,
    vendor?.name,
    vendor?.contactName,
    vendor?.phone,
    vendor?.website,
    vendor?.notes,
    vendor?.companySummary,
    vendor?.status,
  ]);

  const runVendorExport = useCallback(async () => {
    const snapshot = buildVendorExportSnapshot(state, vendorId);
    if (!snapshot) {
      Alert.alert('Export failed', 'Could not build vendor summary.');
      return;
    }
    setExportSnapshot(snapshot);
    setExporting(true);
  }, [state, vendorId]);

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

  if (!vendor) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>Vendor not found.</Text>
        <Pressable onPress={onBack} style={sharedStyles.secondaryBtn}>
          <Text style={sharedStyles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const vnd = vendor;

  const isDirty =
    nameDraft.trim() !== vnd.name ||
    contactDraft.trim() !== (vnd.contactName ?? '') ||
    phoneDraft.trim() !== (vnd.phone ?? '') ||
    websiteDraft.trim() !== (vnd.website ?? '') ||
    notesDraft.trim() !== (vnd.notes ?? '') ||
    companySummaryDraft.trim() !== (vnd.companySummary ?? '') ||
    statusDraft !== vnd.status;

  function updateVendor(patch: Partial<ProjectVendor>) {
    onSave({
      ...state,
      projectVendors: state.projectVendors.map((v) =>
        v.id === vendorId ? { ...v, ...patch } : v
      ),
    });
  }

  function saveAllFields(): boolean {
    const trimmedName = nameDraft.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Enter a vendor name.');
      setNameDraft(vnd.name);
      return false;
    }
    updateVendor({
      name: trimmedName,
      contactName: contactDraft.trim() || undefined,
      phone: phoneDraft.trim() || undefined,
      website: websiteDraft.trim() || undefined,
      notes: notesDraft.trim() || undefined,
      companySummary: companySummaryDraft.trim() || undefined,
      status: statusDraft,
    });
    return true;
  }

  function startEditingMode() {
    setNameDraft(vnd.name);
    setContactDraft(vnd.contactName ?? '');
    setPhoneDraft(vnd.phone ?? '');
    setWebsiteDraft(vnd.website ?? '');
    setNotesDraft(vnd.notes ?? '');
    setCompanySummaryDraft(vnd.companySummary ?? '');
    setStatusDraft(vnd.status);
    setIsEditing(true);
  }

  function finishEditing() {
    if (!saveAllFields()) return;
    keyboardDone.dismiss();
    setIsEditing(false);
  }

  function confirmLeave(leave: () => void) {
    if (!isDirty) {
      leave();
      return;
    }
    Alert.alert('Unsaved changes', 'You have entered data that will be lost if you leave.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: leave },
      {
        text: 'Save',
        onPress: () => {
          if (saveAllFields()) {
            setIsEditing(false);
            leave();
          }
        },
      },
    ]);
  }

  function openStatusPicker() {
    if (!isEditing) return;
    Alert.alert(
      'Vendor status',
      undefined,
      [
        ...VENDOR_STATUS_OPTIONS.map((opt) => ({
          text: opt.label,
          onPress: () => setStatusDraft(opt.id as VendorStatus),
        })),
        { text: 'Done', style: 'cancel' as const },
      ]
    );
  }

  function confirmDeleteVendor() {
    Alert.alert(
      'Delete vendor?',
      `Remove "${vnd.name}" and all attachments?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const p of photosForVendor(state, vendorId)) {
              await deletePhotoFile(p.localUri);
            }
            onSave(deleteVendorCascade(state, vendorId));
            onBack();
          },
        },
      ]
    );
  }

  function openVendorWebsite() {
    const raw = vnd.website?.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    void Linking.openURL(url).catch(() => {
      Alert.alert('Could not open website', 'Check that the website address is valid.');
    });
  }

  return (
    <KeyboardAvoidingView
      style={[sharedStyles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <ScreenBackHeader
        onPress={() => confirmLeave(onBack)}
        label={isDirty ? '← Cancel' : '← Back'}
      >
        <View
          style={{
            marginLeft: 'auto',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Pressable
            onPress={() => confirmLeave(onGoToProperty)}
            disabled={exporting || !project}
            accessibilityRole="button"
            accessibilityLabel="Go to property"
            accessibilityHint="Opens the property page for this vendor."
            hitSlop={8}
            style={({ pressed }) => [
              headerIconBtn,
              { opacity: exporting || !project ? 0.6 : 1 },
              pressed && !exporting && project && { opacity: 0.8 },
            ]}
          >
            <MaterialIcons name="home" size={22} color={colors.primary} />
          </Pressable>
          {projectInteractionCount > 0 ? (
            <Pressable
              onPress={() => confirmLeave(onOpenInteractions)}
              disabled={exporting}
              accessibilityRole="button"
              accessibilityLabel="Project interactions"
              accessibilityHint="Opens interactions for this project, filtered to this vendor."
              hitSlop={8}
              style={({ pressed }) => [
                headerIconBtn,
                { opacity: exporting ? 0.6 : 1 },
                pressed && !exporting && { opacity: 0.8 },
              ]}
            >
              <MaterialIcons name="forum" size={22} color={colors.primary} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => void runVendorExport()}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Share vendor"
            accessibilityHint="Creates an image of this vendor and opens the share sheet."
            hitSlop={8}
            style={({ pressed }) => [
              headerIconBtn,
              { opacity: exporting ? 0.6 : 1 },
              pressed && !exporting && { opacity: 0.8 },
            ]}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="ios-share" size={22} color={colors.primary} />
            )}
          </Pressable>
          {isEditing ? (
            <Pressable
              onPress={finishEditing}
              disabled={exporting}
              accessibilityRole="button"
              accessibilityLabel="Save vendor"
              accessibilityHint="Saves vendor details and exits edit mode."
              hitSlop={8}
              style={({ pressed }) => [
                {
                  width: 42,
                  height: 36,
                  borderRadius: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary,
                  opacity: exporting ? 0.6 : 1,
                },
                pressed && !exporting && { opacity: 0.85 },
              ]}
            >
              <MaterialIcons name="check" size={22} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              onPress={startEditingMode}
              disabled={exporting}
              accessibilityRole="button"
              accessibilityLabel="Edit vendor"
              accessibilityHint="Switches to edit mode."
              hitSlop={8}
              style={({ pressed }) => [
                headerIconBtn,
                { opacity: exporting ? 0.6 : 1 },
                pressed && !exporting && { opacity: 0.8 },
              ]}
            >
              <MaterialIcons name="edit" size={22} color={colors.primary} />
            </Pressable>
          )}
          <Pressable
            onPress={() => setMenuOpen(true)}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Vendor options"
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
        contentContainerStyle={[sharedStyles.content, { paddingTop: 0, paddingBottom: 120 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onScroll={(e) => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <VendorPhotosSection state={state} vendorId={vendorId} onSave={onSave}>
          <View style={{ marginBottom: 4 }}>
            <Text style={[sharedStyles.title, { marginBottom: 0 }]}>{vnd.name}</Text>
            {project ? (
              <Text style={[sharedStyles.subtitle, { marginBottom: 0, marginTop: 4 }]}>
                {project.name}
              </Text>
            ) : null}
          </View>
        </VendorPhotosSection>

        {isEditing ? (
          <>
            <Text style={sharedStyles.fieldLabel}>Company name</Text>
            <TextInput
              style={sharedStyles.input}
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Vendor or company name"
              placeholderTextColor={colors.textMuted}
              {...keyboardDone.textInputProps}
            />

            <Text style={sharedStyles.fieldLabel}>Contact name</Text>
            <TextInput
              style={sharedStyles.input}
              value={contactDraft}
              onChangeText={setContactDraft}
              placeholder="Person you spoke with"
              placeholderTextColor={colors.textMuted}
              {...keyboardDone.textInputProps}
            />

            <Text style={sharedStyles.fieldLabel}>Phone</Text>
            <TextInput
              style={sharedStyles.input}
              value={phoneDraft}
              onChangeText={setPhoneDraft}
              placeholder="Phone number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              {...keyboardDone.textInputProps}
            />

            <Text style={sharedStyles.fieldLabel}>Website</Text>
            <TextInput
              style={sharedStyles.input}
              value={websiteDraft}
              onChangeText={setWebsiteDraft}
              placeholder="https://"
              placeholderTextColor={colors.textMuted}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              {...keyboardDone.textInputProps}
            />

            <Text style={sharedStyles.fieldLabel}>Status</Text>
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
              accessibilityHint="Opens a list of vendor status options"
            >
              <Text style={{ fontSize: 16, color: colors.text }}>
                {vendorStatusLabel(statusDraft)}
              </Text>
              <Text style={{ fontSize: 18, color: colors.textMuted }}>›</Text>
            </Pressable>

            <Text style={sharedStyles.fieldLabel}>Notes</Text>
            <TextInput
              ref={notesInputRef}
              style={[sharedStyles.input, sharedStyles.inputMultiline, { minHeight: 96 }]}
              value={notesDraft}
              onChangeText={setNotesDraft}
              placeholder="Internal notes about this vendor"
              placeholderTextColor={colors.textMuted}
              multiline
              onFocus={() => measureAndScroll(notesInputRef.current)}
              {...keyboardDone.textInputProps}
            />

            <Text style={sharedStyles.fieldLabel}>Summary of company</Text>
            <TextInput
              ref={summaryInputRef}
              style={[sharedStyles.input, sharedStyles.inputMultiline, { minHeight: 120 }]}
              value={companySummaryDraft}
              onChangeText={setCompanySummaryDraft}
              placeholder="Quotes, strengths, or overall impression of this company"
              placeholderTextColor={colors.textMuted}
              multiline
              onFocus={() => measureAndScroll(summaryInputRef.current)}
              {...keyboardDone.textInputProps}
            />
          </>
        ) : (
          <View style={[sharedStyles.catalogSection, { marginTop: 12 }]}>
            <DetailDisplayRow label="Company name" value={vnd.name} />
            <DetailDisplayRow label="Contact name" value={vnd.contactName} />
            <DetailDisplayRow label="Phone" value={vnd.phone} />
            <DetailDisplayRow label="Website" value={vnd.website} onPress={openVendorWebsite} />
            <DetailDisplayRow label="Status" value={vendorStatusLabel(vnd.status)} />
            <DetailDisplayRow label="Notes" value={vnd.notes} stacked />
            <DetailDisplayRow label="Summary of company" value={vnd.companySummary} stacked />
          </View>
        )}

        <View style={[sharedStyles.sectionFrame, { marginTop: 16 }]}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              marginBottom: 8,
            }}
          >
            <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>
              Interaction history
            </Text>
            <Pressable
              onPress={onAddInteraction}
              accessibilityRole="button"
              accessibilityLabel="Add interaction"
              hitSlop={6}
              style={({ pressed }) => ({
                padding: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons name="add" size={24} color={colors.primary} />
            </Pressable>
          </View>
          {interactions.length === 0 ? (
            <Text style={[sharedStyles.cardMeta, { marginTop: 0 }]}>
              Log calls, emails, texts, and meetings with this vendor.
            </Text>
          ) : (
            <View>
              {interactions.map((interaction) => (
                <VendorInteractionListRow
                  key={interaction.id}
                  methodLabel={vendorContactMethodLabel(interaction.contactMethod)}
                  dateLabel={formatDate(interaction.occurredAtISO)}
                  contactName={interaction.contactName}
                  notes={interaction.notes}
                  thumbnailUri={photosForVendorInteraction(state, interaction.id)[0]?.localUri}
                  onPress={() => onEditInteraction(interaction.id)}
                />
              ))}
            </View>
          )}
        </View>

        <Pressable onPress={confirmDeleteVendor} style={sharedStyles.dangerBtn}>
          <Text style={sharedStyles.dangerBtnText}>Delete vendor</Text>
        </Pressable>
      </ScrollView>

      {isEditing ? keyboardDone.accessory : null}

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
                {vnd.name}
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
              <Text style={sharedStyles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={exportSnapshot != null} transparent animationType="none" onRequestClose={() => {}}>
        <View
          style={{ position: 'absolute', left: 0, top: 0, opacity: 0 }}
          pointerEvents="none"
        >
          <View ref={exportRef} collapsable={false}>
            {exportSnapshot ? <VendorExportSheet snapshot={exportSnapshot} /> : null}
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
    </KeyboardAvoidingView>
  );
}
