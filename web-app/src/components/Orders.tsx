'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../hooks/useDateFormatter';
import {
    ArrowLeftRight,
    CheckCircle2,
    ChevronRight,
    Clock,
    Download,
    ExternalLink,
    FileImage,
    FileSpreadsheet,
    FileText,
    Loader2,
    Package,
    Scan,
    ShoppingBag,
    Truck,
    Undo2,
} from 'lucide-react';
import { ai as aiApi, creditNotes as creditNotesApi, ecommerce as ecommerceApi, returns as returnsApi, supplier_orders as ordersApi } from '../services/api';
import Modal from './Modal';
import OrderReturnModal from './OrderReturnModal';
import DeliveryConfirmationModal from './DeliveryConfirmationModal';
import { exportOrders } from '../utils/ExportService';
import DenkmaShipDialog from './DenkmaShipDialog';
import { amountDue, canShipWithDenkma, collectionCode, denkmaDelivery, denkmaDestination, denkmaState } from '../lib/denkmaShipping';
import { canConfirmPayment, canUndoPayment, deliveryPaymentQuestion, nextStep, orderStatusLabel, paymentState, unpaidReadyWarning } from '../lib/orderPayment';
import ScreenGuide, { GuideStep } from './ScreenGuide';

const PAYMENT_TONES: Record<string, string> = {
    success: 'bg-emerald-500/15 text-emerald-300',
    warning: 'bg-amber-500/15 text-amber-300',
    progress: 'bg-blue-500/15 text-blue-300',
    neutral: 'bg-white/10 text-slate-300',
};

const ORDER_STATUSES = ['all', 'pending', 'confirmed', 'shipped', 'partially_delivered', 'delivered', 'cancelled'] as const;

