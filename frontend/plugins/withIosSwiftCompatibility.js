const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withIosSwiftCompatibility(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf-8');

      if (podfile.includes('[withIosSwiftCompatibility]')) {
        return config;
      }

      const swiftCompatibilitySnippet = `
  # [withIosSwiftCompatibility] Keep Expo and Pod Swift targets in Swift 5 mode on newer Xcode toolchains
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |build_config|
      build_config.build_settings['SWIFT_VERSION'] = '5.0'
      build_config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
      build_config.build_settings['SWIFT_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
      build_config.build_settings['OTHER_SWIFT_FLAGS'] ||= ['$(inherited)']
      unless build_config.build_settings['OTHER_SWIFT_FLAGS'].include?('-Xfrontend -strict-concurrency=minimal')
        build_config.build_settings['OTHER_SWIFT_FLAGS'] << '-Xfrontend -strict-concurrency=minimal'
      end
    end
  end

  installer.aggregate_targets.each do |aggregate_target|
    aggregate_target.user_project.native_targets.each do |target|
      target.build_configurations.each do |build_config|
        build_config.build_settings['SWIFT_VERSION'] = '5.0'
        build_config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
      end
    end
    aggregate_target.user_project.save
  end`;

      if (podfile.includes('post_install do |installer|')) {
        podfile = podfile.replace(
          'post_install do |installer|',
          `post_install do |installer|${swiftCompatibilitySnippet}`
        );
      } else {
        podfile += `\npost_install do |installer|${swiftCompatibilitySnippet}\nend\n`;
      }

      fs.writeFileSync(podfilePath, podfile, 'utf-8');
      return config;
    },
  ]);
};
