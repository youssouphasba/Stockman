'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Plus,
    Trash2,
    Users,
    Check,
    X,
    Clock,
    DollarSign,
    UtensilsCrossed,
    Layers,
    RefreshCw,
    ChevronDown,
} from 'lucide-react';
import { tables as tablesApi } from '../services/api';

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
    occupied: 'Occupee',
    reserved: 'Reservee',
    cleaning: 'Nettoyage',
};

const TABLE_ACTIONS: Record<Table['status'], Array<{ action: 'reserve' | 'seat' | 'clean' | 'free'; label: string }>> = {
    free: [
        { action: 'reserve', label: 'Reserver' },
        { action: 'seat', label: 'Installer' },
    ],
    reserved: [
        { action: 'seat', label: 'Marquer arrivee' },
        { action: 'free', label: 'Liberer' },
    ],
    occupied: [
        { action: 'clean', label: 'Passer en nettoyage' },
    ],
    cleaning: [
        { action: 'free', label: 'Marquer propre' },
        { action: 'reserve', label: 'Reserver' },
    ],
};

type FilterTab = 'all' | 'free' | 'occupied' | 'reserved' | 'cleaning';

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

interface ContextMenuProps {
    table: Table;
    position: { x: number; y: number };
    onClose: () => void;
    onAction: (table: Table, action: 'reserve' | 'seat' | 'clean' | 'free') => void;
    onDelete: (id: string) => void;
}

