import React from 'react';
import { Image, Text, View } from 'react-native';
import type { PropertyExportListItem, PropertyExportSnapshot } from '../propertyExportContent';
import { ExportPhotoGrid } from './ExportPhotoLayout';

export const PROPERTY_EXPORT_WIDTH = 390;
const EXPORT_LIST_THUMB_SIZE = 72;
const EXPORT_PHOTO_SIZE = Math.round(110 * 1.5);

const exportColors = {
  bg: '#f7f5f1',
  text: '#1a1814',
  muted: '#6b6560',
  border: '#d4cfc6',
  section: '#2c2824',
};

function ExportListSection(props: {
  title: string;
  items: PropertyExportListItem[];
}) {
  const { title, items } = props;
  if (items.length === 0) return null;

  return (
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
        {title}
      </Text>
      {items.map((item, index) => (
        <View
          key={`${item.title}-${index}`}
          style={{
            marginBottom: 16,
            paddingBottom: 12,
            borderBottomWidth: index < items.length - 1 ? 1 : 0,
            borderBottomColor: exportColors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            {item.thumbnailUri ? (
              <Image
                source={{ uri: item.thumbnailUri }}
                style={{
                  width: EXPORT_LIST_THUMB_SIZE,
                  height: EXPORT_LIST_THUMB_SIZE,
                  borderRadius: 8,
                  backgroundColor: exportColors.border,
                }}
              />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: exportColors.text }}>
                {item.title}
              </Text>
              {item.lines.map((line, lineIndex) => (
                <Text
                  key={`${item.title}-${lineIndex}`}
                  style={{ fontSize: 13, color: exportColors.muted, marginTop: 4 }}
                >
                  {line}
                </Text>
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function PropertyExportSheet(props: { snapshot: PropertyExportSnapshot }) {
  const { snapshot } = props;

  return (
    <View
      style={{
        width: PROPERTY_EXPORT_WIDTH,
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
            Favorite photos
          </Text>
          <ExportPhotoGrid
            photos={snapshot.photos}
            photoSize={EXPORT_PHOTO_SIZE}
            mutedColor={exportColors.muted}
            borderColor={exportColors.border}
            textColor={exportColors.text}
          />
        </View>
      ) : null}

      <ExportListSection title="Reminders" items={snapshot.services} />
      <ExportListSection title="Rooms" items={snapshot.rooms} />
      <ExportListSection title="Projects" items={snapshot.projects} />
      <ExportListSection title="To do" items={snapshot.todos} />
      <ExportListSection title="Ideas" items={snapshot.ideas} />

      <Text style={{ fontSize: 12, color: exportColors.muted, marginTop: 24, textAlign: 'center' }}>
        {snapshot.exportedAtLabel}
      </Text>
    </View>
  );
}
