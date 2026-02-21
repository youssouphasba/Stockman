'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, ArrowLeft, Send, MessageCircle, Loader2 } from 'lucide-react';
import { chat, ChatMessage, Conversation } from '../services/api';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    partnerId?: string;
    partnerName?: string;
    currentUser: any;
}

export default function ChatModal({ isOpen, onClose, partnerId, partnerName, currentUser }: Props) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [view, setView] = useState<'list' | 'chat'>('list');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (partnerId && partnerName) {
                openDirectChat(partnerId, partnerName);
            } else {
                setView('list');
                loadConversations();
            }
        } else {
            stopPolling();
            setActiveConvo(null);
            setMessages([]);
            setView('list');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, partnerId, partnerName]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function loadConversations() {
        setLoading(true);
        try {
            const convos = await chat.listConversations();
            setConversations(convos);
        } catch {
            setConversations([]);
        } finally {
            setLoading(false);
        }
    }

    async function openDirectChat(pid: string, pname: string) {
        setLoading(true);
        setView('chat');
        try {
            const convo = await chat.createConversation(pid, pname);
            setActiveConvo(convo);
            await loadMessages(convo.conversation_id);
            startPolling(convo.conversation_id);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }

    async function openConversation(convo: Conversation) {
        setActiveConvo(convo);
        setView('chat');
        setLoading(true);
        try {
            await loadMessages(convo.conversation_id);
            startPolling(convo.conversation_id);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }

    async function loadMessages(convoId: string) {
        try {
            const result = await chat.getMessages(convoId, 0, 100);
            setMessages((result.items ?? []).reverse());
        } catch {
            setMessages([]);
        }
    }

    function startPolling(convoId: string) {
        stopPolling();
        pollRef.current = setInterval(async () => {
            try {
                const result = await chat.getMessages(convoId, 0, 100);
                setMessages((result.items ?? []).reverse());
            } catch { /* ignore */ }
        }, 5000);
    }

    function stopPolling() {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }

    async function handleSend() {
        if (!newMessage.trim() || !activeConvo || sending) return;
        const text = newMessage.trim();
        setNewMessage('');
        setSending(true);
        try {
            const msg = await chat.sendMessage(activeConvo.conversation_id, text);
            setMessages(prev => [...prev, msg]);
        } catch {
            setNewMessage(text);
        } finally {
            setSending(false);
        }
    }

    function goBackToList() {
        stopPolling();
        setActiveConvo(null);
        setMessages([]);
        setView('list');
        loadConversations();
    }

    function getPartnerName(convo: Conversation) {
        if (!currentUser) return '';
        return currentUser.user_id === convo.shopkeeper_id ? convo.supplier_name : convo.shopkeeper_name;
    }

    function getUnreadCount(convo: Conversation) {
        if (!currentUser) return 0;
        return currentUser.user_id === convo.shopkeeper_id ? convo.unread_shopkeeper : convo.unread_supplier;
    }

    function formatTime(dateStr: string) {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
        if (diffMins < 1) return "à l'instant";
        if (diffMins < 60) return `${diffMins}min`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}j`;
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-end p-6">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 glass-card w-[420px] h-[600px] flex flex-col rounded-2xl overflow-hidden border-primary/20 shadow-2xl shadow-primary/10">

                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-white/5 shrink-0">
                    {view === 'chat' && !partnerId ? (
                        <button onClick={goBackToList} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
                            <ArrowLeft size={18} />
                        </button>
                    ) : <div className="w-9" />}
                    <div className="flex-1 text-center">
                        <h3 className="font-black text-white text-xs uppercase tracking-widest">
                            {view === 'chat' && activeConvo ? getPartnerName(activeConvo) : 'Messages'}
                        </h3>
                        {view === 'chat' && activeConvo && (
                            <p className="text-[10px] text-slate-500">
                                {currentUser?.user_id === activeConvo.shopkeeper_id ? 'Fournisseur' : 'Commerçant'}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                {loading && messages.length === 0 && conversations.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 size={28} className="text-primary animate-spin" />
                    </div>

                ) : view === 'list' ? (
                    /* ── Conversations list ── */
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {conversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                                <MessageCircle size={44} className="text-slate-600" />
                                <p className="text-white font-bold text-sm">Aucune conversation</p>
                                <p className="text-slate-500 text-xs">
                                    Ouvrez le profil d'un fournisseur sur la Marketplace pour démarrer une conversation
                                </p>
                            </div>
                        ) : (
                            conversations.map(convo => {
                                const partner = getPartnerName(convo);
                                const unread = getUnreadCount(convo);
                                const initials = partner.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                                return (
                                    <button
                                        key={convo.conversation_id}
                                        onClick={() => openConversation(convo)}
                                        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 border-b border-white/5 transition-all text-left"
                                    >
                                        <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                            <span className="text-primary font-black text-sm">{initials}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center">
                                                <span className="text-white font-bold text-sm truncate">{partner}</span>
                                                {convo.last_message_at && (
                                                    <span className="text-slate-500 text-[10px] shrink-0 ml-2">{formatTime(convo.last_message_at)}</span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center mt-0.5">
                                                <span className="text-slate-400 text-xs truncate">{convo.last_message || 'Nouvelle conversation'}</span>
                                                {unread > 0 && (
                                                    <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full ml-2 shrink-0">
                                                        {unread}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                ) : (
                    /* ── Chat view ── */
                    <>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2">
                                    <MessageCircle size={28} className="text-slate-600" />
                                    <p className="text-slate-500 text-sm">Commencez la conversation !</p>
                                </div>
                            ) : (
                                messages.map(msg => {
                                    const isMe = msg.sender_id === currentUser?.user_id;
                                    return (
                                        <div key={msg.message_id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[78%] px-4 py-2 rounded-2xl ${isMe
                                                ? 'bg-primary text-white rounded-br-sm'
                                                : 'bg-white/10 text-slate-200 rounded-bl-sm border border-white/10'
                                            }`}>
                                                {!isMe && (
                                                    <p className="text-[10px] text-primary font-bold mb-1">{msg.sender_name}</p>
                                                )}
                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/60' : 'text-slate-500'}`}>
                                                    {formatTime(msg.created_at)}
                                                    {isMe && (
                                                        <span className="ml-1">{msg.read ? '✓✓' : '✓'}</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input bar */}
                        <div className="flex items-end gap-2 p-4 border-t border-white/10 bg-white/5 shrink-0">
                            <textarea
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Écrire un message... (Entrée pour envoyer)"
                                className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-primary/50 resize-none max-h-24 custom-scrollbar"
                                rows={1}
                                maxLength={1000}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!newMessage.trim() || sending}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${newMessage.trim() ? 'bg-primary hover:bg-primary/80' : 'bg-white/10'}`}
                            >
                                {sending ? (
                                    <Loader2 size={16} className="animate-spin text-white" />
                                ) : (
                                    <Send size={16} className={newMessage.trim() ? 'text-white' : 'text-slate-500'} />
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
