import { fr, enUS, es, ar, zhCN, hi, de, it, pl, ro, pt, tr, ru } from 'date-fns/locale';

const localeMap: Record<string, any> = {
    fr: fr,
    en: enUS,
    es: es,
    ar: ar,
    zh: zhCN,
    hi: hi,
    de: de,
    it: it,
    pl: pl,
    ro: ro,
    pt: pt,
    tr: tr,
    ru: ru,
    // wo: wolof (if available, otherwise fallback)
    // ff: fula
};

export function getDateLocale(lang: string) {
    return localeMap[lang] || fr; // Fallback to French
}
