'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Settings as SettingsIcon,
    Shield,
    Bell,
    AppWindow,
    Globe,
    Save,
    User,
    Store,
    ChevronRight,
    LogOut,
    Printer,
    Monitor,
    Plus,
    Trash2,
    MapPin,
    Mail,
    Eye,
    FileText
} from 'lucide-react';
import { settings as settingsApi, auth as authApi, locations as locationsApi, stores as storesApi, userFeatures as userFeaturesApi } from '../services/api';
import type { NotificationContactMap, NotificationPreferences, User as AppUser } from '../services/api';
import ReminderRulesSettings, { ReminderRuleSettings } from './ReminderRulesSettings';
import { getAccessContext } from '../utils/access';


type SettingsProps = {
    user?: AppUser | null;
};

const DEFAULT_NOTIFICATION_CONTACTS: NotificationContactMap = {
    default: [],
    stock: [],
    procurement: [],
    finance: [],
    crm: [],
    operations: [],
    billing: [],
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    in_app: true,
    push: true,
    email: false,
    minimum_severity_for_push: 'warning',
    minimum_severity_for_email: 'critical',
};

const NOTIFICATION_CONTACT_FIELDS: { key: keyof NotificationContactMap; label: string; description: string }[] = [
    { key: 'default', label: 'Destinataires par défaut', description: 'Utilisés si une règle ne cible pas un groupe plus précis.' },
    { key: 'stock', label: 'Stock', description: 'Ruptures, stock bas, surstock et dormance produits.' },
    { key: 'procurement', label: 'Approvisionnement', description: 'Retards fournisseurs, commandes et livraisons.' },
    { key: 'finance', label: 'Finance', description: 'Dépenses, écarts, documents et alertes sensibles pour la trésorerie.' },
    { key: 'crm', label: 'CRM', description: 'Dettes clients, relances et alertes relation client.' },
    { key: 'operations', label: 'Opérations', description: 'Anomalies, synthèses IA et incidents transverses.' },
    { key: 'billing', label: 'Facturation', description: 'Contact abonnement et sujets contractuels du compte.' },
];

function ScopeBadge({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
            {label}
        </span>
    );
}

