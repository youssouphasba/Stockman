import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../App.css';

const CookieBanner = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('stockman_cookie_consent');
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const acceptCookies = () => {
        localStorage.setItem('stockman_cookie_consent', 'true');
        setIsVisible(false);
    };

    const { t } = useTranslation();

    if (!isVisible) return null;

    return (
        <div className="cookie-banner glass-card">
            <div className="cookie-content">
                <p>🍪 {t('cookie.message')}</p>
                <button onClick={acceptCookies} className="btn-primary btn-sm">{t('cookie.accept')}</button>
            </div>
        </div>
    );
};

export default CookieBanner;
