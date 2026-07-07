import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { pickImagesFromLibrary } from './pickImages';

export const ADD_PHOTO_TILE_LABEL = 'Add photo';

export type PickedDocument = {
  uri: string;
  fileName: string;
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

export async function pickPdfDocument(): Promise<PickedDocument | undefined> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets[0]?.uri) return undefined;
  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? 'application/pdf';
  if (mimeType !== 'application/pdf') {
    Alert.alert('Not a PDF', 'Please choose a PDF file.');
    return undefined;
  }
  return {
    uri: asset.uri,
    fileName: asset.name?.trim() || 'Document.pdf',
  };
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
      text: 'Load PDF',
      onPress: () => {
        void pickPdfDocument().then((picked) => {
          if (picked) void handlers.onDocument(picked);
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
