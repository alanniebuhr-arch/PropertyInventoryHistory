import * as FileSystem from 'expo-file-system/legacy';
import { File, Paths } from 'expo-file-system';
import { strToU8, unzip, Zip, ZipPassThrough } from 'fflate';
import type { AppState } from './types';
import { EMPTY_APP_STATE } from './types';
import { persistPhotoFromUri } from './photoStorage';
import { persistDocumentFromUri } from './documentStorage';
import { TRANSFER_FORMAT_VERSION, parseTransferBundle } from './transfer';

export const ZIP_TRANSFER_FORMAT_VERSION = 2 as const;

type StagedMedia = {
  zipPath: string;
  sourceUri: string;
};

function utf8ToBytes(text: string): Uint8Array {
  return strToU8(text);
}

async function ensureEmptyDir(uri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
  await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
}

async function copyIfExists(from: string, to: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(from);
    if (!info.exists) return false;
    await FileSystem.copyAsync({ from, to });
    return true;
  } catch {
    return false;
  }
}

function collectMediaToStage(state: AppState): StagedMedia[] {
  const staged: StagedMedia[] = [];
  for (const photo of state.photos) {
    staged.push({
      zipPath: `photos/${photo.id}`,
      sourceUri: photo.localUri,
    });
  }
  for (const photo of state.propertyPhotos) {
    staged.push({
      zipPath: `photos/${photo.id}`,
      sourceUri: photo.localUri,
    });
  }
  for (const photo of state.roomPhotos) {
    staged.push({
      zipPath: `photos/${photo.id}`,
      sourceUri: photo.localUri,
    });
  }
  for (const document of state.documents) {
    staged.push({
      zipPath: `documents/${document.id}`,
      sourceUri: document.localUri,
    });
  }
  return staged;
}

async function readFileBytes(uri: string): Promise<Uint8Array> {
  const file = new File(uri);
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

/** Stream a ZIP of state.json + binary media copies. Returns the zip file:// URI. */
export async function exportBackupToZip(
  state: AppState,
  options?: { fileNamePrefix?: string; sourceLabel?: string }
): Promise<string> {
  const stamp = new Date().toISOString().slice(0, 10);
  const stageRoot = `${Paths.cache.uri}backup-stage-${Date.now()}`;
  const prefix = (options?.fileNamePrefix ?? 'property-inventory')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'property-inventory';
  const zipName = `${prefix}-${stamp}.zip`;
  const zipFile = new File(Paths.cache, zipName);

  await ensureEmptyDir(stageRoot);
  await FileSystem.makeDirectoryAsync(`${stageRoot}/photos`, { intermediates: true });
  await FileSystem.makeDirectoryAsync(`${stageRoot}/documents`, { intermediates: true });

  const manifest = {
    formatVersion: ZIP_TRANSFER_FORMAT_VERSION,
    kind: 'property-inventory' as const,
    exportedAtISO: new Date().toISOString(),
    sourceLabel: options?.sourceLabel ?? 'Property Asset Manager',
    state,
  };
  await FileSystem.writeAsStringAsync(`${stageRoot}/state.json`, JSON.stringify(manifest));

  const staged: StagedMedia[] = [];
  for (const item of collectMediaToStage(state)) {
    const dest = `${stageRoot}/${item.zipPath}`;
    if (await copyIfExists(item.sourceUri, dest)) {
      staged.push({ zipPath: item.zipPath, sourceUri: dest });
    }
  }

  if (zipFile.exists) {
    zipFile.delete();
  }
  zipFile.create({ intermediates: true, overwrite: true });
  const handle = zipFile.open();

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
        stateEntry.push(utf8ToBytes(JSON.stringify(manifest)), true);

        for (const item of staged) {
          const bytes = await readFileBytes(item.sourceUri);
          const entry = new ZipPassThrough(item.zipPath);
          zip.add(entry);
          entry.push(bytes, true);
        }
        zip.end();
      } catch (e) {
        fail(e);
      }
    })();
  });

  try {
    await FileSystem.deleteAsync(stageRoot, { idempotent: true });
  } catch {
    // ignore cleanup failures
  }

  return zipFile.uri;
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
};

