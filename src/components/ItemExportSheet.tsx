import React from 'react';
import { Image, Text, View } from 'react-native';
import type { ItemExportSnapshot } from '../itemExportContent';

export const ITEM_EXPORT_WIDTH = 390;
const EXPORT_PHOTO_SIZE = Math.round(110 * 1.33);

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

function ExportPhotoGrid(props: { photos: { uri: string; label: string }[] }) {
  const { photos } = props;
  if (photos.length === 0) return null;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
      {photos.map((photo, index) => (
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
          {snapshot.events.map((event, index) => (
            <View
              key={`${event.title}-${index}`}
              style={{
                marginBottom: 16,
                paddingBottom: 12,
                borderBottomWidth: index < snapshot.events.length - 1 ? 1 : 0,
                borderBottomColor: exportColors.border,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: exportColors.text }}>
                {event.title}
              </Text>
              {event.lines.map((line) => (
                <Text key={line} style={{ fontSize: 13, color: exportColors.muted, marginTop: 4 }}>
                  {line}
                </Text>
              ))}
              <ExportPhotoGrid photos={event.photos} />
            </View>
          ))}
        </View>
      ) : null}

      <Text style={{ fontSize: 12, color: exportColors.muted, marginTop: 24, textAlign: 'center' }}>
        {snapshot.exportedAtLabel}
      </Text>
    </View>
  );
}
