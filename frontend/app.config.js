// Les fichiers Firebase ne sont pas dans Git. Pour un build lancé depuis GitHub, EAS les fournit
// par des variables d'environnement de type fichier ; en local, les fichiers du dossier servent.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || config.android.googleServicesFile,
  },
  ios: {
    ...config.ios,
    googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST || config.ios.googleServicesFile,
  },
});
