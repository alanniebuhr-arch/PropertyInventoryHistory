import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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

export function VendorDetailScreen(props: {
  state: AppState;
  vendorId: string;
  onBack: () => void;
  onAddInteraction: () => void;
  onEditInteraction: (interactionId: string) => void;
  onSave: (state: AppState) => void;
}) {
  const { state, vendorId, onBack, onAddInteraction, onEditInteraction, onSave } = props;
  const insets = useSafeAreaInsets();
  const vendor = vendorById(state, vendorId);
  const project = vendor ? projectById(state, vendor.projectId) : undefined;
  const interactions = interactionsForVendor(state, vendorId);

  const [nameDraft, setNameDraft] = useState('');
  const [contactDraft, setContactDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [websiteDraft, setWebsiteDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [companySummaryDraft, setCompanySummaryDraft] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [exportSnapshot, setExportSnapshot] = useState<VendorExportSnapshot | null>(null);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<View>(null);

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
    }
  }, [
    vendor?.id,
    vendor?.name,
    vendor?.contactName,
    vendor?.phone,
    vendor?.website,
    vendor?.notes,
    vendor?.companySummary,
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
    });
    return true;
  }

  function startEditing() {
    setNameDraft(vnd.name);
    setContactDraft(vnd.contactName ?? '');
    setPhoneDraft(vnd.phone ?? '');
    setWebsiteDraft(vnd.website ?? '');
    setNotesDraft(vnd.notes ?? '');
    setCompanySummaryDraft(vnd.companySummary ?? '');
    setIsEditing(true);
  }

  function finishEditing() {
    if (!saveAllFields()) return;
    keyboardDone.dismiss();
    setIsEditing(false);
  }

  function openStatusPicker() {
    if (!isEditing) return;
    Alert.alert(
      'Vendor status',
      undefined,
      [
        ...VENDOR_STATUS_OPTIONS.map((opt) => ({
          text: opt.label,
          onPress: () => updateVendor({ status: opt.id as VendorStatus }),
        })),
        { text: 'Cancel', style: 'cancel' as const },
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
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <ScreenBackHeader onPress={onBack}>
        <Pressable
          onPress={() => void runVendorExport()}
          disabled={exporting}
          accessibilityRole="button"
          accessibilityLabel="Share vendor"
          accessibilityHint="Creates an image of this vendor and opens the share sheet."
          hitSlop={8}
          style={({ pressed }) => [
            {
              marginLeft: 'auto',
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
      </ScreenBackHeader>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[sharedStyles.content, { paddingTop: 0, paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 4,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[sharedStyles.title, { marginBottom: 0 }]}>{vnd.name}</Text>
            {project ? (
              <Text style={[sharedStyles.subtitle, { marginBottom: 0, marginTop: 4 }]}>
                {project.name}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => (isEditing ? finishEditing() : startEditing())}
            accessibilityRole="button"
            accessibilityLabel={isEditing ? 'Done editing vendor' : 'Edit vendor'}
            hitSlop={8}
            style={({ pressed }) => ({
              paddingVertical: 8,
              paddingHorizontal: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={sharedStyles.textLink}>{isEditing ? 'Done' : 'Edit'}</Text>
          </Pressable>
        </View>

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
                {vendorStatusLabel(vnd.status)}
              </Text>
              <Text style={{ fontSize: 18, color: colors.textMuted }}>›</Text>
            </Pressable>

            <Text style={sharedStyles.fieldLabel}>Notes</Text>
            <TextInput
              style={[sharedStyles.input, sharedStyles.inputMultiline, { minHeight: 96 }]}
              value={notesDraft}
              onChangeText={setNotesDraft}
              placeholder="Internal notes about this vendor"
              placeholderTextColor={colors.textMuted}
              multiline
              {...keyboardDone.textInputProps}
            />

            <Text style={sharedStyles.fieldLabel}>Summary of company</Text>
            <TextInput
              style={[sharedStyles.input, sharedStyles.inputMultiline, { minHeight: 120 }]}
              value={companySummaryDraft}
              onChangeText={setCompanySummaryDraft}
              placeholder="Quotes, strengths, or overall impression of this company"
              placeholderTextColor={colors.textMuted}
              multiline
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
          <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>Interaction history</Text>
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
          <Pressable
            onPress={onAddInteraction}
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              paddingVertical: 10,
              opacity: pressed ? 0.7 : 1,
              marginTop: 4,
            })}
          >
            <Text style={sharedStyles.textLink}>Add interaction</Text>
          </Pressable>
        </View>

        <VendorPhotosSection state={state} vendorId={vendorId} onSave={onSave} />

        <Pressable onPress={confirmDeleteVendor} style={sharedStyles.dangerBtn}>
          <Text style={sharedStyles.dangerBtnText}>Delete vendor</Text>
        </Pressable>
      </ScrollView>

      {isEditing ? keyboardDone.accessory : null}

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
    </View>
  );
}
