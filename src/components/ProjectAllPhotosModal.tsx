import React, { useMemo } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppState } from '../types';
import {
  allHeroPhotosForProject,
  type ProjectCatalogPhoto,
} from '../projectFavoritePhotos';
import { projectById } from '../storage';
import { sharedStyles, colors } from '../theme';

type ProjectAllPhotosModalProps = {
  visible: boolean;
  state: AppState;
  projectId: string;
  onClose: () => void;
  /** Open the fullscreen viewer for these photos, optionally starting at an index. */
  onView: (photos: ProjectCatalogPhoto[], startIndex?: number) => void;
  /** Navigate to the punch item, vendor, or interaction that owns this photo. */
  onOpenOwner: (photo: ProjectCatalogPhoto) => void;
};

export function ProjectAllPhotosModal(props: ProjectAllPhotosModalProps) {
  const { visible, state, projectId, onClose, onView, onOpenOwner } = props;
  const insets = useSafeAreaInsets();
  const catalog = useMemo(
    () => allHeroPhotosForProject(state, projectId),
    [state, projectId]
  );
  const project = projectById(state, projectId);
  const projectName = project?.name?.trim() || '';

  function handlePlay() {
    if (catalog.length === 0) return;
    onView(catalog, 0);
  }

  function ownerAccessibilityLabel(photo: ProjectCatalogPhoto): string {
    if (photo.punchItemId) return `Open punch list item for ${photo.label}`;
    if (photo.interactionId) return `Open interaction for ${photo.label}`;
    if (photo.vendorId) return `Open vendor for ${photo.label}`;
    return `Close search photos`;
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
      <View style={[sharedStyles.screen, { paddingTop: insets.top, flex: 1 }]}>
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
            accessibilityLabel="Close search photos"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 4 })}
          >
            <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '600' }}>Done</Text>
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Search photos</Text>
          <Pressable
            onPress={handlePlay}
            disabled={catalog.length === 0}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Play all photos"
            style={({ pressed }) => ({
              opacity: catalog.length === 0 ? 0.4 : pressed ? 0.7 : 1,
              padding: 4,
            })}
          >
            <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '700' }}>Play</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {projectName ? (
            <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>{projectName}</Text>
          ) : null}
          <Text style={[sharedStyles.cardMeta, { marginBottom: 12 }]}>
            Photos from this project, punch list, vendors, and interactions. Tap a photo to open
            where it lives, or Play to browse them all.
          </Text>

          {catalog.length === 0 ? (
            <Text style={sharedStyles.emptyText}>No photos on this project yet.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {catalog.map((photo) => {
                const showContext =
                  Boolean(photo.contextLabel?.trim()) &&
                  photo.contextLabel.trim().toLowerCase() !== projectName.toLowerCase();
                return (
                  <Pressable
                    key={photo.id}
                    onPress={() => onOpenOwner(photo)}
                    accessibilityRole="button"
                    accessibilityLabel={ownerAccessibilityLabel(photo)}
                    style={{ width: '30%', minWidth: 96, maxWidth: 120 }}
                  >
                    <Image
                      source={{ uri: photo.uri }}
                      style={{
                        width: '100%',
                        aspectRatio: 1,
                        borderRadius: 8,
                        backgroundColor: colors.photoPlaceholder,
                      }}
                    />
                    <Text style={[sharedStyles.cardMeta, { marginTop: 4 }]} numberOfLines={2}>
                      {photo.label}
                    </Text>
                    {showContext ? (
                      <Text style={[sharedStyles.cardMeta, { fontSize: 11 }]} numberOfLines={1}>
                        {photo.contextLabel}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
