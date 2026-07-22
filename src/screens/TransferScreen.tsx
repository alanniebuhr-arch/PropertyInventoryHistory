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
import type { AppState, SyncDeletedIds } from '../types';
import { sharedStyles } from '../theme';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import {
  buildTransferBundle,
  mergeCollaborativeState,
  replaceImportState,
  summarizeChanges,
  transferBundleToJson,
} from '../transfer';
import {
  cleanupExtractRoot,
  exportBackupToZip,
  importBackupFromUri,
  materializeZipMedia,
} from '../transferPackage';
import { writePhotoFromBase64 } from '../photoStorage';
import { writeDocumentFromBase64 } from '../documentStorage';
import { clearAllPendingDeletedIds } from '../syncMeta';

export function TransferScreen(props: {
  state: AppState;
  onBack: () => void;
  onImport: (state: AppState) => void;
}) {
  const { state, onBack, onImport } = props;
  const insets = useSafeAreaInsets();
  const [includePhotos, setIncludePhotos] = useState(false);
  const [busy, setBusy] = useState(false);

  async function materializePhotoData(
    merged: AppState,
    photoData: Record<string, string> | undefined
  ): Promise<AppState> {
    if (!photoData) return merged;
    let next = merged;
    for (const photo of next.photos) {
      const b64 = photoData[photo.id];
      if (b64) {
        const localUri = await writePhotoFromBase64(photo.id, b64);
        next = {
          ...next,
          photos: next.photos.map((p) => (p.id === photo.id ? { ...p, localUri } : p)),
        };
      }
    }
    for (const photo of next.propertyPhotos) {
      const b64 = photoData[photo.id];
      if (b64) {
        const localUri = await writePhotoFromBase64(photo.id, b64);
        next = {
          ...next,
          propertyPhotos: next.propertyPhotos.map((p) =>
            p.id === photo.id ? { ...p, localUri } : p
          ),
        };
      }
    }
    for (const photo of next.roomPhotos) {
      const b64 = photoData[photo.id];
      if (b64) {
        const localUri = await writePhotoFromBase64(photo.id, b64);
        next = {
          ...next,
          roomPhotos: next.roomPhotos.map((p) =>
            p.id === photo.id ? { ...p, localUri } : p
          ),
        };
      }
    }
    for (const photo of next.projectPhotos) {
      const b64 = photoData[photo.id];
      if (b64) {
        const localUri = await writePhotoFromBase64(photo.id, b64);
        next = {
          ...next,
          projectPhotos: next.projectPhotos.map((p) =>
            p.id === photo.id ? { ...p, localUri } : p
          ),
        };
      }
    }
    for (const photo of next.vendorPhotos) {
      const b64 = photoData[photo.id];
      if (b64) {
        const localUri = await writePhotoFromBase64(photo.id, b64);
        next = {
          ...next,
          vendorPhotos: next.vendorPhotos.map((p) =>
            p.id === photo.id ? { ...p, localUri } : p
          ),
        };
      }
    }
    for (const document of next.documents) {
      const b64 = photoData[document.id];
      if (b64) {
        const localUri = await writeDocumentFromBase64(document.id, b64, document.fileName);
        next = {
          ...next,
          documents: next.documents.map((doc) =>
            doc.id === document.id ? { ...doc, localUri } : doc
          ),
        };
      }
    }
    return next;
  }

  async function applyImport(
    incoming: AppState,
    photoData: Record<string, string> | undefined,
    replace: boolean
  ) {
    setBusy(true);
    try {
      let merged = replace
        ? replaceImportState(incoming)
        : mergeCollaborativeState(state, incoming).state;
      merged = await materializePhotoData(merged, photoData);
      if (replace) await clearAllPendingDeletedIds();
      onImport(merged);
      Alert.alert(
        'Import complete',
        replace ? 'Data replaced.' : 'Records merged (newer changes kept).'
      );
      onBack();
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function applyZipImport(
    incoming: AppState,
    mediaFiles: Record<string, string>,
    extractRoot: string,
    replace: boolean,
    deletedIds?: SyncDeletedIds
  ) {
    setBusy(true);
    try {
      const withMedia = await materializeZipMedia(incoming, mediaFiles);
      const merged = replace
        ? replaceImportState(withMedia)
        : mergeCollaborativeState(state, withMedia, deletedIds ?? {}).state;
      if (replace) await clearAllPendingDeletedIds();
      onImport(merged);
      Alert.alert(
        'Import complete',
        replace ? 'Data replaced.' : 'Records merged (newer changes kept).'
      );
      onBack();
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      await cleanupExtractRoot(extractRoot);
      setBusy(false);
    }
  }

  async function applyUpdateImport(
    incoming: AppState,
    propertyId: string,
    deletedIds: SyncDeletedIds,
    mediaFiles?: Record<string, string>,
    extractRoot?: string,
    photoData?: Record<string, string>
  ) {
    setBusy(true);
    try {
      let payload = incoming;
      if (mediaFiles) {
        payload = await materializeZipMedia(incoming, mediaFiles);
      }
      payload = await materializePhotoData(payload, photoData);

      const hasLocal = state.properties.some((p) => p.id === propertyId);
      const { state: merged, summary } = mergeCollaborativeState(state, payload, deletedIds);
      onImport(merged);
      Alert.alert(
        'Updates imported',
        hasLocal
          ? `Added ${summary.added}, updated ${summary.updated}, deleted ${summary.deleted}.`
          : `Imported as a new property. Added ${summary.added} records.`
      );
      onBack();
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      await cleanupExtractRoot(extractRoot);
      setBusy(false);
    }
  }

  async function exportBackup() {
    setBusy(true);
    try {
      if (includePhotos) {
        const path = await exportBackupToZip(state);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(path, {
            mimeType: 'application/zip',
            UTI: 'public.zip-archive',
            dialogTitle: 'Export Property Asset Manager',
          });
        } else {
          Alert.alert('Exported', `Backup saved to ${path}`);
        }
        return;
      }

      const bundle = buildTransferBundle({
        state,
        sourceLabel: 'Property Asset Manager',
      });
      const json = transferBundleToJson(bundle);
      const fileName = `property-inventory-${new Date().toISOString().slice(0, 10)}.json`;
      const path = `${FileSystem.cacheDirectory ?? ''}${fileName}`;
      await FileSystem.writeAsStringAsync(path, json);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/json',
          dialogTitle: 'Export Property Asset Manager',
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

  function confirmReplaceImport(onConfirm: () => void, onCancel?: () => void) {
    const existingCount = state.properties.length;
    const propertyLabel = existingCount === 1 ? 'property' : 'properties';
    let resolved = false;
    const cancel = () => {
      if (resolved) return;
      resolved = true;
      onCancel?.();
    };

    Alert.alert(
      'Delete all existing properties?',
      `Replace all will permanently delete all ${existingCount} existing ${propertyLabel} in this app, including their rooms, assets, projects, vendors, interactions, photos, and documents. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: cancel },
        {
          text: 'Delete and replace',
          style: 'destructive',
          onPress: () => {
            resolved = true;
            onConfirm();
          },
        },
      ],
      { cancelable: true, onDismiss: cancel }
    );
  }

  function promptUpdateImport(opts: {
    incoming: AppState;
    propertyId: string;
    deletedIds: SyncDeletedIds;
    mediaFiles?: Record<string, string>;
    extractRoot?: string;
    photoData?: Record<string, string>;
  }) {
    const hasLocal = state.properties.some((p) => p.id === opts.propertyId);
    const name =
      opts.incoming.properties.find((p) => p.id === opts.propertyId)?.name ??
      state.properties.find((p) => p.id === opts.propertyId)?.name ??
      'property';
    const summary = summarizeChanges(opts.incoming, opts.deletedIds);
    Alert.alert(
      'Import updates',
      hasLocal
        ? `Apply updates to "${name}"?\n\nIncludes: ${summary}. Newer edits win when both sides changed the same record.`
        : `This update package is for a property not on this device. Import "${name}" as a new property?\n\nIncludes: ${summary}.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => void cleanupExtractRoot(opts.extractRoot),
        },
        {
          text: hasLocal ? 'Apply updates' : 'Import as new',
          onPress: () =>
            void applyUpdateImport(
              opts.incoming,
              opts.propertyId,
              opts.deletedIds,
              opts.mediaFiles,
              opts.extractRoot,
              opts.photoData
            ),
        },
      ]
    );
  }

  async function pickImport() {
    setBusy(true);
    let extractRoot: string | undefined;
    try {
      // Use */* so iOS Files does not grey out ZIP backups (MIME/UTI filters are unreliable).
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }
      const asset = result.assets[0];
      const imported = await importBackupFromUri(asset.uri, {
        fileName: asset.name,
        mimeType: asset.mimeType,
      });
      if (!imported.ok) {
        Alert.alert('Invalid file', imported.error);
        return;
      }

      if (imported.kind === 'zip') {
        extractRoot = imported.extractRoot;
        const incoming = imported.result.state;

        if (imported.result.packageKind === 'property-update') {
          const propertyId = imported.result.propertyId;
          if (!propertyId) {
            Alert.alert('Invalid file', 'Update package is missing property id.');
            await cleanupExtractRoot(extractRoot);
            return;
          }
          promptUpdateImport({
            incoming,
            propertyId,
            deletedIds: imported.result.deletedIds ?? {},
            mediaFiles: imported.result.mediaFiles,
            extractRoot: imported.extractRoot,
          });
          return;
        }

        const propCount = incoming.properties.length;
        Alert.alert(
          'Import backup',
          `Found ${propCount} propert${propCount === 1 ? 'y' : 'ies'} (ZIP with media). Merge updates existing records (newer wins), or replace all data.`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => void cleanupExtractRoot(extractRoot),
            },
            {
              text: 'Merge',
              onPress: () =>
                void applyZipImport(
                  incoming,
                  imported.result.mediaFiles,
                  imported.extractRoot,
                  false
                ),
            },
            {
              text: 'Replace all',
              style: 'destructive',
              onPress: () =>
                confirmReplaceImport(
                  () =>
                    void applyZipImport(
                      incoming,
                      imported.result.mediaFiles,
                      imported.extractRoot,
                      true
                    ),
                  () => void cleanupExtractRoot(imported.extractRoot)
                ),
            },
          ]
        );
        return;
      }

      if (imported.packageKind === 'property-update') {
        promptUpdateImport({
          incoming: imported.state,
          propertyId: imported.propertyId,
          deletedIds: imported.deletedIds,
          photoData: undefined,
        });
        return;
      }

      const incoming = imported.state;
      const photoData = imported.photoData;
      const propCount = incoming.properties.length;
      Alert.alert(
        'Import backup',
        `Found ${propCount} propert${propCount === 1 ? 'y' : 'ies'}. Merge updates existing records (newer wins), or replace all data.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Merge', onPress: () => void applyImport(incoming, photoData, false) },
          {
            text: 'Replace all',
            style: 'destructive',
            onPress: () =>
              confirmReplaceImport(() => void applyImport(incoming, photoData, true)),
          },
        ]
      );
    } catch (e) {
      await cleanupExtractRoot(extractRoot);
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
          Export a full backup, or import a backup / Share updates package from another device.
          First-time handoff: Export property → Import → Merge. Ongoing: Share updates → Import.
        </Text>

        <View
          style={[
            sharedStyles.card,
            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
          ]}
        >
          <Text style={sharedStyles.cardTitle}>Include photos and PDFs in export</Text>
          <Switch value={includePhotos} onValueChange={setIncludePhotos} />
        </View>
        <Text style={sharedStyles.cardMeta}>
          When on, backups export as a ZIP with photo and PDF files (required for large inventories).
          Metadata-only exports stay as JSON.
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
          <Text style={sharedStyles.secondaryBtnText}>Import backup / updates</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
