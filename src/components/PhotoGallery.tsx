import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ZoomablePhotoImage } from './ZoomablePhotoImage';
import { sharedStyles, colors } from '../theme';
import type { ItemPhoto } from '../types';
import { pickImagesFromLibrary } from '../pickImages';

type GalleryPhoto = Pick<ItemPhoto, 'id' | 'localUri'>;

export function PhotoGallery(props: {
  photos: GalleryPhoto[];
  onAddPhoto: (uri: string) => void;
  onAddPhotos?: (uris: string[]) => void | Promise<void>;
  onDeletePhoto: (photoId: string) => void;
  title?: string;
  emptyHint?: string;
  addHint?: string;
}) {
  const {
    photos,
    onAddPhoto,
    onAddPhotos,
    onDeletePhoto,
    title = 'Photos',
    emptyHint = 'No photos yet.',
    addHint = 'Tap a photo to view full screen. Pinch to zoom. Swipe for previous/next.',
  } = props;

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const viewerPhoto = viewerIndex != null ? photos[viewerIndex] : null;

  async function pickPhotos() {
    const uris = await pickImagesFromLibrary();
    if (uris.length === 0) return;
    if (onAddPhotos) {
      await onAddPhotos(uris);
    } else {
      for (const uri of uris) {
        onAddPhoto(uri);
      }
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take pictures.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled && result.assets[0]?.uri) {
      onAddPhoto(result.assets[0].uri);
    }
  }

  function promptAddPhoto() {
    Alert.alert('Add photo', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose photos', onPress: () => void pickPhotos() },
      { text: 'Take photo', onPress: () => void takePhoto() },
    ]);
  }

  function confirmDelete(photoId: string) {
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (viewerIndex != null && photos[viewerIndex]?.id === photoId) {
            setViewerIndex(null);
          }
          onDeletePhoto(photoId);
        },
      },
    ]);
  }

  function openViewer(index: number) {
    setViewerIndex(index);
  }

  function closeViewer() {
    setViewerIndex(null);
  }

  const showPrev = useCallback(() => {
    if (photos.length <= 1) return;
    setViewerIndex((idx) =>
      idx == null ? idx : (idx - 1 + photos.length) % photos.length
    );
  }, [photos.length]);

  const showNext = useCallback(() => {
    if (photos.length <= 1) return;
    setViewerIndex((idx) => (idx == null ? idx : (idx + 1) % photos.length));
  }, [photos.length]);

  const imageMaxH = height - insets.top - insets.bottom - 120;

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 8,
          marginBottom: 8,
          gap: 8,
        }}
      >
        <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0, flex: 1 }]}>
          {title}
        </Text>
        <Pressable
          onPress={promptAddPhoto}
          style={[sharedStyles.secondaryBtn, { marginTop: 0, paddingVertical: 8, paddingHorizontal: 12 }]}
        >
          <Text style={[sharedStyles.secondaryBtnText, { fontSize: 14 }]}>Add photo</Text>
        </Pressable>
      </View>
      {photos.length === 0 ? (
        <Text style={[sharedStyles.cardMeta, { marginBottom: 8 }]}>{emptyHint}</Text>
      ) : (
        <ScrollView
          horizontal
          nestedScrollEnabled
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 8 }}
          contentContainerStyle={{ paddingVertical: 4 }}
        >
          {photos.map((p, index) => (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.85}
              onPress={() => openViewer(index)}
              onLongPress={() => confirmDelete(p.id)}
              style={{ marginRight: 10 }}
              accessibilityRole="button"
              accessibilityLabel="View photo full screen"
            >
              <Image
                source={{ uri: p.localUri }}
                style={{ width: 100, height: 100, borderRadius: 8, backgroundColor: colors.border }}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {photos.length > 0 ? (
        <Text style={[sharedStyles.cardMeta, { marginTop: 6 }]}>{addHint}</Text>
      ) : null}

      <Modal
        visible={viewerPhoto != null}
        transparent
        animationType="fade"
        onRequestClose={closeViewer}
        presentationStyle="overFullScreen"
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: '#000',
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Pressable onPress={closeViewer} hitSlop={12}>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Close</Text>
              </Pressable>
              {photos.length > 1 && viewerIndex != null ? (
                <Text style={{ color: '#ccc', fontSize: 15 }}>
                  {viewerIndex + 1} / {photos.length}
                </Text>
              ) : (
                <View style={{ width: 48 }} />
              )}
              {viewerPhoto ? (
                <Pressable onPress={() => confirmDelete(viewerPhoto.id)} hitSlop={12}>
                  <Text style={{ color: '#ff8a80', fontSize: 17, fontWeight: '600' }}>Delete</Text>
                </Pressable>
              ) : (
                <View style={{ width: 48 }} />
              )}
            </View>

            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              {viewerPhoto ? (
                <ZoomablePhotoImage
                  key={viewerPhoto.id}
                  uri={viewerPhoto.localUri}
                  width={width}
                  height={imageMaxH}
                  onSwipeLeft={photos.length > 1 ? showPrev : undefined}
                  onSwipeRight={photos.length > 1 ? showNext : undefined}
                />
              ) : null}
            </View>

            {photos.length > 1 ? (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingHorizontal: 24,
                  paddingBottom: 16,
                }}
              >
                <Pressable onPress={showPrev} hitSlop={8}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Previous</Text>
                </Pressable>
                <Text style={{ color: '#888', fontSize: 13, alignSelf: 'center' }}>
                  Swipe ← previous · → next
                </Text>
                <Pressable onPress={showNext} hitSlop={8}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Next</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', paddingBottom: 16 }}>
                Pinch to zoom
              </Text>
            )}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}
