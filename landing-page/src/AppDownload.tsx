import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.youssouphasba.stockman';
const APP_STORE_URL = 'https://apps.apple.com/app/stockman/id6760587628';
const WEB_APP_URL = 'https://app.stockman.pro';

function getRedirectUrl(): string {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) return PLAY_STORE_URL;
    if (/iphone|ipad|ipod/.test(ua)) return APP_STORE_URL;
    return WEB_APP_URL;
}

export default function AppDownload() {
    useEffect(() => {
        const url = getRedirectUrl();
        window.location.replace(url);
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0F172A',
            color: '#fff',
            fontFamily: 'sans-serif',
            gap: '24px',
            padding: '24px',
        }}>
            <div style={{ fontSize: '48px' }}>📦</div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>Stockman</h1>
            <p style={{ color: '#94A3B8', margin: 0, textAlign: 'center' }}>
                Redirection en cours...
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '320px', marginTop: '16px' }}>
                <a href={PLAY_STORE_URL} style={btnStyle('#22C55E')}>
                    📱 Télécharger sur Android
                </a>
                <a href={APP_STORE_URL} style={btnStyle('#3B82F6')}>
                    🍎 Télécharger sur iOS
                </a>
                <a href={WEB_APP_URL} style={btnStyle('#6366F1')}>
                    💻 Ouvrir l'application web
                </a>
            </div>

            <Link to="/" style={{ color: '#64748B', fontSize: '14px', marginTop: '8px' }}>
                ← Retour au site
            </Link>
        </div>
    );
}

function btnStyle(color: string): React.CSSProperties {
    return {
        display: 'block',
        padding: '14px 20px',
        background: color + '20',
        border: `1px solid ${color}40`,
        borderRadius: '12px',
        color: '#fff',
        textDecoration: 'none',
        textAlign: 'center',
        fontWeight: '600',
        fontSize: '15px',
    };
}
