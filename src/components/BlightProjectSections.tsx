import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type TextInput as RNTextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../textScale';
import type { AppState, Project } from '../types';
import { CollapsibleSectionTitle } from './CollapsibleSectionTitle';
import { DateInputField } from './DateInputField';
import { PdfViewerModal, type ViewerPdf } from './PdfViewerModal';
import { SectionHelpTip } from './SectionHelpTip';
import { sharedStyles, colors } from '../theme';
import {
  dateInputValue,
  formatDisplayDate,
  nowISO,
  parseDateInputToISO,
} from '../utils';
import { documentById } from '../documents';
import { resolveAppFileUri } from '../appFileUri';
import { pickFileAttachment } from '../fileAttachment';
import {
  BLIGHT_BOARD_DOC_LABELS,
  clearBlightBoardDocument,
  setBlightBoardDocument,
  type BlightBoardDocSlot,
} from '../blightProjectDocs';
import {
  addComplainant,
  clearComplainantFormAttachment,
  complainantsForProject,
  removeComplainantCascade,
  setComplainantFormAttachment,
  updateComplainant,
} from '../projectComplainants';
import {
  getProjectSectionExpand,
  setProjectSectionExpand,
} from '../projectSectionExpandPrefs';

function documentAsPicked(uri: string, fileName: string, mimeType?: string) {
  return { uri, fileName, mimeType: mimeType ?? 'application/octet-stream' };
}

async function shareFile(localUri: string, fileName: string, mimeType: string) {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    Alert.alert('Unavailable', 'Sharing is not available on this device.');
    return;
  }
  await Sharing.shareAsync(resolveAppFileUri(localUri), {
    mimeType,
    dialogTitle: fileName,
  });
}

function isPdf(fileName: string, mimeType: string): boolean {
  return (
    mimeType === 'application/pdf' ||
    mimeType === 'application/x-pdf' ||
    /\.pdf$/i.test(fileName)
  );
}

