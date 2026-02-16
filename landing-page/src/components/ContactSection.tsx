import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../App.css';

const ContactSection = () => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });
    const [status, setStatus] = useState<null | 'success' | 'error'>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:8000/api/public/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                setStatus('success');
                setFormData({ name: '', email: '', message: '' });
            } else {
                setStatus('error');
            }
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    return (
        <section id="contact-form" className="container" style={{ padding: 'var(--spacing-xl) 0' }}>
            <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div className="section-title">
                    <h2>{t('contact.title')}</h2>
                    <p className="text-muted">{t('contact.subtitle')}</p>
                </div>

                {status === 'success' ? (
                    <div className="success-message" style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
                        <h3>{t('contact.success_title')}</h3>
                        <p>{t('contact.success_desc')}</p>
                        <button onClick={() => setStatus(null)} className="btn-link" style={{ marginTop: '20px' }}>
                            {t('contact.send_another')}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>{t('contact.name')}</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'var(--text)'
                                }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>{t('contact.email')}</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'var(--text)'
                                }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>{t('contact.message')}</label>
                            <textarea
                                required
                                rows={5}
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'var(--text)',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                        <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
                            {t('contact.submit')}
                        </button>
                    </form>
                )}
            </div>
        </section>
    );
};

export default ContactSection;
