import * as FileSystem from 'expo-file-system/legacy';

const DOCUMENTS_DIR = `${FileSystem.documentDirectory ?? ''}documents`;

export async function ensureDocumentsDirectory(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DOCUMENTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOCUMENTS_DIR, { intermediates: true });
  }
}

function extensionFromFileName(fileName?: string): string {
  const match = fileName ? /\.([^.]+)$/.exec(fileName.trim().toLowerCase()) : null;
  return match ? match[1] : 'pdf';
}

export function documentFilePath(documentId: string, fileName?: string): string {
  return `${DOCUMENTS_DIR}/${documentId}.${extensionFromFileName(fileName)}`;
}

export async function persistDocumentFromUri(
  sourceUri: string,
  documentId: string,
  fileName?: string
): Promise<string> {
  await ensureDocumentsDirectory();
  const dest = documentFilePath(documentId, fileName);
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function deleteDocumentFile(localUri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists) {
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    }
  } catch {
    // ignore missing files
  }
}

export async function readDocumentAsBase64(localUri: string): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    return null;
  }
}

export async function writeDocumentFromBase64(
  documentId: string,
  base64: string,
  fileName?: string
): Promise<string> {
  await ensureDocumentsDirectory();
  const dest = documentFilePath(documentId, fileName);
  await FileSystem.writeAsStringAsync(dest, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return dest;
}
