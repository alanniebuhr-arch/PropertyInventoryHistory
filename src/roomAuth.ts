import { Alert, AppState, type AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

const unlockedRoomIds = new Set<string>();

export function isRoomUnlocked(roomId: string): boolean {
  return unlockedRoomIds.has(roomId);
}

export function markRoomUnlocked(roomId: string): void {
  unlockedRoomIds.add(roomId);
}

export function clearUnlockedRooms(): void {
  unlockedRoomIds.clear();
}

export function setupRoomAuthSessionReset(): () => void {
  const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState === 'background' || nextState === 'inactive') {
      clearUnlockedRooms();
    }
  });
  return () => subscription.remove();
}

export async function authenticateForRoom(roomName: string): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      Alert.alert(
        'Authentication unavailable',
        'This device does not support biometric or passcode authentication.'
      );
      return false;
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      Alert.alert(
        'Authentication required',
        'Set up Face ID, Touch ID, or a device passcode in your device settings to use protected rooms.'
      );
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Unlock ${roomName}`,
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch {
    Alert.alert('Authentication failed', 'Something went wrong while verifying your identity.');
    return false;
  }
}
