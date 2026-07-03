import React, { useCallback } from 'react';
import { Alert, Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZoomablePhotoImage } from './ZoomablePhotoImage';

export type ViewerPhoto = {
  id: string;
  uri: string;
  label: string;
  editableLabel?: boolean;
  onDelete: () => void;
  onLabelChange?: (label: string) => void;
};

export function PhotoViewerModal(props: {
  photos: ViewerPhoto[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  onEditLabel?: (photo: ViewerPhoto) => void;
}) {
  const { photos, index, onIndexChange, onEditLabel } = props;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const currentPhoto = index != null ? photos[index] : null;
  const imageMaxH = height - insets.top - insets.bottom - 120;
  const hasMultiple = photos.length > 1;

  const closeViewer = useCallback(() => onIndexChange(null), [onIndexChange]);

  const showPrev = useCallback(() => {
    if (!hasMultiple || index == null) return;
    onIndexChange((index - 1 + photos.length) % photos.length);
  }, [hasMultiple, index, onIndexChange, photos.length]);

  const showNext = useCallback(() => {
    if (!hasMultiple || index == null) return;
    onIndexChange((index + 1) % photos.length);
  }, [hasMultiple, index, onIndexChange, photos.length]);

  function confirmDelete() {
    if (!currentPhoto) return;
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          currentPhoto.onDelete();
          onIndexChange(null);
        },
      },
    ]);
  }

  return (
    <Modal
      visible={currentPhoto != null}
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
            {hasMultiple && index != null ? (
              <Text style={{ color: '#ccc', fontSize: 15 }}>
                {index + 1} / {photos.length}
              </Text>
            ) : (
              <View style={{ width: 48 }} />
            )}
            {currentPhoto ? (
              <Pressable onPress={confirmDelete} hitSlop={12}>
                <Text style={{ color: '#ff8a80', fontSize: 17, fontWeight: '600' }}>Delete</Text>
              </Pressable>
            ) : (
              <View style={{ width: 48 }} />
            )}
          </View>

          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {currentPhoto ? (
              <ZoomablePhotoImage
                key={currentPhoto.id}
                uri={currentPhoto.uri}
                width={width}
                height={imageMaxH}
                onSwipeLeft={hasMultiple ? showPrev : undefined}
                onSwipeRight={hasMultiple ? showNext : undefined}
              />
            ) : null}
          </View>

          {hasMultiple ? (
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
              {currentPhoto?.editableLabel && onEditLabel ? (
                <Pressable onPress={() => onEditLabel(currentPhoto)} hitSlop={8}>
                  <Text style={{ color: '#ccc', fontSize: 13, alignSelf: 'center', textAlign: 'center' }}>
                    {currentPhoto.label || 'Add label'}
                  </Text>
                </Pressable>
              ) : (
                <Text style={{ color: '#888', fontSize: 13, alignSelf: 'center' }}>
                  {currentPhoto?.label}
                </Text>
              )}
              <Pressable onPress={showNext} hitSlop={8}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Next</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ paddingBottom: 16, alignItems: 'center' }}>
              {currentPhoto?.editableLabel && onEditLabel ? (
                <Pressable onPress={() => onEditLabel(currentPhoto)} hitSlop={8}>
                  <Text style={{ color: '#ccc', fontSize: 13, textAlign: 'center' }}>
                    {currentPhoto.label || 'Add label'} · Tap to edit
                  </Text>
                </Pressable>
              ) : (
                <Text style={{ color: '#888', fontSize: 13, textAlign: 'center' }}>
                  {currentPhoto?.label} · Pinch to zoom
                </Text>
              )}
            </View>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
