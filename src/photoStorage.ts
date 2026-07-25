import * as FileSystem from 'expo-file-system/legacy';
import { resolveAppFileUri } from './appFileUri';

const PHOTOS_DIR = `${FileSystem.documentDirectory ?? ''}photos`;

export async function ensurePhotosDirectory(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
}

export function photoRelativePath(photoId: string): string {
  return `photos/${photoId}.jpg`;
}

export function photoFilePath(photoId: string): string {
  return resolveAppFileUri(photoRelativePath(photoId));
}

export async function persistPhotoFromUri(sourceUri: string, photoId: string): Promise<string> {
  await ensurePhotosDirectory();
  const dest = photoFilePath(photoId);
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  // Absolute for immediate UI use; saveAppState persists a Documents-relative path.
  return dest;
}

export async function deletePhotoFile(localUri: string): Promise<void> {
  try {
    const resolved = resolveAppFileUri(localUri);
    const info = await FileSystem.getInfoAsync(resolved);
    if (info.exists) {
      await FileSystem.deleteAsync(resolved, { idempotent: true });
    }
  } catch {
    // ignore missing files
  }
}

export async function readPhotoAsBase64(localUri: string): Promise<string | null> {
  try {
    const resolved = resolveAppFileUri(localUri);
    const info = await FileSystem.getInfoAsync(resolved);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(resolved, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    return null;
  }
}

export async function writePhotoFromBase64(photoId: string, base64: string): Promise<string> {
  await ensurePhotosDirectory();
  const dest = photoFilePath(photoId);
  await FileSystem.writeAsStringAsync(dest, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return dest;
}
