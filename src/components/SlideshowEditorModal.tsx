import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState } from '../types';
import {
  allHeroPhotosForProperty,
  ensureSlideshowPhotoIds,
  moveSlideshowPhotoToOrder,
  setSlideshowPhotoIncluded,
  setSlideshowPhotoIds,
  slideshowPhotosForProperty,
} from '../propertyFavoritePhotos';
import { useKeyboardDoneAccessory } from './KeyboardDoneAccessory';
import { sharedStyles, colors } from '../theme';

const THUMB = 64;

export function SlideshowEditorModal(props: {
  visible: boolean;
  state: AppState;
  propertyId: string;
  onSave: (state: AppState) => void;
  onClose: () => void;
  /** Optional override state so Play uses the order just committed from drafts. */
  onPlay: (playState?: AppState) => void;
}) {
  const { visible, state, propertyId, onSave, onClose, onPlay } = props;
  const insets = useSafeAreaInsets();
  const keyboardDone = useKeyboardDoneAccessory({
    id: 'slideshowOrderDone',
    label: 'Enter',
    // Slideshow editor is itself a Modal — native InputAccessoryView won't show.
    variant: 'overlay',
  });
  const selected = useMemo(
    () => slideshowPhotosForProperty(state, propertyId),
    [state, propertyId]
  );
  const selectedIds = useMemo(() => new Set(selected.map((photo) => photo.id)), [selected]);
  const catalog = useMemo(
    () => allHeroPhotosForProperty(state, propertyId),
    [state, propertyId]
  );
  const [orderDrafts, setOrderDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    const next: Record<string, string> = {};
    selected.forEach((photo, index) => {
      next[photo.id] = String(index + 1);
    });
    setOrderDrafts(next);
  }, [visible, selected]);

  function applyOrder(photoId: string, raw: string) {
    const parsed = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(parsed)) {
      const index = selected.findIndex((photo) => photo.id === photoId);
      setOrderDrafts((prev) => ({
        ...prev,
        [photoId]: index >= 0 ? String(index + 1) : prev[photoId] ?? '1',
      }));
      return;
    }
    onSave(moveSlideshowPhotoToOrder(state, propertyId, photoId, parsed));
  }

  /** Commit any number-field edits that were not yet blurred into slideshowPhotoIds. */
  function stateWithFlushedOrderDrafts(): AppState {
    let next = ensureSlideshowPhotoIds(state, propertyId);
    const dirty = selected
      .map((photo, index) => {
        const parsed = Number.parseInt((orderDrafts[photo.id] ?? '').trim(), 10);
        return { photoId: photo.id, parsed, index };
      })
      .filter(
        ({ parsed, index }) => Number.isFinite(parsed) && parsed >= 1 && parsed !== index + 1
      );

    if (dirty.length === 0) {
      // Still persist explicit ids so Play never falls back to favorite traversal order.
      const property = next.properties.find((p) => p.id === propertyId);
      if (property?.slideshowPhotoIds === undefined) {
        next = setSlideshowPhotoIds(
          next,
          propertyId,
          selected.map((photo) => photo.id)
        );
      }
      return next;
    }

    for (const { photoId, parsed } of dirty) {
      next = moveSlideshowPhotoToOrder(next, propertyId, photoId, parsed);
    }
    return next;
  }

  function toggleIncluded(photoId: string, included: boolean) {
    onSave(setSlideshowPhotoIncluded(state, propertyId, photoId, included));
  }

  function handlePlay() {
    if (selected.length === 0) return;
    const next = stateWithFlushedOrderDrafts();
    onSave(next);
    onPlay(next);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      supportedOrientations={[
        'portrait',
        'portrait-upside-down',
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}
    >
      <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.hairline,
          }}
        >
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close slideshow editor"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 4 })}
          >
            <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '600' }}>Done</Text>
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Slideshow</Text>
          <Pressable
            onPress={handlePlay}
            disabled={selected.length === 0}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Play slideshow"
            style={({ pressed }) => ({
              opacity: selected.length === 0 ? 0.4 : pressed ? 0.7 : 1,
              padding: 4,
            })}
          >
            <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '700' }}>Play</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>
            Slideshow order ({selected.length})
          </Text>
          <Text style={[sharedStyles.cardMeta, { marginBottom: 12 }]}>
            Change the number, then tap Enter — the photo jumps to that position (no Save needed).
          </Text>

          {selected.length === 0 ? (
            <Text style={sharedStyles.emptyText}>
              No photos in the slideshow yet. Select photos below, or star heroes on property,
              room, and asset screens.
            </Text>
          ) : (
            selected.map((photo, index) => (
              <View
                key={photo.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 12,
                  paddingBottom: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.hairline,
                }}
              >
                <TextInput
                  value={orderDrafts[photo.id] ?? String(index + 1)}
                  onChangeText={(value) => {
                    const digits = value.replace(/[^\d]/g, '');
                    setOrderDrafts((prev) => ({ ...prev, [photo.id]: digits }));
                  }}
                  onEndEditing={(e) => applyOrder(photo.id, e.nativeEvent.text)}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  accessibilityLabel={`Order for ${photo.label}`}
                  {...keyboardDone.textInputProps}
                  style={{
                    width: 44,
                    height: 40,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    textAlign: 'center',
                    fontSize: 16,
                    fontWeight: '700',
                    color: colors.text,
                    backgroundColor: colors.card,
                  }}
                />
                <Image
                  source={{ uri: photo.uri }}
                  style={{
                    width: THUMB,
                    height: THUMB,
                    borderRadius: 8,
                    backgroundColor: colors.photoPlaceholder,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={sharedStyles.cardTitle} numberOfLines={2}>
                    {photo.label}
                  </Text>
                </View>
                <Pressable
                  onPress={() => toggleIncluded(photo.id, false)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${photo.label} from slideshow`}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 4 })}
                >
                  <MaterialIcons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>
            ))
          )}

          <Text style={[sharedStyles.sectionTitle, { marginTop: 20 }]}>All photos</Text>
          <Text style={[sharedStyles.cardMeta, { marginBottom: 12 }]}>
            Tap a photo to add or remove it from the slideshow.
          </Text>

          {catalog.length === 0 ? (
            <Text style={sharedStyles.emptyText}>No photos on this property yet.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {catalog.map((photo) => {
                const included = selectedIds.has(photo.id);
                return (
                  <Pressable
                    key={photo.id}
                    onPress={() => toggleIncluded(photo.id, !included)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: included }}
                    accessibilityLabel={`${included ? 'Remove' : 'Add'} ${photo.label}`}
                    style={{ width: '30%', minWidth: 96, maxWidth: 120 }}
                  >
                    <View style={{ position: 'relative' }}>
                      <Image
                        source={{ uri: photo.uri }}
                        style={{
                          width: '100%',
                          aspectRatio: 1,
                          borderRadius: 8,
                          backgroundColor: colors.photoPlaceholder,
                          borderWidth: included ? 2 : 0,
                          borderColor: colors.primary,
                        }}
                      />
                      {included ? (
                        <View
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            backgroundColor: colors.primary,
                            borderRadius: 10,
                            width: 20,
                            height: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <MaterialIcons name="check" size={14} color="#fff" />
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={[sharedStyles.cardMeta, { marginTop: 4 }]}
                      numberOfLines={2}
                    >
                      {photo.label}
                    </Text>
                    <Text style={[sharedStyles.cardMeta, { fontSize: 11 }]} numberOfLines={1}>
                      {photo.contextLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
        {keyboardDone.accessory}
      </View>
    </Modal>
  );
}
