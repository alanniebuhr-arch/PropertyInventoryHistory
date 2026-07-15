import React, { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
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
      onAdd: () => void;
      onDelete?: () => void;
      onDeleteDocument?: () => void;
    }
  | {
      kind: 'extra';
      id: string;
      shortLabel?: string;
      uri: string;
      onDelete: () => void;
      onLabelChange?: (label: string) => void;
    }
  | {
      kind: 'add';
      onAdd: () => void;
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
  /** Called when the hero photo changes; undefined when there is no named label. */
  onActiveHeroLabelChange?: (label: string | undefined) => void;
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
    onActiveHeroLabelChange,
    children,
    childrenGesture,
  } = props;

  const addPlaceholderSize = Math.round(thumbSize / 3);
  const [heroPhotoId, setHeroPhotoId] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [labelingPhotoId, setLabelingPhotoId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [labelQueue, setLabelQueue] = useState<string[]>([]);
  const [renaming, setRenaming] = useState(false);

  const labelHandlerForId = useCallback(
    (photoId: string): ((label: string) => void) | undefined => {
      for (const tile of tiles) {
        if (tile.kind === 'extra' && tile.id === photoId) {
          return tile.onLabelChange;
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
  }, [labelHandlerForId]);

  const advanceLabelQueue = useCallback(() => {
    setLabelQueue((queue) => {
      const next = queue.slice(1);
      setLabelingPhotoId(next[0] ?? null);
      setLabelDraft('');
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
        onAdd: () => {
          promptPickOrTakeMulti(
            handleAddPhotos,
            onAddDocuments ? handleAddDocuments : undefined
          );
        },
      },
    ];
  }, [handleAddDocuments, handleAddPhotos, onAddDocuments, onAddPhotos, tiles]);

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
          editableLabel: false,
          onDelete: () => tile.onDelete?.(),
        });
      } else if (tile.kind === 'extra') {
        photos.push({
          id: tile.id,
          uri: tile.uri,
          label: tile.shortLabel?.trim() || 'Photo',
          editableLabel: tile.onLabelChange != null,
          onDelete: tile.onDelete,
          onLabelChange: tile.onLabelChange,
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

  useEffect(() => {
    onActiveHeroLabelChange?.(activeHeroLabel);
  }, [activeHeroLabel, onActiveHeroLabelChange]);

  function openHeroViewer() {
    if (viewerPhotos.length === 0) return;
    setViewerIndex(heroIndex);
  }

  function openRenameEditor(photoId: string, currentLabel?: string) {
    setRenaming(true);
    setLabelingPhotoId(photoId);
    setLabelDraft(currentLabel?.trim() && currentLabel !== 'Photo' ? currentLabel : '');
  }

  function openLabelEditor(photo: ViewerPhoto) {
    openRenameEditor(photo.id, photo.label);
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
    const handler = labelingPhotoId ? labelHandlerForId(labelingPhotoId) : undefined;
    if (handler) handler(labelDraft);
    if (labelQueue.length > 0) {
      advanceLabelQueue();
      return;
    }
    setLabelingPhotoId(null);
    setLabelDraft('');
    setRenaming(false);
  }

  function thumbImageStyle(isHero: boolean) {
    return {
      width: thumbSize,
      height: thumbSize,
      borderRadius: 8,
      backgroundColor: colors.border,
      borderWidth: isHero ? 2 : 0,
      borderColor: colors.primary,
    };
  }

  function renderThumb(tile: PhotoTile) {
    if (tile.kind === 'reserved') {
      const isHero = effectiveHeroId === tile.key;
      return tile.uri ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setHeroPhotoId(tile.key)}
          onLongPress={() => tile.onDelete && showLabeledPhotoThumbActions({ onDelete: tile.onDelete })}
          accessibilityRole="button"
          accessibilityLabel={`Show ${tile.shortLabel}`}
          accessibilityHint="Displays this photo in the large view."
        >
          <Image source={{ uri: tile.uri }} style={thumbImageStyle(isHero)} />
        </TouchableOpacity>
      ) : (
        <Pressable
          onPress={tile.onAdd}
          accessibilityRole="button"
          accessibilityLabel={
            tile.document ? `Replace ${tile.shortLabel} PDF` : `Add ${tile.shortLabel}`
          }
          accessibilityHint={
            tile.document ? 'Choose a new photo or PDF for this slot.' : undefined
          }
          style={{
            width: thumbSize,
            height: thumbSize,
            borderRadius: 8,
            backgroundColor: colors.border,
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
                ? () => openRenameEditor(tile.id, label)
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
          borderRadius: 8,
          backgroundColor: colors.border,
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

  return (
    <View style={{ marginBottom: 4 }}>
      {heading}

      {activeHeroLabel ? (
        <Text
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: colors.text,
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          {activeHeroLabel}
        </Text>
      ) : null}

      <PhotoHeroCarousel
        photos={viewerPhotos.map((photo) => ({
          id: photo.id,
          uri: photo.uri,
          label: photo.label,
        }))}
        activeId={effectiveHeroId}
        onActiveIdChange={setHeroPhotoId}
        onOpenViewer={openHeroViewer}
      />

      <Text style={sharedStyles.sectionTitle}>{title}</Text>
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
        onSave={savePhotoLabel}
        onClose={closeLabelEditor}
        title={renaming ? 'Rename label' : 'Label photo'}
        saveLabel={renaming ? 'Save' : labelQueue.length > 1 ? 'Save & next' : 'Save'}
      />
    </View>
  );
}
