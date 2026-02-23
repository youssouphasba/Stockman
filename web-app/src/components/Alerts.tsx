'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertTriangle,
    Bell,
    Check,
    Info,
    ShieldAlert,
    Trash2,
    CheckCircle,
    X,
    Sparkles,
    Settings,
    ChevronDown,
    ChevronUp,
    SwitchCamera,
    ToggleLeft,
    ToggleRight,
    Search,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Package,
    ArrowUpRight
} from 'lucide-react';
import { alerts as alertsApi, ai as aiApi, alertRules as alertRulesApi } from '../services/api';
import Modal from './Modal';

export default function Alerts() {
    const { t, i18n } = useTranslation();
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // AI Anomalies State
    const [anomalies, setAnomalies] = useState<any[]>([]);
    const [anomalyLoading, setAnomalyLoading] = useState(false);
    const [showAnomalies, setShowAnomalies] = useState(false);

    // Rules State
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
    const [rules, setRules] = useState<any[]>([]);
    const [rulesLoading, setRulesLoading] = useState(false);

    const RULE_TYPE_CONFIG: Record<string, { label: string; desc: string; hasThreshold: boolean }> = {
        low_stock: { label: 'Stock Faible', desc: 'Alerte quand un produit passe sous un seuil défini.', hasThreshold: true },
        out_of_stock: { label: 'Rupture de Stock', desc: 'Alerte immédiate quand la quantité atteint zéro.', hasThreshold: false },
        overstock: { label: 'Surstockage', desc: 'Alerte quand le stock dépasse la capacité conseillée.', hasThreshold: true },
        slow_moving: { label: 'Produits Dormants', desc: 'Détecte les produits non vendus depuis 30 jours.', hasThreshold: false },
    };

    useEffect(() => {
        loadAlerts();
        // Auto-detect anomalies on mount (silent, no loading spinner)
        aiApi.detectAnomalies(i18n.language).then(result => {
            const detected = Array.isArray(result?.anomalies) ? result.anomalies : [];
            if (detected.length > 0) {
                setAnomalies(detected);
                setShowAnomalies(true);
            }
        }).catch(() => {});
    }, []);

    const loadAlerts = async () => {
        if (!refreshing) setLoading(true);
        try {
            const res = await alertsApi.list();
            setAlerts(Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []));
        } catch (err) {
            console.error("Alerts load error", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleDetectAnomalies = async () => {
        setAnomalyLoading(true);
        try {
            const result = await aiApi.detectAnomalies(i18n.language);
            setAnomalies(Array.isArray(result?.anomalies) ? result.anomalies : []);
            setShowAnomalies(true);
        } catch (err) {
            console.error("Anomaly detection error", err);
        } finally {
            setAnomalyLoading(false);
        }
    };

    const loadRules = async () => {
        setIsRulesModalOpen(true);
        setRulesLoading(true);
        try {
            const result = await alertRulesApi.list();
            setRules(Array.isArray(result) ? result : []);
        } catch (err) {
            console.error("Rules load error", err);
        } finally {
            setRulesLoading(false);
        }
    };

    const toggleRule = async (rule: any) => {
        try {
            const updated = await alertRulesApi.update(rule.rule_id, {
                ...rule,
                enabled: !rule.enabled
            });
            setRules(rules.map(r => r.rule_id === rule.rule_id ? updated : r));
        } catch (err) {
            console.error("Toggle rule error", err);
        }
    };

    const handleMarkRead = async (id: string) => {
        try {
            await alertsApi.markRead(id);
            setAlerts(alerts.map(a => a.alert_id === id ? { ...a, read: true } : a));
        } catch (err) {
            console.error("Mark read error", err);
        }
    };

    const handleDismiss = async (id: string) => {
        try {
            await alertsApi.dismiss(id);
            setAlerts(alerts.filter(a => a.alert_id !== id));
        } catch (err) {
            console.error("Dismiss error", err);
        }
    };

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'critical': return { color: 'text-rose-400', bg: 'bg-rose-500/10', icon: <ShieldAlert size={20} /> };
            case 'warning': return { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: <AlertTriangle size={20} /> };
            default: return { color: 'text-primary', bg: 'bg-primary/10', icon: <Info size={20} /> };
        }
    };

    if (loading && alerts.length === 0) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    const unreadCount = (Array.isArray(alerts) ? alerts : []).filter(a => !a.read).length;

    return (
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('alerts.title') || 'Centre de Notifications'}</h1>
                    <p className="text-slate-400">{t('alerts.subtitle_empty') || 'Restez informé sur l\'état de votre boutique.'}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadRules}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"
                        title="Configuration"
                    >
                        <Settings size={20} />
                    </button>
                    <button
                        onClick={loadAlerts}
                        disabled={refreshing}
                        className={`p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all ${refreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </header>

            {/* Sparkles AI Button */}
            <button
                onClick={handleDetectAnomalies}
                disabled={anomalyLoading}
                className="w-full mb-8 glass-card p-6 flex items-center gap-6 group hover:border-primary/50 transition-all text-left relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all"></div>

                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-all border border-primary/20">
                    {anomalyLoading ? <RefreshCw className="animate-spin" size={24} /> : <Sparkles size={24} />}
                </div>

                <div className="flex-1">
                    <h3 className="text-white font-bold text-lg">{t('alerts.detect_anomalies') || 'Détecter des Anomalies par IA'}</h3>
                    <p className="text-slate-400 text-sm">
                        {anomalyLoading ? 'Analyse intelligente de vos données en cours...' : 'Laissez Stockman AI analyser vos tendances de ventes et stocks.'}
                    </p>
                </div>

                <ArrowUpRight className="text-slate-600 group-hover:text-primary transition-colors" size={24} />
            </button>

            {/* AI Anomalies Results */}
            {showAnomalies && anomalies.length > 0 && (
                <div className="mb-10 space-y-4">
                    <div className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest pl-1">
                        <Sparkles size={14} /> Resultats de l'Analyse IA
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {anomalies.map((a, idx) => (
                            <div key={idx} className={`glass-card p-4 border-l-4 ${a.severity === 'critical' ? 'border-l-rose-500 bg-rose-500/5' :
                                a.severity === 'warning' ? 'border-l-amber-500 bg-amber-500/5' :
                                    'border-l-primary bg-primary/5'
                                }`}>
                                <h4 className="text-white font-bold text-sm mb-1">{a.title}</h4>
                                <p className="text-slate-400 text-xs leading-relaxed">{a.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Alerts List */}
            <div className="max-w-4xl flex flex-col gap-4">
                {(Array.isArray(alerts) ? alerts : []).length === 0 ? (
                    <div className="glass-card p-20 text-center text-slate-500 flex flex-col items-center gap-4">
                        <CheckCircle size={48} className="text-emerald-500/20" />
                        <p className="text-xl">Tout est à jour !</p>
                    </div>
                ) : (
                    (Array.isArray(alerts) ? alerts : []).map((alert) => {
                        const styles = getTypeStyles(alert.severity);
                        return (
                            <div
                                key={alert.alert_id}
                                className={`glass-card p-6 flex items-start gap-6 relative transition-all border-l-4 ${!alert.read ? 'border-l-primary' : 'border-l-transparent'
                                    } hover:bg-white/5 shadow-xl`}
                            >
                                <div className={`p-3 rounded-2xl ${styles.bg} ${styles.color} border border-white/5`}>
                                    {styles.icon}
                                </div>

                                <div className="flex-1 flex flex-col gap-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className={`font-bold text-xl ${!alert.read ? 'text-white' : 'text-slate-400'}`}>
                                            {alert.title}
                                        </h4>
                                        <span className="text-xs text-slate-500 font-mono">
                                            {new Date(alert.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-sm leading-relaxed">{alert.message}</p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {!alert.read && (
                                        <button
                                            onClick={() => handleMarkRead(alert.alert_id)}
                                            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all border border-white/5"
                                            title="Marquer comme lu"
                                        >
                                            <Check size={18} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDismiss(alert.alert_id)}
                                        className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all border border-white/5"
                                        title="Supprimer"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Rules Configuration Modal */}
            <Modal
                isOpen={isRulesModalOpen}
                onClose={() => setIsRulesModalOpen(false)}
                title="Configuration des Alertes"
            >
                <div className="space-y-4">
                    {rulesLoading ? (
                        <div className="py-10 flex justify-center"><RefreshCw className="animate-spin text-primary" /></div>
                    ) : (
                        rules.map(rule => {
                            const config = RULE_TYPE_CONFIG[rule.type];
                            return (
                                <div key={rule.rule_id} className="glass-card p-5 bg-white/5 border-white/10 flex items-center justify-between group">
                                    <div className="flex-1">
                                        <h4 className="text-white font-bold">{config?.label || rule.type}</h4>
                                        <p className="text-xs text-slate-400 max-w-sm">{config?.desc || ''}</p>
                                        {config?.hasThreshold && rule.enabled && (
                                            <div className="mt-3 flex items-center gap-3">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Seuil : {rule.threshold_percentage}%</span>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="100"
                                                    value={rule.threshold_percentage}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        setRules(rules.map(r => r.rule_id === rule.rule_id ? { ...r, threshold_percentage: val } : r));
                                                    }}
                                                    onMouseUp={() => alertRulesApi.update(rule.rule_id, rule)}
                                                    className="h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => toggleRule(rule)}
                                        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${rule.enabled ? 'bg-primary' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${rule.enabled ? 'right-1' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </Modal>
        </div>
    );
}
