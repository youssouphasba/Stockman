const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MIN_IOS_DEPLOYMENT_TARGET = '15.1';

/**
 * Recent Xcode versions refuse to build any target whose deployment target is
 * below the minimum supported by the SDK. Several pods (SDWebImage, RevenueCat,
 * GoogleSignIn, nanopb, ...) still declare iOS 9 to 13. This plugin raises every
 * pod target below the app minimum to that minimum in a post_install step.
 */
module.exports = function withIosMinDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf-8');

      if (podfile.includes('[withIosMinDeploymentTarget]')) {
        return config;
      }

      const snippet = `
  # [withIosMinDeploymentTarget] Raise pod targets that declare an iOS version older than the app minimum
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |build_config|
      current_target = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      if current_target.nil? || Gem::Version.new(current_target.to_s) < Gem::Version.new('${MIN_IOS_DEPLOYMENT_TARGET}')
        build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_IOS_DEPLOYMENT_TARGET}'
      end
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

      fs.writeFileSync(podfilePath, podfile, 'utf-8');
      return config;
    },
  ]);
};
