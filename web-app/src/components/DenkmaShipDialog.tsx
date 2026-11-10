'use client';

// « Livrer avec Denkma » sur le web : paiement du client confirmé et photo du colis, puis Stockman
// réserve le transport, déclare le colis prêt et demande l'enlèvement à Denkma.
import React, { useState } from 'react';
import { Bike, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { ecommerce as ecommerceApi } from '../services/api';
import { amountDue, denkmaDelivery, denkmaDestination } from '../lib/denkmaShipping';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function DenkmaShipDialog({ order, formatAmount, onClose, onShipped }: {
    order: any;
    formatAmount: (amount: number) => string;
    onClose: () => void;
    onShipped: (order: any) => void;
}) {
    const [paid, setPaid] = useState(false);
    const [photo, setPhoto] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const delivery = denkmaDelivery(order);
    // La photo est facultative : elle sert de preuve au commerçant, elle ne retarde pas l'enlèvement.
    const ready = paid && !busy;

    function choose(file: File | undefined) {
        setError(null);
        if (!file) return;
        if (!PHOTO_TYPES.includes(file.type)) {
            setError('Utilisez une photo JPEG, PNG ou WebP.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('La photo est trop volumineuse : 5 Mo au maximum.');
            return;
        }
        setPhoto(file);
    }

    async function ship(event: React.FormEvent) {
        event.preventDefault();
        if (!ready) return;
        setBusy(true);
        setError(null);
        try {
            const form = new FormData();
            form.append('customer_paid', 'true');
            if (photo) form.append('photo', photo, photo.name || 'colis.jpg');
            onShipped(await ecommerceApi.shipWithDenkma(order.order_id, form));
        } catch (err: any) {
            setError(err?.message || "L'expédition n'a pas pu être demandée. Réessayez.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal isOpen onClose={onClose} title={`Livrer avec Denkma · ${order.order_number}`} maxWidth="lg">
            <form onSubmit={(event) => void ship(event)} className="space-y-4 text-sm leading-6 text-slate-300">
                {delivery && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="font-bold text-white">{denkmaDestination(delivery)}</p>
                        <p>Frais Denkma réservés sur votre compte transport : {formatAmount(delivery.fee || 0)}</p>
                        <p className="text-xs text-slate-400">Le livreur vient chercher le colis au point de collecte enregistré dans Denkma Pro.</p>
                    </div>
                )}
                <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <input type="checkbox" checked={paid} onChange={(event) => setPaid(event.target.checked)} className="mt-1 h-5 w-5 accent-blue-500" />
                    <span>
                        <span className="block font-bold text-white">1. Le client a payé {formatAmount(amountDue(order))}</span>
                        <span className="text-xs text-slate-400">Articles et livraison. Denkma ne collecte pas le paiement des marchandises.</span>
                    </span>
                </label>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <label htmlFor="denkma-photo" className="block font-bold text-white">2. Photo du colis prêt (facultatif)</label>
                    <p className="text-xs text-slate-400">Gardez une preuve de l&apos;état du colis au départ, si vous le souhaitez. JPEG, PNG ou WebP, 5 Mo au maximum.</p>
                    <input id="denkma-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => choose(event.target.files?.[0])} className="mt-3 block w-full text-sm text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:font-bold file:text-white" />
                    {photo && <p className="mt-2 text-xs text-emerald-300">Photo choisie : {photo.name}</p>}
                </div>
                {error && <p role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 font-semibold text-rose-200">{error}</p>}
                <button type="submit" disabled={!ready} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white transition hover:bg-blue-500 disabled:opacity-50">
                    {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Bike size={18} aria-hidden="true" />}
                    {busy ? 'Expédition en cours...' : 'Expédier avec Denkma'}
                </button>
                <p className="text-center text-xs text-slate-400">Stockman réserve le transport, déclare le colis prêt et demande l&apos;enlèvement. Le suivi s&apos;affiche ensuite dans la commande.</p>
            </form>
        </Modal>
    );
}
