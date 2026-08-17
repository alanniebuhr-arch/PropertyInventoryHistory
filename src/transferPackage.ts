import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { strToU8, Unzip, UnzipInflate, UnzipPassThrough, Zip, ZipPassThrough } from 'fflate';
import type { AppState, PropertyUpdateBundle, SyncDeletedIds } from './types';
import { EMPTY_APP_STATE } from './types';
import { resolveAppFileUri } from './appFileUri';
import { ensurePhotosDirectory, persistPhotoFromUri } from './photoStorage';
import { ensureDocumentsDirectory, persistDocumentFromUri } from './documentStorage';
import {
  TRANSFER_FORMAT_VERSION,
  UPDATE_FORMAT_VERSION,
  coerceAppState,
  parseTransferBundle,
} from './transfer';

export const ZIP_TRANSFER_FORMAT_VERSION = 2 as const;

const ZIP_IO_CHUNK = 512 * 1024;
const ZIP_READ_CHUNK = 1024 * 1024;
const COPY_CONCURRENCY = 4;
const SHRINK_MAX_EDGE = 1920;
const SHRINK_JPEG_QUALITY = 0.75;

export type TransferProgress = {
  phase: 'packing' | 'extracting' | 'copying';
  current: number;
  total: number;
};

export type ExportZipOptions = {
  fileNamePrefix?: string;
  sourceLabel?: string;
  /** Re-encode photos into this ZIP only. App files on disk are unchanged. */
  shrinkPhotos?: boolean;
  onProgress?: (progress: TransferProgress) => void;
};

type StagedMedia = {
  zipPath: string;
  sourceUri: string;
};

function utf8ToBytes(text: string): Uint8Array {
  return strToU8(text);
}

function yieldJs(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Math.max(1, Math.min(limit, items.length));
  await Promise.all(
    Array.from({ length: workers }, async () => {
      for (;;) {
        const index = next;
        next += 1;
        if (index >= items.length) return;
        out[index] = await fn(items[index]!, index);
      }
    })
  );
  return out;
}

async function ensureEmptyDir(uri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
  await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
}

function collectMediaToStage(state: AppState): StagedMedia[] {
  const staged: StagedMedia[] = [];
  for (const photo of state.photos) {
    staged.push({
      zipPath: `photos/${photo.id}`,
      sourceUri: resolveAppFileUri(photo.localUri),
    });
  }
  for (const photo of state.propertyPhotos) {
    staged.push({
      zipPath: `photos/${photo.id}`,
      sourceUri: resolveAppFileUri(photo.localUri),
    });
  }
  for (const photo of state.roomPhotos) {
    staged.push({
      zipPath: `photos/${photo.id}`,
      sourceUri: resolveAppFileUri(photo.localUri),
    });
  }
  for (const photo of state.projectPhotos) {
    staged.push({
      zipPath: `photos/${photo.id}`,
      sourceUri: resolveAppFileUri(photo.localUri),
    });
  }
  for (const photo of state.vendorPhotos) {
    staged.push({
      zipPath: `photos/${photo.id}`,
      sourceUri: resolveAppFileUri(photo.localUri),
    });
  }
  for (const document of state.documents) {
    staged.push({
      zipPath: `documents/${document.id}`,
      sourceUri: resolveAppFileUri(document.localUri),
    });
  }
  return staged;
}

async function mediaThatExists(items: StagedMedia[]): Promise<StagedMedia[]> {
  if (items.length === 0) return [];
  const flags = await mapPool(items, 8, async (item) => {
    try {
      const info = await FileSystem.getInfoAsync(item.sourceUri);
      return info.exists === true;
    } catch {
      try {
        return new File(item.sourceUri).exists;
      } catch {
        return false;
      }
    }
  });
  return items.filter((_, index) => flags[index]);
}

