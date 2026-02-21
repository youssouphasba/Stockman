'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Printer, Share2, Download, X } from 'lucide-react';
import Modal from './Modal';

interface DigitalReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: any;
}

export default function DigitalReceiptModal({ isOpen, onClose, sale }: DigitalReceiptModalProps) {
    const { t } = useTranslation();

    if (!sale) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Reçu de Vente"
            maxWidth="md"
        >
            <div className="py-4">
                <div className="bg-white text-slate-900 p-8 rounded-xl shadow-inner receipt-print-area">
                    {/* Receipt Header */}
                    <div className="text-center border-b-2 border-dashed border-slate-200 pb-6 mb-6">
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">Stockman</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Solutions d'Inventaire Intelligentes</p>
                        <div className="mt-4 text-xs font-medium text-slate-400">
                            <p>Date: {new Date(sale.created_at || Date.now()).toLocaleString()}</p>
                            <p>Ticket: #{sale.sale_id?.substring(0, 8).toUpperCase()}</p>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-4 mb-8">
                        {sale.items?.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-start text-sm">
                                <div className="flex-1 pr-4">
                                    <p className="font-bold">{item.product_name || item.product?.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} x {item.price || item.product?.selling_price} F</p>
                                </div>
                                <span className="font-bold">{(item.quantity * (item.price || item.product?.selling_price))} F</span>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t-2 border-dashed border-slate-200 pt-6 space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-slate-500">Sous-total</span>
                            <span>{sale.total_amount} F</span>
                        </div>
                        <div className="flex justify-between text-xl font-black pt-2">
                            <span>TOTAL</span>
                            <span className="text-primary">{sale.total_amount} F</span>
                        </div>
                        <div className="pt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                            Paiement: {sale.payment_method || 'Cash'}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-10 pt-6 border-t border-slate-100 text-center">
                        <p className="text-xs font-bold text-slate-400 italic">Merci de votre visite !</p>
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
