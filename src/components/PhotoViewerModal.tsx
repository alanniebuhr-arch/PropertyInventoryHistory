import React, { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { Text } from '../textScale';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZoomablePhotoImage } from './ZoomablePhotoImage';

/** Second Back within this window closes the slideshow; first advances. */
export const SLIDESHOW_DOUBLE_BACK_MS = 500;

export type ViewerPhoto = {
  id: string;
  uri: string;
  label: string;
  notes?: string;
  favorite?: boolean;
  editableLabel?: boolean;
  /** Named slots keep a fixed label; only notes are editable. */
  labelLocked?: boolean;
  onDelete?: () => void;
  onLabelChange?: (label: string, notes: string) => void;
  onToggleFavorite?: (favorite: boolean) => void;
};

export function PhotoViewerModal(props: {
  photos: ViewerPhoto[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  onEditLabel?: (photo: ViewerPhoto) => void;
  /**
   * Slideshow browse mode: no delete/label edit.
   * Renders embedded in the parent (parent owns ← Back: single = next, double = close).
   */
  browseOnly?: boolean;
}) {
  const { photos, index, onIndexChange, onEditLabel, browseOnly = false } = props;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscapeSlideshow = browseOnly && width > height;
  const [stageSize, setStageSize] = useState({ width, height });

  const currentPhoto = index != null ? photos[index] : null;
  const currentNotes = currentPhoto?.notes?.trim() || undefined;
  const imageMaxH = landscapeSlideshow
    ? stageSize.height
    : browseOnly
      ? Math.max(120, stageSize.height - (currentNotes ? 100 : 56))
      : height - insets.top - insets.bottom - (currentNotes ? 168 : 120);
  const hasMultiple = photos.length > 1;

  function slideshowLabelText(): string | undefined {
    if (!currentPhoto) return undefined;
    const label = currentPhoto.label?.trim();
    if (!label || label === 'Photo') return undefined;
    return label;
  }

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

  const closeViewer = useCallback(() => {
    onIndexChange(null);
  }, [onIndexChange]);

  const showPrev = useCallback(() => {
    if (!hasMultiple || index == null) return;
    onIndexChange((index - 1 + photos.length) % photos.length);
  }, [hasMultiple, index, onIndexChange, photos.length]);

  const showNext = useCallback(() => {
    if (!hasMultiple || index == null) return;
    onIndexChange((index + 1) % photos.length);
  }, [hasMultiple, index, onIndexChange, photos.length]);

  function confirmDelete() {
    if (!currentPhoto?.onDelete) return;
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          currentPhoto.onDelete?.();
          onIndexChange(null);
        },
      },
    ]);
  }

  const landscapeLabel = slideshowLabelText();

  // Slideshow: embedded under the screen ← Back header (iPhone has no system back).
  if (browseOnly) {
    if (currentPhoto == null) return null;
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
        <View
          style={{ flex: 1 }}
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            if (w > 0 && h > 0) setStageSize({ width: w, height: h });
          }}
        >
          {landscapeSlideshow ? (
            <View style={{ flex: 1 }}>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ZoomablePhotoImage
                  key={currentPhoto.id}
                  uri={currentPhoto.uri}
                  width={stageSize.width}
                  height={
                    landscapeLabel
                      ? Math.max(120, stageSize.height - Math.max(insets.bottom, 12) - 40)
                      : stageSize.height
                  }
                  resizeMode="contain"
                  onSwipeLeft={hasMultiple ? showNext : undefined}
                  onSwipeRight={hasMultiple ? showPrev : undefined}
                />
              </View>
              {landscapeLabel ? (
                <View
                  style={{
                    paddingTop: 10,
                    paddingBottom: Math.max(insets.bottom, 10),
                    paddingHorizontal: 24,
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}
                    numberOfLines={2}
                  >
                    {landscapeLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={{ flex: 1, paddingBottom: Math.max(insets.bottom, 8) }}>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ZoomablePhotoImage
                  key={currentPhoto.id}
                  uri={currentPhoto.uri}
                  width={stageSize.width}
                  height={imageMaxH}
                  onSwipeLeft={hasMultiple ? showNext : undefined}
                  onSwipeRight={hasMultiple ? showPrev : undefined}
                />
              </View>
              {hasMultiple ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 24,
                    paddingBottom: 8,
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
                <View style={{ paddingBottom: 8, alignItems: 'center', paddingHorizontal: 24 }}>
                  {renderCaption(true)}
                </View>
              )}
            </View>
          )}
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <Modal
      visible={currentPhoto != null}
      transparent
      animationType="fade"
      onRequestClose={closeViewer}
      presentationStyle="overFullScreen"
      supportedOrientations={[
        'portrait',
        'portrait-upside-down',
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}
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
            {currentPhoto?.onDelete ? (
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
                onSwipeLeft={hasMultiple ? showNext : undefined}
                onSwipeRight={hasMultiple ? showPrev : undefined}
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
              {!currentPhoto?.editableLabel ? (
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
