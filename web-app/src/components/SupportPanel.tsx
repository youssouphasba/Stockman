'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Plus, MessageCircle, ChevronLeft, CheckCircle, ExternalLink, Mail, AlertTriangle, ShieldAlert, BadgeInfo } from 'lucide-react';
import { support, disputes } from '../services/api';

const WHATSAPP_SUPPORT_NUMBER = "+33661600490";

interface SupportPanelProps {
    isOpen: boolean;
    onClose: () => void;
    user?: any;
}

export default function SupportPanel({ isOpen, onClose, user }: SupportPanelProps) {
    const { t } = useTranslation();
    const [tab, setTab] = useState<'list' | 'new' | 'detail'>('list');
    const [tickets, setTickets] = useState<any[]>([]);
    const [userDisputes, setUserDisputes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [creationMode, setCreationMode] = useState<'ticket' | 'dispute'>('ticket');

    // New item form
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [disputeType, setDisputeType] = useState('other');
    const [sending, setSending] = useState(false);

    // Reply
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);

    useEffect(() => {
        if (isOpen) loadItems();
    }, [isOpen]);

    const loadItems = async () => {
        setLoading(true);
        try {
            const [ticketsRes, disputesRes] = await Promise.all([
                support.getMyTickets(),
                disputes.getMine()
            ]);
            setTickets(Array.isArray(ticketsRes) ? ticketsRes : []);
            setUserDisputes(Array.isArray(disputesRes) ? disputesRes : []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    const handleCreate = async () => {
        if (!subject.trim() || !message.trim()) return;
        setSending(true);
        try {
            if (creationMode === 'dispute') {
                await disputes.create({
                    subject,
                    description: message,
                    type: disputeType
                });
            } else {
                await support.createTicket(subject, message);
            }
            setSubject('');
            setMessage('');
            setTab('list');
            loadItems();
        } catch {
            alert(t('support.createError', { defaultValue: "Erreur lors de l'envoi" }));
        } finally {
            setSending(false);
        }
    };

    const handleReply = async () => {
        if (!selectedItem || !selectedItem.ticket_id || !replyText.trim()) return;
        setReplying(true);
        try {
            const updated = await support.replyTicket(selectedItem.ticket_id, replyText);
            setSelectedItem(updated);
            setReplyText('');
            loadItems();
        } catch {
            alert(t('support.replyError', { defaultValue: "Erreur lors de la réponse" }));
        } finally {
            setReplying(false);
        }
    };

    const combinedItems = [
        ...tickets.map(t => ({ ...t, _ui_type: 'ticket' })),
        ...userDisputes.map(d => ({ ...d, _ui_type: 'dispute', ticket_id: d.dispute_id }))
    ].sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

    const openItem = (item: any) => {
        setSelectedItem(item);
        setTab('detail');
    };

    const statusColor = (s: string) =>
        s === 'open' ? 'text-amber-400 bg-amber-500/10' :
        s === 'pending' ? 'text-blue-400 bg-blue-500/10' :
        'text-emerald-400 bg-emerald-500/10';

    const statusLabel = (s: string) =>
        s === 'open' ? t('support.statusOpen') :
        s === 'pending' ? t('support.statusPending') :
        t('support.statusClosed');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-md bg-[#0F172A] border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    {tab === 'detail' ? (
                        <button onClick={() => { setTab('list'); setSelectedItem(null); }} className="flex items-center gap-2 text-slate-400 hover:text-white">
                            <ChevronLeft size={18} />
                            <span className="font-bold text-sm">{t('support.back')}</span>
                        </button>
                    ) : (
                        <h2 className="font-black text-white text-lg">{t('support.title')}</h2>
                    )}
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs (only in list/new) */}
                {tab !== 'detail' && (
                    <div className="flex gap-2 px-6 pt-4">
                        <button
                            onClick={() => { setTab('list'); setCreationMode('ticket'); }}
                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tab === 'list' ? 'bg-primary text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                        >
                            {t('support.myTickets')}
                        </button>
                        <button
                            onClick={() => { setTab('new'); setCreationMode('ticket'); }}
                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${tab === 'new' && creationMode === 'ticket' ? 'bg-primary text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                        >
                            <Plus size={14} /> {t('support.newTicket')}
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {tab === 'list' && (
                        <div className="flex flex-col gap-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2 mb-1">{t('support.channelsTitle', { defaultValue: 'Canaux de Support Professionnel' })}</h3>
                            
                            <div className="grid grid-cols-1 gap-3 mb-6">
                                {/* WhatsApp Button */}
                                <a
                                    href={`https://wa.me/${WHATSAPP_SUPPORT_NUMBER.replace(/\+/g, '')}?text=${encodeURIComponent(t('support.whatsappMessage', { defaultValue: 'Bonjour', id: user?.user_id || 'N/A' }))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-4 rounded-2xl hover:bg-emerald-500/20 transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                                        <MessageCircle size={20} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h3 className="font-bold text-sm">{t('support.whatsappBtn', { defaultValue: 'WhatsApp Business' })}</h3>
                                        <p className="text-[10px] opacity-70">{t('support.whatsappSub', { defaultValue: 'Réponse instantanée' })}</p>
                                    </div>
                                    <ExternalLink size={14} className="opacity-40 group-hover:opacity-100" />
                                </a>

                                {/* Email Button */}
                                <a
                                    href={`mailto:contact@stockman.pro?subject=Support Stockman - ${user?.name || 'Client'} (ID: ${user?.user_id || 'N/A'})`}
                                    className="flex items-center gap-3 w-full bg-blue-500/10 text-blue-400 border border-blue-500/20 p-4 rounded-2xl hover:bg-blue-500/20 transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                                        <Mail size={20} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h3 className="font-bold text-sm">E-mail Officiel</h3>
                                        <p className="text-[10px] opacity-70">contact@stockman.pro</p>
                                    </div>
                                    <ExternalLink size={14} className="opacity-40 group-hover:opacity-100" />
                                </a>

                                {/* Disputed / Official Support Button */}
                                <button
                                    onClick={() => {
                                        setTab('new');
                                        setCreationMode('dispute');
                                        setSubject('');
                                    }}
                                    className="flex items-center gap-3 w-full bg-rose-500/10 text-rose-400 border border-rose-500/20 p-4 rounded-2xl hover:bg-rose-500/20 transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h3 className="font-bold text-sm">{t('support.disputesBtn', { defaultValue: 'Support' })}</h3>
                                        <p className="text-[10px] opacity-70">{t('support.disputesSub', { defaultValue: 'Signalement officiel (Interface Admin)' })}</p>
                                    </div>
                                    <Plus size={14} className="opacity-40 group-hover:opacity-100" />
                                </button>
                            </div>

                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{t('support.myTickets', { defaultValue: 'Historique des demandes' })}</h3>

                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                </div>
                            ) : combinedItems.length === 0 ? (
                                <div className="text-center py-20">
                                    <MessageCircle size={48} className="mx-auto text-slate-700 mb-4" />
                                    <p className="text-slate-500 font-bold">{t('support.noTickets', { defaultValue: 'Aucun ticket' })}</p>
                                    <button onClick={() => { setTab('new'); setCreationMode('ticket'); }} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90">
                                        {t('support.createFirst', { defaultValue: 'Créer un ticket' })}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {combinedItems.map((item: any) => {
                                        const lastMsg = item._ui_type === 'ticket' ? item.messages?.[item.messages.length - 1] : { content: item.description, sender_name: item.reporter_name };
                                        const hasAdminReply = item._ui_type === 'ticket' ? item.messages?.some((m: any) => m.sender_name === 'Admin Stockman') : false;
                                        
                                        return (
                                            <button
                                                key={item.ticket_id || item.dispute_id}
                                                onClick={() => openItem(item)}
                                                className={`w-full text-left bg-white/5 border p-4 rounded-2xl hover:bg-white/10 transition-all ${item._ui_type === 'dispute' ? 'border-rose-500/20' : 'border-white/5'}`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2 flex-1 mr-2 min-w-0">
                                                        {item._ui_type === 'dispute' && <AlertTriangle size={12} className="text-rose-400 shrink-0" />}
                                                        <p className="font-bold text-white text-sm truncate">{item.subject}</p>
                                                    </div>
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${statusColor(item.status)}`}>
                                                        {statusLabel(item.status)}
                                                    </span>
                                                </div>
                                                {lastMsg && (
                                                    <p className="text-xs text-slate-400 truncate">
                                                        {item._ui_type === 'ticket' && lastMsg.sender_name === 'Admin Stockman' ? 'Support: ' : ''}{lastMsg.content}
                                                    </p>
                                                )}
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-[10px] text-slate-600">
                                                        {new Date(item.updated_at || item.created_at).toLocaleDateString()}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {item._ui_type === 'dispute' && (
                                                            <span className="text-[9px] font-black uppercase text-rose-400/60 tracking-widest bg-rose-400/5 px-2 py-0.5 rounded">LITIGE</span>
                                                        )}
                                                        {hasAdminReply && (
                                                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                                                                <CheckCircle size={10} /> {t('support.replied', { defaultValue: 'Répondu' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'new' && (
                        <div className="space-y-4">
                            {creationMode === 'dispute' && (
                                <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl mb-4">
                                    <div className="flex items-center gap-3 mb-2 text-rose-400">
                                        <ShieldAlert size={20} />
                                        <h4 className="font-black text-xs uppercase tracking-widest">Ouverture d'un Litige Officiel</h4>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-relaxed">
                                        Cette procédure est réservée aux réclamations sérieuses (paiements, livraisons, erreurs catalogue). Votre demande sera traitée par l'administration dans les plus brefs délais.
                                    </p>
                                    
                                    <div className="mt-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Nature du problème</label>
                                        <select 
                                            value={disputeType}
                                            onChange={(e) => setDisputeType(e.target.value)}
                                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50"
                                        >
                                            <option value="other">Autre</option>
                                            <option value="payment">Paiement / Facturation</option>
                                            <option value="delivery">Livraison / Expédition</option>
                                            <option value="product">Problème Produit / Qualité</option>
                                            <option value="service">Service Client / Abus</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{t('support.subjectLabel')}</label>
                                <input
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder={creationMode === 'dispute' ? "Sujet du litige..." : t('support.subjectPlaceholder')}
                                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all ${creationMode === 'dispute' ? 'border-rose-500/20 focus:border-rose-500/50' : 'border-white/10 focus:border-primary/50'}`}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{t('support.messageLabel')}</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder={creationMode === 'dispute' ? "Veuillez décrire le problème de manière précise..." : t('support.messagePlaceholder')}
                                    rows={6}
                                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all resize-none ${creationMode === 'dispute' ? 'border-rose-500/20 focus:border-rose-500/50' : 'border-white/10 focus:border-primary/50'}`}
                                />
                            </div>

                            <button
                                onClick={handleCreate}
                                disabled={sending || !subject.trim() || !message.trim()}
                                className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50 ${creationMode === 'dispute' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-primary text-white shadow-lg shadow-primary/20'}`}
                            >
                                {sending ? '...' : (
                                    <>
                                        <Send size={14} />
                                        {creationMode === 'dispute' ? 'Lancer la procédure' : t('support.send')}
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {tab === 'detail' && selectedItem && (
                        <div className="flex flex-col h-full">
                            <div className="mb-6">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        {selectedItem._ui_type === 'dispute' && <AlertTriangle size={14} className="text-rose-400" />}
                                        <h3 className="font-black text-white">{selectedItem.subject}</h3>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${statusColor(selectedItem.status)}`}>
                                        {statusLabel(selectedItem.status)}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                                    {selectedItem._ui_type === 'dispute' ? 'Litige Officiel' : 'Ticket Support'} • {new Date(selectedItem.created_at).toLocaleString()}
                                </p>
                                {selectedItem._ui_type === 'dispute' && (
                                    <div className="mt-3 p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-[11px] text-rose-300">
                                        <span className="font-black text-[9px] uppercase opacity-60 block mb-1">Catégorie</span>
                                        {selectedItem.type === 'payment' ? 'Paiement / Facturation' : 
                                         selectedItem.type === 'delivery' ? 'Livraison / Expédition' :
                                         selectedItem.type === 'product' ? 'Problème Produit' :
                                         selectedItem.type === 'service' ? 'Abus / Service' : 'Autre'}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 mb-8">
                                {selectedItem._ui_type === 'ticket' ? (
                                    selectedItem.messages.map((msg: any, idx: number) => (
                                        <div key={idx} className={`max-w-[85%] p-4 rounded-2xl ${msg.sender_id === user?.user_id ? 'bg-primary/20 ml-auto border border-primary/20' : 'bg-white/5 border border-white/10'}`}>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{msg.sender_name}</p>
                                            <p className="text-white text-sm leading-relaxed">{msg.content}</p>
                                            <p className="text-[9px] text-slate-600 mt-2 text-right">{new Date(msg.created_at || Date.now()).toLocaleTimeString()}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                                        <div className="flex items-center gap-2 mb-4 text-slate-500">
                                            <BadgeInfo size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Description initiale du litige</span>
                                        </div>
                                        <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{selectedItem.description}</p>
                                        <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                                            <div className="flex gap-3 text-[11px]">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                                                <p className="text-slate-400">Ce litige a été transmis à l'administration de Stockman.</p>
                                            </div>
                                            <div className="flex gap-3 text-[11px]">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                                                <p className="text-slate-400">Pour toute information complémentaire, veuillez attendre la résolution ou utiliser le chat direct si disponible.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {selectedItem._ui_type === 'ticket' && selectedItem.status !== 'closed' && (
                                <div className="mt-auto pt-4 border-t border-white/10">
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder={t('support.replyPlaceholder')}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-all resize-none mb-3"
                                        rows={3}
                                    />
                                    <button
                                        onClick={handleReply}
                                        disabled={replying || !replyText.trim()}
                                        className="w-full bg-primary text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                                    >
                                        {replying ? '...' : (
                                            <>
                                                <Send size={14} />
                                                {t('support.send')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