async function readFileBytes(uri: string): Promise<Uint8Array> {
  const file = new File(uri);
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

async function getImageSize(uri: string): Promise<{ width: number; height: number } | null> {
  try {
    return await new Promise((resolve, reject) => {
      Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
    });
  } catch {
    return null;
  }
}

/** Cache JPEG for this export only. Never overwrites app photo files. */
async function shrinkPhotoForExport(sourceUri: string): Promise<string> {
  const size = await getImageSize(sourceUri);
  if (!size || Math.max(size.width, size.height) <= SHRINK_MAX_EDGE) {
    return sourceUri;
  }
  const actions: ImageManipulator.Action[] =
    size.width >= size.height
      ? [{ resize: { width: SHRINK_MAX_EDGE } }]
      : [{ resize: { height: SHRINK_MAX_EDGE } }];
  const result = await ImageManipulator.manipulateAsync(sourceUri, actions, {
    compress: SHRINK_JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri || sourceUri;
}

async function pushFileToZip(zip: Zip, zipPath: string, sourceUri: string): Promise<void> {
  const entry = new ZipPassThrough(zipPath);
  zip.add(entry);
  let handle: ReturnType<File['open']> | null = null;
  try {
    handle = new File(sourceUri).open();
  } catch {
    handle = null;
  }
  if (!handle) {
    const bytes = await readFileBytes(sourceUri);
    entry.push(bytes, true);
    return;
  }
  try {
    for (;;) {
      const bytes = handle.readBytes(ZIP_IO_CHUNK);
      if (!bytes || bytes.length === 0) break;
      entry.push(bytes, false);
    }
    entry.push(new Uint8Array(0), true);
  } finally {
    handle.close();
  }
}

export function transferProgressLabel(progress: TransferProgress): string {
  if (progress.phase === 'packing') {
    return progress.total > 0
      ? `Packing ${progress.current} of ${progress.total}…`
      : 'Packing…';
  }
  if (progress.phase === 'extracting') {
    if (progress.total > 0) {
      const pct = Math.min(100, Math.round((progress.current / progress.total) * 100));
      return `Reading backup ${pct}%…`;
    }
    return 'Reading backup…';
  }
  return progress.total > 0
    ? `Saving photos ${progress.current} of ${progress.total}…`
    : 'Saving photos…';
}

async function writeInventoryZip(params: {
  zipName: string;
  manifest: object;
  media: StagedMedia[];
  shrinkPhotos: boolean;
  onProgress?: (progress: TransferProgress) => void;
}): Promise<string> {
  const { zipName, manifest, shrinkPhotos, onProgress } = params;
  const zipFile = new File(Paths.cache, zipName);
  const json = JSON.stringify(manifest);
  const existing = await mediaThatExists(params.media);
  const tempsToDelete: string[] = [];

  if (zipFile.exists) {
    zipFile.delete();
  }
  zipFile.create({ intermediates: true, overwrite: true });
  const handle = zipFile.open();

  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const fail = (err: unknown) => {
        if (settled) return;
        settled = true;
        try {
          handle.close();
        } catch {
          // ignore
        }
        reject(err instanceof Error ? err : new Error(String(err)));
      };

      const zip = new Zip((err, chunk, final) => {
        if (err) {
          fail(err);
          return;
        }
        try {
          if (chunk.length > 0) {
            handle.writeBytes(chunk);
          }
          if (final && !settled) {
            settled = true;
            handle.close();
            resolve();
          }
        } catch (writeErr) {
          fail(writeErr);
        }
      });

      void (async () => {
        try {
          const stateEntry = new ZipPassThrough('state.json');
          zip.add(stateEntry);
          stateEntry.push(utf8ToBytes(json), true);

          const total = existing.length;
          onProgress?.({ phase: 'packing', current: 0, total });
          for (let index = 0; index < existing.length; index += 1) {
            const item = existing[index]!;
            let sourceUri = item.sourceUri;
            if (shrinkPhotos && item.zipPath.startsWith('photos/')) {
              try {
                const shrunk = await shrinkPhotoForExport(item.sourceUri);
                if (shrunk !== item.sourceUri) {
                  tempsToDelete.push(shrunk);
                  sourceUri = shrunk;
                }
              } catch {
                sourceUri = item.sourceUri;
              }
            }
            await pushFileToZip(zip, item.zipPath, sourceUri);
            onProgress?.({ phase: 'packing', current: index + 1, total });
            if (index % 4 === 3) await yieldJs();
          }
          zip.end();
        } catch (e) {
          fail(e);
        }
      })();
    });
  } finally {
    for (const temp of tempsToDelete) {
      try {
        await FileSystem.deleteAsync(temp, { idempotent: true });
      } catch {
        // ignore
      }
    }
  }

  return zipFile.uri;
}

