import { Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { resolveAppFileUri } from './appFileUri';

/** Request add-only access when possible, then save the local image file to the camera roll. */
export async function savePhotoToCameraRoll(localUri: string): Promise<void> {
  const uri = resolveAppFileUri(localUri?.trim() ?? '');
  if (!uri) {
    Alert.alert('Save failed', 'This photo has no file to save.');
    return;
  }

  try {
    const current = await MediaLibrary.getPermissionsAsync(true);
    let status = current.status;
    if (status !== 'granted') {
      const requested = await MediaLibrary.requestPermissionsAsync(true);
      status = requested.status;
    }
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Allow photo library access so this photo can be saved to your camera roll.'
      );
      return;
    }

    await MediaLibrary.saveToLibraryAsync(uri);
    Alert.alert('Saved', 'Photo saved to your camera roll.');
  } catch (e) {
    Alert.alert('Save failed', e instanceof Error ? e.message : 'Could not save this photo.');
  }
}
