const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withExpoDevLauncherBuildFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot =
        config.modRequest.projectRoot ||
        path.resolve(config.modRequest.platformProjectRoot, '..');
      const controllerPath = path.join(
        projectRoot,
        'node_modules',
        'expo-dev-launcher',
        'ios',
        'EXDevLauncherController.m'
      );

      if (!fs.existsSync(controllerPath)) {
        return config;
      }

      let source = fs.readFileSync(controllerPath, 'utf-8');

      if (source.includes('[withExpoDevLauncherBuildFix]')) {
        return config;
      }

      const privateBridgeImport = '#import <React/RCTBridge+Private.h>';
      if (!source.includes(privateBridgeImport)) {
        const importAnchor = '#import <React/RCTRootView.h>';
        if (!source.includes(importAnchor)) {
          throw new Error('Impossible d ajouter l import RCTBridge+Private.h dans EXDevLauncherController.m.');
        }

        source = source.replace(
          importAnchor,
          `${importAnchor}\n${privateBridgeImport}`
        );
      }

      const originalBridgeLine = '[manager updateCurrentBridge:self.appBridge];';
      if (!source.includes(originalBridgeLine)) {
        return config;
      }

      source = source.replace(
        originalBridgeLine,
        `#if RCT_DEV
  [manager updateCurrentBridge:[RCTBridge currentBridge]]; // [withExpoDevLauncherBuildFix] React Native 0.83 n expose plus appBridge ici.
#else
  [manager updateCurrentBridge:nil];
#endif`
      );

      fs.writeFileSync(controllerPath, source, 'utf-8');
      return config;
    },
  ]);
};
