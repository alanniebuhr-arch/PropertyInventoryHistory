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
import { AddPhotoPlaceholder } from './PhotoSlot';
import { ZoomablePhotoImage } from './ZoomablePhotoImage';
import { sharedStyles, colors } from '../theme';
import type { ItemPhoto } from '../types';
import { pickImagesFromLibrary } from '../pickImages';

const SLOT_SIZE = 72;
const SLOT_LABEL_WIDTH = 80;

type GalleryPhoto = Pick<ItemPhoto, 'id' | 'localUri' | 'caption'>;

function EventPhotoTile(props: {
  label?: string;
  photoUri?: string;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
}) {
  const { label, photoUri, onPress, onLongPress, accessibilityLabel } = props;

  return (
    <View style={{ width: SLOT_LABEL_WIDTH, alignItems: 'center' }}>
      {photoUri ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          onLongPress={onLongPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        >
          <Image
            source={{ uri: photoUri }}
            style={{
              width: SLOT_SIZE,
              height: SLOT_SIZE,
              borderRadius: 8,
              backgroundColor: colors.border,
            }}
          />
        </TouchableOpacity>
      ) : (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={{
            width: SLOT_SIZE,
            height: SLOT_SIZE,
            borderRadius: 8,
            backgroundColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AddPhotoPlaceholder size={24} />
        </Pressable>
      )}
      {label ? (
        <Text
          style={[sharedStyles.cardMeta, { fontSize: 11, marginTop: 4, textAlign: 'center' }]}
          numberOfLines={2}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export function EventPhotoSection(props: {
  photos: GalleryPhoto[];
  onAddReceipt: (uri: string) => void | Promise<void>;
  onAddPhotos: (uris: string[]) => void | Promise<void>;
  onDeletePhoto: (photoId: string) => void;
  title?: string;
}) {
  const { photos, onAddReceipt, onAddPhotos, onDeletePhoto, title = 'Event photos' } = props;

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const receiptPhoto = photos.find((p) => p.caption === 'receipt');
  const otherPhotos = photos.filter((p) => p.caption !== 'receipt');
  const viewerPhotos = [
    ...(receiptPhoto ? [receiptPhoto] : []),
    ...otherPhotos,
  ];
  const viewerPhoto = viewerIndex != null ? viewerPhotos[viewerIndex] : null;
  const imageMaxH = height - insets.top - insets.bottom - 120;

  async function pickReceipt() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to attach pictures.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await onAddReceipt(result.assets[0].uri);
    }
  }

  async function takeReceipt() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take pictures.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled && result.assets[0]?.uri) {
      await onAddReceipt(result.assets[0].uri);
    }
  }

  async function pickMorePhotos() {
    const uris = await pickImagesFromLibrary();
    if (uris.length > 0) {
      await onAddPhotos(uris);
    }
  }

  async function takeMorePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take pictures.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled && result.assets[0]?.uri) {
      await onAddPhotos([result.assets[0].uri]);
    }
  }

  function promptAddReceipt() {
    Alert.alert('Add receipt', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose photo', onPress: () => void pickReceipt() },
      { text: 'Take photo', onPress: () => void takeReceipt() },
    ]);
  }

  function promptAddMore() {
    Alert.alert('Add photo', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose photos', onPress: () => void pickMorePhotos() },
      { text: 'Take photo', onPress: () => void takeMorePhoto() },
    ]);
  }

  function confirmDelete(photoId: string) {
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (viewerIndex != null && viewerPhotos[viewerIndex]?.id === photoId) {
            setViewerIndex(null);
          }
          onDeletePhoto(photoId);
        },
      },
    ]);
  }

  function openViewer(photoId: string) {
    const index = viewerPhotos.findIndex((p) => p.id === photoId);
    if (index >= 0) setViewerIndex(index);
  }

  function closeViewer() {
    setViewerIndex(null);
  }

  const showPrev = useCallback(() => {
    if (viewerPhotos.length <= 1) return;
    setViewerIndex((idx) =>
      idx == null ? idx : (idx - 1 + viewerPhotos.length) % viewerPhotos.length
    );
  }, [viewerPhotos.length]);

  const showNext = useCallback(() => {
    if (viewerPhotos.length <= 1) return;
    setViewerIndex((idx) => (idx == null ? idx : (idx + 1) % viewerPhotos.length));
  }, [viewerPhotos.length]);

  return (
    <View>
      <Text style={sharedStyles.sectionTitle}>{title}</Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 4, gap: 10 }}
        style={{ marginBottom: 8 }}
      >
        <EventPhotoTile
          label="Receipt"
          photoUri={receiptPhoto?.localUri}
          onPress={() =>
            receiptPhoto ? openViewer(receiptPhoto.id) : promptAddReceipt()
          }
          onLongPress={receiptPhoto ? () => confirmDelete(receiptPhoto.id) : undefined}
          accessibilityLabel={receiptPhoto ? 'View receipt photo' : 'Add receipt photo'}
        />

        {otherPhotos.map((photo) => (
          <EventPhotoTile
            key={photo.id}
            photoUri={photo.localUri}
            onPress={() => openViewer(photo.id)}
            onLongPress={() => confirmDelete(photo.id)}
            accessibilityLabel="View photo"
          />
        ))}

        <EventPhotoTile
          onPress={promptAddMore}
          accessibilityLabel="Add another photo"
        />
      </ScrollView>

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
              {viewerPhotos.length > 1 && viewerIndex != null ? (
                <Text style={{ color: '#ccc', fontSize: 15 }}>
                  {viewerIndex + 1} / {viewerPhotos.length}
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
                  onSwipeLeft={viewerPhotos.length > 1 ? showPrev : undefined}
                  onSwipeRight={viewerPhotos.length > 1 ? showNext : undefined}
                />
              ) : null}
            </View>

            {viewerPhotos.length > 1 ? (
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
