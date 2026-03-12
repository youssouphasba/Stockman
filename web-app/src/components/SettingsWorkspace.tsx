'use client';

import React, { useEffect, useState } from 'react';
import {
    Bell,
    ChevronRight,
    Eye,
    FileText,
    Globe,
    LogOut,
    Mail,
    MapPin,
    Monitor,
    Plus,
    Printer,
    Save,
    Settings as SettingsIcon,
    Shield,
    Store,
    Trash2,
    User,
} from 'lucide-react';
import { auth as authApi, locations as locationsApi, settings as settingsApi, stores as storesApi, userFeatures as userFeaturesApi } from '../services/api';
import type { NotificationContactMap, NotificationPreferences, User as AppUser } from '../services/api';
import ReminderRulesSettings, { ReminderRuleSettings } from './ReminderRulesSettings';
import { getAccessContext } from '../utils/access';

type SettingsWorkspaceProps = {
    user?: AppUser | null;
};

type TabId = 'account' | 'organization' | 'notifications' | 'documents' | 'stores' | 'security';

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
    { key: 'default', label: 'Destinataires par defaut', description: 'Utilises si aucun groupe plus precis n est cible.' },
    { key: 'stock', label: 'Stock', description: 'Ruptures, stock bas, surstock et produits dormants.' },
    { key: 'procurement', label: 'Approvisionnement', description: 'Retards fournisseurs, commandes et receptions.' },
    { key: 'finance', label: 'Finance', description: 'Depenses, ecarts et alertes de tresorerie.' },
    { key: 'crm', label: 'CRM', description: 'Relances clients et alertes commerciales.' },
    { key: 'operations', label: 'Operations', description: 'Anomalies transverses et alertes generales.' },
    { key: 'billing', label: 'Facturation', description: 'Abonnement, paiements et sujets contractuels.' },
];

const CURRENCIES = [
    { code: 'XOF', label: 'XOF - CFA BCEAO' },
    { code: 'XAF', label: 'XAF - CFA BEAC' },
    { code: 'EUR', label: 'EUR - Euro' },
    { code: 'USD', label: 'USD - Dollar US' },
    { code: 'GHS', label: 'GHS - Cedi' },
    { code: 'NGN', label: 'NGN - Naira' },
    { code: 'MAD', label: 'MAD - Dirham' },
    { code: 'TND', label: 'TND - Dinar' },
    { code: 'DZD', label: 'DZD - Dinar' },
    { code: 'EGP', label: 'EGP - Livre' },
    { code: 'KES', label: 'KES - Shilling' },
    { code: 'ZAR', label: 'ZAR - Rand' },
];

const MODULE_OPTIONS = [
    { key: 'stock_management', label: 'Gestion du stock', showFor: 'all' },
    { key: 'alerts', label: 'Alertes', showFor: 'all' },
    { key: 'history', label: 'Historique', showFor: 'all' },
    { key: 'statistics', label: 'Statistiques', showFor: 'all' },
    { key: 'rules', label: 'Regles', showFor: 'all' },
    { key: 'export', label: 'Exports', showFor: 'all' },
    { key: 'crm', label: 'CRM Clients', showFor: 'all' },
    { key: 'suppliers', label: 'Fournisseurs', showFor: 'all' },
    { key: 'orders', label: 'Commandes', showFor: 'all' },
    { key: 'accounting', label: 'Comptabilite', showFor: 'all' },
    { key: 'reservations', label: 'Reservations', showFor: 'restaurant' },
    { key: 'kitchen', label: 'Cuisine / KDS', showFor: 'restaurant' },
];

const TABS: { id: TabId; label: string; description: string }[] = [
    { id: 'account', label: 'Compte', description: 'Profil, langue et preferences personnelles.' },
    { id: 'organization', label: 'Organisation', description: 'Modules et regles globales du compte.' },
    { id: 'notifications', label: 'Notifications', description: 'Canaux personnels et emails d alerte.' },
    { id: 'documents', label: 'Documents', description: 'Recus, factures, taxes et terminaux.' },
    { id: 'stores', label: 'Boutiques', description: 'Emplacements et reglages par boutique.' },
    { id: 'security', label: 'Securite', description: 'Mot de passe et session courante.' },
];

const inputClass = 'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-primary/50';
const textareaClass = `${inputClass} resize-none`;
const selectClass = 'w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none focus:border-primary/50';

function ScopeBadge({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
            {label}
        </span>
    );
}

function SectionCard({
    icon,
    title,
    scope,
    description,
    actionHint,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    scope: string;
    description: string;
    actionHint: string;
    children: React.ReactNode;
}) {
    return (
        <section className="glass-card p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
                <div className="max-w-3xl">
                    <h3 className="flex items-center gap-3 text-xl font-black text-white">{icon}{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{actionHint}</p>
                </div>
                <ScopeBadge label={scope} />
            </div>
            <div className="space-y-6">{children}</div>
        </section>
    );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-white">{label}</label>
            <p className="text-xs leading-5 text-slate-500">{hint}</p>
            {children}
        </div>
    );
}

