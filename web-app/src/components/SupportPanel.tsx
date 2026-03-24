'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Plus, MessageCircle, ChevronLeft, CheckCircle } from 'lucide-react';
import { support } from '../services/api';

interface SupportPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SupportPanel({ isOpen, onClose }: SupportPanelProps) {
    const { t } = useTranslation();
    const [tab, setTab] = useState<'list' | 'new' | 'detail'>('list');
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);

    // New ticket form
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    // Reply
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);

    useEffect(() => {
        if (isOpen) loadTickets();
    }, [isOpen]);

    const loadTickets = async () => {
        setLoading(true);
        try {
            const result = await support.getMyTickets();
            setTickets(Array.isArray(result) ? result : []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    const handleCreate = async () => {
        if (!subject.trim() || !message.trim()) return;
        setSending(true);
        try {
            await support.createTicket(subject, message);
            setSubject('');
            setMessage('');
            setTab('list');
            loadTickets();
        } catch {
            alert(t('support.createError'));
        } finally {
            setSending(false);
        }
    };

    const handleReply = async () => {
        if (!selectedTicket || !replyText.trim()) return;
        setReplying(true);
        try {
            const updated = await support.replyTicket(selectedTicket.ticket_id, replyText);
            setSelectedTicket(updated);
            setReplyText('');
            loadTickets();
        } catch {
            alert(t('support.replyError'));
        } finally {
            setReplying(false);
        }
    };

    const openTicket = (ticket: any) => {
        setSelectedTicket(ticket);
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
                        <button onClick={() => { setTab('list'); setSelectedTicket(null); }} className="flex items-center gap-2 text-slate-400 hover:text-white">
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
                            onClick={() => setTab('list')}
                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tab === 'list' ? 'bg-primary text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                        >
                            {t('support.myTickets')}
                        </button>
                        <button
                            onClick={() => setTab('new')}
                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${tab === 'new' ? 'bg-primary text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                        >
                            <Plus size={14} /> {t('support.newTicket')}
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {tab === 'list' && (
                        loading ? (
                            <div className="flex justify-center py-20">
                                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="text-center py-20">
                                <MessageCircle size={48} className="mx-auto text-slate-700 mb-4" />
                                <p className="text-slate-500 font-bold">{t('support.noTickets')}</p>
                                <button onClick={() => setTab('new')} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90">
                                    {t('support.createFirst')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tickets.map((ticket) => {
                                    const lastMsg = ticket.messages?.[ticket.messages.length - 1];
                                    const hasAdminReply = ticket.messages?.some((m: any) => m.sender_name === 'Admin Stockman');
                                    return (
                                        <button
                                            key={ticket.ticket_id}
                                            onClick={() => openTicket(ticket)}
                                            className="w-full text-left bg-white/5 border border-white/5 p-4 rounded-2xl hover:bg-white/10 transition-all"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="font-bold text-white text-sm truncate flex-1 mr-2">{ticket.subject}</p>
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${statusColor(ticket.status)}`}>
                                                    {statusLabel(ticket.status)}
                                                </span>
                                            </div>
                                            {lastMsg && (
                                                <p className="text-xs text-slate-400 truncate">
                                                    {lastMsg.sender_name === 'Admin Stockman' ? 'Support: ' : ''}{lastMsg.content}
                                                </p>
                                            )}
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-[10px] text-slate-600">
                                                    {new Date(ticket.updated_at).toLocaleDateString()}
                                                </span>
                                                {hasAdminReply && (
                                                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                                                        <CheckCircle size={10} /> {t('support.replied')}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {tab === 'new' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{t('support.subjectLabel')}</label>
                                <input
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder={t('support.subjectPlaceholder')}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{t('support.messageLabel')}</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder={t('support.messagePlaceholder')}
                                    rows={5}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-primary resize-none"
                                />
                            </div>
                            <button
                                onClick={handleCreate}
                                disabled={sending || !subject.trim() || !message.trim()}
                                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {sending ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <><Send size={16} /> {t('support.send')}</>
                                )}
                            </button>
                        </div>
                    )}

                    {tab === 'detail' && selectedTicket && (
                        <div className="space-y-3">
                            <div className="mb-4">
                                <h3 className="font-bold text-white text-base">{selectedTicket.subject}</h3>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${statusColor(selectedTicket.status)}`}>
                                    {statusLabel(selectedTicket.status)}
                                </span>
                            </div>
                            {(selectedTicket.messages || []).map((msg: any, idx: number) => {
                                const isAdmin = msg.sender_name === 'Admin Stockman';
                                return (
                                    <div
                                        key={msg.message_id || idx}
                                        className={`p-4 rounded-2xl border max-w-[90%] ${isAdmin
                                            ? 'bg-primary/10 border-primary/20 mr-auto'
                                            : 'bg-white/5 border-white/5 ml-auto'
                                        }`}
                                    >
                                        <p className={`text-[10px] font-black mb-1 ${isAdmin ? 'text-primary' : 'text-slate-500'}`}>
                                            {isAdmin ? 'Stockman Support' : t('support.you')}
                                        </p>
                                        <p className="text-sm text-white leading-relaxed">{msg.content}</p>
                                        <p className="text-[9px] text-slate-600 mt-2 text-right">
                                            {new Date(msg.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Reply input for detail view */}
                {tab === 'detail' && selectedTicket && selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                    <div className="px-6 py-4 border-t border-white/10 flex gap-2">
                        <input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={t('support.replyPlaceholder')}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-primary"
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply()}
                        />
                        <button
                            onClick={handleReply}
                            disabled={replying || !replyText.trim()}
                            className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all"
                        >
                            {replying ? (
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send size={16} />
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
