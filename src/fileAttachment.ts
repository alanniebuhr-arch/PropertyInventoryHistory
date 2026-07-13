import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export type PickedFileAttachment =
  | { kind: 'image'; uri: string }
  | { kind: 'document'; uri: string; fileName: string; mimeType: string };

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'gif'];

const DOCUMENT_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'rtf',
  'csv',
  'pages',
  'numbers',
  'key',
];

function extensionOf(fileName: string): string {
  const match = /\.([^.]+)$/.exec(fileName.trim().toLowerCase());
  return match ? match[1] : '';
}

export function classifyPickedFile(input: {
  mimeType?: string;
  fileName: string;
}): 'image' | 'document' | 'unsupported' {
  const mimeType = (input.mimeType ?? '').toLowerCase();
  const ext = extensionOf(input.fileName);

  if (mimeType.startsWith('image/') || IMAGE_EXTENSIONS.includes(ext)) {
    return 'image';
  }

  if (
    mimeType === 'application/pdf' ||
    mimeType.startsWith('application/vnd.') ||
    mimeType.startsWith('application/msword') ||
    mimeType === 'text/plain' ||
    mimeType === 'text/csv' ||
    mimeType === 'application/rtf' ||
    mimeType === 'text/rtf' ||
    DOCUMENT_EXTENSIONS.includes(ext)
  ) {
    return 'document';
  }

  return 'unsupported';
}

export async function pickFileAttachment(): Promise<PickedFileAttachment | undefined> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets[0]?.uri) return undefined;

  const asset = result.assets[0];
  const fileName = asset.name?.trim() || 'File';
  const kind = classifyPickedFile({ mimeType: asset.mimeType, fileName });

  if (kind === 'image') {
    return { kind: 'image', uri: asset.uri };
  }
  if (kind === 'document') {
    return {
      kind: 'document',
      uri: asset.uri,
      fileName,
      mimeType: asset.mimeType ?? 'application/octet-stream',
    };
  }

  Alert.alert(
    'Unsupported file',
    'Choose an image or a document such as PDF, Word, Excel, or text.'
  );
  return undefined;
}
