import React from 'react';
import { Text, View } from 'react-native';
import type { InteractionExportSnapshot } from '../interactionExportContent';
import { ExportAspectPhoto } from './ExportPhotoLayout';

export const INTERACTION_EXPORT_WIDTH = 390;
const EXPORT_CONTENT_WIDTH = INTERACTION_EXPORT_WIDTH - 48;
const EXPORT_PHOTO_MAX_HEIGHT = 480;

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

export function InteractionExportSheet(props: { snapshot: InteractionExportSnapshot }) {
  const { snapshot } = props;

  return (
    <View
      collapsable={false}
      style={{
        width: INTERACTION_EXPORT_WIDTH,
        backgroundColor: exportColors.bg,
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 32,
      }}
    >
      <Text style={{ fontSize: 11, color: exportColors.muted, fontWeight: '600', letterSpacing: 0.8 }}>
        INTERACTION
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
          <View style={{ marginTop: 8 }}>
            {snapshot.photos.map((photo, index) => (
              <ExportAspectPhoto
                key={`${photo.uri}-${index}`}
                photo={photo}
                contentWidth={EXPORT_CONTENT_WIDTH}
                maxHeight={EXPORT_PHOTO_MAX_HEIGHT}
                mutedColor={exportColors.muted}
                borderColor={exportColors.border}
                textColor={exportColors.text}
              />
            ))}
          </View>
        </View>
      ) : null}

      <Text style={{ fontSize: 12, color: exportColors.muted, marginTop: 24, textAlign: 'center' }}>
        {snapshot.exportedAtLabel}
      </Text>
    </View>
  );
}