export default function Orders({ ecommerceSetup = null }: { ecommerceSetup?: React.ReactNode } = {}) {
    const { t } = useTranslation();
    const { formatDate, formatCurrency } = useDateFormatter();
    // Commande en cours d'expédition avec Denkma (fenêtre « Livrer avec Denkma »).
    const [denkmaShipOrder, setDenkmaShipOrder] = useState<any | null>(null);
    // Commande à livrer dont le paiement n'est pas confirmé : le commerçant dit si le client a payé.
    const [deliverWebOrder, setDeliverWebOrder] = useState<any | null>(null);

    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'orders' | 'returns' | 'web'>('orders');
    const [filterStatus, setFilterStatus] = useState<(typeof ORDER_STATUSES)[number]>('all');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [filterSuppliers, setFilterSuppliers] = useState<any[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);

    const [returnsList, setReturnsList] = useState<any[]>([]);
    const [creditNotesList, setCreditNotesList] = useState<any[]>([]);
    const [webOrders, setWebOrders] = useState<any[]>([]);
    const [webOrdersLoading, setWebOrdersLoading] = useState(false);
    const [returnsLoading, setReturnsLoading] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<any>(null);

    const [showOrderDetail, setShowOrderDetail] = useState(false);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);
    const [orderDetailLoading, setOrderDetailLoading] = useState(false);
    const [deliveryOrderId, setDeliveryOrderId] = useState<string | null>(null);

    const [scanLoading, setScanLoading] = useState(false);
    const [scanResult, setScanResult] = useState<any>(null);
    const [showScanResultModal, setShowScanResultModal] = useState(false);

    const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
        pending: { label: 'En attente', color: 'text-amber-500 bg-amber-500/10', icon: Clock },
        confirmed: { label: 'Confirmee', color: 'text-blue-500 bg-blue-500/10', icon: CheckCircle2 },
        shipped: { label: 'Expediee', color: 'text-indigo-500 bg-indigo-500/10', icon: Truck },
        partially_delivered: { label: 'Livraison partielle', color: 'text-purple-500 bg-purple-500/10', icon: Package },
        delivered: { label: 'Livree', color: 'text-emerald-500 bg-emerald-500/10', icon: CheckCircle2 },
        cancelled: { label: 'Annulee', color: 'text-rose-500 bg-rose-500/10', icon: Package },
    };

    useEffect(() => {
        if (activeTab !== 'orders') return;
        loadOrders();
        loadFilterSuppliers();
    }, [activeTab, filterStatus, supplierFilter, startDate, endDate]);

    useEffect(() => {
        if (activeTab === 'returns') {
            loadReturnsData();
        }
        if (activeTab === 'web') {
            loadWebOrders();
        }
    }, [activeTab]);

    useEffect(() => {
        const targetTab = window.sessionStorage.getItem('stockman_orders_open_tab');
        if (targetTab === 'web') {
            setActiveTab('web');
            window.sessionStorage.removeItem('stockman_orders_open_tab');
            window.sessionStorage.removeItem('stockman_orders_open_ecom');
        }
    }, []);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const res = await ordersApi.list(
                filterStatus === 'all' ? undefined : filterStatus,
                supplierFilter || undefined,
                startDate || undefined,
                endDate || undefined
            );
            setOrders(res.items || res || []);
        } catch (err) {
            console.error('Orders load error', err);
        } finally {
            setLoading(false);
        }
    };

    const loadFilterSuppliers = async () => {
        try {
            const res = await ordersApi.getFilterSuppliers();
            setFilterSuppliers(Array.isArray(res) ? res : []);
        } catch (err) {
            console.error('Orders filter suppliers error', err);
        }
    };

    const loadReturnsData = async () => {
        setReturnsLoading(true);
        try {
            const [retRes, cnRes] = await Promise.all([
                returnsApi.list(),
                creditNotesApi.list(),
            ]);
            setReturnsList(retRes.items || retRes || []);
            setCreditNotesList(cnRes.items || cnRes || []);
        } catch (err) {
            console.error('Returns load error', err);
        } finally {
            setReturnsLoading(false);
        }
    };

    const loadWebOrders = async () => {
        setWebOrdersLoading(true);
        try {
            const res = await ecommerceApi.listOrders();
            setWebOrders(res.items || []);
        } catch (err) {
            console.error('E-com orders load error', err);
        } finally {
            setWebOrdersLoading(false);
        }
    };

    const updateWebOrderStatus = async (orderId: string, status: string, paid?: boolean) => {
        try {
            await ecommerceApi.updateOrderStatus(orderId, status, paid);
            await loadWebOrders();
        } catch (err: any) {
            alert(err?.message || 'Impossible de mettre à jour la commande E-com.');
        }
    };

    // « Paiement reçu » : le client a payé le commerçant ; une commande nouvelle est confirmée du même geste.
    const updateWebOrderPayment = async (orderId: string, paid: boolean) => {
        try {
            const { order: updated } = await ecommerceApi.updateOrderPayment(orderId, paid);
            setWebOrders((current) => current.map((item) => (item.order_id === updated.order_id ? updated : item)));
        } catch (err: any) {
            alert(err?.message || 'Impossible de mettre à jour le paiement de la commande.');
        }
    };

    // « Prête » fait venir le livreur : le commerçant est prévenu si le client devait payer avant et ne l'a pas fait.
    const markWebOrderReady = async (order: any) => {
        const warning = unpaidReadyWarning(order);
        if (warning && !window.confirm(warning)) return;
        await updateWebOrderStatus(order.order_id, 'ready');
    };

    // « Livrer » : sans paiement confirmé, la vente est enregistrée à crédit, sauf si le client a payé à la réception.
    const deliverWebOrderNow = (order: any) => {
        if (deliveryPaymentQuestion(order)) {
            setDeliverWebOrder(order);
            return;
        }
        void updateWebOrderStatus(order.order_id, 'delivered');
    };

    const confirmWebDelivery = (paid: boolean) => {
        const order = deliverWebOrder;
        setDeliverWebOrder(null);
        if (order) void updateWebOrderStatus(order.order_id, 'delivered', paid);
    };

    const runWebOrderStep = (order: any, action: string | null) => {
        if (action === 'payment') return updateWebOrderPayment(order.order_id, true);
        if (action === 'confirm') return updateWebOrderStatus(order.order_id, 'confirmed');
        if (action === 'ready') return markWebOrderReady(order);
        if (action === 'deliver') return deliverWebOrderNow(order);
    };

    const openOrderDetail = async (orderId: string) => {
        setShowOrderDetail(true);
        setSelectedOrderDetail(null);
        setOrderDetailLoading(true);
        try {
            const detail = await ordersApi.get(orderId);
            setSelectedOrderDetail(detail);
        } catch (err) {
            console.error('Order detail error', err);
            setShowOrderDetail(false);
        } finally {
            setOrderDetailLoading(false);
        }
    };

    const handleUpdateStatus = async (orderId: string, status: string) => {
        try {
            await ordersApi.updateStatus(orderId, status);
            await loadOrders();
            if (selectedOrderDetail?.order_id === orderId) {
                const updated = await ordersApi.get(orderId);
                setSelectedOrderDetail(updated);
            }
        } catch (err) {
            console.error('Status update error', err);
        }
    };

    const handleScanInvoice = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (event: any) => {
            const file = event.target.files?.[0];
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
                    console.error('Invoice scan error', err);
                    alert('Le scan de la facture a echoue. Reessayez.');
                } finally {
                    setScanLoading(false);
                }
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const totalCreditAvailable = useMemo(
        () => creditNotesList.reduce((sum, creditNote) => sum + (creditNote.amount - (creditNote.used_amount || 0)), 0),
        [creditNotesList]
    );

    const getPrimaryAction = (order: any) => {
        if (order.status === 'pending') {
            return { label: 'Confirmer', onClick: () => handleUpdateStatus(order.order_id, 'confirmed'), tone: 'primary' as const };
        }
        if (order.status === 'confirmed') {
            return { label: 'Marquer expediee', onClick: () => handleUpdateStatus(order.order_id, 'shipped'), tone: 'secondary' as const };
        }
        if (order.status === 'shipped' || order.status === 'partially_delivered') {
            if (order.is_connected) {
                return { label: 'Confirmer la reception', onClick: () => setDeliveryOrderId(order.order_id), tone: 'success' as const };
            }
            return { label: 'Marquer livree', onClick: () => handleUpdateStatus(order.order_id, 'delivered'), tone: 'success' as const };
        }
        if (order.status === 'delivered') {
            return {
                label: 'Creer un retour',
                onClick: () => {
                    setSelectedOrderForReturn(order);
                    setShowReturnModal(true);
                },
                tone: 'danger' as const,
            };
        }
        return null;
    };

    const getActionClassName = (tone: 'primary' | 'secondary' | 'success' | 'danger') => {
        switch (tone) {
            case 'secondary':
                return 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white';
            case 'success':
                return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white';
            case 'danger':
                return 'border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white';
            default:
                return 'border-primary/20 bg-primary/10 text-primary hover:bg-primary hover:text-white';
        }
    };

    const ordersSteps: GuideStep[] = [
        {
            title: t('guide.orders.role_title', "Rôle des commandes fournisseurs"),
            content: t('guide.orders.role_content', "Cet écran gère le cycle complet d'approvisionnement : de la création d'une commande jusqu'à sa réception en stock. Chaque commande livrée met à jour le stock automatiquement."),
        },
        {
            title: t('guide.orders.header_title', "Actions globales"),
            content: t('guide.orders.header_content', "Les boutons en haut permettent d'exporter et d'utiliser la reconnaissance de facture par IA."),
            details: [
                { label: t('guide.orders.btn_export', "Exporter"), description: t('guide.orders.btn_export_desc', "Télécharge la liste des commandes en Excel ou PDF selon les filtres actifs."), type: 'button' },
                { label: t('guide.orders.btn_scan', "Scanner facture"), description: t('guide.orders.btn_scan_desc', "Photographiez une facture fournisseur. L'IA lit les articles, quantités et montants et crée la commande automatiquement."), type: 'button' },
            ],
        },
        {
            title: t('guide.orders.tabs_title', "Onglets Commandes / Retours"),
            content: t('guide.orders.tabs_content', "L'écran est divisé en deux onglets."),
            details: [
                { label: t('guide.orders.tab_orders', "Onglet Commandes"), description: t('guide.orders.tab_orders_desc', "Liste toutes vos commandes fournisseurs avec statut, montant et actions disponibles."), type: 'info' },
                { label: t('guide.orders.tab_returns', "Onglet Retours"), description: t('guide.orders.tab_returns_desc', "Gère les retours fournisseurs et les avoirs. La carte KPI affiche le total des avoirs cumulés."), type: 'info' },
            ],
        },
        {
            title: t('guide.orders.filters_title', "Filtres"),
            content: t('guide.orders.filters_content', "Filtrez les commandes pour trouver rapidement ce que vous cherchez."),
            details: [
                { label: t('guide.orders.filter_status', "Filtres de statut"), description: t('guide.orders.filter_status_desc', "Tous · En attente · Confirmé · Expédié · Livraison partielle · Livré · Annulé. Le badge indique le nombre de commandes par état."), type: 'filter' },
                { label: t('guide.orders.filter_supplier', "Filtre fournisseur"), description: t('guide.orders.filter_supplier_desc', "Dropdown pour afficher uniquement les commandes d'un fournisseur donné."), type: 'filter' },
                { label: t('guide.orders.filter_dates', "Plage de dates"), description: t('guide.orders.filter_dates_desc', "Restreint l'affichage à une période. Utile pour retrouver une commande d'un mois précis."), type: 'filter' },
            ],
        },
        {
            title: t('guide.orders.cards_title', "Cartes de commande"),
            content: t('guide.orders.cards_content', "Chaque commande est affichée sous forme de carte."),
            details: [
                { label: t('guide.orders.card_status', "Badge de statut"), description: t('guide.orders.card_status_desc', "Couleur indiquant l'état : gris (attente), bleu (confirmé), violet (expédié), orange (partiel), vert (livré), rouge (annulé)."), type: 'card' },
                { label: t('guide.orders.card_action', "Bouton d'action contextuel"), description: t('guide.orders.card_action_desc', "S'adapte au statut : 'Confirmer', 'Marquer expédié', 'Confirmer réception', 'Livraison partielle'. Chaque clic avance la commande dans le cycle."), type: 'button' },
                { label: t('guide.orders.card_detail', "Icône détail (↗)"), description: t('guide.orders.card_detail_desc', "Ouvre le détail complet : articles, quantités, prix unitaires, notes et historique des statuts."), type: 'button' },
            ],
        },
        {
            title: t('guide.orders.returns_title', "Retours et avoirs"),
            content: t('guide.orders.returns_content', "Dans l'onglet Retours, gérez les produits renvoyés à vos fournisseurs."),
            details: [
                { label: t('guide.orders.btn_new_return', "Nouveau retour manuel"), description: t('guide.orders.btn_new_return_desc', "Créez un retour fournisseur en sélectionnant la commande d'origine, les articles et les quantités concernées."), type: 'button' },
                { label: t('guide.orders.return_effect', "Effet sur le stock"), description: t('guide.orders.return_effect_desc', "Un retour validé diminue le stock des articles retournés et enregistre un mouvement dans l'historique."), type: 'info' },
            ],
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto bg-[#0F172A] p-8 custom-scrollbar">
            <ScreenGuide steps={ordersSteps} guideKey="orders_tour" />
            <header className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="mb-2 text-3xl font-bold text-white">Commandes fournisseurs</h1>
                    <p className="text-slate-400">Suivez les commandes, les livraisons et les retours avec le meme cycle que sur mobile.</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu((current) => !current)}
                            className="glass-card flex items-center gap-2 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                        >
                            <Download size={16} />
                            Exporter
                            <ChevronRight size={14} className={`transition-transform ${showExportMenu ? 'rotate-90' : ''}`} />
                        </button>
                        {showExportMenu && (
                            <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-[#1E293B] shadow-2xl">
                                <button
                                    onClick={() => {
                                        exportOrders(orders, 'F', 'excel');
                                        setShowExportMenu(false);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-white transition-colors hover:bg-white/10"
                                >
                                    <FileSpreadsheet size={16} className="text-emerald-400" />
                                    Excel (.xlsx)
                                </button>
                                <button
                                    onClick={() => {
                                        exportOrders(orders, 'F', 'pdf');
                                        setShowExportMenu(false);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-white transition-colors hover:bg-white/10"
                                >
                                    <FileText size={16} className="text-red-400" />
                                    PDF
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleScanInvoice}
                        disabled={scanLoading}
                        className="glass-card flex items-center gap-2 px-5 py-3 text-white transition-all disabled:opacity-50 hover:bg-white/10"
                    >
                        {scanLoading ? <Loader2 size={20} className="animate-spin" /> : <Scan size={20} className="text-primary" />}
                        Scanner facture
                    </button>
                </div>
            </header>

            <div className="mb-8 flex w-fit gap-4 rounded-2xl bg-white/5 p-1.5">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`rounded-xl px-8 py-3 font-bold transition-all ${activeTab === 'orders' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
                >
                    Commandes
                </button>
                <button
                    onClick={() => setActiveTab('returns')}
                    className={`rounded-xl px-8 py-3 font-bold transition-all ${activeTab === 'returns' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
                >
                    Retours
                </button>
                <button
                    onClick={() => setActiveTab('web')}
                    className={`rounded-xl px-8 py-3 font-bold transition-all ${activeTab === 'web' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
                >
                    Commandes E-com
                </button>
            </div>

            {activeTab === 'web' ? (
                <div className="space-y-4">
                    {ecommerceSetup}
                    {webOrdersLoading ? (
                        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" /></div>
                    ) : webOrders.length === 0 ? (
                        <div className="glass-card p-12 text-center text-slate-400">Aucune commande E-com pour le moment.</div>
                    ) : webOrders.map((order) => (
                        <div key={order.order_id} className="glass-card p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="text-lg font-black text-white">{order.order_number}</h3>
                                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">{orderStatusLabel(order.status)}</span>
                                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${PAYMENT_TONES[paymentState(order).tone]}`}>{paymentState(order).label}</span>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-400">{order.customer_name} · {order.customer_phone || order.customer_email || 'Contact non renseigné'}</p>
                                    {order.customer_address && <p className="mt-1 text-sm text-slate-500">{order.customer_address}</p>}
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-primary">{formatCurrency(amountDue(order))}</p>
                                    {denkmaDelivery(order) && <p className="text-xs text-slate-400">dont livraison {formatCurrency(order.delivery_fee || denkmaDelivery(order)?.fee || 0)}</p>}
                                    <p className="text-xs text-slate-500">{formatDate(order.created_at)}</p>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                {(order.items || []).map((item: any) => (
                                    <div key={item.product_id} className="flex justify-between gap-4 text-sm">
                                        <span className="text-slate-300">{item.product_name} x {item.quantity}</span>
                                        <span className="font-bold text-white">{formatCurrency(item.total || 0)}</span>
                                    </div>
                                ))}
                            </div>
                            {denkmaDelivery(order) && (
                                <div className="mt-4 flex flex-col gap-1 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-bold text-white">Livraison Denkma · {denkmaDestination(denkmaDelivery(order)!)}</p>
                                        <p className="text-blue-200">{denkmaState(denkmaDelivery(order)!).label}{order.delivery.tracking_code ? ` · Suivi ${order.delivery.tracking_code}` : ''}</p>
                                        {order.delivery.error && <p className="text-rose-300">{order.delivery.error}</p>}
                                        {collectionCode(order.delivery) && (
                                            <p className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-white">
                                                <span className="text-xs font-bold uppercase tracking-wide text-blue-200">Code à donner au livreur</span>
                                                <span className="text-xl font-black tracking-widest">{collectionCode(order.delivery)}</span>
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="self-start rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 sm:self-center"
                                        onClick={async () => {
                                            try {
                                                const updated = await ecommerceApi.refreshDenkma(order.order_id);
                                                setWebOrders((current) => current.map((item) => (item.order_id === updated.order_id ? updated : item)));
                                            } catch (err: any) {
                                                window.alert(err?.message || 'Le suivi Denkma est indisponible pour le moment.');
                                            }
                                        }}
                                    >
                                        Actualiser le suivi
                                    </button>
                                </div>
                            )}
                            {(() => {
                                // Une seule étape mise en avant ; les autres gestes restent disponibles, en retrait.
                                const step = nextStep(order);
                                const payment = paymentState(order);
                                const secondary = 'rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10';
                                return (
                                    <div className="mt-4 space-y-3">
                                        {step && (
                                            <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wide text-primary">Prochaine étape</p>
                                                    <p className="mt-1 text-sm leading-6 text-slate-200">{step.hint}</p>
                                                </div>
                                                {step.action && <button onClick={() => void runWebOrderStep(order, step.action)} className="shrink-0 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white">{step.label}</button>}
                                            </div>
                                        )}
                                        <p className="text-xs leading-5 text-slate-500">Paiement : {payment.hint}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {canConfirmPayment(order) && step?.action !== 'payment' && <button onClick={() => void updateWebOrderPayment(order.order_id, true)} className={secondary}>Paiement reçu</button>}
                                            {canUndoPayment(order) && <button onClick={() => { if (window.confirm('Annuler la confirmation du paiement de cette commande ?')) void updateWebOrderPayment(order.order_id, false); }} className={secondary}>Paiement confirmé par erreur</button>}
                                            {order.status === 'pending' && step?.action !== 'confirm' && <button onClick={() => updateWebOrderStatus(order.order_id, 'confirmed')} className={secondary}>Confirmer sans attendre le paiement</button>}
                                            {['pending', 'confirmed'].includes(order.status) && <button onClick={() => updateWebOrderStatus(order.order_id, 'preparing')} className={secondary}>En préparation</button>}
                                            {['confirmed', 'preparing'].includes(order.status) && step?.action !== 'ready' && <button onClick={() => void markWebOrderReady(order)} className={secondary}>Prête</button>}
                                            {canShipWithDenkma(order) && <button onClick={() => setDenkmaShipOrder(order)} className={secondary}>Livrer avec Denkma en joignant une photo</button>}
                                            {['confirmed', 'preparing', 'ready'].includes(order.status) && step?.action !== 'deliver' && <button onClick={() => deliverWebOrderNow(order)} className={secondary}>Livrer et créer la vente</button>}
                                            {['pending', 'confirmed'].includes(order.status) && <button onClick={() => { if (window.confirm('Annuler cette commande ?')) void updateWebOrderStatus(order.order_id, 'cancelled'); }} className="rounded-xl border border-rose-400/20 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10">Annuler la commande</button>}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    ))}
                </div>
            ) : activeTab === 'orders' ? (
                <div className="space-y-8">
                    <div className="flex flex-wrap gap-8 border-b border-white/5">
                        {ORDER_STATUSES.map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`relative px-2 pb-4 text-sm font-bold uppercase tracking-widest transition-all ${filterStatus === status ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {status === 'all' ? 'Toutes' : STATUS_MAP[status]?.label || status}
                                {filterStatus === status ? <div className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full bg-primary" /> : null}
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-4 rounded-3xl border border-white/5 bg-white/5 p-5 md:grid-cols-3">
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Fournisseur</label>
                            <select
                                value={supplierFilter}
                                onChange={(event) => setSupplierFilter(event.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-[#1E293B] px-4 py-3 text-white outline-none focus:border-primary/40"
                            >
                                <option value="">Tous les fournisseurs</option>
                                {filterSuppliers.map((supplier) => (
                                    <option key={supplier.id} value={supplier.id}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Date debut</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(event) => setStartDate(event.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-[#1E293B] px-4 py-3 text-white outline-none focus:border-primary/40"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Date fin</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(event) => setEndDate(event.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-[#1E293B] px-4 py-3 text-white outline-none focus:border-primary/40"
                            />
                        </div>
                    </div>

                    {loading && orders.length === 0 ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="glass-card flex flex-col items-center gap-4 p-20 text-center text-slate-500">
                            <ShoppingBag size={48} className="opacity-20" />
                            <p>Aucune commande trouvee pour ces filtres.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {orders.map((order) => {
                                const statusConfig = STATUS_MAP[order.status] || STATUS_MAP.pending;
                                const StatusIcon = statusConfig.icon || ShoppingBag;
                                const primaryAction = getPrimaryAction(order);

                                return (
                                    <div
                                        key={order.order_id}
                                        className="glass-card flex items-center justify-between p-6 transition-all hover:border-primary/30"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${statusConfig.color || 'bg-white/5'}`}>
                                                <StatusIcon size={28} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-bold text-white">#{order.order_id.substring(0, 8).toUpperCase()}</h3>
                                                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusConfig.color}`}>
                                                        {statusConfig.label}
                                                    </span>
                                                    {order.is_connected ? (
                                                        <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[10px] font-black uppercase text-blue-400">
                                                            Marketplace
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="flex items-center gap-2 text-sm text-slate-400">
                                                    <span className="font-bold text-slate-300">{order.supplier_name || 'Fournisseur inconnu'}</span>
                                                    <span className="text-slate-600">•</span>
                                                    <span>{formatDate(order.created_at)}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-10">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs uppercase tracking-widest text-slate-500">Montant</span>
                                                <span className="text-xl font-black text-white">{formatCurrency(order.total_amount || 0)}</span>
                                            </div>

                                            <div className="flex gap-2">
                                                {primaryAction ? (
                                                    <button
                                                        onClick={primaryAction.onClick}
                                                        className={`rounded-xl border p-3 transition-all ${getActionClassName(primaryAction.tone)}`}
                                                        title={primaryAction.label}
                                                    >
                                                        {primaryAction.tone === 'danger' ? <Undo2 size={20} /> : <CheckCircle2 size={20} />}
                                                    </button>
                                                ) : null}
                                                <button
                                                    onClick={() => openOrderDetail(order.order_id)}
                                                    className="rounded-xl border border-white/5 bg-white/5 p-3 text-slate-400 transition-all hover:text-primary"
                                                    title="Voir details"
                                                >
                                                    <ExternalLink size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {creditNotesList.length > 0 ? (
                        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="glass-card flex items-center justify-between border-emerald-500/20 bg-emerald-500/5 p-6">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500">
                                        <ArrowLeftRight size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">Avoirs disponibles</h3>
                                        <p className="text-xs text-slate-500">{creditNotesList.length} avoir(s) actif(s)</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-2xl font-black text-emerald-500">{formatCurrency(totalCreditAvailable)}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Montant total</span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedOrderForReturn(null);
                                    setShowReturnModal(true);
                                }}
                                className="glass-card flex items-center justify-center gap-3 border-dashed border-primary/30 p-6 transition-all hover:border-primary hover:bg-primary/5"
                            >
                                <Undo2 size={24} className="text-primary" />
                                <span className="font-bold text-white">Nouveau retour manuel</span>
                            </button>
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-4">
                        {returnsLoading ? (
                            <div className="py-20 text-center">
                                <Loader2 className="mx-auto animate-spin text-primary" size={40} />
                            </div>
                        ) : returnsList.length === 0 ? (
                            <div className="glass-card flex flex-col items-center gap-4 p-20 text-center text-slate-500">
                                <Undo2 size={48} className="opacity-20" />
                                <p>Aucun retour enregistre.</p>
                            </div>
                        ) : (
                            returnsList.map((ret) => (
                                <div key={ret.return_id} className="glass-card flex items-center justify-between p-6">
                                    <div className="flex items-center gap-6">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                                            <Undo2 size={28} />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-bold text-white">#{ret.return_id.substring(0, 8).toUpperCase()}</h3>
                                                <span className="rounded-full bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase text-rose-500">
                                                    {ret.status}
                                                </span>
                                            </div>
                                            <p className="flex items-center gap-2 text-sm text-slate-400">
                                                <span className="font-bold text-slate-300">{ret.supplier_name || 'Retour fournisseur'}</span>
                                                <span className="text-slate-600">•</span>
                                                <span>{formatDate(ret.created_at)}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs uppercase tracking-widest text-slate-500">Valeur</span>
                                        <span className="text-xl font-black text-rose-500">{formatCurrency(ret.total_amount)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <Modal
                isOpen={showScanResultModal}
                onClose={() => setShowScanResultModal(false)}
                title="Resultat de l'analyse IA"
                maxWidth="lg"
            >
                <div className="space-y-6">
                    <div className="flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
                        <FileImage size={40} className="text-primary" />
                        <div>
                            <h4 className="font-bold text-white">{scanResult?.supplier_name || 'Fournisseur identifie'}</h4>
                            <p className="text-sm text-slate-400">{scanResult?.date ? formatDate(scanResult.date) : 'Facture detectee'}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h5 className="text-xs font-black uppercase tracking-widest text-slate-500">Articles detectes</h5>
                        <div className="max-h-[300px] space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                            {scanResult?.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3">
                                    <div>
                                        <p className="text-sm font-bold text-white">{item.name}</p>
                                        <p className="text-xs text-slate-500">
                                            Qte: {item.quantity} • P.U: {formatCurrency(item.unit_price)}
                                        </p>
                                    </div>
                                    <span className="font-bold text-white">
                                        {formatCurrency(item.total_price || (item.quantity * item.unit_price))}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-6">
                        <div className="flex flex-col">
                            <span className="text-xs uppercase tracking-widest text-slate-500">Total facture</span>
                            <span className="text-2xl font-black text-white">{formatCurrency(scanResult?.total_amount || 0)}</span>
                        </div>
                        <button
                            onClick={() => setShowScanResultModal(false)}
                            className="rounded-xl bg-primary px-8 py-3 font-bold text-white"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </Modal>

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

            <Modal
                isOpen={showOrderDetail}
                onClose={() => {
                    setShowOrderDetail(false);
                    setSelectedOrderDetail(null);
                }}
                title={`Commande #${selectedOrderDetail?.order_id?.substring(0, 8).toUpperCase() || ''}`}
                maxWidth="lg"
            >
                {orderDetailLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={24} className="animate-spin text-primary" />
                    </div>
                ) : selectedOrderDetail ? (
                    <div className="space-y-6">
                        <div className="flex flex-wrap gap-3">
                            {selectedOrderDetail.status === 'pending' ? (
                                <button
                                    onClick={() => handleUpdateStatus(selectedOrderDetail.order_id, 'confirmed')}
                                    className="rounded-xl bg-blue-500 px-4 py-3 font-bold text-white transition-all hover:bg-blue-600"
                                >
                                    Confirmer la commande
                                </button>
                            ) : null}
                            {selectedOrderDetail.status === 'confirmed' ? (
                                <button
                                    onClick={() => handleUpdateStatus(selectedOrderDetail.order_id, 'shipped')}
                                    className="rounded-xl bg-indigo-500 px-4 py-3 font-bold text-white transition-all hover:bg-indigo-600"
                                >
                                    Marquer expediee
                                </button>
                            ) : null}
                            {['shipped', 'partially_delivered'].includes(selectedOrderDetail.status) ? (
                                <button
                                    onClick={() => {
                                        if (selectedOrderDetail.is_connected) {
                                            setDeliveryOrderId(selectedOrderDetail.order_id);
                                        } else {
                                            handleUpdateStatus(selectedOrderDetail.order_id, 'delivered');
                                        }
                                    }}
                                    className="rounded-xl bg-emerald-500 px-4 py-3 font-bold text-white transition-all hover:bg-emerald-600"
                                >
                                    {selectedOrderDetail.is_connected ? 'Confirmer la reception marketplace' : 'Marquer livree'}
                                </button>
                            ) : null}
                            {['pending', 'confirmed', 'shipped', 'partially_delivered'].includes(selectedOrderDetail.status) ? (
                                <button
                                    onClick={() => handleUpdateStatus(selectedOrderDetail.order_id, 'cancelled')}
                                    className="rounded-xl bg-rose-500/10 px-4 py-3 font-bold text-rose-400 transition-all hover:bg-rose-500/20"
                                >
                                    Annuler
                                </button>
                            ) : null}
                            {selectedOrderDetail.status === 'delivered' ? (
                                <button
                                    onClick={() => {
                                        setSelectedOrderForReturn(selectedOrderDetail);
                                        setShowReturnModal(true);
                                    }}
                                    className="rounded-xl bg-rose-500/10 px-4 py-3 font-bold text-rose-400 transition-all hover:bg-rose-500/20"
                                >
                                    Creer un retour
                                </button>
                            ) : null}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl bg-white/5 p-4">
                                <p className="mb-1 text-[10px] font-black uppercase text-slate-500">Fournisseur</p>
                                <p className="font-bold text-white">{selectedOrderDetail.supplier_name || selectedOrderDetail.supplier?.name || 'Inconnu'}</p>
                            </div>
                            <div className="rounded-2xl bg-white/5 p-4">
                                <p className="mb-1 text-[10px] font-black uppercase text-slate-500">Statut</p>
                                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${STATUS_MAP[selectedOrderDetail.status]?.color || 'text-slate-400 bg-white/5'}`}>
                                    {STATUS_MAP[selectedOrderDetail.status]?.label || selectedOrderDetail.status}
                                </span>
                            </div>
                            <div className="rounded-2xl bg-white/5 p-4">
                                <p className="mb-1 text-[10px] font-black uppercase text-slate-500">Date</p>
                                <p className="font-bold text-white">{formatDate(selectedOrderDetail.created_at)}</p>
                            </div>
                            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                                <p className="mb-1 text-[10px] font-black uppercase text-slate-500">Montant total</p>
                                <p className="text-xl font-black text-primary">{formatCurrency(selectedOrderDetail.total_amount || 0)}</p>
                            </div>
                        </div>

                        {Array.isArray(selectedOrderDetail.items) && selectedOrderDetail.items.length > 0 ? (
                            <div>
                                <h4 className="mb-3 border-l-4 border-primary pl-3 text-sm font-black uppercase tracking-widest text-white">Articles</h4>
                                <div className="space-y-2">
                                    {selectedOrderDetail.items.map((item: any, idx: number) => {
                                        const receivedQty = selectedOrderDetail.received_items?.[item.item_id] ?? item.received_quantity ?? 0;
                                        return (
                                            <div key={idx} className="rounded-xl bg-white/5 p-3">
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-sm font-bold text-white">{item.product_name || item.name}</span>
                                                    <span className="font-bold text-primary">
                                                        {formatCurrency((item.unit_price || 0) * item.quantity)}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                                                    <span>Commande: {item.quantity}</span>
                                                    <span>Recu: {receivedQty}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null}

                        {selectedOrderDetail.notes ? (
                            <div className="rounded-2xl bg-white/5 p-4">
                                <p className="mb-1 text-[10px] font-black uppercase text-slate-500">Notes</p>
                                <p className="text-sm text-slate-300">{selectedOrderDetail.notes}</p>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </Modal>

            {deliverWebOrder && (
                <Modal isOpen onClose={() => setDeliverWebOrder(null)} title="Livrer la commande" maxWidth="md">
                    <div className="space-y-5">
                        <p className="text-sm leading-6 text-slate-300">{deliveryPaymentQuestion(deliverWebOrder)}</p>
                        <p className="text-sm font-bold text-white">Montant dû par le client : {formatCurrency(amountDue(deliverWebOrder))}</p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button onClick={() => setDeliverWebOrder(null)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10">Retour</button>
                            <button onClick={() => confirmWebDelivery(false)} className="rounded-xl border border-amber-400/30 px-4 py-3 text-sm font-bold text-amber-200 hover:bg-amber-500/10">Pas encore payé : vente à crédit</button>
                            <button onClick={() => confirmWebDelivery(true)} className="rounded-xl bg-primary px-4 py-3 text-sm font-black text-white">Le client a payé</button>
                        </div>
                    </div>
                </Modal>
            )}
            {denkmaShipOrder && (
                <DenkmaShipDialog
                    order={denkmaShipOrder}
                    formatAmount={(amount) => formatCurrency(amount)}
                    onClose={() => setDenkmaShipOrder(null)}
                    onShipped={(updated) => {
                        setDenkmaShipOrder(null);
                        setWebOrders((current) => current.map((item) => (item.order_id === updated.order_id ? updated : item)));
                    }}
                />
            )}
            <DeliveryConfirmationModal
                isOpen={Boolean(deliveryOrderId)}
                orderId={deliveryOrderId}
                onClose={() => setDeliveryOrderId(null)}
                onConfirmed={async () => {
                    if (deliveryOrderId) {
                        const updated = await ordersApi.get(deliveryOrderId);
                        setSelectedOrderDetail(updated);
                    }
                    setDeliveryOrderId(null);
                    loadOrders();
                }}
            />
        </div>
    );
}
