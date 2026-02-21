'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, X, CheckCircle, PieChart, TrendingUp, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface AccountingReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    stats: any;
    expenses: any[];
    period: number;
}

export default function AccountingReportModal({ isOpen, onClose, stats, expenses, period }: AccountingReportModalProps) {
    const { t } = useTranslation();
    const [generating, setGenerating] = useState(false);

    const generatePDF = () => {
        setGenerating(true);
        try {
            const doc = new jsPDF() as any;
            const primaryColor = [59, 130, 246]; // Blue-500

            // Header
            doc.setFillColor(248, 250, 252);
            doc.rect(0, 0, 210, 40, 'F');

            doc.setTextColor(30, 41, 59);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('STOCKMAN', 15, 25);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text('RAPPORT D\'ACTIVITÉ FINANCIÈRE', 15, 32);

            doc.text(`Période: ${stats?.period_label || `Derniers ${period} jours`}`, 140, 20);
            doc.text(`Généré le: ${new Date().toLocaleDateString()}`, 140, 26);

            // Summary Cards
            let y = 55;
            doc.setDrawColor(241, 245, 249);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(15, y, 55, 25, 3, 3, 'FD');
            doc.roundedRect(77, y, 55, 25, 3, 3, 'FD');
            doc.roundedRect(140, y, 55, 25, 3, 3, 'FD');

            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('CHIFFRE D\'AFFAIRES', 20, y + 8);
            doc.text('MARGE BRUTE', 82, y + 8);
            doc.text('BÉNÉFICE NET', 145, y + 8);

            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59);
            doc.text(`${(stats?.revenue || 0).toLocaleString()} F`, 20, y + 18);
            doc.text(`${(stats?.gross_profit || 0).toLocaleString()} F`, 82, y + 18);
            doc.setTextColor(59, 130, 246);
            doc.text(`${(stats?.net_profit || 0).toLocaleString()} F`, 145, y + 18);

            // Performance Table
            y += 40;
            doc.setFontSize(12);
            doc.setTextColor(30, 41, 59);
            doc.text('Performance des Produits Top 10', 15, y);

            const perfData = (stats?.product_performance || [])
                .sort((a: any, b: any) => b.revenue - a.revenue)
                .slice(0, 10)
                .map((p: any) => [
                    p.name,
                    p.qty_sold.toString(),
                    `${p.revenue.toLocaleString()} F`,
                    `${p.cogs.toLocaleString()} F`,
                    `${(p.revenue - p.cogs).toLocaleString()} F`,
                    `${((p.revenue - p.cogs) / p.revenue * 100).toFixed(0)}%`
                ]);

            doc.autoTable({
                startY: y + 5,
                head: [['Produit', 'Qté', 'Ventes', 'Coût', 'Marge', '%']],
                body: perfData,
                theme: 'striped',
                headStyles: { fillColor: primaryColor },
                styles: { fontSize: 8 }
            });

            // Expenses Section
            y = (doc as any).lastAutoTable.cursor + 15;
            doc.setFontSize(12);
            doc.text('Dépenses Opérationnelles', 15, y);

            const expensesData = expenses.map(e => [
                new Date(e.created_at).toLocaleDateString(),
                e.category,
                e.description || '-',
                `${e.amount.toLocaleString()} F`
            ]);

            doc.autoTable({
                startY: y + 5,
                head: [['Date', 'Catégorie', 'Description', 'Montant']],
                body: expensesData.slice(0, 20), // Show only recent for report
                theme: 'plain',
                headStyles: { textColor: [100, 116, 139], fontStyle: 'bold' },
                styles: { fontSize: 8 }
            });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text('Stockman Business Intelligence - Rapport Confidentiel', 105, 285, { align: 'center' });
            }

            doc.save(`Rapport_Stockman_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error("PDF generation error", err);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Rapports d'Activité"
            maxWidth="lg"
        >
            <div className="py-6 flex flex-col items-center">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 animate-pulse">
                    <FileText size={48} />
                </div>

                <h3 className="text-2xl font-black text-white text-center mb-2 tracking-tight">Rapports Financiers PDF</h3>
                <p className="text-slate-400 text-center max-w-sm mb-10 text-sm">
                    Générez une synthèse complète de votre activité incluant vos marges, vos tops produits et le détail de vos charges.
                </p>

                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="glass-card p-6 border-white/5 bg-white/5 flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400">
                                <TrendingUp size={20} />
                            </div>
                            <span className="text-white font-bold text-sm italic">Synthèse Profits</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Analyse complète des marges brutes et nettes pour la période de {period} jours.</p>
                        <ul className="mt-2 space-y-1.5">
                            <li className="flex items-center gap-2 text-[10px] text-slate-300">
                                <CheckCircle size={10} className="text-primary" /> Revenues & COGS
                            </li>
                            <li className="flex items-center gap-2 text-[10px] text-slate-300">
                                <CheckCircle size={10} className="text-primary" /> Top 10 Produits
                            </li>
                        </ul>
                    </div>

                    <div className="glass-card p-6 border-white/5 bg-white/5 flex flex-col gap-3 opacity-60 grayscale cursor-not-allowed">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-400">
                                <PieChart size={20} />
                            </div>
                            <span className="text-white font-bold text-sm italic">Grand Livre (Beta)</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Vue détaillée de toutes les transactions et écritures comptables.</p>
                        <div className="mt-2 text-[8px] bg-white/10 px-2 py-0.5 rounded-full text-slate-400 self-start">Bientôt disponible</div>
                    </div>
                </div>

                <div className="w-full flex gap-3 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 px-6 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all text-sm"
                    >
                        Fermer
                    </button>
                    <button
                        onClick={generatePDF}
                        disabled={generating}
                        className="flex-[2] btn-primary py-4 px-6 rounded-2xl font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                        {generating ? (
                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Download size={20} />
                                Télécharger le Rapport PDF
                            </>
                        )}
                    </button>
                </div>

                <div className="mt-8 flex items-center gap-2 text-[9px] text-slate-500 font-bold uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                    <AlertCircle size={10} />
                    Le rapport couvre la période du {stats?.period_label || `${period} jours`}
                </div>
            </div>
        </Modal>
    );
}
