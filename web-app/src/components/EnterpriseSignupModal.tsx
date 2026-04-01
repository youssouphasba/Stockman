'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { CheckCircle2, Eye, EyeOff, X, ChevronDown, Search } from 'lucide-react';
import { auth, type AuthResponse } from '../services/api';
import { COUNTRIES } from '@/data/countries';

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

const HOW_OPTIONS = [
  { key: '', label: 'Selectionnez...' },
  { key: 'google', label: 'Recherche Google' },
  { key: 'social_media', label: 'Reseaux sociaux' },
  { key: 'friend', label: 'Recommandation' },
  { key: 'app_store', label: 'App Store / Play Store' },
  { key: 'other', label: 'Autre' },
];

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score: 1, label: 'Faible', color: '#ef4444' };
  if (score <= 2) return { score: 2, label: 'Moyen', color: '#f59e0b' };
  if (score <= 3) return { score: 3, label: 'Bon', color: '#3b82f6' };
  return { score: 4, label: 'Fort', color: '#22c55e' };
}

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
  const [howDidYouHear, setHowDidYouHear] = useState('');

  // Sector dropdown state
  const [sectorOpen, setSectorOpen] = useState(false);
  const [sectorSearch, setSectorSearch] = useState('');
  const sectorRef = useRef<HTMLDivElement>(null);
  const sectorSearchRef = useRef<HTMLInputElement>(null);

  // Country dropdown state
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryRef = useRef<HTMLDivElement>(null);
  const countrySearchRef = useRef<HTMLInputElement>(null);

  // How dropdown state
  const [howOpen, setHowOpen] = useState(false);
  const howRef = useRef<HTMLDivElement>(null);

  const selectedCountry = COUNTRIES.find((c) => c.code === selectedCountryCode) || COUNTRIES[0];
  const selectedSector = SECTORS.find((s) => s.key === businessType);
  const selectedHow = HOW_OPTIONS.find((o) => o.key === howDidYouHear);
  const passwordStrength = getPasswordStrength(password);

  const filteredSectors = useMemo(() => {
    const q = sectorSearch.trim().toLowerCase();
    if (!q) return SECTORS;
    return SECTORS.filter((s) => s.label.toLowerCase().includes(q) || s.key.toLowerCase().includes(q));
  }, [sectorSearch]);

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.currency.toLowerCase().includes(q));
  }, [countrySearch]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sectorRef.current && !sectorRef.current.contains(e.target as Node)) {
        setSectorOpen(false);
      }
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false);
      }
      if (howRef.current && !howRef.current.contains(e.target as Node)) {
        setHowOpen(false);
      }
    }
    if (sectorOpen || countryOpen || howOpen) {
      document.addEventListener('mousedown', handleClick);
      if (sectorOpen) sectorSearchRef.current?.focus();
      if (countryOpen) countrySearchRef.current?.focus();
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sectorOpen, countryOpen, howOpen]);

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
        how_did_you_hear: howDidYouHear || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
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
                1 mois gratuit - sans carte bancaire
              </span>
              <h2 className="text-xl font-bold text-white mt-3">Creer mon compte Enterprise</h2>
              <p className="text-slate-400 text-sm mt-1">
                Pilotez vos boutiques, vos equipes et vos indicateurs depuis le web.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Country */}
              <div ref={countryRef} className="relative">
                <label className={labelClass}>Pays</label>
                <button
                  type="button"
                  onClick={() => { setCountryOpen(!countryOpen); setCountrySearch(''); }}
                  className={`${inputClass} flex items-center justify-between cursor-pointer text-left text-white`}
                >
                  <span>
                    {selectedCountry.flag} {selectedCountry.name} ({selectedCountry.currency})
                  </span>
                  <ChevronDown size={16} className={`text-white/40 transition-transform ${countryOpen ? 'rotate-180' : ''}`} />
                </button>

                {countryOpen && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-[#1a1040] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                      <Search size={14} className="text-white/30" />
                      <input
                        ref={countrySearchRef}
                        type="text"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="Rechercher un pays..."
                        className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {filteredCountries.map((country) => (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => { setSelectedCountryCode(country.code); setCountryOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                            selectedCountryCode === country.code
                              ? 'bg-primary/20 text-white'
                              : 'text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <span className="text-base">{country.flag}</span>
                          <span>{country.name} ({country.currency})</span>
                        </button>
                      ))}
                      {filteredCountries.length === 0 && (
                        <p className="text-center text-white/30 text-xs py-4">Aucun pays trouvé</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Name */}
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

              {/* Phone */}
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

              {/* Email */}
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

              {/* Password */}
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
                {password && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${passwordStrength.score * 25}%`, backgroundColor: passwordStrength.color }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
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
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[10px] text-red-400 mt-1">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              {/* Business type dropdown */}
              <div ref={sectorRef} className="relative">
                <label className={labelClass}>Secteur d&apos;activite</label>
                <button
                  type="button"
                  onClick={() => { setSectorOpen(!sectorOpen); setSectorSearch(''); }}
                  className={`${inputClass} flex items-center justify-between cursor-pointer text-left ${
                    businessType ? 'text-white' : 'text-white/30'
                  }`}
                >
                  <span>
                    {selectedSector ? `${selectedSector.icon} ${selectedSector.label}` : 'Selectionnez un secteur'}
                  </span>
                  <ChevronDown size={16} className={`text-white/40 transition-transform ${sectorOpen ? 'rotate-180' : ''}`} />
                </button>

                {sectorOpen && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-[#1a1040] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                      <Search size={14} className="text-white/30" />
                      <input
                        ref={sectorSearchRef}
                        type="text"
                        value={sectorSearch}
                        onChange={(e) => setSectorSearch(e.target.value)}
                        placeholder="Rechercher..."
                        className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredSectors.map((sector) => (
                        <button
                          key={sector.key}
                          type="button"
                          onClick={() => { setBusinessType(sector.key); setSectorOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                            businessType === sector.key
                              ? 'bg-primary/20 text-white'
                              : 'text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <span className="text-base">{sector.icon}</span>
                          <span>{sector.label}</span>
                        </button>
                      ))}
                      {filteredSectors.length === 0 && (
                        <p className="text-center text-white/30 text-xs py-4">Aucun resultat</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* How did you hear */}
              <div ref={howRef} className="relative">
                <label className={labelClass}>Comment nous avez-vous connu ? (optionnel)</label>
                <button
                  type="button"
                  onClick={() => setHowOpen(!howOpen)}
                  className={`${inputClass} flex items-center justify-between cursor-pointer text-left ${
                    howDidYouHear ? 'text-white' : 'text-white/30'
                  }`}
                >
                  <span>
                    {selectedHow ? selectedHow.label : 'Selectionnez...'}
                  </span>
                  <ChevronDown size={16} className={`text-white/40 transition-transform ${howOpen ? 'rotate-180' : ''}`} />
                </button>

                {howOpen && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-[#1a1040] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                    {HOW_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => { setHowDidYouHear(opt.key); setHowOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                          howDidYouHear === opt.key
                            ? 'bg-primary/20 text-white'
                            : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Terms */}
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
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
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
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
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
