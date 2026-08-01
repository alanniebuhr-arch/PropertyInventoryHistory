import React from 'react';
import { Image, Text, View } from 'react-native';
import type { ServicesExportSnapshot } from '../servicesExportContent';
import { ExportPhotoGrid, ExportPhotoNoteText } from './ExportPhotoLayout';

export const SERVICES_EXPORT_WIDTH = 390;
const EXPORT_SERVICE_THUMB_SIZE = 72;
const EXPORT_PHOTO_SIZE = Math.round(110 * 1.33);

const exportColors = {
  bg: '#f7f5f1',
  text: '#1a1814',
  muted: '#6b6560',
  border: '#d4cfc6',
};

export function ServicesExportSheet(props: { snapshot: ServicesExportSnapshot }) {
  const { snapshot } = props;

  return (
    <View
      style={{
        width: SERVICES_EXPORT_WIDTH,
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

      {snapshot.services.length === 0 ? (
        <Text style={{ fontSize: 15, color: exportColors.muted, marginTop: 24 }}>
          No services to share.
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
          {snapshot.services.map((service, index) => {
            const firstPhoto = service.photos[0];
            const morePhotos = service.photos.slice(1);
            return (
              <View
                key={`${service.title}-${index}`}
                style={{
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottomWidth: index < snapshot.services.length - 1 ? 1 : 0,
                  borderBottomColor: exportColors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  {firstPhoto ? (
                    <Image
                      source={{ uri: firstPhoto.uri }}
                      style={{
                        width: EXPORT_SERVICE_THUMB_SIZE,
                        height: EXPORT_SERVICE_THUMB_SIZE,
                        borderRadius: 8,
                        backgroundColor: exportColors.border,
                      }}
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: exportColors.text }}>
                      {service.title}
                    </Text>
                    {service.lines.map((line) => (
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
                {morePhotos.length > 0 ? (
                  <ExportPhotoGrid
                    photos={morePhotos}
                    photoSize={EXPORT_PHOTO_SIZE}
                    mutedColor={exportColors.muted}
                    borderColor={exportColors.border}
                    textColor={exportColors.text}
                  />
                ) : null}
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
