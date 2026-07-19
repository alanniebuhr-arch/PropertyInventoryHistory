import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ItemTypeId } from '../types';
import { ITEM_CATALOG } from '../itemCatalog';
import { sharedStyles, colors } from '../theme';

export function ItemTypePickerModal(props: {
  visible: boolean;
  onSelect: (itemTypeId: ItemTypeId) => void;
  onClose: () => void;
}) {
  const { visible, onSelect, onClose } = props;
  const insets = useSafeAreaInsets();

  const sortedCatalog = useMemo(
    () => [...ITEM_CATALOG].sort((a, b) => a.label.localeCompare(b.label)),
    []
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            padding: 20,
            paddingBottom: insets.bottom + 20,
            maxHeight: '80%',
          }}
          onPress={() => {}}
        >
          <Text style={sharedStyles.sectionTitle}>Item type</Text>
          <ScrollView>
            {sortedCatalog.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => onSelect(entry.id)}
                style={({ pressed }) => [sharedStyles.card, pressed && sharedStyles.cardPressed]}
              >
                <Text style={sharedStyles.cardTitle}>{entry.label}</Text>
                {entry.defaultRecurrenceHint ? (
                  <Text style={sharedStyles.cardMeta}>{entry.defaultRecurrenceHint}</Text>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
