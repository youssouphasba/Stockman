'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Bell,
    ChevronRight,
    Eye,
    FileText,
    Globe,
    LogOut,
    Mail,
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
import { auth as authApi, settings as settingsApi, stores as storesApi, userFeatures as userFeaturesApi } from '../services/api';
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

const NOTIFICATION_CONTACT_FIELDS: { key: keyof NotificationContactMap }[] = [
    { key: 'default' },
    { key: 'stock' },
    { key: 'procurement' },
    { key: 'finance' },
    { key: 'crm' },
    { key: 'operations' },
    { key: 'billing' },
];

const CURRENCIES = [
    { code: 'XOF' },
    { code: 'XAF' },
    { code: 'EUR' },
    { code: 'USD' },
    { code: 'GHS' },
    { code: 'NGN' },
    { code: 'MAD' },
    { code: 'TND' },
    { code: 'DZD' },
    { code: 'EGP' },
    { code: 'KES' },
    { code: 'ZAR' },
];

const MODULE_OPTIONS = [
    { key: 'stock_management', showFor: 'all' },
    { key: 'alerts', showFor: 'all' },
    { key: 'history', showFor: 'all' },
    { key: 'statistics', showFor: 'all' },
    { key: 'rules', showFor: 'all' },
    { key: 'export', showFor: 'all' },
    { key: 'crm', showFor: 'all' },
    { key: 'suppliers', showFor: 'all' },
    { key: 'orders', showFor: 'all' },
    { key: 'accounting', showFor: 'all' },
    { key: 'reservations', showFor: 'restaurant' },
    { key: 'kitchen', showFor: 'restaurant' },
];

