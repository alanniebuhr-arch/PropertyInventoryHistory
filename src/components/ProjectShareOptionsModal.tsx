import React from 'react';
import { Modal, Pressable, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../textScale';
import { colors, sharedStyles } from '../theme';
import {
  PROJECT_SHARE_SECTION_OPTIONS,
  type ProjectExportInclude,
  type ProjectExportSectionKey,
} from '../projectExportContent';

export function ProjectShareOptionsModal(props: {
  visible: boolean;
  include: ProjectExportInclude;
  onChangeInclude: (next: ProjectExportInclude) => void;
  onShare: () => void;
  onClose: () => void;
}) {
  const { visible, include, onChangeInclude, onShare, onClose } = props;
  const insets = useSafeAreaInsets();
  const anySelected = PROJECT_SHARE_SECTION_OPTIONS.some((opt) => include[opt.key]);

  function toggle(key: ProjectExportSectionKey, value: boolean) {
    onChangeInclude({ ...include, [key]: value });
  }

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
          <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>Share project</Text>
          <Text style={[sharedStyles.cardMeta, { marginBottom: 12 }]}>
            Choose which sections to include in the shared image.
          </Text>

          {PROJECT_SHARE_SECTION_OPTIONS.map((opt) => (
            <View
              key={opt.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                gap: 12,
              }}
            >
              <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>{opt.label}</Text>
              <Switch
                value={include[opt.key]}
                onValueChange={(value) => toggle(opt.key, value)}
                accessibilityLabel={opt.label}
              />
            </View>
          ))}

          <Pressable
            onPress={onShare}
            disabled={!anySelected}
            style={({ pressed }) => [
              sharedStyles.primaryBtn,
              { marginTop: 16 },
              pressed && anySelected && sharedStyles.primaryBtnPressed,
              !anySelected && { opacity: 0.5 },
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
