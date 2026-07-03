import React, { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { AppState, Property } from '../types';
import { AddPhotoPlaceholder } from './PhotoSlot';
import { PhotoLabelModal } from './PhotoLabelModal';
import { PhotoViewerModal, type ViewerPhoto } from './PhotoViewerModal';
import type { PhotoTile } from './PhotoSection';
import { sharedStyles, colors } from '../theme';
import { ADD_PHOTO_TILE_LABEL, promptPickOrTakeMulti } from '../photoPicker';
import { showLabeledPhotoThumbActions } from '../photoLabeling';
import { buildPropertyPhotoTiles } from '../photoSectionBuilders';
import {
  PROPERTY_PHOTO_SLOTS,
  type PropertyPhotoSlotKey,
} from '../propertyPhotoSlots';
import {
  addPropertyExtraPhotos,
  clearPropertySlotPhoto,
  propertyExtraPhotos,
  propertyPhotoUriForHeroId,
  propertySlotPhotoUri,
  removePropertyExtraPhoto,
  setPropertyExtraPhotoCaption,
  setPropertySlotPhoto,
} from '../propertyPhotos';

const THUMB_SIZE = 72;
const SLOT_LABEL_WIDTH = 80;
const HERO_ASPECT = 0.55;
const ADD_PLACEHOLDER_SIZE = Math.round(THUMB_SIZE / 3);

function tileLabel(tile: PhotoTile): string | undefined {
  if (tile.kind === 'reserved') return tile.shortLabel;
  if (tile.kind === 'extra') return tile.shortLabel?.trim() || undefined;
  return ADD_PHOTO_TILE_LABEL;
}

function tileKey(tile: PhotoTile, index: number): string {
  if (tile.kind === 'reserved') return tile.key;
  if (tile.kind === 'extra') return tile.id;
  return `add-${index}`;
}

export function PropertyPhotosSection(props: {
  state: AppState;
  property: Property;
  onSave: (state: AppState) => void;
  children?: ReactNode;
}) {
  const { state, property, onSave, children } = props;
  const [heroPhotoId, setHeroPhotoId] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [labelingPhotoId, setLabelingPhotoId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [labelQueue, setLabelQueue] = useState<string[]>([]);
  const [renaming, setRenaming] = useState(false);

  const slotUri = (key: PropertyPhotoSlotKey) =>
    propertySlotPhotoUri(state, property, key);

  const extraPhotos = propertyExtraPhotos(state, property.id);

  const photoTiles = useMemo(
    () =>
      buildPropertyPhotoTiles({
        getSlotUri: (key) => propertySlotPhotoUri(state, property, key as PropertyPhotoSlotKey),
        onAddSlot: (key, uri) => {
          void setPropertySlotPhoto(state, property.id, key as PropertyPhotoSlotKey, uri).then(
            (next) => {
              onSave(next);
              setHeroPhotoId(key);
            }
          );
        },
        onDeleteSlot: (key) => {
          void clearPropertySlotPhoto(state, property.id, key as PropertyPhotoSlotKey).then(onSave);
        },
        extraPhotos,
        onDeleteExtra: (photoId) => {
          void removePropertyExtraPhoto(state, property.id, photoId).then(onSave);
        },
        onLabelExtra: (photoId, label) => {
          onSave(setPropertyExtraPhotoCaption(state, photoId, label));
        },
      }),
    [extraPhotos, onSave, property, state]
  );

  const handleAddExtraPhotos = useCallback(
    async (sourceUris: string[]) => {
      if (sourceUris.length === 0) return;
      const next = await addPropertyExtraPhotos(state, property.id, sourceUris);
      onSave(next);
      const added = propertyExtraPhotos(next, property.id).slice(-sourceUris.length);
      if (added[0]) setHeroPhotoId(added[0].id);
      const ids = added.map((photo) => photo.id);
      if (ids.length > 0) {
        setRenaming(false);
        setLabelQueue(ids);
        setLabelingPhotoId(ids[0] ?? null);
        setLabelDraft('');
      }
    },
    [onSave, property.id, state]
  );

  const stripTiles = useMemo(
    (): PhotoTile[] => [
      ...photoTiles,
      {
        kind: 'add' as const,
        onAdd: () => {
          promptPickOrTakeMulti((uris) => {
            void handleAddExtraPhotos(uris);
          });
        },
      },
    ],
    [handleAddExtraPhotos, photoTiles]
  );

  const effectiveHeroId = useMemo((): string | null => {
    if (heroPhotoId && propertyPhotoUriForHeroId(state, property, heroPhotoId)) {
      return heroPhotoId;
    }
    if (slotUri('frontPhotoId')) return 'frontPhotoId';
    const firstSlot = PROPERTY_PHOTO_SLOTS.find((slot) => slotUri(slot.key));
    if (firstSlot) return firstSlot.key;
    return extraPhotos[0]?.id ?? null;
  }, [extraPhotos, heroPhotoId, property, state]);

  useEffect(() => {
    if (heroPhotoId && !propertyPhotoUriForHeroId(state, property, heroPhotoId)) {
      setHeroPhotoId(null);
    }
  }, [heroPhotoId, property, state]);

  const heroUri = effectiveHeroId
    ? propertyPhotoUriForHeroId(state, property, effectiveHeroId)
    : undefined;
  const heroLabel =
    PROPERTY_PHOTO_SLOTS.find((slot) => slot.key === effectiveHeroId)?.shortLabel ??
    extraPhotos.find((photo) => photo.id === effectiveHeroId)?.caption?.trim() ??
    'Photo';

  const viewerPhotos = useMemo((): ViewerPhoto[] => {
    const photos: ViewerPhoto[] = PROPERTY_PHOTO_SLOTS.filter((slot) => slotUri(slot.key)).map(
      (slot) => ({
        id: slot.key,
        uri: slotUri(slot.key)!,
        label: slot.shortLabel,
        editableLabel: false,
        onDelete: () => {
          void clearPropertySlotPhoto(state, property.id, slot.key).then(onSave);
        },
      })
    );

    for (const photo of extraPhotos) {
      photos.push({
        id: photo.id,
        uri: photo.localUri,
        label: photo.caption?.trim() || 'Photo',
        editableLabel: true,
        onDelete: () => {
          void removePropertyExtraPhoto(state, property.id, photo.id).then(onSave);
        },
        onLabelChange: (label) => {
          onSave(setPropertyExtraPhotoCaption(state, photo.id, label));
        },
      });
    }

    return photos;
  }, [extraPhotos, onSave, property.id, state]);

  const allEmpty =
    PROPERTY_PHOTO_SLOTS.every((slot) => !slotUri(slot.key)) && extraPhotos.length === 0;

  function advanceLabelQueue() {
    setLabelQueue((queue) => {
      const next = queue.slice(1);
      setLabelingPhotoId(next[0] ?? null);
      setLabelDraft('');
      if (next.length === 0) setRenaming(false);
      return next;
    });
  }

  function openRenameEditor(photoId: string, currentLabel?: string) {
    setRenaming(true);
    setLabelingPhotoId(photoId);
    setLabelDraft(currentLabel?.trim() ? currentLabel : '');
  }

  function openLabelEditor(photo: ViewerPhoto) {
    openRenameEditor(photo.id, photo.label === 'Photo' ? undefined : photo.label);
  }

  function closeLabelEditor() {
    if (labelQueue.length > 0) {
      advanceLabelQueue();
      return;
    }
    setLabelingPhotoId(null);
    setLabelDraft('');
    setRenaming(false);
  }

  function savePhotoLabel() {
    if (labelingPhotoId) {
      onSave(setPropertyExtraPhotoCaption(state, labelingPhotoId, labelDraft));
    }
    if (labelQueue.length > 0) {
      advanceLabelQueue();
      return;
    }
    setLabelingPhotoId(null);
    setLabelDraft('');
    setRenaming(false);
  }

  function openHeroViewer() {
    if (!effectiveHeroId) return;
    const index = viewerPhotos.findIndex((photo) => photo.id === effectiveHeroId);
    setViewerIndex(index >= 0 ? index : 0);
  }

  function renderThumb(tile: PhotoTile) {
    if (tile.kind === 'reserved') {
      const isHero = effectiveHeroId === tile.key;
      return tile.uri ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setHeroPhotoId(tile.key)}
          onLongPress={() =>
            tile.onDelete && showLabeledPhotoThumbActions({ onDelete: tile.onDelete })
          }
          accessibilityRole="button"
          accessibilityLabel={`Show ${tile.shortLabel}`}
          accessibilityHint="Displays this photo at the top."
        >
          <Image
            source={{ uri: tile.uri }}
            style={{
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: 8,
              backgroundColor: colors.border,
              borderWidth: isHero ? 2 : 0,
              borderColor: colors.primary,
            }}
          />
        </TouchableOpacity>
      ) : (
        <Pressable
          onPress={tile.onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Add ${tile.shortLabel}`}
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: 8,
            backgroundColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AddPhotoPlaceholder size={ADD_PLACEHOLDER_SIZE} />
        </Pressable>
      );
    }

    if (tile.kind === 'extra') {
      const label = tile.shortLabel?.trim();
      const isHero = effectiveHeroId === tile.id;
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setHeroPhotoId(tile.id)}
          onLongPress={() =>
            showLabeledPhotoThumbActions({
              onRename: tile.onLabelChange
                ? () => openRenameEditor(tile.id, label)
                : undefined,
              onDelete: tile.onDelete,
            })
          }
          accessibilityRole="button"
          accessibilityLabel={label ? `Show ${label} photo` : 'Show photo'}
          accessibilityHint="Displays this photo at the top."
        >
          <Image
            source={{ uri: tile.uri }}
            style={{
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: 8,
              backgroundColor: colors.border,
              borderWidth: isHero ? 2 : 0,
              borderColor: colors.primary,
            }}
          />
        </TouchableOpacity>
      );
    }

    return (
      <Pressable
        onPress={tile.onAdd}
        accessibilityRole="button"
        accessibilityLabel={ADD_PHOTO_TILE_LABEL}
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: 8,
          backgroundColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AddPhotoPlaceholder size={ADD_PLACEHOLDER_SIZE} />
      </Pressable>
    );
  }

  return (
    <View style={{ marginBottom: 4 }}>
      {heroUri ? (
        <View style={{ marginBottom: 12 }}>
          <Pressable
            onPress={openHeroViewer}
            accessibilityRole="imagebutton"
            accessibilityLabel={heroLabel}
            accessibilityHint="Opens full-screen photo viewer."
          >
            <Image
              source={{ uri: heroUri }}
              style={{
                width: '100%',
                aspectRatio: 1 / HERO_ASPECT,
                borderRadius: 12,
                backgroundColor: colors.border,
              }}
              resizeMode="cover"
            />
          </Pressable>
        </View>
      ) : null}

      {children}

      <Text style={sharedStyles.sectionTitle}>Photos</Text>
      {allEmpty ? (
        <Text style={[sharedStyles.cardMeta, { marginBottom: 8 }]}>
          Add photos of the property exterior, field card, and plot plan.
        </Text>
      ) : null}

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 4, gap: 10 }}
        style={{ marginBottom: 12 }}
      >
        {stripTiles.map((tile, index) => {
          const label = tileLabel(tile);
          return (
            <View key={tileKey(tile, index)} style={{ width: SLOT_LABEL_WIDTH, alignItems: 'center' }}>
              {renderThumb(tile)}
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
        })}
      </ScrollView>

      <PhotoViewerModal
        photos={viewerPhotos}
        index={viewerIndex}
        onIndexChange={(index) => {
          setViewerIndex(index);
          if (index != null) {
            const photo = viewerPhotos[index];
            if (photo) setHeroPhotoId(photo.id);
          }
        }}
        onEditLabel={openLabelEditor}
      />

      <PhotoLabelModal
        visible={labelingPhotoId != null}
        draft={labelDraft}
        onChangeDraft={setLabelDraft}
        onSave={savePhotoLabel}
        onClose={closeLabelEditor}
        title={renaming ? 'Rename label' : 'Label photo'}
        saveLabel={renaming ? 'Save' : labelQueue.length > 1 ? 'Save & next' : 'Save'}
      />
    </View>
  );
}
