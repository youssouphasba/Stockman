'use client';

import { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, X } from 'lucide-react';
import { auth, type AuthResponse } from '../services/api';
import { COUNTRIES } from '../../../frontend/constants/countries';

const SECTORS = [
  { key: 'epicerie', label: 'Epicerie', icon: '🛒' },
  { key: 'supermarche', label: 'Supermarche', icon: '🏪' },
  { key: 'pharmacie', label: 'Pharmacie', icon: '💊' },
  { key: 'vetements', label: 'Vetements', icon: '👗' },
  { key: 'cosmetiques', label: 'Cosmetiques', icon: '💄' },
  { key: 'electronique', label: 'Electronique', icon: '📱' },
  { key: 'quincaillerie', label: 'Quincaillerie', icon: '🔧' },
  { key: 'automobile', label: 'Auto / Garage', icon: '🚗' },
  { key: 'grossiste', label: 'Grossiste', icon: '📦' },
  { key: 'papeterie', label: 'Papeterie', icon: '📎' },
  { key: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { key: 'boulangerie', label: 'Boulangerie', icon: '🥖' },
  { key: 'traiteur', label: 'Traiteur', icon: '🍰' },
  { key: 'boissons', label: 'Boissons', icon: '🧃' },
  { key: 'couture', label: 'Couture', icon: '🧵' },
  { key: 'savonnerie', label: 'Savonnerie', icon: '🧼' },
  { key: 'menuiserie', label: 'Menuiserie', icon: '🪑' },
  { key: 'imprimerie', label: 'Imprimerie', icon: '🖨️' },
  { key: 'forge', label: 'Forge', icon: '⚒️' },
  { key: 'artisanat', label: 'Artisanat', icon: '🧶' },
  { key: 'autre', label: 'Autre', icon: '🔀' },
] as const;

type Props = {
  onClose: () => void;
  onSuccess: (response: AuthResponse) => void;
};

export default function EnterpriseSignupModal({ onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('SN');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const selectedCountry = COUNTRIES.find((country) => country.code === selectedCountryCode) || COUNTRIES[0];
  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm';
  const labelClass = 'block text-xs font-semibold text-slate-400 mb-1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (!businessType) {
      setError("Veuillez selectionner votre secteur d'activite.");
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('Vous devez accepter les CGU et la politique de confidentialite.');
      return;
    }

    const fullPhone = phone.trim()
      ? (phone.trim().startsWith('+') ? phone.trim() : `${selectedCountry.dialCode}${phone.trim()}`)
      : undefined;

    setLoading(true);
    try {
      const response = await auth.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: fullPhone,
        plan: 'enterprise',
        role: 'shopkeeper',
        currency: selectedCountry.currency,
        country_code: selectedCountry.code,
        business_type: businessType,
        signup_surface: 'web',
      });
      setSuccess(true);
      onSuccess(response);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la creation du compte.');
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
            <h2 className="text-2xl font-bold text-white">Compte cree</h2>
            <p className="text-slate-400 text-sm">
              Votre compte Enterprise est cree. Verifiez maintenant votre email pour debloquer l&apos;acces web.
            </p>
            <button onClick={onClose} className="btn-primary w-full py-3 rounded-xl mt-2">
              Continuer
            </button>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-5">
              <span className="text-xs font-bold bg-primary/20 text-primary px-3 py-1 rounded-full">
                3 mois gratuits - sans carte bancaire
              </span>
              <h2 className="text-xl font-bold text-white mt-3">Creer mon compte Enterprise</h2>
              <p className="text-slate-400 text-sm mt-1">
                Pilotez vos boutiques, vos equipes et vos indicateurs depuis le web.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className={labelClass}>Pays</label>
                <select
                  value={selectedCountry.code}
                  onChange={(e) => setSelectedCountryCode(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code} style={{ backgroundColor: '#1a1040' }}>
                      {country.flag} {country.name} ({country.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Nom complet</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jean Dupont"
                  className={inputClass}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className={labelClass}>Telephone (optionnel)</label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 whitespace-nowrap">
                    {selectedCountry.flag} {selectedCountry.dialCode}
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="77 000 00 00"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Email professionnel</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean@entreprise.com"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8 caracteres minimum"
                    className={`${inputClass} pr-10`}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>Confirmer le mot de passe</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetez votre mot de passe"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Secteur d&apos;activite</label>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {SECTORS.map((sector) => (
                    <button
                      key={sector.key}
                      type="button"
                      onClick={() => setBusinessType(businessType === sector.key ? '' : sector.key)}
                      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-center transition-all ${
                        businessType === sector.key
                          ? 'bg-primary/20 border-primary text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <span className="text-lg leading-none">{sector.icon}</span>
                      <span className="text-[10px] font-semibold leading-tight">{sector.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 accent-primary"
                    required
                  />
                  <span className="text-xs text-slate-400">
                    J&apos;accepte les{' '}
                    <a href="https://stockman.pro/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      CGU
                    </a>
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                    className="mt-0.5 accent-primary"
                    required
                  />
                  <span className="text-xs text-slate-400">
                    J&apos;accepte la{' '}
                    <a href="https://stockman.pro/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Politique de confidentialite
                    </a>
                  </span>
                </label>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`btn-primary w-full py-3.5 rounded-xl font-semibold mt-1 ${loading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creation en cours...
                  </span>
                ) : 'Creer mon compte Enterprise'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
