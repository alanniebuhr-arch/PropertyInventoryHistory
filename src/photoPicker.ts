import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { pickImagesFromLibrary } from './pickImages';

export const ADD_PHOTO_TILE_LABEL = 'Add photo';

export async function takePhotoFromCamera(): Promise<string | undefined> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow camera access to take pictures.');
    return undefined;
  }
  const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
  if (result.canceled || !result.assets[0]?.uri) return undefined;
  return result.assets[0].uri;
}

export async function pickSinglePhotoFromLibrary(): Promise<string | undefined> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow photo library access to attach pictures.');
    return undefined;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
  });
  if (result.canceled || !result.assets[0]?.uri) return undefined;
  return result.assets[0].uri;
}

export function promptPickOrTakeSingle(onPhoto: (uri: string) => void | Promise<void>) {
  Alert.alert('Add photo', undefined, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Choose photo',
      onPress: () => {
        void pickSinglePhotoFromLibrary().then((uri) => {
          if (uri) void onPhoto(uri);
        });
      },
    },
    {
      text: 'Take photo',
      onPress: () => {
        void takePhotoFromCamera().then((uri) => {
          if (uri) void onPhoto(uri);
        });
      },
    },
  ]);
}

export function promptPickOrTakeMulti(onPhotos: (uris: string[]) => void | Promise<void>) {
  Alert.alert('Add photo', undefined, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Choose photos',
      onPress: () => {
        void pickImagesFromLibrary().then((uris) => {
          if (uris.length > 0) void onPhotos(uris);
        });
      },
    },
    {
      text: 'Take photo',
      onPress: () => {
        void takePhotoFromCamera().then((uri) => {
          if (uri) void onPhotos([uri]);
        });
      },
    },
  ]);
}
