'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../hooks/useDateFormatter';
import {
    ShoppingBag,
    Truck,
    Clock,
    CheckCircle2,
    Package,
    Plus,
    Search,
    ExternalLink,
    ChevronRight,
    Scan,
    FileImage,
    Loader2,
    ArrowLeftRight,
    Undo2
} from 'lucide-react';
import { supplier_orders as ordersApi, ai as aiApi, returns as returnsApi, creditNotes as creditNotesApi } from '../services/api';
import Modal from './Modal';
import OrderReturnModal from './OrderReturnModal';

export default function Orders() {
    const { t } = useTranslation();
    const { formatDate, formatCurrency } = useDateFormatter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [activeTab, setActiveTab] = useState<'orders' | 'returns'>('orders');

    // Returns & Credit Notes State
    const [returnsList, setReturnsList] = useState<any[]>([]);
    const [creditNotesList, setCreditNotesList] = useState<any[]>([]);
    const [returnsLoading, setReturnsLoading] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<any>(null);
    const [showOrderDetail, setShowOrderDetail] = useState(false);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);

    // AI Scanner State
    const [scanLoading, setScanLoading] = useState(false);
    const [scanResult, setScanResult] = useState<any>(null);
    const [showScanResultModal, setShowScanResultModal] = useState(false);

    useEffect(() => {
        if (activeTab === 'orders') {
            loadOrders();
        } else {
            loadReturnsData();
        }
    }, [activeTab]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const res = await ordersApi.list();
            setOrders(res.items || res);
        } catch (err) {
            console.error("Orders load error", err);
        } finally {
            setLoading(false);
        }
    };

    const loadReturnsData = async () => {
        setReturnsLoading(true);
        try {
            const [retRes, cnRes] = await Promise.all([
                returnsApi.list(),
                creditNotesApi.list()
            ]);
            setReturnsList(retRes.items || retRes);
            setCreditNotesList(cnRes.items || cnRes);
        } catch (err) {
            console.error("Returns load error", err);
        } finally {
            setReturnsLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await ordersApi.updateStatus(id, status);
            loadOrders();
        } catch (err) {
            console.error("Status update error", err);
        }
    };

    const handleScanInvoice = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];
                setScanLoading(true);
                try {
                    const result = await aiApi.scanInvoice(base64);
                    setScanResult(result);
                    setShowScanResultModal(true);
                } catch (err) {
                    alert("Erreur lors du scan de la facture. Veuillez réessayer.");
                } finally {
                    setScanLoading(false);
                }
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const STATUS_MAP: Record<string, { label: string, color: string, icon: any }> = {
        pending: { label: 'En attente', color: 'text-amber-500 bg-amber-500/10', icon: Clock },
        processing: { label: 'En cours', color: 'text-blue-500 bg-blue-500/10', icon: Truck },
        shipped: { label: 'Expédié', color: 'text-indigo-500 bg-indigo-500/10', icon: Truck },
        received: { label: 'Reçu', color: 'text-emerald-500 bg-emerald-500/10', icon: CheckCircle2 },
        cancelled: { label: 'Annulé', color: 'text-rose-500 bg-rose-500/10', icon: Package },
    };

    const filteredOrders = filterStatus === 'all'
        ? (Array.isArray(orders) ? orders : [])
        : (Array.isArray(orders) ? orders : []).filter(o => o.status === filterStatus);

    if (loading && orders.length === 0 && activeTab === 'orders') {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Commandes Fournisseurs</h1>
                    <p className="text-slate-400">Suivez vos approvisionnements et réceptions de stock.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleScanInvoice}
                        disabled={scanLoading}
                        className="glass-card hover:bg-white/10 px-5 py-3 flex items-center gap-2 text-white transition-all disabled:opacity-50"
                    >
                        {scanLoading ? <Loader2 size={20} className="animate-spin" /> : <Scan size={20} className="text-primary" />}
                        Scanner Facture
                    </button>
                    <button className="btn-primary rounded-xl px-5 py-3 flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105">
                        <Plus size={20} /> Nouvelle Commande
                    </button>
                </div>
            </header>

            {/* Main Tabs (Orders / Returns) */}
            <div className="flex gap-4 mb-8 bg-white/5 p-1.5 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-8 py-3 rounded-xl font-bold transition-all ${activeTab === 'orders' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
                >
                    Commandes
                </button>
                <button
                    onClick={() => setActiveTab('returns')}
                    className={`px-8 py-3 rounded-xl font-bold transition-all ${activeTab === 'returns' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
                >
                    Retours
                </button>
            </div>

            {activeTab === 'orders' ? (
                <>
                    {/* Status Filter Tabs */}
                    <div className="flex border-b border-white/5 mb-8 gap-8">
                        {['all', 'pending', 'processing', 'received'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-all relative ${filterStatus === status ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {status === 'all' ? 'Toutes' : STATUS_MAP[status]?.label || status}
                                {filterStatus === status && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"></div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Orders List */}
                    <div className="grid grid-cols-1 gap-4">
                        {filteredOrders.length === 0 ? (
                            <div className="glass-card p-20 text-center text-slate-500 flex flex-col items-center gap-4">
                                <ShoppingBag size={48} className="opacity-20" />
                                <p>Aucune commande trouvée.</p>
                            </div>
                        ) : (
                            filteredOrders.map((order) => {
                                const StatusIcon = STATUS_MAP[order.status]?.icon || ShoppingBag;
                                return (
                                    <div key={order.order_id} className="glass-card p-6 flex items-center justify-between hover:border-primary/30 transition-all group">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${STATUS_MAP[order.status]?.color || 'bg-white/5'}`}>
                                                <StatusIcon size={28} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-bold text-white">#{order.order_id.substring(0, 8).toUpperCase()}</h3>
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${STATUS_MAP[order.status]?.color}`}>
                                                        {STATUS_MAP[order.status]?.label}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-400 flex items-center gap-2">
                                                    <span className="font-bold text-slate-300">{order.supplier_name || 'Fournisseur Inconnu'}</span>
                                                    <span className="text-slate-600">•</span>
                                                    <span>{formatDate(order.created_at)}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-10">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs text-slate-500 uppercase tracking-widest">Montant</span>
                                                <span className="text-xl font-black text-white">{formatCurrency(order.total_amount || 0)}</span>
                                            </div>

                                            <div className="flex gap-2">
                                                {order.status === 'received' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedOrderForReturn(order);
                                                            setShowReturnModal(true);
                                                        }}
                                                        className="p-3 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
                                                        title="Créer un retour"
                                                    >
                                                        <Undo2 size={20} />
                                                    </button>
                                                )}
                                                {order.status !== 'received' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(order.order_id, 'received')}
                                                        className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                                                        title="Marquer comme reçu"
                                                    >
                                                        <CheckCircle2 size={20} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedOrderDetail(order); setShowOrderDetail(true); }}
                                                    className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-primary transition-all border border-white/5"
                                                    title="Voir détails"
                                                >
                                                    <ExternalLink size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </>
            ) : (
                <>
                    {/* Returns Summary Section */}
                    {creditNotesList.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                            <div className="glass-card p-6 bg-emerald-500/5 border-emerald-500/20 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                        <ArrowLeftRight size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold">Avoirs Disponibles</h3>
                                        <p className="text-xs text-slate-500">{creditNotesList.length} avoir(s) actif(s)</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-2xl font-black text-emerald-500">
                                        {formatCurrency(creditNotesList.reduce((sum, cn) => sum + (cn.amount - (cn.used_amount || 0)), 0))}
                                    </span>
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Montant Total</span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedOrderForReturn(null);
                                    setShowReturnModal(true);
                                }}
                                className="glass-card p-6 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-3 group"
                            >
                                <Plus size={24} className="text-primary group-hover:scale-125 transition-all" />
                                <span className="text-white font-bold">Nouveau Retour Manuel</span>
                            </button>
                        </div>
                    )}

                    {/* Returns List */}
                    <div className="grid grid-cols-1 gap-4">
                        {returnsLoading ? (
                            <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-primary" size={40} /></div>
                        ) : returnsList.length === 0 ? (
                            <div className="glass-card p-20 text-center text-slate-500 flex flex-col items-center gap-4">
                                <Undo2 size={48} className="opacity-20" />
                                <p>Aucun retour enregistré.</p>
                            </div>
                        ) : (
                            returnsList.map((ret) => (
                                <div key={ret.return_id} className="glass-card p-6 flex items-center justify-between hover:border-primary/30 transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                            <Undo2 size={28} />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-bold text-white">#{ret.return_id.substring(0, 8).toUpperCase()}</h3>
                                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-rose-500/10 text-rose-500">
                                                    {ret.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-400 flex items-center gap-2">
                                                <span className="font-bold text-slate-300">{ret.supplier_name || 'Retour Fournisseur'}</span>
                                                <span className="text-slate-600">•</span>
                                                <span>{formatDate(ret.created_at)}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-10">
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-slate-500 uppercase tracking-widest">Valeur</span>
                                            <span className="text-xl font-black text-rose-500">{formatCurrency(ret.total_amount)}</span>
                                        </div>
                                        <button className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all border border-white/5">
                                            <ExternalLink size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* AI Scan Result Modal */}
            <Modal
                isOpen={showScanResultModal}
                onClose={() => setShowScanResultModal(false)}
                title="Résultat de l'Analyse IA"
                maxWidth="lg"
            >
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-2xl border border-primary/20">
                        <FileImage size={40} className="text-primary" />
                        <div>
                            <h4 className="text-white font-bold">{scanResult?.supplier_name || "Fournisseur Identifié"}</h4>
                            <p className="text-sm text-slate-400">{scanResult?.date ? formatDate(scanResult.date) : "Facture détectée"}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h5 className="text-xs font-black uppercase tracking-widest text-slate-500">Articles Détectés</h5>
                        <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar pr-2">
                            {scanResult?.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-white font-bold text-sm">{item.name}</p>
                                        <p className="text-xs text-slate-500">Qté: {item.quantity} • P.U: {formatCurrency(item.unit_price)}</p>
                                    </div>
                                    <span className="text-white font-bold">{formatCurrency(item.total_price || (item.quantity * item.unit_price))}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-white/10">
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500 uppercase tracking-widest">Total Facture</span>
                            <span className="text-2xl font-black text-white">{formatCurrency(scanResult?.total_amount || 0)}</span>
                        </div>
                        <button
                            onClick={() => setShowScanResultModal(false)}
                            className="btn-primary px-8 py-3 rounded-xl font-bold"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Return Modal */}
            <OrderReturnModal
                isOpen={showReturnModal}
                onClose={() => {
                    setShowReturnModal(false);
                    setSelectedOrderForReturn(null);
                }}
                order={selectedOrderForReturn}
                onSuccess={() => {
                    if (activeTab === 'returns') loadReturnsData();
                    else loadOrders();
                }}
            />

            {/* Order Detail Modal */}
            <Modal
                isOpen={showOrderDetail}
                onClose={() => { setShowOrderDetail(false); setSelectedOrderDetail(null); }}
                title={`Commande #${selectedOrderDetail?.order_id?.substring(0, 8).toUpperCase() || ''}`}
                maxWidth="lg"
            >
                {selectedOrderDetail && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/5 rounded-2xl">
                                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Fournisseur</p>
                                <p className="text-white font-bold">{selectedOrderDetail.supplier_name || 'Inconnu'}</p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl">
                                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Statut</p>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${STATUS_MAP[selectedOrderDetail.status]?.color}`}>
                                    {STATUS_MAP[selectedOrderDetail.status]?.label || selectedOrderDetail.status}
                                </span>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl">
                                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Date</p>
                                <p className="text-white font-bold">{formatDate(selectedOrderDetail.created_at)}</p>
                            </div>
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Montant Total</p>
                                <p className="text-primary font-black text-xl">{formatCurrency(selectedOrderDetail.total_amount || 0)}</p>
                            </div>
                        </div>

                        {Array.isArray(selectedOrderDetail.items) && selectedOrderDetail.items.length > 0 && (
                            <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-widest mb-3 px-1 border-l-4 border-primary pl-3">Articles</h4>
                                <div className="space-y-2">
                                    {selectedOrderDetail.items.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                                            <span className="text-white font-bold text-sm">{item.product_name || item.name}</span>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-slate-400">x{item.quantity}</span>
                                                <span className="text-primary font-bold">{formatCurrency((item.unit_price || 0) * item.quantity)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedOrderDetail.notes && (
                            <div className="p-4 bg-white/5 rounded-2xl">
                                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Notes</p>
                                <p className="text-slate-300 text-sm">{selectedOrderDetail.notes}</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
