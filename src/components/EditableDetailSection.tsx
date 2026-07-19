import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { sharedStyles } from '../theme';

export function EditableDetailSection(props: {
  title: string;
  isEditing: boolean;
  onPress: () => void;
  onDone?: () => void;
  children: React.ReactNode;
}) {
  const { title, isEditing, onPress, onDone, children } = props;

  if (isEditing) {
    return (
      <View style={sharedStyles.catalogSection}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>{title}</Text>
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>{title}</Text>
        <Text style={sharedStyles.textLink}>Edit</Text>
      </View>
      <View style={{ marginTop: 10 }}>{children}</View>
    </Pressable>
  );
}

/** @deprecated Use EditableDetailSection */
export const EditableApplianceSection = EditableDetailSection;
