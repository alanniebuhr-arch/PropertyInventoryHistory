import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { Text } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState } from '../types';
import { allHeroPhotosForProperty } from '../propertyFavoritePhotos';
import {
  registerReuseExistingPhotosHost,
  type ReuseExistingPhotoPick,
  type ReuseExistingPhotosRequest,
} from '../reuseExistingPhotos';
import { sharedStyles, colors } from '../theme';

/**
 * Hosts the property All-photos picker and registers it for Add attachment → Reuse existing.
 * Mount once per property-scoped screen (property / room / item detail).
 */
export function ReuseExistingPhotosProvider(props: {
  state: AppState;
  propertyId: string;
  children: React.ReactNode;
}) {
  const { state, propertyId, children } = props;
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [multi, setMulti] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const pendingRef = useRef<ReuseExistingPhotosRequest | null>(null);

  const catalog = useMemo(
    () => (propertyId ? allHeroPhotosForProperty(state, propertyId) : []),
    [propertyId, state]
  );

  useEffect(() => {
    if (!propertyId) {
      registerReuseExistingPhotosHost(null);
      return;
    }
    registerReuseExistingPhotosHost({
      state,
      propertyId,
      open: (request) => {
        pendingRef.current = request;
        setMulti(request.multi);
        setSelectedIds(new Set());
        setVisible(true);
      },
    });
    return () => {
      registerReuseExistingPhotosHost(null);
    };
  }, [propertyId, state]);

  function closeWithResult(picks: ReuseExistingPhotoPick[] | undefined) {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setVisible(false);
    setSelectedIds(new Set());
    pending?.resolve(picks);
  }

  function togglePhoto(photoId: string) {
    setSelectedIds((prev) => {
      if (multi) {
        const next = new Set(prev);
        if (next.has(photoId)) next.delete(photoId);
        else next.add(photoId);
        return next;
      }
      if (prev.has(photoId)) return new Set();
      return new Set([photoId]);
    });
  }

  function confirmSelection() {
    const picks = catalog
      .filter((photo) => selectedIds.has(photo.id) && photo.uri)
      .map((photo) => {
        // Prefer stored caption; otherwise pass the catalog label (slot/room name).
        const caption =
          photo.caption?.trim() ||
          (photo.label.trim() && photo.label.trim() !== 'Photo'
            ? photo.label.trim()
            : undefined);
        return {
          uri: photo.uri,
          caption,
          notes: photo.notes?.trim() || undefined,
        };
      });
    closeWithResult(picks.length > 0 ? picks : undefined);
  }

  return (
    <>
      {children}
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => closeWithResult(undefined)}
      >
        <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              gap: 12,
            }}
          >
            <Pressable
              onPress={() => closeWithResult(undefined)}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 4 })}
            >
              <Text style={{ fontSize: 16, color: colors.text, fontWeight: '500' }}>Cancel</Text>
            </Pressable>
            <Text
              style={[sharedStyles.sectionTitle, { flex: 1, marginTop: 0, marginBottom: 0 }]}
              numberOfLines={1}
            >
              Reuse existing
            </Text>
            <Pressable
              onPress={confirmSelection}
              disabled={selectedIds.size === 0}
              accessibilityRole="button"
              accessibilityLabel="Add selected photos"
              hitSlop={8}
              style={({ pressed }) => ({
                opacity: selectedIds.size === 0 ? 0.4 : pressed ? 0.7 : 1,
                padding: 4,
              })}
            >
              <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '700' }}>
                Add{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 40 + insets.bottom,
            }}
          >
            <Text style={[sharedStyles.cardMeta, { marginBottom: 12 }]}>
              {multi
                ? 'Tap photos to select, then Add. Copies are attached (originals stay where they are).'
                : 'Tap a photo to select it, then Add. A copy is attached (the original stays where it is).'}
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
                      onPress={() => togglePhoto(photo.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: included }}
                      accessibilityLabel={`${included ? 'Deselect' : 'Select'} ${photo.label}`}
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
        </View>
      </Modal>
    </>
  );
}
