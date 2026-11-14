'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import publicEn from '../../public/locales/en.json';
import publicFr from '../../public/locales/fr.json';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

function mergeTranslations(base: Record<string, unknown>, updates: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Array.from(new Set([...Object.keys(base), ...Object.keys(updates)]), (key) => {
        const previous = base[key];
        const next = updates[key];
        if (previous && next && typeof previous === 'object' && typeof next === 'object'
            && !Array.isArray(previous) && !Array.isArray(next)) {
            return [key, mergeTranslations(previous as Record<string, unknown>, next as Record<string, unknown>)];
        }
        return [key, next ?? previous];
    }));
}

if (!i18n.isInitialized) {
    i18n
        .use(HttpBackend)
        .use(initReactI18next)
        .init({
            fallbackLng: 'en',
            lng: 'fr',
            resources: {
                fr: { translation: mergeTranslations(publicFr, fr) },
                en: { translation: mergeTranslations(publicEn, en) },
            },
            partialBundledLanguages: true,
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
