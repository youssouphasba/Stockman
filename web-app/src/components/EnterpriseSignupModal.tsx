'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://stockman-production-149d.up.railway.app';

interface Country { name: string; code: string; flag: string; dialCode: string; currency: string; }

const COUNTRIES: Country[] = [
  { name: 'Sénégal',           code: 'SN', flag: '🇸🇳', dialCode: '+221', currency: 'XOF' },
  { name: 'Côte d\'Ivoire',    code: 'CI', flag: '🇨🇮', dialCode: '+225', currency: 'XOF' },
  { name: 'Mali',              code: 'ML', flag: '🇲🇱', dialCode: '+223', currency: 'XOF' },
  { name: 'Burkina Faso',      code: 'BF', flag: '🇧🇫', dialCode: '+226', currency: 'XOF' },
  { name: 'Guinée',            code: 'GN', flag: '🇬🇳', dialCode: '+224', currency: 'GNF' },
  { name: 'Niger',             code: 'NE', flag: '🇳🇪', dialCode: '+227', currency: 'XOF' },
  { name: 'Bénin',             code: 'BJ', flag: '🇧🇯', dialCode: '+229', currency: 'XOF' },
  { name: 'Togo',              code: 'TG', flag: '🇹🇬', dialCode: '+228', currency: 'XOF' },
  { name: 'Cameroun',          code: 'CM', flag: '🇨🇲', dialCode: '+237', currency: 'XAF' },
  { name: 'Congo-Kinshasa',    code: 'CD', flag: '🇨🇩', dialCode: '+243', currency: 'CDF' },
  { name: 'Congo-Brazzaville', code: 'CG', flag: '🇨🇬', dialCode: '+242', currency: 'XAF' },
  { name: 'Gabon',             code: 'GA', flag: '🇬🇦', dialCode: '+241', currency: 'XAF' },
  { name: 'Maroc',             code: 'MA', flag: '🇲🇦', dialCode: '+212', currency: 'MAD' },
  { name: 'Algérie',           code: 'DZ', flag: '🇩🇿', dialCode: '+213', currency: 'DZD' },
  { name: 'Tunisie',           code: 'TN', flag: '🇹🇳', dialCode: '+216', currency: 'TND' },
  { name: 'France',            code: 'FR', flag: '🇫🇷', dialCode: '+33',  currency: 'EUR' },
  { name: 'Belgique',          code: 'BE', flag: '🇧🇪', dialCode: '+32',  currency: 'EUR' },
  { name: 'Canada',            code: 'CA', flag: '🇨🇦', dialCode: '+1',   currency: 'CAD' },
  { name: 'États-Unis',        code: 'US', flag: '🇺🇸', dialCode: '+1',   currency: 'USD' },
];

interface Props {
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export default function EnterpriseSignupModal({ onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [businessType, setBusinessType] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm";
  const labelClass = "block text-xs font-semibold text-slate-400 mb-1";

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
          plan: 'enterprise',
          role: 'shopkeeper',
          currency: selectedCountry.currency,
          country_code: selectedCountry.code,
          business_type: businessType.trim() || undefined,
        }),
      });

      let data: any;
      try { data = await res.json(); } catch { throw new Error('Serveur indisponible. Réessayez dans quelques instants.'); }
      if (!res.ok) throw new Error(data?.detail || 'Erreur lors de la création du compte.');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-[#0f0c29] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors z-10"
          aria-label="Fermer"
        >
          <X size={20} />
        </button>

        {success ? (
          <div className="p-8 text-center flex flex-col items-center gap-4">
            <CheckCircle2 size={56} className="text-green-400" />
            <h2 className="text-2xl font-bold text-white">Compte créé !</h2>
            <p className="text-slate-400 text-sm">
              Votre compte <strong className="text-white">Enterprise</strong> est prêt.
              Connectez-vous avec votre email et mot de passe.
            </p>
            <button
              onClick={() => onSuccess(email)}
              className="btn-primary w-full py-3 rounded-xl mt-2"
            >
              Se connecter maintenant
            </button>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-5">
              <span className="text-xs font-bold bg-primary/20 text-primary px-3 py-1 rounded-full">
                3 mois gratuits — sans carte bancaire
              </span>
              <h2 className="text-xl font-bold text-white mt-3">Créer mon compte Enterprise</h2>
              <p className="text-slate-400 text-sm mt-1">Accès complet à toutes les fonctionnalités.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className={labelClass}>Pays <span className="text-red-400">*</span></label>
                <select
                  value={selectedCountry.code}
                  onChange={e => { const c = COUNTRIES.find(c => c.code === e.target.value); if (c) setSelectedCountry(c); }}
                  className={inputClass + ' cursor-pointer'}
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code} style={{ backgroundColor: '#1a1040' }}>
                      {c.flag} {c.name} ({c.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Nom complet <span className="text-red-400">*</span></label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jean Dupont" className={inputClass} required autoFocus />
              </div>

              <div>
                <label className={labelClass}>Téléphone <span className="text-white/30 font-normal">(optionnel)</span></label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 whitespace-nowrap">
                    {selectedCountry.flag} {selectedCountry.dialCode}
                  </span>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="77 000 00 00" className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Email professionnel <span className="text-red-400">*</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@boutique.com" className={inputClass} required />
              </div>

              <div>
                <label className={labelClass}>Mot de passe <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="8 caractères minimum" className={inputClass + ' pr-10'} required minLength={8} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors" tabIndex={-1}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>Confirmer le mot de passe <span className="text-red-400">*</span></label>
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Répétez votre mot de passe" className={inputClass} required />
              </div>

              <div>
                <label className={labelClass}>Type de commerce <span className="text-white/30 font-normal">(optionnel)</span></label>
                <input type="text" value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="Ex: Boutique, Pharmacie, Supermarché…" className={inputClass} />
              </div>

              <div className="flex flex-col gap-2 mt-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-0.5 accent-primary" required />
                  <span className="text-xs text-slate-400">
                    J'accepte les{' '}
                    <a href="https://stockman.pro/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">CGU</a>
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={acceptedPrivacy} onChange={e => setAcceptedPrivacy(e.target.checked)} className="mt-0.5 accent-primary" required />
                  <span className="text-xs text-slate-400">
                    J'accepte la{' '}
                    <a href="https://stockman.pro/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Politique de confidentialité</a>
                  </span>
                </label>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs">
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" disabled={loading} className={`btn-primary w-full py-3.5 rounded-xl font-semibold mt-1 ${loading ? 'opacity-70 cursor-wait' : ''}`}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Création en cours…
                  </span>
                ) : 'Créer mon compte Enterprise'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