/** Stream a ZIP of state.json + binary media copies. Returns the zip file:// URI. */
export async function exportBackupToZip(
  state: AppState,
  options?: ExportZipOptions
): Promise<string> {
  const stamp = new Date().toISOString().slice(0, 10);
  const prefix = (options?.fileNamePrefix ?? 'property-inventory')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'property-inventory';
  return writeInventoryZip({
    zipName: `${prefix}-${stamp}.zip`,
    manifest: {
      formatVersion: ZIP_TRANSFER_FORMAT_VERSION,
      kind: 'property-inventory' as const,
      exportedAtISO: new Date().toISOString(),
      sourceLabel: options?.sourceLabel ?? 'Property Asset Manager',
      state,
    },
    media: collectMediaToStage(state),
    shrinkPhotos: options?.shrinkPhotos === true,
    onProgress: options?.onProgress,
  });
}

/** ZIP a property-update package (changed state + deletedIds + media). */
export async function exportPropertyUpdateToZip(
  bundle: PropertyUpdateBundle,
  options?: ExportZipOptions
): Promise<string> {
  const stamp = new Date().toISOString().slice(0, 10);
  const prefix = (options?.fileNamePrefix ?? 'property-update')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'property-update';
  return writeInventoryZip({
    zipName: `${prefix}-updates-${stamp}.zip`,
    manifest: {
      formatVersion: UPDATE_FORMAT_VERSION,
      kind: 'property-update' as const,
      exportedAtISO: bundle.exportedAtISO,
      sourceLabel: bundle.sourceLabel,
      propertyId: bundle.propertyId,
      sinceISO: bundle.sinceISO,
      state: bundle.state,
      deletedIds: bundle.deletedIds,
    },
    media: collectMediaToStage(bundle.state),
    shrinkPhotos: options?.shrinkPhotos === true,
    onProgress: options?.onProgress,
  });
}

function looksLikeZip(opts: {
  uri: string;
  fileName?: string;
  mimeType?: string;
  header?: Uint8Array;
}): boolean {
  const name = (opts.fileName ?? opts.uri).toLowerCase();
  if (name.endsWith('.zip')) return true;
  const mime = (opts.mimeType ?? '').toLowerCase();
  if (
    mime === 'application/zip' ||
    mime === 'application/x-zip-compressed' ||
    mime === 'application/x-zip' ||
    mime === 'multipart/x-zip'
  ) {
    return true;
  }
  const header = opts.header;
  if (header && header.length >= 4) {
    // ZIP local file / empty archive / spanning markers: PK\x03\x04, PK\x05\x06, PK\x07\x08
    return (
      header[0] === 0x50 &&
      header[1] === 0x4b &&
      (header[2] === 0x03 || header[2] === 0x05 || header[2] === 0x07)
    );
  }
  return false;
}

async function readFileHeader(uri: string): Promise<Uint8Array | undefined> {
  try {
    const handle = new File(uri).open();
    try {
      return handle.readBytes(4);
    } finally {
      handle.close();
    }
  } catch {
    // fall through
  }
  try {
    // Legacy fallback for URIs the new File API can't open.
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 4,
      position: 0,
    });
    const cleaned = b64.replace(/[^A-Za-z0-9+/=]/g, '');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const out: number[] = [];
    for (let i = 0; i + 3 < cleaned.length && out.length < 4; i += 4) {
      const a = chars.indexOf(cleaned[i]!);
      const b = chars.indexOf(cleaned[i + 1]!);
      const c = chars.indexOf(cleaned[i + 2]!);
      const d = chars.indexOf(cleaned[i + 3]!);
      out.push((a << 2) | (b >> 4));
      if (cleaned[i + 2] !== '=' && out.length < 4) out.push(((b & 15) << 4) | (c >> 2));
      if (cleaned[i + 3] !== '=' && out.length < 4) out.push(((c & 3) << 6) | d);
    }
    return new Uint8Array(out.slice(0, 4));
  } catch {
    return undefined;
  }
}

