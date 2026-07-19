import { Alert } from 'react-native';

export function confirmDeletePhoto(onDelete: () => void) {
  Alert.alert('Delete photo?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onDelete },
  ]);
}

export function showLabeledPhotoThumbActions(options: {
  onRename?: () => void;
  onDelete: () => void;
}) {
  const { onRename, onDelete } = options;
  if (onRename) {
    Alert.alert('Photo', undefined, [
      { text: 'Edit label & notes', onPress: onRename },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDeletePhoto(onDelete) },
      { text: 'Cancel', style: 'cancel' },
    ]);
    return;
  }
  confirmDeletePhoto(onDelete);
}
