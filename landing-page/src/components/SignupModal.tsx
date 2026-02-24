import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';

type Plan = 'starter' | 'pro';

interface Props {
  plan: Plan;
  onClose: () => void;
}

type Step = 'form' | 'success';

export default function SignupModal({ plan, onClose }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('form');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(t('signup.error_password', { defaultValue: 'Le mot de passe doit faire au moins 8 caractères.' }));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur lors de la création du compte');
      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const planLabel = plan === 'pro' ? 'Pro' : 'Starter';

  return (
    <div
      className="signup-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="signup-modal glass-card">
        <button className="signup-modal-close" onClick={onClose} aria-label="Fermer">✕</button>

        {step === 'form' ? (
          <>
            <div className="signup-modal-header">
              <span className="signup-modal-badge">3 mois gratuits</span>
              <h2>{t('signup.title', { plan: planLabel, defaultValue: `Créer mon compte ${planLabel}` })}</h2>
              <p>{t('signup.subtitle', { defaultValue: 'Accès complet pendant 3 mois, sans carte bancaire.' })}</p>
            </div>

            <form onSubmit={handleSubmit} className="signup-form">
              <div className="signup-field">
                <label>{t('signup.name', { defaultValue: 'Nom complet' })}</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jean Dupont"
                  required
                  autoFocus
                />
              </div>

              <div className="signup-field">
                <label>{t('signup.email', { defaultValue: 'Email' })}</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jean@boutique.com"
                  required
                />
              </div>

              <div className="signup-field">
                <label>{t('signup.password', { defaultValue: 'Mot de passe' })}</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  required
                  minLength={8}
                />
              </div>

              <div className="signup-field">
                <label>{t('signup.phone', { defaultValue: 'Téléphone (optionnel)' })}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+221 77 000 00 00"
                />
              </div>

              {error && <p className="signup-error">⚠️ {error}</p>}

              <button type="submit" className="btn-primary signup-submit" disabled={loading}>
                {loading
                  ? t('signup.loading', { defaultValue: 'Création en cours…' })
                  : t('signup.cta', { defaultValue: 'Créer mon compte gratuit' })}
              </button>

              <p className="signup-legal">
                {t('signup.legal', { defaultValue: 'En créant un compte vous acceptez nos' })}{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer">
                  {t('signup.terms', { defaultValue: 'Conditions d\'utilisation' })}
                </a>.
              </p>
            </form>
          </>
        ) : (
          <div className="signup-success">
            <div className="signup-success-icon">🎉</div>
            <h2>{t('signup.success_title', { defaultValue: 'Compte créé !' })}</h2>
            <p>{t('signup.success_subtitle', { defaultValue: 'Votre essai gratuit de 3 mois démarre maintenant. Téléchargez l\'app pour commencer.' })}</p>

            <div className="signup-download-buttons">
              <a
                href="https://apps.apple.com/app/stockman/id0000000000"
                target="_blank"
                rel="noopener noreferrer"
                className="download-btn"
              >
                <img src="/apple-store-badge.svg" alt="Télécharger sur l'App Store" height={44} />
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.stockman.app"
                target="_blank"
                rel="noopener noreferrer"
                className="download-btn"
              >
                <img src="/google-play-badge.svg" alt="Disponible sur Google Play" height={44} />
              </a>
            </div>

            <p className="signup-success-hint">
              {t('signup.success_hint', { defaultValue: 'Connectez-vous avec votre email et mot de passe dans l\'app.' })}
            </p>

            <button className="btn-secondary" onClick={onClose} style={{ marginTop: '1rem' }}>
              {t('signup.success_close', { defaultValue: 'Fermer' })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
