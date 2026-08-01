import React from 'react';
import { Image, Text, View } from 'react-native';

export type ExportPhotoItem = {
  uri: string;
  label: string;
  /** Free-form picture note shown to the right of the image when present. */
  notes?: string;
  aspectRatio?: number;
};

const DEFAULT_MUTED = '#6b6560';
const DEFAULT_BORDER = '#d4cfc6';
const DEFAULT_TEXT = '#1a1814';

function trimNotes(notes?: string): string | undefined {
  const trimmed = notes?.trim();
  return trimmed || undefined;
}

/** Square / grid photo with optional notes to the right. */
export function ExportPhotoTile(props: {
  photo: ExportPhotoItem;
  size: number;
  mutedColor?: string;
  borderColor?: string;
  textColor?: string;
}) {
  const {
    photo,
    size,
    mutedColor = DEFAULT_MUTED,
    borderColor = DEFAULT_BORDER,
    textColor = DEFAULT_TEXT,
  } = props;
  const notes = trimNotes(photo.notes);

  if (!notes) {
    return (
      <View style={{ width: size, alignItems: 'center' }}>
        <Image
          source={{ uri: photo.uri }}
          style={{
            width: size,
            height: size,
            borderRadius: 8,
            backgroundColor: borderColor,
          }}
        />
        <Text
          style={{
            fontSize: 11,
            color: mutedColor,
            marginTop: 4,
            textAlign: 'center',
          }}
          numberOfLines={2}
        >
          {photo.label}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <Image
        source={{ uri: photo.uri }}
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          backgroundColor: borderColor,
        }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 11, color: mutedColor, fontWeight: '600' }} numberOfLines={2}>
          {photo.label}
        </Text>
        <Text style={{ fontSize: 13, color: textColor, marginTop: 4 }}>{notes}</Text>
      </View>
    </View>
  );
}

/**
 * Renders export photos: no-note photos stay in a wrap grid; photos with notes
 * break out to a full-width row (image left, note right).
 */
export function ExportPhotoGrid(props: {
  photos: ExportPhotoItem[];
  photoSize: number;
  mutedColor?: string;
  borderColor?: string;
  textColor?: string;
  style?: object;
}) {
  const {
    photos,
    photoSize,
    mutedColor = DEFAULT_MUTED,
    borderColor = DEFAULT_BORDER,
    textColor = DEFAULT_TEXT,
    style,
  } = props;
  if (photos.length === 0) return null;

  const rows: { type: 'grid' | 'noted'; photos: ExportPhotoItem[] }[] = [];
  let gridBatch: ExportPhotoItem[] = [];

  const flushGrid = () => {
    if (gridBatch.length === 0) return;
    rows.push({ type: 'grid', photos: gridBatch });
    gridBatch = [];
  };

  for (const photo of photos) {
    if (trimNotes(photo.notes)) {
      flushGrid();
      rows.push({ type: 'noted', photos: [photo] });
    } else {
      gridBatch.push(photo);
    }
  }
  flushGrid();

  return (
    <View style={[{ gap: 12, marginTop: 8 }, style]}>
      {rows.map((row, rowIndex) =>
        row.type === 'noted' ? (
          <ExportPhotoTile
            key={`noted-${row.photos[0].uri}-${rowIndex}`}
            photo={row.photos[0]}
            size={photoSize}
            mutedColor={mutedColor}
            borderColor={borderColor}
            textColor={textColor}
          />
        ) : (
          <View
            key={`grid-${rowIndex}`}
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}
          >
            {row.photos.map((photo, index) => (
              <ExportPhotoTile
                key={`${photo.uri}-${index}`}
                photo={photo}
                size={photoSize}
                mutedColor={mutedColor}
                borderColor={borderColor}
                textColor={textColor}
              />
            ))}
          </View>
        )
      )}
    </View>
  );
}

/** Full-width aspect-ratio photo (interaction share) with optional notes to the right. */
export function ExportAspectPhoto(props: {
  photo: ExportPhotoItem;
  contentWidth: number;
  maxHeight: number;
  mutedColor?: string;
  borderColor?: string;
  textColor?: string;
}) {
  const {
    photo,
    contentWidth,
    maxHeight,
    mutedColor = DEFAULT_MUTED,
    borderColor = DEFAULT_BORDER,
    textColor = DEFAULT_TEXT,
  } = props;
  const notes = trimNotes(photo.notes);
  const aspectRatio = photo.aspectRatio && photo.aspectRatio > 0 ? photo.aspectRatio : 1;

  if (!notes) {
    const heightFromAspect = contentWidth / aspectRatio;
    const imageWidth =
      heightFromAspect > maxHeight ? maxHeight * aspectRatio : contentWidth;
    const imageHeight = Math.min(heightFromAspect, maxHeight);

    return (
      <View style={{ width: '100%', alignItems: 'center', marginBottom: 12 }}>
        <Image
          source={{ uri: photo.uri }}
          style={{
            width: imageWidth,
            height: imageHeight,
            borderRadius: 8,
            backgroundColor: borderColor,
          }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontSize: 11,
            color: mutedColor,
            marginTop: 4,
            textAlign: 'center',
          }}
          numberOfLines={2}
        >
          {photo.label}
        </Text>
      </View>
    );
  }

  const imageColumnWidth = Math.round(contentWidth * 0.48);
  const heightFromAspect = imageColumnWidth / aspectRatio;
  const imageWidth =
    heightFromAspect > maxHeight ? maxHeight * aspectRatio : imageColumnWidth;
  const imageHeight = Math.min(heightFromAspect, maxHeight);

  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 12,
      }}
    >
      <Image
        source={{ uri: photo.uri }}
        style={{
          width: imageWidth,
          height: imageHeight,
          borderRadius: 8,
          backgroundColor: borderColor,
        }}
        resizeMode="contain"
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 11, color: mutedColor, fontWeight: '600' }} numberOfLines={2}>
          {photo.label}
        </Text>
        <Text style={{ fontSize: 13, color: textColor, marginTop: 4 }}>{notes}</Text>
      </View>
    </View>
  );
}

/** Photo note text for list-row thumbnails (already laid out image-left / text-right). */
export function ExportPhotoNoteText(props: {
  notes?: string;
  color?: string;
}) {
  const notes = trimNotes(props.notes);
  if (!notes) return null;
  return (
    <Text style={{ fontSize: 13, color: props.color ?? DEFAULT_TEXT, marginTop: 4 }}>{notes}</Text>
  );
}
