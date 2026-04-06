const { withInfoPlist } = require('expo/config-plugins');

module.exports = function withRemoveBackgroundAudioMode(config) {
  return withInfoPlist(config, (config) => {
    const modes = config.modResults.UIBackgroundModes;
    if (Array.isArray(modes)) {
      const filteredModes = modes.filter((mode) => mode !== 'audio');
      if (filteredModes.length > 0) {
        config.modResults.UIBackgroundModes = filteredModes;
      } else {
        delete config.modResults.UIBackgroundModes;
      }
    }
    return config;
  });
};