async function extractZipToStaging(zipUri: string): Promise<{ extractRoot: string; files: Record<string, string> }> {
  const extractRoot = `${Paths.cache.uri}backup-import-${Date.now()}`;
  await ensureEmptyDir(extractRoot);

  const zipBytes = new Uint8Array(await new File(zipUri).arrayBuffer());
  const unzipped = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(zipBytes, (err, data) => {
      if (err) reject(err);
      else resolve(data as Record<string, Uint8Array>);
    });
  });

  const files: Record<string, string> = {};
  for (const [name, content] of Object.entries(unzipped)) {
    const clean = name.replace(/^\/+/, '');
    if (!clean || clean.endsWith('/')) continue;
    const dest = `${extractRoot}/${clean}`;
    await writeBytesToUri(dest, content);
    files[clean] = dest;
  }

  return { extractRoot, files };
}

export async function importBackupFromUri(
  uri: string,
  hints?: { fileName?: string; mimeType?: string }
): Promise<
  | { ok: true; kind: 'json'; state: AppState; photoData?: Record<string, string> }
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
      const { extractRoot, files } = await extractZipToStaging(uri);
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
      if (obj.kind !== 'property-inventory') {
        return { ok: false, error: 'Not a Property Asset Manager export.' };
      }
      if (obj.formatVersion !== ZIP_TRANSFER_FORMAT_VERSION && obj.formatVersion !== TRANSFER_FORMAT_VERSION) {
        return { ok: false, error: 'Unsupported transfer format version.' };
      }
      if (!obj.state || typeof obj.state !== 'object') {
        return { ok: false, error: 'Transfer file is missing data.' };
      }
      const stateRaw = obj.state as AppState;
      const state: AppState = {
        version: 1,
        properties: Array.isArray(stateRaw.properties) ? stateRaw.properties : [],
        rooms: Array.isArray(stateRaw.rooms) ? stateRaw.rooms : [],
        items: Array.isArray(stateRaw.items) ? stateRaw.items : [],
        photos: Array.isArray(stateRaw.photos) ? stateRaw.photos : [],
        propertyPhotos: Array.isArray(stateRaw.propertyPhotos) ? stateRaw.propertyPhotos : [],
        roomPhotos: Array.isArray(stateRaw.roomPhotos) ? stateRaw.roomPhotos : [],
        documents: Array.isArray(stateRaw.documents) ? stateRaw.documents : [],
        events: Array.isArray(stateRaw.events) ? stateRaw.events : [],
      };

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
        result: { state, mediaFiles },
      };
    }

    const raw = await FileSystem.readAsStringAsync(uri);
    const parsed = parseTransferBundle(raw);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }
    return {
      ok: true,
      kind: 'json',
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
  mediaFiles: Record<string, string>
): Promise<AppState> {
  let next: AppState = { ...state };

  const patchPhotoUri = async <T extends { id: string; localUri: string }>(
    list: T[]
  ): Promise<T[]> => {
    const out: T[] = [];
    for (const item of list) {
      const staged = mediaFiles[item.id];
      if (!staged) {
        out.push(item);
        continue;
      }
      const localUri = await persistPhotoFromUri(staged, item.id);
      out.push({ ...item, localUri });
    }
    return out;
  };

  next = {
    ...next,
    photos: await patchPhotoUri(next.photos),
    propertyPhotos: await patchPhotoUri(next.propertyPhotos),
    roomPhotos: await patchPhotoUri(next.roomPhotos),
  };

  const docs = [];
  for (const document of next.documents) {
    const staged = mediaFiles[document.id];
    if (!staged) {
      docs.push(document);
      continue;
    }
    const localUri = await persistDocumentFromUri(staged, document.id, document.fileName);
    docs.push({ ...document, localUri });
  }
  next = { ...next, documents: docs };
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
