import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export async function pickImagesFromLibrary(): Promise<string[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow photo library access to attach pictures.');
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    allowsMultipleSelection: true,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => a.uri).filter(Boolean);
}
