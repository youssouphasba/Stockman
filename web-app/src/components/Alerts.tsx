'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowUpRight, Check, CheckCircle, Info, RefreshCw, Settings, ShieldAlert, Sparkles, Trash2 } from 'lucide-react';
import { alerts as alertsApi, ai as aiApi, alertRules as alertRulesApi, auth } from '../services/api';
import type { AlertRule, NotificationChannel, NotificationContactMap, NotificationSeverity, User as AppUser } from '../services/api';
import Modal from './Modal';
import ScreenGuide, { GuideStep } from './ScreenGuide';

type RuleScope = 'account' | 'store';
type RuleTemplate = {
    type: string;
    label: string;
    description: string;
    hasThreshold: boolean;
    defaultThreshold?: number;
    defaultRecipients: (keyof NotificationContactMap)[];
    defaultChannels: NotificationChannel[];
    defaultSeverity: NotificationSeverity | null;
};

const RULE_TEMPLATES: RuleTemplate[] = [
    { type: 'low_stock', label: 'Stock bas', description: 'Alerte quand un produit passe sous son stock minimum.', hasThreshold: true, defaultThreshold: 20, defaultRecipients: ['default', 'stock'], defaultChannels: ['in_app', 'push'], defaultSeverity: 'warning' },
    { type: 'out_of_stock', label: 'Rupture de stock', description: 'Alerte immediate lorsqu un produit tombe a zero.', hasThreshold: false, defaultRecipients: ['default', 'stock'], defaultChannels: ['in_app', 'push', 'email'], defaultSeverity: 'critical' },
    { type: 'overstock', label: 'Surstock', description: 'Signale les produits surstockes pour mieux piloter les achats.', hasThreshold: true, defaultThreshold: 80, defaultRecipients: ['stock'], defaultChannels: ['in_app'], defaultSeverity: 'info' },
    { type: 'slow_moving', label: 'Produits dormants', description: 'Alerte sur les references qui ne tournent plus.', hasThreshold: false, defaultRecipients: ['stock'], defaultChannels: ['in_app', 'email'], defaultSeverity: 'info' },
    { type: 'late_delivery', label: 'Retards fournisseurs', description: 'Previent quand une commande n est pas livree a la date attendue.', hasThreshold: false, defaultRecipients: ['default', 'procurement'], defaultChannels: ['in_app', 'push', 'email'], defaultSeverity: 'warning' },
];
const CONTACT_GROUPS: { key: keyof NotificationContactMap; label: string }[] = [
    { key: 'default', label: 'Par defaut' }, { key: 'stock', label: 'Stock' }, { key: 'procurement', label: 'Appro' },
    { key: 'finance', label: 'Finance' }, { key: 'crm', label: 'CRM' }, { key: 'operations', label: 'Operations' }, { key: 'billing', label: 'Facturation' },
];
const SEVERITIES: { value: NotificationSeverity; label: string }[] = [
    { value: 'info', label: 'Info' }, { value: 'warning', label: 'Alerte' }, { value: 'critical', label: 'Critique' },
];
const CHANNELS: { value: NotificationChannel; label: string }[] = [{ value: 'push', label: 'Push' }, { value: 'email', label: 'Email' }];

function ruleKey(type: string, scope: RuleScope, storeId?: string | null) {
    return `${scope}:${storeId || 'global'}:${type}`;
}

function draftRule(template: RuleTemplate, scope: RuleScope, storeId?: string | null): AlertRule {
    const now = new Date().toISOString();
    return {
        rule_id: `draft:${ruleKey(template.type, scope, storeId)}`,
        user_id: '',
        type: template.type,
        scope,
        store_id: scope === 'store' ? storeId || null : null,
        enabled: false,
        threshold_percentage: template.hasThreshold ? template.defaultThreshold ?? 20 : null,
        notification_channels: ['in_app', ...template.defaultChannels.filter((c) => c !== 'in_app')],
        recipient_keys: template.defaultRecipients,
        recipient_emails: [],
        minimum_severity: template.defaultSeverity,
        created_at: now,
        updated_at: now,
    };
}