const TABS: { id: TabId }[] = [
    { id: 'account' },
    { id: 'organization' },
    { id: 'notifications' },
    { id: 'documents' },
    { id: 'stores' },
    { id: 'security' },
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
    const { t } = useTranslation();
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
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [deletePassword, setDeletePassword] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);

    const notificationContactFields = NOTIFICATION_CONTACT_FIELDS.map((field) => ({
        ...field,
        label: t(`settings_workspace.notification_groups.${field.key}.label`),
        description: t(`settings_workspace.notification_groups.${field.key}.description`),
    }));
    const currencies = CURRENCIES.map((currencyOption) => ({
        ...currencyOption,
        label: t(`settings_workspace.currencies.${currencyOption.code}`),
    }));
    const tabs = TABS.map((tab) => ({
        ...tab,
        label: t(`settings_workspace.tabs.${tab.id}.label`),
        description: t(`settings_workspace.tabs.${tab.id}.description`),
    }));
    const notificationChannelOptions = [
        {
            key: 'in_app',
            label: t('settings_workspace.notifications.personal.channels.in_app.label'),
            desc: t('settings_workspace.notifications.personal.channels.in_app.description'),
        },
        {
            key: 'push',
            label: t('settings_workspace.notifications.personal.channels.push.label'),
            desc: t('settings_workspace.notifications.personal.channels.push.description'),
        },
        {
            key: 'email',
            label: t('settings_workspace.notifications.personal.channels.email.label'),
            desc: t('settings_workspace.notifications.personal.channels.email.description'),
        },
    ] as const;
    const activeStore = storeList.find((store) => store.store_id === user?.active_store_id) || null;
    const visibleModules = MODULE_OPTIONS.filter((item) => item.showFor === 'all' || ['restaurant', 'traiteur'].includes(sector));

    useEffect(() => {
        void loadSettings();
    }, []);

    async function loadSettings() {
        setLoading(true);
        try {
            const [res, storesRes, features] = await Promise.all([
                settingsApi.get(),
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
            setInvoiceLabel(res?.invoice_label || t('settings_workspace.documents.invoice.document_default'));
            setInvoicePrefix(res?.invoice_prefix || 'FAC');
            setInvoiceFooter(res?.invoice_footer || '');
            setInvoicePaymentTerms(res?.invoice_payment_terms || '');
            setTaxEnabled(Boolean(res?.tax_enabled));
            setTaxRate(Number(res?.tax_rate || 0));
            setTaxMode(res?.tax_mode || 'ttc');
            setTerminals(res?.terminals || []);
            setModulesDraft(res?.modules || {});
            setStoreList(storesRes || []);
            setSector(features?.sector || '');
        } catch (error: any) {
            setBanner({ tone: 'error', message: error?.message || t('settings_workspace.feedback.load_error') });
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
            setBanner({ tone: 'error', message: error?.message || t('settings_workspace.feedback.generic_error') });
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
                    <h1 className="text-3xl font-black tracking-tight text-white">{t('settings_workspace.header.title')}</h1>
                    <p className="mt-3 text-sm leading-7 text-slate-400">
                        {t('settings_workspace.header.subtitle')}
                    </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-slate-300">
                    <p className="font-black text-white">{t('settings_workspace.header.guide_title')}</p>
                    <p className="mt-2 leading-6 text-slate-400">
                        {t('settings_workspace.header.guide_body')}
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
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{t('settings_workspace.summary.account.label')}</p>
                    <h2 className="mt-2 text-lg font-black text-white">{user?.name || settings?.user_name || t('settings_workspace.summary.account.empty_name')}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{t('settings_workspace.summary.account.description')}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{t('settings_workspace.summary.organization.label')}</p>
                    <h2 className="mt-2 text-lg font-black text-white">
                        {canManageOrgSettings
                            ? t('settings_workspace.summary.organization.editable')
                            : t('settings_workspace.summary.organization.read_only')}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{t('settings_workspace.summary.organization.description')}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{t('settings_workspace.summary.store.label')}</p>
                    <h2 className="mt-2 text-lg font-black text-white">{activeStore?.name || t('settings_workspace.summary.store.empty')}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{t('settings_workspace.summary.store.description')}</p>
                </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                {tabs.map((tab) => (
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
                            title={t('settings_workspace.account.profile.title')}
                            scope={t('settings_workspace.scopes.user')}
                            description={t('settings_workspace.account.profile.description')}
                            actionHint={t('settings_workspace.account.profile.action_hint')}
                        >
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <Field label={t('settings_workspace.account.profile.full_name_label')} hint={t('settings_workspace.account.profile.full_name_hint')}>
                                    <input
                                        type="text"
                                        value={profileName}
                                        onChange={(event) => setProfileName(event.target.value)}
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label={t('settings_workspace.account.profile.login_email_label')} hint={t('settings_workspace.account.profile.login_email_hint')}>
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
                                }, t('settings_workspace.feedback.profile_saved'))}
                                disabled={savingKey === 'profile'}
                                className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {savingKey === 'profile' ? t('settings_workspace.actions.saving') : t('settings_workspace.account.profile.submit')}
                            </button>
                        </SectionCard>

                        <SectionCard
                            icon={<Globe size={24} className="text-primary" />}
                            title={t('settings_workspace.account.regional.title')}
                            scope={t('settings_workspace.scopes.user')}
                            description={t('settings_workspace.account.regional.description')}
                            actionHint={t('settings_workspace.account.regional.action_hint')}
                        >
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <Field label={t('settings_workspace.account.regional.language_label')} hint={t('settings_workspace.account.regional.language_hint')}>
                                    <select value={language} onChange={(event) => setLanguage(event.target.value)} className={selectClass}>
                                        <option value="fr">{t('settings_workspace.languages.fr')}</option>
                                        <option value="en">{t('settings_workspace.languages.en')}</option>
                                        <option value="wo">{t('settings_workspace.languages.wo')}</option>
                                    </select>
                                </Field>
                                <Field label={t('settings_workspace.account.regional.currency_label')} hint={t('settings_workspace.account.regional.currency_hint')}>
                                    <select value={currency} onChange={(event) => setCurrency(event.target.value)} className={selectClass}>
                                        {currencies.map((currencyOption) => (
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
                                }, t('settings_workspace.feedback.regional_saved'))}
                                disabled={savingKey === 'regional'}
                                className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {savingKey === 'regional' ? t('settings_workspace.actions.saving') : t('settings_workspace.account.regional.submit')}
                            </button>
                        </SectionCard>

                        {canManageBilling ? (
                            <SectionCard
                                icon={<Mail size={24} className="text-primary" />}
                                title={t('settings_workspace.account.billing.title')}
                                scope={t('settings_workspace.scopes.account')}
                                description={t('settings_workspace.account.billing.description')}
                                actionHint={t('settings_workspace.account.billing.action_hint')}
                            >
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <Field label={t('settings_workspace.account.billing.contact_name_label')} hint={t('settings_workspace.account.billing.contact_name_hint')}>
                                        <input
                                            type="text"
                                            value={billingContactName}
                                            onChange={(event) => setBillingContactName(event.target.value)}
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field label={t('settings_workspace.account.billing.contact_email_label')} hint={t('settings_workspace.account.billing.contact_email_hint')}>
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
                                    }, t('settings_workspace.feedback.billing_saved'))}
                                    disabled={savingKey === 'billing'}
                                    className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {savingKey === 'billing' ? t('settings_workspace.actions.saving') : t('settings_workspace.account.billing.submit')}
                                </button>
                            </SectionCard>
                        ) : (
                            <Notice
                                title={t('settings_workspace.account.billing_notice.title')}
                                text={t('settings_workspace.account.billing_notice.text')}
                            />
                        )}
                    </>
                ) : null}

                {activeTab === 'documents' && canManageOrgSettings ? (
                    <SectionCard
                        icon={<SettingsIcon size={24} className="text-primary" />}
                        title={t('settings_workspace.documents.tax_and_terminals.title')}
                        scope={t('settings_workspace.scopes.store')}
                        description={t('settings_workspace.documents.tax_and_terminals.description')}
                        actionHint={t('settings_workspace.documents.tax_and_terminals.action_hint')}
                    >
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-black text-white">{t('settings_workspace.documents.tax.title')}</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">{t('settings_workspace.documents.tax.description')}</p>
                                </div>
                                <button type="button" onClick={() => setTaxEnabled((current) => !current)} className={`relative h-6 w-11 rounded-full transition-colors ${taxEnabled ? 'bg-primary' : 'bg-white/10'}`}>
                                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${taxEnabled ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>
                            <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
                                <Field label={t('settings_workspace.documents.tax.rate_label')} hint={t('settings_workspace.documents.tax.rate_hint')}>
                                    <input type="number" min="0" max="30" step="0.5" value={taxRate} onChange={(event) => setTaxRate(parseFloat(event.target.value) || 0)} className={inputClass} />
                                </Field>
                                <Field label={t('settings_workspace.documents.tax.mode_label')} hint={t('settings_workspace.documents.tax.mode_hint')}>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['ttc', 'ht'] as const).map((mode) => (
                                            <button key={mode} type="button" onClick={() => setTaxMode(mode)} className={`rounded-2xl border px-4 py-3 text-sm font-black uppercase tracking-[0.16em] transition-all ${taxMode === mode ? 'border-primary/40 bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                                                {t(`settings_workspace.documents.tax.mode_${mode}`)}
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
                                }, t('settings_workspace.feedback.taxes_saved'))}
                                disabled={savingKey === 'taxes'}
                                className="btn-primary mt-6 inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {savingKey === 'taxes' ? t('settings_workspace.actions.saving') : t('settings_workspace.documents.tax.submit')}
                            </button>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <p className="text-sm font-black text-white">{t('settings_workspace.documents.terminals.title')}</p>
                            <p className="mt-2 text-xs leading-5 text-slate-500">{t('settings_workspace.documents.terminals.description')}</p>
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
                                <input type="text" value={newTerminal} onChange={(event) => setNewTerminal(event.target.value)} className={inputClass} placeholder={t('settings_workspace.documents.terminals.placeholder')} />
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
                                }, t('settings_workspace.feedback.terminals_saved'))}
                                disabled={savingKey === 'terminals'}
                                className="btn-primary mt-6 inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {savingKey === 'terminals' ? t('settings_workspace.actions.saving') : t('settings_workspace.documents.terminals.submit')}
                            </button>
                        </div>
                    </SectionCard>
                ) : null}

                {activeTab === 'stores' ? (
                    <>
                        {canManageOrgSettings && storeList.length ? (
                            <SectionCard
                                icon={<Store size={24} className="text-primary" />}
                                title={t('settings_workspace.stores.profile.title')}
                                scope={t('settings_workspace.scopes.store')}
                                description={t('settings_workspace.stores.profile.description')}
                                actionHint={t('settings_workspace.stores.profile.action_hint')}
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
                                                    <p className="mt-1 text-xs text-slate-500">{store.address || t('settings_workspace.stores.profile.empty_address')}</p>
                                                </div>
                                                <ChevronRight size={18} className={`text-slate-500 transition-transform ${editingStore?.store_id === store.store_id ? 'rotate-90' : ''}`} />
                                            </button>
                                            {editingStore?.store_id === store.store_id ? (
                                                <div className="space-y-4 border-t border-white/10 bg-white/[0.03] px-5 py-5">
                                                    <Field label={t('settings_workspace.stores.profile.store_name_label')} hint={t('settings_workspace.stores.profile.store_name_hint')}>
                                                        <input type="text" value={editingStore.name || ''} onChange={(event) => setEditingStore((current: any) => ({ ...current, name: event.target.value }))} className={inputClass} />
                                                    </Field>
                                                    <Field label={t('settings_workspace.stores.profile.address_label')} hint={t('settings_workspace.stores.profile.address_hint')}>
                                                        <input type="text" value={editingStore.address || ''} onChange={(event) => setEditingStore((current: any) => ({ ...current, address: event.target.value }))} className={inputClass} />
                                                    </Field>
                                                    <button
                                                        type="button"
                                                        onClick={() => void runSave('store-editor', async () => {
                                                            const updated = await storesApi.update(store.store_id, { name: editingStore.name, address: editingStore.address });
                                                            setStoreList((current) => current.map((item) => item.store_id === store.store_id ? { ...item, ...updated } : item));
                                                            setEditingStore(null);
                                                        }, t('settings_workspace.feedback.store_saved'))}
                                                        disabled={savingKey === 'store-editor'}
                                                        className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                                                    >
                                                        <Save size={18} />
                                                        {savingKey === 'store-editor' ? t('settings_workspace.actions.saving') : t('settings_workspace.stores.profile.submit')}
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
                                title={t('settings_workspace.documents.receipt.title')}
                                scope={t('settings_workspace.scopes.store')}
                                description={t('settings_workspace.documents.receipt.description')}
                                actionHint={t('settings_workspace.documents.receipt.action_hint')}
                            >
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <Field label={t('settings_workspace.documents.receipt.business_name_label')} hint={t('settings_workspace.documents.receipt.business_name_hint')}>
                                        <input type="text" value={receiptName} onChange={(event) => setReceiptName(event.target.value)} className={inputClass} />
                                    </Field>
                                    <Field label={t('settings_workspace.documents.receipt.footer_label')} hint={t('settings_workspace.documents.receipt.footer_hint')}>
                                        <input type="text" value={receiptFooter} onChange={(event) => setReceiptFooter(event.target.value)} className={inputClass} />
                                    </Field>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void runSave('receipt', async () => {
                                        const updated = await settingsApi.update({ receipt_business_name: receiptName, receipt_footer: receiptFooter });
                                        syncFromSettings(updated);
                                    }, t('settings_workspace.feedback.receipt_saved'))}
                                    disabled={savingKey === 'receipt'}
                                    className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {savingKey === 'receipt' ? t('settings_workspace.actions.saving') : t('settings_workspace.documents.receipt.submit')}
                                </button>
                            </SectionCard>

                            <SectionCard
                                icon={<FileText size={24} className="text-primary" />}
                                title={t('settings_workspace.documents.invoice.title')}
                                scope={t('settings_workspace.scopes.store')}
                                description={t('settings_workspace.documents.invoice.description')}
                                actionHint={t('settings_workspace.documents.invoice.action_hint')}
                            >
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <Field label={t('settings_workspace.documents.invoice.business_name_label')} hint={t('settings_workspace.documents.invoice.business_name_hint')}>
                                        <input type="text" value={invoiceName} onChange={(event) => setInvoiceName(event.target.value)} className={inputClass} />
                                    </Field>
                                    <Field label={t('settings_workspace.documents.invoice.document_label_label')} hint={t('settings_workspace.documents.invoice.document_label_hint')}>
                                        <input type="text" value={invoiceLabel} onChange={(event) => setInvoiceLabel(event.target.value)} className={inputClass} />
                                    </Field>
                                    <Field label={t('settings_workspace.documents.invoice.prefix_label')} hint={t('settings_workspace.documents.invoice.prefix_hint')}>
                                        <input type="text" value={invoicePrefix} onChange={(event) => setInvoicePrefix(event.target.value)} className={inputClass} />
                                    </Field>
                                    <Field label={t('settings_workspace.documents.invoice.payment_terms_label')} hint={t('settings_workspace.documents.invoice.payment_terms_hint')}>
                                        <input type="text" value={invoicePaymentTerms} onChange={(event) => setInvoicePaymentTerms(event.target.value)} className={inputClass} />
                                    </Field>
                                    <Field label={t('settings_workspace.documents.invoice.address_label')} hint={t('settings_workspace.documents.invoice.address_hint')}>
                                        <input type="text" value={invoiceAddress} onChange={(event) => setInvoiceAddress(event.target.value)} className={inputClass} />
                                    </Field>
                                    <Field label={t('settings_workspace.documents.invoice.footer_label')} hint={t('settings_workspace.documents.invoice.footer_hint')}>
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
                                    }, t('settings_workspace.feedback.invoice_saved'))}
                                    disabled={savingKey === 'invoice'}
                                    className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {savingKey === 'invoice' ? t('settings_workspace.actions.saving') : t('settings_workspace.documents.invoice.submit')}
                                </button>
                            </SectionCard>
                        </>
                    ) : (
                        <Notice
                            title={t('settings_workspace.documents.notice.title')}
                            text={t('settings_workspace.documents.notice.text')}
                        />
                    )
                ) : null}

                {activeTab === 'notifications' && canManageOrgSettings ? (
                    <>
                        <SectionCard
                            icon={<Mail size={24} className="text-primary" />}
                            title={t('settings_workspace.notifications.organization.title')}
                            scope={t('settings_workspace.scopes.account')}
                            description={t('settings_workspace.notifications.organization.description')}
                            actionHint={t('settings_workspace.notifications.organization.action_hint')}
                        >
                            <div className="grid grid-cols-1 gap-5">
                                {notificationContactFields.map((field) => (
                                    <Field key={field.key} label={field.label} hint={field.description}>
                                        <textarea
                                            rows={2}
                                            value={(notificationContacts[field.key] || []).join(', ')}
                                            onChange={(event) => updateNotificationGroup(setNotificationContacts, field.key, event.target.value)}
                                            className={textareaClass}
                                            placeholder={t('settings_workspace.notifications.organization.placeholder')}
                                        />
                                    </Field>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => void runSave('org-notifications', async () => {
                                    const updated = await settingsApi.update({ notification_contacts: notificationContacts });
                                    syncFromSettings(updated);
                                }, t('settings_workspace.feedback.org_recipients_saved'))}
                                disabled={savingKey === 'org-notifications'}
                                className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {savingKey === 'org-notifications' ? t('settings_workspace.actions.saving') : t('settings_workspace.notifications.organization.submit')}
                            </button>
                        </SectionCard>

                        {activeStore ? (
                            <SectionCard
                                icon={<Store size={24} className="text-primary" />}
                                title={t('settings_workspace.notifications.store.title', { store: activeStore.name })}
                                scope={t('settings_workspace.scopes.store')}
                                description={t('settings_workspace.notifications.store.description')}
                                actionHint={t('settings_workspace.notifications.store.action_hint')}
                            >
                                <div className="grid grid-cols-1 gap-5">
                                    {notificationContactFields.map((field) => (
                                        <Field key={field.key} label={field.label} hint={field.description}>
                                            <textarea
                                                rows={2}
                                                value={(storeNotificationContacts[field.key] || []).join(', ')}
                                                onChange={(event) => updateNotificationGroup(setStoreNotificationContacts, field.key, event.target.value)}
                                                className={textareaClass}
                                                placeholder={t('settings_workspace.notifications.store.placeholder')}
                                            />
                                        </Field>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void runSave('store-notifications', async () => {
                                        const updated = await settingsApi.update({ store_notification_contacts: storeNotificationContacts });
                                        syncFromSettings(updated);
                                    }, t('settings_workspace.feedback.store_recipients_saved'))}
                                    disabled={savingKey === 'store-notifications'}
                                    className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {savingKey === 'store-notifications' ? t('settings_workspace.actions.saving') : t('settings_workspace.notifications.store.submit')}
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
                                title={t('settings_workspace.organization.modules.title')}
                                scope={t('settings_workspace.scopes.account')}
                                description={t('settings_workspace.organization.modules.description')}
                                actionHint={t('settings_workspace.organization.modules.action_hint')}
                            >
                                <div className="space-y-3">
                                    {visibleModules.map((module) => {
                                        const enabled = modulesDraft[module.key] !== false;
                                        return (
                                            <div key={module.key} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                                <span className="text-sm font-medium text-slate-200">{t(`settings_workspace.modules.${module.key}`)}</span>
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
                                }, t('settings_workspace.feedback.modules_saved'))}
                                disabled={savingKey === 'modules'}
                                className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {savingKey === 'modules' ? t('settings_workspace.actions.saving') : t('settings_workspace.organization.modules.submit')}
                            </button>
                        </SectionCard>

                        <SectionCard
                            icon={<Bell size={24} className="text-primary" />}
                            title={t('settings_workspace.organization.reminders.title')}
                            scope={t('settings_workspace.scopes.account')}
                            description={t('settings_workspace.organization.reminders.description')}
                            actionHint={t('settings_workspace.organization.reminders.action_hint')}
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
                                }, t('settings_workspace.feedback.reminders_saved'))}
                                disabled={savingKey === 'reminders'}
                                className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {savingKey === 'reminders' ? t('settings_workspace.actions.saving') : t('settings_workspace.organization.reminders.submit')}
                            </button>
                        </SectionCard>
                    </>
                ) : (
                    <Notice
                        title={t('settings_workspace.organization.notice.title')}
                        text={t('settings_workspace.organization.notice.text')}
                    />
                )
            ) : null}

            {activeTab === 'notifications' ? (
                <>
                    <SectionCard
                        icon={<Bell size={24} className="text-primary" />}
                        title={t('settings_workspace.notifications.personal.title')}
                        scope={t('settings_workspace.scopes.user')}
                        description={t('settings_workspace.notifications.personal.description')}
                        actionHint={t('settings_workspace.notifications.personal.action_hint')}
                    >
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {notificationChannelOptions.map((item) => {
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
                            <Field label={t('settings_workspace.notifications.personal.push_severity_label')} hint={t('settings_workspace.notifications.personal.push_severity_hint')}>
                                <select
                                    value={notificationPreferences.minimum_severity_for_push}
                                    onChange={(event) => setNotificationPreferences((current) => ({ ...current, minimum_severity_for_push: event.target.value as NotificationPreferences['minimum_severity_for_push'] }))}
                                    className={selectClass}
                                >
                                    <option value="info">{t('settings_workspace.notifications.personal.severity.info')}</option>
                                    <option value="warning">{t('settings_workspace.notifications.personal.severity.warning')}</option>
                                    <option value="critical">{t('settings_workspace.notifications.personal.severity.critical')}</option>
                                </select>
                            </Field>
                            <Field label={t('settings_workspace.notifications.personal.email_severity_label')} hint={t('settings_workspace.notifications.personal.email_severity_hint')}>
                                <select
                                    value={notificationPreferences.minimum_severity_for_email}
                                    onChange={(event) => setNotificationPreferences((current) => ({ ...current, minimum_severity_for_email: event.target.value as NotificationPreferences['minimum_severity_for_email'] }))}
                                    className={selectClass}
                                >
                                    <option value="info">{t('settings_workspace.notifications.personal.severity.info')}</option>
                                    <option value="warning">{t('settings_workspace.notifications.personal.severity.warning')}</option>
                                    <option value="critical">{t('settings_workspace.notifications.personal.severity.critical')}</option>
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
                                }, t('settings_workspace.feedback.personal_notifications_saved'))}
                                disabled={savingKey === 'personal-notifications'}
                                className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {savingKey === 'personal-notifications' ? t('settings_workspace.actions.saving') : t('settings_workspace.notifications.personal.submit')}
                            </button>
                        </SectionCard>
                    </>
                ) : null}

                {activeTab === 'security' ? (
                    <>
                        <SectionCard
                            icon={<Shield size={24} className="text-primary" />}
                            title={t('settings_workspace.security.password.title')}
                            scope={t('settings_workspace.scopes.user')}
                            description={t('settings_workspace.security.password.description')}
                            actionHint={t('settings_workspace.security.password.action_hint')}
                        >
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                <Field label={t('settings_workspace.security.password.current_label')} hint={t('settings_workspace.security.password.current_hint')}>
                                    <input type="password" value={passwordForm.oldPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, oldPassword: event.target.value }))} className={inputClass} />
                                </Field>
                                <Field label={t('settings_workspace.security.password.new_label')} hint={t('settings_workspace.security.password.new_hint')}>
                                    <input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} className={inputClass} />
                                </Field>
                                <Field label={t('settings_workspace.security.password.confirm_label')} hint={t('settings_workspace.security.password.confirm_hint')}>
                                    <input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} className={inputClass} />
                                </Field>
                            </div>
                            <button
                                type="button"
                                onClick={() => void runSave('password', async () => {
                                    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                                        throw new Error(t('settings_workspace.feedback.password_mismatch'));
                                    }
                                    await authApi.changePassword({ old_password: passwordForm.oldPassword, new_password: passwordForm.newPassword });
                                    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                                }, t('settings_workspace.feedback.password_saved'))}
                                disabled={savingKey === 'password'}
                                className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {savingKey === 'password' ? t('settings_workspace.actions.saving') : t('settings_workspace.security.password.submit')}
                            </button>
                        </SectionCard>

                        <SectionCard
                            icon={<LogOut size={24} className="text-rose-400" />}
                            title={t('settings_workspace.security.logout.title')}
                            scope={t('settings_workspace.scopes.user')}
                            description={t('settings_workspace.security.logout.description')}
                            actionHint={t('settings_workspace.security.logout.action_hint')}
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
                                {t('settings_workspace.security.logout.submit')}
                            </button>
                        </SectionCard>

                        <SectionCard
                            icon={<Trash2 size={24} className="text-red-500" />}
                            title={t('modals.deleteAccount.dangerZone')}
                            scope={t('settings_workspace.scopes.user')}
                            description={t('modals.deleteAccount.warningText')}
                            actionHint={t('modals.deleteAccount.confirmationDesc')}
                        >
                            {!showDeleteConfirm ? (
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-red-500/10 px-6 py-3 font-bold text-red-400 transition-colors hover:bg-red-500 hover:text-white"
                                >
                                    <Trash2 size={18} />
                                    {t('modals.deleteAccount.deleteBtn')}
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    <Field label={t('modals.deleteAccount.confirmPasswordLabel')} hint={t('modals.deleteAccount.confirmPasswordPlaceholder')}>
                                        <input
                                            type="password"
                                            value={deletePassword}
                                            onChange={(e) => setDeletePassword(e.target.value)}
                                            placeholder={t('modals.deleteAccount.confirmPasswordPlaceholder')}
                                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30"
                                        />
                                    </Field>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-6 py-3 font-bold text-slate-300 transition-colors hover:bg-white/10"
                                        >
                                            {t('modals.cancel')}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!deletePassword || deletingAccount}
                                            onClick={async () => {
                                                setDeletingAccount(true);
                                                try {
                                                    await authApi.deleteAccount(deletePassword);
                                                    authApi.logout();
                                                    window.location.reload();
                                                } catch (err: any) {
                                                    setBanner({ tone: 'error', message: err?.message || t('modals.deleteAccount.errorDelete') });
                                                    setDeletingAccount(false);
                                                }
                                            }}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-red-500/20 px-6 py-3 font-bold text-red-400 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-40"
                                        >
                                            <Trash2 size={18} />
                                            {deletingAccount ? t('settings_workspace.actions.saving') : t('modals.deleteAccount.deleteAllBtn')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </SectionCard>
                    </>
                ) : null}
            </div>
        </div>
    );
}
