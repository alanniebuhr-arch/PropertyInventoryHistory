import { Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

function isShareCancellation(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error ?? '');
  return /cancel|dismiss|sharing.*abort/i.test(message);
}

/** Render HTML to a PDF temp file and open the system share sheet. */
export async function shareHtmlAsPdf(html: string, dialogTitle: string): Promise<boolean> {
  try {
    const { uri } = await Print.printToFileAsync({ html });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
      return false;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle,
    });
    return true;
  } catch (error) {
    if (isShareCancellation(error)) {
      return false;
    }
    const detail =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : 'Something went wrong while creating the PDF.';
    Alert.alert('Export failed', detail);
    return false;
  }
}
