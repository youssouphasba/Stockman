'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    CreditCard,
    CheckCircle2,
    ShieldCheck,
    History,
    Download,
    AlertCircle,
    ArrowRight,
    Star,
    Smartphone,
    RefreshCw
} from 'lucide-react';
import { subscription as subApi } from '../services/api';

export default function Subscription() {
    const { t } = useTranslation();
    const [subDetails, setSubDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<'cinetpay' | 'stripe' | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSubDetails();
    }, []);

    const loadSubDetails = async () => {
        setLoading(true);
        try {
            setError(null);
            const data = await subApi.getDetails();
            setSubDetails(data);
        } catch (err: any) {
            console.error("Subscription details error", err);
            setError(err.message || "Erreur de chargement");
        } finally {
            setLoading(false);
        }
    };

    const handleCinetPay = async (plan: string) => {
        setPurchasing('cinetpay');
        try {
            const { payment_url } = await subApi.checkout(plan);
            window.location.href = payment_url;
        } catch (err) {
            console.error("CinetPay init error", err);
            alert("Erreur lors de l'initialisation du paiement Mobile Money.");
        } finally {
            setPurchasing(null);
        }
    };

    const handleStripe = async (plan: string) => {
        setPurchasing('stripe');
        try {
            const { checkout_url } = await subApi.stripeCheckout(plan);
            window.location.href = checkout_url;
        } catch (err) {
            console.error("Stripe init error", err);
            alert("Erreur lors de l'initialisation du paiement par carte.");
        } finally {
            setPurchasing(null);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    const plans = [
        {
            id: 'enterprise',
            name: 'Enterprise',
            price: priceLabel,
            period: '/ mois',
            icon: Star,
            color: 'text-primary',
            bg: 'bg-primary/10',
            popular: true,
            features: [
                'Produits & stocks illimités',
                'Équipes illimitées (multi-utilisateurs)',
                'Multi-boutiques illimitées',
                'Analyses IA & Prévisions avancées',
                'CRM clients & Portail Fournisseur',
                'Grand Livre & Comptabilité complète',
                'Support prioritaire 24/7'
            ]
        }
    ];

    const currentPlan = subDetails?.plan || 'starter';
    const useMobileMoney: boolean = subDetails?.use_mobile_money ?? true;
    const currency: string = subDetails?.currency || 'XOF';
    const isXOF = currency === 'XOF' || currency === 'XAF';
    const priceLabel = isXOF ? '10 000 FCFA' : '29,99 €';

    return (
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0F172A]">
            {error && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-rose-500">
                        <AlertCircle size={20} />
                        <span className="font-medium text-sm tracking-tight">{error}</span>
                    </div>
                    <button
                        onClick={loadSubDetails}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all"
                    >
                        Réessayer
                    </button>
                </div>
            )}

            <header className="mb-10">
                <h1 className="text-3xl font-bold text-white mb-2">Gestion d'Abonnement</h1>
                <p className="text-slate-400">Gérez votre entreprise avec le plan Enterprise.</p>
            </header>

            {/* Current Status Banner */}
            <div className={`mb-12 glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-l-4 ${subDetails?.is_active ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-rose-500 bg-rose-500/5'
                }`}>
                <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${subDetails?.is_active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                        }`}>
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider">Plan actuel : {currentPlan}</h2>
                        <p className="text-slate-400 text-sm">
                            {subDetails?.is_active
                                ? `Votre abonnement est actif jusqu'au ${new Date(subDetails.expiry_date).toLocaleDateString()}.`
                                : "Votre période d'essai est terminée. Souscrivez au plan Enterprise pour continuer."}
                        </p>
                    </div>
                </div>
                {!subDetails?.is_active && (
                    useMobileMoney ? (
                        <button onClick={() => handleCinetPay('enterprise')} disabled={!!purchasing} className="btn-primary px-6 py-3 rounded-xl shadow-xl shadow-primary/20 transition-all hover:scale-105 flex items-center gap-2">
                            {purchasing === 'cinetpay' ? <RefreshCw className="animate-spin" size={18} /> : <Smartphone size={18} />}
                            Réactiver via Mobile Money
                        </button>
                    ) : (
                        <button onClick={() => handleStripe('enterprise')} disabled={!!purchasing} className="btn-primary px-6 py-3 rounded-xl shadow-xl shadow-primary/20 transition-all hover:scale-105 flex items-center gap-2">
                            {purchasing === 'stripe' ? <RefreshCw className="animate-spin" size={18} /> : <CreditCard size={18} />}
                            Réactiver par carte bancaire
                        </button>
                    )
                )}
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {plans.map(plan => (
                    <div key={plan.id} className={`glass-card p-8 flex flex-col gap-8 relative overflow-hidden group border-2 ${plan.popular ? 'border-primary/30 shadow-2xl shadow-primary/10' : 'border-white/5'
                        }`}>
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
                                    <span className="text-slate-500 text-sm font-medium">{plan.period}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            {plan.features.map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <CheckCircle2 size={18} className="text-primary mt-0.5" />
                                    <span className="text-slate-300 text-sm leading-relaxed">{feature}</span>
                                </div>
                            ))}
                        </div>

                        {plan.id === currentPlan && subDetails?.is_active ? (
                            <div className="w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold bg-white/5 text-slate-500 border border-white/5">
                                <CheckCircle2 size={18} />
                                Plan Actuel
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {useMobileMoney ? (
                                    <button
                                        onClick={() => handleCinetPay(plan.id)}
                                        disabled={!!purchasing}
                                        className="w-full py-3 rounded-xl flex items-center justify-center gap-3 font-bold btn-primary shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        {purchasing === 'cinetpay' ? <RefreshCw className="animate-spin" size={18} /> : <Smartphone size={18} />}
                                        Payer via Mobile Money ({currency})
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleStripe(plan.id)}
                                        disabled={!!purchasing}
                                        className="w-full py-3 rounded-xl flex items-center justify-center gap-3 font-bold btn-primary shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        {purchasing === 'stripe' ? <RefreshCw className="animate-spin" size={18} /> : <CreditCard size={18} />}
                                        Payer par carte bancaire (EUR) <ArrowRight size={16} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Payment Methods Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-6 border-white/10 bg-white/5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                        <Smartphone size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold mb-1 tracking-tight">Mobile Money</h4>
                        <p className="text-slate-400 text-sm">Orange Money, Wave ou Moov via CinetPay. Paiement en FCFA.</p>
                    </div>
                    <div className="flex gap-1 opacity-50 shrink-0">
                        <div className="bg-white px-2 py-1 rounded font-black text-[9px] text-orange-500">ORANGE</div>
                        <div className="bg-white px-2 py-1 rounded font-black text-[9px] text-blue-500">WAVE</div>
                    </div>
                </div>
                <div className="glass-card p-6 border-white/10 bg-white/5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400 shrink-0">
                        <CreditCard size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold mb-1 tracking-tight">Carte bancaire</h4>
                        <p className="text-slate-400 text-sm">Visa, Mastercard via Stripe. Paiement sécurisé en EUR.</p>
                    </div>
                    <div className="flex gap-1 opacity-50 shrink-0">
                        <div className="bg-white px-2 py-1 rounded font-black text-[9px] text-blue-700">VISA</div>
                        <div className="bg-white px-2 py-1 rounded font-black text-[9px] text-red-500">MC</div>
                    </div>
                </div>
            </div>

            {/* Billing History */}
            <div className="mt-12 glass-card overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/5 flex items-center gap-2">
                    <History size={20} className="text-slate-400" />
                    <h3 className="text-lg font-bold text-white">Historique de Facturation</h3>
                </div>
                <div className="p-10 text-center text-slate-500 flex flex-col items-center gap-4">
                    <Download size={48} className="opacity-10" />
                    <p>Aucune facture disponible pour le moment.</p>
                </div>
            </div>
        </div>
    );
}
