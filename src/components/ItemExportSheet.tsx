import React from 'react';
import { Image, Text, View } from 'react-native';
import type { ItemExportSnapshot } from '../itemExportContent';

export const ITEM_EXPORT_WIDTH = 390;
const EXPORT_EVENT_THUMB_SIZE = 72;
const EXPORT_PHOTO_SIZE = Math.round(110 * 1.33);
const EXPORT_CONTENT_WIDTH = ITEM_EXPORT_WIDTH - 48;
const EXPORT_TAG_PHOTO_HEIGHT = Math.round(EXPORT_CONTENT_WIDTH * 1.35);

const exportColors = {
  bg: '#ffffff',
  text: '#1a2332',
  muted: '#5a6b7d',
  border: '#d8e0ea',
  section: '#1f5fbf',
};

function ExportRow(props: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 12, color: exportColors.muted, fontWeight: '600' }}>
        {props.label}
      </Text>
      <Text style={{ fontSize: 15, color: exportColors.text, marginTop: 2 }}>{props.value}</Text>
    </View>
  );
}

function isTagPhoto(label: string): boolean {
  return label.trim().toLowerCase().endsWith('tag');
}

type ExportPhoto = { uri: string; label: string };

type ExportPhotoChunk =
  | { type: 'tag'; photo: ExportPhoto }
  | { type: 'grid'; photos: ExportPhoto[] };

function chunkExportPhotos(photos: ExportPhoto[]): ExportPhotoChunk[] {
  const chunks: ExportPhotoChunk[] = [];
  let gridBatch: ExportPhoto[] = [];

  for (const photo of photos) {
    if (isTagPhoto(photo.label)) {
      if (gridBatch.length > 0) {
        chunks.push({ type: 'grid', photos: gridBatch });
        gridBatch = [];
      }
      chunks.push({ type: 'tag', photo });
    } else {
      gridBatch.push(photo);
    }
  }

  if (gridBatch.length > 0) {
    chunks.push({ type: 'grid', photos: gridBatch });
  }

  return chunks;
}

function ExportTagPhoto(props: { photo: ExportPhoto }) {
  const { photo } = props;
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Image
        source={{ uri: photo.uri }}
        style={{
          width: EXPORT_CONTENT_WIDTH,
          height: EXPORT_TAG_PHOTO_HEIGHT,
          borderRadius: 8,
          backgroundColor: exportColors.border,
        }}
        resizeMode="contain"
      />
      <Text
        style={{
          fontSize: 11,
          color: exportColors.muted,
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

function ExportPhotoGrid(props: { photos: ExportPhoto[] }) {
  const { photos } = props;
  if (photos.length === 0) return null;

  const chunks = chunkExportPhotos(photos);

  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      {chunks.map((chunk, chunkIndex) =>
        chunk.type === 'tag' ? (
          <ExportTagPhoto key={`tag-${chunk.photo.uri}-${chunkIndex}`} photo={chunk.photo} />
        ) : (
          <View
            key={`grid-${chunkIndex}`}
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}
          >
            {chunk.photos.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={{ width: EXPORT_PHOTO_SIZE, alignItems: 'center' }}>
                <Image
                  source={{ uri: photo.uri }}
                  style={{
                    width: EXPORT_PHOTO_SIZE,
                    height: EXPORT_PHOTO_SIZE,
                    borderRadius: 8,
                    backgroundColor: exportColors.border,
                  }}
                />
                <Text
                  style={{
                    fontSize: 11,
                    color: exportColors.muted,
                    marginTop: 4,
                    textAlign: 'center',
                  }}
                  numberOfLines={2}
                >
                  {photo.label}
                </Text>
              </View>
            ))}
          </View>
        )
      )}
    </View>
  );
}

export function ItemExportSheet(props: { snapshot: ItemExportSnapshot }) {
  const { snapshot } = props;

  return (
    <View
      style={{
        width: ITEM_EXPORT_WIDTH,
        backgroundColor: exportColors.bg,
        padding: 24,
      }}
    >
      <Text style={{ fontSize: 13, color: exportColors.muted, marginBottom: 4 }}>
        {snapshot.subtitle}
      </Text>
      <Text style={{ fontSize: 24, fontWeight: '700', color: exportColors.text, marginBottom: 8 }}>
        {snapshot.title}
      </Text>
      {snapshot.metaLines.map((line) => (
        <Text key={line} style={{ fontSize: 14, color: exportColors.muted, marginBottom: 2 }}>
          {line}
        </Text>
      ))}

      {snapshot.sections.map((sec) => (
        <View
          key={sec.title}
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: exportColors.border,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: exportColors.section,
              marginBottom: 10,
            }}
          >
            {sec.title}
          </Text>
          {sec.rows.map((r) => (
            <ExportRow key={`${sec.title}-${r.label}`} label={r.label} value={r.value} />
          ))}
        </View>
      ))}

      {snapshot.photos.length > 0 ? (
        <View
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: exportColors.border,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: exportColors.section,
              marginBottom: 4,
            }}
          >
            Photos
          </Text>
          <ExportPhotoGrid photos={snapshot.photos} />
        </View>
      ) : null}

      {snapshot.events.length > 0 ? (
        <View
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: exportColors.border,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: exportColors.section,
              marginBottom: 10,
            }}
          >
            Service history
          </Text>
          {snapshot.events.map((event, index) => {
            const firstPhoto = event.photos[0];
            const morePhotos = event.photos.slice(1);
            return (
              <View
                key={`${event.title}-${index}`}
                style={{
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottomWidth: index < snapshot.events.length - 1 ? 1 : 0,
                  borderBottomColor: exportColors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  {firstPhoto ? (
                    <Image
                      source={{ uri: firstPhoto.uri }}
                      style={{
                        width: EXPORT_EVENT_THUMB_SIZE,
                        height: EXPORT_EVENT_THUMB_SIZE,
                        borderRadius: 8,
                        backgroundColor: exportColors.border,
                      }}
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: exportColors.text }}>
                      {event.title}
                    </Text>
                    {event.lines.map((line) => (
                      <Text
                        key={line}
                        style={{ fontSize: 13, color: exportColors.muted, marginTop: 4 }}
                      >
                        {line}
                      </Text>
                    ))}
                  </View>
                </View>
                {morePhotos.length > 0 ? <ExportPhotoGrid photos={morePhotos} /> : null}
              </View>
            );
          })}
        </View>
      ) : null}

      <Text style={{ fontSize: 12, color: exportColors.muted, marginTop: 24, textAlign: 'center' }}>
        {snapshot.exportedAtLabel}
      </Text>
    </View>
  );
}
