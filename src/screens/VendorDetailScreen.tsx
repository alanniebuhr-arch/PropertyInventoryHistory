import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppState, ProjectVendor, VendorStatus } from '../types';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { VendorPhotosSection } from '../components/VendorPhotosSection';
import { MultilineEditModal } from '../components/MultilineEditModal';
import { VendorInteractionListRow } from '../components/ListRows';
import { DetailDisplayRow } from '../components/DetailDisplayRow';
import { useKeyboardDoneAccessory } from '../components/KeyboardDoneAccessory';
import { sharedStyles, colors } from '../theme';
import {
  deleteVendorCascade,
  interactionsForVendor,
  projectById,
  vendorById,
} from '../storage';
import { photosForVendor } from '../vendorPhotos';
import { deletePhotoFile } from '../photoStorage';
import { VENDOR_STATUS_OPTIONS, vendorStatusLabel } from '../vendorStatus';
import { vendorContactMethodLabel } from '../vendorContactMethod';
import { formatDate } from '../utils';

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
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

  function saveNotes(nextNotes: string) {
    const trimmed = nextNotes.trim();
    setNotesDraft(trimmed);
    if (!isEditing) {
      updateVendor({ notes: trimmed || undefined });
    }
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

  const notesPreview = notesDraft.trim();
  const summaryPreview = companySummaryDraft.trim();

  return (
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <ScreenBackHeader onPress={onBack} />
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
            <Pressable
              onPress={() => setNotesModalOpen(true)}
              accessibilityRole="button"
              accessibilityHint="Opens a larger editor for vendor notes"
              style={({ pressed }) => [
                sharedStyles.input,
                sharedStyles.inputMultiline,
                {
                  minHeight: 96,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 16,
                  lineHeight: 22,
                  color: notesPreview ? colors.text : colors.textMuted,
                }}
              >
                {notesPreview || 'Internal notes about this vendor'}
              </Text>
            </Pressable>

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
            <DetailDisplayRow label="Website" value={vnd.website} />
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

      <MultilineEditModal
        visible={notesModalOpen}
        title="Vendor notes"
        value={notesDraft}
        placeholder="Internal notes about this vendor"
        onSave={saveNotes}
        onClose={() => setNotesModalOpen(false)}
      />
    </View>
  );
}
