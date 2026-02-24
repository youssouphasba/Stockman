import { useState } from 'react';
import { API_URL } from '../config';

interface Country {
  name: string;
  code: string;
  flag: string;
  dialCode: string;
  currency: string;
}

const COUNTRIES: Country[] = [
  { name: 'Sénégal',          code: 'SN', flag: '🇸🇳', dialCode: '+221', currency: 'XOF' },
  { name: 'Côte d\'Ivoire',   code: 'CI', flag: '🇨🇮', dialCode: '+225', currency: 'XOF' },
  { name: 'Mali',             code: 'ML', flag: '🇲🇱', dialCode: '+223', currency: 'XOF' },
  { name: 'Burkina Faso',     code: 'BF', flag: '🇧🇫', dialCode: '+226', currency: 'XOF' },
  { name: 'Guinée',           code: 'GN', flag: '🇬🇳', dialCode: '+224', currency: 'GNF' },
  { name: 'Niger',            code: 'NE', flag: '🇳🇪', dialCode: '+227', currency: 'XOF' },
  { name: 'Bénin',            code: 'BJ', flag: '🇧🇯', dialCode: '+229', currency: 'XOF' },
  { name: 'Togo',             code: 'TG', flag: '🇹🇬', dialCode: '+228', currency: 'XOF' },
  { name: 'Cameroun',         code: 'CM', flag: '🇨🇲', dialCode: '+237', currency: 'XAF' },
  { name: 'Congo-Kinshasa',   code: 'CD', flag: '🇨🇩', dialCode: '+243', currency: 'CDF' },
  { name: 'Congo-Brazzaville',code: 'CG', flag: '🇨🇬', dialCode: '+242', currency: 'XAF' },
  { name: 'Gabon',            code: 'GA', flag: '🇬🇦', dialCode: '+241', currency: 'XAF' },
  { name: 'Tchad',            code: 'TD', flag: '🇹🇩', dialCode: '+235', currency: 'XAF' },
  { name: 'Maroc',            code: 'MA', flag: '🇲🇦', dialCode: '+212', currency: 'MAD' },
  { name: 'Algérie',          code: 'DZ', flag: '🇩🇿', dialCode: '+213', currency: 'DZD' },
  { name: 'Tunisie',          code: 'TN', flag: '🇹🇳', dialCode: '+216', currency: 'TND' },
  { name: 'Mauritanie',       code: 'MR', flag: '🇲🇷', dialCode: '+222', currency: 'MRU' },
  { name: 'Guinée-Bissau',    code: 'GW', flag: '🇬🇼', dialCode: '+245', currency: 'XOF' },
  { name: 'Gambie',           code: 'GM', flag: '🇬🇲', dialCode: '+220', currency: 'GMD' },
  { name: 'Ghana',            code: 'GH', flag: '🇬🇭', dialCode: '+233', currency: 'GHS' },
  { name: 'Nigeria',          code: 'NG', flag: '🇳🇬', dialCode: '+234', currency: 'NGN' },
  { name: 'France',           code: 'FR', flag: '🇫🇷', dialCode: '+33',  currency: 'EUR' },
  { name: 'Belgique',         code: 'BE', flag: '🇧🇪', dialCode: '+32',  currency: 'EUR' },
  { name: 'Suisse',           code: 'CH', flag: '🇨🇭', dialCode: '+41',  currency: 'CHF' },
  { name: 'Canada',           code: 'CA', flag: '🇨🇦', dialCode: '+1',   currency: 'CAD' },
  { name: 'États-Unis',       code: 'US', flag: '🇺🇸', dialCode: '+1',   currency: 'USD' },
];

type Plan = 'starter' | 'pro';
type Step = 'form' | 'success';

interface Props {
  plan: Plan;
  onClose: () => void;
}

