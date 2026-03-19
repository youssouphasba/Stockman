'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Printer, Share2 } from 'lucide-react';
import jsPDF from 'jspdf/dist/jspdf.es.min.js';
import autoTable from 'jspdf-autotable';
import Modal from './Modal';
import type { CustomerInvoice } from '../services/api';

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: CustomerInvoice | null;
}

function formatMoney(value: number, currency?: string) {
    const safeValue = Number.isFinite(value) ? value : 0;
    return `${safeValue.toLocaleString('fr-FR')} ${currency || 'F'}`;
}

export default function InvoiceModal({ isOpen, onClose, invoice }: InvoiceModalProps) {
    const { t } = useTranslation();

    if (!invoice) {
        return null;
    }

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        const doc = new jsPDF();
        const businessName = invoice.business_name || 'Mon commerce';
        const businessAddress = invoice.business_address || '';
        const label = invoice.invoice_label || 'Facture';

        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(label.toUpperCase(), 14, 22);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(businessName, 14, 32);
        if (businessAddress) {
            doc.text(businessAddress, 14, 38);
        }

        doc.setFont('helvetica', 'bold');
        doc.text(`${t('invoice.reference', { defaultValue: 'Reference' })}: ${invoice.invoice_number}`, 140, 22, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(`${t('common.date', { defaultValue: 'Date' })}: ${new Date(invoice.issued_at).toLocaleDateString('fr-FR')}`, 140, 28, { align: 'right' });
        doc.text(`${t('invoice.client', { defaultValue: 'Client' })}: ${invoice.customer_name || t('accounting.client_diverse', { defaultValue: 'Client divers' })}`, 140, 34, { align: 'right' });

        autoTable(doc, {
            startY: 48,
            head: [[
                t('common.description', { defaultValue: 'Description' }),
                t('common.qty_short', { defaultValue: 'Qte' }),
                t('common.unit_price', { defaultValue: 'Prix unitaire' }),
                t('common.total', { defaultValue: 'Total' }),
            ]],
            body: invoice.items.map((item) => [
                item.description,
                item.quantity.toString(),
                formatMoney(item.unit_price, invoice.currency),
                formatMoney(item.line_total, invoice.currency),
            ]),
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 9 },
        });

        const finalY = (doc as any).lastAutoTable?.finalY || 120;
        doc.setFont('helvetica', 'normal');
        doc.text(`${t('invoice.subtotal_ht', { defaultValue: 'Sous-total HT' })}: ${formatMoney(invoice.subtotal_ht || 0, invoice.currency)}`, 196, finalY + 10, { align: 'right' });
        doc.text(`${t('invoice.tax_total', { defaultValue: 'TVA' })}: ${formatMoney(invoice.tax_total || 0, invoice.currency)}`, 196, finalY + 16, { align: 'right' });
        if ((invoice.discount_amount || 0) > 0) {
            doc.text(`${t('invoice.discount', { defaultValue: 'Remise' })}: -${formatMoney(invoice.discount_amount || 0, invoice.currency)}`, 196, finalY + 22, { align: 'right' });
        }
        doc.setFont('helvetica', 'bold');
        doc.text(`${t('invoice.total', { defaultValue: 'Total' })}: ${formatMoney(invoice.total_amount, invoice.currency)}`, 196, finalY + 32, { align: 'right' });

        let footerY = finalY + 48;
        doc.setFont('helvetica', 'normal');
        if (invoice.payment_terms) {
            doc.text(`${t('invoice.payment_terms', { defaultValue: 'Conditions de paiement' })}: ${invoice.payment_terms}`, 14, footerY, { maxWidth: 180 });
            footerY += 10;
        }
        if (invoice.notes) {
            doc.text(`${t('common.notes', { defaultValue: 'Notes' })}: ${invoice.notes}`, 14, footerY, { maxWidth: 180 });
            footerY += 10;
        }
        if (invoice.footer) {
            doc.text(invoice.footer, 14, footerY, { maxWidth: 180 });
        }

        doc.save(`${invoice.invoice_number}.pdf`);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={invoice.invoice_label || 'Facture'} maxWidth="xl">
            <div className="py-4">
                <div className="bg-white text-slate-900 p-8 rounded-2xl shadow-inner invoice-print-area">
                    <div className="flex items-start justify-between border-b border-slate-200 pb-6 mb-6">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400 mb-2">{invoice.invoice_label || 'Facture'}</p>
                            <h2 className="text-3xl font-black tracking-tight">{invoice.business_name || 'Mon commerce'}</h2>
                            {invoice.business_address && (
                                <p className="text-sm text-slate-500 mt-2 max-w-md">{invoice.business_address}</p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400 mb-2">{t('invoice.reference', { defaultValue: 'Reference' })}</p>
                            <p className="text-xl font-black">{invoice.invoice_number}</p>
                            <p className="text-sm text-slate-500 mt-2">{new Date(invoice.issued_at).toLocaleString('fr-FR')}</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-6">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{t('invoice.client', { defaultValue: 'Client' })}</p>
                        <p className="text-lg font-bold text-slate-900">{invoice.customer_name || t('accounting.client_diverse', { defaultValue: 'Client divers' })}</p>
                    </div>

                    <div className="space-y-3 mb-8">
                        {invoice.items.map((item, index) => (
                            <div key={`${item.description}-${index}`} className="flex items-start justify-between border-b border-slate-100 pb-3">
                                <div className="pr-4">
                                    <p className="font-bold">{item.description}</p>
                                    <p className="text-xs text-slate-500">{item.quantity} x {formatMoney(item.unit_price, invoice.currency)}</p>
                                </div>
                                <span className="font-bold">{formatMoney(item.line_total, invoice.currency)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="ml-auto w-full max-w-sm space-y-2 border-t border-slate-200 pt-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('invoice.subtotal_ht', { defaultValue: 'Sous-total HT' })}</span>
                            <span>{formatMoney(invoice.subtotal_ht || 0, invoice.currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('invoice.tax_total', { defaultValue: 'TVA' })}</span>
                            <span>{formatMoney(invoice.tax_total || 0, invoice.currency)}</span>
                        </div>
                        {(invoice.discount_amount || 0) > 0 && (
                            <div className="flex justify-between text-sm text-rose-500">
                                <span>{t('invoice.discount', { defaultValue: 'Remise' })}</span>
                                <span>-{formatMoney(invoice.discount_amount || 0, invoice.currency)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-black pt-2">
                            <span>{t('invoice.total', { defaultValue: 'Total' })}</span>
                            <span className="text-primary">{formatMoney(invoice.total_amount, invoice.currency)}</span>
                        </div>
                    </div>

                    {(invoice.payment_terms || invoice.notes || invoice.footer) && (
                        <div className="border-t border-slate-200 pt-6 mt-8 space-y-2 text-sm text-slate-500">
                            {invoice.payment_terms && (
                                <p><span className="font-bold text-slate-700">{t('invoice.payment_terms', { defaultValue: 'Conditions de paiement' })}:</span> {invoice.payment_terms}</p>
                            )}
                            {invoice.notes && (
                                <p><span className="font-bold text-slate-700">{t('common.notes', { defaultValue: 'Notes' })}:</span> {invoice.notes}</p>
                            )}
                            {invoice.footer && <p>{invoice.footer}</p>}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-3 mt-8 no-print">
                    <button
                        onClick={handlePrint}
                        className="bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                        <Printer size={18} />
                        {t('common.print', { defaultValue: 'Imprimer' })}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                        <Download size={18} />
                        PDF
                    </button>
                    <button
                        onClick={() => {
                            if (navigator.share) {
                                navigator.share({
                                    title: invoice.invoice_number,
                                    text: `${invoice.invoice_label || 'Facture'} ${invoice.invoice_number} - ${formatMoney(invoice.total_amount, invoice.currency)}`,
                                }).catch(() => { });
                            }
                        }}
                        className="bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                        <Share2 size={18} />
                        {t('common.share', { defaultValue: 'Partager' })}
                    </button>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .invoice-print-area, .invoice-print-area * {
                        visibility: visible;
                    }
                    .invoice-print-area {
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
