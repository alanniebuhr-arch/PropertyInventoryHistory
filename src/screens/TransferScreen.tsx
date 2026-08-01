import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import type { AppState, SyncDeletedIds } from '../types';
import { sharedStyles } from '../theme';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { ImportPreviewModal } from '../components/ImportPreviewModal';
import { FormPicker } from './itemDetails/FormPicker';
import {
  buildPropertyUpdateBundle,
  mergeCollaborativeState,
  previewCollaborativeImport,
  replaceImportState,
  replacePropertyImportState,
  type ImportChangeEntry,
  type ImportPreviewSummary,
} from '../transfer';
import {
  cleanupExtractRoot,
  exportBackupToZip,
  exportPropertyUpdateToZip,
  importBackupFromUri,
  materializeZipMedia,
} from '../transferPackage';
import { writePhotoFromBase64 } from '../photoStorage';
import { writeDocumentFromBase64 } from '../documentStorage';
import { clearAllPendingDeletedIds, clearPendingDeletedIds, getPendingDeletedIds } from '../syncMeta';
import { nowISO } from '../utils';

const SCOPE_ALL = '__all__';

type PendingImport = {
  mode: 'property-update' | 'full';
  incoming: AppState;
  deletedIds: SyncDeletedIds;
  propertyId?: string;
  mediaFiles?: Record<string, string>;
  extractRoot?: string;
  photoData?: Record<string, string>;
  title: string;
  subtitle: string;
  importAsNew: boolean;
  showReplace: boolean;
  replaceLabel: string;
  summary: ImportPreviewSummary;
  entries: ImportChangeEntry[];
};

