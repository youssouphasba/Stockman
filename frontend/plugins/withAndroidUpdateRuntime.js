const path = require('node:path');
const { AndroidConfig, withFinalizedMod } = require('expo/config-plugins');

module.exports = function withAndroidUpdateRuntime(config) {
  return withFinalizedMod(config, ['android', async (mod) => {
    const runtime = mod.android?.runtimeVersion ?? mod.runtimeVersion;
    if (typeof runtime !== 'string' || !runtime.trim()) {
      throw new Error('Stockman requires an explicit Android runtimeVersion.');
    }

    const manifestPath = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/AndroidManifest.xml');
    const { Manifest, Updates } = AndroidConfig;
    const manifest = await Manifest.readAndroidManifestAsync(manifestPath);
    const application = Manifest.getMainApplicationOrThrow(manifest);
    Manifest.addMetaDataItemToMainApplication(application, Updates.Config.RUNTIME_VERSION, `string:${runtime}`);
    await Manifest.writeAndroidManifestAsync(manifestPath, manifest);
    return mod;
  }]);
};
