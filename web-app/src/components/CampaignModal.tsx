'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Megaphone, Users, Shield, MessageSquare, ExternalLink, Filter } from 'lucide-react';
import Modal from './Modal';
import { customers as customersApi } from '../services/api';

interface CampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CampaignModal({ isOpen, onClose }: CampaignModalProps) {
    const { t } = useTranslation();
    const [tier, setTier] = useState('all');
    const [message, setMessage] = useState('');
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    const Tiers = [
        { id: 'all', label: 'Tous les clients', icon: Users, color: 'text-slate-400' },
        { id: 'bronze', label: 'Bronze', icon: Shield, color: 'text-amber-700' },
        { id: 'silver', label: 'Argent', icon: Shield, color: 'text-slate-300' },
        { id: 'gold', label: 'Or', icon: Shield, color: 'text-amber-400' },
    ];

    useEffect(() => {
        if (isOpen) {
            loadCustomers();
        }
    }, [isOpen]);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const res = await customersApi.list();
            setCustomers(res.items || res);
        } catch (err) {
            console.error("Load customers error", err);
        } finally {
            setLoading(false);
        }
    };

    const targetCustomers = customers.filter(c => {
        if (tier === 'all') return true;
        return c.tier?.toLowerCase() === tier;
    });

    const handleSend = () => {
        if (!message) return;
        setSending(true);
        // On web, we open current WhatsApp interface or show a simulator
        // In real app, this might use a backend broadcast service
        const first = targetCustomers.find(c => c.phone);
        if (first) {
            const phone = first.phone.replace(/[^\d]/g, '');
            const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        }
        setTimeout(() => {
            setSending(false);
            onClose();
        }, 1500);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Campagne Marketing"
            maxWidth="lg"
        >
            <div className="py-4 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-2xl border border-primary/20">
                    <Megaphone className="text-primary" size={24} />
                    <p className="text-xs text-slate-400">
                        Envoyez un message WhatsApp personnalisé à vos segments de clientèle. Augmentez votre chiffre d'affaires en ciblant vos meilleurs clients.
                    </p>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">1. Choisir la Cible</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Tiers.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTier(t.id)}
                                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${tier === t.id
                                    ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/10'
                                    : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'
                                    }`}
                            >
                                <t.icon size={20} className={tier === t.id ? 'text-primary' : t.color} />
                                <span className="text-[10px] font-bold uppercase">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center px-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">2. Rédiger le Message</label>
                        <span className="text-[10px] text-primary font-bold">{targetCustomers.length} clients ciblés</span>
                    </div>
                    <textarea
                        rows={5}
                        className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-primary/50 transition-all placeholder:text-slate-600 shadow-inner"
                        placeholder="Ex: Bonjour {nom}, profitez de -10% sur toute la boutique ce weekend !"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Aperçu de la Cible</label>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {loading ? (
                            <div className="flex justify-center py-4">
                                <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            </div>
                        ) : targetCustomers.length === 0 ? (
                            <div className="text-center py-8 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <Filter size={24} className="mx-auto text-slate-700 mb-2" />
                                <p className="text-xs text-slate-500 font-bold">Aucun client dans ce segment.</p>
                            </div>
                        ) : (
                            targetCustomers.slice(0, 10).map((c, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-black text-slate-500 text-[10px]">
                                            {c.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-300">{c.name}</p>
                                            <p className="text-[10px] text-slate-500">{c.phone || 'Sans numéro'}</p>
                                        </div>
                                    </div>
                                    {c.phone && <MessageSquare size={14} className="text-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity" />}
                                </div>
                            ))
                        )}
                        {targetCustomers.length > 10 && (
                            <p className="text-[9px] text-center text-slate-600 font-bold uppercase py-2">Et {targetCustomers.length - 10} autres clients...</p>
                        )}
                    </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-4 rounded-2xl border border-white/10 text-slate-400 font-bold hover:bg-white/5 transition-all text-sm"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={sending || !message || targetCustomers.length === 0}
                        className="flex-[2] btn-primary py-4 rounded-2xl font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
                    >
                        {sending ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Send size={18} />
                                Lancer la Campagne
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
