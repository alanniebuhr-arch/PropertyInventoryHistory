import { Alert } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import type { View } from 'react-native';

function isShareCancellation(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error ?? '');
  return /cancel|dismiss|sharing.*abort/i.test(message);
}

export async function shareViewAsPng(
  viewRef: RefObject<View | null>,
  dialogTitle: string
): Promise<boolean> {
  if (!viewRef.current) {
    Alert.alert('Export failed', 'Could not prepare the export image.');
    return false;
  }

  try {
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
      return false;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
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
        : 'Something went wrong while creating the image.';
    Alert.alert('Export failed', detail);
    return false;
  }
}
