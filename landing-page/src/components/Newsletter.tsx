import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { API_URL } from '../config';
import '../App.css';

const Newsletter = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<null | 'success' | 'error'>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/api/public/newsletter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (response.ok) {
                setStatus('success');
                setEmail('');
            } else {
                setStatus('error');
            }
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    return (
        <section className="newsletter-section container">
            <div className="glass-card newsletter-card">
                <div className="newsletter-content">
                    <h2>🚀 {t('newsletter.title')}</h2>
                    <p>{t('newsletter.desc')}</p>

                    {status === 'success' ? (
                        <div className="success-message">
                            ✅ {t('newsletter.success')}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="newsletter-form">
                            <input
                                type="email"
                                placeholder={t('newsletter.placeholder')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <button type="submit" className="btn-primary">{t('newsletter.cta')}</button>
                        </form>
                    )}
                    <p className="privacy-note">🔒 {t('newsletter.privacy')}</p>
                </div>
            </div>
        </section>
    );
};

export default Newsletter;
