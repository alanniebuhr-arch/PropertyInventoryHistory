import { Alert } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import type { View } from 'react-native';

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
  } catch {
    Alert.alert('Export failed', 'Something went wrong while creating the image.');
    return false;
  }
}
