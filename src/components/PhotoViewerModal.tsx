import React, { useCallback } from 'react';
import { Alert, Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZoomablePhotoImage } from './ZoomablePhotoImage';

export type ViewerPhoto = {
  id: string;
  uri: string;
  label: string;
  notes?: string;
  favorite?: boolean;
  editableLabel?: boolean;
  /** Named slots keep a fixed label; only notes are editable. */
  labelLocked?: boolean;
  onDelete: () => void;
  onLabelChange?: (label: string, notes: string) => void;
  onToggleFavorite?: (favorite: boolean) => void;
};

export function PhotoViewerModal(props: {
  photos: ViewerPhoto[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  onEditLabel?: (photo: ViewerPhoto) => void;
  /** When true, hide Delete and label editing (Slideshow browse mode). */
  browseOnly?: boolean;
}) {
  const { photos, index, onIndexChange, onEditLabel, browseOnly = false } = props;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const currentPhoto = index != null ? photos[index] : null;
  const currentNotes = currentPhoto?.notes?.trim() || undefined;
  const imageMaxH = height - insets.top - insets.bottom - (currentNotes ? 168 : 120);
  const hasMultiple = photos.length > 1;

  function renderCaption(center: boolean) {
    if (!currentPhoto) return null;
    const canEdit = !browseOnly && currentPhoto.editableLabel && onEditLabel;
    const labelText = currentPhoto.labelLocked
      ? currentPhoto.label
      : currentPhoto.label?.trim() && currentPhoto.label !== 'Photo'
        ? currentPhoto.label
        : canEdit
          ? 'Add label'
          : currentPhoto.label;
    const editHint = canEdit
      ? currentPhoto.labelLocked
        ? currentNotes
          ? 'Tap to edit notes'
          : 'Tap to add notes'
        : 'Tap to edit'
      : null;
    const caption = (
      <View style={{ alignItems: 'center', maxWidth: width - 120, paddingHorizontal: 8 }}>
        <Text
          style={{
            color: canEdit ? '#ccc' : '#888',
            fontSize: 13,
            textAlign: 'center',
            fontWeight: currentNotes ? '600' : '400',
          }}
          numberOfLines={2}
        >
          {labelText}
          {editHint && !currentNotes ? ` · ${editHint}` : ''}
        </Text>
        {currentNotes ? (
          <Text
            style={{
              color: '#bbb',
              fontSize: 13,
              textAlign: 'center',
              marginTop: 6,
              lineHeight: 18,
            }}
            numberOfLines={4}
          >
            {currentNotes}
          </Text>
        ) : null}
        {editHint && currentNotes ? (
          <Text style={{ color: '#888', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
            {editHint}
          </Text>
        ) : null}
      </View>
    );

    if (canEdit) {
      return (
        <Pressable
          onPress={() => onEditLabel!(currentPhoto)}
          hitSlop={8}
          style={center ? { alignSelf: 'center' } : { alignSelf: 'center', flex: 1 }}
        >
          {caption}
        </Pressable>
      );
    }

    return caption;
  }

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
            {currentPhoto && !browseOnly ? (
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
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 24,
                paddingBottom: 16,
                gap: 8,
              }}
            >
              <Pressable onPress={showPrev} hitSlop={8}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Previous</Text>
              </Pressable>
              {renderCaption(false)}
              <Pressable onPress={showNext} hitSlop={8}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Next</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ paddingBottom: 16, alignItems: 'center', paddingHorizontal: 24 }}>
              {renderCaption(true)}
              {!browseOnly && !currentPhoto?.editableLabel ? (
                <Text style={{ color: '#888', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                  Pinch to zoom
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
