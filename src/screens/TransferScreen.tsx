import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { AppState } from '../types';
import { sharedStyles } from '../theme';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import {
  buildTransferBundle,
  mergeImportState,
  parseTransferBundle,
  replaceImportState,
  transferBundleToJson,
} from '../transfer';
import { readPhotoAsBase64, writePhotoFromBase64 } from '../photoStorage';
import { readDocumentAsBase64, writeDocumentFromBase64 } from '../documentStorage';

export function TransferScreen(props: {
  state: AppState;
  onBack: () => void;
  onImport: (state: AppState) => void;
}) {
  const { state, onBack, onImport } = props;
  const insets = useSafeAreaInsets();
  const [includePhotos, setIncludePhotos] = useState(false);
  const [busy, setBusy] = useState(false);

  async function applyImport(
    incoming: AppState,
    photoData: Record<string, string> | undefined,
    replace: boolean
  ) {
    setBusy(true);
    try {
      let merged = replace ? replaceImportState(incoming) : mergeImportState(state, incoming);
      if (photoData) {
        for (const photo of merged.photos) {
          const b64 = photoData[photo.id];
          if (b64) {
            const localUri = await writePhotoFromBase64(photo.id, b64);
            merged = {
              ...merged,
              photos: merged.photos.map((p) => (p.id === photo.id ? { ...p, localUri } : p)),
            };
          }
        }
        for (const photo of merged.propertyPhotos) {
          const b64 = photoData[photo.id];
          if (b64) {
            const localUri = await writePhotoFromBase64(photo.id, b64);
            merged = {
              ...merged,
              propertyPhotos: merged.propertyPhotos.map((p) =>
                p.id === photo.id ? { ...p, localUri } : p
              ),
            };
          }
        }
        for (const photo of merged.roomPhotos) {
          const b64 = photoData[photo.id];
          if (b64) {
            const localUri = await writePhotoFromBase64(photo.id, b64);
            merged = {
              ...merged,
              roomPhotos: merged.roomPhotos.map((p) =>
                p.id === photo.id ? { ...p, localUri } : p
              ),
            };
          }
        }
        for (const document of merged.documents) {
          const b64 = photoData[document.id];
          if (b64) {
            const localUri = await writeDocumentFromBase64(document.id, b64, document.fileName);
            merged = {
              ...merged,
              documents: merged.documents.map((doc) =>
                doc.id === document.id ? { ...doc, localUri } : doc
              ),
            };
          }
        }
      }
      onImport(merged);
      Alert.alert('Import complete', replace ? 'Data replaced.' : 'New records merged.');
      onBack();
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function exportBackup() {
    setBusy(true);
    try {
      let photoData: Record<string, string> | undefined;
      if (includePhotos) {
        photoData = {};
        for (const photo of state.photos) {
          const b64 = await readPhotoAsBase64(photo.localUri);
          if (b64) photoData[photo.id] = b64;
        }
        for (const photo of state.propertyPhotos) {
          const b64 = await readPhotoAsBase64(photo.localUri);
          if (b64) photoData[photo.id] = b64;
        }
        for (const photo of state.roomPhotos) {
          const b64 = await readPhotoAsBase64(photo.localUri);
          if (b64) photoData[photo.id] = b64;
        }
        for (const document of state.documents) {
          const b64 = await readDocumentAsBase64(document.localUri);
          if (b64) photoData[document.id] = b64;
        }
      }
      const bundle = buildTransferBundle({
        state,
        sourceLabel: 'Property Inventory History',
        photoData,
      });
      const json = transferBundleToJson(bundle);
      const fileName = `property-inventory-${new Date().toISOString().slice(0, 10)}.json`;
      const path = `${FileSystem.cacheDirectory ?? ''}${fileName}`;
      await FileSystem.writeAsStringAsync(path, json);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/json',
          dialogTitle: 'Export Property Inventory History',
        });
      } else {
        Alert.alert('Exported', `Backup saved to ${path}`);
      }
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function pickImport() {
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }
      const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const parsed = parseTransferBundle(raw);
      if (!parsed.ok) {
        Alert.alert('Invalid file', parsed.error);
        return;
      }
      const incoming = parsed.bundle.state;
      const photoData = parsed.bundle.photoData;
      const propCount = incoming.properties.length;
      Alert.alert(
        'Import backup',
        `Found ${propCount} propert${propCount === 1 ? 'y' : 'ies'}. Replace all data or merge new records?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Merge', onPress: () => void applyImport(incoming, photoData, false) },
          { text: 'Replace all', style: 'destructive', onPress: () => void applyImport(incoming, photoData, true) },
        ]
      );
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <ScreenBackHeader onPress={onBack} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[sharedStyles.content, { paddingTop: 0 }]}
      >
        <Text style={sharedStyles.title}>Backup</Text>
        <Text style={sharedStyles.subtitle}>
          Export or import your properties, rooms, items, events, and optionally photos and PDFs.
        </Text>

        <View style={[sharedStyles.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <Text style={sharedStyles.cardTitle}>Include photos and PDFs in export</Text>
          <Switch value={includePhotos} onValueChange={setIncludePhotos} />
        </View>
        <Text style={sharedStyles.cardMeta}>
          Photo and PDF exports are larger but restore files on import.
        </Text>

        {busy ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}

        <Pressable
          onPress={() => void exportBackup()}
          disabled={busy}
          style={({ pressed }) => [sharedStyles.primaryBtn, pressed && sharedStyles.primaryBtnPressed]}
        >
          <Text style={sharedStyles.primaryBtnText}>Export backup</Text>
        </Pressable>

        <Pressable
          onPress={() => void pickImport()}
          disabled={busy}
          style={sharedStyles.secondaryBtn}
        >
          <Text style={sharedStyles.secondaryBtnText}>Import backup</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
