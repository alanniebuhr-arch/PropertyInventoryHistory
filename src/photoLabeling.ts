import { Alert } from 'react-native';

export function confirmDeletePhoto(onDelete: () => void) {
  Alert.alert('Delete photo?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onDelete },
  ]);
}

export function confirmRemovePhotoSlot(slotLabel: string, onRemove: () => void) {
  Alert.alert(
    `Remove ${slotLabel} slot?`,
    'Any photo or document in this slot will be deleted. The placeholder will not show until you restore removed slots.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove slot', style: 'destructive', onPress: onRemove },
    ]
  );
}

export function showLabeledPhotoThumbActions(options: {
  onRename?: () => void;
  onDelete?: () => void;
  onRemoveSlot?: () => void;
  slotLabel?: string;
}) {
  const { onRename, onDelete, onRemoveSlot, slotLabel = 'photo' } = options;
  const buttons: {
    text: string;
    style?: 'cancel' | 'destructive';
    onPress?: () => void;
  }[] = [];

  if (onRename) {
    buttons.push({ text: 'Edit label & notes', onPress: onRename });
  }
  if (onDelete) {
    buttons.push({
      text: 'Delete',
      style: 'destructive',
      onPress: () => confirmDeletePhoto(onDelete),
    });
  }
  if (onRemoveSlot) {
    buttons.push({
      text: 'Remove slot',
      style: 'destructive',
      onPress: () => confirmRemovePhotoSlot(slotLabel, onRemoveSlot),
    });
  }
  buttons.push({ text: 'Cancel', style: 'cancel' });

  if (!onRename && onDelete && !onRemoveSlot) {
    confirmDeletePhoto(onDelete);
    return;
  }
  if (!onRename && !onDelete && onRemoveSlot) {
    confirmRemovePhotoSlot(slotLabel, onRemoveSlot);
    return;
  }

  Alert.alert('Photo', undefined, buttons);
}