async function writeBytesToUri(destUri: string, bytes: Uint8Array): Promise<void> {
  const file = new File(destUri);
  if (file.exists) {
    file.delete();
  }
  file.create({ intermediates: true, overwrite: true });
  const handle = file.open();
  try {
    handle.writeBytes(bytes);
  } finally {
    handle.close();
  }
}

type ZipImportResult = {
  state: AppState;
  /** Staged extracted media paths by photo/document id. */
  mediaFiles: Record<string, string>;
  packageKind: 'property-inventory' | 'property-update';
  propertyId?: string;
  sinceISO?: string;
  deletedIds?: SyncDeletedIds;
};

function coerceState(stateRaw: AppState): AppState {
  return coerceAppState(stateRaw);
}

function safeZipEntryName(name: string): string | null {
  const clean = name.replace(/^\/+/, '').replace(/\\/g, '/');
  if (!clean || clean.endsWith('/')) return null;
  if (clean.split('/').some((part) => part === '..')) return null;
  return clean;
}

/** Prefer a FileHandle-readable path. Copy to cache on disk if the picker URI cannot be opened. */
async function readableZipUri(zipUri: string): Promise<string> {
  try {
    const file = new File(zipUri);
    const handle = file.open();
    handle.close();
    return zipUri;
  } catch {
    const dest = `${Paths.cache.uri}backup-import-src-${Date.now()}.zip`;
    await FileSystem.copyAsync({ from: zipUri, to: dest });
    return dest;
  }
}

/**
 * Stream-unzip to disk. Do not load the whole archive (or all photos) into JS —
 * that jetsams Expo Go a few seconds after picking a large backup.
 */
async function extractZipToStaging(
  zipUri: string,
  onProgress?: (progress: TransferProgress) => void
): Promise<{ extractRoot: string; files: Record<string, string> }> {
  const extractRoot = `${Paths.cache.uri}backup-import-${Date.now()}`;
  await ensureEmptyDir(extractRoot);

  const sourceUri = await readableZipUri(zipUri);
  const handle = new File(sourceUri).open();
  const files: Record<string, string> = {};

  try {
    await new Promise<void>((resolve, reject) => {
      let failed = false;
      const fail = (err: unknown) => {
        if (failed) return;
        failed = true;
        reject(err instanceof Error ? err : new Error(String(err)));
      };

      const uz = new Unzip();
      uz.register(UnzipPassThrough);
      uz.register(UnzipInflate);
      uz.onfile = (file) => {
        const clean = safeZipEntryName(file.name);
        if (!clean) {
          file.ondata = (err) => {
            if (err) fail(err);
          };
          try {
            file.start();
          } catch (e) {
            fail(e);
          }
          return;
        }

        const dest = `${extractRoot}/${clean}`;
        let out: ReturnType<File['open']> | null = null;
        try {
          const outFile = new File(dest);
          if (outFile.exists) outFile.delete();
          outFile.create({ intermediates: true, overwrite: true });
          out = outFile.open();
        } catch (e) {
          fail(e);
          return;
        }

        file.ondata = (err, dat, final) => {
          if (err) {
            try {
              out?.close();
            } catch {
              // ignore
            }
            fail(err);
            return;
          }
          try {
            if (dat.length > 0) out!.writeBytes(dat);
            if (final) {
              out!.close();
              files[clean] = dest;
            }
          } catch (e) {
            try {
              out?.close();
            } catch {
              // ignore
            }
            fail(e);
          }
        };

        try {
          file.start();
        } catch (e) {
          try {
            out?.close();
          } catch {
            // ignore
          }
          fail(e);
        }
      };

      void (async () => {
        try {
          const total = handle.size ?? 0;
          let chunks = 0;
          onProgress?.({ phase: 'extracting', current: 0, total });
          for (;;) {
            if (failed) return;
            const bytes = handle.readBytes(ZIP_READ_CHUNK);
            if (!bytes || bytes.length === 0) {
              uz.push(new Uint8Array(0), true);
              break;
            }
            uz.push(bytes, false);
            chunks += 1;
            if (chunks % 4 === 0) {
              onProgress?.({
                phase: 'extracting',
                current: handle.offset ?? 0,
                total,
              });
              await yieldJs();
            }
          }
          onProgress?.({ phase: 'extracting', current: total || 1, total: total || 1 });
          if (!failed) resolve();
        } catch (e) {
          fail(e);
        }
      })();
    });
  } finally {
    try {
      handle.close();
    } catch {
      // ignore
    }
  }

  return { extractRoot, files };
}