function ContextMenu({ table, position, onClose, onAction, onDelete }: ContextMenuProps) {
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

    const actions = TABLE_ACTIONS[table.status] || [];
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
            className="w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1E293B] shadow-2xl"
        >
            <div className="border-b border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {table.name}
            </div>
            <div className="py-1">
                {actions.map(({ action, label }) => {
                    const targetStatus =
                        action === 'seat'
                            ? 'occupied'
                            : action === 'clean'
                                ? 'cleaning'
                                : action === 'reserve'
                                    ? 'reserved'
                                    : 'free';
                    return (
                        <button
                            key={action}
                            onClick={() => {
                                onAction(table, action);
                                onClose();
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-white/5"
                        >
                            <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[targetStatus]?.dot}`} />
                            {label}
                        </button>
                    );
                })}
                <div className="my-1 border-t border-white/10" />
                <button
                    onClick={() => {
                        onDelete(table.table_id);
                        onClose();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-400 transition-colors hover:bg-rose-500/10"
                >
                    <Trash2 size={13} /> Supprimer
                </button>
            </div>
        </div>
    );
}

function OccupiedTimer({ since }: { since: string }) {
    const [elapsed, setElapsed] = useState(() => formatElapsed(since));

    useEffect(() => {
        const interval = setInterval(() => setElapsed(formatElapsed(since)), 30_000);
        return () => clearInterval(interval);
    }, [since]);

    return (
        <span className="flex items-center gap-1 font-mono text-xs font-bold text-[#f59e0b]">
            <Clock size={11} /> {elapsed}
        </span>
    );
}

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
            const touch = e.touches[0];
            onContextMenu(table, {
                clientX: touch.clientX,
                clientY: touch.clientY,
            } as unknown as React.MouseEvent);
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
            onContextMenu={e => {
                e.preventDefault();
                onContextMenu(table, e);
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
            className={`
                group relative cursor-pointer select-none rounded-2xl border-2 bg-[#1E293B] p-5
                transition-all duration-200
                ${colors.border} ${colors.bg}
                hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]
            `}
        >
            <div className="mb-0.5 pr-4 text-lg font-bold leading-tight text-white">
                {table.name}
            </div>

            <div className="mb-3 flex items-center gap-1 text-xs text-slate-400">
                <Users size={11} />
                <span>{table.capacity} couvert{table.capacity > 1 ? 's' : ''}</span>
            </div>

            <div className="mb-3 flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${colors.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                    {STATUS_LABELS[table.status] ?? table.status}
                </span>
            </div>

            {table.status === 'occupied' && (
                <div className="space-y-1.5 border-t border-white/5 pt-2.5">
                    {table.occupied_since && <OccupiedTimer since={table.occupied_since} />}
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

            <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                <ChevronDown size={12} className="text-slate-600" />
            </div>
        </div>
    );
}

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

    const handleTableClick = (table: Table) => {
        onTableSelect?.(table);
    };

    const handleTableAction = async (table: Table, action: 'reserve' | 'seat' | 'clean' | 'free') => {
        try {
            const updated = action === 'seat'
                ? await tablesApi.seat(table.table_id, { covers: table.covers })
                : await tablesApi.act(table.table_id, action);

            setTableList(prev =>
                prev.map(t => (t.table_id === table.table_id ? { ...t, ...(updated || {}) } : t))
            );
        } catch (err: any) {
            console.error('Failed to run table action:', err);
            window.alert(err?.message || 'Impossible de mettre a jour la table.');
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
        if (!confirm('Supprimer cette table ? Cette action est irreversible.')) return;
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
        { key: 'occupied', label: 'Occupees', count: counts.occupied },
        { key: 'reserved', label: 'Reservees', count: counts.reserved },
        { key: 'cleaning', label: 'Nettoyage', count: counts.cleaning },
    ];

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center bg-[#0F172A]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col overflow-hidden bg-[#0F172A]">
            {contextMenu && (
                <ContextMenu
                    table={contextMenu.table}
                    position={contextMenu.position}
                    onClose={() => setContextMenu(null)}
                    onAction={handleTableAction}
                    onDelete={handleDelete}
                />
            )}

            <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="mb-1 flex items-center gap-3 text-2xl font-bold text-white lg:text-3xl">
                            <Layers size={28} className="text-primary" />
                            Plan de Salle
                        </h1>
                        <p className="text-sm text-slate-400">
                            Derniere mise a jour : {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={load}
                            className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/10"
                            title="Rafraichir"
                        >
                            <RefreshCw size={14} />
                        </button>
                        <button
                            onClick={() => setShowCreate(v => !v)}
                            className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
                        >
                            <Plus size={15} />
                            Ajouter une table
                        </button>
                    </div>
                </header>

                <div className="mb-5 flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                        <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                        <span className="font-semibold text-white">{counts.free}</span> libre{counts.free > 1 ? 's' : ''}
                    </div>
                    <span className="text-slate-700">.</span>
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                        <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
                        <span className="font-semibold text-white">{counts.occupied}</span> occupee{counts.occupied > 1 ? 's' : ''}
                    </div>
                    <span className="text-slate-700">.</span>
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                        <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
                        <span className="font-semibold text-white">{counts.reserved}</span> reservee{counts.reserved > 1 ? 's' : ''}
                    </div>
                    {counts.cleaning > 0 && (
                        <>
                            <span className="text-slate-700">.</span>
                            <div className="flex items-center gap-1.5 text-sm text-slate-400">
                                <span className="h-2 w-2 rounded-full bg-[#6b7280]" />
                                <span className="font-semibold text-white">{counts.cleaning}</span> nettoyage
                            </div>
                        </>
                    )}
                </div>

                {showCreate && (
                    <div className="glass-card mb-6 rounded-2xl border border-white/10 p-5">
                        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                            <Plus size={14} className="text-primary" /> Nouvelle table
                        </h3>
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-slate-400">Nom / Numero</label>
                                <input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                    placeholder="ex: Table 5, Terrasse A..."
                                    autoFocus
                                    className="w-52 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder-slate-600 focus:border-primary/50"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-slate-400">Capacite (couverts)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={30}
                                    value={newCapacity}
                                    onChange={e => setNewCapacity(Math.max(1, Number(e.target.value)))}
                                    className="w-28 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
                                />
                            </div>
                            <button
                                onClick={handleCreate}
                                disabled={saving || !newName.trim()}
                                className="btn-primary flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Check size={15} />
                                {saving ? 'Creation...' : 'Creer'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreate(false);
                                    setNewName('');
                                    setNewCapacity(4);
                                }}
                                className="flex items-center gap-1.5 rounded-xl bg-white/5 px-4 py-2.5 text-sm text-slate-400 transition-colors hover:bg-white/10"
                            >
                                <X size={14} /> Annuler
                            </button>
                        </div>
                    </div>
                )}

                <div className="mb-5 flex flex-wrap gap-1">
                    {filterTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={`
                                rounded-full px-3.5 py-1.5 text-sm font-medium transition-all
                                ${filter === tab.key
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}
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

                {filtered.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">
                        <Layers size={40} className="mx-auto mb-4 opacity-20" />
                        <p className="text-base">
                            {filter === 'all'
                                ? 'Aucune table. Cliquez sur "Ajouter une table" pour commencer.'
                                : `Aucune table avec le statut "${STATUS_LABELS[filter]}".`}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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

                <p className="mt-8 text-center text-xs text-slate-700">
                    Clic gauche pour ouvrir la table. Clic droit ou appui long pour lancer une action ou supprimer.
                </p>
            </div>
        </div>
    );
}
