module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Must be listed last. Required for release/TestFlight builds that use Reanimated.
    plugins: ['react-native-reanimated/plugin'],
  };
};
