import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

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

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: Localization.getLocales()[0].languageCode ?? 'fr',
        fallbackLng: 'fr',
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;
