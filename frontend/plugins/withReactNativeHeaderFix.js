const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin: Fix for DebugStringConvertible.h not found
 * 
 * Issue: https://github.com/expo/expo/issues/44515
 * 
 * When using `useFrameworks: "static"` with React Native 0.83+,
 * the HEADER_SEARCH_PATHS for React-rendererdebug and other pods
 * don't include the ReactCommon directory, causing compilation to fail
 * with "'react/renderer/debug/DebugStringConvertible.h' file not found".
 * 
 * This plugin injects the correct header search paths via a post_install hook.
 */
module.exports = function withReactNativeHeaderFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf-8');

      const headerFixSnippet = `
  # [withReactNativeHeaderFix] Fix DebugStringConvertible.h not found (Expo #44515)
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |build_config|
      build_config.build_settings['HEADER_SEARCH_PATHS'] ||= ['$(inherited)']

      # Add ReactCommon path for renderer debug headers
      build_config.build_settings['HEADER_SEARCH_PATHS'] << '"$(PODS_ROOT)/../../node_modules/react-native/ReactCommon"'

      # Add direct pod header paths that may be missing with static frameworks
      build_config.build_settings['HEADER_SEARCH_PATHS'] << '"$(PODS_ROOT)/Headers/Public/React-rendererdebug"'
      build_config.build_settings['HEADER_SEARCH_PATHS'] << '"$(PODS_ROOT)/Headers/Public/React-graphics"'
      build_config.build_settings['HEADER_SEARCH_PATHS'] << '"$(PODS_ROOT)/Headers/Public/React-Fabric"'
      build_config.build_settings['HEADER_SEARCH_PATHS'] << '"$(PODS_ROOT)/Headers/Public/React-utils"'
      build_config.build_settings['HEADER_SEARCH_PATHS'] << '"$(PODS_ROOT)/Headers/Public/ReactCommon"'
      build_config.build_settings['HEADER_SEARCH_PATHS'] << '"$(PODS_ROOT)/Headers/Public/React-Core"'
      build_config.build_settings['HEADER_SEARCH_PATHS'] << '"$(PODS_ROOT)/Headers/Private/React-Core"'
    end
  end`;

      // Check if already injected
      if (podfile.includes('[withReactNativeHeaderFix]')) {
        return config;
      }

      // Inject into existing post_install block
      if (podfile.includes('post_install do |installer|')) {
        podfile = podfile.replace(
          'post_install do |installer|',
          `post_install do |installer|${headerFixSnippet}`
        );
      } else {
        // Create a new post_install block
        podfile += `\npost_install do |installer|${headerFixSnippet}\nend\n`;
      }

      fs.writeFileSync(podfilePath, podfile, 'utf-8');
      return config;
    },
  ]);
};