export function TransferScreen(props: {
  state: AppState;
  mode: 'export' | 'import';
  onBack: () => void;
  onImport: (state: AppState) => void;
  onSave: (state: AppState) => void;
}) {
  const { state, mode, onBack, onImport, onSave } = props;
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [exportScope, setExportScope] = useState<string>(SCOPE_ALL);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);

  const properties = state.properties;
  const showScopePicker = properties.length > 1;
  const selectedPropertyId = useMemo(() => {
    if (!showScopePicker) {
      return properties[0]?.id ?? null;
    }
    return exportScope === SCOPE_ALL ? null : exportScope;
  }, [showScopePicker, properties, exportScope]);

  const scopeOptions = useMemo(
    () => [
      { value: SCOPE_ALL, label: 'All properties' },
      ...properties.map((p) => ({ value: p.id, label: p.name })),
    ],
    [properties]
  );

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
    replace: boolean,
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
      const name =
        payload.properties.find((p) => p.id === propertyId)?.name ??
        state.properties.find((p) => p.id === propertyId)?.name ??
        'property';

      if (replace) {
        onImport(replacePropertyImportState(state, payload, propertyId, deletedIds));
        Alert.alert('Property replaced', `"${name}" was replaced with the imported copy.`);
      } else {
        const { state: merged, summary } = mergeCollaborativeState(state, payload, deletedIds);
        onImport(merged);
        Alert.alert(
          'Updates imported',
          hasLocal
            ? `Added ${summary.added}, updated ${summary.updated}, deleted ${summary.deleted}.`
            : `Imported as a new property. Added ${summary.added} records.`
        );
      }
      onBack();
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      await cleanupExtractRoot(extractRoot);
      setBusy(false);
    }
  }

  async function markPropertyShared(propertyId: string) {
    const sharedAt = nowISO();
    await clearPendingDeletedIds(propertyId);
    onSave({
      ...state,
      properties: state.properties.map((p) =>
        p.id === propertyId ? { ...p, lastSharedAtISO: sharedAt, updatedAtISO: sharedAt } : p
      ),
    });
  }

  async function exportBackup() {
    setBusy(true);
    try {
      if (selectedPropertyId == null) {
        const path = await exportBackupToZip(state);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(path, {
            mimeType: 'application/zip',
            UTI: 'public.zip-archive',
            dialogTitle: 'Export Property Asset Manager',
          });
        } else {
          Alert.alert('Exported', `Data saved to ${path}`);
        }
        return;
      }

      const prop = properties.find((p) => p.id === selectedPropertyId);
      if (!prop) {
        Alert.alert('Export failed', 'Property not found.');
        return;
      }
      const safeName =
        prop.name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'property';
      const deletedIds = await getPendingDeletedIds(selectedPropertyId);
      const bundle = buildPropertyUpdateBundle({
        state,
        propertyId: selectedPropertyId,
        deletedIds,
        sourceLabel: `Updates: ${prop.name}`,
      });
      if (!bundle) {
        Alert.alert('Export failed', 'Property not found.');
        return;
      }
      const path = await exportPropertyUpdateToZip(bundle, { fileNamePrefix: safeName });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/zip',
          UTI: 'public.zip-archive',
          dialogTitle: `Export ${prop.name}`,
        });
      } else {
        Alert.alert('Exported', `Update package saved to ${path}`);
      }
      await markPropertyShared(selectedPropertyId);
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

  function confirmReplacePropertyImport(
    name: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) {
    let resolved = false;
    const cancel = () => {
      if (resolved) return;
      resolved = true;
      onCancel?.();
    };

    Alert.alert(
      `Replace "${name}"?`,
      `This will permanently delete the local copy of "${name}" and replace it with the imported property. Other properties on this device are not changed. This cannot be undone.`,
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

  function openImportPreview(opts: {
    mode: 'property-update' | 'full';
    incoming: AppState;
    deletedIds?: SyncDeletedIds;
    propertyId?: string;
    mediaFiles?: Record<string, string>;
    extractRoot?: string;
    photoData?: Record<string, string>;
  }) {
    const deletedIds = opts.deletedIds ?? {};
    const preview = previewCollaborativeImport(state, opts.incoming, deletedIds);

    if (opts.mode === 'property-update' && opts.propertyId) {
      const hasLocal = state.properties.some((p) => p.id === opts.propertyId);
      const name =
        opts.incoming.properties.find((p) => p.id === opts.propertyId)?.name ??
        state.properties.find((p) => p.id === opts.propertyId)?.name ??
        'property';
      setPendingImport({
        mode: 'property-update',
        incoming: opts.incoming,
        deletedIds,
        propertyId: opts.propertyId,
        mediaFiles: opts.mediaFiles,
        extractRoot: opts.extractRoot,
        photoData: opts.photoData,
        title: hasLocal ? `Import “${name}”` : `Import new property`,
        subtitle: hasLocal
          ? 'Merge keeps newer edits on both sides. Replace discards the local copy of this property only.'
          : `This update package is for a property not on this device. Import “${name}” as a new property?`,
        importAsNew: !hasLocal,
        showReplace: hasLocal,
        replaceLabel: 'Replace',
        summary: preview.summary,
        entries: preview.entries,
      });
      return;
    }

    const propCount = opts.incoming.properties.length;
    setPendingImport({
      mode: 'full',
      incoming: opts.incoming,
      deletedIds,
      mediaFiles: opts.mediaFiles,
      extractRoot: opts.extractRoot,
      photoData: opts.photoData,
      title: 'Import data',
      subtitle: `Found ${propCount} propert${propCount === 1 ? 'y' : 'ies'}. Merge updates existing records (newer wins), or replace all data.`,
      importAsNew: false,
      showReplace: true,
      replaceLabel: 'Replace all',
      summary: preview.summary,
      entries: preview.entries,
    });
  }

  function clearPendingImport(cleanup = true) {
    const extractRoot = pendingImport?.extractRoot;
    setPendingImport(null);
    if (cleanup && extractRoot) void cleanupExtractRoot(extractRoot);
  }

  function runPendingMerge() {
    const pending = pendingImport;
    if (!pending) return;
    setPendingImport(null);
    if (pending.mode === 'property-update' && pending.propertyId) {
      void applyUpdateImport(
        pending.incoming,
        pending.propertyId,
        pending.deletedIds,
        false,
        pending.mediaFiles,
        pending.extractRoot,
        pending.photoData
      );
      return;
    }
    if (pending.mediaFiles && pending.extractRoot) {
      void applyZipImport(
        pending.incoming,
        pending.mediaFiles,
        pending.extractRoot,
        false,
        pending.deletedIds
      );
      return;
    }
    void applyImport(pending.incoming, pending.photoData, false);
  }

  function runPendingReplace() {
    const pending = pendingImport;
    if (!pending) return;

    if (pending.mode === 'property-update' && pending.propertyId) {
      const name =
        pending.incoming.properties.find((p) => p.id === pending.propertyId)?.name ??
        state.properties.find((p) => p.id === pending.propertyId)?.name ??
        'property';
      confirmReplacePropertyImport(
        name,
        () => {
          setPendingImport(null);
          void applyUpdateImport(
            pending.incoming,
            pending.propertyId!,
            pending.deletedIds,
            true,
            pending.mediaFiles,
            pending.extractRoot,
            pending.photoData
          );
        },
        () => {
          /* keep preview open */
        }
      );
      return;
    }

    confirmReplaceImport(
      () => {
        setPendingImport(null);
        if (pending.mediaFiles && pending.extractRoot) {
          void applyZipImport(
            pending.incoming,
            pending.mediaFiles,
            pending.extractRoot,
            true,
            pending.deletedIds
          );
          return;
        }
        void applyImport(pending.incoming, pending.photoData, true);
      },
      () => {
        /* keep preview open */
      }
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
          openImportPreview({
            mode: 'property-update',
            incoming,
            propertyId,
            deletedIds: imported.result.deletedIds ?? {},
            mediaFiles: imported.result.mediaFiles,
            extractRoot: imported.extractRoot,
          });
          return;
        }

        openImportPreview({
          mode: 'full',
          incoming,
          mediaFiles: imported.result.mediaFiles,
          extractRoot: imported.extractRoot,
        });
        return;
      }

      if (imported.packageKind === 'property-update') {
        openImportPreview({
          mode: 'property-update',
          incoming: imported.state,
          propertyId: imported.propertyId,
          deletedIds: imported.deletedIds,
        });
        return;
      }

      openImportPreview({
        mode: 'full',
        incoming: imported.state,
        photoData: imported.photoData,
      });
    } catch (e) {
      await cleanupExtractRoot(extractRoot);
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  const nothingToApply = pendingImport
    ? pendingImport.summary.added +
        pendingImport.summary.updated +
        pendingImport.summary.deleted ===
      0
    : false;

  return (
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <ScreenBackHeader onPress={onBack} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[sharedStyles.content, { paddingTop: 0 }]}
      >
        {mode === 'export' ? (
          <>
            <Text style={sharedStyles.title}>Export data</Text>
            <Text style={sharedStyles.subtitle}>
              Export a ZIP with photos and PDFs. Choose all properties for a full export, or one
              property for a shareable update package. Recipients use Import data — Merge or Replace
              if that property already exists.
            </Text>

            {showScopePicker ? (
              <View style={{ marginBottom: 12 }}>
                <FormPicker
                  label="Properties"
                  options={scopeOptions}
                  value={exportScope}
                  onChange={(next) => setExportScope(next ?? SCOPE_ALL)}
                  allowClear={false}
                />
              </View>
            ) : null}

            {busy ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : (
              <Pressable
                onPress={() => void exportBackup()}
                style={({ pressed }) => [
                  sharedStyles.primaryBtn,
                  pressed && sharedStyles.primaryBtnPressed,
                ]}
              >
                <Text style={sharedStyles.primaryBtnText}>Export data</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Text style={sharedStyles.title}>Import data</Text>
            <Text style={sharedStyles.subtitle}>
              Import a data or update package from another device. Review changes before merging or
              replacing.
            </Text>

            {busy ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}

            <Pressable
              onPress={() => void pickImport()}
              disabled={busy}
              style={({ pressed }) => [
                sharedStyles.primaryBtn,
                pressed && sharedStyles.primaryBtnPressed,
              ]}
            >
              <Text style={sharedStyles.primaryBtnText}>Import data / updates</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {pendingImport ? (
        <ImportPreviewModal
          visible
          title={pendingImport.title}
          subtitle={pendingImport.subtitle}
          summary={pendingImport.summary}
          entries={pendingImport.entries}
          importAsNew={pendingImport.importAsNew}
          showReplace={pendingImport.showReplace}
          replaceLabel={pendingImport.replaceLabel}
          nothingToApply={nothingToApply}
          onCancel={() => clearPendingImport(true)}
          onMerge={runPendingMerge}
          onReplace={pendingImport.showReplace ? runPendingReplace : undefined}
        />
      ) : null}
    </View>
  );
}