export async function importBackupFromUri(
  uri: string,
  hints?: { fileName?: string; mimeType?: string; onProgress?: (progress: TransferProgress) => void }
): Promise<
  | {
      ok: true;
      kind: 'json';
      packageKind: 'property-inventory';
      state: AppState;
      photoData?: Record<string, string>;
    }
  | {
      ok: true;
      kind: 'json';
      packageKind: 'property-update';
      state: AppState;
      propertyId: string;
      sinceISO?: string;
      deletedIds: SyncDeletedIds;
    }
  | { ok: true; kind: 'zip'; result: ZipImportResult; extractRoot: string }
  | { ok: false; error: string }
> {
  try {
    const header = await readFileHeader(uri);
    const isZip = looksLikeZip({
      uri,
      fileName: hints?.fileName,
      mimeType: hints?.mimeType,
      header,
    });

    if (isZip) {
      const { extractRoot, files } = await extractZipToStaging(uri, hints?.onProgress);
      const statePath = files['state.json'];
      if (!statePath) {
        return { ok: false, error: 'ZIP backup is missing state.json.' };
      }
      const raw = await FileSystem.readAsStringAsync(statePath);
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { ok: false, error: 'Invalid state.json in ZIP backup.' };
      }
      if (!parsed || typeof parsed !== 'object') {
        return { ok: false, error: 'Unrecognized ZIP backup.' };
      }
      const obj = parsed as Record<string, unknown>;
      if (obj.kind !== 'property-inventory' && obj.kind !== 'property-update') {
        return { ok: false, error: 'Not a Property Asset Manager export.' };
      }
      if (obj.kind === 'property-update') {
        if (obj.formatVersion !== UPDATE_FORMAT_VERSION) {
          return { ok: false, error: 'Unsupported update package format version.' };
        }
        if (typeof obj.propertyId !== 'string' || !obj.propertyId) {
          return { ok: false, error: 'Update package is missing property id.' };
        }
      } else if (
        obj.formatVersion !== ZIP_TRANSFER_FORMAT_VERSION &&
        obj.formatVersion !== TRANSFER_FORMAT_VERSION
      ) {
        return { ok: false, error: 'Unsupported transfer format version.' };
      }
      if (!obj.state || typeof obj.state !== 'object') {
        return { ok: false, error: 'Transfer file is missing data.' };
      }
      const state = coerceState(obj.state as AppState);

      const mediaFiles: Record<string, string> = {};
      for (const [path, fileUri] of Object.entries(files)) {
        if (path.startsWith('photos/')) {
          mediaFiles[path.slice('photos/'.length)] = fileUri;
        } else if (path.startsWith('documents/')) {
          mediaFiles[path.slice('documents/'.length)] = fileUri;
        }
      }

      return {
        ok: true,
        kind: 'zip',
        extractRoot,
        result: {
          state,
          mediaFiles,
          packageKind: obj.kind,
          propertyId: typeof obj.propertyId === 'string' ? obj.propertyId : undefined,
          sinceISO: typeof obj.sinceISO === 'string' ? obj.sinceISO : undefined,
          deletedIds:
            obj.deletedIds && typeof obj.deletedIds === 'object'
              ? (obj.deletedIds as SyncDeletedIds)
              : undefined,
        },
      };
    }

    const raw = await FileSystem.readAsStringAsync(uri);
    const parsed = parseTransferBundle(raw);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }
    if (parsed.kind === 'property-update') {
      return {
        ok: true,
        kind: 'json',
        packageKind: 'property-update',
        state: parsed.bundle.state,
        propertyId: parsed.bundle.propertyId,
        sinceISO: parsed.bundle.sinceISO,
        deletedIds: parsed.bundle.deletedIds,
      };
    }
    return {
      ok: true,
      kind: 'json',
      packageKind: 'property-inventory',
      state: parsed.bundle.state,
      photoData: parsed.bundle.photoData,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not read backup file.',
    };
  }
}

