'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Plus, Trash2, Users, Check, X, Clock, DollarSign,
    UtensilsCrossed, Layers, RefreshCw, ChevronDown,
} from 'lucide-react';
import { tables as tablesApi } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Table {
    table_id: string;
    name: string;
    capacity: number;
    status: 'free' | 'occupied' | 'reserved' | 'cleaning';
    current_sale_id?: string;
    occupied_since?: string;
    current_amount?: number;
    covers?: number;
}

interface TableManagementProps {
    onTableSelect?: (table: Table) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { border: string; bg: string; text: string; badge: string; dot: string }> = {
    free: {
        border: 'border-[#22c55e]/50',
        bg: 'hover:bg-[#22c55e]/5',
        text: 'text-[#22c55e]',
        badge: 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30',
        dot: 'bg-[#22c55e]',
    },
    occupied: {
        border: 'border-[#f59e0b]/50',
        bg: 'hover:bg-[#f59e0b]/5',
        text: 'text-[#f59e0b]',
        badge: 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30',
        dot: 'bg-[#f59e0b]',
    },
    reserved: {
        border: 'border-[#3b82f6]/50',
        bg: 'hover:bg-[#3b82f6]/5',
        text: 'text-[#3b82f6]',
        badge: 'bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30',
        dot: 'bg-[#3b82f6]',
    },
    cleaning: {
        border: 'border-[#6b7280]/50',
        bg: 'hover:bg-[#6b7280]/5',
        text: 'text-[#6b7280]',
        badge: 'bg-[#6b7280]/15 text-[#6b7280] border-[#6b7280]/30',
        dot: 'bg-[#6b7280]',
    },
};

const STATUS_LABELS: Record<string, string> = {
    free: 'Libre',
    occupied: 'Occupée',
    reserved: 'Réservée',
    cleaning: 'Nettoyage',
};

const STATUS_CYCLE: Record<string, string> = {
    free: 'cleaning',
    occupied: 'cleaning',
    reserved: 'free',
    cleaning: 'free',
};

type FilterTab = 'all' | 'free' | 'occupied' | 'reserved' | 'cleaning';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatElapsed(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

// ─── Context Menu Component ───────────────────────────────────────────────────

interface ContextMenuProps {
    table: Table;
    position: { x: number; y: number };
    onClose: () => void;
    onStatusChange: (table: Table, status: string) => void;
    onDelete: (id: string) => void;
}

function ContextMenu({ table, position, onClose, onStatusChange, onDelete }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const statuses = ['free', 'occupied', 'reserved', 'cleaning'].filter(s => s !== table.status);

    // Ensure menu doesn't overflow viewport
    const menuStyle: React.CSSProperties = {
        position: 'fixed',
        top: Math.min(position.y, window.innerHeight - 220),
        left: Math.min(position.x, window.innerWidth - 200),
        zIndex: 9999,
    };

    return (
        <div
            ref={menuRef}
            style={menuStyle}
            className="w-48 bg-[#1E293B] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        >
            <div className="px-3 py-2 border-b border-white/10 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                {table.name}
            </div>
            <div className="py-1">
                {statuses.map(s => (
                    <button
                        key={s}
                        onClick={() => { onStatusChange(table, s); onClose(); }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2 transition-colors"
                    >
                        <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s]?.dot}`} />
                        Passer en « {STATUS_LABELS[s]} »
                    </button>
                ))}
                <div className="border-t border-white/10 my-1" />
                <button
                    onClick={() => { onDelete(table.table_id); onClose(); }}
                    className="w-full text-left px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
                >
                    <Trash2 size={13} /> Supprimer
                </button>
            </div>
        </div>
    );
}

// ─── Timer Component (refreshes independently) ────────────────────────────────

function OccupiedTimer({ since }: { since: string }) {
    const [elapsed, setElapsed] = useState(() => formatElapsed(since));

    useEffect(() => {
        const interval = setInterval(() => setElapsed(formatElapsed(since)), 30_000);
        return () => clearInterval(interval);
    }, [since]);

    return (
        <span className="font-mono text-xs font-bold text-[#f59e0b] flex items-center gap-1">
            <Clock size={11} /> {elapsed}
        </span>
    );
}

// ─── Table Card ───────────────────────────────────────────────────────────────

interface TableCardProps {
    table: Table;
    onClick: (table: Table) => void;
    onContextMenu: (table: Table, e: React.MouseEvent) => void;
}

function TableCard({ table, onClick, onContextMenu }: TableCardProps) {
    const colors = STATUS_COLORS[table.status] ?? STATUS_COLORS.free;
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        longPressTimer.current = setTimeout(() => {
            // Simulate a right-click position from touch
            const touch = e.touches[0];
            onContextMenu(table, { clientX: touch.clientX, clientY: touch.clientY } as unknown as React.MouseEvent);
        }, 600);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    return (
        <div
            onClick={() => onClick(table)}
            onContextMenu={e => { e.preventDefault(); onContextMenu(table, e); }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
            className={`
                relative bg-[#1E293B] border-2 rounded-2xl p-5 cursor-pointer
                transition-all duration-200 select-none
                ${colors.border} ${colors.bg}
                hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]
            `}
        >
            {/* Table name */}
            <div className="text-lg font-bold text-white leading-tight mb-0.5 pr-4">
                {table.name}
            </div>

            {/* Capacity */}
            <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
                <Users size={11} />
                <span>{table.capacity} couvert{table.capacity > 1 ? 's' : ''}</span>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-1.5 mb-3">
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${colors.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                    {STATUS_LABELS[table.status] ?? table.status}
                </span>
            </div>

            {/* Occupied details */}
            {table.status === 'occupied' && (
                <div className="space-y-1.5 border-t border-white/5 pt-2.5">
                    {table.occupied_since && (
                        <OccupiedTimer since={table.occupied_since} />
                    )}
                    {table.covers != null && table.covers > 0 && (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                            <UtensilsCrossed size={11} />
                            <span>{table.covers} assis</span>
                        </div>
                    )}
                    {table.current_amount != null && table.current_amount > 0 && (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                            <DollarSign size={11} />
                            <span>{formatAmount(table.current_amount)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Right-click hint */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronDown size={12} className="text-slate-600" />
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TableManagement({ onTableSelect }: TableManagementProps) {
    const [tableList, setTableList] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterTab>('all');
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCapacity, setNewCapacity] = useState(4);
    const [saving, setSaving] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ table: Table; position: { x: number; y: number } } | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    // ── Data loading ─────────────────────────────────────────────────────────

    const load = useCallback(async () => {
        try {
            const data = await tablesApi.list();
            setTableList(data || []);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Failed to load tables:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(load, 30_000);
        return () => clearInterval(interval);
    }, [load]);

    // ── Actions ───────────────────────────────────────────────────────────────

    const handleTableClick = (table: Table) => {
        if (table.status === 'free' || table.status === 'occupied') {
            onTableSelect?.(table);
        } else {
            // For reserved/cleaning, still allow selecting but also open context menu
            onTableSelect?.(table);
        }
    };

    const handleStatusChange = async (table: Table, newStatus: string) => {
        try {
            await tablesApi.update(table.table_id, { status: newStatus });
            setTableList(prev =>
                prev.map(t =>
                    t.table_id === table.table_id ? { ...t, status: newStatus as Table['status'] } : t
                )
            );
        } catch (err) {
            console.error('Failed to update table status:', err);
        }
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        try {
            const created = await tablesApi.create({ name: newName.trim(), capacity: newCapacity });
            setTableList(prev => [...prev, created]);
            setNewName('');
            setNewCapacity(4);
            setShowCreate(false);
        } catch (err) {
            console.error('Failed to create table:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cette table ? Cette action est irréversible.')) return;
        try {
            await tablesApi.delete(id);
            setTableList(prev => prev.filter(t => t.table_id !== id));
        } catch (err) {
            console.error('Failed to delete table:', err);
        }
    };

    const handleContextMenu = (table: Table, e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({ table, position: { x: e.clientX, y: e.clientY } });
    };

    // ── Derived state ─────────────────────────────────────────────────────────

    const filtered = filter === 'all' ? tableList : tableList.filter(t => t.status === filter);

    const counts = {
        free: tableList.filter(t => t.status === 'free').length,
        occupied: tableList.filter(t => t.status === 'occupied').length,
        reserved: tableList.filter(t => t.status === 'reserved').length,
        cleaning: tableList.filter(t => t.status === 'cleaning').length,
    };

    const filterTabs: { key: FilterTab; label: string; count: number }[] = [
        { key: 'all', label: 'Toutes', count: tableList.length },
        { key: 'free', label: 'Libres', count: counts.free },
        { key: 'occupied', label: 'Occupées', count: counts.occupied },
        { key: 'reserved', label: 'Réservées', count: counts.reserved },
        { key: 'cleaning', label: 'Nettoyage', count: counts.cleaning },
    ];

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#0F172A]">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0F172A]">
            {/* Context menu */}
            {contextMenu && (
                <ContextMenu
                    table={contextMenu.table}
                    position={contextMenu.position}
                    onClose={() => setContextMenu(null)}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                />
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8">

                {/* Header */}
                <header className="flex flex-wrap justify-between items-start gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1 flex items-center gap-3">
                            <Layers size={28} className="text-primary" />
                            Plan de Salle
                        </h1>
                        <p className="text-slate-400 text-sm">
                            Dernière mise à jour : {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={load}
                            className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl text-slate-400 text-sm hover:bg-white/10 transition-colors"
                            title="Rafraîchir"
                        >
                            <RefreshCw size={14} />
                        </button>
                        <button
                            onClick={() => setShowCreate(v => !v)}
                            className="btn-primary px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold"
                        >
                            <Plus size={15} />
                            Ajouter une table
                        </button>
                    </div>
                </header>

                {/* Summary bar */}
                <div className="flex flex-wrap gap-3 mb-5">
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                        <span className="font-semibold text-white">{counts.free}</span> libre{counts.free > 1 ? 's' : ''}
                    </div>
                    <span className="text-slate-700">·</span>
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                        <span className="font-semibold text-white">{counts.occupied}</span> occupée{counts.occupied > 1 ? 's' : ''}
                    </div>
                    <span className="text-slate-700">·</span>
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                        <span className="font-semibold text-white">{counts.reserved}</span> réservée{counts.reserved > 1 ? 's' : ''}
                    </div>
                    {counts.cleaning > 0 && (
                        <>
                            <span className="text-slate-700">·</span>
                            <div className="flex items-center gap-1.5 text-sm text-slate-400">
                                <span className="w-2 h-2 rounded-full bg-[#6b7280]" />
                                <span className="font-semibold text-white">{counts.cleaning}</span> nettoyage
                            </div>
                        </>
                    )}
                </div>

                {/* Create table form */}
                {showCreate && (
                    <div className="glass-card p-5 mb-6 border border-white/10 rounded-2xl">
                        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <Plus size={14} className="text-primary" /> Nouvelle table
                        </h3>
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-slate-400 font-medium">Nom / Numéro</label>
                                <input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                    placeholder="ex: Table 5, Terrasse A…"
                                    autoFocus
                                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 outline-none focus:border-primary/50 w-52 text-sm"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-slate-400 font-medium">Capacité (couverts)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={30}
                                    value={newCapacity}
                                    onChange={e => setNewCapacity(Math.max(1, Number(e.target.value)))}
                                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-primary/50 w-28 text-sm"
                                />
                            </div>
                            <button
                                onClick={handleCreate}
                                disabled={saving || !newName.trim()}
                                className="btn-primary px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Check size={15} />
                                {saving ? 'Création…' : 'Créer'}
                            </button>
                            <button
                                onClick={() => { setShowCreate(false); setNewName(''); setNewCapacity(4); }}
                                className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-400 text-sm hover:bg-white/10 flex items-center gap-1.5 transition-colors"
                            >
                                <X size={14} /> Annuler
                            </button>
                        </div>
                    </div>
                )}

                {/* Filter tabs */}
                <div className="flex gap-1 mb-5 flex-wrap">
                    {filterTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={`
                                px-3.5 py-1.5 rounded-full text-sm font-medium transition-all
                                ${filter === tab.key
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                }
                            `}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`ml-1.5 text-xs font-bold ${filter === tab.key ? 'opacity-80' : 'opacity-60'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Table grid */}
                {filtered.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        <Layers size={40} className="mx-auto mb-4 opacity-20" />
                        <p className="text-base">
                            {filter === 'all'
                                ? 'Aucune table. Cliquez sur "Ajouter une table" pour commencer.'
                                : `Aucune table avec le statut « ${STATUS_LABELS[filter]} ».`}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {filtered.map(table => (
                            <TableCard
                                key={table.table_id}
                                table={table}
                                onClick={handleTableClick}
                                onContextMenu={handleContextMenu}
                            />
                        ))}
                    </div>
                )}

                {/* Help hint */}
                <p className="mt-8 text-xs text-slate-700 text-center">
                    Clic gauche pour ouvrir la table · Clic droit (ou appui long) pour changer le statut ou supprimer
                </p>
            </div>
        </div>
    );
}
