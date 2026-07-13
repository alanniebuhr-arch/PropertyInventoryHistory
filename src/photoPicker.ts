import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { pickImagesFromLibrary } from './pickImages';
import { pickFileAttachment } from './fileAttachment';

export const ADD_PHOTO_TILE_LABEL = 'Add photo';

export type PickedDocument = {
  uri: string;
  fileName: string;
  mimeType: string;
};

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

function runLoadFileForPhoto(onPhoto: (uri: string) => void | Promise<void>) {
  void pickFileAttachment().then((picked) => {
    if (!picked) return;
    if (picked.kind === 'image') {
      void onPhoto(picked.uri);
      return;
    }
    Alert.alert(
      'Not a photo',
      'Choose an image file to add as a photo. Use a named slot and Load file to attach a document.'
    );
  });
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
    {
      text: 'Load file',
      onPress: () => runLoadFileForPhoto(onPhoto),
    },
  ]);
}

export function promptSlotAttachment(handlers: {
  onPhoto: (uri: string) => void | Promise<void>;
  onDocument: (picked: PickedDocument) => void | Promise<void>;
}) {
  Alert.alert('Add attachment', undefined, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Choose photo',
      onPress: () => {
        void pickSinglePhotoFromLibrary().then((uri) => {
          if (uri) void handlers.onPhoto(uri);
        });
      },
    },
    {
      text: 'Take photo',
      onPress: () => {
        void takePhotoFromCamera().then((uri) => {
          if (uri) void handlers.onPhoto(uri);
        });
      },
    },
    {
      text: 'Load file',
      onPress: () => {
        void pickFileAttachment().then((picked) => {
          if (!picked) return;
          if (picked.kind === 'image') {
            void handlers.onPhoto(picked.uri);
          } else {
            void handlers.onDocument({
              uri: picked.uri,
              fileName: picked.fileName,
              mimeType: picked.mimeType,
            });
          }
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
    {
      text: 'Load file',
      onPress: () => runLoadFileForPhoto((uri) => onPhotos([uri])),
    },
  ]);
}
