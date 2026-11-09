'use client';

// Livraison Denkma de la boutique : connexion d'un compte Denkma Pro existant. La création d'un compte
// se fait dans l'application mobile, qui localise le point de collecte et confirme le numéro par SMS.
import React, { useCallback, useEffect, useState } from 'react';
import { Bike } from 'lucide-react';
import { ecommerce as ecommerceApi, type DenkmaConnection } from '../services/api';

const CATEGORIES: Array<{ value: 'small' | 'large'; label: string }> = [
    { value: 'small', label: 'Petit colis' },
    { value: 'large', label: 'Gros colis' },
];

export default function DenkmaSettingsPanel({ canEdit, readOnlyMessage, onNotice }: {
    canEdit: boolean;
    readOnlyMessage?: string;
    onNotice: (tone: 'success' | 'error', message: string) => void;
}) {
    const [state, setState] = useState<DenkmaConnection | null>(null);
    const [weight, setWeight] = useState('1');
    const [category, setCategory] = useState<'small' | 'large'>('small');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const next = await ecommerceApi.getDenkma();
            setState(next);
            setWeight(String(next.weight_kg ?? 1));
            setCategory(next.parcel_category || 'small');
        } catch {
            setState(null);
        }
    }, []);

    // Au retour de l'onglet Denkma Pro (autorisation donnée), l'état est relu.
    useEffect(() => {
        void load();
        const onFocus = () => void load();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [load]);

    async function connect() {
        setBusy(true);
        try {
            const { url } = await ecommerceApi.connectDenkma();
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (err: any) {
            onNotice('error', err?.message || "Impossible d'ouvrir Denkma Pro pour le moment.");
        } finally {
            setBusy(false);
        }
    }

    async function save(event: React.FormEvent) {
        event.preventDefault();
        const value = Number(weight.replace(',', '.'));
        if (!Number.isFinite(value) || value <= 0 || value > 1000) {
            onNotice('error', 'Indiquez un poids entre 0,1 et 1 000 kg.');
            return;
        }
        setBusy(true);
        try {
            setState(await ecommerceApi.updateDenkmaSettings({ weight_kg: value, parcel_category: category }));
            onNotice('success', 'Réglages de livraison Denkma enregistrés.');
        } catch (err: any) {
            onNotice('error', err?.message || "Impossible d'enregistrer les réglages Denkma.");
        } finally {
            setBusy(false);
        }
    }

    async function disconnect() {
        if (!window.confirm("Déconnecter Denkma ? Vos clients écriront de nouveau leur adresse. Les livraisons déjà demandées continuent. Révoquez aussi l'accès dans Mes boutiques de Denkma Pro si vous ne l'utilisez plus.")) return;
        try {
            await ecommerceApi.disconnectDenkma();
            await load();
            onNotice('success', 'Denkma est déconnecté.');
        } catch (err: any) {
            onNotice('error', err?.message || 'Impossible de déconnecter Denkma.');
        }
    }

    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-start gap-3">
                <Bike size={22} className="mt-0.5 shrink-0 text-blue-300" aria-hidden="true" />
                <div>
                    <p className="text-sm font-black text-white">Livraison Denkma</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">Vos clients indiquent leur position sur une carte ou choisissent un point relais, au lieu d&apos;écrire une adresse. Le prix exact de la livraison s&apos;ajoute à leur commande, et vous expédiez en un geste.</p>
                </div>
            </div>
            {!state?.connected ? (
                <div className="space-y-3">
                    <p className="text-sm leading-6 text-slate-400">Il faut un compte Denkma Pro approuvé, avec votre point de collecte confirmé et votre compte transport rechargé.</p>
                    {state?.signup_available && (
                        <p className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 text-sm leading-6 text-slate-200">Pas encore de compte Denkma Pro ? Créez-le depuis l&apos;application mobile Stockman, dans Paramètres &gt; Site e-commerce &gt; Livraison Denkma : votre téléphone y localise votre point de collecte et confirme votre numéro par SMS.</p>
                    )}
                    {canEdit ? (
                        <>
                            <button type="button" disabled={busy} onClick={() => void connect()} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-50">
                                <Bike size={18} aria-hidden="true" />{busy ? 'Ouverture...' : 'Connecter Denkma Pro'}
                            </button>
                            <p className="text-xs text-slate-500">Vous autorisez Stockman dans votre espace Denkma Pro, puis revenez sur cette page.</p>
                        </>
                    ) : readOnlyMessage && <p className="text-sm text-slate-300">{readOnlyMessage}</p>}
                </div>
            ) : (
                <div className="space-y-4">
                    <div role="status" className={`rounded-2xl border-l-4 border p-4 ${state.validation_pending || state.problem || state.transport_open === false ? 'border-amber-400/40 bg-amber-500/10' : 'border-emerald-400/40 bg-emerald-500/10'}`}>
                        <p className="text-sm font-black text-white">{state.validation_pending ? 'Compte Denkma Pro en attente de validation' : `Denkma est connecté${state.key_hint ? ` (clé …${state.key_hint})` : ''}`}</p>
                        <p className="mt-1 text-sm text-slate-300">{state.problem || (state.transport_open === false ? 'Le service de livraison Denkma Pro est fermé pour votre commerce.' : 'Vos clients choisissent leur position ou un point relais Denkma au moment de commander.')}</p>
                    </div>
                    {canEdit ? (
                        <form onSubmit={(event) => void save(event)} className="space-y-3">
                            <p className="text-sm font-bold text-white">Colis habituel</p>
                            <p className="text-xs text-slate-400">Sert au calcul du prix de livraison. Les gros colis ne vont pas en point relais.</p>
                            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Taille du colis habituel">
                                {CATEGORIES.map((item) => (
                                    <button key={item.value} type="button" role="radio" aria-checked={category === item.value} onClick={() => setCategory(item.value)} className={`min-h-10 rounded-full border px-4 text-sm font-bold ${category === item.value ? 'border-primary bg-primary/15 text-white' : 'border-white/10 bg-white/5 text-slate-300'}`}>{item.label}</button>
                                ))}
                            </div>
                            <label className="flex max-w-xs items-center gap-2 text-sm text-slate-300">
                                <span className="sr-only">Poids habituel d&apos;un colis</span>
                                <input value={weight} onChange={(event) => setWeight(event.target.value)} inputMode="decimal" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-primary/50" />
                                kg
                            </label>
                            <div className="flex flex-wrap items-center gap-3">
                                <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center rounded-2xl bg-white/10 px-5 text-sm font-black text-white hover:bg-white/15 disabled:opacity-50">Enregistrer</button>
                                <button type="button" onClick={() => void disconnect()} className="inline-flex min-h-11 items-center rounded-2xl px-4 text-sm font-bold text-rose-200 hover:bg-rose-500/10">Déconnecter Denkma</button>
                            </div>
                        </form>
                    ) : readOnlyMessage && <p className="text-xs text-slate-400">{readOnlyMessage}</p>}
                </div>
            )}
        </div>
    );
}
