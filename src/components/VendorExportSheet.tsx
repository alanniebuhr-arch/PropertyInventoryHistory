import React from 'react';
import { Image, Text, View } from 'react-native';
import type { VendorExportSnapshot } from '../vendorExportContent';
import { ExportPhotoGrid, ExportPhotoNoteText } from './ExportPhotoLayout';

export const VENDOR_EXPORT_WIDTH = 390;
const EXPORT_INTERACTION_THUMB_SIZE = 72;
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
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 12, color: exportColors.muted, fontWeight: '600' }}>
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

export function VendorExportSheet(props: { snapshot: VendorExportSnapshot }) {
  const { snapshot } = props;

  return (
    <View
      style={{
        width: VENDOR_EXPORT_WIDTH,
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
          {sheetPhotoGrid(snapshot.photos)}
        </View>
      ) : null}

      {snapshot.interactions.length > 0 ? (
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
            Interaction history
          </Text>
          {snapshot.interactions.map((interaction, index) => {
            const firstPhoto = interaction.photos[0];
            const morePhotos = interaction.photos.slice(1);
            return (
              <View
                key={`${interaction.title}-${index}`}
                style={{
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottomWidth: index < snapshot.interactions.length - 1 ? 1 : 0,
                  borderBottomColor: exportColors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  {firstPhoto ? (
                    <Image
                      source={{ uri: firstPhoto.uri }}
                      style={{
                        width: EXPORT_INTERACTION_THUMB_SIZE,
                        height: EXPORT_INTERACTION_THUMB_SIZE,
                        borderRadius: 8,
                        backgroundColor: exportColors.border,
                      }}
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: exportColors.text }}>
                      {interaction.title}
                    </Text>
                    {interaction.lines.map((line) => (
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
                {morePhotos.length > 0 ? sheetPhotoGrid(morePhotos) : null}
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
