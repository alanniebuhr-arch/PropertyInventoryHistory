import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../textScale';
import { colors, sharedStyles } from '../theme';
import type {
  ImportChangeAction,
  ImportChangeEntry,
  ImportPreviewSummary,
} from '../transfer';

function actionLabel(action: ImportChangeAction): string {
  switch (action) {
    case 'added':
      return 'Added';
    case 'updated':
      return 'Updated';
    case 'deleted':
      return 'Deleted';
  }
}

function kindLabel(kind: ImportChangeEntry['kind']): string {
  switch (kind) {
    case 'property':
      return 'Property';
    case 'room':
      return 'Room';
    case 'item':
      return 'Asset';
    case 'event':
      return 'Event';
    case 'project':
      return 'Project';
    case 'vendor':
      return 'Vendor';
    case 'interaction':
      return 'Interaction';
    case 'todo':
      return 'To-do';
    case 'punch':
      return 'Punch item';
    case 'photo':
      return 'Photo';
    case 'document':
      return 'Document';
  }
}

function actionColor(action: ImportChangeAction): string {
  switch (action) {
    case 'added':
      return colors.accent;
    case 'updated':
      return colors.sectionTitle;
    case 'deleted':
      return colors.danger;
  }
}

function formatSummary(summary: ImportPreviewSummary): string {
  return [
    `Added ${summary.added}`,
    `Updated ${summary.updated}`,
    `Unchanged ${summary.unchanged}`,
    `Deleted ${summary.deleted}`,
  ].join(' · ');
}

export function ImportPreviewModal(props: {
  visible: boolean;
  title: string;
  subtitle?: string;
  summary: ImportPreviewSummary;
  entries: ImportChangeEntry[];
  /** When true, show Import as new instead of Merge. */
  importAsNew?: boolean;
  /** When true, offer Replace (property or all). */
  showReplace?: boolean;
  replaceLabel?: string;
  /** No add/update/delete — disable Merge / Import as new. */
  nothingToApply?: boolean;
  onCancel: () => void;
  onMerge: () => void;
  onReplace?: () => void;
}) {
  const {
    visible,
    title,
    subtitle,
    summary,
    entries,
    importAsNew = false,
    showReplace = false,
    replaceLabel = 'Replace',
    nothingToApply = false,
    onCancel,
    onMerge,
    onReplace,
  } = props;

  const primaryLabel = importAsNew ? 'Import as new' : 'Merge';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <View
          style={[
            sharedStyles.card,
            {
              marginBottom: 0,
              maxHeight: '85%',
              paddingBottom: 12,
            },
          ]}
        >
          <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>{title}</Text>
          {subtitle ? (
            <Text style={[sharedStyles.cardMeta, { marginBottom: 8 }]}>{subtitle}</Text>
          ) : null}
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: colors.text,
              marginBottom: 12,
            }}
          >
            {formatSummary(summary)}
          </Text>

          {nothingToApply ? (
            <Text style={[sharedStyles.emptyText, { marginBottom: 12 }]}>
              No changes relative to this device.
            </Text>
          ) : (
            <ScrollView
              style={{ maxHeight: 360 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {entries.map((entry) => (
                <View
                  key={`${entry.action}-${entry.kind}-${entry.id}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: actionColor(entry.action),
                      minWidth: 64,
                      marginTop: 2,
                    }}
                  >
                    {actionLabel(entry.action)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: colors.textMuted,
                      minWidth: 72,
                      marginTop: 2,
                    }}
                  >
                    {kindLabel(entry.kind)}
                  </Text>
                  <Text style={{ flex: 1, fontSize: 15, color: colors.text, lineHeight: 20 }}>
                    {entry.label}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={{ marginTop: 12, gap: 8 }}>
            <Pressable
              onPress={onMerge}
              disabled={nothingToApply}
              style={({ pressed }) => [
                sharedStyles.primaryBtn,
                { marginTop: 0 },
                nothingToApply && { opacity: 0.45 },
                pressed && sharedStyles.primaryBtnPressed,
              ]}
            >
              <Text style={sharedStyles.primaryBtnText}>{primaryLabel}</Text>
            </Pressable>
            {showReplace && onReplace ? (
              <Pressable
                onPress={onReplace}
                style={({ pressed }) => [
                  sharedStyles.secondaryBtn,
                  { marginTop: 0, borderColor: colors.danger },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[sharedStyles.secondaryBtnText, { color: colors.danger }]}>
                  {replaceLabel}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                sharedStyles.secondaryBtn,
                { marginTop: 0 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={sharedStyles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