export default function SignupModal({ plan, onClose }: Props) {
  const [step, setStep] = useState<Step>('form');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [businessType, setBusinessType] = useState('');
  const [howDidYouHear, setHowDidYouHear] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const planLabel = plan === 'pro' ? 'Pro' : 'Starter';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('Vous devez accepter les CGU et la politique de confidentialité.');
      return;
    }

    const fullPhone = phone.trim()
      ? (phone.trim().startsWith('+') ? phone.trim() : `${selectedCountry.dialCode}${phone.trim()}`)
      : '';

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: fullPhone || undefined,
          plan,
          role: 'shopkeeper',
          currency: selectedCountry.currency,
          country_code: selectedCountry.code,
          business_type: businessType.trim() || undefined,
          how_did_you_hear: howDidYouHear.trim() || undefined,
        }),
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error('Le serveur est temporairement indisponible. Réessayez dans quelques instants.');
      }

      if (!res.ok) {
        throw new Error(data?.detail || 'Erreur lors de la création du compte.');
      }

      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
              <span className="signup-modal-badge">3 mois gratuits — sans carte bancaire</span>
              <h2>Créer mon compte {planLabel}</h2>
              <p>Accès complet à toutes les fonctionnalités pendant 3 mois.</p>
            </div>

            <form onSubmit={handleSubmit} className="signup-form">

              {/* Pays */}
              <div className="signup-field">
                <label>Pays <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  value={selectedCountry.code}
                  onChange={e => {
                    const found = COUNTRIES.find(c => c.code === e.target.value);
                    if (found) setSelectedCountry(found);
                  }}
                  className="signup-select"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name} ({c.currency})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nom */}
              <div className="signup-field">
                <label>Nom complet <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jean Dupont"
                  required
                  autoFocus
                />
              </div>

              {/* Téléphone */}
              <div className="signup-field">
                <label>Téléphone <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optionnel)</span></label>
                <div className="signup-phone-row">
                  <span className="signup-dial-code">{selectedCountry.dialCode}</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="77 000 00 00"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="signup-field">
                <label>Email <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jean@boutique.com"
                  required
                />
              </div>

              {/* Mot de passe */}
              <div className="signup-field">
                <label>Mot de passe <span style={{ color: '#ef4444' }}>*</span></label>
                <div className="signup-password-row">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                    required
                    minLength={8}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="signup-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Confirmation mot de passe */}
              <div className="signup-field">
                <label>Confirmer le mot de passe <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Répétez votre mot de passe"
                  required
                />
              </div>

              {/* Type de commerce */}
              <div className="signup-field">
                <label>Type de commerce <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optionnel)</span></label>
                <input
                  type="text"
                  value={businessType}
                  onChange={e => setBusinessType(e.target.value)}
                  placeholder="Ex: Boutique, Pharmacie, Quincaillerie…"
                />
              </div>

              {/* Comment vous avez connu Stockman */}
              <div className="signup-field">
                <label>Comment avez-vous connu Stockman ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optionnel)</span></label>
                <input
                  type="text"
                  value={howDidYouHear}
                  onChange={e => setHowDidYouHear(e.target.value)}
                  placeholder="Ex: Bouche-à-oreille, Instagram, WhatsApp…"
                />
              </div>

              {/* CGU + Confidentialité */}
              <div className="signup-legal-checks">
                <label className="signup-check-row">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                    required
                  />
                  <span>
                    J'accepte les{' '}
                    <a href="/terms" target="_blank" rel="noopener noreferrer">Conditions Générales d'Utilisation</a>
                  </span>
                </label>
                <label className="signup-check-row">
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={e => setAcceptedPrivacy(e.target.checked)}
                    required
                  />
                  <span>
                    J'accepte la{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer">Politique de Confidentialité</a>
                  </span>
                </label>
              </div>

              {error && <p className="signup-error">⚠️ {error}</p>}

              <button type="submit" className="btn-primary signup-submit" disabled={loading}>
                {loading ? 'Création en cours…' : 'Créer mon compte gratuit'}
              </button>

            </form>
          </>
        ) : (
          <div className="signup-success">
            <div className="signup-success-icon">🎉</div>
            <h2>Compte créé !</h2>
            <p>
              Votre essai gratuit de <strong>3 mois</strong> démarre maintenant.
              Téléchargez l'application et connectez-vous avec votre email et mot de passe.
            </p>

            <div className="signup-download-buttons">
              <a
                href="https://apps.apple.com/app/stockman/id0000000000"
                target="_blank"
                rel="noopener noreferrer"
                className="store-download-btn"
              >
                🍎 App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.stockman.app"
                target="_blank"
                rel="noopener noreferrer"
                className="store-download-btn"
              >
                ▶ Google Play
              </a>
            </div>

            <p className="signup-success-hint">
              Connectez-vous avec votre email et mot de passe dans l'app.
            </p>

            <button className="btn-secondary" onClick={onClose} style={{ marginTop: '1rem' }}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
