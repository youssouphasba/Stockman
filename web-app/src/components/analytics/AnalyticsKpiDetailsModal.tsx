'use client';

import React from 'react';
import { Download, X } from 'lucide-react';
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
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 py-6">
            <div className="w-full max-w-6xl rounded-3xl border border-white/10 bg-[#0F172A] shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Analyse detaillee</p>
                        <h2 className="mt-2 text-2xl font-black text-white">{detail?.title || 'Detail KPI'}</h2>
                        <p className="mt-2 text-sm text-slate-400">{detail?.description || 'Chargement du detail...'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => detail && exportCsv(detail)}
                            disabled={!detail || loading}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-primary/30 hover:text-primary disabled:opacity-50"
                        >
                            <Download size={16} />
                            Export Excel
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:text-white"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    {loading ? 'Chargement...' : `${detail?.total_rows ?? 0} ligne(s)`}
                </div>

                <div className="max-h-[70vh] overflow-auto px-6 pb-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
                        </div>
                    ) : !detail || detail.rows.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-sm text-slate-500">
                            Aucun detail disponible pour cette selection.
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-white/10">
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
                </div>
            </div>
        </div>
    );
}
