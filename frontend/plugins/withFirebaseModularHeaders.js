const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf-8');

      if (!podfile.includes('use_modular_headers!')) {
        if (podfile.includes("platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'")) {
          podfile = podfile.replace(
            "platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'",
            "platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'\nuse_modular_headers!"
          );
        } else if (podfile.includes('platform :ios')) {
          podfile = podfile.replace(
            /platform :ios[^\n]*/,
            (match) => `${match}\nuse_modular_headers!`
          );
        } else {
          podfile = `use_modular_headers!\n${podfile}`;
        }
      }

      if (!podfile.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        const snippet = `
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
  end`;

        if (podfile.includes('post_install do |installer|')) {
          podfile = podfile.replace(
            'post_install do |installer|',
            `post_install do |installer|${snippet}`
          );
        } else {
          podfile += `\npost_install do |installer|${snippet}\nend\n`;
        }
      }

      fs.writeFileSync(podfilePath, podfile, 'utf-8');
      return config;
    },
  ]);
};