/** Persist extracted ZIP media into app storage and rewrite localUris on state. */
export async function materializeZipMedia(
  state: AppState,
  mediaFiles: Record<string, string>,
  onProgress?: (progress: TransferProgress) => void
): Promise<AppState> {
  type PhotoKey = 'photos' | 'propertyPhotos' | 'roomPhotos' | 'projectPhotos' | 'vendorPhotos';
  const photoJobs: { key: PhotoKey; id: string; staged: string }[] = [];
  const addPhotos = (key: PhotoKey, list: { id: string }[]) => {
    for (const item of list) {
      const staged = mediaFiles[item.id];
      if (staged) photoJobs.push({ key, id: item.id, staged });
    }
  };
  addPhotos('photos', state.photos);
  addPhotos('propertyPhotos', state.propertyPhotos);
  addPhotos('roomPhotos', state.roomPhotos);
  addPhotos('projectPhotos', state.projectPhotos);
  addPhotos('vendorPhotos', state.vendorPhotos);

  const docJobs = state.documents
    .map((document) => {
      const staged = mediaFiles[document.id];
      return staged
        ? { id: document.id, staged, fileName: document.fileName }
        : null;
    })
    .filter((job): job is { id: string; staged: string; fileName: string } => job != null);

  const total = photoJobs.length + docJobs.length;
  let done = 0;
  const bump = () => {
    done += 1;
    onProgress?.({ phase: 'copying', current: done, total });
  };
  onProgress?.({ phase: 'copying', current: 0, total });

  await ensurePhotosDirectory();
  const photoUris = new Map<string, string>();
  await mapPool(photoJobs, COPY_CONCURRENCY, async (job) => {
    const localUri = await persistPhotoFromUri(job.staged, job.id);
    photoUris.set(job.id, localUri);
    bump();
  });

  await ensureDocumentsDirectory();
  const docUris = new Map<string, string>();
  await mapPool(docJobs, COPY_CONCURRENCY, async (job) => {
    const localUri = await persistDocumentFromUri(job.staged, job.id, job.fileName);
    docUris.set(job.id, localUri);
    bump();
  });

  const patch = <T extends { id: string; localUri: string }>(list: T[]): T[] =>
    list.map((item) => {
      const localUri = photoUris.get(item.id);
      return localUri ? { ...item, localUri } : item;
    });

  const next: AppState = {
    ...state,
    photos: patch(state.photos),
    propertyPhotos: patch(state.propertyPhotos),
    roomPhotos: patch(state.roomPhotos),
    projectPhotos: patch(state.projectPhotos),
    vendorPhotos: patch(state.vendorPhotos),
    documents: state.documents.map((document) => {
      const localUri = docUris.get(document.id);
      return localUri ? { ...document, localUri } : document;
    }),
  };
  return next.version === 1 ? next : { ...EMPTY_APP_STATE };
}

export async function cleanupExtractRoot(extractRoot: string | undefined): Promise<void> {
  if (!extractRoot) return;
  try {
    await FileSystem.deleteAsync(extractRoot, { idempotent: true });
  } catch {
    // ignore
  }
}

/** Detect zip from URI / content for callers that only need a hint. */
export function isZipBackupUri(uri: string, fileName?: string): boolean {
  return looksLikeZip({ uri, fileName });
}
