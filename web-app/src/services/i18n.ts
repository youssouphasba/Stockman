'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

if (!i18n.isInitialized) {
    i18n
        .use(HttpBackend)
        .use(initReactI18next)
        .init({
            fallbackLng: 'en',
            lng: 'fr',
            backend: {
                loadPath: '/locales/{{lng}}.json',
            },
            interpolation: {
                escapeValue: false,
            },
            react: {
                useSuspense: false, // Prevents issues during static generation
            },
        });
}

export default i18n;
