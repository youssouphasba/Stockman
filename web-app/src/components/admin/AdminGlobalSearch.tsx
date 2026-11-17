'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Search, Store, User, X } from 'lucide-react';
import { admin as adminApi, type AdminSearchResult } from '../../services/api';

type Props = {
    onOpenUser: (user: { user_id: string; name: string; email?: string }) => void;
    onOpenSection: (section: string) => void;
};

// Recherche d'un compte, d'une boutique ou d'un ticket depuis n'importe quel onglet admin.
export default function AdminGlobalSearch({ onOpenUser, onOpenSection }: Props) {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<AdminSearchResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const term = query.trim();
        if (term.length < 2) {
            setResult(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const data = await adminApi.search(term);
                if (!cancelled) setResult(data);
            } catch {
                if (!cancelled) setResult({ query: term, users: [], stores: [], tickets: [] });
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [query]);

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                inputRef.current?.focus();
                setOpen(true);
            }
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, []);

    const close = () => { setOpen(false); setQuery(''); setResult(null); };
    const empty = result && !result.users.length && !result.stores.length && !result.tickets.length;

    return (
        <div ref={boxRef} className="relative w-full md:w-80">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-primary/60">
                <Search size={16} className="shrink-0 text-slate-500" />
                <input
                    ref={inputRef}
                    value={query}
                    onChange={event => { setQuery(event.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    placeholder="Compte, boutique, e-mail, téléphone…"
                    aria-label="Recherche admin"
                    className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
                />
                {query ? (
                    <button onClick={close} aria-label="Effacer la recherche" className="text-slate-500 hover:text-white"><X size={14} /></button>
                ) : (
                    <kbd className="hidden md:inline text-[10px] font-bold text-slate-500 border border-white/10 rounded px-1.5 py-0.5">Ctrl K</kbd>
                )}
            </div>

            {open && query.trim().length >= 2 ? (
                <div className="absolute right-0 z-40 mt-2 w-full md:w-[28rem] max-h-[70vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0F172A] shadow-2xl p-2">
                    {loading && !result ? <p className="p-3 text-sm text-slate-500">Recherche…</p> : null}
                    {empty ? <p className="p-3 text-sm text-slate-500">Aucun résultat pour « {result?.query} ».</p> : null}

                    {result?.users.length ? (
                        <Group title="Comptes">
                            {result.users.map(user => (
                                <Row
                                    key={user.user_id}
                                    icon={<User size={14} />}
                                    title={user.name}
                                    subtitle={[user.email, user.phone, user.plan].filter(Boolean).join(' · ')}
                                    onClick={() => { onOpenUser({ user_id: user.user_id, name: user.name, email: user.email }); close(); }}
                                />
                            ))}
                        </Group>
                    ) : null}

                    {result?.stores.length ? (
                        <Group title="Boutiques">
                            {result.stores.map(store => (
                                <Row
                                    key={store.store_id}
                                    icon={<Store size={14} />}
                                    title={store.name}
                                    subtitle={store.address || 'Ouvrir la fiche du propriétaire'}
                                    onClick={() => { onOpenUser({ user_id: store.user_id, name: store.name }); close(); }}
                                />
                            ))}
                        </Group>
                    ) : null}

                    {result?.tickets.length ? (
                        <Group title="Tickets support">
                            {result.tickets.map(ticket => (
                                <Row
                                    key={ticket.ticket_id}
                                    icon={<MessageSquare size={14} />}
                                    title={ticket.subject}
                                    subtitle={[ticket.user_name, ticket.status === 'open' ? 'Ouvert' : ticket.status === 'resolved' ? 'Résolu' : ticket.status].filter(Boolean).join(' · ')}
                                    onClick={() => { onOpenSection('support'); close(); }}
                                />
                            ))}
                        </Group>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="py-1">
            <p className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
            {children}
        </div>
    );
}

function Row({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
    return (
        <button onClick={onClick} className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/5">
            <span className="shrink-0 text-slate-400">{icon}</span>
            <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-white">{title}</span>
                {subtitle ? <span className="block truncate text-xs text-slate-500">{subtitle}</span> : null}
            </span>
        </button>
    );
}
