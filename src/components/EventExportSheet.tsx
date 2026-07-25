import React from 'react';
import { Image, Text, View } from 'react-native';
import type { EventExportSnapshot } from '../eventExportContent';

export const EVENT_EXPORT_WIDTH = 390;
const EXPORT_PHOTO_SIZE = Math.round(110 * 1.33);

const exportColors = {
  bg: '#f7f5f1',
  text: '#1a1814',
  muted: '#6b6560',
  border: '#d4cfc6',
  section: '#2c2824',
};

function ExportRow(props: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
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

export function EventExportSheet(props: { snapshot: EventExportSnapshot }) {
  const { snapshot } = props;

  return (
    <View
      collapsable={false}
      style={{
        width: EVENT_EXPORT_WIDTH,
        backgroundColor: exportColors.bg,
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 32,
      }}
    >
      <Text style={{ fontSize: 11, color: exportColors.muted, fontWeight: '600', letterSpacing: 0.8 }}>
        SERVICE EVENT
      </Text>
      <Text
        style={{
          fontSize: 24,
          fontWeight: '700',
          color: exportColors.text,
          marginTop: 6,
          letterSpacing: -0.3,
        }}
      >
        {snapshot.title}
      </Text>
      <Text style={{ fontSize: 15, color: exportColors.section, fontWeight: '600', marginTop: 4 }}>
        {snapshot.subtitle}
      </Text>
      {snapshot.metaLines.map((line) => (
        <Text key={line} style={{ fontSize: 13, color: exportColors.muted, marginTop: 2 }}>
          {line}
        </Text>
      ))}

      <View
        style={{
          marginTop: 20,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: exportColors.border,
        }}
      >
        {snapshot.rows.map((entry) => (
          <ExportRow key={entry.label} label={entry.label} value={entry.value} />
        ))}
        {snapshot.scheduleLine ? (
          <ExportRow label="Schedule" value={snapshot.scheduleLine} />
        ) : null}
      </View>

      {snapshot.photos.length > 0 ? (
        <View
          style={{
            marginTop: 12,
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

      <Text style={{ fontSize: 12, color: exportColors.muted, marginTop: 24, textAlign: 'center' }}>
        {snapshot.exportedAtLabel}
      </Text>
    </View>
  );
}
