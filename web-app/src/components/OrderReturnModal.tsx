'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../hooks/useDateFormatter';
import {
    Search,
    Plus,
    Trash2,
    AlertCircle,
    Package,
    ArrowLeftRight
} from 'lucide-react';
import Modal from './Modal';
import { products as productsApi, returns as returnsApi } from '../services/api';

interface OrderReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    order?: any;
    onSuccess: () => void;
}

export default function OrderReturnModal({ isOpen, onClose, order, onSuccess }: OrderReturnModalProps) {
    const { t } = useTranslation();
    const { formatCurrency } = useDateFormatter();

    const [loading, setLoading] = useState(false);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [returnItems, setReturnItems] = useState<any[]>([]);
    const [notes, setNotes] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadProducts();
            if (order) {
                // Pre-fill with order items if coming from an order
                const items = (order.items || []).map((item: any) => ({
                    product_id: item.product_id,
                    product_name: item.product?.name || item.product_name || 'Produit',
                    quantity: 0,
                    unit_price: item.unit_price,
                    reason: ''
                }));
                setReturnItems(items);
            }
        }
    }, [isOpen, order]);

    const loadProducts = async () => {
        try {
            const res = await productsApi.list();
            setAllProducts(res.items || res);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddItem = (product: any) => {
        if (returnItems.find(i => i.product_id === product.product_id)) return;
        setReturnItems([
            ...returnItems,
            {
                product_id: product.product_id,
                product_name: product.name,
                quantity: 1,
                unit_price: product.selling_price || 0,
                reason: ''
            }
        ]);
        setSearch('');
    };

    const handleUpdateItem = (index: number, field: string, value: any) => {
        const newItems = [...returnItems];
        newItems[index][field] = value;
        setReturnItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        setReturnItems(returnItems.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        const validItems = returnItems.filter(i => i.quantity > 0);
        if (validItems.length === 0) {
            alert("Veuillez ajouter au moins un article avec une quantité.");
            return;
        }

        setLoading(true);
        try {
            await returnsApi.create({
                order_id: order?.order_id,
                supplier_id: order?.supplier_id,
                items: validItems,
                type: 'supplier',
                notes: notes || undefined
            });
            onSuccess();
            onClose();
        } catch (err) {
            alert("Erreur lors de la création du retour.");
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = allProducts.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={order ? `Retour Commande #${order.order_id.substring(0, 8).toUpperCase()}` : "Nouveau Retour Fournisseur"}
            maxWidth="lg"
        >
            <div className="space-y-6">
                {!order && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un produit à retourner..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-primary/50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && filteredProducts.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 glass-card z-10 overflow-hidden">
                                {filteredProducts.map(p => (
                                    <button
                                        key={p.product_id}
                                        onClick={() => handleAddItem(p)}
                                        className="w-full flex items-center justify-between p-3 hover:bg-white/5 text-left border-b border-white/5 last:border-0"
                                    >
                                        <span className="text-white font-medium">{p.name}</span>
                                        <span className="text-primary font-bold">{formatCurrency(p.selling_price)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 px-1">Articles du retour</h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {returnItems.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 flex flex-col items-center gap-3">
                                <Package size={40} className="opacity-20" />
                                <p>Aucun article sélectionné.</p>
                            </div>
                        ) : (
                            returnItems.map((item, idx) => (
                                <div key={idx} className="glass-card p-4 space-y-4 border-white/5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-white font-bold">{item.product_name}</p>
                                            <p className="text-xs text-slate-500">P.U: {formatCurrency(item.unit_price)}</p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(idx)}
                                            className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Quantité</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary/50"
                                                value={item.quantity}
                                                onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Raison (Optionnel)</label>
                                            <input
                                                type="text"
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary/50"
                                                placeholder="ex: Endommagé"
                                                value={item.reason}
                                                onChange={(e) => handleUpdateItem(idx, 'reason', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 px-1">Notes Additionnelles</label>
                    <textarea
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-primary/50 min-h-[100px] resize-none"
                        placeholder="Détails sur l'expédition, numéro de suivi..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                <div className="flex gap-4 pt-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-400 hover:bg-white/5 transition-all"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || returnItems.length === 0}
                        className="flex-1 btn-primary px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? "Chargement..." : <><ArrowLeftRight size={20} /> Créer le Retour</>}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
