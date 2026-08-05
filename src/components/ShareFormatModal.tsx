import React from 'react';
import { Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../textScale';
import { colors, sharedStyles } from '../theme';
import { DEFAULT_SHARE_FORMATS, type ShareFormat } from '../shareFormat';
import { ShareFormatOptions } from './ShareFormatOptions';

function formatHint(formats: ShareFormat[]): string {
  const hasText = formats.includes('text');
  if (hasText) return 'Choose image, PDF, or clipboard for the shared summary.';
  return 'Choose image or PDF for the shared summary.';
}

/** Share sheet: PNG / PDF by default; screens may opt into Text via `formats`. */
export function ShareFormatModal(props: {
  visible: boolean;
  title: string;
  shareFormat: ShareFormat;
  onChangeShareFormat: (format: ShareFormat) => void;
  onShare: () => void;
  onClose: () => void;
  formats?: ShareFormat[];
}) {
  const {
    visible,
    title,
    shareFormat,
    onChangeShareFormat,
    onShare,
    onClose,
    formats = DEFAULT_SHARE_FORMATS,
  } = props;
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: colors.border,
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: insets.bottom + 20,
          }}
          onPress={() => {}}
        >
          <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>{title}</Text>
          <Text style={[sharedStyles.cardMeta, { marginBottom: 8 }]}>{formatHint(formats)}</Text>

          <ShareFormatOptions
            value={shareFormat}
            onChange={onChangeShareFormat}
            formats={formats}
          />

          <Pressable
            onPress={onShare}
            style={({ pressed }) => [
              sharedStyles.primaryBtn,
              { marginTop: 16 },
              pressed && sharedStyles.primaryBtnPressed,
            ]}
          >
            <Text style={sharedStyles.primaryBtnText}>Share</Text>
          </Pressable>
          <Pressable onPress={onClose} style={sharedStyles.secondaryBtn}>
            <Text style={sharedStyles.secondaryBtnText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
