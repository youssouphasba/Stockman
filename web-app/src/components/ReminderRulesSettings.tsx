'use client';

import React, { useState } from 'react';

export type ReminderRule = { enabled: boolean; threshold?: number };

export type ReminderRuleSettings = {
    inventory_check: ReminderRule;
    dormant_products: ReminderRule;
    late_deliveries: ReminderRule;
    replenishment: ReminderRule;
    pending_invitations: ReminderRule;
    debt_recovery: ReminderRule;
    client_reactivation: ReminderRule;
    birthdays: ReminderRule;
    monthly_report: ReminderRule;
    expense_spike: ReminderRule;
};

type RuleConfig = {
    key: keyof ReminderRuleSettings;
    label: string;
    description: string;
    icon: string;
    unit?: string;
    color: string;
};

const RULE_CONFIGS: RuleConfig[] = [
    { key: 'inventory_check', label: 'Vérification d\'inventaire', description: 'Rappel si aucun inventaire effectué depuis N jours', icon: '📋', unit: 'jours', color: '#F59E0B' },
    { key: 'dormant_products', label: 'Produits dormants', description: 'Alerter pour les produits sans mouvement depuis N jours', icon: '🌙', unit: 'jours', color: '#F59E0B' },
    { key: 'late_deliveries', label: 'Livraisons en retard', description: 'Signaler les commandes en retard de plus de N jours', icon: '⚠️', unit: 'jours', color: '#EF4444' },
    { key: 'replenishment', label: 'Réapprovisionnement', description: 'Suggérer automatiquement les produits à réapprovisionner', icon: '🛒', color: '#3B82F6' },
    { key: 'pending_invitations', label: 'Invitations en attente', description: 'Relancer après N jours sans réponse', icon: '📨', unit: 'jours', color: '#3B82F6' },
    { key: 'debt_recovery', label: 'Recouvrement de dettes', description: 'Alerter quand les dettes clients dépassent N (en devise)', icon: '💰', unit: 'F', color: '#8B5CF6' },
    { key: 'client_reactivation', label: 'Réactivation clients', description: 'Identifier les clients inactifs depuis N jours', icon: '👤', unit: 'jours', color: '#8B5CF6' },
    { key: 'birthdays', label: 'Anniversaires clients', description: 'Rappel N jours avant l\'anniversaire du client', icon: '🎁', unit: 'jours', color: '#8B5CF6' },
    { key: 'monthly_report', label: 'Rapport mensuel', description: 'Envoyer le bilan N jours avant la fin du mois', icon: '📄', unit: 'jours', color: '#10B981' },
    { key: 'expense_spike', label: 'Pic de dépenses', description: 'Alerter si les dépenses augmentent de plus de N%', icon: '📈', unit: '%', color: '#10B981' },
];

const DEFAULT_RULES: ReminderRuleSettings = {
    inventory_check: { enabled: true, threshold: 30 },
    dormant_products: { enabled: true, threshold: 60 },
    late_deliveries: { enabled: true, threshold: 7 },
    replenishment: { enabled: true },
    pending_invitations: { enabled: true, threshold: 3 },
    debt_recovery: { enabled: true, threshold: 50000 },
    client_reactivation: { enabled: true, threshold: 30 },
    birthdays: { enabled: true, threshold: 7 },
    monthly_report: { enabled: true, threshold: 3 },
    expense_spike: { enabled: true, threshold: 50 },
};

interface Props {
    rules: ReminderRuleSettings;
    onUpdate: (rules: ReminderRuleSettings) => void;
}

export default function ReminderRulesSettings({ rules, onUpdate }: Props) {
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    function toggleRule(key: keyof ReminderRuleSettings) {
        const current = rules[key] ?? DEFAULT_RULES[key];
        onUpdate({ ...rules, [key]: { ...current, enabled: !current.enabled } });
    }

    function startEditing(key: string, currentVal: number) {
        setEditingKey(key);
        setEditValue(String(currentVal));
    }

    function commitEdit(key: keyof ReminderRuleSettings) {
        const num = parseInt(editValue, 10);
        if (!isNaN(num) && num > 0) {
            const current = rules[key] ?? DEFAULT_RULES[key];
            onUpdate({ ...rules, [key]: { ...current, threshold: num } });
        }
        setEditingKey(null);
    }

    return (
        <div className="space-y-3">
            {RULE_CONFIGS.map(config => {
                const rule = rules[config.key] ?? DEFAULT_RULES[config.key];
                const isEditing = editingKey === config.key;

                return (
                    <div
                        key={config.key}
                        className={`flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 transition-opacity ${rule.enabled ? 'opacity-100' : 'opacity-50'}`}
                    >
                        {/* Icon */}
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                            style={{ backgroundColor: config.color + '20' }}
                        >
                            {config.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm">{config.label}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{config.description}</p>

                            {config.unit && rule.enabled && (
                                <div className="flex items-center gap-2 mt-2">
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            onBlur={() => commitEdit(config.key)}
                                            onKeyDown={e => e.key === 'Enter' && commitEdit(config.key)}
                                            className="w-20 bg-white/10 border border-primary/50 rounded-lg px-2 py-1 text-white text-sm font-bold outline-none text-center"
                                            autoFocus
                                        />
                                    ) : (
                                        <button
                                            onClick={() => startEditing(config.key, rule.threshold ?? 0)}
                                            className="px-3 py-1 rounded-lg text-sm font-black text-primary hover:bg-primary/10 transition-colors"
                                            style={{ backgroundColor: config.color + '15' }}
                                        >
                                            {rule.threshold ?? 0}
                                        </button>
                                    )}
                                    <span className="text-slate-500 text-xs">{config.unit}</span>
                                </div>
                            )}
                        </div>

                        {/* Toggle */}
                        <button
                            onClick={() => toggleRule(config.key)}
                            className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${rule.enabled ? 'bg-primary' : 'bg-white/10'}`}
                        >
                            <span
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.enabled ? 'translate-x-7' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
