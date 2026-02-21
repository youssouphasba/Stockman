'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Shield, ShieldCheck, Zap, ToggleLeft as Toggle } from 'lucide-react';
import Modal from './Modal';
import { settings as settingsApi } from '../services/api';

interface LoyaltySettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoyaltySettingsModal({ isOpen, onClose }: LoyaltySettingsModalProps) {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const res = await settingsApi.get();
            setSettings(res.loyalty || { is_active: false, ratio: 100, reward_threshold: 1000 });
        } catch (err) {
            console.error("Load loyalty settings error", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await settingsApi.update({ loyalty: settings });
            onClose();
        } catch (err) {
            console.error("Save loyalty settings error", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Stratégie de Fidélité"
            maxWidth="md"
        >
            {loading ? (
                <div className="py-20 flex justify-center">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="py-4 space-y-8">
                    {/* Activation Toggle */}
                    <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${settings.is_active ? 'bg-primary/20 text-primary' : 'bg-slate-500/10 text-slate-500'}`}>
                                <Zap size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold">Programme de Fidélité</h3>
                                <p className="text-xs text-slate-500">Récompensez vos clients avec des points.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSettings({ ...settings, is_active: !settings.is_active })}
                            className={`relative w-14 h-8 rounded-full transition-all duration-300 ${settings.is_active ? 'bg-primary' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${settings.is_active ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>

                    {settings.is_active && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Ratio de Gain</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-4 pr-12 text-white font-black outline-none focus:border-primary/50"
                                        value={settings.ratio}
                                        onChange={(e) => setSettings({ ...settings, ratio: parseInt(e.target.value) || 0 })}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">F = 1 pt</span>
                                </div>
                                <p className="text-[10px] text-slate-500 px-4 italic">Ex: 100 FCFA dépensé = 1 point gagné.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Seuil de Récompense</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-4 pr-12 text-white font-black outline-none focus:border-primary/50"
                                        value={settings.reward_threshold}
                                        onChange={(e) => setSettings({ ...settings, reward_threshold: parseInt(e.target.value) || 0 })}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">pts</span>
                                </div>
                                <p className="text-[10px] text-slate-500 px-4 italic">Points requis pour débloquer un avantage.</p>
                            </div>
                        </div>
                    )}

                    {/* Tiers Preview */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Niveaux de Fidélité (Automatique)</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { color: 'text-amber-700', icon: Shield, label: 'Bronze', min: '0 F' },
                                { color: 'text-slate-400', icon: ShieldCheck, label: 'Argent', min: '100k F' },
                                { color: 'text-amber-400', icon: ShieldCheck, label: 'Or', min: '500k F' },
                                { color: 'text-blue-200', icon: ShieldCheck, label: 'Platine', min: '1M F' },
                            ].map((tier, idx) => (
                                <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center gap-2">
                                    <tier.icon size={20} className={tier.color} />
                                    <span className="text-xs font-bold text-white tracking-tight">{tier.label}</span>
                                    <span className="text-[9px] text-slate-500 uppercase font-black">{tier.min}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6 border-t border-white/10">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-4 rounded-2xl border border-white/10 text-slate-400 font-bold hover:bg-white/5 transition-all"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 btn-primary py-4 rounded-2xl font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            {saving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Enregistrer
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
