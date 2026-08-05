import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * True in Expo Go / Metro debug builds.
 * False for TestFlight, App Store, and other release/standalone binaries
 * (EAS often reports those as Bare, not Standalone).
 */
export function isDevBuild(): boolean {
  if (Constants.debugMode) return true;
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}
