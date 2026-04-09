const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf-8');

      if (!podfile.includes('$RNFirebaseAsStaticFramework = true')) {
        podfile = `$RNFirebaseAsStaticFramework = true\n${podfile}`;
      }

      const firebasePodsSnippet = `
  pod 'GoogleUtilities', :modular_headers => true
  pod 'Firebase', :modular_headers => true
  pod 'FirebaseCoreInternal', :modular_headers => true
  pod 'FirebaseCore', :modular_headers => true
  pod 'FirebaseCoreExtension', :modular_headers => true
  pod 'FirebaseAppCheckInterop', :modular_headers => true
  pod 'FirebaseAuth', :modular_headers => true
  pod 'FirebaseAuthInterop', :modular_headers => true
  pod 'RecaptchaInterop', :modular_headers => true`;

      if (!podfile.includes("pod 'FirebaseAuth', :modular_headers => true")) {
        podfile = podfile.replace(
          /target ['"][^'"]+['"] do\s*\n/,
          (match) => `${match}${firebasePodsSnippet}\n`
        );
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
