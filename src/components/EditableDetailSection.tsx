import React from 'react';
import { Pressable, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '../textScale';
import { sharedStyles, colors } from '../theme';

export function EditableDetailSection(props: {
  title: string;
  isEditing: boolean;
  onPress: () => void;
  onDone?: () => void;
  onShare?: () => void;
  shareDisabled?: boolean;
  /** When true, show a pencil icon instead of the "Edit" text link. */
  useEditIcon?: boolean;
  children: React.ReactNode;
}) {
  const {
    title,
    isEditing,
    onPress,
    onDone,
    onShare,
    shareDisabled,
    useEditIcon,
    children,
  } = props;

  const shareButton =
    onShare != null ? (
      <Pressable
        onPress={(e) => {
          e?.stopPropagation?.();
          if (!shareDisabled) onShare();
        }}
        disabled={shareDisabled}
        accessibilityRole="button"
        accessibilityLabel={`Share ${title}`}
        hitSlop={8}
        style={({ pressed }) => ({
          padding: 4,
          opacity: shareDisabled ? 0.5 : pressed ? 0.7 : 1,
        })}
      >
        <MaterialIcons name="ios-share" size={22} color={colors.primary} />
      </Pressable>
    ) : null;

  const editControl = useEditIcon ? (
    <MaterialIcons name="edit" size={22} color={colors.primary} />
  ) : (
    <Text style={sharedStyles.textLink}>Edit</Text>
  );

  if (isEditing) {
    return (
      <View style={sharedStyles.catalogSection}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
            gap: 8,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0, flexShrink: 1 }]}>
              {title}
            </Text>
            {shareButton}
          </View>
          {onDone ? (
            <Pressable onPress={onDone} hitSlop={8}>
              <Text style={sharedStyles.textLink}>Done</Text>
            </Pressable>
          ) : null}
        </View>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sharedStyles.catalogSection, pressed && sharedStyles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${title}`}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0, flexShrink: 1 }]}>
            {title}
          </Text>
          {shareButton}
        </View>
        {editControl}
      </View>
      <View style={{ marginTop: 10 }}>{children}</View>
    </Pressable>
  );
}
