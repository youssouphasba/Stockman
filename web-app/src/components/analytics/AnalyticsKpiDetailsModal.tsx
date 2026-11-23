'use client';

import React from 'react';
import { BarChart3, Download, Loader2 } from 'lucide-react';
import Modal from '../Modal';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { AnalyticsKpiDetail } from '../../services/api';

function formatCellValue(value: any) {
    if (value === null || value === undefined || value === '') {
        return '-';
    }
    if (typeof value === 'number') {
        return Number.isInteger(value) ? value.toLocaleString('fr-FR') : value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    }
    if (typeof value === 'string' && value.includes('T') && !Number.isNaN(Date.parse(value))) {
        return new Date(value).toLocaleString('fr-FR');
    }
    return String(value);
}

function exportCsv(detail: AnalyticsKpiDetail) {
    const header = detail.columns.map((column) => column.label).join(';');
    const rows = detail.rows.map((row) =>
        detail.columns.map((column) => {
            const raw = row[column.key];
            const value = formatCellValue(raw).replace(/"/g, '""');
            return `"${value}"`;
        }).join(';')
    );
    const csv = `\uFEFF${[header, ...rows].join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${detail.export_name || 'analytics_kpi'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export default function AnalyticsKpiDetailsModal({
    detail,
    loading,
    open,
    onClose,
}: {
    detail: AnalyticsKpiDetail | null;
    loading?: boolean;
    open: boolean;
    onClose: () => void;
}) {
    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            maxWidth="6xl"
            title={detail?.title || 'Détail du KPI'}
            description={detail?.description || 'Chargement du détail…'}
            footer={(
                <Button variant="secondary" onClick={() => detail && exportCsv(detail)} disabled={!detail || loading}>
                    <Download size={16} />
                    Export Excel
                </Button>
            )}
        >
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                {loading ? 'Chargement…' : `${detail?.total_rows ?? 0} ligne(s)`}
            </p>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={32} className="animate-spin text-primary" />
                </div>
            ) : !detail || detail.rows.length === 0 ? (
                <EmptyState icon={BarChart3} title="Aucun détail disponible pour cette sélection." />
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10 custom-scrollbar">
                    <div
                        className="grid bg-white/5 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500"
                        style={{ gridTemplateColumns: `repeat(${detail.columns.length}, minmax(140px, 1fr))` }}
                    >
                        {detail.columns.map((column) => (
                            <span key={column.key}>{column.label}</span>
                        ))}
                    </div>
                    {detail.rows.map((row, index) => (
                        <div
                            key={`${index}-${row[detail.columns[0]?.key] ?? 'row'}`}
                            className="grid border-t border-white/5 px-4 py-3 text-sm text-slate-200"
                            style={{ gridTemplateColumns: `repeat(${detail.columns.length}, minmax(140px, 1fr))` }}
                        >
                            {detail.columns.map((column) => (
                                <span key={column.key} className="pr-4">
                                    {formatCellValue(row[column.key])}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}
