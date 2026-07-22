import React, { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { AddPhotoPlaceholder } from './PhotoSlot';
import { PhotoHeroCarousel } from './PhotoHeroCarousel';
import { PhotoLabelModal } from './PhotoLabelModal';
import { PhotoViewerModal, type ViewerPhoto } from './PhotoViewerModal';
import { sharedStyles, colors } from '../theme';
import { ADD_PHOTO_TILE_LABEL, promptPickOrTakeMulti } from '../photoPicker';
import { showLabeledPhotoThumbActions } from '../photoLabeling';
import { DocumentListSection, type DocumentListRow } from './DocumentListSection';

const DEFAULT_THUMB_SIZE = 72;
const DEFAULT_SLOT_LABEL_WIDTH = 80;

export type SlotDocumentTileInfo = {
  id: string;
  fileName: string;
  localUri: string;
  mimeType: string;
};

export type PhotoTile =
  | {
      kind: 'reserved';
      key: string;
      shortLabel: string;
      uri?: string;
      document?: SlotDocumentTileInfo;
      notes?: string;
      /** Underlying stored photo id (for favorites). */
      photoId?: string;
      favorite?: boolean;
      onAdd: () => void;
      onDelete?: () => void;
      onDeleteDocument?: () => void;
      /** Clear content and hide this reserved placeholder. */
      onRemoveSlot?: () => void;
      /** Named slots: label stays fixed; handler persists notes only. */
      onLabelChange?: (label: string, notes: string) => void;
      onToggleFavorite?: (favorite: boolean) => void;
    }
  | {
      kind: 'extra';
      id: string;
      shortLabel?: string;
      uri: string;
      notes?: string;
      favorite?: boolean;
      onDelete: () => void;
      onLabelChange?: (label: string, notes: string) => void;
      onToggleFavorite?: (favorite: boolean) => void;
    }
  | {
      kind: 'add';
      onAdd: () => void;
    };

type LabelHandler = {
  apply: (label: string, notes: string) => void;
  labelLocked: boolean;
  currentLabel: string;
  currentNotes: string;
};

export function PhotoSection(props: {
  tiles: PhotoTile[];
  title?: string;
  hint?: string;
  thumbSize?: number;
  slotLabelWidth?: number;
  /** Adds photos and returns new photo ids for optional labeling. */
  onAddPhotos?: (uris: string[]) => Promise<string[] | void> | string[] | void;
  /** When set, Add photo → Load file can attach non-image documents. */
  onAddDocuments?: (
    picked: { uri: string; fileName: string; mimeType: string }[]
  ) => void | Promise<void>;
  /** Free-form documents shown after named-slot documents. */
  extraDocumentRows?: DocumentListRow[];
  /** When true, show a control to restore removed reserved slots. */
  hasHiddenSlots?: boolean;
  onRestoreHiddenSlots?: () => void;
  /** Called when the hero photo changes; undefined when there is no named label. */
  onActiveHeroLabelChange?: (label: string | undefined) => void;
  /**
   * Where name/notes sit relative to the hero image.
   * Use with PhotoHeroCarousel dotsPosition to swap caption and dots.
   * Default: below.
   */
  heroCaptionPlacement?: 'above' | 'below';
  /** Where hero page dots sit. Default: above. */
  heroDotsPosition?: 'above' | 'below';
  children?: ReactNode;
  /** Optional pan gesture for the heading area (title, etc.). */
  childrenGesture?: ReturnType<typeof Gesture.Pan>;
}) {
  const {
    tiles,
    title = 'Photos',
    hint,
    thumbSize = DEFAULT_THUMB_SIZE,
    slotLabelWidth = DEFAULT_SLOT_LABEL_WIDTH,
    onAddPhotos,
    onAddDocuments,
    extraDocumentRows,
    hasHiddenSlots = false,
    onRestoreHiddenSlots,
    onActiveHeroLabelChange,
    heroCaptionPlacement = 'below',
    heroDotsPosition = 'above',
    children,
    childrenGesture,
  } = props;

  const addPlaceholderSize = Math.round(thumbSize / 3);
  const [heroPhotoId, setHeroPhotoId] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [labelingPhotoId, setLabelingPhotoId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [labelQueue, setLabelQueue] = useState<string[]>([]);
  const [renaming, setRenaming] = useState(false);
  /** Index to restore after labeling opened from the fullscreen viewer (nested Modals). */
  const [viewerReturnIndex, setViewerReturnIndex] = useState<number | null>(null);

  const labelHandlerForId = useCallback(
    (photoId: string): LabelHandler | undefined => {
      for (const tile of tiles) {
        if (tile.kind === 'extra' && tile.id === photoId && tile.onLabelChange) {
          return {
            apply: tile.onLabelChange,
            labelLocked: false,
            currentLabel: tile.shortLabel?.trim() || '',
            currentNotes: tile.notes?.trim() || '',
          };
        }
        if (tile.kind === 'reserved' && tile.key === photoId && tile.onLabelChange) {
          return {
            apply: tile.onLabelChange,
            labelLocked: true,
            currentLabel: tile.shortLabel,
            currentNotes: tile.notes?.trim() || '',
          };
        }
      }
      return undefined;
    },
    [tiles]
  );

  const queueLabels = useCallback((photoIds: string[]) => {
    const labelable = photoIds.filter((id) => labelHandlerForId(id));
    if (labelable.length === 0) return;
    setRenaming(false);
    setLabelQueue(labelable);
    setLabelingPhotoId(labelable[0] ?? null);
    setLabelDraft('');
    setNotesDraft('');
  }, [labelHandlerForId]);

  const advanceLabelQueue = useCallback(() => {
    setLabelQueue((queue) => {
      const next = queue.slice(1);
      setLabelingPhotoId(next[0] ?? null);
      setLabelDraft('');
      setNotesDraft('');
      if (next.length === 0) setRenaming(false);
      return next;
    });
  }, []);

  const handleAddPhotos = useCallback(
    (uris: string[]) => {
      if (!onAddPhotos || uris.length === 0) return;
      void Promise.resolve(onAddPhotos(uris)).then((result) => {
        const ids = Array.isArray(result) ? result : [];
        if (ids.length > 0) {
          setHeroPhotoId(ids[0] ?? null);
          queueLabels(ids);
        }
      });
    },
    [onAddPhotos, queueLabels]
  );

  const handleAddDocuments = useCallback(
    (picked: { uri: string; fileName: string; mimeType: string }) => {
      if (!onAddDocuments) return;
      void onAddDocuments([picked]);
    },
    [onAddDocuments]
  );

  const openAddPhotos = useCallback(() => {
    if (!onAddPhotos) return;
    promptPickOrTakeMulti(handleAddPhotos, onAddDocuments ? handleAddDocuments : undefined);
  }, [handleAddDocuments, handleAddPhotos, onAddDocuments, onAddPhotos]);

  const stripTiles = useMemo((): PhotoTile[] => {
    const withoutAdd = tiles.filter(
      (tile) => tile.kind !== 'add' && !(tile.kind === 'reserved' && tile.document)
    );
    if (!onAddPhotos) {
      const addTile = tiles.find((tile) => tile.kind === 'add');
      return addTile ? [...withoutAdd, addTile] : withoutAdd;
    }
    return [
      ...withoutAdd,
      {
        kind: 'add' as const,
        onAdd: openAddPhotos,
      },
    ];
  }, [onAddPhotos, openAddPhotos, tiles]);

  const documentRows = useMemo((): DocumentListRow[] => {
    const rows: DocumentListRow[] = [];
    for (const tile of tiles) {
      if (tile.kind !== 'reserved' || !tile.document) continue;
      rows.push({
        id: tile.key,
        label: tile.shortLabel,
        fileName: tile.document.fileName,
        localUri: tile.document.localUri,
        mimeType: tile.document.mimeType,
        onDelete: () => tile.onDeleteDocument?.(),
      });
    }
    if (extraDocumentRows?.length) {
      rows.push(...extraDocumentRows);
    }
    return rows;
  }, [extraDocumentRows, tiles]);

  const viewerPhotos = useMemo((): ViewerPhoto[] => {
    const photos: ViewerPhoto[] = [];
    for (const tile of stripTiles) {
      if (tile.kind === 'reserved' && tile.uri) {
        photos.push({
          id: tile.key,
          uri: tile.uri,
          label: tile.shortLabel,
          notes: tile.notes,
          favorite: tile.favorite,
          editableLabel: tile.onLabelChange != null,
          labelLocked: true,
          onDelete: () => tile.onDelete?.(),
          onLabelChange: tile.onLabelChange,
          onToggleFavorite: tile.onToggleFavorite,
        });
      } else if (tile.kind === 'extra') {
        photos.push({
          id: tile.id,
          uri: tile.uri,
          label: tile.shortLabel?.trim() || 'Photo',
          notes: tile.notes,
          favorite: tile.favorite,
          editableLabel: tile.onLabelChange != null,
          onDelete: tile.onDelete,
          onLabelChange: tile.onLabelChange,
          onToggleFavorite: tile.onToggleFavorite,
        });
      }
    }
    return photos;
  }, [stripTiles]);

  const effectiveHeroId = useMemo((): string | null => {
    if (heroPhotoId && viewerPhotos.some((photo) => photo.id === heroPhotoId)) {
      return heroPhotoId;
    }
    return viewerPhotos[0]?.id ?? null;
  }, [heroPhotoId, viewerPhotos]);

  useEffect(() => {
    if (heroPhotoId && !viewerPhotos.some((photo) => photo.id === heroPhotoId)) {
      setHeroPhotoId(null);
    }
  }, [heroPhotoId, viewerPhotos]);

  const heroIndex = useMemo(() => {
    if (!effectiveHeroId) return 0;
    const index = viewerPhotos.findIndex((photo) => photo.id === effectiveHeroId);
    return index >= 0 ? index : 0;
  }, [effectiveHeroId, viewerPhotos]);

  const activeHeroLabel = useMemo((): string | undefined => {
    const photo = viewerPhotos[heroIndex];
    if (!photo) return undefined;
    const label = photo.label?.trim();
    if (!label || label === 'Photo') return undefined;
    return label;
  }, [heroIndex, viewerPhotos]);

  const activeHeroNotes = useMemo((): string | undefined => {
    const notes = viewerPhotos[heroIndex]?.notes?.trim();
    return notes || undefined;
  }, [heroIndex, viewerPhotos]);

  const activeHeroFavorite = viewerPhotos[heroIndex]?.favorite === true;
  const activeHeroCanFavorite = viewerPhotos[heroIndex]?.onToggleFavorite != null;

  const labelingHandler = labelingPhotoId ? labelHandlerForId(labelingPhotoId) : undefined;

  useEffect(() => {
    onActiveHeroLabelChange?.(activeHeroLabel);
  }, [activeHeroLabel, onActiveHeroLabelChange]);

  function openHeroViewer() {
    if (viewerPhotos.length === 0) return;
    setViewerIndex(heroIndex);
  }

  function openRenameEditor(photoId: string, currentLabel?: string, currentNotes?: string) {
    const handler = labelHandlerForId(photoId);
    setRenaming(true);
    setLabelingPhotoId(photoId);
    setLabelDraft(
      (currentLabel?.trim() && currentLabel !== 'Photo'
        ? currentLabel
        : handler?.currentLabel) ?? ''
    );
    setNotesDraft(currentNotes?.trim() || handler?.currentNotes || '');
  }

  function openLabelEditor(photo: ViewerPhoto) {
    // React Native cannot reliably stack PhotoLabelModal on top of PhotoViewerModal.
    // Close the viewer first, then open the editor; restore the viewer when done.
    if (viewerIndex != null) {
      const returnIndex = viewerIndex;
      setViewerReturnIndex(returnIndex);
      setViewerIndex(null);
      setTimeout(() => {
        openRenameEditor(photo.id, photo.label, photo.notes);
      }, 300);
      return;
    }
    openRenameEditor(photo.id, photo.label, photo.notes);
  }

  function finishLabelEditor() {
    setLabelingPhotoId(null);
    setLabelDraft('');
    setNotesDraft('');
    setRenaming(false);
    if (viewerReturnIndex == null) return;
    const reopenAt = viewerReturnIndex;
    setViewerReturnIndex(null);
    setTimeout(() => {
      setViewerIndex(reopenAt);
    }, 300);
  }

  function closeLabelEditor() {
    if (labelQueue.length > 0) {
      advanceLabelQueue();
      return;
    }
    finishLabelEditor();
  }

  function savePhotoLabel() {
    const handler = labelingPhotoId ? labelHandlerForId(labelingPhotoId) : undefined;
    if (handler) handler.apply(labelDraft, notesDraft);
    if (labelQueue.length > 0) {
      advanceLabelQueue();
      return;
    }
    finishLabelEditor();
  }

  function thumbImageStyle(isHero: boolean) {
    return {
      width: thumbSize,
      height: thumbSize,
      borderRadius: 2,
      backgroundColor: colors.photoPlaceholder,
      borderWidth: isHero ? 1.5 : 0,
      borderColor: colors.primary,
    };
  }

  function renderThumb(tile: PhotoTile) {
    if (tile.kind === 'reserved') {
      const isHero = effectiveHeroId === tile.key;
      const showSlotActions = () => {
        if (!tile.onDelete && !tile.onRemoveSlot && !tile.onLabelChange) return;
        showLabeledPhotoThumbActions({
          onRename: tile.onLabelChange
            ? () => openRenameEditor(tile.key, tile.shortLabel, tile.notes)
            : undefined,
          onDelete: tile.onDelete,
          onRemoveSlot: tile.onRemoveSlot,
          slotLabel: tile.shortLabel,
        });
      };
      return tile.uri ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setHeroPhotoId(tile.key)}
          onLongPress={showSlotActions}
          accessibilityRole="button"
          accessibilityLabel={`Show ${tile.shortLabel}`}
          accessibilityHint="Displays this photo in the large view. Long press for options."
        >
          <Image source={{ uri: tile.uri }} style={thumbImageStyle(isHero)} />
        </TouchableOpacity>
      ) : (
        <Pressable
          onPress={tile.onAdd}
          onLongPress={tile.onRemoveSlot ? showSlotActions : undefined}
          accessibilityRole="button"
          accessibilityLabel={
            tile.document ? `Replace ${tile.shortLabel} PDF` : `Add ${tile.shortLabel}`
          }
          accessibilityHint={
            tile.document
              ? 'Choose a new photo or PDF for this slot. Long press to remove the slot.'
              : tile.onRemoveSlot
                ? 'Long press to remove this slot.'
                : undefined
          }
          style={{
            width: thumbSize,
            height: thumbSize,
            borderRadius: 2,
            backgroundColor: colors.photoPlaceholder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AddPhotoPlaceholder size={addPlaceholderSize} />
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
                ? () => openRenameEditor(tile.id, label, tile.notes)
                : undefined,
              onDelete: tile.onDelete,
            })
          }
          accessibilityRole="button"
          accessibilityLabel={label ? `Show ${label} photo` : 'Show photo'}
          accessibilityHint="Displays this photo in the large view."
        >
          <Image source={{ uri: tile.uri }} style={thumbImageStyle(isHero)} />
        </TouchableOpacity>
      );
    }

    return (
      <Pressable
        onPress={tile.onAdd}
        accessibilityRole="button"
        accessibilityLabel={ADD_PHOTO_TILE_LABEL}
        style={{
          width: thumbSize,
          height: thumbSize,
          borderRadius: 2,
          backgroundColor: colors.photoPlaceholder,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AddPhotoPlaceholder size={addPlaceholderSize} />
      </Pressable>
    );
  }

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

  const heading = children ? (
    childrenGesture ? (
      <GestureDetector gesture={childrenGesture}>
        <View style={{ marginBottom: viewerPhotos.length > 0 ? 12 : 0 }}>{children}</View>
      </GestureDetector>
    ) : (
      <View style={{ marginBottom: viewerPhotos.length > 0 ? 12 : 0 }}>{children}</View>
    )
  ) : null;

  const heroHasCaption = Boolean(activeHeroLabel || activeHeroNotes || activeHeroCanFavorite);
  const heroCaption = heroHasCaption ? (
    <View
      style={{
        marginBottom: heroCaptionPlacement === 'above' ? 8 : 12,
        alignItems: 'center',
        paddingHorizontal: 8,
        width: '100%',
        position: 'relative',
      }}
    >
      <View
        style={{
          alignItems: 'center',
          maxWidth: '100%',
          paddingHorizontal: activeHeroCanFavorite ? 28 : 0,
        }}
      >
        {activeHeroLabel ? (
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: colors.text,
              textAlign: 'center',
            }}
          >
            {activeHeroLabel}
          </Text>
        ) : null}
        {activeHeroNotes ? (
          <Text
            style={[
              sharedStyles.cardMeta,
              {
                marginTop: activeHeroLabel ? 4 : 0,
                textAlign: 'center',
              },
            ]}
          >
            {activeHeroNotes}
          </Text>
        ) : null}
      </View>
      {activeHeroCanFavorite ? (
        <Pressable
          onPress={() => viewerPhotos[heroIndex]?.onToggleFavorite?.(!activeHeroFavorite)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={activeHeroFavorite ? 'Remove from favorites' : 'Add to favorites'}
          style={{ position: 'absolute', right: 8, top: 1 }}
        >
          <Text
            style={{
              fontSize: 16.5,
              lineHeight: 18,
              color: activeHeroFavorite ? colors.primary : colors.border,
            }}
          >
            {activeHeroFavorite ? '★' : '☆'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  ) : null;

  return (
    <View style={{ marginBottom: 4 }}>
      {heading}

      {heroCaptionPlacement === 'above' ? heroCaption : null}

      <PhotoHeroCarousel
        photos={viewerPhotos.map((photo) => ({
          id: photo.id,
          uri: photo.uri,
          label: photo.label,
        }))}
        activeId={effectiveHeroId}
        onActiveIdChange={setHeroPhotoId}
        onOpenViewer={openHeroViewer}
        dotsPosition={heroDotsPosition}
      />

      {heroCaptionPlacement === 'below' ? heroCaption : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          marginTop: 16,
          marginBottom: hint ? 0 : 12,
        }}
      >
        <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>{title}</Text>
        {onAddPhotos ? (
          <Pressable
            onPress={openAddPhotos}
            accessibilityRole="button"
            accessibilityLabel="Add photo"
            hitSlop={6}
            style={({ pressed }) => ({
              padding: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons name="add" size={24} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      {hint ? <Text style={[sharedStyles.cardMeta, { marginBottom: 8 }]}>{hint}</Text> : null}
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
            <View key={tileKey(tile, index)} style={{ width: slotLabelWidth, alignItems: 'center' }}>
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

      {hasHiddenSlots && onRestoreHiddenSlots ? (
        <Pressable
          onPress={onRestoreHiddenSlots}
          accessibilityRole="button"
          accessibilityLabel="Restore removed photo slots"
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            marginBottom: 12,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={sharedStyles.textLink}>Restore removed slots</Text>
        </Pressable>
      ) : null}

      <DocumentListSection rows={documentRows} />

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
        notesDraft={notesDraft}
        onChangeNotesDraft={setNotesDraft}
        onSave={savePhotoLabel}
        onClose={closeLabelEditor}
        title={
          labelingHandler?.labelLocked
            ? 'Photo notes'
            : renaming
              ? 'Rename label'
              : 'Label photo'
        }
        saveLabel={renaming ? 'Save' : labelQueue.length > 1 ? 'Save & next' : 'Save'}
        labelLocked={labelingHandler?.labelLocked}
      />
    </View>
  );
}
