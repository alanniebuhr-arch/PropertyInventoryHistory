import { Alert, InteractionManager } from 'react-native';
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

function waitForInteractions(extraDelayMs = 0): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      if (extraDelayMs > 0) setTimeout(resolve, extraDelayMs);
      else resolve();
    });
  });
}

export type ShareHtmlAsPdfOptions = {
  /**
   * Called after the PDF file is written and before the system share sheet opens.
   * Use this to dismiss in-app spinners — `shareAsync` can hang after the sheet
   * is dismissed on some OS versions, which would otherwise leave the spinner up.
   */
  onReadyToShare?: () => void;
};

/** Render HTML to a PDF temp file and open the system share sheet. */
export async function shareHtmlAsPdf(
  html: string,
  dialogTitle: string,
  options?: ShareHtmlAsPdfOptions
): Promise<boolean> {
  try {
    // Let any RN Modal finish dismissing before native print/share presentation.
    await waitForInteractions(50);

    const { uri } = await Print.printToFileAsync({ html });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
      return false;
    }

    options?.onReadyToShare?.();

    await waitForInteractions(50);

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
