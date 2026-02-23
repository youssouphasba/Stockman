'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    History,
    User,
    Package,
    ShoppingCart,
    Clock,
    ArrowRight,
    Database,
    Layers,
    Download,
    FileSpreadsheet,
    FileText,
    ChevronDown
} from 'lucide-react';
import { activityLogs as logsApi } from '../services/api';
import { exportActivity } from '../utils/ExportService';

export default function Activity() {
    const { t } = useTranslation();
    const [logs, setLogs] = useState<any[]>([]);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const res = await logsApi.list();
            setLogs(Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []));
        } catch (err) {
            console.error("Logs load error", err);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (module: string) => {
        switch (module) {
            case 'product': return <Package size={16} />;
            case 'sale': return <ShoppingCart size={16} />;
            case 'auth': return <User size={16} />;
            default: return <Database size={16} />;
        }
    };

    if (loading && logs.length === 0) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar">
            <header className="flex justify-between items-start mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Historique d'Activité</h1>
                    <p className="text-slate-400">Journal d'audit complet de toutes les actions système.</p>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowExportMenu(v => !v)}
                        className="glass-card px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                        <Download size={16} />
                        Exporter
                        <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                    </button>
                    {showExportMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[180px]">
                            <button
                                onClick={() => { exportActivity(logs, 'excel'); setShowExportMenu(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors"
                            >
                                <FileSpreadsheet size={16} className="text-emerald-400" />
                                Excel (.xlsx)
                            </button>
                            <button
                                onClick={() => { exportActivity(logs, 'pdf'); setShowExportMenu(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors"
                            >
                                <FileText size={16} className="text-red-400" />
                                PDF
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <div className="max-w-4xl">
                <div className="relative border-l-2 border-white/5 ml-4 pl-8 space-y-8">
                    {(Array.isArray(logs) ? logs : []).length === 0 ? (
                        <div className="text-slate-500 py-10">Aucun log récent.</div>
                    ) : (
                        (Array.isArray(logs) ? logs : []).map((log, index) => (
                            <div key={log.log_id} className="relative group">
                                {/* Timeline Dot */}
                                <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-[#0F172A] border-2 border-primary group-hover:scale-125 transition-all"></div>

                                <div className="glass-card p-5 hover:border-primary/30 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
                                            {getIcon(log.module)}
                                            {log.module}
                                        </div>
                                        <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                                            <Clock size={12} />
                                            {new Date(log.created_at).toLocaleString()}
                                        </span>
                                    </div>

                                    <h4 className="text-white font-bold text-lg mb-1">{log.description}</h4>
                                    <p className="text-slate-400 text-sm">{log.details?.reason || log.action}</p>

                                    <div className="mt-4 flex items-center gap-3 pt-4 border-t border-white/5">
                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                                            <User size={12} className="text-slate-300" />
                                        </div>
                                        <span className="text-xs text-slate-300 font-medium">Par <span className="text-white font-bold">{log.user_name || 'Système'}</span></span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
