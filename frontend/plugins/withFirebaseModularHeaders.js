const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Adds a post_install hook to the Podfile that disables
 * -Wnon-modular-include-in-framework-module for all pods.
 * Required for @react-native-firebase with useFrameworks: "static" on Expo SDK 55.
 */
module.exports = function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      let podfile = fs.readFileSync(podfilePath, "utf-8");

      const snippet = `
  # Fix non-modular header error for Firebase pods
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
  end`;

      // Only add if not already present
      if (!podfile.includes("CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES")) {
        // Insert into existing post_install or create one
        if (podfile.includes("post_install do |installer|")) {
          podfile = podfile.replace(
            "post_install do |installer|",
            `post_install do |installer|${snippet}`
          );
        } else {
          podfile += `\npost_install do |installer|${snippet}\nend\n`;
        }
        fs.writeFileSync(podfilePath, podfile, "utf-8");
      }

      return config;
    },
  ]);
};
