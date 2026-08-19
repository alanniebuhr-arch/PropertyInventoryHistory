import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, View, type TextInput as RNTextInput } from 'react-native';
import * as Sharing from 'expo-sharing';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../textScale';
import type { AppState, Project } from '../types';
import { CollapsibleSectionTitle } from './CollapsibleSectionTitle';
import { DateInputField } from './DateInputField';
import { PdfViewerModal, type ViewerPdf } from './PdfViewerModal';
import { SectionHelpTip } from './SectionHelpTip';
import { sharedStyles, colors } from '../theme';
import { dateInputValue, nowISO, parseDateInputToISO } from '../utils';
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
  const ruleInputRef = useRef<RNTextInput>(null);
  const fineAmountInputRef = useRef<RNTextInput>(null);
  const [boardExpanded, setBoardExpanded] = useState(
    () => getProjectSectionExpand().boardAction
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

      <PdfViewerModal pdf={viewingPdf} onClose={() => setViewingPdf(null)} />
    </>
  );
}
