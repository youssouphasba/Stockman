'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Link2, PackagePlus, RefreshCcw, Search } from 'lucide-react';
import Modal from './Modal';
import { DeliveryMappingItem, MatchSuggestion, supplier_orders as ordersApi, products as productsApi } from '../services/api';
import { useDateFormatter } from '../hooks/useDateFormatter';

type Decision = {
    product_id?: string;
    product_name?: string;
    create_new: boolean;
};

type Props = {
    isOpen: boolean;
    orderId: string | null;
    onClose: () => void;
    onConfirmed: () => void;
};

export default function DeliveryConfirmationModal({ isOpen, orderId, onClose, onConfirmed }: Props) {
    const { formatCurrency } = useDateFormatter();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [decisions, setDecisions] = useState<Record<string, Decision>>({});
    const [searchingFor, setSearchingFor] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        if (!isOpen || !orderId) return;
        let cancelled = false;
        const currentOrderId = orderId;

        async function load() {
            setLoading(true);
            setSearchingFor(null);
            setSearchText('');
            try {
                const [matches, products] = await Promise.all([
                    ordersApi.suggestMatches(currentOrderId),
                    productsApi.list(undefined, 0, 500),
                ]);
                if (cancelled) return;

                const inventoryItems = products.items || products || [];
                const initialDecisions: Record<string, Decision> = {};
                for (const suggestion of matches.suggestions || []) {
                    if (suggestion.source === 'mapping' && suggestion.matched_product_id) {
                        initialDecisions[suggestion.catalog_id] = {
                            product_id: suggestion.matched_product_id,
                            product_name: suggestion.matched_product_name || undefined,
                            create_new: false,
                        };
                    } else if (suggestion.matched_product_id && suggestion.confidence >= 0.7) {
                        initialDecisions[suggestion.catalog_id] = {
                            product_id: suggestion.matched_product_id,
                            product_name: suggestion.matched_product_name || undefined,
                            create_new: false,
                        };
                    } else {
                        initialDecisions[suggestion.catalog_id] = { create_new: true };
                    }
                }

                setSuggestions(matches.suggestions || []);
                setInventory(inventoryItems);
                setDecisions(initialDecisions);
            } catch (error) {
                console.error('Delivery confirmation load error', error);
                setSuggestions([]);
                setInventory([]);
                setDecisions({});
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [isOpen, orderId]);

    const filteredInventory = useMemo(() => {
        const term = searchText.trim().toLowerCase();
        if (!term) return inventory;
        return inventory.filter((product) => (product?.name || '').toLowerCase().includes(term));
    }, [inventory, searchText]);

    const searchingSuggestion = suggestions.find((item) => item.catalog_id === searchingFor);

    const getBadge = (suggestion: MatchSuggestion) => {
        if (suggestion.source === 'mapping') {
            return { label: 'Auto', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
        }
        if (suggestion.confidence >= 0.7) {
            return { label: `${Math.round(suggestion.confidence * 100)}%`, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
        }
        if (suggestion.confidence >= 0.4) {
            return { label: `${Math.round(suggestion.confidence * 100)}%`, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
        }
        return { label: 'A verifier', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    };

    const selectProduct = (catalogId: string, product: any) => {
        setDecisions((current) => ({
            ...current,
            [catalogId]: {
                product_id: product.product_id,
                product_name: product.name,
                create_new: false,
            },
        }));
        setSearchingFor(null);
        setSearchText('');
    };

    const chooseCreateNew = (catalogId: string) => {
        setDecisions((current) => ({
            ...current,
            [catalogId]: {
                create_new: true,
                product_id: undefined,
                product_name: undefined,
            },
        }));
    };

    const handleConfirm = async () => {
        if (!orderId) return;
        setSubmitting(true);
        try {
            const mappings: DeliveryMappingItem[] = suggestions.map((suggestion) => {
                const decision = decisions[suggestion.catalog_id];
                return {
                    catalog_id: suggestion.catalog_id,
                    product_id: decision?.product_id,
                    create_new: decision?.create_new ?? false,
                };
            });
            await ordersApi.confirmDelivery(orderId, mappings);
            onConfirmed();
        } catch (error) {
            console.error('Delivery confirmation submit error', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (!submitting) onClose();
            }}
            title="Confirmer la reception marketplace"
            maxWidth="2xl"
        >
            {searchingFor ? (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Association en cours</p>
                        <p className="mt-2 text-lg font-bold text-white">{searchingSuggestion?.catalog_name || 'Produit catalogue'}</p>
                        <p className="mt-1 text-sm text-slate-400">
                            Selectionnez le produit interne qui doit recevoir le stock a la livraison.
                        </p>
                    </div>

                    <div className="relative">
                        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            value={searchText}
                            onChange={(event) => setSearchText(event.target.value)}
                            placeholder="Rechercher un produit de votre stock"
                            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-white outline-none focus:border-primary/40"
                        />
                    </div>

                    <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                        {filteredInventory.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-12 text-center text-sm text-slate-500">
                                Aucun produit interne ne correspond a cette recherche.
                            </div>
                        ) : filteredInventory.map((product) => (
                            <button
                                key={product.product_id}
                                type="button"
                                onClick={() => selectProduct(searchingFor, product)}
                                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-white/10"
                            >
                                <div>
                                    <p className="text-sm font-bold text-white">{product.name}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Stock: {product.quantity} {product.unit || 'unite'}
                                    </p>
                                </div>
                                <Link2 size={18} className="text-primary" />
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSearchingFor(null);
                                setSearchText('');
                            }}
                            className="flex-1 rounded-xl border border-white/10 px-4 py-3 font-bold text-slate-300 transition-all hover:bg-white/5"
                        >
                            Retour
                        </button>
                        {searchingFor && (
                            <button
                                type="button"
                                onClick={() => chooseCreateNew(searchingFor)}
                                className="flex-1 rounded-xl bg-amber-500/10 px-4 py-3 font-bold text-amber-400 transition-all hover:bg-amber-500/20"
                            >
                                Creer un nouveau produit
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">
                            Validez la livraison en liant chaque ligne du catalogue marketplace a votre stock existant,
                            ou en laissant le systeme creer un nouveau produit si necessaire.
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="flex items-center gap-3 text-slate-400">
                                <RefreshCcw size={18} className="animate-spin" />
                                Analyse du catalogue et suggestions en cours...
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {suggestions.map((suggestion) => {
                                const decision = decisions[suggestion.catalog_id];
                                const badge = getBadge(suggestion);
                                return (
                                    <div key={suggestion.catalog_id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-base font-bold text-white">{suggestion.catalog_name}</p>
                                                    <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${badge.color}`}>
                                                        {badge.label}
                                                    </span>
                                                </div>
                                                <p className="mt-2 text-sm text-slate-400">
                                                    {suggestion.quantity} x {formatCurrency(suggestion.unit_price)} {suggestion.catalog_category ? `• ${suggestion.catalog_category}` : ''}
                                                    {suggestion.catalog_subcategory ? ` • ${suggestion.catalog_subcategory}` : ''}
                                                </p>
                                                {suggestion.reason ? (
                                                    <p className="mt-2 text-xs text-slate-500">{suggestion.reason}</p>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                                            {decision?.product_id && !decision.create_new ? (
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <CheckCircle2 size={18} className="text-emerald-400" />
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{decision.product_name}</p>
                                                            <p className="text-xs text-slate-500">Le stock sera ajoute a ce produit.</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSearchingFor(suggestion.catalog_id)}
                                                            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-primary transition-all hover:bg-white/5"
                                                        >
                                                            Changer
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => chooseCreateNew(suggestion.catalog_id)}
                                                            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-amber-400 transition-all hover:bg-white/5"
                                                        >
                                                            Nouveau produit
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <PackagePlus size={18} className="text-amber-400" />
                                                        <div>
                                                            <p className="text-sm font-bold text-white">Creation d'un nouveau produit</p>
                                                            <p className="text-xs text-slate-500">Le produit sera cree et le stock ajoute automatiquement.</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSearchingFor(suggestion.catalog_id)}
                                                        className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-primary transition-all hover:bg-white/5"
                                                    >
                                                        Associer un produit existant
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="rounded-xl border border-white/10 px-4 py-3 font-bold text-slate-300 transition-all hover:bg-white/5 disabled:opacity-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={loading || submitting || suggestions.length === 0}
                            className="rounded-xl bg-primary px-5 py-3 font-bold text-white transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {submitting ? 'Confirmation...' : 'Confirmer la reception'}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
