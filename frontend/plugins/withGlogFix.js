const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin: Fix glog 'config.h' not found on iOS
 *
 * When using useFrameworks: "static", glog's configure script does not run
 * automatically, so config.h is never generated. This plugin injects a
 * post_install step that runs the configure script inside the glog pod.
 */
module.exports = function withGlogFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf-8');

      // Already injected?
      if (podfile.includes('[withGlogFix]')) {
        return config;
      }

      const glogFixSnippet = `
  # [withGlogFix] Generate glog config.h that is missing with static frameworks
  glog_pod_dir = File.join(installer.sandbox.root, 'glog')
  if File.exist?(glog_pod_dir)
    glog_config_h = File.join(glog_pod_dir, 'src', 'config.h')
    unless File.exist?(glog_config_h)
      system("cd \\"#{glog_pod_dir}\\" && env -i PATH=\\"/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin\\" sh -c \\"./configure --host arm-apple-darwin\\"")
    end
  end`;

      if (podfile.includes('post_install do |installer|')) {
        podfile = podfile.replace(
          'post_install do |installer|',
          `post_install do |installer|${glogFixSnippet}`
        );
      } else {
        podfile += `\npost_install do |installer|${glogFixSnippet}\nend\n`;
      }

      fs.writeFileSync(podfilePath, podfile, 'utf-8');
      return config;
    },
  ]);
};
