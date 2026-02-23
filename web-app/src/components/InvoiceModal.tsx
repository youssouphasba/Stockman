'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, Download, User, FileText, Send } from 'lucide-react';
import Modal from './Modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function InvoiceModal({ isOpen, onClose }: InvoiceModalProps) {
    const { t } = useTranslation();
    const [clientName, setClientName] = useState('');
    const [items, setItems] = useState([{ description: '', quantity: 1, price: 0 }]);
    const [note, setNote] = useState('');
    const [generating, setGenerating] = useState(false);

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, price: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length <= 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    };

    const generatePDF = () => {
        setGenerating(true);
        try {
            const doc = new jsPDF() as any;

            // Professional header
            doc.setFillColor(59, 130, 246);
            doc.rect(0, 0, 210, 5, 'F');

            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('FACTURE', 15, 25);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Référence: INV-${Date.now().toString().slice(-6)}`, 15, 32);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 38);

            // Client Info
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('FACTURÉ À:', 120, 25);
            doc.setFont('helvetica', 'normal');
            doc.text(clientName || 'Client Divers', 120, 32);

            // Table of items
            const TABLE_TOP = 50;
            const tableBody = items.map(item => [
                item.description || 'Produit/Service',
                item.quantity.toString(),
                `${item.price.toLocaleString()} F`,
                `${(item.quantity * item.price).toLocaleString()} F`
            ]);

            autoTable(doc, {

                startY: TABLE_TOP,
                head: [['Désignation', 'Quantité', 'Prix Unitaire', 'Total']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [59, 130, 246] },
                styles: { fontSize: 9 }
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;


            // Totals
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL GÉNÉRAL:', 130, finalY);
            doc.text(`${calculateTotal().toLocaleString()} F`, 180, finalY, { align: 'right' });

            if (note) {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text('Notes:', 15, finalY + 10);
                doc.text(note, 15, finalY + 15, { maxWidth: 100 });
            }

            // Footer
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('Merci de votre confiance !', 105, 280, { align: 'center' });
            doc.text('Généré via Stockman Intelligence', 105, 285, { align: 'center' });

            doc.save(`Facture_${clientName || 'Client'}_${Date.now()}.pdf`);
            onClose();
        } catch (err) {
            console.error("PDF Invoice Error", err);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Générer une Facture"
            maxWidth="lg"
        >
            <div className="py-4 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Client</label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Nom du client..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-primary/50"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Articles / Services</label>
                        <button onClick={addItem} className="text-primary hover:text-primary/70 transition-colors flex items-center gap-1 font-bold text-xs">
                            <Plus size={14} /> Ajouter
                        </button>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex gap-3 items-start animate-in fade-in slide-in-from-top-1 duration-200">
                                <input
                                    type="text"
                                    placeholder="Désignation"
                                    className="flex-[3] bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-primary/50"
                                    value={item.description}
                                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                />
                                <input
                                    type="number"
                                    placeholder="Qté"
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-primary/50"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                                />
                                <input
                                    type="number"
                                    placeholder="Prix"
                                    className="flex-[1.5] bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-primary/50"
                                    value={item.price}
                                    onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                                />
                                <button onClick={() => removeItem(idx)} className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all h-[46px]">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Note ou Conditions</label>
                    <textarea
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-primary/50"
                        placeholder="Ex: Paiement sous 15 jours..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">TOTAL FACTURE</span>
                        <span className="text-3xl font-black text-white italic tracking-tighter">{calculateTotal().toLocaleString()} F</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-4 rounded-xl border border-white/10 text-slate-400 font-bold hover:bg-white/5 transition-all">
                            Annuler
                        </button>
                        <button
                            onClick={generatePDF}
                            disabled={generating}
                            className="btn-primary px-8 py-4 rounded-xl font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            {generating ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Download size={20} />
                                    Télécharger PDF
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
