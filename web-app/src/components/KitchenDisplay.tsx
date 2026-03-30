'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    ChefHat, Clock, RefreshCw, CheckCircle2, CheckCheck,
    Utensils, Zap, Coffee, Salad, Beef,
} from 'lucide-react';

// â”€â”€â”€ API helper (request not exported from api.ts) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const API_URL = '';

async function apiRequest<T>(
    path: string,
    method: string = 'GET',
    body?: unknown
): Promise<T> {
    const hasJsonBody = body !== undefined && body !== null;
    const res = await fetch(`${API_URL}/api${path}`, {
        method,
        credentials: 'include',
        headers: {
            ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
        },
        body: hasJsonBody ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Erreur serveur' }));
        throw new Error(err.detail || 'Erreur serveur');
    }
    return res.json();
}

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface KitchenItem {
    product_id?: string;
    product_name: string;
    quantity: number;
    station?: string;
    notes?: string;
    ready?: boolean;
}

interface KitchenTicket {
    sale_id: string;
    table_name?: string;
    table_id?: string;
    kitchen_sent_at: string;
    covers?: number;
    notes?: string;
    status: string;
    items: KitchenItem[];
    // Local state only
    _localReadyItems?: Set<number>;
    _served?: boolean;
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const URGENCY_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

type StationTab = 'all' | 'entrees' | 'plats' | 'desserts' | 'boissons';

const STATION_TABS: { key: StationTab; label: string; icon: React.ReactNode; keywords: string[] }[] = [
    { key: 'all', label: 'Tout', icon: <ChefHat size={14} />, keywords: [] },
    { key: 'entrees', label: 'Entrées', icon: <Salad size={14} />, keywords: ['entrée', 'entree', 'starter', 'salade'] },
    { key: 'plats', label: 'Plats', icon: <Beef size={14} />, keywords: ['plat', 'main', 'principal', 'viande', 'poisson', 'pasta', 'grill'] },
    { key: 'desserts', label: 'Desserts', icon: <Utensils size={14} />, keywords: ['dessert', 'cake', 'glace', 'sucré'] },
    { key: 'boissons', label: 'Boissons', icon: <Coffee size={14} />, keywords: ['boisson', 'drink', 'bière', 'vin', 'eau', 'jus', 'café', 'cocktail'] },
];

const STATION_COLORS: Record<string, string> = {
    entrees: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    plats: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    desserts: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    boissons: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    default: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getStationBadgeClass(station?: string): string {
    if (!station) return STATION_COLORS.default;
    const s = (station || '').toLowerCase();
    for (const tab of STATION_TABS.slice(1)) {
        if (tab.keywords.some(kw => s.includes(kw))) {
            return STATION_COLORS[tab.key] ?? STATION_COLORS.default;
        }
    }
    return STATION_COLORS.default;
}

function detectStation(item: KitchenItem): StationTab | null {
    const text = `${item.product_name || ''} ${item.station ?? ''}`.toLowerCase();
    for (const tab of STATION_TABS.slice(1)) {
        if (tab.keywords.some(kw => text.includes(kw))) return tab.key;
    }
    return null;
}

function elapsedMs(dateStr: string): number {
    return Date.now() - new Date(dateStr).getTime();
}

function formatElapsedShort(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// â”€â”€â”€ Live Elapsed Clock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function LiveClock({ since, urgent }: { since: string; urgent: boolean }) {
    const [ms, setMs] = useState(() => elapsedMs(since));

    useEffect(() => {
        const interval = setInterval(() => setMs(elapsedMs(since)), 1000);
        return () => clearInterval(interval);
    }, [since]);

    return (
        <span className={`font-mono text-xs font-bold flex items-center gap-1 ${urgent ? 'text-rose-400' : 'text-slate-400'}`}>
            <Clock size={11} />
            {formatElapsedShort(ms)}
        </span>
    );
}

// â”€â”€â”€ Ticket Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface TicketCardProps {
    ticket: KitchenTicket;
    readyItems: Set<number>;
    onItemReady: (saleId: string, itemIdx: number, checked: boolean) => void;
    onServed: (saleId: string) => void;
}

function TicketCard({ ticket, readyItems, onItemReady, onServed }: TicketCardProps) {
    const ms = elapsedMs(ticket.kitchen_sent_at);
    const urgent = ms >= URGENCY_THRESHOLD_MS;
    const allReady = ticket.items.length > 0 && ticket.items.every((_, i) => readyItems.has(i));
    const [serving, setServing] = useState(false);

    const handleServed = async () => {
        if (serving) return;
        setServing(true);
        try {
            await apiRequest(`/sales/${ticket.sale_id}/serve`, 'POST');
        } catch {
            // Even on error, remove from local display
        }
        onServed(ticket.sale_id);
    };

    return (
        <div
            className={`
                relative bg-[#1E293B] rounded-2xl border-2 overflow-hidden
                transition-all duration-300
                ${urgent
                    ? 'border-rose-500/70 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                    : allReady
                        ? 'border-emerald-500/60 shadow-[0_0_16px_rgba(34,197,94,0.1)]'
                        : 'border-white/10'
                }
                ${urgent ? 'animate-[urgentPulse_2s_ease-in-out_infinite]' : ''}
            `}
        >
            {/* Card header */}
            <div className={`px-4 py-3 flex justify-between items-center ${urgent ? 'bg-rose-500/10' : allReady ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-white font-bold text-sm truncate">
                        {ticket.table_name ? (ticket.table_id ? `Table ${ticket.table_id}` : 'À emporter') : 'À emporter'}
                    </span>
                    {ticket.covers != null && ticket.covers > 0 && (
                        <span className="text-xs text-slate-500 shrink-0">{ticket.covers} cvt</span>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <LiveClock since={ticket.kitchen_sent_at} urgent={urgent} />
                    {urgent && (
                        <span className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded-full border border-rose-500/30">
                            <Zap size={10} /> Urgent
                        </span>
                    )}
                </div>
            </div>

            {/* Ticket ID */}
            <div className="px-4 pt-1.5 pb-0">
                <span className="text-xs text-slate-600 font-mono">
                    #{ticket.sale_id.slice(-6).toUpperCase()}
                </span>
            </div>

            {/* Notes globales */}
            {ticket.notes && (
                <div className="mx-4 mt-2 p-2 bg-amber-500/10 rounded-lg text-amber-300 text-xs flex items-start gap-1.5 border border-amber-500/20">
                    <span className="shrink-0 mt-0.5">âš </span>
                    <span>{ticket.notes}</span>
                </div>
            )}

            {/* Items list */}
            <div className="px-4 pt-3 pb-3 space-y-2">
                {ticket.items.map((item, idx) => {
                    const isReady = readyItems.has(idx);
                    return (
                        <div
                            key={idx}
                            className={`
                                flex items-start gap-2.5 p-2 rounded-xl transition-all
                                ${isReady ? 'opacity-50 bg-white/3' : 'bg-white/5'}
                            `}
                        >
                            {/* Ready checkbox */}
                            <button
                                onClick={() => onItemReady(ticket.sale_id, idx, !isReady)}
                                className={`
                                    shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                                    transition-all duration-200 mt-0.5
                                    ${isReady
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'border-white/20 hover:border-emerald-400'
                                    }
                                `}
                                title={isReady ? 'Marquer non prêt' : 'Marquer prêt'}
                            >
                                {isReady && <CheckCircle2 size={12} />}
                            </button>

                            {/* Item info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className={`text-sm font-medium truncate ${isReady ? 'line-through text-slate-500' : 'text-white'}`}>
                                        {item.product_name}
                                    </span>
                                    <span className={`text-sm font-bold shrink-0 ${isReady ? 'text-slate-600' : 'text-white'}`}>
                                        ×{item.quantity}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    {item.station && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${getStationBadgeClass(item.station)}`}>
                                            {item.station}
                                        </span>
                                    )}
                                    {item.notes && (
                                        <span className="text-xs text-amber-400/80 italic truncate">
                                            {item.notes}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="px-4 pb-4">
                {allReady ? (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/15 rounded-xl text-emerald-400 text-sm font-bold border border-emerald-500/30">
                            <CheckCircle2 size={15} /> Prêt à servir
                        </div>
                        <button
                            onClick={handleServed}
                            disabled={serving}
                            className="btn-primary px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 disabled:opacity-60"
                        >
                            <CheckCheck size={14} />
                            {serving ? '…' : 'Servi'}
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">
                            {readyItems.size}/{ticket.items.length} article{ticket.items.length > 1 ? 's' : ''} prêt{readyItems.size > 1 ? 's' : ''}
                        </span>
                        <button
                            onClick={handleServed}
                            disabled={serving}
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2 disabled:opacity-40"
                        >
                            {serving ? '…' : 'Marquer servi quand même'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function KitchenDisplay() {
    const [tickets, setTickets] = useState<KitchenTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeStation, setActiveStation] = useState<StationTab>('all');
    // Map of sale_id → Set of ready item indices
    const [readyMap, setReadyMap] = useState<Map<string, Set<number>>>(new Map());
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const loadingRef = useRef(false);
    const prevTicketCount = useRef(0);

    // â”€â”€ Data loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const load = useCallback(async (silent = false) => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        if (!silent) setLoading(true);
        try {
            const data = await apiRequest<any[]>('/kitchen/pending');
            setTickets((data || []).map((t: any) => ({
                ...t,
                items: t.items ?? [],
            })));
            setLastRefresh(new Date());
            // Alerte sonore pour nouvelles commandes
            const newCount = (data || []).length;
            if (newCount > prevTicketCount.current && prevTicketCount.current > 0) {
                try {
                    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    oscillator.frequency.value = 800;
                    oscillator.type = 'sine';
                    gainNode.gain.value = 0.3;
                    oscillator.start();
                    setTimeout(() => { oscillator.frequency.value = 1000; }, 150);
                    setTimeout(() => { oscillator.stop(); audioCtx.close(); }, 400);
                } catch {}
            }
            prevTicketCount.current = newCount;
        } catch (err) {
            console.error('Failed to load kitchen tickets:', err);
        } finally {
            loadingRef.current = false;
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        load(false);
        const interval = setInterval(() => load(true), 15_000);
        return () => clearInterval(interval);
    }, [load]);

    // â”€â”€ Item ready toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const handleItemReady = useCallback(async (saleId: string, itemIdx: number, checked: boolean) => {
        // Optimistic update
        setReadyMap(prev => {
            const next = new Map(prev);
            const set = new Set(next.get(saleId) ?? []);
            if (checked) set.add(itemIdx);
            else set.delete(itemIdx);
            next.set(saleId, set);
            return next;
        });

        // API call
        try {
            await apiRequest(`/kitchen/${saleId}/items/${itemIdx}/ready`, 'PUT', { ready: checked });
        } catch (err) {
            console.warn('Failed to mark item ready, keeping local state:', err);
        }
    }, []);

    // â”€â”€ Ticket served â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const handleServed = useCallback((saleId: string) => {
        setTickets(prev => prev.filter(t => t.sale_id !== saleId));
        setReadyMap(prev => {
            const next = new Map(prev);
            next.delete(saleId);
            return next;
        });
    }, []);

    // â”€â”€ Station filtering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const filteredTickets = activeStation === 'all'
        ? tickets
        : tickets.filter(ticket =>
            ticket.items.some(item => {
                const detected = detectStation(item);
                return detected === activeStation || item.station?.toLowerCase().includes(activeStation);
            })
          );

    // Count urgents
    const urgentCount = tickets.filter(t => elapsedMs(t.kitchen_sent_at) >= URGENCY_THRESHOLD_MS).length;

    // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0F172A]">
            {/* Inject urgentPulse keyframe */}
            <style>{`
                @keyframes urgentPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                    50% { box-shadow: 0 0 12px 4px rgba(239, 68, 68, 0.2); }
                }
            `}</style>

            <div className="flex-1 overflow-y-auto p-6 lg:p-8">

                {/* Header */}
                <header className="flex flex-wrap justify-between items-start gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1 flex items-center gap-3">
                            <ChefHat size={28} className="text-primary" />
                            Affichage Cuisine
                        </h1>
                        <p className="text-slate-400 text-sm flex items-center gap-3">
                            <span>
                                {tickets.length} commande{tickets.length > 1 ? 's' : ''} en attente
                            </span>
                            {urgentCount > 0 && (
                                <span className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                                    <Zap size={10} /> {urgentCount} urgent{urgentCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">
                            {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <button
                            onClick={() => load(false)}
                            className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl text-slate-400 text-sm hover:bg-white/10 transition-colors"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </header>

                {/* Station tabs */}
                <div className="flex gap-1 mb-6 flex-wrap">
                    {STATION_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveStation(tab.key)}
                            className={`
                                flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all
                                ${activeStation === tab.key
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                }
                            `}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        <ChefHat size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-base">
                            {tickets.length === 0
                                ? 'Aucune commande en attente en cuisine'
                                : `Aucune commande pour la station « ${STATION_TABS.find(t => t.key === activeStation)?.label} »`
                            }
                        </p>
                        <p className="text-sm mt-1 opacity-60">Rafraîchissement automatique toutes les 15 secondes</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredTickets.map(ticket => (
                            <TicketCard
                                key={ticket.sale_id}
                                ticket={ticket}
                                readyItems={readyMap.get(ticket.sale_id) ?? new Set()}
                                onItemReady={handleItemReady}
                                onServed={handleServed}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
