'use client';

import React, { useEffect, useState } from 'react';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    CreditCard,
    Download,
    Globe2,
    History,
    Mail,
    RefreshCw,
    Save,
    ShieldCheck,
    Smartphone,
    Star,
    Zap,
} from 'lucide-react';
import { auth as authApi, settings as settingsApi, subscription as subApi, type SubscriptionData } from '../services/api';
import { COUNTRIES } from '../../../shared/countries';

type PlanId = 'starter' | 'pro' | 'enterprise';

const PLAN_META: Record<PlanId, { icon: typeof Smartphone; color: string; bg: string; popular?: boolean; features: string[] }> = {
    starter: {
        icon: Smartphone,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        features: [
            'Application mobile complete',
            '1 boutique',
            '1 utilisateur',
            'Stock, ventes et alertes de base',
        ],
    },
    pro: {
        icon: Zap,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        features: [
            'Application mobile complete',
            '2 boutiques',
            'Jusqu a 5 utilisateurs',
            'Gestion equipe et permissions mobile',
            'Support operationnel renforce',
        ],
    },
    enterprise: {
        icon: Star,
        color: 'text-primary',
        bg: 'bg-primary/10',
        popular: true,
        features: [
            'Produits et stocks illimites',
            'Equipes illimitees',
            'Multi-boutiques illimitees',
            'Back-office web avance',
            'CRM, finance et analytics web',
            'Support prioritaire',
        ],
    },
};

