import Constants, { ExecutionEnvironment } from 'expo-constants';

/** True in Expo Go / Metro / dev client; false for TestFlight, App Store, and other standalone builds. */
export function isDevBuild(): boolean {
  return Constants.executionEnvironment !== ExecutionEnvironment.Standalone;
}
