import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import type { AppState } from '../types';
import { documentById } from '../documents';
import { sharedStyles, colors } from '../theme';
import { PdfViewerModal, type ViewerPdf } from './PdfViewerModal';

export type DocumentListRow = {
  id: string;
  label: string;
  fileName: string;
  localUri: string;
  onDelete: () => void;
};

export function documentRowsFromState(
  state: AppState,
  entries: { id: string; label: string; documentId: string; onDelete: () => void }[]
): DocumentListRow[] {
  const rows: DocumentListRow[] = [];
  for (const entry of entries) {
    const doc = documentById(state, entry.documentId);
    if (!doc) continue;
    rows.push({
      id: entry.id,
      label: entry.label,
      fileName: doc.fileName,
      localUri: doc.localUri,
      onDelete: entry.onDelete,
    });
  }
  return rows;
}

async function shareDocument(localUri: string, fileName: string) {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    Alert.alert('Unavailable', 'Sharing is not available on this device.');
    return;
  }
  await Sharing.shareAsync(localUri, {
    mimeType: 'application/pdf',
    dialogTitle: fileName,
    UTI: 'com.adobe.pdf',
  });
}

function confirmDeleteDocument(onDelete: () => void) {
  Alert.alert('Remove document?', 'This PDF will be deleted from this slot.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: onDelete },
  ]);
}

function showDocumentActions(row: DocumentListRow, onView: () => void) {
  Alert.alert(row.label, undefined, [
    { text: 'View', onPress: onView },
    { text: 'Share', onPress: () => void shareDocument(row.localUri, row.fileName) },
    { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteDocument(row.onDelete) },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

function rowToViewerPdf(row: DocumentListRow): ViewerPdf {
  return {
    uri: row.localUri,
    label: row.label,
    fileName: row.fileName,
  };
}

export function DocumentListSection(props: { rows: DocumentListRow[] }) {
  const { rows } = props;
  const [viewingPdf, setViewingPdf] = useState<ViewerPdf | null>(null);

  if (rows.length === 0) return null;

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={sharedStyles.sectionTitle}>Documents</Text>
      {rows.map((row) => (
        <Pressable
          key={row.id}
          onPress={() => setViewingPdf(rowToViewerPdf(row))}
          onLongPress={() => showDocumentActions(row, () => setViewingPdf(rowToViewerPdf(row)))}
          accessibilityRole="button"
          accessibilityLabel={`View ${row.label} PDF`}
          accessibilityHint="Opens the PDF. Long press for Share, Delete, and other options."
          style={({ pressed }) => [
            sharedStyles.card,
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              marginBottom: 8,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={sharedStyles.cardTitle}>{row.label}</Text>
            <Text style={sharedStyles.cardMeta} numberOfLines={1}>
              {row.fileName}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
      <PdfViewerModal pdf={viewingPdf} onClose={() => setViewingPdf(null)} />
    </View>
  );
}
