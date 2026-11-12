'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../hooks/useDateFormatter';
import { Loader2, RefreshCw } from 'lucide-react';
import { ecommerce as ecommerceApi } from '../services/api';
import Modal from './Modal';
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

// Commandes des clients passées en ligne. Les commandes et retours fournisseurs sont dans l'écran Fournisseurs.
export default function Orders({ ecommerceSetup = null }: { ecommerceSetup?: React.ReactNode } = {}) {
    const { t } = useTranslation();
    const { formatDate, formatCurrency } = useDateFormatter();
    // Commande en cours d'expédition avec Denkma (fenêtre « Livrer avec Denkma »).
    const [denkmaShipOrder, setDenkmaShipOrder] = useState<any | null>(null);
    // Commande à livrer dont le paiement n'est pas confirmé : le commerçant dit si le client a payé.
    const [deliverWebOrder, setDeliverWebOrder] = useState<any | null>(null);
    const [webOrders, setWebOrders] = useState<any[]>([]);
    const [webOrdersLoading, setWebOrdersLoading] = useState(false);

    useEffect(() => {
        window.sessionStorage.removeItem('stockman_orders_open_tab');
        window.sessionStorage.removeItem('stockman_orders_open_ecom');
        void loadWebOrders();
    }, []);

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


    const ordersSteps: GuideStep[] = [
        {
            title: t('guide.orders.online_role_title', "Commandes de vos clients"),
            content: t('guide.orders.online_role_content', "Cet écran regroupe les commandes passées par vos clients sur votre boutique en ligne. Les commandes et les retours fournisseurs se trouvent dans l'écran Fournisseurs, onglet Bons de commande."),
        },
        {
            title: t('guide.orders.online_steps_title', "Traiter une commande"),
            content: t('guide.orders.online_steps_content', "Chaque carte met en avant la prochaine étape : confirmer le paiement, préparer, marquer prête, puis livrer."),
            details: [
                { label: t('guide.orders.online_payment', "Paiement reçu"), description: t('guide.orders.online_payment_desc', "À utiliser quand le client vous a payé. Le stock de la commande est alors réservé."), type: 'button' },
                { label: t('guide.orders.online_deliver', "Livrer et créer la vente"), description: t('guide.orders.online_deliver_desc', "Enregistre la vente. Si le paiement n'est pas confirmé, vous indiquez si le client a payé à la réception ; sinon, la vente est enregistrée à crédit."), type: 'button' },
                { label: t('guide.orders.online_cancel', "Annuler la commande"), description: t('guide.orders.online_cancel_desc', "Libère le stock réservé pour cette commande."), type: 'button' },
            ],
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto bg-[#0F172A] p-8 custom-scrollbar">
            <ScreenGuide steps={ordersSteps} guideKey="orders_tour" />
            <header className="mb-10 flex items-center justify-between gap-4">
                <div>
                    <h1 className="mb-2 text-3xl font-bold text-white">{t('orders.online_title', 'Commandes clients')}</h1>
                    <p className="text-slate-400">{t('orders.online_subtitle', 'Les commandes passées sur votre boutique en ligne. Les commandes fournisseurs sont dans l\'écran Fournisseurs.')}</p>
                </div>
                <button
                    onClick={() => void loadWebOrders()}
                    disabled={webOrdersLoading}
                    className="glass-card flex items-center gap-2 px-4 py-3 text-sm font-medium text-white transition-colors disabled:opacity-50 hover:bg-white/10"
                >
                    <RefreshCw size={16} className={webOrdersLoading ? 'animate-spin' : ''} />
                    {t('common.refresh', 'Actualiser')}
                </button>
            </header>

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
        </div>
    );
}