export default function Settings({ user }: SettingsProps) {
    const { t, i18n } = useTranslation();
    const access = getAccessContext(user);
    const canManageOrgSettings = access.isOrgAdmin;
    const canManageBilling = access.isBillingAdmin;
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [profileName, setProfileName] = useState('');
    const [currency, setCurrency] = useState('XOF');
    const [billingContactName, setBillingContactName] = useState('');
    const [billingContactEmail, setBillingContactEmail] = useState('');
    const [notificationContacts, setNotificationContacts] = useState<NotificationContactMap>(DEFAULT_NOTIFICATION_CONTACTS);
    const [storeNotificationContacts, setStoreNotificationContacts] = useState<NotificationContactMap>(DEFAULT_NOTIFICATION_CONTACTS);
    const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
    const [receiptName, setReceiptName] = useState('');
    const [receiptFooter, setReceiptFooter] = useState('');
    const [invoiceName, setInvoiceName] = useState('');
    const [invoiceAddress, setInvoiceAddress] = useState('');
    const [invoiceLabel, setInvoiceLabel] = useState('');
    const [invoicePrefix, setInvoicePrefix] = useState('');
    const [invoiceFooter, setInvoiceFooter] = useState('');
    const [invoicePaymentTerms, setInvoicePaymentTerms] = useState('');
    const [terminals, setTerminals] = useState<string[]>([]);
    const [newTerminal, setNewTerminal] = useState('');
    const [locations, setLocations] = useState<any[]>([]);
    const [newLocName, setNewLocName] = useState('');
    const [newLocType, setNewLocType] = useState('shelf');
    const [storeList, setStoreList] = useState<any[]>([]);
    const [editingStore, setEditingStore] = useState<any>(null);
    const [storeSaving, setStoreSaving] = useState(false);
    const [sector, setSector] = useState('');
    const activeStore = storeList.find((store) => store.store_id === user?.active_store_id) || null;

    const CURRENCIES = [
        { code: 'XOF', label: 'XOF — CFA BCEAO (Sénégal, Mali, CI…)' },
        { code: 'XAF', label: 'XAF — CFA BEAC (Cameroun, Gabon…)' },
        { code: 'EUR', label: 'EUR — Euro' },
        { code: 'USD', label: 'USD — Dollar US' },
        { code: 'GHS', label: 'GHS — Cedi (Ghana)' },
        { code: 'NGN', label: 'NGN — Naira (Nigeria)' },
        { code: 'MAD', label: 'MAD — Dirham (Maroc)' },
        { code: 'TND', label: 'TND — Dinar (Tunisie)' },
        { code: 'DZD', label: 'DZD — Dinar (Algérie)' },
        { code: 'EGP', label: 'EGP — Livre (Égypte)' },
        { code: 'KES', label: 'KES — Shilling (Kenya)' },
        { code: 'ZAR', label: 'ZAR — Rand (Afrique du Sud)' },
    ];

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const [res, locs, storesRes] = await Promise.all([settingsApi.get(), locationsApi.list(), storesApi.list()]);
            setSettings(res);
            setProfileName(res?.user_name || '');
            setCurrency(res?.currency || 'XOF');
            setBillingContactName(res?.billing_contact_name || '');
            setBillingContactEmail(res?.billing_contact_email || '');
            setNotificationContacts({ ...DEFAULT_NOTIFICATION_CONTACTS, ...(res?.notification_contacts || {}) });
            setStoreNotificationContacts({ ...DEFAULT_NOTIFICATION_CONTACTS, ...(res?.store_notification_contacts || {}) });
            setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...(res?.notification_preferences || {}) });
            setReceiptName(res?.receipt_business_name || '');
            setReceiptFooter(res?.receipt_footer || '');
            setInvoiceName(res?.invoice_business_name || '');
            setInvoiceAddress(res?.invoice_business_address || '');
            setInvoiceLabel(res?.invoice_label || 'Facture');
            setInvoicePrefix(res?.invoice_prefix || 'FAC');
            setInvoiceFooter(res?.invoice_footer || '');
            setInvoicePaymentTerms(res?.invoice_payment_terms || '');
            setTerminals(res?.terminals || []);
            setLocations(locs || []);
            setStoreList(storesRes || []);
            userFeaturesApi.get().then((f: any) => setSector(f?.sector || '')).catch(() => {});
        } catch (err) {
            console.error("Settings load error", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSettings = async (updates: any) => {
        const updateKeys = Object.keys(updates || {});
        const billingKeys = new Set(['billing_contact_name', 'billing_contact_email']);
        const orgKeys = new Set([
            'modules',
            'notification_contacts',
            'loyalty',
            'reminder_rules',
            'store_notification_contacts',
            'tax_enabled',
            'tax_rate',
            'tax_mode',
            'receipt_business_name',
            'receipt_footer',
            'invoice_business_name',
            'invoice_business_address',
            'invoice_label',
            'invoice_prefix',
            'invoice_footer',
            'invoice_payment_terms',
            'terminals',
        ]);

        if (updateKeys.some((key) => billingKeys.has(key)) && !canManageBilling) {
            return;
        }
        if (updateKeys.some((key) => orgKeys.has(key)) && !canManageOrgSettings) {
            return;
        }

        setSaving(true);
        setSuccess(false);
        try {
            const newSettings = { ...settings, ...updates };
            await settingsApi.update(newSettings);
            setSettings(newSettings);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Update settings error", err);
        } finally {
            setSaving(false);
        }
    };

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        handleUpdateSettings({ language: lng });
    };

    const updateNotificationGroup = (
        setter: React.Dispatch<React.SetStateAction<NotificationContactMap>>,
        key: keyof NotificationContactMap,
        value: string,
    ) => {
        const emails = value
            .split(',')
            .map((email) => email.trim())
            .filter(Boolean);
        setter((current) => ({ ...current, [key]: emails }));
    };

    const saveNotificationContacts = async () => {
        const updated = await settingsApi.update({ notification_contacts: notificationContacts });
        setSettings(updated);
        setNotificationContacts({ ...DEFAULT_NOTIFICATION_CONTACTS, ...(updated?.notification_contacts || {}) });
    };

    const saveStoreNotificationContacts = async () => {
        const updated = await settingsApi.update({ store_notification_contacts: storeNotificationContacts });
        setSettings(updated);
        setStoreNotificationContacts({ ...DEFAULT_NOTIFICATION_CONTACTS, ...(updated?.store_notification_contacts || {}) });
    };

    const saveNotificationPreferences = async () => {
        const updated = await settingsApi.update({
            push_notifications: notificationPreferences.push,
            notification_preferences: notificationPreferences,
        });
        setSettings(updated);
        setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...(updated?.notification_preferences || {}) });
    };

    if (loading && !settings) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Paramètres Portés</h1>
                    <p className="text-slate-400">Gérez votre profil, vos préférences de boutique et la sécurité.</p>
                </div>
                {success && (
                    <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-sm font-bold animate-fade-in">
                        Modifications enregistrées !
                    </div>
                )}
            </header>

            <div className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Utilisateur</p>
                            <h2 className="mt-2 text-lg font-black text-white">Preferences personnelles</h2>
                        </div>
                        <ScopeBadge label="User" />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                        Langue, profil, devise et securite personnelle.
                    </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Entreprise</p>
                            <h2 className="mt-2 text-lg font-black text-white">Regles globales du compte</h2>
                        </div>
                        <ScopeBadge label="Compte" />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                        Facturation, modules, TVA, rappels et documents par defaut de l organisation.
                    </p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                        {canManageOrgSettings ? 'Edition avancee disponible ici' : 'Consultation selon vos droits'}
                    </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Boutique active</p>
                            <h2 className="mt-2 text-lg font-black text-white">{activeStore?.name || 'Aucune boutique active'}</h2>
                        </div>
                        <ScopeBadge label="Boutique" />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                        Nom, adresse, recu, facture et terminaux de la boutique selectionnee.
                    </p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                        {storeList.length.toLocaleString('fr-FR')} boutique{storeList.length > 1 ? 's' : ''} reliee{storeList.length > 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">
                <div className="lg:col-span-2 space-y-8">
                    {/* User Profile */}
                    <div className="glass-card p-8">
                        <div className="mb-8 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <User size={24} className="text-primary" />
                                    Profil Utilisateur
                                </h3>
                                <p className="mt-2 text-sm text-slate-500">Ces champs vous suivent partout sans modifier les regles du compte.</p>
                            </div>
                            <ScopeBadge label="User" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-slate-400">Nom complet</label>
                                <input
                                    type="text"
                                    value={profileName}
                                    onChange={(e) => setProfileName(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-slate-400">Email</label>
                                <input
                                    type="email"
                                    disabled
                                    defaultValue={settings?.email || 'pro@stockman.pro'}
                                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-slate-500 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => handleUpdateSettings({ user_name: profileName })}
                            disabled={saving}
                            className="btn-primary mt-8 px-6 py-3 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? 'Enregistrement...' : 'Mettre à jour le profil'}
                        </button>
                    </div>

                    <div className="glass-card p-8">
                        <div className="mb-8 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <Bell size={24} className="text-primary" />
                                    Mes notifications
                                </h3>
                                <p className="mt-2 text-sm text-slate-500">Choisissez vos canaux personnels et le niveau minimum qui merite un push ou un email.</p>
                            </div>
                            <ScopeBadge label="User" />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {([
                                { key: 'in_app', label: 'In-app', desc: 'Toujours visible dans le centre de notifications.' },
                                { key: 'push', label: 'Push mobile', desc: 'Pour les alertes terrain qui doivent vous sortir de l’écran.' },
                                { key: 'email', label: 'Email perso', desc: 'Pour recevoir aussi un recap direct dans votre boite.' },
                            ] as const).map((item) => {
                                const enabled = notificationPreferences[item.key];
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setNotificationPreferences((current) => ({ ...current, [item.key]: !enabled }))}
                                        className={`rounded-2xl border p-4 text-left transition-all ${
                                            enabled ? 'border-primary/40 bg-primary/10 text-white' : 'border-white/10 bg-white/5 text-slate-300'
                                        }`}
                                    >
                                        <p className="text-sm font-black uppercase tracking-[0.16em]">{item.label}</p>
                                        <p className="mt-2 text-xs leading-5 text-slate-400">{item.desc}</p>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-slate-400">Severite minimum pour push</label>
                                <select
                                    value={notificationPreferences.minimum_severity_for_push}
                                    onChange={(e) => setNotificationPreferences((current) => ({
                                        ...current,
                                        minimum_severity_for_push: e.target.value as NotificationPreferences['minimum_severity_for_push'],
                                    }))}
                                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary/50"
                                >
                                    <option value="info">Information</option>
                                    <option value="warning">Attention</option>
                                    <option value="critical">Critique</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-slate-400">Severite minimum pour email</label>
                                <select
                                    value={notificationPreferences.minimum_severity_for_email}
                                    onChange={(e) => setNotificationPreferences((current) => ({
                                        ...current,
                                        minimum_severity_for_email: e.target.value as NotificationPreferences['minimum_severity_for_email'],
                                    }))}
                                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary/50"
                                >
                                    <option value="info">Information</option>
                                    <option value="warning">Attention</option>
                                    <option value="critical">Critique</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={saveNotificationPreferences}
                            disabled={saving}
                            className="btn-primary mt-8 px-6 py-3 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? 'Enregistrement...' : 'Enregistrer mes notifications'}
                        </button>
                    </div>

                    {canManageBilling && (
                    <div className="glass-card p-8">
                        <div className="mb-8 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <Mail size={24} className="text-primary" />
                                    Contact de facturation
                                </h3>
                                <p className="mt-2 text-sm text-slate-500">Canal officiel pour l abonnement, les paiements et les echanges contractuels.</p>
                            </div>
                            <ScopeBadge label="Compte" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-slate-400">Nom du contact</label>
                                <input
                                    type="text"
                                    value={billingContactName}
                                    onChange={(e) => setBillingContactName(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-slate-400">Email de facturation</label>
                                <input
                                    type="email"
                                    value={billingContactEmail}
                                    onChange={(e) => setBillingContactEmail(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => handleUpdateSettings({ billing_contact_name: billingContactName, billing_contact_email: billingContactEmail })}
                            disabled={saving}
                            className="btn-primary mt-8 px-6 py-3 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? 'Enregistrement...' : 'Mettre a jour la facturation'}
                        </button>
                    </div>
                    )}

                    {canManageOrgSettings && (
                    <div className="glass-card p-8">
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-3">
                            <Bell size={24} className="text-primary" />
                            Règles de Rappel Intelligent
                        </h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Configurez les seuils et activez/désactivez les rappels automatiques générés par l'IA.
                        </p>
                        <ReminderRulesSettings
                            rules={settings?.reminder_rules ?? {} as ReminderRuleSettings}
                            onUpdate={(newRules) => handleUpdateSettings({ reminder_rules: newRules })}
                        />
                    </div>
                    )}

                    {/* Preferences */}
                    <div className="glass-card p-8">
                        <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                            <Globe size={24} className="text-primary" />
                            Préférences Régionales
                        </h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <span className="block text-white font-bold text-lg">Langue du Tableau de Bord</span>
                                    <span className="text-sm text-slate-500 italic">Traduction complète en 17 langues</span>
                                </div>
                                <select
                                    className="bg-[#0F172A] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary/50"
                                    value={i18n.language}
                                    onChange={(e) => changeLanguage(e.target.value)}
                                >
                                    <option value="fr">Français</option>
                                    <option value="en">English</option>
                                    <option value="wo">Wolof</option>
                                </select>
                            </div>

                            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <span className="block text-white font-bold text-lg">Devise Locale</span>
                                    <span className="text-sm text-slate-500 italic">Utilisée pour tous les rapports financiers</span>
                                </div>
                                <select
                                    value={currency}
                                    onChange={async (e) => {
                                        const val = e.target.value;
                                        setCurrency(val);
                                        try {
                                            await authApi.updateProfile({ currency: val });
                                            setSettings((s: any) => ({ ...s, currency: val }));
                                        } catch (err) {
                                            console.error('Currency update error', err);
                                        }
                                    }}
                                    className="bg-[#0F172A] border border-white/10 rounded-xl p-3 text-primary font-bold outline-none focus:border-primary/50 text-sm"
                                >
                                    {CURRENCIES.map(c => (
                                        <option key={c.code} value={c.code}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    {/* Receipt Customization */}
                    {canManageOrgSettings && activeStore && (
                    <div className="glass-card p-8">
                        <div className="mb-8 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <Store size={24} className="text-primary" />
                                    Emails de la boutique active
                                </h3>
                                <p className="mt-2 text-sm text-slate-500">Ajoutez des destinataires propres a {activeStore.name}. Ils se combinent avec les emails du compte pour cette boutique.</p>
                            </div>
                            <ScopeBadge label="Boutique" />
                        </div>
                        <div className="grid grid-cols-1 gap-5">
                            {NOTIFICATION_CONTACT_FIELDS.map((field) => (
                                <div key={field.key} className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-white">{field.label}</label>
                                    <p className="text-xs text-slate-500">{field.description}</p>
                                    <textarea
                                        value={(storeNotificationContacts[field.key] || []).join(', ')}
                                        onChange={(e) => updateNotificationGroup(setStoreNotificationContacts, field.key, e.target.value)}
                                        rows={2}
                                        className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all resize-none"
                                        placeholder="ex: boutique-plateau@entreprise.com"
                                    />
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={saveStoreNotificationContacts}
                            disabled={saving}
                            className="btn-primary mt-8 px-6 py-3 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? 'Enregistrement...' : 'Enregistrer la boutique active'}
                        </button>
                    </div>
                    )}

                    {canManageOrgSettings && (
                    <div className="glass-card p-8">
                        <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                            <Printer size={24} className="text-primary" />
                            Personnalisation du Reçu
                        </h3>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-slate-400">Nom de l'établissement</label>
                                <input
                                    type="text"
                                    value={receiptName}
                                    onChange={e => setReceiptName(e.target.value)}
                                    placeholder="Ex: Supermarché Diallo"
                                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-slate-400">Message de pied de reçu</label>
                                <input
                                    type="text"
                                    value={receiptFooter}
                                    onChange={e => setReceiptFooter(e.target.value)}
                                    placeholder="Ex: Merci de votre confiance !"
                                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all"
                                />
                            </div>
                            <button
                                onClick={() => handleUpdateSettings({ receipt_business_name: receiptName, receipt_footer: receiptFooter })}
                                disabled={saving}
                                className="btn-primary px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save size={16} /> Enregistrer
                            </button>
                        </div>
                    </div>
                    )}

                    {canManageOrgSettings && (
                    <div className="glass-card p-8">
                        <div className="mb-8 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <Bell size={24} className="text-primary" />
                                    Emails de notification de l entreprise
                                </h3>
                                <p className="mt-2 text-sm text-slate-500">Definissez qui doit recevoir les alertes selon le sujet. Utilisez des adresses separees par des virgules.</p>
                            </div>
                            <ScopeBadge label="Compte" />
                        </div>
                        <div className="grid grid-cols-1 gap-5">
                            {NOTIFICATION_CONTACT_FIELDS.map((field) => (
                                <div key={field.key} className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-white">{field.label}</label>
                                    <p className="text-xs text-slate-500">{field.description}</p>
                                    <textarea
                                        value={(notificationContacts[field.key] || []).join(', ')}
                                        onChange={(e) => updateNotificationGroup(setNotificationContacts, field.key, e.target.value)}
                                        rows={2}
                                        className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all resize-none"
                                        placeholder="ex: responsable@entreprise.com, stock@entreprise.com"
                                    />
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={saveNotificationContacts}
                            disabled={saving}
                            className="btn-primary mt-8 px-6 py-3 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? 'Enregistrement...' : 'Enregistrer les destinataires'}
                        </button>
                    </div>
                    )}

                    {canManageOrgSettings && (
                    <div className="glass-card p-8">
                        <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                            <FileText size={24} className="text-primary" />
                            Personnalisation des factures
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-slate-400">Nom sur la facture</label>
                                <input
                                    type="text"
                                    value={invoiceName}
                                    onChange={e => setInvoiceName(e.target.value)}
                                    placeholder="Ex: Stockman Market SARL"
                                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-slate-400">Type de facture</label>
                                <input
                                    type="text"
                                    value={invoiceLabel}
                                    onChange={e => setInvoiceLabel(e.target.value)}
                                    placeholder="Ex: Facture"
                                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-slate-400">Prefixe</label>
                                <input
                                    type="text"
                                    value={invoicePrefix}
                                    onChange={e => setInvoicePrefix(e.target.value)}
                                    placeholder="FAC"
                                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-slate-400">Conditions de paiement</label>
                                <input
                                    type="text"
                                    value={invoicePaymentTerms}
                                    onChange={e => setInvoicePaymentTerms(e.target.value)}
                                    placeholder="Ex: Paiement a reception"
                                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all"
                                />
                            </div>
                            <div className="md:col-span-2 flex flex-col gap-2">
                                <label className="text-sm text-slate-400">Adresse de facturation</label>
                                <input
                                    type="text"
                                    value={invoiceAddress}
                                    onChange={e => setInvoiceAddress(e.target.value)}
                                    placeholder="Ex: Dakar, Rue 10 x Blaise Diagne"
                                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all"
                                />
                            </div>
                            <div className="md:col-span-2 flex flex-col gap-2">
                                <label className="text-sm text-slate-400">Pied de facture</label>
                                <input
                                    type="text"
                                    value={invoiceFooter}
                                    onChange={e => setInvoiceFooter(e.target.value)}
                                    placeholder="Ex: Merci pour votre confiance."
                                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => handleUpdateSettings({
                                invoice_business_name: invoiceName,
                                invoice_business_address: invoiceAddress,
                                invoice_label: invoiceLabel,
                                invoice_prefix: invoicePrefix,
                                invoice_footer: invoiceFooter,
                                invoice_payment_terms: invoicePaymentTerms,
                            })}
                            disabled={saving}
                            className="btn-primary mt-6 px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={16} /> Enregistrer
                        </button>
                    </div>
                    )}

                    {/* TVA / Taxes */}
                    {canManageOrgSettings && (
                    <div className="glass-card p-8">
                        <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                            💰 {t('settings.tax_title')}
                        </h3>
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white font-medium">{t('settings.tax_enabled')}</p>
                                    <p className="text-xs text-slate-500">{t('settings.tax_enabled_desc')}</p>
                                </div>
                                <button
                                    onClick={() => handleUpdateSettings({ tax_enabled: !settings?.tax_enabled })}
                                    className={`w-12 h-6 rounded-full transition-all ${settings?.tax_enabled ? 'bg-primary' : 'bg-white/10'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings?.tax_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                            {settings?.tax_enabled && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <label className="text-white font-medium">{t('settings.tax_rate')}</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="30"
                                                step="0.5"
                                                value={settings?.tax_rate ?? 0}
                                                onChange={e => setSettings((s: any) => ({ ...s, tax_rate: parseFloat(e.target.value) || 0 }))}
                                                onBlur={() => handleUpdateSettings({ tax_rate: settings?.tax_rate ?? 0 })}
                                                className="w-20 bg-white/5 border border-white/10 rounded-xl p-2 text-white text-center text-lg font-bold focus:border-primary/50 outline-none"
                                            />
                                            <span className="text-white font-bold text-lg">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-white font-medium mb-1">{t('settings.tax_mode')}</p>
                                        <p className="text-xs text-slate-500 mb-3">{t('settings.tax_mode_desc')}</p>
                                        <div className="flex gap-3">
                                            {(['ttc', 'ht'] as const).map(mode => (
                                                <button
                                                    key={mode}
                                                    onClick={() => handleUpdateSettings({ tax_mode: mode })}
                                                    className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${
                                                        settings?.tax_mode === mode
                                                            ? 'border-primary bg-primary/20 text-primary'
                                                            : 'border-white/10 text-slate-400 hover:border-white/20'
                                                    }`}
                                                >
                                                    {mode === 'ttc' ? t('settings.tax_mode_ttc') : t('settings.tax_mode_ht')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    )}

                    {/* Multi-caisse — Terminal Management */}
                    {canManageOrgSettings && (
                    <div className="glass-card p-8">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                            <Monitor size={24} className="text-primary" />
                            Caisses / Terminaux
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">Définissez les points de vente de votre magasin. Le caissier sélectionne sa caisse à chaque session.</p>
                        <div className="space-y-2 mb-4">
                            {terminals.map((t, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                    <span className="text-white font-medium text-sm">{t}</span>
                                    <button
                                        onClick={() => {
                                            const next = terminals.filter((_, idx) => idx !== i);
                                            setTerminals(next);
                                            handleUpdateSettings({ terminals: next });
                                        }}
                                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newTerminal}
                                onChange={e => setNewTerminal(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && newTerminal.trim()) {
                                        const next = [...terminals, newTerminal.trim()];
                                        setTerminals(next);
                                        setNewTerminal('');
                                        handleUpdateSettings({ terminals: next });
                                    }
                                }}
                                placeholder="Ex: Caisse 1, Caisse Fruits..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none text-sm"
                            />
                            <button
                                onClick={() => {
                                    if (!newTerminal.trim()) return;
                                    const next = [...terminals, newTerminal.trim()];
                                    setTerminals(next);
                                    setNewTerminal('');
                                    handleUpdateSettings({ terminals: next });
                                }}
                                className="p-3 bg-primary text-white rounded-xl hover:bg-primary/80 transition-colors"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                    )}

                    {/* Emplacements / Locations */}
                    <div className="glass-card p-8">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                            <MapPin size={24} className="text-primary" />
                            Emplacements du Stock
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">Définissez les zones de stockage (rayons, entrepôt, réception). Assignez chaque produit à son emplacement.</p>
                        <div className="space-y-2 mb-4">
                            {locations.map((loc) => (
                                <div key={loc.location_id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <span className="text-white font-medium text-sm">{loc.name}</span>
                                        <span className="text-[10px] font-bold uppercase text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                            {loc.type === 'shelf' ? 'Rayon' : loc.type === 'warehouse' ? 'Entrepôt' : 'Réception'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            await locationsApi.delete(loc.location_id);
                                            setLocations(prev => prev.filter(l => l.location_id !== loc.location_id));
                                        }}
                                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newLocName}
                                onChange={e => setNewLocName(e.target.value)}
                                onKeyDown={async e => {
                                    if (e.key === 'Enter' && newLocName.trim()) {
                                        const loc = await locationsApi.create({ name: newLocName.trim(), type: newLocType });
                                        setLocations(prev => [...prev, loc]);
                                        setNewLocName('');
                                    }
                                }}
                                placeholder="Ex: Rayon A, Entrepôt Nord..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none text-sm"
                            />
                            <select
                                value={newLocType}
                                onChange={e => setNewLocType(e.target.value)}
                                className="bg-[#0F172A] border border-white/10 rounded-xl px-3 text-white text-sm outline-none focus:border-primary/50"
                            >
                                <option value="shelf">Rayon</option>
                                <option value="warehouse">Entrepôt</option>
                                <option value="dock">Réception</option>
                            </select>
                            <button
                                onClick={async () => {
                                    if (!newLocName.trim()) return;
                                    const loc = await locationsApi.create({ name: newLocName.trim(), type: newLocType });
                                    setLocations(prev => [...prev, loc]);
                                    setNewLocName('');
                                }}
                                className="p-3 bg-primary text-white rounded-xl hover:bg-primary/80 transition-colors"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Per-Store Settings */}
                    {canManageOrgSettings && storeList.length > 0 && (
                        <div className="glass-card p-8">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                <Store size={24} className="text-primary" />
                                Paramètres par Boutique
                            </h3>
                            <p className="text-sm text-slate-500 mb-6">Personnalisez la devise, le reçu et les caisses de chaque boutique indépendamment.</p>
                            <div className="space-y-3">
                                {storeList.map(store => (
                                    <div key={store.store_id} className="border border-white/10 rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => setEditingStore(editingStore?.store_id === store.store_id ? null : store)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                                        >
                                            <div className="text-left">
                                                <span className="text-white font-bold">{store.name}</span>
                                                {store.address && <span className="block text-xs text-slate-500">{store.address}</span>}
                                            </div>
                                            <ChevronRight size={16} className={`text-slate-500 transition-transform ${editingStore?.store_id === store.store_id ? 'rotate-90' : ''}`} />
                                        </button>

                                        {editingStore?.store_id === store.store_id && (
                                            <div className="px-4 pb-4 space-y-3 bg-white/3 border-t border-white/5">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                                                    <div>
                                                        <label className="text-xs text-slate-400 font-bold mb-1 block">Nom</label>
                                                        <input
                                                            type="text"
                                                            defaultValue={store.name}
                                                            onChange={e => setEditingStore((s: any) => ({ ...s, name: e.target.value }))}
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-400 font-bold mb-1 block">Adresse</label>
                                                        <input
                                                            type="text"
                                                            defaultValue={store.address || ''}
                                                            onChange={e => setEditingStore((s: any) => ({ ...s, address: e.target.value }))}
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-400 font-bold mb-1 block">Devise (boutique)</label>
                                                        <select
                                                            defaultValue={store.currency || ''}
                                                            onChange={e => setEditingStore((s: any) => ({ ...s, currency: e.target.value }))}
                                                            className="w-full bg-[#0F172A] border border-white/10 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                                                        >
                                                            <option value="">— Utiliser devise compte —</option>
                                                            {CURRENCIES.map(c => (
                                                                <option key={c.code} value={c.code} className="bg-[#0F172A]">{c.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-400 font-bold mb-1 block">Nom sur le reçu</label>
                                                        <input
                                                            type="text"
                                                            defaultValue={store.receipt_business_name || ''}
                                                            onChange={e => setEditingStore((s: any) => ({ ...s, receipt_business_name: e.target.value }))}
                                                            placeholder="Ex: Boutique Centre-Ville"
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="text-xs text-slate-400 font-bold mb-1 block">Pied de reçu</label>
                                                        <input
                                                            type="text"
                                                            defaultValue={store.receipt_footer || ''}
                                                            onChange={e => setEditingStore((s: any) => ({ ...s, receipt_footer: e.target.value }))}
                                                            placeholder="Ex: Merci pour votre visite !"
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-400 font-bold mb-1 block">Nom sur la facture</label>
                                                        <input
                                                            type="text"
                                                            defaultValue={store.invoice_business_name || ''}
                                                            onChange={e => setEditingStore((s: any) => ({ ...s, invoice_business_name: e.target.value }))}
                                                            placeholder="Ex: Boutique Centre-Ville"
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-400 font-bold mb-1 block">Type de facture</label>
                                                        <input
                                                            type="text"
                                                            defaultValue={store.invoice_label || ''}
                                                            onChange={e => setEditingStore((s: any) => ({ ...s, invoice_label: e.target.value }))}
                                                            placeholder="Ex: Facture"
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-400 font-bold mb-1 block">Prefixe</label>
                                                        <input
                                                            type="text"
                                                            defaultValue={store.invoice_prefix || ''}
                                                            onChange={e => setEditingStore((s: any) => ({ ...s, invoice_prefix: e.target.value }))}
                                                            placeholder="FAC"
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-400 font-bold mb-1 block">Conditions de paiement</label>
                                                        <input
                                                            type="text"
                                                            defaultValue={store.invoice_payment_terms || ''}
                                                            onChange={e => setEditingStore((s: any) => ({ ...s, invoice_payment_terms: e.target.value }))}
                                                            placeholder="Ex: Paiement a reception"
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="text-xs text-slate-400 font-bold mb-1 block">Adresse de facturation</label>
                                                        <input
                                                            type="text"
                                                            defaultValue={store.invoice_business_address || ''}
                                                            onChange={e => setEditingStore((s: any) => ({ ...s, invoice_business_address: e.target.value }))}
                                                            placeholder="Ex: Dakar, Rue 10 x Blaise Diagne"
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="text-xs text-slate-400 font-bold mb-1 block">Pied de facture</label>
                                                        <input
                                                            type="text"
                                                            defaultValue={store.invoice_footer || ''}
                                                            onChange={e => setEditingStore((s: any) => ({ ...s, invoice_footer: e.target.value }))}
                                                            placeholder="Ex: Merci pour votre confiance."
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="text-xs text-slate-400 font-bold mb-1 block">Caisses / Terminaux</label>
                                                        <div className="space-y-1 mb-2">
                                                            {(editingStore.terminals || store.terminals || []).map((t: string, i: number) => (
                                                                <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                                                                    <span className="text-white text-sm">{t}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setEditingStore((s: any) => ({ ...s, terminals: (s.terminals || store.terminals || []).filter((_: string, idx: number) => idx !== i) }))}
                                                                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                id={`new-terminal-${store.store_id}`}
                                                                placeholder="Ex: Caisse 1…"
                                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter') {
                                                                        const val = (e.target as HTMLInputElement).value.trim();
                                                                        if (!val) return;
                                                                        setEditingStore((s: any) => ({ ...s, terminals: [...(s.terminals || store.terminals || []), val] }));
                                                                        (e.target as HTMLInputElement).value = '';
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const input = document.getElementById(`new-terminal-${store.store_id}`) as HTMLInputElement;
                                                                    const val = input?.value.trim();
                                                                    if (!val) return;
                                                                    setEditingStore((s: any) => ({ ...s, terminals: [...(s.terminals || store.terminals || []), val] }));
                                                                    if (input) input.value = '';
                                                                }}
                                                                className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/80 transition-colors"
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    disabled={storeSaving}
                                                    onClick={async () => {
                                                        setStoreSaving(true);
                                                        try {
                                                            const updated = await storesApi.update(store.store_id, {
                                                                name: editingStore.name,
                                                                address: editingStore.address,
                                                                currency: editingStore.currency || undefined,
                                                                receipt_business_name: editingStore.receipt_business_name || undefined,
                                                                receipt_footer: editingStore.receipt_footer || undefined,
                                                                invoice_business_name: editingStore.invoice_business_name || undefined,
                                                                invoice_business_address: editingStore.invoice_business_address || undefined,
                                                                invoice_label: editingStore.invoice_label || undefined,
                                                                invoice_prefix: editingStore.invoice_prefix || undefined,
                                                                invoice_footer: editingStore.invoice_footer || undefined,
                                                                invoice_payment_terms: editingStore.invoice_payment_terms || undefined,
                                                                terminals: editingStore.terminals ?? store.terminals ?? undefined,
                                                            });
                                                            setStoreList(prev => prev.map(s => s.store_id === store.store_id ? { ...s, ...updated } : s));
                                                            setEditingStore(null);
                                                        } catch (err) { console.error(err); }
                                                        finally { setStoreSaving(false); }
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                                                >
                                                    <Save size={14} /> {storeSaving ? 'Enregistrement...' : 'Sauvegarder'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Settings */}
                <div className="space-y-8">
                    {/* Modules / Tab visibility */}
                    {canManageOrgSettings && settings?.modules && (
                        <div className="glass-card p-8">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-3">
                                <Eye size={24} className="text-primary" />
                                Modules visibles
                            </h3>
                            <p className="text-sm text-slate-500 mb-6">Activez ou désactivez les onglets que vous n&apos;utilisez pas. Les données restent intactes.</p>
                            <div className="space-y-2">
                                {([
                                    { key: 'stock_management', label: 'Gestion du stock', showFor: 'all' },
                                    { key: 'alerts', label: 'Alertes', showFor: 'all' },
                                    { key: 'history', label: 'Historique', showFor: 'all' },
                                    { key: 'statistics', label: 'Statistiques', showFor: 'all' },
                                    { key: 'rules', label: 'Règles', showFor: 'all' },
                                    { key: 'export', label: 'Exports', showFor: 'all' },
                                    { key: 'crm', label: 'CRM Clients', showFor: 'all' },
                                    { key: 'suppliers', label: 'Fournisseurs', showFor: 'all' },
                                    { key: 'orders', label: 'Commandes', showFor: 'all' },
                                    { key: 'accounting', label: 'Comptabilité', showFor: 'all' },
                                    { key: 'reservations', label: 'Réservations', showFor: 'restaurant' },
                                    { key: 'kitchen', label: 'Cuisine / KDS', showFor: 'restaurant' },
                                ] as { key: string; label: string; showFor: string }[])
                                .filter(m => m.showFor === 'all' || ['restaurant', 'traiteur'].includes(sector))
                                .map(({ key, label }) => {
                                    const enabled = settings.modules[key] !== false;
                                    return (
                                        <div key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                            <span className="text-slate-300 text-sm font-medium">{label}</span>
                                            <button
                                                onClick={async () => {
                                                    const newModules = { ...settings.modules, [key]: !enabled };
                                                    await handleUpdateSettings({ modules: newModules });
                                                    setSettings((s: any) => ({ ...s, modules: newModules }));
                                                }}
                                                className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-white/10'}`}
                                            >
                                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="glass-card p-8">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <Shield size={24} className="text-primary" />
                            Sécurité
                        </h3>
                        <div className="flex flex-col gap-3">
                            <button className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all group">
                                <span className="text-slate-300 group-hover:text-white">Mot de passe</span>
                                <ChevronRight size={18} className="text-slate-500" />
                            </button>
                            <button className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all group">
                                <span className="text-slate-300 group-hover:text-white">Sessions actives</span>
                                <ChevronRight size={18} className="text-slate-500" />
                            </button>
                        </div>
                    </div>

                    <div className="glass-card p-8 border-rose-500/20">
                        <h3 className="text-xl font-bold text-white mb-6">Zone de Danger</h3>
                        <button
                            onClick={() => {
                                authApi.logout();
                                window.location.reload();
                            }}
                            className="w-full flex items-center justify-center gap-3 p-4 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all font-bold"
                        >
                            <LogOut size={20} />
                            Déconnexion
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
