'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, Trash2, Bot, User } from 'lucide-react';
import { ai } from '../services/api';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentUser: any;
}

const WELCOME: Message = {
    id: 'welcome',
    role: 'assistant',
    content: "Bonjour ! Je suis votre assistant Stockman alimenté par l'IA. Posez-moi n'importe quelle question sur votre stock, vos ventes, votre comptabilité ou demandez-moi des conseils.",
};

export default function AiChatPanel({ isOpen, onClose, currentUser }: Props) {
    const [messages, setMessages] = useState<Message[]>([WELCOME]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const lang = currentUser?.language || 'fr';

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;
        setInput('');

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
        const history = messages.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, content: m.content }));

        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            const res = await ai.support(text, history, lang);
            setMessages(prev => [...prev, { id: Date.now().toString() + '_ai', role: 'assistant', content: res.response }]);
        } catch {
            setMessages(prev => [...prev, { id: Date.now().toString() + '_err', role: 'assistant', content: "Désolé, une erreur est survenue. Réessayez." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    const clearHistory = () => setMessages([WELCOME]);

    // Simple markdown-ish: bold **text** and line breaks
    const renderContent = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, i) => {
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            return (
                <p key={i} className={i > 0 ? 'mt-1' : ''}>
                    {parts.map((part, j) =>
                        part.startsWith('**') && part.endsWith('**')
                            ? <strong key={j} className="font-bold text-white">{part.slice(2, -2)}</strong>
                            : <span key={j}>{part}</span>
                    )}
                </p>
            );
        });
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />}

            {/* Panel */}
            <div className={`fixed right-0 top-0 h-screen w-full sm:w-[420px] z-50 flex flex-col bg-[#0F172A] border-l border-white/10 shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Sparkles size={18} className="text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="text-white font-black text-sm">Assistant Stockman IA</p>
                        <p className="text-slate-500 text-xs">Propulsé par Gemini</p>
                    </div>
                    <button onClick={clearHistory} className="p-2 text-slate-600 hover:text-slate-400 transition-colors" title="Effacer l'historique">
                        <Trash2 size={15} />
                    </button>
                    <button onClick={onClose} className="p-2 text-slate-600 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-primary/20' : 'bg-white/5'}`}>
                                {msg.role === 'user'
                                    ? <User size={13} className="text-primary" />
                                    : <Bot size={13} className="text-slate-400" />}
                            </div>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                msg.role === 'user'
                                    ? 'bg-primary/20 text-white rounded-tr-sm'
                                    : 'bg-white/5 text-slate-300 rounded-tl-sm'
                            }`}>
                                {renderContent(msg.content)}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-3">
                            <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                <Bot size={13} className="text-slate-400" />
                            </div>
                            <div className="bg-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                                <Loader2 size={14} className="text-primary animate-spin" />
                                <span className="text-slate-500 text-sm">Réflexion en cours…</span>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="px-4 py-4 border-t border-white/10 shrink-0">
                    <div className="flex gap-2 items-end">
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder="Posez votre question…"
                            disabled={loading}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 disabled:opacity-50 resize-none"
                        />
                        <button
                            onClick={send}
                            disabled={!input.trim() || loading}
                            className="p-3 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                    <p className="text-slate-700 text-[11px] mt-2 text-center">Entrée pour envoyer · Shift+Entrée pour saut de ligne</p>
                </div>
            </div>
        </>
    );
}
