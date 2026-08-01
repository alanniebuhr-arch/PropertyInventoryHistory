import { Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import { resolveAppFileUri } from './appFileUri';

/** Open the system share sheet for a local photo file. */
export async function sharePhoto(localUri: string, dialogTitle = 'Share photo'): Promise<void> {
  const uri = resolveAppFileUri(localUri?.trim() ?? '');
  if (!uri) {
    Alert.alert('Share failed', 'This photo has no file to share.');
    return;
  }

  try {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Unavailable', 'Sharing is not available on this device.');
      return;
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'image/jpeg',
      dialogTitle,
    });
  } catch (e) {
    Alert.alert('Share failed', e instanceof Error ? e.message : 'Could not share this photo.');
  }
}
