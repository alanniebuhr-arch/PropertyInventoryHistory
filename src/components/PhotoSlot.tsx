import { Text } from 'react-native';
import { colors } from '../theme';

export function AddPhotoPlaceholder(props: { size?: number }) {
  const size = props.size ?? 32;
  return (
    <Text style={{ fontSize: size, lineHeight: size, color: colors.textMuted, fontWeight: '300' }}>
      +
    </Text>
  );
}
