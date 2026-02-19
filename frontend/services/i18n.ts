import i18n, { LanguageDetectorAsyncModule } from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import locales
import fr from '../locales/fr.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import wo from '../locales/wo.json';
import ff from '../locales/ff.json';
import zh from '../locales/zh.json';
import hi from '../locales/hi.json';
import de from '../locales/de.json';
import it from '../locales/it.json';
import pl from '../locales/pl.json';
import ro from '../locales/ro.json';
import pt from '../locales/pt.json';
import tr from '../locales/tr.json';
import ar from '../locales/ar.json';
import ru from '../locales/ru.json';

const resources = {
    fr: { translation: fr },
    en: { translation: en },
    es: { translation: es },
    wo: { translation: wo },
    ff: { translation: ff },
    zh: { translation: zh },
    hi: { translation: hi },
    de: { translation: de },
    it: { translation: it },
    pl: { translation: pl },
    ro: { translation: ro },
    pt: { translation: pt },
    tr: { translation: tr },
    ar: { translation: ar },
    ru: { translation: ru },
};

const LANGUAGE_KEY = 'user-language';
const MANUAL_FLAG_KEY = 'user-language-manual';

const languageDetector: LanguageDetectorAsyncModule = {
    type: 'languageDetector',
    async: true,
    detect: async (callback: (lng: string) => void) => {
        try {
            const isManual = await AsyncStorage.getItem(MANUAL_FLAG_KEY);
            const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

            // If user explicitly chose a language in-app, respect that choice
            if (isManual === 'true' && savedLanguage) {
                console.log('Using manually selected language:', savedLanguage);
                return callback(savedLanguage);
            }

            // Clean up stale cache from older app versions (before manual flag existed)
            if (savedLanguage && isManual !== 'true') {
                await AsyncStorage.removeItem(LANGUAGE_KEY);
                console.log('Cleared stale language cache, will use system language');
            }
        } catch (error) {
            console.error('Error detecting language:', error);
        }

        // Always use the device/system language when no manual override exists
        const deviceLanguage = Localization.getLocales()?.[0]?.languageCode ?? 'fr';
        console.log('Using system language:', deviceLanguage);
        callback(deviceLanguage);
    },
    init: () => { },
    cacheUserLanguage: async (lng: string) => {
        // Note: Automatic caching is disabled here to avoid locking the system language.
        // Persistence is handled manually in LanguagePickerModal for user-initiated changes.
    },
};

i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'fr',
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;
