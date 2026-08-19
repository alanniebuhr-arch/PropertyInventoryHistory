import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { pickImagesFromLibrary } from './pickImages';
import { pickFileAttachment } from './fileAttachment';
import {
  isReuseExistingPhotosAvailable,
  requestReuseExistingPhotos,
  stashReusePhotoMeta,
  type ReuseExistingPhotoPick,
} from './reuseExistingPhotos';

export const ADD_PHOTO_TILE_LABEL = 'Add';

export type PickedDocument = {
  uri: string;
  fileName: string;
  mimeType: string;
};

function reuseExistingAlertButton(
  multi: boolean,
  onPicks: (picks: ReuseExistingPhotoPick[]) => void | Promise<void>,
  onBusyChange?: (busy: boolean) => void
) {
  return {
    text: 'Reuse existing',
    onPress: () => {
      onBusyChange?.(true);
      void requestReuseExistingPhotos({ multi })
        .then((picks) => {
          if (picks && picks.length > 0) {
            stashReusePhotoMeta(picks);
            void onPicks(picks);
            return;
          }
          onBusyChange?.(false);
        })
        .catch(() => {
          onBusyChange?.(false);
        });
    },
  };
}

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

export function runLoadFileForPhoto(
  onPhoto: (uri: string) => void | Promise<void>,
  onDocument?: (picked: PickedDocument) => void | Promise<void>
) {
  void pickFileAttachment()
    .then((picked) => {
      if (!picked) return;
      if (picked.kind === 'image') {
        void onPhoto(picked.uri);
        return;
      }
      if (onDocument) {
        void onDocument({
          uri: picked.uri,
          fileName: picked.fileName,
          mimeType: picked.mimeType,
        });
        return;
      }
      Alert.alert(
        'Not a photo',
        'Choose an image file to add as a photo. Use a named slot and Load file to attach a document.'
      );
    })
    .catch(() => {
      Alert.alert('Could not load file', 'Try again from this screen.');
    });
}

export function promptPickOrTakeSingle(onPhoto: (uri: string) => void | Promise<void>) {
  const buttons: {
    text: string;
    style?: 'cancel';
    onPress?: () => void;
  }[] = [
    { text: 'Done', style: 'cancel' },
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
  ];
  if (isReuseExistingPhotosAvailable()) {
    buttons.push(
      reuseExistingAlertButton(false, (picks) => {
        const uri = picks[0]?.uri;
        if (uri) void onPhoto(uri);
      })
    );
  }
  Alert.alert('Add photo', undefined, buttons);
}

export function promptSlotAttachment(handlers: {
  onPhoto: (uri: string) => void | Promise<void>;
  onDocument: (picked: PickedDocument) => void | Promise<void>;
}) {
  const buttons: {
    text: string;
    style?: 'cancel';
    onPress?: () => void;
  }[] = [
    { text: 'Done', style: 'cancel' },
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
  ];
  if (isReuseExistingPhotosAvailable()) {
    buttons.push(
      reuseExistingAlertButton(false, (picks) => {
        const uri = picks[0]?.uri;
        if (uri) void handlers.onPhoto(uri);
      })
    );
  }
  Alert.alert('Add attachment', undefined, buttons);
}

export function promptPickOrTakeMulti(
  onPhotos: (uris: string[]) => void | Promise<void>,
  onDocument?: (picked: PickedDocument) => void | Promise<void>,
  options?: {
    onBusyChange?: (busy: boolean) => void;
    /** When set, reuse goes here (so callers can skip label prompts when meta copied). */
    onReuseExisting?: (picks: ReuseExistingPhotoPick[]) => void | Promise<void>;
  }
) {
  const onBusyChange = options?.onBusyChange;
  const onReuseExisting = options?.onReuseExisting;
  const buttons: {
    text: string;
    style?: 'cancel';
    onPress?: () => void;
  }[] = [
    { text: 'Done', style: 'cancel' },
    {
      text: 'Choose photos',
      onPress: () => {
        // Show spinner before the library finishes returning many assets (can take a long time).
        onBusyChange?.(true);
        void pickImagesFromLibrary()
          .then((uris) => {
            if (uris.length > 0) {
              void onPhotos(uris);
              return;
            }
            onBusyChange?.(false);
          })
          .catch(() => {
            onBusyChange?.(false);
          });
      },
    },
    {
      text: 'Take photo',
      onPress: () => {
        onBusyChange?.(true);
        void takePhotoFromCamera()
          .then((uri) => {
            if (uri) {
              void onPhotos([uri]);
              return;
            }
            onBusyChange?.(false);
          })
          .catch(() => {
            onBusyChange?.(false);
          });
      },
    },
    {
      text: 'Load file',
      onPress: () => {
        void pickFileAttachment()
          .then((picked) => {
            if (!picked) return;
            if (picked.kind === 'image') {
              onBusyChange?.(true);
              void onPhotos([picked.uri]);
              return;
            }
            if (onDocument) {
              void onDocument({
                uri: picked.uri,
                fileName: picked.fileName,
                mimeType: picked.mimeType,
              });
              return;
            }
            Alert.alert(
              'Not a photo',
              'Choose an image file to add as a photo. Use a named slot and Load file to attach a document.'
            );
          })
          .catch(() => {
            onBusyChange?.(false);
          });
      },
    },
  ];
  if (isReuseExistingPhotosAvailable()) {
    buttons.push(
      reuseExistingAlertButton(
        true,
        (picks) => {
          if (onReuseExisting) {
            void onReuseExisting(picks);
            return;
          }
          void onPhotos(picks.map((pick) => pick.uri));
        },
        onBusyChange
      )
    );
  }
  Alert.alert('Add photo', undefined, buttons);
}
