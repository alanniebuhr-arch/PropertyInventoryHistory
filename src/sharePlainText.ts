import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/** Copy plain text to the clipboard and confirm to the user. */
export async function copyPlainTextToClipboard(message: string): Promise<boolean> {
  const trimmed = message.trim();
  if (!trimmed) {
    Alert.alert('Copy failed', 'Nothing to copy.');
    return false;
  }

  try {
    await Clipboard.setStringAsync(trimmed);
    // Defer so confirmation isn't swallowed by a closing share-format modal.
    setTimeout(() => {
      Alert.alert('Copied', 'Copied to clipboard.');
    }, 100);
    return true;
  } catch (error) {
    const detail =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : 'Something went wrong while copying.';
    Alert.alert('Copy failed', detail);
    return false;
  }
}