export function BlightProjectSections(props: {
  state: AppState;
  project: Project;
  onSave: (next: AppState) => void;
  helpVisible: boolean;
  measureAndScroll: (input: RNTextInput | null) => void;
}) {
  const { state, project, onSave, helpVisible, measureAndScroll } = props;
  const insets = useSafeAreaInsets();
  const ruleInputRef = useRef<RNTextInput>(null);
  const fineAmountInputRef = useRef<RNTextInput>(null);
  const [boardExpanded, setBoardExpanded] = useState(
    () => getProjectSectionExpand().boardAction
  );
  const [complainantsExpanded, setComplainantsExpanded] = useState(
    () => getProjectSectionExpand().complainants
  );
  const [ruleDraft, setRuleDraft] = useState(project.blightRule ?? '');
  const [correctionDraft, setCorrectionDraft] = useState(
    () => dateInputValue(project.correctionDueAtISO) || ''
  );
  const [fineStartedDraft, setFineStartedDraft] = useState(
    () => dateInputValue(project.fineStartedAtISO) || ''
  );
  const [fineAmountDraft, setFineAmountDraft] = useState(
    project.fineAmount != null ? String(project.fineAmount) : ''
  );
  const [viewingPdf, setViewingPdf] = useState<ViewerPdf | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [submittedDraft, setSubmittedDraft] = useState('');

  useEffect(() => {
    setRuleDraft(project.blightRule ?? '');
    setCorrectionDraft(dateInputValue(project.correctionDueAtISO) || '');
    setFineStartedDraft(dateInputValue(project.fineStartedAtISO) || '');
    setFineAmountDraft(project.fineAmount != null ? String(project.fineAmount) : '');
  }, [
    project.id,
    project.blightRule,
    project.correctionDueAtISO,
    project.fineStartedAtISO,
    project.fineAmount,
  ]);

  const complainants = complainantsForProject(state, project.id);

  function patchProject(
    patch: Partial<
      Pick<
        Project,
        | 'blightRule'
        | 'correctionDueAtISO'
        | 'fineStartedAtISO'
        | 'fineAmount'
      >
    >
  ) {
    onSave({
      ...state,
      projects: state.projects.map((row) =>
        row.id === project.id ? { ...row, ...patch, updatedAtISO: nowISO() } : row
      ),
    });
  }

  function saveRule() {
    const trimmed = ruleDraft.trim();
    if ((project.blightRule ?? '') === trimmed) return;
    patchProject({ blightRule: trimmed || undefined });
  }

  function saveFineAmount() {
    const trimmed = fineAmountDraft.trim();
    if (!trimmed) {
      if (project.fineAmount != null) patchProject({ fineAmount: undefined });
      setFineAmountDraft('');
      return;
    }
    const parsed = parseFloat(trimmed);
    if (Number.isNaN(parsed)) {
      setFineAmountDraft(project.fineAmount != null ? String(project.fineAmount) : '');
      return;
    }
    if (project.fineAmount !== parsed) patchProject({ fineAmount: parsed });
    setFineAmountDraft(String(parsed));
  }

  async function pickForSlot(slot: BlightBoardDocSlot) {
    const picked = await pickFileAttachment();
    if (!picked) return;
    const payload =
      picked.kind === 'document'
        ? documentAsPicked(picked.uri, picked.fileName, picked.mimeType)
        : documentAsPicked(picked.uri, 'Photo.jpg', 'image/jpeg');
    const next = await setBlightBoardDocument(state, project.id, slot, payload);
    onSave(next);
  }

  function slotDocumentId(slot: BlightBoardDocSlot): string | undefined {
    return slot === 'noticeOfViolation'
      ? project.noticeOfViolationDocumentId
      : project.municipalCitationDocumentId;
  }

  function openSlot(slot: BlightBoardDocSlot) {
    const docId = slotDocumentId(slot);
    const doc = documentById(state, docId);
    const label = BLIGHT_BOARD_DOC_LABELS[slot];
    if (!doc) {
      void pickForSlot(slot);
      return;
    }
    Alert.alert(label, doc.fileName, [
      {
        text: 'View',
        onPress: () => {
          if (isPdf(doc.fileName, doc.mimeType)) {
            setViewingPdf({
              uri: resolveAppFileUri(doc.localUri),
              label,
              fileName: doc.fileName,
            });
            return;
          }
          void shareFile(doc.localUri, doc.fileName, doc.mimeType);
        },
      },
      {
        text: 'Share',
        onPress: () => void shareFile(doc.localUri, doc.fileName, doc.mimeType),
      },
      { text: 'Replace', onPress: () => void pickForSlot(slot) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void clearBlightBoardDocument(state, project.id, slot).then(onSave);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function openNewComplainant() {
    setEditingId(null);
    setNameDraft('');
    setPhoneDraft('');
    setEmailDraft('');
    setSubmittedDraft('');
    setEditorOpen(true);
    setComplainantsExpanded(true);
    void setProjectSectionExpand({ complainants: true });
  }

  function openEditComplainant(id: string) {
    const person = complainants.find((row) => row.id === id);
    if (!person) return;
    setEditingId(id);
    setNameDraft(person.name);
    setPhoneDraft(person.phone ?? '');
    setEmailDraft(person.email ?? '');
    setSubmittedDraft(dateInputValue(person.submittedAtISO) || '');
    setEditorOpen(true);
  }

  function saveComplainantEditor() {
    const name = nameDraft.trim();
    if (!name) {
      Alert.alert('Name required', 'Enter the complainant name.');
      return;
    }
    const submittedTrimmed = submittedDraft.trim();
    const submittedAtISO = submittedTrimmed
      ? parseDateInputToISO(submittedTrimmed)
      : undefined;
    const values = {
      name,
      phone: phoneDraft,
      email: emailDraft,
      submittedAtISO,
    };
    if (editingId) {
      onSave(updateComplainant(state, editingId, values));
    } else {
      onSave(addComplainant(state, project.id, values));
    }
    setEditorOpen(false);
  }

  async function pickComplainantForm(complainantId: string) {
    const picked = await pickFileAttachment();
    if (!picked) return;
    const next = await setComplainantFormAttachment(state, complainantId, picked);
    onSave(next);
  }

  function confirmDeleteComplainant(id: string, name: string) {
    Alert.alert(`Remove ${name}?`, 'Their blight form files will also be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void removeComplainantCascade(state, id).then(onSave),
      },
    ]);
  }

  function formLabel(personId: string): string | undefined {
    const person = complainants.find((row) => row.id === personId);
    if (!person) return undefined;
    const docId = person.documentIds[0];
    const doc = documentById(state, docId);
    if (doc) return doc.fileName;
    const photo = state.projectPhotos.find((p) => p.complainantId === personId);
    if (photo) return 'Photo form';
    return undefined;
  }

  return (
    <>
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
            title="Board action"
            expanded={boardExpanded}
            count={1}
            showCountWhenCollapsed={false}
            onExpand={() => {
              const next = !boardExpanded;
              setBoardExpanded(next);
              void setProjectSectionExpand({ boardAction: next });
            }}
          />
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => {
              const next = !boardExpanded;
              setBoardExpanded(next);
              void setProjectSectionExpand({ boardAction: next });
            }}
            accessibilityRole="button"
            accessibilityLabel={boardExpanded ? 'Hide board action' : 'Show board action'}
            accessibilityState={{ expanded: boardExpanded }}
            hitSlop={6}
            style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.7 : 1 })}
          >
            <MaterialIcons
              name={boardExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color={colors.primary}
            />
          </Pressable>
        </View>
        {boardExpanded ? (
          <>
            {helpVisible ? (
              <SectionHelpTip>
                Board rule, correction deadline, and daily fine for this blight case.
              </SectionHelpTip>
            ) : null}
            <Text style={sharedStyles.fieldLabel}>Blight rule to correct</Text>
            <TextInput
              ref={ruleInputRef}
              style={[sharedStyles.input, sharedStyles.inputMultiline]}
              value={ruleDraft}
              onChangeText={setRuleDraft}
              onBlur={saveRule}
              onFocus={() => measureAndScroll(ruleInputRef.current)}
              placeholder="Cite the specific blight ordinance / rule"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <DateInputField
              label="Correct by (before fines accrue)"
              value={correctionDraft}
              onChangeText={(value) => {
                setCorrectionDraft(value);
                const iso = value.trim() ? parseDateInputToISO(value) : undefined;
                if (!value.trim() || iso) {
                  if ((project.correctionDueAtISO ?? '') !== (iso ?? '')) {
                    patchProject({ correctionDueAtISO: iso });
                  }
                }
              }}
              optional
            />
            <DateInputField
              label="Fine started"
              value={fineStartedDraft}
              onChangeText={(value) => {
                setFineStartedDraft(value);
                const iso = value.trim() ? parseDateInputToISO(value) : undefined;
                if (!value.trim() || iso) {
                  if ((project.fineStartedAtISO ?? '') !== (iso ?? '')) {
                    patchProject({ fineStartedAtISO: iso });
                  }
                }
              }}
              optional
            />
            <Text style={sharedStyles.fieldLabel}>Fine amount ($/day)</Text>
            <TextInput
              ref={fineAmountInputRef}
              style={sharedStyles.input}
              value={fineAmountDraft}
              onChangeText={setFineAmountDraft}
              onBlur={saveFineAmount}
              onFocus={() => measureAndScroll(fineAmountInputRef.current)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
            {(['noticeOfViolation', 'municipalCitation'] as const).map((slot) => {
              const doc = documentById(state, slotDocumentId(slot));
              const label = BLIGHT_BOARD_DOC_LABELS[slot];
              return (
                <Pressable
                  key={slot}
                  onPress={() => openSlot(slot)}
                  accessibilityRole="button"
                  accessibilityLabel={doc ? `${label}: ${doc.fileName}` : `Add ${label}`}
                  style={({ pressed }) => [
                    sharedStyles.card,
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      marginTop: 10,
                      marginBottom: 0,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      backgroundColor: colors.photoPlaceholder,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={sharedStyles.cardTitle}>{label}</Text>
                    <Text style={sharedStyles.cardMeta} numberOfLines={1}>
                      {doc ? doc.fileName : 'Add file'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </>
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
            title="Complainants"
            expanded={complainantsExpanded}
            count={complainants.length}
            onExpand={() => {
              const next = !complainantsExpanded;
              setComplainantsExpanded(next);
              void setProjectSectionExpand({ complainants: next });
            }}
          />
          <Pressable
            onPress={openNewComplainant}
            accessibilityRole="button"
            accessibilityLabel="Add complainant"
            hitSlop={6}
            style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.7 : 1 })}
          >
            <MaterialIcons name="add" size={24} color={colors.primary} />
          </Pressable>
          {complainants.length > 0 ? (
            <Pressable
              onPress={() => {
                const next = !complainantsExpanded;
                setComplainantsExpanded(next);
                void setProjectSectionExpand({ complainants: next });
              }}
              accessibilityRole="button"
              accessibilityLabel={
                complainantsExpanded ? 'Hide complainants' : 'Show complainants'
              }
              accessibilityState={{ expanded: complainantsExpanded }}
              hitSlop={6}
              style={({ pressed }) => ({
                marginLeft: 'auto',
                padding: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons
                name={complainantsExpanded ? 'expand-less' : 'expand-more'}
                size={24}
                color={colors.primary}
              />
            </Pressable>
          ) : null}
        </View>
        {helpVisible ? (
          <SectionHelpTip>
            People who filed this blight complaint, with optional blight form.
          </SectionHelpTip>
        ) : null}
        {complainants.length === 0 ? (
          <Text style={sharedStyles.emptyText}>Add complainants for this blight case.</Text>
        ) : complainantsExpanded ? (
          complainants.map((person) => {
            const photo = state.projectPhotos.find((p) => p.complainantId === person.id);
            const form = formLabel(person.id);
            return (
              <Pressable
                key={person.id}
                onPress={() => openEditComplainant(person.id)}
                onLongPress={() => confirmDeleteComplainant(person.id, person.name)}
                accessibilityRole="button"
                accessibilityLabel={person.name}
                style={({ pressed }) => [
                  sharedStyles.card,
                  { marginBottom: 8, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  {photo ? (
                    <Image
                      source={{ uri: resolveAppFileUri(photo.localUri) }}
                      style={{ width: 48, height: 48, borderRadius: 2 }}
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={sharedStyles.cardTitle}>{person.name}</Text>
                    {person.phone || person.email ? (
                      <Text style={sharedStyles.cardMeta} numberOfLines={1}>
                        {[person.phone, person.email].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                    {person.submittedAtISO ? (
                      <Text style={sharedStyles.cardMeta}>
                        Submitted {formatDisplayDate(person.submittedAtISO)}
                      </Text>
                    ) : null}
                    {form ? (
                      <Text style={sharedStyles.cardMeta} numberOfLines={1}>
                        Form: {form}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Pressable
                  onPress={() => void pickComplainantForm(person.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Attach blight form for ${person.name}`}
                  style={({ pressed }) => ({ marginTop: 8, opacity: pressed ? 0.7 : 1 })}
                >
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>
                    {form ? 'Replace blight form' : 'Add blight form'}
                  </Text>
                </Pressable>
              </Pressable>
            );
          })
        ) : null}
      </View>

      <PdfViewerModal pdf={viewingPdf} onClose={() => setViewingPdf(null)} />

      <Modal
        visible={editorOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEditorOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setEditorOpen(false)}>
          <Pressable
            onPress={() => {}}
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === 'ios' ? 8 : 0) },
            ]}
          >
            <Text style={sharedStyles.sectionTitle}>
              {editingId ? 'Edit complainant' : 'Add complainant'}
            </Text>
            <Text style={sharedStyles.fieldLabel}>Name</Text>
            <TextInput
              style={sharedStyles.input}
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <Text style={sharedStyles.fieldLabel}>Phone</Text>
            <TextInput
              style={sharedStyles.input}
              value={phoneDraft}
              onChangeText={setPhoneDraft}
              placeholder="Phone"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
            <Text style={sharedStyles.fieldLabel}>Email</Text>
            <TextInput
              style={sharedStyles.input}
              value={emailDraft}
              onChangeText={setEmailDraft}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <DateInputField
              label="Submitted"
              value={submittedDraft}
              onChangeText={setSubmittedDraft}
              optional
            />
            {editingId ? (
              <Pressable
                onPress={() => void pickComplainantForm(editingId)}
                style={({ pressed }) => ({ marginTop: 12, opacity: pressed ? 0.7 : 1 })}
              >
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  {formLabel(editingId) ? 'Replace blight form' : 'Add blight form'}
                </Text>
              </Pressable>
            ) : null}
            {editingId ? (
              <Pressable
                onPress={() => {
                  const person = complainants.find((row) => row.id === editingId);
                  if (!person) return;
                  Alert.alert('Remove blight form?', undefined, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: () =>
                        void clearComplainantFormAttachment(state, editingId).then(onSave),
                    },
                  ]);
                }}
                style={({ pressed }) => ({ marginTop: 8, opacity: pressed ? 0.7 : 1 })}
              >
                <Text style={{ color: colors.danger }}>Remove blight form</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={saveComplainantEditor}
              style={({ pressed }) => [
                sharedStyles.primaryBtn,
                pressed && sharedStyles.primaryBtnPressed,
              ]}
            >
              <Text style={sharedStyles.primaryBtnText}>Save</Text>
            </Pressable>
            <Pressable onPress={() => setEditorOpen(false)} style={sharedStyles.secondaryBtn}>
              <Text style={sharedStyles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
});
