import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { sharedStyles, colors } from '../theme';

export function EditableApplianceSection(props: {
  title: string;
  isEditing: boolean;
  onPress: () => void;
  onDone?: () => void;
  children: React.ReactNode;
}) {
  const { title, isEditing, onPress, onDone, children } = props;

  if (isEditing) {
    return (
      <View style={sharedStyles.card}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <Text style={[sharedStyles.cardTitle, { marginBottom: 0 }]}>{title}</Text>
          {onDone ? (
            <Pressable onPress={onDone} hitSlop={8}>
              <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '600' }}>Done</Text>
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
      style={({ pressed }) => [sharedStyles.card, pressed && sharedStyles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${title}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={sharedStyles.cardTitle}>{title}</Text>
        <Text style={[sharedStyles.cardMeta, { marginTop: 0, color: colors.primary }]}>Edit</Text>
      </View>
      {children}
    </Pressable>
  );
}
