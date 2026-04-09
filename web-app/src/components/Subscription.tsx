'use client';

import React, { useEffect, useState } from 'react';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Clock,
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
import { settings as settingsApi, subscription as subApi, type SubscriptionData } from '../services/api';
import { COUNTRIES } from '@/data/countries';
import ScreenGuide, { GuideStep } from './ScreenGuide';

type PlanId = 'starter' | 'pro' | 'enterprise';

const PLAN_META: Record<PlanId, { icon: typeof Smartphone; color: string; bg: string; popular: boolean; features: string[] }> = {
    starter: {
        icon: Smartphone,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        popular: false,
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
        popular: false,
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

function formatDemoTypeLabel(demoType: string | null) {
    switch (demoType) {
        case 'retail':
            return 'Commerce';
        case 'restaurant':
            return 'Restaurant';
        case 'enterprise':
            return 'Enterprise';
        default:
            return 'Demo';
    }
}

function isAllowedCheckoutUrl(rawUrl: string) {
    try {
        const parsed = new URL(rawUrl);
        const hostname = parsed.hostname.toLowerCase();
        return (
            parsed.protocol === 'https:' &&
            (
                hostname === 'checkout.stripe.com' ||
                hostname.endsWith('.stripe.com') ||
                hostname === 'checkout.flutterwave.com' ||
                hostname.endsWith('.flutterwave.com')
            )
        );
    } catch {
        return false;
    }
}

export default function Subscription() {
    const [subDetails, setSubDetails] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<'flutterwave' | 'stripe' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [billingContactName, setBillingContactName] = useState('');
    const [billingContactEmail, setBillingContactEmail] = useState('');
    const [savingBillingContact, setSavingBillingContact] = useState(false);

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
        } catch (err: any) {
            console.error('Subscription details error', err);
            setError(err.message || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    const handleFlutterwave = async (plan: PlanId) => {
        setPurchasing('flutterwave');
        try {
            const { payment_url } = await subApi.checkout(plan);
            if (!isAllowedCheckoutUrl(payment_url)) {
                throw new Error('URL de paiement non autorisee');
            }
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
            if (!isAllowedCheckoutUrl(checkout_url)) {
                throw new Error('URL de paiement non autorisee');
            }
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

    if (loading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }
    if (!subDetails) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A] text-slate-300">
                Impossible de charger les informations d'abonnement.
            </div>
        );
    }

    const currentPlan = (subDetails.plan || 'starter') as PlanId;
    const isActive = subDetails.status === 'active';
    const accessPhase = subDetails.subscription_access_phase || 'active';
    const currency = subDetails.currency || 'XOF';
    const canUseMobileMoney = Boolean(subDetails.use_mobile_money);
    const shouldHighlightEnterpriseUpgrade = currentPlan !== 'enterprise';
    const billingCountry = COUNTRIES.find((country) => country.code === subDetails.country_code) || COUNTRIES[0];
    const plans = (['starter', 'pro', 'enterprise'] as PlanId[]).map((planId) => {
        const quote = subDetails.effective_prices?.[planId];
        return {
            id: planId,
            name: planId.charAt(0).toUpperCase() + planId.slice(1),
            price: quote.display_price || 'Prix a venir',
            provider: quote.provider || subDetails.recommended_checkout_provider || 'stripe',
            ...PLAN_META[planId],
        };
    });

    const subscriptionSteps: GuideStep[] = [
        {
            title: "Rôle de cet écran",
            content: "Cet écran vous permet de suivre votre formule, votre statut d'accès, votre devise de facturation et le bon canal de paiement. C'est l'endroit à consulter avant un renouvellement, un changement de formule ou un contrôle de facturation.",
        },
        {
            title: 'Comprendre votre statut actuel',
            content: "Le grand bloc du haut vous indique si votre abonnement est actif, s'il arrive à échéance ou si une continuité d'activité est en cours. Commencez toujours ici pour savoir si vous devez agir immédiatement ou non.",
            details: [
                { label: 'Plan actuel', description: "Affiche la formule active sur le compte pour éviter toute confusion avant un paiement.", type: 'card' },
                { label: 'Dates importantes', description: "Montre les échéances de fin de période, de grâce ou de passage en lecture seule quand elles existent.", type: 'info' },
            ],
        },
        {
            title: 'Vérifier le pays et la devise',
            content: "La carte « Pays et devise de facturation » rappelle le cadre tarifaire appliqué au compte. Elle permet de vérifier que les prix affichés et les canaux de paiement correspondent au pays de facturation.",
        },
        {
            title: 'Comparer les formules',
            content: "Chaque carte de formule présente le prix effectif et les principaux avantages. Si le compte est déjà en Starter ou Pro, le passage à Enterprise se fait sur le même compte, sans recréer les données.",
            details: [
                { label: 'Carte de formule', description: "Affiche le nom, le prix mensuel et les éléments clés inclus dans la formule.", type: 'card' },
                { label: 'Plan actuel', description: "La formule active reste visible avec un état clair pour éviter toute ambiguïté avant un changement.", type: 'info' },
            ],
        },
        {
            title: 'Passer de Starter ou Pro à Enterprise',
            content: "Le passage à Enterprise conserve le compte, les boutiques et les données. L'application web complète s'active après confirmation du paiement par le prestataire de facturation.",
        },
        {
            title: 'Choisir le bon mode de paiement',
            content: "Les boutons de paiement affichés sur chaque formule dépendent de votre devise, de votre plateforme et de votre compte. Utilisez uniquement le canal affiché sur l'écran pour lancer un paiement.",
            details: [
                { label: 'Payer par carte bancaire', description: "Ouvre le parcours de paiement sécurisé pour les comptes éligibles à la carte.", type: 'button' },
                { label: 'Payer via Mobile Money', description: "Apparaît uniquement quand ce mode de règlement est disponible pour votre devise.", type: 'button' },
            ],
        },
        {
            title: 'Mettre à jour le contact de facturation',
            content: "Le bloc « Contact de facturation » sert à définir la personne et l'adresse e-mail qui doivent recevoir les rappels, confirmations ou échanges liés à la facturation. Relisez ces informations avant chaque renouvellement important.",
        },
        {
            title: "Relire les rappels et l'historique",
            content: "En bas de page, les cartes de rappel expliquent quels prestataires gèrent les différents paiements, et l'historique de facturation regroupe ensuite les éléments de suivi disponibles. Revenez ici si vous avez un doute après un paiement ou un changement de formule.",
        },
    ];

    return (
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar bg-[#0F172A]">
            <ScreenGuide guideKey="subscription_tour" steps={subscriptionSteps} />
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
                                ? `Votre abonnement est actif${subDetails.subscription_end ? ` jusqu'au ${new Date(subDetails.subscription_end).toLocaleDateString()}` : ''}.`
                                : 'Votre essai ou votre abonnement arrive a terme. Choisissez un plan ci-dessous pour continuer.'}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">
                            Devise : {currency} ? Region : {subDetails.pricing_region || 'fallback'}
                        </p>
                    </div>
                </div>
            </div>

            {shouldHighlightEnterpriseUpgrade && (
                <div className="mb-12 rounded-3xl border border-primary/25 bg-primary/10 p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                                <Star size={14} />
                                Evolution vers Enterprise
                            </div>
                            <h3 className="mt-3 text-xl font-black text-white">
                                Le passage a Enterprise garde votre compte et debloque le web complet.
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                                Vous ne recreez pas un nouveau compte. Vous gardez vos boutiques, vos utilisateurs et vos donnees. Une fois le paiement confirme, votre compte actuel passe en Enterprise et le back-office web sort du mode consultation.
                            </p>
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">1. Verifier</p>
                                    <p className="mt-2 text-sm text-slate-300">Confirmez le pays, la devise et le contact de facturation.</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">2. Payer</p>
                                    <p className="mt-2 text-sm text-slate-300">Lancez le paiement Enterprise par carte ou Mobile Money selon la devise.</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">3. Activer</p>
                                    <p className="mt-2 text-sm text-slate-300">Le web complet se debloque des que le paiement est confirme par Stripe ou Flutterwave.</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-[#0F172A]/60 p-5 lg:max-w-sm">
                            <p className="text-sm font-black text-white">Ce qui ne change pas</p>
                            <ul className="mt-3 space-y-2 text-sm text-slate-300">
                                <li>Votre compte principal reste le meme.</li>
                                <li>Vos donnees et vos boutiques sont conservees.</li>
                                <li>Vous pouvez revenir au web app pendant tout le parcours.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {subDetails.is_demo && (
                <div className="mb-12 rounded-3xl border border-sky-500/20 bg-sky-500/10 p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-300 flex items-center justify-center">
                            <Clock size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white mb-2">Session demo active</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                    Type: <strong className="text-white">{formatDemoTypeLabel(subDetails.demo_type ?? null)}</strong>
                                {' - '}Surface: <strong className="text-white">{subDetails.demo_surface || 'mobile'}</strong>
                                {' - '}Expiration: <strong className="text-white">{subDetails.demo_expires_at ? new Date(subDetails.demo_expires_at).toLocaleString('fr-FR') : '-'}</strong>
                            </p>
                        </div>
                    </div>
                </div>
            )}

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
                                Vous pouvez toujours regulariser l&apos;abonnement sans perdre vos donnees.
                                {subDetails.grace_until ? ` Fin de grace : ${new Date(subDetails.grace_until).toLocaleDateString('fr-FR')}.` : ''}
                                {subDetails.read_only_after ? ` Passage en lecture seule : ${new Date(subDetails.read_only_after).toLocaleDateString('fr-FR')}.` : ''}
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
                            Le pays de facturation est defini lors de l inscription et ne peut pas etre modifie depuis cet ecran.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Pays de facturation</label>
                        <div className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white">
                            {billingCountry.flag} {billingCountry.name}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Region tarifaire : {subDetails.pricing_region || 'fallback'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Devise de facturation</label>
                        <div className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white">
                            {billingCountry.currency}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Si une correction est necessaire, elle doit passer par le support avant facturation.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`glass-card p-8 flex flex-col gap-8 relative overflow-hidden group border-2 ${
                            plan.id === 'enterprise' && shouldHighlightEnterpriseUpgrade
                                ? 'border-primary/40 shadow-2xl shadow-primary/10 ring-1 ring-primary/30'
                                : plan.popular ? 'border-primary/30 shadow-2xl shadow-primary/10' : 'border-white/5'
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
                                {plan.id === 'enterprise' && shouldHighlightEnterpriseUpgrade && (
                                    <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-slate-200">
                                        Le paiement Enterprise met à jour le compte actuel. L&apos;application web complète s&apos;active après confirmation du paiement.
                                    </div>
                                )}
                                <button
                                    onClick={() => void handleStripe(plan.id)}
                                    disabled={!!purchasing}
                                    className="w-full py-3 rounded-xl flex items-center justify-center gap-3 font-bold btn-primary shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    {purchasing === 'stripe' ? <RefreshCw className="animate-spin" size={18} /> : <CreditCard size={18} />}
                                    {plan.id === 'enterprise' && shouldHighlightEnterpriseUpgrade
                                        ? `Passer à Enterprise par carte (${currency})`
                                        : `Payer par carte bancaire (${currency})`} <ArrowRight size={16} />
                                </button>
                                {canUseMobileMoney ? (
                                    <button
                                        onClick={() => void handleFlutterwave(plan.id)}
                                        disabled={!!purchasing}
                                        className="w-full py-3 rounded-xl flex items-center justify-center gap-3 font-bold bg-emerald-500/90 text-white shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        {purchasing === 'flutterwave' ? <RefreshCw className="animate-spin" size={18} /> : <Smartphone size={18} />}
                                        {plan.id === 'enterprise' && shouldHighlightEnterpriseUpgrade
                                            ? `Passer à Enterprise via Mobile Money (${currency})`
                                            : `Payer via Mobile Money (${currency})`}
                                    </button>
                                ) : (
                                    <div className="text-xs text-slate-500 text-center">
                                        Mobile Money indisponible pour cette devise.
                                    </div>
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
                    {savingBillingContact ? 'Enregistrement...' : 'Mettre à jour le contact'}
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
                        <p className="text-slate-400 text-sm">Stripe gère les paiements par carte configurés pour l&apos;application web.</p>
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


