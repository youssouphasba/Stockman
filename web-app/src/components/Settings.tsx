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
    LogOut
} from 'lucide-react';
import { settings as settingsApi, auth as authApi } from '../services/api';
import ReminderRulesSettings, { ReminderRuleSettings } from './ReminderRulesSettings';

export default function Settings() {
    const { t, i18n } = useTranslation();
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [profileName, setProfileName] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const res = await settingsApi.get();
            setSettings(res);
            setProfileName(res?.user_name || '');
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
                                <div className="text-lg font-bold text-primary px-4 py-2 bg-primary/10 rounded-xl">
                                    {settings?.currency || 'XOF (CFA)'}
                                </div>
                            </div>
                        </div>
                    </div>
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
