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
  onSave?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  onRemoveSlot?: () => void;
  slotLabel?: string;
}) {
  const {
    onRename,
    onSave,
    onShare,
    onDelete,
    onRemoveSlot,
    slotLabel = 'photo',
  } = options;
  const buttons: {
    text: string;
    style?: 'cancel' | 'destructive';
    onPress?: () => void;
  }[] = [];

  if (onRename) {
    buttons.push({ text: 'Edit label & notes', onPress: onRename });
  }
  if (onSave) {
    buttons.push({ text: 'Save', onPress: onSave });
  }
  if (onShare) {
    buttons.push({ text: 'Share', onPress: onShare });
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
  buttons.push({ text: 'Done', style: 'cancel' });

  if (!onRename && !onSave && !onShare && onDelete && !onRemoveSlot) {
    confirmDeletePhoto(onDelete);
    return;
  }
  if (!onRename && !onSave && !onShare && !onDelete && onRemoveSlot) {
    confirmRemovePhotoSlot(slotLabel, onRemoveSlot);
    return;
  }

  Alert.alert('Photo', undefined, buttons);
}