export default function Subscription() {
    const [subDetails, setSubDetails] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<'flutterwave' | 'stripe' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [billingContactName, setBillingContactName] = useState('');
    const [billingContactEmail, setBillingContactEmail] = useState('');
    const [savingBillingContact, setSavingBillingContact] = useState(false);
    const [selectedCountryCode, setSelectedCountryCode] = useState('SN');
    const [savingBillingCountry, setSavingBillingCountry] = useState(false);

    useEffect(() => {
        void loadSubDetails();
    }, []);

    const loadSubDetails = async () => {
        setLoading(true);
        try {
            setError(null);
            const data = await subApi.getDetails();
            setSubDetails(data);
            setBillingContactName(data.billing_contact_name || '');
            setBillingContactEmail(data.billing_contact_email || '');
            setSelectedCountryCode(data.country_code || 'SN');
        } catch (err: any) {
            console.error('Subscription details error', err);
            setError(err?.message || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    const handleFlutterwave = async (plan: PlanId) => {
        setPurchasing('flutterwave');
        try {
            const { payment_url } = await subApi.checkout(plan);
            window.location.href = payment_url;
        } catch (err) {
            console.error('Flutterwave init error', err);
            alert("Erreur lors de l'initialisation du paiement Mobile Money.");
        } finally {
            setPurchasing(null);
        }
    };

    const handleStripe = async (plan: PlanId) => {
        setPurchasing('stripe');
        try {
            const { checkout_url } = await subApi.stripeCheckout(plan);
            window.location.href = checkout_url;
        } catch (err) {
            console.error('Stripe init error', err);
            alert("Erreur lors de l'initialisation du paiement par carte.");
        } finally {
            setPurchasing(null);
        }
    };

    const handleBillingContactSave = async () => {
        setSavingBillingContact(true);
        try {
            await settingsApi.update({
                billing_contact_name: billingContactName,
                billing_contact_email: billingContactEmail,
            });
            await loadSubDetails();
        } catch (err) {
            console.error('Billing contact update error', err);
            alert('Erreur lors de la mise a jour du contact de facturation.');
        } finally {
            setSavingBillingContact(false);
        }
    };

    const handleBillingCountrySave = async () => {
        const selectedCountry = COUNTRIES.find((country) => country.code === selectedCountryCode) || COUNTRIES[0];
        setSavingBillingCountry(true);
        try {
            await authApi.updateProfile({
                country_code: selectedCountry.code,
                currency: selectedCountry.currency,
            });
            await loadSubDetails();
        } catch (err) {
            console.error('Billing country update error', err);
            alert('Erreur lors de la mise a jour du pays de facturation.');
        } finally {
            setSavingBillingCountry(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    const currentPlan = (subDetails?.plan || 'starter') as PlanId;
    const isActive = subDetails?.status === 'active';
    const accessPhase = subDetails?.subscription_access_phase || 'active';
    const currency = subDetails?.currency || 'XOF';
    const selectedCountry = COUNTRIES.find((country) => country.code === selectedCountryCode) || COUNTRIES[0];
    const plans = (['starter', 'pro', 'enterprise'] as PlanId[]).map((planId) => {
        const quote = subDetails?.effective_prices?.[planId];
        return {
            id: planId,
            name: planId.charAt(0).toUpperCase() + planId.slice(1),
            price: quote?.display_price || 'Prix a venir',
            provider: quote?.provider || subDetails?.recommended_checkout_provider || 'stripe',
            ...PLAN_META[planId],
        };
    });

    return (
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0F172A]">
            {error && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-rose-500">
                        <AlertCircle size={20} />
                        <span className="font-medium text-sm tracking-tight">{error}</span>
                    </div>
                    <button
                        onClick={() => void loadSubDetails()}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all"
                    >
                        Reessayer
                    </button>
                </div>
            )}

            <header className="mb-10">
                <h1 className="text-3xl font-bold text-white mb-2">Gestion d&apos;abonnement</h1>
                <p className="text-slate-400">Retrouvez ici vos prix effectifs, votre devise de facturation et le bon canal de paiement.</p>
            </header>

            <div className={`mb-12 glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-l-4 ${isActive ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-rose-500 bg-rose-500/5'}`}>
                <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isActive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider">Plan actuel : {currentPlan}</h2>
                        <p className="text-slate-400 text-sm">
                            {isActive
                                ? `Votre abonnement est actif${subDetails?.subscription_end ? ` jusqu'au ${new Date(subDetails.subscription_end).toLocaleDateString()}` : ''}.`
                                : 'Votre essai ou votre abonnement arrive a terme. Choisissez un plan ci-dessous pour continuer.'}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">
                            Devise : {currency} · Region : {subDetails?.pricing_region || 'fallback'}
                        </p>
                    </div>
                </div>
            </div>

            {accessPhase !== 'active' && (
                <div className="mb-12 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                            <AlertCircle size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white mb-2">Continuité d&apos;activité activée</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Votre compte est actuellement en phase <strong className="text-white capitalize">{accessPhase}</strong>.
                                Vous pouvez toujours régulariser l&apos;abonnement sans perdre vos données.
                                {subDetails?.grace_until ? ` Fin de grâce : ${new Date(subDetails.grace_until).toLocaleDateString('fr-FR')}.` : ''}
                                {subDetails?.read_only_after ? ` Passage en lecture seule : ${new Date(subDetails.read_only_after).toLocaleDateString('fr-FR')}.` : ''}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-12 glass-card p-8">
                <div className="flex items-center gap-3 mb-4">
                    <Globe2 size={22} className="text-primary" />
                    <div>
                        <h3 className="text-xl font-bold text-white">Pays et devise de facturation</h3>
                        <p className="text-sm text-slate-400">
                            {subDetails?.can_change_billing_country
                                ? 'Choisissez le pays qui doit servir de base a vos prix avant le premier paiement.'
                                : 'Le pays et la devise sont verrouilles apres le premier paiement.'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Pays de facturation</label>
                        <select
                            value={selectedCountryCode}
                            onChange={(e) => setSelectedCountryCode(e.target.value)}
                            disabled={!subDetails?.can_change_billing_country || savingBillingCountry}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white disabled:opacity-60"
                        >
                            {COUNTRIES.map((country) => (
                                <option key={country.code} value={country.code}>
                                    {country.flag} {country.name} ({country.currency})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-2">
                            Devise affichee : {selectedCountry.currency} · Region : {subDetails?.pricing_region || 'fallback'}
                        </p>
                    </div>
                    <button
                        onClick={() => void handleBillingCountrySave()}
                        disabled={!subDetails?.can_change_billing_country || savingBillingCountry}
                        className="btn-primary px-6 py-3 rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {savingBillingCountry ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                        {savingBillingCountry ? 'Enregistrement...' : 'Mettre a jour'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`glass-card p-8 flex flex-col gap-8 relative overflow-hidden group border-2 ${
                            plan.popular ? 'border-primary/30 shadow-2xl shadow-primary/10' : 'border-white/5'
                        }`}
                    >
                        {plan.popular && (
                            <div className="absolute top-5 right-5 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg">
                                Le plus populaire
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${plan.bg} ${plan.color}`}>
                                <plan.icon size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-white">{plan.price}</span>
                                    <span className="text-slate-500 text-sm font-medium">/ mois</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            {plan.features.map((feature) => (
                                <div key={feature} className="flex items-start gap-3">
                                    <CheckCircle2 size={18} className="text-primary mt-0.5" />
                                    <span className="text-slate-300 text-sm leading-relaxed">{feature}</span>
                                </div>
                            ))}
                        </div>

                        {plan.id === currentPlan && isActive ? (
                            <div className="w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold bg-white/5 text-slate-500 border border-white/5">
                                <CheckCircle2 size={18} />
                                Plan actuel
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {plan.provider === 'flutterwave' ? (
                                    <button
                                        onClick={() => void handleFlutterwave(plan.id)}
                                        disabled={!!purchasing}
                                        className="w-full py-3 rounded-xl flex items-center justify-center gap-3 font-bold btn-primary shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        {purchasing === 'flutterwave' ? <RefreshCw className="animate-spin" size={18} /> : <Smartphone size={18} />}
                                        Payer via Mobile Money ({currency})
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => void handleStripe(plan.id)}
                                        disabled={!!purchasing}
                                        className="w-full py-3 rounded-xl flex items-center justify-center gap-3 font-bold btn-primary shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        {purchasing === 'stripe' ? <RefreshCw className="animate-spin" size={18} /> : <CreditCard size={18} />}
                                        Payer par carte bancaire ({currency}) <ArrowRight size={16} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mb-12 glass-card p-8">
                <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                    <Mail size={24} className="text-primary" />
                    Contact de facturation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-slate-400">Nom du contact</label>
                        <input
                            type="text"
                            value={billingContactName}
                            onChange={(e) => setBillingContactName(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-slate-400">Email de facturation</label>
                        <input
                            type="email"
                            value={billingContactEmail}
                            onChange={(e) => setBillingContactEmail(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all"
                        />
                    </div>
                </div>

                <button
                    onClick={() => void handleBillingContactSave()}
                    disabled={savingBillingContact}
                    className="btn-primary mt-8 px-6 py-3 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                >
                    <Save size={18} />
                    {savingBillingContact ? 'Enregistrement...' : 'Mettre a jour le contact'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-6 border-white/10 bg-white/5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                        <Smartphone size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold mb-1 tracking-tight">Mobile Money</h4>
                        <p className="text-slate-400 text-sm">Flutterwave prend le relais pour les comptes en devise Mobile Money prise en charge.</p>
                    </div>
                </div>
                <div className="glass-card p-6 border-white/10 bg-white/5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400 shrink-0">
                        <CreditCard size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold mb-1 tracking-tight">Carte bancaire</h4>
                        <p className="text-slate-400 text-sm">Stripe gere les devises carte configurees pour le web.</p>
                    </div>
                </div>
            </div>

            <div className="mt-12 glass-card overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/5 flex items-center gap-2">
                    <History size={20} className="text-slate-400" />
                    <h3 className="text-lg font-bold text-white">Historique de facturation</h3>
                </div>
                <div className="p-10 text-center text-slate-500 flex flex-col items-center gap-4">
                    <Download size={48} className="opacity-10" />
                    <p>Aucune facture disponible pour le moment.</p>
                </div>
            </div>
        </div>
    );
}
