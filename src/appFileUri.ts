import * as FileSystem from 'expo-file-system/legacy';

/**
 * iOS (and some Android installs) rotate the app container UUID across updates.
 * Absolute file:// URIs baked into AsyncStorage then point at a dead path even
 * though the files still exist under the new Documents directory.
 *
 * Persist relative paths under Documents (`photos/…`, `documents/…`) and resolve
 * against the current `documentDirectory` at runtime.
 */

function documentRoot(): string {
  return FileSystem.documentDirectory ?? '';
}

const APP_MEDIA_PATH_RE = /\/((?:photos|documents)\/[^/?#]+)$/;

/** Convert an absolute or relative media URI into a Documents-relative path when possible. */
export function toStoredAppFileUri(uri: string): string {
  if (!uri) return uri;
  const root = documentRoot();
  if (root && uri.startsWith(root)) {
    return uri.slice(root.length);
  }
  if (uri.startsWith('photos/') || uri.startsWith('documents/')) {
    return uri;
  }
  const match = APP_MEDIA_PATH_RE.exec(uri);
  if (match) return match[1];
  return uri;
}

/** Resolve a stored media URI to an absolute file:// path for the current install. */
export function resolveAppFileUri(uri: string): string {
  if (!uri) return uri;
  const root = documentRoot();
  if (!root) return uri;
  if (uri.startsWith(root)) return uri;
  if (uri.startsWith('photos/') || uri.startsWith('documents/')) {
    return `${root}${uri}`;
  }
  const match = APP_MEDIA_PATH_RE.exec(uri);
  if (match) return `${root}${match[1]}`;
  return uri;
}
