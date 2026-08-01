import React from 'react';
import { Image, Text, View } from 'react-native';
import type { AssetsExportSnapshot } from '../assetsExportContent';
import { ExportPhotoNoteText } from './ExportPhotoLayout';

export const ASSETS_EXPORT_WIDTH = 390;
const EXPORT_ASSET_THUMB_SIZE = 72;

const exportColors = {
  bg: '#f7f5f1',
  text: '#1a1814',
  muted: '#6b6560',
  border: '#d4cfc6',
};

export function AssetsExportSheet(props: { snapshot: AssetsExportSnapshot }) {
  const { snapshot } = props;

  return (
    <View
      style={{
        width: ASSETS_EXPORT_WIDTH,
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

      {snapshot.assets.length === 0 ? (
        <Text style={{ fontSize: 15, color: exportColors.muted, marginTop: 24 }}>
          No assets to share.
        </Text>
      ) : (
        <View
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: exportColors.border,
          }}
        >
          {snapshot.assets.map((asset, index) => {
            const firstPhoto = asset.photos[0];
            return (
              <View
                key={`${asset.title}-${index}`}
                style={{
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottomWidth: index < snapshot.assets.length - 1 ? 1 : 0,
                  borderBottomColor: exportColors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  {firstPhoto ? (
                    <Image
                      source={{ uri: firstPhoto.uri }}
                      style={{
                        width: EXPORT_ASSET_THUMB_SIZE,
                        height: EXPORT_ASSET_THUMB_SIZE,
                        borderRadius: 8,
                        backgroundColor: exportColors.border,
                      }}
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: exportColors.text }}>
                      {asset.title}
                    </Text>
                    {asset.lines.map((line) => (
                      <Text
                        key={line}
                        style={{ fontSize: 13, color: exportColors.muted, marginTop: 4 }}
                      >
                        {line}
                      </Text>
                    ))}
                    <ExportPhotoNoteText notes={firstPhoto?.notes} color={exportColors.text} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Text style={{ fontSize: 12, color: exportColors.muted, marginTop: 24, textAlign: 'center' }}>
        {snapshot.exportedAtLabel}
      </Text>
    </View>
  );
}
