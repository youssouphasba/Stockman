'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Globe2, Phone, UserRound, BriefcaseBusiness } from 'lucide-react';
import { auth, type User } from '../services/api';
import { COUNTRIES } from '../data/countries';
import { BUSINESS_SECTORS } from '../data/businessSectors';

type Props = {
  user: User;
  onCompleted: (user: User) => void;
  onLogout: () => void;
};

const REFERRAL_OPTIONS = [
  { key: '', label: 'Selectionnez...' },
  { key: 'google', label: 'Recherche Google' },
  { key: 'social_media', label: 'Reseaux sociaux' },
  { key: 'friend', label: 'Recommandation' },
  { key: 'app_store', label: 'Store / App mobile' },
  { key: 'other', label: 'Autre' },
];

export default function CompleteSocialProfilePanel({ user, onCompleted, onLogout }: Props) {
  const initialCountryCode = useMemo(() => {
    const normalized = String(user?.country_code || '').trim().toUpperCase();
    return COUNTRIES.some((country) => country.code === normalized) ? normalized : 'SN';
  }, [user?.country_code]);

  const [name, setName] = useState(user?.name || '');
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState(typeof user?.business_type === 'string' ? user.business_type : '');
  const [howDidYouHear, setHowDidYouHear] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedCountry = useMemo(
    () => COUNTRIES.find((country) => country.code === countryCode) || COUNTRIES[0],
    [countryCode],
  );

  const normalizePhone = () => {
    const value = phone.trim();
    if (!value) return '';
    return value.startsWith('+') ? value : `${selectedCountry.dialCode}${value}`;
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    if (!phone.trim()) {
      setError('Le numero de telephone est obligatoire.');
      return;
    }
    if (!businessType) {
      setError("Le secteur d'activite est obligatoire.");
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await auth.completeSocialProfile({
        name: name.trim(),
        country_code: countryCode,
        phone: normalizePhone(),
        business_type: businessType,
        how_did_you_hear: howDidYouHear || undefined,
      });
      setMessage(response.message);
      onCompleted(response.user);
    } catch (err: any) {
      setError(err?.message || 'Impossible de terminer la configuration du compte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl glass-card p-8 space-y-6">
        <div className="space-y-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="text-primary" size={28} />
          </div>
          <h1 className="text-3xl font-black">Terminez la configuration de votre compte</h1>
          <p className="text-slate-400 text-sm leading-6">
            Votre connexion Google a bien fonctionne. Avant d'ouvrir l'application web, confirmez votre pays,
            votre numero de telephone et votre secteur d'activite pour appliquer la bonne devise et le bon contexte metier.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              <UserRound size={14} />
              Nom
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Votre nom"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-primary/50"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              <Globe2 size={14} />
              Pays et devise
            </span>
            <div className="relative">
              <select
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-white outline-none transition-colors focus:border-primary/50"
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code} className="bg-slate-900 text-white">
                    {country.name} ({country.currency})
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              <Phone size={14} />
              Telephone
            </span>
            <div className="flex rounded-xl border border-white/10 bg-white/5 focus-within:border-primary/50">
              <span className="flex items-center border-r border-white/10 px-4 text-sm text-slate-300">
                {selectedCountry.dialCode}
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="77 000 00 00"
                className="w-full bg-transparent px-4 py-3 text-white outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              <BriefcaseBusiness size={14} />
              Secteur d'activite
            </span>
            <div className="relative">
              <select
                value={businessType}
                onChange={(event) => setBusinessType(event.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-white outline-none transition-colors focus:border-primary/50"
              >
                <option value="" className="bg-slate-900 text-white">Selectionnez...</option>
                {BUSINESS_SECTORS.map((sector) => (
                  <option key={sector.key} value={sector.key} className="bg-slate-900 text-white">
                    {sector.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
              Comment nous avez-vous connus ?
            </span>
            <div className="relative">
              <select
                value={howDidYouHear}
                onChange={(event) => setHowDidYouHear(event.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-white outline-none transition-colors focus:border-primary/50"
              >
                {REFERRAL_OPTIONS.map((option) => (
                  <option key={option.key || 'empty'} value={option.key} className="bg-slate-900 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </label>
        </div>

        {message && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary flex-1 rounded-xl py-4 disabled:opacity-60"
          >
            {loading ? 'Configuration en cours...' : 'Continuer'}
          </button>
          <button
            onClick={onLogout}
            disabled={loading}
            className="rounded-xl border border-white/10 px-5 py-4 text-sm font-bold text-slate-300 transition-colors hover:border-white/20 hover:text-white disabled:opacity-60"
          >
            Utiliser un autre compte
          </button>
        </div>
      </div>
    </div>
  );
}
