import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';

const languages = [
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'ff', label: 'Pulaar', flag: '🌍' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
    { code: 'pl', label: 'Polski', flag: '🇵🇱' },
    { code: 'pt', label: 'Português', flag: '🇵🇹' },
    { code: 'ro', label: 'Română', flag: '🇷🇴' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { code: 'wo', label: 'Wolof', flag: '🇸🇳' },
    { code: 'zh', label: '中文', flag: '🇨🇳' }
];

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLang = languages.find(l => l.code === i18n.language) || languages.find(l => l.code === 'fr');

    const handleLanguageChange = (code: string) => {
        i18n.changeLanguage(code);
        setIsOpen(false);
        document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="language-switcher" ref={dropdownRef}>
            <button
                className="lang-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Select Language"
            >
                <span className="lang-flag">{currentLang?.flag}</span>
                <span className="lang-code">{currentLang?.code.toUpperCase()}</span>
            </button>

            {isOpen && (
                <div className="lang-dropdown">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            className={`lang-option ${i18n.language === lang.code ? 'active' : ''}`}
                            onClick={() => handleLanguageChange(lang.code)}
                        >
                            <span className="lang-flag">{lang.flag}</span>
                            <span className="lang-label">{lang.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;
