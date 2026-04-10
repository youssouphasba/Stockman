'use client';

import React from 'react';
import { Printer, Share2 } from 'lucide-react';
import Modal from './Modal';
import { formatSaleQuantity } from '../utils/measurement';

interface DigitalReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: any;
    businessInfo?: { name?: string; footer?: string };
}

export default function DigitalReceiptModal({ isOpen, onClose, sale, businessInfo }: DigitalReceiptModalProps) {
    if (!sale) return null;
    const saleDateText = sale.created_at ? new Date(sale.created_at).toLocaleString('fr-FR') : '';

    const formatAmount = (value: number) =>
        `${new Intl.NumberFormat('fr-FR').format(Number(value || 0))} F`;

    const escapeHtml = (value: string) =>
        String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    const handlePrint = () => {
        const receiptWindow = window.open('', '_blank', 'width=420,height=820');
        if (!receiptWindow) return;

        const itemsHtml = (sale.items || []).map((item: any) => {
            const unitPrice = item.selling_price ?? item.price ?? item.product?.selling_price ?? 0;
            const lineTotal = item.total ?? (item.quantity * unitPrice);
            return `
                <div class="line">
                    <div class="line-main">
                        <p class="item-name">${escapeHtml(item.product_name || item.product?.name || 'Article')}</p>
                        <p class="item-meta">${escapeHtml(formatSaleQuantity(item))} x ${escapeHtml(formatAmount(unitPrice))}</p>
                    </div>
                    <span class="item-total">${escapeHtml(formatAmount(lineTotal))}</span>
                </div>
            `;
        }).join('');

        const paymentsHtml = Array.isArray(sale.payments) && sale.payments.length > 1
            ? sale.payments.map((payment: any) => `<p>${escapeHtml(String(payment.method || '').replace('_', ' ').toUpperCase())}: ${escapeHtml(formatAmount(payment.amount))}</p>`).join('')
            : `<p>Paiement : ${escapeHtml((sale.payment_method?.replace('_', ' ')) || 'Cash')}</p>`;

        receiptWindow.document.write(`
            <!DOCTYPE html>
            <html lang="fr">
                <head>
                    <meta charset="utf-8" />
                    <title>Recu ${escapeHtml(sale.sale_id || '')}</title>
                    <style>
                        body {
                            margin: 0;
                            padding: 24px;
                            background: #ffffff;
                            color: #0f172a;
                            font-family: Arial, sans-serif;
                        }
                        .ticket {
                            width: 100%;
                            max-width: 360px;
                            margin: 0 auto;
                        }
                        .header,
                        .totals,
                        .footer {
                            border-bottom: 1px dashed #cbd5e1;
                            padding-bottom: 16px;
                            margin-bottom: 16px;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 24px;
                            font-weight: 800;
                            text-transform: uppercase;
                            text-align: center;
                        }
                        .meta,
                        .payment {
                            text-align: center;
                            color: #475569;
                            font-size: 12px;
                            line-height: 1.6;
                        }
                        .line {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            gap: 12px;
                            margin-bottom: 12px;
                        }
                        .line-main {
                            flex: 1;
                        }
                        .item-name {
                            margin: 0;
                            font-size: 14px;
                            font-weight: 700;
                        }
                        .item-meta {
                            margin: 4px 0 0;
                            color: #64748b;
                            font-size: 11px;
                        }
                        .item-total {
                            font-size: 13px;
                            font-weight: 700;
                            white-space: nowrap;
                        }
                        .row {
                            display: flex;
                            justify-content: space-between;
                            gap: 12px;
                            font-size: 14px;
                            margin-bottom: 8px;
                        }
                        .row.muted {
                            color: #475569;
                        }
                        .row.discount {
                            color: #e11d48;
                        }
                        .row.total {
                            margin-top: 12px;
                            font-size: 22px;
                            font-weight: 800;
                        }
                        .footer {
                            border-bottom: 0;
                            margin-bottom: 0;
                            text-align: center;
                            color: #64748b;
                            font-size: 12px;
                        }
                        .brand {
                            margin-top: 8px;
                            color: #94a3b8;
                            font-size: 10px;
                        }
                        @media print {
                            body {
                                padding: 0;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="ticket">
                        <div class="header">
                            <h1>${escapeHtml(businessInfo?.name || 'Mon commerce')}</h1>
                            <div class="meta">
                                <p>Date : ${escapeHtml(new Date(sale.created_at || Date.now()).toLocaleString('fr-FR'))}</p>
                                <p>Ticket : #${escapeHtml((sale.sale_id || '').substring(0, 8).toUpperCase())}</p>
                                ${sale.terminal_id ? `<p>Caisse : ${escapeHtml(sale.terminal_id)}</p>` : ''}
                            </div>
                        </div>
                        <div class="items">${itemsHtml}</div>
                        <div class="totals">
                            ${sale.discount_amount > 0 ? `
                                <div class="row muted"><span>Sous-total</span><span>${escapeHtml(formatAmount(sale.total_amount + sale.discount_amount))}</span></div>
                                <div class="row discount"><span>Remise</span><span>-${escapeHtml(formatAmount(sale.discount_amount))}</span></div>
                            ` : ''}
                            <div class="row total"><span>Total</span><span>${escapeHtml(formatAmount(sale.total_amount))}</span></div>
                            <div class="payment">${paymentsHtml}</div>
                        </div>
                        <div class="footer">
                            <p>${escapeHtml(businessInfo?.footer || 'Merci de votre visite !')}</p>
                            <p class="brand">Logiciel de gestion propulse par Stockman</p>
                        </div>
                    </div>
                </body>
            </html>
        `);
        receiptWindow.document.close();
        receiptWindow.focus();
        receiptWindow.print();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Reçu de Vente"
            maxWidth="md"
        >
            <div className="py-4">
                <div className="bg-white text-slate-900 p-4 md:p-8 rounded-xl shadow-inner receipt-print-area">
                    {/* Receipt Header */}
                    <div className="text-center border-b-2 border-dashed border-slate-200 pb-6 mb-6">
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">
                            {businessInfo?.name || 'Mon Commerce'}
                        </h2>
                        <div className="mt-4 text-xs font-medium text-slate-400">
                            <p>Date: {saleDateText}</p>
                            <p>Ticket: #{sale.sale_id?.substring(0, 8).toUpperCase()}</p>
                            {sale.terminal_id && <p>Caisse: {sale.terminal_id}</p>}
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-4 mb-8">
                        {sale.items?.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-start text-sm">
                                <div className="flex-1 pr-4">
                                    <p className="font-bold">{item.product_name || item.product?.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                                        {formatSaleQuantity(item)} x {formatAmount(item.selling_price ?? item.price ?? item.product?.selling_price ?? 0)}
                                    </p>
                                </div>
                                <span className="font-bold">{formatAmount(item.total ?? (item.quantity * (item.selling_price ?? item.price ?? item.product?.selling_price ?? 0)))}</span>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t-2 border-dashed border-slate-200 pt-6 space-y-2">
                        {sale.discount_amount > 0 && (
                            <>
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-slate-500">Sous-total</span>
                                    <span>{formatAmount(sale.total_amount + sale.discount_amount)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-medium text-rose-500">
                                    <span>Remise</span>
                                    <span>-{formatAmount(sale.discount_amount)}</span>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between text-xl font-black pt-2">
                            <span>TOTAL</span>
                            <span className="text-primary">{formatAmount(sale.total_amount)}</span>
                        </div>
                        <div className="pt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center space-y-1">
                            {sale.payments && sale.payments.length > 1 ? (
                                sale.payments.map((p: any, i: number) => (
                                    <p key={i}>{p.method?.replace('_', ' ').toUpperCase()}: {formatAmount(p.amount)}</p>
                                ))
                            ) : (
                                <p>Paiement: {sale.payment_method?.replace('_', ' ') || 'Cash'}</p>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-10 pt-6 border-t border-slate-100 text-center">
                        <p className="text-xs font-bold text-slate-400 italic">
                            {businessInfo?.footer || 'Merci de votre visite !'}
                        </p>
                        <p className="text-[8px] mt-2 text-slate-300 font-medium tracking-tight">Logiciel de gestion propulsé par Stockman</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8 no-print">
                    <button
                        onClick={handlePrint}
                        className="btn-primary py-3 rounded-xl font-black flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
                    >
                        <Printer size={18} />
                        Imprimer
                    </button>
                    {typeof navigator !== 'undefined' && navigator.share && (
                        <button
                            onClick={() => {
                                navigator.share({
                                    title: 'Reçu Stockman',
                                    text: `Ticket #${sale.sale_id?.substring(0, 8).toUpperCase()} - Total: ${sale.total_amount} F`,
                                    url: window.location.href,
                                }).catch(() => { });
                            }}
                            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                        >
                            <Share2 size={18} />
                            Partager
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all col-span-2 md:col-span-1"
                    >
                        Terminer
                    </button>
                </div>
            </div>

            <style jsx>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .receipt-print-area, .receipt-print-area * {
                        visibility: visible;
                    }
                    .receipt-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>
        </Modal>
    );
}