function Notice({ title, text }: { title: string; text: string }) {
    return (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <p className="text-sm font-black text-amber-300">{title}</p>
            <p className="mt-1 text-sm leading-6 text-amber-100/80">{text}</p>
        </div>
    );
}

export default function SettingsWorkspace({ user }: SettingsWorkspaceProps) {
    const access = getAccessContext(user);
    const canManageOrgSettings = access.isOrgAdmin;
    const canManageBilling = access.isBillingAdmin;

    const [activeTab, setActiveTab] = useState<TabId>('account');
    const [loading, setLoading] = useState(true);
    const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
    const [savingKey, setSavingKey] = useState('');

    const [settings, setSettings] = useState<any>(null);
    const [storeList, setStoreList] = useState<any[]>([]);
    const [editingStore, setEditingStore] = useState<any>(null);
    const [locations, setLocations] = useState<any[]>([]);
    const [sector, setSector] = useState('');

    const [profileName, setProfileName] = useState('');
    const [language, setLanguage] = useState('fr');
    const [currency, setCurrency] = useState('XOF');
    const [billingContactName, setBillingContactName] = useState('');
    const [billingContactEmail, setBillingContactEmail] = useState('');
    const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
    const [notificationContacts, setNotificationContacts] = useState<NotificationContactMap>(DEFAULT_NOTIFICATION_CONTACTS);
    const [storeNotificationContacts, setStoreNotificationContacts] = useState<NotificationContactMap>(DEFAULT_NOTIFICATION_CONTACTS);
    const [reminderRules, setReminderRules] = useState<ReminderRuleSettings>({} as ReminderRuleSettings);
    const [receiptName, setReceiptName] = useState('');
    const [receiptFooter, setReceiptFooter] = useState('');
    const [invoiceName, setInvoiceName] = useState('');
    const [invoiceAddress, setInvoiceAddress] = useState('');
    const [invoiceLabel, setInvoiceLabel] = useState('');
    const [invoicePrefix, setInvoicePrefix] = useState('');
    const [invoiceFooter, setInvoiceFooter] = useState('');
    const [invoicePaymentTerms, setInvoicePaymentTerms] = useState('');
    const [taxEnabled, setTaxEnabled] = useState(false);
    const [taxRate, setTaxRate] = useState(0);
    const [taxMode, setTaxMode] = useState<'ttc' | 'ht'>('ttc');
    const [terminals, setTerminals] = useState<string[]>([]);
    const [newTerminal, setNewTerminal] = useState('');
    const [modulesDraft, setModulesDraft] = useState<Record<string, boolean>>({});
    const [newLocName, setNewLocName] = useState('');
    const [newLocType, setNewLocType] = useState('shelf');
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

    const activeStore = storeList.find((store) => store.store_id === user?.active_store_id) || null;
    const visibleModules = MODULE_OPTIONS.filter((item) => item.showFor === 'all' || ['restaurant', 'traiteur'].includes(sector));

    useEffect(() => {
        void loadSettings();
    }, []);

    async function loadSettings() {
        setLoading(true);
        try {
            const [res, locs, storesRes, features] = await Promise.all([
                settingsApi.get(),
                locationsApi.list(),
                storesApi.list(),
                userFeaturesApi.get().catch(() => null),
            ]);

            setSettings(res);
            setProfileName(res?.user_name || user?.name || '');
            setLanguage(res?.language || 'fr');
            setCurrency(res?.currency || 'XOF');
            setBillingContactName(res?.billing_contact_name || '');
            setBillingContactEmail(res?.billing_contact_email || '');
            setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...(res?.notification_preferences || {}) });
            setNotificationContacts({ ...DEFAULT_NOTIFICATION_CONTACTS, ...(res?.notification_contacts || {}) });
            setStoreNotificationContacts({ ...DEFAULT_NOTIFICATION_CONTACTS, ...(res?.store_notification_contacts || {}) });
            setReminderRules((res?.reminder_rules || {}) as ReminderRuleSettings);
            setReceiptName(res?.receipt_business_name || '');
            setReceiptFooter(res?.receipt_footer || '');
            setInvoiceName(res?.invoice_business_name || '');
            setInvoiceAddress(res?.invoice_business_address || '');
            setInvoiceLabel(res?.invoice_label || 'Facture');
            setInvoicePrefix(res?.invoice_prefix || 'FAC');
            setInvoiceFooter(res?.invoice_footer || '');
            setInvoicePaymentTerms(res?.invoice_payment_terms || '');
            setTaxEnabled(Boolean(res?.tax_enabled));
            setTaxRate(Number(res?.tax_rate || 0));
            setTaxMode(res?.tax_mode || 'ttc');
            setTerminals(res?.terminals || []);
            setModulesDraft(res?.modules || {});
            setLocations(locs || []);
            setStoreList(storesRes || []);
            setSector(features?.sector || '');
        } catch (error: any) {
            setBanner({ tone: 'error', message: error?.message || 'Impossible de charger les parametres.' });
        } finally {
            setLoading(false);
        }
    }

    async function runSave(key: string, action: () => Promise<void>, successMessage: string) {
        setBanner(null);
        setSavingKey(key);
        try {
            await action();
            setBanner({ tone: 'success', message: successMessage });
        } catch (error: any) {
            setBanner({ tone: 'error', message: error?.message || 'Une erreur est survenue.' });
        } finally {
            setSavingKey('');
        }
    }

    function updateNotificationGroup(
        setter: React.Dispatch<React.SetStateAction<NotificationContactMap>>,
        key: keyof NotificationContactMap,
        value: string,
    ) {
        const emails = value.split(',').map((email) => email.trim()).filter(Boolean);
        setter((current) => ({ ...current, [key]: emails }));
    }

    function syncFromSettings(next: any) {
        setSettings(next);
    }

    if (loading && !settings) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="custom-scrollbar flex-1 overflow-y-auto bg-[#0F172A] p-8">
            <header className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl">
                    <h1 className="text-3xl font-black tracking-tight text-white">Parametres reorientes</h1>
                    <p className="mt-3 text-sm leading-7 text-slate-400">
                        Chaque bloc a maintenant un objectif clair, une explication simple et un bouton d action explicite.
                    </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-slate-300">
                    <p className="font-black text-white">Mode d emploi</p>
                    <p className="mt-2 leading-6 text-slate-400">
                        Vous modifiez un bloc, puis vous enregistrez ce bloc uniquement. Plus de faux boutons ni de champs sans validation visible.
                    </p>
                </div>
            </header>

            {banner ? (
                <div className={`mb-8 rounded-2xl border px-4 py-3 text-sm ${
                    banner.tone === 'success'
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                        : 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                }`}>
                    {banner.message}
                </div>
            ) : null}

            <div className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Compte personnel</p>
                    <h2 className="mt-2 text-lg font-black text-white">{user?.name || settings?.user_name || 'Utilisateur'}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-400">Profil, langue, devise et notifications personnelles.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Organisation</p>
                    <h2 className="mt-2 text-lg font-black text-white">{canManageOrgSettings ? 'Edition disponible' : 'Lecture seule'}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-400">Modules, documents et alertes partages du compte.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Boutique active</p>
                    <h2 className="mt-2 text-lg font-black text-white">{activeStore?.name || 'Aucune boutique active'}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-400">Les reglages boutique s appliquent ici.</p>
                </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`rounded-3xl border p-4 text-left transition-all ${
                            activeTab === tab.id
                                ? 'border-primary/40 bg-primary/10'
                                : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                        }`}
                    >
                        <p className={`text-sm font-black uppercase tracking-[0.16em] ${activeTab === tab.id ? 'text-primary' : 'text-slate-400'}`}>{tab.label}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{tab.description}</p>
                    </button>
                ))}
            </div>

            <div className="max-w-6xl space-y-8">
                {activeTab === 'account' ? (
                    <>
                        <SectionCard
                            icon={<User size={24} className="text-primary" />}
                            title="Profil personnel"
                            scope="User"
                            description="Ces informations servent a vous identifier dans l application. Elles ne changent pas les regles globales du compte."
                            actionHint="Le bouton ci-dessous met a jour uniquement votre profil."
                        >
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <Field label="Nom complet" hint="Visible dans votre profil et les journaux d activite.">
                                    <input
                                        type="text"
                                        value={profileName}
                                        onChange={(event) => setProfileName(event.target.value)}
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Email de connexion" hint="Cet email est informatif ici. Il ne se modifie pas depuis cet ecran.">
                                    <input
                                        type="email"
                                        value={settings?.email || user?.email || ''}
                                        disabled
                                        className={`${inputClass} cursor-not-allowed text-slate-500`}
                                    />
                                </Field>
                            </div>
                            <button
                                type="button"
                                onClick={() => void runSave('profile', async () => {
                                    await authApi.updateProfile({ name: profileName.trim() });
                                    setSettings((current: any) => ({ ...current, user_name: profileName.trim() }));
                                }, 'Votre profil a ete mis a jour.')}
                                disabled={savingKey === 'profile'}
                                className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {savingKey === 'profile' ? 'Enregistrement...' : 'Mettre a jour mon profil'}
                            </button>
                        </SectionCard>

                        <SectionCard
                            icon={<Globe size={24} className="text-primary" />}
                            title="Langue et devise"
                            scope="User"
                            description="La langue change l interface. La devise sert aux rapports et tableaux de bord. Le bloc entier se valide avec un seul bouton clair."
                            actionHint="Le bouton ci-dessous enregistre uniquement la langue et la devise."
                        >
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <Field label="Langue du tableau de bord" hint="Change les textes et libelles de l interface web.">
                                    <select value={language} onChange={(event) => setLanguage(event.target.value)} className={selectClass}>
                                        <option value="fr">Francais</option>
                                        <option value="en">English</option>
                                        <option value="wo">Wolof</option>
                                    </select>
                                </Field>
                                <Field label="Devise principale" hint="Utilisee comme reference dans les tableaux financiers.">
                                    <select value={currency} onChange={(event) => setCurrency(event.target.value)} className={selectClass}>
                                        {CURRENCIES.map((currencyOption) => (
                                            <option key={currencyOption.code} value={currencyOption.code}>{currencyOption.label}</option>
                                        ))}
                                    </select>
                                </Field>
                            </div>
                            <button
                                type="button"
                                onClick={() => void runSave('regional', async () => {
                                    const updated = await settingsApi.update({ language });
                                    syncFromSettings(updated);
                                    await authApi.updateProfile({ currency });
                                    setSettings((current: any) => ({ ...current, currency }));
                                    localStorage.setItem('user_currency', currency);
                                }, 'Langue et devise enregistrees.')}
                                disabled={savingKey === 'regional'}
                                className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {savingKey === 'regional' ? 'Enregistrement...' : 'Enregistrer langue et devise'}
                            </button>
                        </SectionCard>

                        {canManageBilling ? (
                            <SectionCard
                                icon={<Mail size={24} className="text-primary" />}
                                title="Contact de facturation"
                                scope="Compte"
                                description="Ce contact est utilise pour l abonnement, les paiements et les sujets contractuels. Il ne se confond plus avec les autres emails de la page."
                                actionHint="Le bouton ci-dessous met a jour uniquement le contact de facturation."
                            >
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <Field label="Nom du contact" hint="Personne ou equipe a joindre pour l abonnement.">
                                        <input
                                            type="text"
                                            value={billingContactName}
                                            onChange={(event) => setBillingContactName(event.target.value)}
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field label="Email de facturation" hint="Adresse recevant les infos de paiement et de contrat.">
                                        <input
                                            type="email"
                                            value={billingContactEmail}
                                            onChange={(event) => setBillingContactEmail(event.target.value)}
                                            className={inputClass}
                                        />
                                    </Field>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void runSave('billing', async () => {
                                        const updated = await settingsApi.update({
                                            billing_contact_name: billingContactName,
                                            billing_contact_email: billingContactEmail,
                                        });
                                        syncFromSettings(updated);
                                    }, 'Le contact de facturation a ete mis a jour.')}
                                    disabled={savingKey === 'billing'}
                                    className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {savingKey === 'billing' ? 'Enregistrement...' : 'Mettre a jour la facturation'}
                                </button>
                            </SectionCard>
                        ) : (
                            <Notice
                                title="Facturation geree par votre organisation"
                                text="Seul un responsable facturation peut modifier ce bloc."
                            />
                        )}
                    </>
                ) : null}

                {activeTab === 'documents' && canManageOrgSettings ? (
                    <SectionCard
                        icon={<SettingsIcon size={24} className="text-primary" />}
                        title="Taxes et terminaux"
                        scope="Boutique"
                        description="Reglez ici si la TVA est active, son taux, le mode TTC/HT et la liste des caisses utilisables."
                        actionHint="Chaque sous-bloc ci-dessous a son propre bouton de validation."
                    >
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-black text-white">Activer la taxe / TVA</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">Active le calcul de taxe sur les ventes de la boutique active.</p>
                                </div>
                                <button type="button" onClick={() => setTaxEnabled((current) => !current)} className={`relative h-6 w-11 rounded-full transition-colors ${taxEnabled ? 'bg-primary' : 'bg-white/10'}`}>
                                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${taxEnabled ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>
                            <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
                                <Field label="Taux" hint="Pourcentage applique si la taxe est active.">
                                    <input type="number" min="0" max="30" step="0.5" value={taxRate} onChange={(event) => setTaxRate(parseFloat(event.target.value) || 0)} className={inputClass} />
                                </Field>
                                <Field label="Mode de saisie" hint="TTC = prix taxes incluses, HT = hors taxe.">
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['ttc', 'ht'] as const).map((mode) => (
                                            <button key={mode} type="button" onClick={() => setTaxMode(mode)} className={`rounded-2xl border px-4 py-3 text-sm font-black uppercase tracking-[0.16em] transition-all ${taxMode === mode ? 'border-primary/40 bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                </Field>
                            </div>
                            <button
                                type="button"
                                onClick={() => void runSave('taxes', async () => {
                                    const updated = await settingsApi.update({ tax_enabled: taxEnabled, tax_rate: taxRate, tax_mode: taxMode });
                                    syncFromSettings(updated);
                                }, 'La configuration de taxe a ete enregistree.')}
                                disabled={savingKey === 'taxes'}
                                className="btn-primary mt-6 inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {savingKey === 'taxes' ? 'Enregistrement...' : 'Enregistrer la taxe'}
                            </button>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <p className="text-sm font-black text-white">Caisses / terminaux</p>
                            <p className="mt-2 text-xs leading-5 text-slate-500">La liste est modifiee ici puis enregistree en un seul clic.</p>
                            <div className="mt-4 space-y-3">
                                {terminals.map((terminal, index) => (
                                    <div key={`${terminal}-${index}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0F172A]/60 px-4 py-3">
                                        <span className="text-sm text-white">{terminal}</span>
                                        <button type="button" onClick={() => setTerminals((current) => current.filter((_, currentIndex) => currentIndex !== index))} className="text-slate-500 transition-colors hover:text-rose-400">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex flex-col gap-3 md:flex-row">
                                <input type="text" value={newTerminal} onChange={(event) => setNewTerminal(event.target.value)} className={inputClass} placeholder="Ex: Caisse 1" />
                                <button type="button" onClick={() => {
                                    if (!newTerminal.trim()) return;
                                    setTerminals((current) => [...current, newTerminal.trim()]);
                                    setNewTerminal('');
                                }} className="inline-flex items-center justify-center rounded-2xl bg-white/10 px-4 py-3 text-white transition-colors hover:bg-white/15">
                                    <Plus size={18} />
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => void runSave('terminals', async () => {
                                    const updated = await settingsApi.update({ terminals });
                                    syncFromSettings(updated);
                                }, 'Les terminaux ont ete enregistres.')}
                                disabled={savingKey === 'terminals'}
                                className="btn-primary mt-6 inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {savingKey === 'terminals' ? 'Enregistrement...' : 'Enregistrer les terminaux'}
                            </button>
                        </div>
                    </SectionCard>
                ) : null}

                {activeTab === 'stores' ? (
                    <>
                        <SectionCard
                            icon={<MapPin size={24} className="text-primary" />}
                            title="Emplacements du stock"
                            scope="Stock"
                            description="Organisez vos rayons, entrepots et zones de reception. Chaque ajout ou suppression est une action directe."
                            actionHint="Les boutons ci-dessous ajoutent ou suppriment immediatement un emplacement."
                        >
                            <div className="space-y-3">
                                {locations.map((location) => (
                                    <div key={location.location_id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-white">{location.name}</span>
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                                                {location.type === 'shelf' ? 'Rayon' : location.type === 'warehouse' ? 'Entrepot' : 'Reception'}
                                            </span>
                                        </div>
                                        <button type="button" onClick={() => void runSave('delete-location', async () => {
                                            await locationsApi.delete(location.location_id);
                                            setLocations((current) => current.filter((item) => item.location_id !== location.location_id));
                                        }, 'L emplacement a ete supprime.')} className="text-slate-500 transition-colors hover:text-rose-400">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr,220px,auto]">
                                <input type="text" value={newLocName} onChange={(event) => setNewLocName(event.target.value)} className={inputClass} placeholder="Ex: Rayon A, Entrepot Nord" />
                                <select value={newLocType} onChange={(event) => setNewLocType(event.target.value)} className={selectClass}>
                                    <option value="shelf">Rayon</option>
                                    <option value="warehouse">Entrepot</option>
                                    <option value="dock">Reception</option>
                                </select>
                                <button type="button" onClick={() => void runSave('location', async () => {
                                    const location = await locationsApi.create({ name: newLocName.trim(), type: newLocType });
                                    setLocations((current) => [...current, location]);
                                    setNewLocName('');
                                }, 'Le nouvel emplacement a ete ajoute.')} className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-3 text-white transition-colors hover:bg-primary/90">
                                    <Plus size={18} />
                                </button>
                            </div>
                        </SectionCard>

                        {canManageOrgSettings && storeList.length ? (
                            <SectionCard
                                icon={<Store size={24} className="text-primary" />}
                                title="Fiche de boutique"
                                scope="Boutique"
                                description="Modifiez ici le nom et l adresse d une boutique. Les recus, factures, taxes et terminaux restent centralises dans l onglet Documents."
                                actionHint="Chaque boutique a son propre bouton de sauvegarde."
                            >
                                <div className="space-y-3">
                                    {storeList.map((store) => (
                                        <div key={store.store_id} className="overflow-hidden rounded-2xl border border-white/10">
                                            <button
                                                type="button"
                                                onClick={() => setEditingStore(editingStore?.store_id === store.store_id ? null : { ...store })}
                                                className="flex w-full items-center justify-between bg-white/5 px-5 py-4 text-left transition-colors hover:bg-white/10"
                                            >
                                                <div>
                                                    <p className="text-sm font-black text-white">{store.name}</p>
                                                    <p className="mt-1 text-xs text-slate-500">{store.address || 'Aucune adresse definie'}</p>
                                                </div>
                                                <ChevronRight size={18} className={`text-slate-500 transition-transform ${editingStore?.store_id === store.store_id ? 'rotate-90' : ''}`} />
                                            </button>
                                            {editingStore?.store_id === store.store_id ? (
                                                <div className="space-y-4 border-t border-white/10 bg-white/[0.03] px-5 py-5">
                                                    <Field label="Nom de la boutique" hint="Nom visible dans les listes et documents de cette boutique.">
                                                        <input type="text" value={editingStore.name || ''} onChange={(event) => setEditingStore((current: any) => ({ ...current, name: event.target.value }))} className={inputClass} />
                                                    </Field>
                                                    <Field label="Adresse" hint="Adresse ou repere terrain de cette boutique.">
                                                        <input type="text" value={editingStore.address || ''} onChange={(event) => setEditingStore((current: any) => ({ ...current, address: event.target.value }))} className={inputClass} />
                                                    </Field>
                                                    <button
                                                        type="button"
                                                        onClick={() => void runSave('store-editor', async () => {
                                                            const updated = await storesApi.update(store.store_id, { name: editingStore.name, address: editingStore.address });
                                                            setStoreList((current) => current.map((item) => item.store_id === store.store_id ? { ...item, ...updated } : item));
                                                            setEditingStore(null);
                                                        }, 'La boutique a ete mise a jour.')}
                                                        disabled={savingKey === 'store-editor'}
                                                        className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                                                    >
                                                        <Save size={18} />
                                                        {savingKey === 'store-editor' ? 'Enregistrement...' : 'Sauvegarder cette boutique'}
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </SectionCard>
                        ) : null}
                    </>
                ) : null}

                {activeTab === 'documents' ? (
                    canManageOrgSettings ? (
                        <>
                            <SectionCard
                                icon={<Printer size={24} className="text-primary" />}
                                title="Recu par defaut"
                                scope="Boutique"
                                description="Personnalisez le nom qui apparait sur le recu et le message de bas de ticket. Ce bloc ne touche pas au modele de facture."
                                actionHint="Le bouton ci-dessous enregistre uniquement le recu."
                            >
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <Field label="Nom de l etablissement" hint="Nom affiche en haut du recu pour la boutique active.">
                                        <input type="text" value={receiptName} onChange={(event) => setReceiptName(event.target.value)} className={inputClass} />
                                    </Field>
                                    <Field label="Message de bas de recu" hint="Texte affiche en fin de ticket.">
                                        <input type="text" value={receiptFooter} onChange={(event) => setReceiptFooter(event.target.value)} className={inputClass} />
                                    </Field>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void runSave('receipt', async () => {
                                        const updated = await settingsApi.update({ receipt_business_name: receiptName, receipt_footer: receiptFooter });
                                        syncFromSettings(updated);
                                    }, 'Le recu par defaut a ete mis a jour.')}
                                    disabled={savingKey === 'receipt'}
                                    className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {savingKey === 'receipt' ? 'Enregistrement...' : 'Enregistrer le recu'}
                                </button>
                            </SectionCard>

                            <SectionCard
                                icon={<FileText size={24} className="text-primary" />}
                                title="Facture par defaut"
                                scope="Boutique"
                                description="Rassemblez ici tout ce qui concerne vos factures: nom, prefixe, adresse et pied de document."
                                actionHint="Le bouton ci-dessous enregistre uniquement le modele de facture."
                            >
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <Field label="Nom sur la facture" hint="Nom affiche dans l entete des factures.">
                                        <input type="text" value={invoiceName} onChange={(event) => setInvoiceName(event.target.value)} className={inputClass} />
                                    </Field>
                                    <Field label="Libelle du document" hint="Ex: Facture, Proforma ou Bon de livraison.">
                                        <input type="text" value={invoiceLabel} onChange={(event) => setInvoiceLabel(event.target.value)} className={inputClass} />
                                    </Field>
                                    <Field label="Prefixe" hint="Prefixe numerique utilise avant le numero de facture.">
                                        <input type="text" value={invoicePrefix} onChange={(event) => setInvoicePrefix(event.target.value)} className={inputClass} />
                                    </Field>
                                    <Field label="Conditions de paiement" hint="Ex: Paiement a reception ou sous 15 jours.">
                                        <input type="text" value={invoicePaymentTerms} onChange={(event) => setInvoicePaymentTerms(event.target.value)} className={inputClass} />
                                    </Field>
                                    <Field label="Adresse de facturation" hint="Adresse affichee sur les factures.">
                                        <input type="text" value={invoiceAddress} onChange={(event) => setInvoiceAddress(event.target.value)} className={inputClass} />
                                    </Field>
                                    <Field label="Pied de facture" hint="Message de fin de document.">
                                        <input type="text" value={invoiceFooter} onChange={(event) => setInvoiceFooter(event.target.value)} className={inputClass} />
                                    </Field>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void runSave('invoice', async () => {
                                        const updated = await settingsApi.update({
                                            invoice_business_name: invoiceName,
                                            invoice_business_address: invoiceAddress,
                                            invoice_label: invoiceLabel,
                                            invoice_prefix: invoicePrefix,
                                            invoice_footer: invoiceFooter,
                                            invoice_payment_terms: invoicePaymentTerms,
                                        });
                                        syncFromSettings(updated);
                                    }, 'Le modele de facture a ete mis a jour.')}
                                    disabled={savingKey === 'invoice'}
                                    className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {savingKey === 'invoice' ? 'Enregistrement...' : 'Enregistrer la facture'}
                                </button>
                            </SectionCard>
                        </>
                    ) : (
                        <Notice
                            title="Documents reserves aux administrateurs"
                            text="Les recus et factures par defaut restent geres par les administrateurs operationnels."
                        />
                    )
                ) : null}

                {activeTab === 'notifications' && canManageOrgSettings ? (
                    <>
                        <SectionCard
                            icon={<Mail size={24} className="text-primary" />}
                            title="Destinataires de l organisation"
                            scope="Compte"
                            description="Indiquez qui recoit les alertes par sujet. Utilisez plusieurs adresses separees par des virgules si besoin."
                            actionHint="Le bouton ci-dessous enregistre uniquement les emails de l organisation."
                        >
                            <div className="grid grid-cols-1 gap-5">
                                {NOTIFICATION_CONTACT_FIELDS.map((field) => (
                                    <Field key={field.key} label={field.label} hint={field.description}>
                                        <textarea
                                            rows={2}
                                            value={(notificationContacts[field.key] || []).join(', ')}
                                            onChange={(event) => updateNotificationGroup(setNotificationContacts, field.key, event.target.value)}
                                            className={textareaClass}
                                            placeholder="ex: responsable@entreprise.com, stock@entreprise.com"
                                        />
                                    </Field>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => void runSave('org-notifications', async () => {
                                    const updated = await settingsApi.update({ notification_contacts: notificationContacts });
                                    syncFromSettings(updated);
                                }, 'Les destinataires de l organisation ont ete enregistres.')}
                                disabled={savingKey === 'org-notifications'}
                                className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {savingKey === 'org-notifications' ? 'Enregistrement...' : 'Enregistrer les destinataires'}
                            </button>
                        </SectionCard>

                        {activeStore ? (
                            <SectionCard
                                icon={<Store size={24} className="text-primary" />}
                                title={`Emails de la boutique active: ${activeStore.name}`}
                                scope="Boutique"
                                description="Ces emails se declenchent pour la boutique active en plus des destinataires globaux du compte."
                                actionHint="Le bouton ci-dessous enregistre uniquement les emails de la boutique active."
                            >
                                <div className="grid grid-cols-1 gap-5">
                                    {NOTIFICATION_CONTACT_FIELDS.map((field) => (
                                        <Field key={field.key} label={field.label} hint={field.description}>
                                            <textarea
                                                rows={2}
                                                value={(storeNotificationContacts[field.key] || []).join(', ')}
                                                onChange={(event) => updateNotificationGroup(setStoreNotificationContacts, field.key, event.target.value)}
                                                className={textareaClass}
                                                placeholder="ex: boutique-plateau@entreprise.com"
                                            />
                                        </Field>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void runSave('store-notifications', async () => {
                                        const updated = await settingsApi.update({ store_notification_contacts: storeNotificationContacts });
                                        syncFromSettings(updated);
                                    }, 'Les destinataires de la boutique active ont ete enregistres.')}
                                    disabled={savingKey === 'store-notifications'}
                                    className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {savingKey === 'store-notifications' ? 'Enregistrement...' : 'Enregistrer la boutique active'}
                                </button>
                            </SectionCard>
                        ) : null}
                    </>
                ) : null}

                {activeTab === 'organization' ? (
                    canManageOrgSettings ? (
                        <>
                            <SectionCard
                                icon={<Eye size={24} className="text-primary" />}
                                title="Modules visibles"
                                scope="Compte"
                                description="Masquez les modules inutiles sans supprimer les donnees. Ici, rien n est applique tant que vous n enregistrez pas le bloc."
                                actionHint="Le bouton ci-dessous applique uniquement la visibilite des modules."
                            >
                                <div className="space-y-3">
                                    {visibleModules.map((module) => {
                                        const enabled = modulesDraft[module.key] !== false;
                                        return (
                                            <div key={module.key} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                                <span className="text-sm font-medium text-slate-200">{module.label}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setModulesDraft((current) => ({ ...current, [module.key]: !enabled }))}
                                                    className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-white/10'}`}
                                                >
                                                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'left-6' : 'left-1'}`} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void runSave('modules', async () => {
                                        const updated = await settingsApi.update({ modules: modulesDraft });
                                        syncFromSettings(updated);
                                    }, 'La visibilite des modules a ete mise a jour.')}
                                    disabled={savingKey === 'modules'}
                                    className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {savingKey === 'modules' ? 'Enregistrement...' : 'Enregistrer les modules visibles'}
                                </button>
                            </SectionCard>

                            <SectionCard
                                icon={<Bell size={24} className="text-primary" />}
                                title="Rappels intelligents"
                                scope="Compte"
                                description="Definissez les seuils avant qu une alerte ne remonte. Les modifications restent locales jusqu au bouton d enregistrement."
                                actionHint="Le bouton ci-dessous enregistre uniquement les rappels intelligents."
                            >
                                <ReminderRulesSettings
                                    rules={reminderRules}
                                    onUpdate={setReminderRules}
                                />
                                <button
                                    type="button"
                                    onClick={() => void runSave('reminders', async () => {
                                        const updated = await settingsApi.update({ reminder_rules: reminderRules });
                                        syncFromSettings(updated);
                                    }, 'Les rappels intelligents ont ete mis a jour.')}
                                    disabled={savingKey === 'reminders'}
                                    className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {savingKey === 'reminders' ? 'Enregistrement...' : 'Enregistrer les rappels'}
                                </button>
                            </SectionCard>
                        </>
                    ) : (
                        <Notice
                            title="Organisation en lecture seule"
                            text="Les modules partages et les rappels intelligents sont reserves aux administrateurs operationnels."
                        />
                    )
                ) : null}

                {activeTab === 'notifications' ? (
                    <>
                        <SectionCard
                            icon={<Bell size={24} className="text-primary" />}
                            title="Mes notifications"
                            scope="User"
                            description="Choisissez vos canaux personnels. Le bouton a la fin du bloc enregistre tout d un coup."
                            actionHint="Le bouton ci-dessous enregistre uniquement vos canaux personnels."
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                {([
                                    { key: 'in_app', label: 'In-app', desc: 'Toujours visible dans le centre de notifications.' },
                                    { key: 'push', label: 'Push mobile', desc: 'Pour les alertes qui doivent vous faire reagir vite.' },
                                    { key: 'email', label: 'Email perso', desc: 'Pour recevoir aussi un recap dans votre boite.' },
                                ] as const).map((item) => {
                                    const enabled = notificationPreferences[item.key];
                                    return (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => setNotificationPreferences((current) => ({ ...current, [item.key]: !enabled }))}
                                            className={`rounded-2xl border p-4 text-left transition-all ${enabled ? 'border-primary/40 bg-primary/10 text-white' : 'border-white/10 bg-white/5 text-slate-300'}`}
                                        >
                                            <p className="text-sm font-black uppercase tracking-[0.16em]">{item.label}</p>
                                            <p className="mt-2 text-xs leading-5 text-slate-400">{item.desc}</p>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <Field label="Severite minimum pour push" hint="A partir de quel niveau vous voulez etre sollicite sur mobile.">
                                    <select
                                        value={notificationPreferences.minimum_severity_for_push}
                                        onChange={(event) => setNotificationPreferences((current) => ({ ...current, minimum_severity_for_push: event.target.value as NotificationPreferences['minimum_severity_for_push'] }))}
                                        className={selectClass}
                                    >
                                        <option value="info">Information</option>
                                        <option value="warning">Attention</option>
                                        <option value="critical">Critique</option>
                                    </select>
                                </Field>
                                <Field label="Severite minimum pour email" hint="A partir de quel niveau vous voulez aussi un email.">
                                    <select
                                        value={notificationPreferences.minimum_severity_for_email}
                                        onChange={(event) => setNotificationPreferences((current) => ({ ...current, minimum_severity_for_email: event.target.value as NotificationPreferences['minimum_severity_for_email'] }))}
                                        className={selectClass}
                                    >
                                        <option value="info">Information</option>
                                        <option value="warning">Attention</option>
                                        <option value="critical">Critique</option>
                                    </select>
                                </Field>
                            </div>
                            <button
                                type="button"
                                onClick={() => void runSave('personal-notifications', async () => {
                                    const updated = await settingsApi.update({
                                        push_notifications: notificationPreferences.push,
                                        notification_preferences: notificationPreferences,
                                    });
                                    syncFromSettings(updated);
                                }, 'Vos preferences de notification ont ete enregistrees.')}
                                disabled={savingKey === 'personal-notifications'}
                                className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {savingKey === 'personal-notifications' ? 'Enregistrement...' : 'Enregistrer mes notifications'}
                            </button>
                        </SectionCard>
                    </>
                ) : null}

                {activeTab === 'security' ? (
                    <>
                        <SectionCard
                            icon={<Shield size={24} className="text-primary" />}
                            title="Changer mon mot de passe"
                            scope="User"
                            description="Cette section remplace les anciens boutons vides. L action est bien branchee: vous saisissez votre mot de passe actuel, le nouveau, puis vous validez."
                            actionHint="Le bouton ci-dessous modifie uniquement votre mot de passe."
                        >
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                <Field label="Mot de passe actuel" hint="Necessaire pour confirmer l operation.">
                                    <input type="password" value={passwordForm.oldPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, oldPassword: event.target.value }))} className={inputClass} />
                                </Field>
                                <Field label="Nouveau mot de passe" hint="Au moins 8 caracteres.">
                                    <input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} className={inputClass} />
                                </Field>
                                <Field label="Confirmation" hint="Doit correspondre exactement au nouveau mot de passe.">
                                    <input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} className={inputClass} />
                                </Field>
                            </div>
                            <button
                                type="button"
                                onClick={() => void runSave('password', async () => {
                                    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                                        throw new Error('La confirmation ne correspond pas au nouveau mot de passe.');
                                    }
                                    await authApi.changePassword({ old_password: passwordForm.oldPassword, new_password: passwordForm.newPassword });
                                    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                                }, 'Votre mot de passe a ete modifie.')}
                                disabled={savingKey === 'password'}
                                className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {savingKey === 'password' ? 'Enregistrement...' : 'Modifier mon mot de passe'}
                            </button>
                        </SectionCard>

                        <SectionCard
                            icon={<LogOut size={24} className="text-rose-400" />}
                            title="Deconnexion"
                            scope="User"
                            description="Utilisez cette action si vous quittez le poste ou voulez repartir sur une session propre."
                            actionHint="Le bouton ci-dessous ferme uniquement votre session sur ce navigateur."
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    authApi.logout();
                                    window.location.reload();
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl bg-rose-500/10 px-6 py-3 font-bold text-rose-300 transition-colors hover:bg-rose-500 hover:text-white"
                            >
                                <LogOut size={18} />
                                Se deconnecter
                            </button>
                        </SectionCard>
                    </>
                ) : null}
            </div>
        </div>
    );
}
