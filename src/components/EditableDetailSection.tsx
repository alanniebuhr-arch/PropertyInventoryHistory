import React from 'react';
import { Pressable, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '../textScale';
import { sharedStyles, colors } from '../theme';
import { collapsedSectionLabel } from '../utils';

export function EditableDetailSection(props: {
  title: string;
  isEditing: boolean;
  onPress: () => void;
  onDone?: () => void;
  onShare?: () => void;
  shareDisabled?: boolean;
  /** When true, show a pencil icon instead of the "Edit" text link. */
  useEditIcon?: boolean;
  /** When set with onToggleExpanded, show expand/collapse (same pattern as project punch list). */
  expanded?: boolean;
  onToggleExpanded?: () => void;
  /** Prefer true when the section has content worth collapsing. */
  showExpandControl?: boolean;
  /** When collapsed, show (N) if count > 0. Defaults to 1 when showExpandControl is true. */
  itemCount?: number;
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
    expanded = true,
    onToggleExpanded,
    showExpandControl = false,
    itemCount,
    children,
  } = props;

  const collapsedCount = itemCount ?? (showExpandControl ? 1 : 0);
  const displayTitle =
    !isEditing && showExpandControl
      ? collapsedSectionLabel(title, expanded, collapsedCount)
      : title;
  const canExpandFromHeading =
    showExpandControl && !expanded && collapsedCount > 0 && onToggleExpanded != null;

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

  const expandControl =
    showExpandControl && onToggleExpanded ? (
      <Pressable
        onPress={(e) => {
          e?.stopPropagation?.();
          onToggleExpanded();
        }}
        accessibilityRole="button"
        accessibilityLabel={expanded ? `Hide ${title}` : `Show ${title}`}
        accessibilityState={{ expanded }}
        hitSlop={6}
        style={({ pressed }) => ({
          padding: 4,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <MaterialIcons
          name={expanded ? 'expand-less' : 'expand-more'}
          size={24}
          color={colors.primary}
        />
      </Pressable>
    ) : null;

  const editControl = useEditIcon ? (
    <MaterialIcons name="edit" size={22} color={colors.primary} />
  ) : (
    <Text style={sharedStyles.textLink}>Edit</Text>
  );

  const showBody = isEditing || expanded || !showExpandControl;
  const hasBodyContent = React.Children.toArray(children).length > 0;

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {onDone ? (
              <Pressable onPress={onDone} hitSlop={8}>
                <Text style={sharedStyles.textLink}>Done</Text>
              </Pressable>
            ) : null}
            {expandControl}
          </View>
        </View>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPress={canExpandFromHeading ? onToggleExpanded : onPress}
      style={({ pressed }) => [sharedStyles.catalogSection, pressed && sharedStyles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={canExpandFromHeading ? `Show ${title}` : `Edit ${title}`}
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
            {displayTitle}
          </Text>
          {shareButton}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${title}`}
            hitSlop={8}
            style={({ pressed }) => ({
              padding: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {editControl}
          </Pressable>
          {expandControl}
        </View>
      </View>
      {showBody && hasBodyContent ? <View style={{ marginTop: 10 }}>{children}</View> : null}
    </Pressable>
  );
}
