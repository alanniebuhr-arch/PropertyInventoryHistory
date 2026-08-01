import React from 'react';
import { Image, Text, View } from 'react-native';
import type { ProjectExportSnapshot } from '../projectExportContent';
import { ExportPhotoGrid, ExportPhotoNoteText } from './ExportPhotoLayout';

export const PROJECT_EXPORT_WIDTH = 390;
const EXPORT_VENDOR_THUMB_SIZE = Math.round(72 * 1.2);
const EXPORT_PHOTO_SIZE = Math.round(110 * 1.33 * 1.2);

const exportColors = {
  bg: '#f7f5f1',
  text: '#1a1814',
  muted: '#6b6560',
  border: '#d4cfc6',
  section: '#1f5fbf',
};

function ExportRow(props: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 12, color: exportColors.section, fontWeight: '600' }}>
        {props.label}
      </Text>
      <Text style={{ fontSize: 15, color: exportColors.text, marginTop: 2 }}>{props.value}</Text>
    </View>
  );
}

function sheetPhotoGrid(photos: { uri: string; label: string; notes?: string }[]) {
  return (
    <ExportPhotoGrid
      photos={photos}
      photoSize={EXPORT_PHOTO_SIZE}
      mutedColor={exportColors.muted}
      borderColor={exportColors.border}
      textColor={exportColors.text}
    />
  );
}

export function ProjectExportSheet(props: { snapshot: ProjectExportSnapshot }) {
  const { snapshot } = props;

  return (
    <View
      style={{
        width: PROJECT_EXPORT_WIDTH,
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
          <ExportPhotoGrid
            photos={snapshot.photos}
            photoSize={EXPORT_PHOTO_SIZE}
            mutedColor={exportColors.muted}
            borderColor={exportColors.border}
            textColor={exportColors.text}
          />
        </View>
      ) : null}

      {snapshot.vendors.length > 0 ? (
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
            Vendors
          </Text>
          {snapshot.vendors.map((vendor, index) => {
            const firstPhoto = vendor.photos[0];
            const morePhotos = vendor.photos.slice(1);
            return (
              <View
                key={`${vendor.title}-${index}`}
                style={{
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottomWidth: index < snapshot.vendors.length - 1 ? 1 : 0,
                  borderBottomColor: exportColors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  {firstPhoto ? (
                    <Image
                      source={{ uri: firstPhoto.uri }}
                      style={{
                        width: EXPORT_VENDOR_THUMB_SIZE,
                        height: EXPORT_VENDOR_THUMB_SIZE,
                        borderRadius: 8,
                        backgroundColor: exportColors.border,
                      }}
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: exportColors.text }}>
                      {vendor.title}
                    </Text>
                    {vendor.lines.map((line) => (
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
                {vendor.interactions.length > 0 ? (
                  <View style={{ marginTop: 8, gap: 8 }}>
                    {vendor.interactions.map((interaction, interactionIndex) => (
                      <View key={`${interaction.date}-${interactionIndex}`}>
                        <View
                          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              color: exportColors.muted,
                              width: firstPhoto || interaction.date ? EXPORT_VENDOR_THUMB_SIZE : undefined,
                              textAlign: firstPhoto || interaction.date ? 'center' : 'left',
                              flexShrink: 0,
                            }}
                          >
                            {interaction.date}
                          </Text>
                          {interaction.detail ? (
                            <Text
                              style={{
                                fontSize: 13,
                                color: exportColors.muted,
                                flex: 1,
                              }}
                            >
                              {interaction.detail}
                            </Text>
                          ) : (
                            <View style={{ flex: 1 }} />
                          )}
                        </View>
                        {interaction.photos.length > 0 ? sheetPhotoGrid(interaction.photos) : null}
                      </View>
                    ))}
                  </View>
                ) : null}
                {morePhotos.length > 0 ? sheetPhotoGrid(morePhotos) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {(snapshot.punchItems?.length ?? 0) > 0 ? (
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
            Punch list
          </Text>
          {snapshot.punchItems.map((item, index) => (
            <View
              key={`${item.title}-${index}`}
              style={{
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              {item.thumbnailUri ? (
                <Image
                  source={{ uri: item.thumbnailUri }}
                  style={{
                    width: EXPORT_VENDOR_THUMB_SIZE,
                    height: EXPORT_VENDOR_THUMB_SIZE,
                    borderRadius: 8,
                    backgroundColor: exportColors.border,
                  }}
                />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: exportColors.text }}>
                  {item.title}
                </Text>
                {item.lines.map((line) => (
                  <Text
                    key={line}
                    style={{ fontSize: 13, color: exportColors.muted, marginTop: 2 }}
                  >
                    {line}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {(snapshot.recentInteractions?.length ?? 0) > 0 ? (
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
            Recent interactions
          </Text>
          {snapshot.recentInteractions.map((item, index) => (
            <View
              key={`${item.title}-${index}`}
              style={{
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              {item.thumbnailUri ? (
                <Image
                  source={{ uri: item.thumbnailUri }}
                  style={{
                    width: EXPORT_VENDOR_THUMB_SIZE,
                    height: EXPORT_VENDOR_THUMB_SIZE,
                    borderRadius: 8,
                    backgroundColor: exportColors.border,
                  }}
                />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: exportColors.text }}>
                  {item.title}
                </Text>
                {item.lines.map((line) => (
                  <Text
                    key={line}
                    style={{ fontSize: 13, color: exportColors.muted, marginTop: 2 }}
                  >
                    {line}
                  </Text>
                ))}
              </View>
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
