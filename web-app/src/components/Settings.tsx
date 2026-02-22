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
    MapPin
} from 'lucide-react';
import { settings as settingsApi, auth as authApi, locations as locationsApi, stores as storesApi } from '../services/api';
import ReminderRulesSettings, { ReminderRuleSettings } from './ReminderRulesSettings';

export default function Settings() {
    const { t, i18n } = useTranslation();
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [profileName, setProfileName] = useState('');
    const [currency, setCurrency] = useState('XOF');
    const [receiptName, setReceiptName] = useState('');
    const [receiptFooter, setReceiptFooter] = useState('');
    const [terminals, setTerminals] = useState<string[]>([]);
    const [newTerminal, setNewTerminal] = useState('');
    const [locations, setLocations] = useState<any[]>([]);
    const [newLocName, setNewLocName] = useState('');
    const [newLocType, setNewLocType] = useState('shelf');
    const [storeList, setStoreList] = useState<any[]>([]);
    const [editingStore, setEditingStore] = useState<any>(null);
    const [storeSaving, setStoreSaving] = useState(false);

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
            setReceiptName(res?.receipt_business_name || '');
            setReceiptFooter(res?.receipt_footer || '');
            setTerminals(res?.terminals || []);
            setLocations(locs || []);
            setStoreList(storesRes || []);
        } catch (err) {
            console.error("Settings load error", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSettings = async (updates: any) => {
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">
                <div className="lg:col-span-2 space-y-8">
                    {/* User Profile */}
                    <div className="glass-card p-8">
                        <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                            <User size={24} className="text-primary" />
                            Profil Utilisateur
                        </h3>
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

                    {/* Smart Reminder Rules */}
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

                    {/* Multi-caisse — Terminal Management */}
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
                    {storeList.length > 0 && (
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