export default function Alerts() {
    const { t, i18n } = useTranslation();
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [anomalies, setAnomalies] = useState<any[]>([]);
    const [anomalyLoading, setAnomalyLoading] = useState(false);
    const [showAnomalies, setShowAnomalies] = useState(false);
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
    const [rules, setRules] = useState<AlertRule[]>([]);
    const [rulesLoading, setRulesLoading] = useState(false);
    const [activeRuleScope, setActiveRuleScope] = useState<RuleScope>('account');
    const [ruleDrafts, setRuleDrafts] = useState<Record<string, AlertRule>>({});
    const [savingRuleKey, setSavingRuleKey] = useState<string | null>(null);

    useEffect(() => {
        loadAlerts();
        auth.me().then(setCurrentUser).catch(() => null);
        aiApi.detectAnomalies(i18n.language).then((result) => {
            const detected = Array.isArray(result?.anomalies) ? result.anomalies : [];
            if (detected.length > 0) {
                setAnomalies(detected);
                setShowAnomalies(true);
            }
        }).catch(() => {});
    }, [i18n.language]);

    async function loadAlerts() {
        if (!refreshing) setLoading(true);
        try {
            const res = await alertsApi.list();
            setAlerts(Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []));
        } catch (err) {
            console.error('Alerts load error', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function handleDetectAnomalies() {
        setAnomalyLoading(true);
        try {
            const result = await aiApi.detectAnomalies(i18n.language);
            setAnomalies(Array.isArray(result?.anomalies) ? result.anomalies : []);
            setShowAnomalies(true);
        } catch (err) {
            console.error('Anomaly detection error', err);
        } finally {
            setAnomalyLoading(false);
        }
    }

    async function loadRules() {
        setIsRulesModalOpen(true);
        setRulesLoading(true);
        try {
            const [result, user] = await Promise.all([alertRulesApi.list(), auth.me().catch(() => currentUser)]);
            setRules(Array.isArray(result) ? result : []);
            if (user) setCurrentUser(user);
        } catch (err) {
            console.error('Rules load error', err);
        } finally {
            setRulesLoading(false);
        }
    }

    async function handleMarkRead(id: string) {
        try {
            await alertsApi.markRead(id);
            setAlerts((current) => current.map((alert) => (alert.alert_id === id ? { ...alert, is_read: true } : alert)));
        } catch (err) {
            console.error('Mark read error', err);
        }
    }

    async function handleDismiss(id: string) {
        try {
            await alertsApi.dismiss(id);
            setAlerts((current) => current.filter((alert) => alert.alert_id !== id));
        } catch (err) {
            console.error('Dismiss error', err);
        }
    }

    function updateDraft(baseRule: AlertRule, updater: (rule: AlertRule) => AlertRule) {
        const key = ruleKey(baseRule.type, baseRule.scope, baseRule.store_id);
        setRuleDrafts((current) => ({ ...current, [key]: updater(current[key] || baseRule) }));
    }

    function resetDraft(baseRule: AlertRule) {
        const key = ruleKey(baseRule.type, baseRule.scope, baseRule.store_id);
        setRuleDrafts((current) => {
            const next = { ...current };
            delete next[key];
            return next;
        });
    }

    async function persistRule(rule: AlertRule) {
        const key = ruleKey(rule.type, rule.scope, rule.store_id);
        setSavingRuleKey(key);
        try {
            const payload = {
                type: rule.type,
                scope: rule.scope,
                store_id: rule.scope === 'store' ? (rule.store_id || currentUser?.active_store_id || undefined) : undefined,
                enabled: rule.enabled,
                threshold_percentage: rule.threshold_percentage ?? undefined,
                notification_channels: Array.from(new Set(['in_app', ...(rule.notification_channels || []).filter((c) => c !== 'in_app')])) as NotificationChannel[],
                recipient_keys: rule.recipient_keys || ['default'],
                recipient_emails: rule.recipient_emails || [],
                minimum_severity: rule.minimum_severity || undefined,
            };
            if (rule.scope === 'store' && !payload.store_id) {
                throw new Error('Aucune boutique active selectionnee pour cette regle.');
            }
            const saved = rule.rule_id.startsWith('draft:')
                ? await alertRulesApi.create(payload)
                : await alertRulesApi.update(rule.rule_id, payload);
            setRules((current) => {
                const other = current.filter((item) => ruleKey(item.type, item.scope, item.store_id) !== key);
                return [...other, saved];
            });
            resetDraft(rule);
        } catch (err) {
            console.error('Rule save error', err);
            window.alert(err instanceof Error ? err.message : 'Impossible de sauvegarder cette regle.');
        } finally {
            setSavingRuleKey(null);
        }
    }

    const visibleRules = useMemo(() => {
        const activeStoreId = currentUser?.active_store_id || null;
        return RULE_TEMPLATES.map((template) => {
            const persisted = rules.find((rule) => (
                rule.type === template.type
                && rule.scope === activeRuleScope
                && (activeRuleScope === 'account' || rule.store_id === activeStoreId)
            ));
            const base = persisted || draftRule(template, activeRuleScope, activeRuleScope === 'store' ? activeStoreId : null);
            return ruleDrafts[ruleKey(base.type, base.scope, base.store_id)] || base;
        });
    }, [activeRuleScope, currentUser?.active_store_id, ruleDrafts, rules]);

    function getTypeStyles(type: string) {
        switch (type) {
            case 'critical':
                return { color: 'text-rose-400', bg: 'bg-rose-500/10', icon: <ShieldAlert size={20} /> };
            case 'warning':
                return { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: <AlertTriangle size={20} /> };
            default:
                return { color: 'text-primary', bg: 'bg-primary/10', icon: <Info size={20} /> };
        }
    }

    if (loading && alerts.length === 0) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    const unreadCount = alerts.filter((alert) => !alert.is_read).length;

    const alertsSteps: GuideStep[] = [
        {
            title: t('guide.alerts.step1_title', { defaultValue: 'Centre de notifications' }),
            content: t('guide.alerts.step1', { defaultValue: 'Consultez vos alertes de stock, fournisseurs et anomalies IA.' }),
        },
        {
            title: t('guide.alerts.step2_title', { defaultValue: 'Détection IA' }),
            content: t('guide.alerts.step2', { defaultValue: 'Cliquez sur la carte IA pour lancer une analyse intelligente de vos données.' }),
        },
        {
            title: t('guide.alerts.step3_title', { defaultValue: 'Gestion des alertes' }),
            content: t('guide.alerts.step3', { defaultValue: 'Marquez vos alertes comme lues ou ignorez-les une fois traitées.' }),
        },
        {
            title: t('guide.alerts.step4_title', { defaultValue: 'Règles d\u2019alertes' }),
            content: t('guide.alerts.step4', { defaultValue: 'Configurez vos seuils et canaux de notification dans ⚙.' }),
        },
    ];

    return (
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
            <ScreenGuide steps={alertsSteps} guideKey="alerts_tour" />
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('alerts.title') || 'Centre de notifications'}</h1>
                    <p className="text-slate-400">
                        {unreadCount > 0 ? `${unreadCount} alerte${unreadCount > 1 ? 's' : ''} a traiter.` : (t('alerts.subtitle_empty') || 'Restez informe sur l etat de votre activite.')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadRules} className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all" title="Configurer les regles">
                        <Settings size={20} />
                    </button>
                    <button
                        onClick={() => { setRefreshing(true); loadAlerts(); }}
                        disabled={refreshing}
                        className={`p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all ${refreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </header>

            <button onClick={handleDetectAnomalies} disabled={anomalyLoading} className="w-full mb-8 glass-card p-6 flex items-center gap-6 group hover:border-primary/50 transition-all text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all" />
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-all border border-primary/20">
                    {anomalyLoading ? <RefreshCw className="animate-spin" size={24} /> : <Sparkles size={24} />}
                </div>
                <div className="flex-1">
                    <h3 className="text-white font-bold text-lg">{t('alerts.detect_anomalies') || 'Detecter des anomalies IA'}</h3>
                    <p className="text-slate-400 text-sm">{anomalyLoading ? 'Analyse de vos donnees en cours...' : 'Stockman synthese les signaux faibles et les ecarts inhabituels.'}</p>
                </div>
                <ArrowUpRight className="text-slate-600 group-hover:text-primary transition-colors" size={24} />
            </button>

            {showAnomalies && anomalies.length > 0 && (
                <div className="mb-10 space-y-4">
                    <div className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest pl-1">
                        <Sparkles size={14} /> Synthese IA
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {anomalies.map((anomaly, index) => (
                            <div key={`${anomaly.title}-${index}`} className={`glass-card p-4 border-l-4 ${anomaly.severity === 'critical' ? 'border-l-rose-500 bg-rose-500/5' : anomaly.severity === 'warning' ? 'border-l-amber-500 bg-amber-500/5' : 'border-l-primary bg-primary/5'}`}>
                                <h4 className="text-white font-bold text-sm mb-1">{anomaly.title}</h4>
                                <p className="text-slate-400 text-xs leading-relaxed">{anomaly.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="max-w-4xl flex flex-col gap-4">
                {alerts.length === 0 ? (
                    <div className="glass-card p-20 text-center text-slate-500 flex flex-col items-center gap-4">
                        <CheckCircle size={48} className="text-emerald-500/20" />
                        <p className="text-xl">Tout est a jour</p>
                    </div>
                ) : alerts.map((alert) => {
                    const styles = getTypeStyles(alert.severity);
                    return (
                        <div key={alert.alert_id} className={`glass-card p-6 flex items-start gap-6 relative transition-all border-l-4 ${!alert.is_read ? 'border-l-primary' : 'border-l-transparent'} hover:bg-white/5 shadow-xl`}>
                            <div className={`p-3 rounded-2xl ${styles.bg} ${styles.color} border border-white/5`}>{styles.icon}</div>
                            <div className="flex-1 flex flex-col gap-1">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <h4 className={`font-bold text-xl ${!alert.is_read ? 'text-white' : 'text-slate-400'}`}>{alert.title}</h4>
                                        {alert.store_id && <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mt-1">Boutique concernee</p>}
                                    </div>
                                    <span className="text-xs text-slate-500 font-mono">{new Date(alert.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-slate-400 text-sm leading-relaxed">{alert.message}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                {!alert.is_read && (
                                    <button onClick={() => handleMarkRead(alert.alert_id)} className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all border border-white/5" title="Marquer comme lu">
                                        <Check size={18} />
                                    </button>
                                )}
                                <button onClick={() => handleDismiss(alert.alert_id)} className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all border border-white/5" title="Ignorer">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} title="Regles d alertes">
                <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-3">
                        <button onClick={() => setActiveRuleScope('account')} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeRuleScope === 'account' ? 'bg-primary text-slate-950' : 'bg-white/5 text-slate-300 border border-white/10'}`}>
                            Niveau compte
                        </button>
                        <button onClick={() => setActiveRuleScope('store')} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeRuleScope === 'store' ? 'bg-primary text-slate-950' : 'bg-white/5 text-slate-300 border border-white/10'}`}>
                            Boutique active
                        </button>
                        <div className="text-xs text-slate-500">
                            {activeRuleScope === 'account'
                                ? 'Les regles compte s appliquent a toute l entreprise.'
                                : `Les regles boutique s appliquent a ${currentUser?.store_name || 'la boutique active'}.`}
                        </div>
                    </div>

                    {rulesLoading ? (
                        <div className="py-10 flex justify-center"><RefreshCw className="animate-spin text-primary" /></div>
                    ) : activeRuleScope === 'store' && !currentUser?.active_store_id ? (
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100">
                            Selectionnez d abord une boutique active pour creer des regles locales.
                        </div>
                    ) : visibleRules.map((rule) => {
                        const template = RULE_TEMPLATES.find((item) => item.type === rule.type)!;
                        const key = ruleKey(rule.type, rule.scope, rule.store_id);
                        const hasUnsavedChanges = Boolean(ruleDrafts[key]);
                        return (
                            <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h4 className="text-white font-bold text-base">{template.label}</h4>
                                        <p className="text-sm text-slate-400 mt-1">{template.description}</p>
                                    </div>
                                    <button
                                        onClick={() => updateDraft(rule, (current) => ({ ...current, enabled: !current.enabled }))}
                                        className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] transition-all ${rule.enabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-white/10'}`}
                                    >
                                        {rule.enabled ? 'Activee' : 'Inactive'}
                                    </button>
                                </div>

                                {template.hasThreshold && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Seuil (%)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={rule.threshold_percentage ?? ''}
                                            onChange={(event) => updateDraft(rule, (current) => ({ ...current, threshold_percentage: Number(event.target.value || 0) }))}
                                            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Canaux</label>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">In-app</span>
                                        {CHANNELS.map((channel) => {
                                            const enabled = rule.notification_channels.includes(channel.value);
                                            return (
                                                <button
                                                    key={channel.value}
                                                    onClick={() => updateDraft(rule, (current) => ({
                                                        ...current,
                                                        notification_channels: enabled
                                                            ? current.notification_channels.filter((item) => item !== channel.value)
                                                            : [...current.notification_channels, channel.value],
                                                    }))}
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${enabled ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                                                >
                                                    {channel.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Destinataires</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CONTACT_GROUPS.map((group) => {
                                            const enabled = rule.recipient_keys.includes(group.key);
                                            return (
                                                <button
                                                    key={group.key}
                                                    onClick={() => updateDraft(rule, (current) => ({
                                                        ...current,
                                                        recipient_keys: enabled
                                                            ? current.recipient_keys.filter((item) => item !== group.key)
                                                            : [...current.recipient_keys, group.key],
                                                    }))}
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${enabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                                                >
                                                    {group.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Emails additionnels</label>
                                    <input
                                        type="text"
                                        value={rule.recipient_emails.join(', ')}
                                        onChange={(event) => updateDraft(rule, (current) => ({
                                            ...current,
                                            recipient_emails: event.target.value.split(',').map((value) => value.trim()).filter(Boolean),
                                        }))}
                                        placeholder="stock@entreprise.com, direction@entreprise.com"
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Severite minimale</label>
                                    <div className="flex flex-wrap gap-2">
                                        {SEVERITIES.map((severity) => {
                                            const enabled = rule.minimum_severity === severity.value;
                                            return (
                                                <button
                                                    key={severity.value}
                                                    onClick={() => updateDraft(rule, (current) => ({ ...current, minimum_severity: enabled ? null : severity.value }))}
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${enabled ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                                                >
                                                    {severity.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-3 pt-2">
                                    <div className="text-xs text-slate-500">{hasUnsavedChanges ? 'Modifications non enregistrees' : 'Regle synchronisee'}</div>
                                    <div className="flex items-center gap-2">
                                        {hasUnsavedChanges && (
                                            <button onClick={() => resetDraft(rule)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-all">
                                                Annuler
                                            </button>
                                        )}
                                        <button
                                            onClick={() => persistRule(rule)}
                                            disabled={savingRuleKey === key}
                                            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-slate-950 transition-all hover:brightness-110 disabled:opacity-60"
                                        >
                                            {savingRuleKey === key ? 'Enregistrement...' : (rule.rule_id.startsWith('draft:') ? 'Creer la regle' : 'Enregistrer')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Modal>
        </div>
    );
}
