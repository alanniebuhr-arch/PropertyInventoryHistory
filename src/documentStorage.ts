import * as FileSystem from 'expo-file-system/legacy';

const DOCUMENTS_DIR = `${FileSystem.documentDirectory ?? ''}documents`;

export async function ensureDocumentsDirectory(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DOCUMENTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOCUMENTS_DIR, { intermediates: true });
  }
}

export function documentFilePath(documentId: string): string {
  return `${DOCUMENTS_DIR}/${documentId}.pdf`;
}

export async function persistDocumentFromUri(
  sourceUri: string,
  documentId: string
): Promise<string> {
  await ensureDocumentsDirectory();
  const dest = documentFilePath(documentId);
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

export async function writeDocumentFromBase64(documentId: string, base64: string): Promise<string> {
  await ensureDocumentsDirectory();
  const dest = documentFilePath(documentId);
  await FileSystem.writeAsStringAsync(dest, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return dest;
}
