import React from 'react';
import { Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../textScale';
import { colors, sharedStyles } from '../theme';
import type { ShareFormat } from '../shareFormat';
import type { SharePhotoMode } from '../sharePhotoMode';
import { ShareFormatOptions } from './ShareFormatOptions';
import { SharePhotoModeOptions } from './SharePhotoModeOptions';

/** Share sheet: optional All/Favorites photos + PNG/PDF format (Item / Event). */
export function SharePhotoModeModal(props: {
  visible: boolean;
  title: string;
  photoMode: SharePhotoMode;
  onChangePhotoMode: (mode: SharePhotoMode) => void;
  /** When false, only format is shown (no favorite photos on this entity). */
  showPhotoMode?: boolean;
  shareFormat: ShareFormat;
  onChangeShareFormat: (format: ShareFormat) => void;
  onShare: () => void;
  onClose: () => void;
}) {
  const {
    visible,
    title,
    photoMode,
    onChangePhotoMode,
    showPhotoMode = true,
    shareFormat,
    onChangeShareFormat,
    onShare,
    onClose,
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
          <Text style={[sharedStyles.cardMeta, { marginBottom: 8 }]}>
            {showPhotoMode
              ? 'Choose which photos to include, then image or PDF.'
              : 'Choose image or PDF for the shared summary.'}
          </Text>

          {showPhotoMode ? (
            <SharePhotoModeOptions value={photoMode} onChange={onChangePhotoMode} />
          ) : null}

          <ShareFormatOptions value={shareFormat} onChange={onChangeShareFormat} />

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
