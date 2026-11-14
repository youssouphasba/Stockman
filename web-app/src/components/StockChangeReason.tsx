'use client';

import React from 'react';

export type StockChangeDirection = 'in' | 'out';

// Raisons d'un changement de stock, identiques côté serveur (STOCK_CHANGE_KINDS).
// Une vente devient une vraie vente (chiffre d'affaires) ; les autres sorties comptent dans les pertes.
export const STOCK_CHANGE_OPTIONS: Record<StockChangeDirection, { kind: string; label: string }[]> = {
    in: [
        { kind: 'restock', label: 'Réapprovisionnement' },
        { kind: 'customer_return', label: 'Retour client' },
        { kind: 'inventory_adjustment_in', label: "Ajustement d'inventaire" },
    ],
    out: [
        { kind: 'sale', label: 'Vente hors caisse' },
        { kind: 'loss_damage', label: 'Perte ou casse' },
        { kind: 'expired', label: 'Produit périmé' },
        { kind: 'theft', label: 'Vol' },
        { kind: 'internal_use', label: 'Usage interne' },
        { kind: 'inventory_adjustment_out', label: "Ajustement d'inventaire" },
        { kind: 'other_out', label: 'Autre' },
    ],
};

export const STOCK_CHANGE_SALE_HINT = 'Une vente est enregistrée au prix de vente, payée en espèces, et apparaît dans la Compta.';

export function StockChangeReasonChips({ direction, value, onChange }: {
    direction: StockChangeDirection;
    value: string | null;
    onChange: (kind: string) => void;
}) {
    const selectedTone = direction === 'in'
        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
        : 'border-amber-500 bg-amber-500/15 text-amber-300';
    return (
        <div>
            <div className="flex flex-wrap gap-2">
                {STOCK_CHANGE_OPTIONS[direction].map((option) => (
                    <button
                        key={option.kind}
                        type="button"
                        onClick={() => onChange(option.kind)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${value === option.kind ? selectedTone : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'}`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
            {value === 'sale' && <p className="mt-2 text-xs text-slate-400">{STOCK_CHANGE_SALE_HINT}</p>}
        </div>
    );
}

// Fenêtre ouverte quand la quantité d'une fiche produit a changé : on choisit la raison.
export function StockChangeReasonDialog({ open, direction, subtitle, initialKind, onSelect, onClose }: {
    open: boolean;
    direction: StockChangeDirection;
    subtitle: string;
    initialKind?: string | null;
    onSelect: (kind: string) => void;
    onClose: () => void;
}) {
    const [kind, setKind] = React.useState<string | null>(initialKind ?? null);
    React.useEffect(() => { if (open) setKind(initialKind ?? null); }, [open, direction, initialKind]);
    if (!open) return null;
    const confirmTone = direction === 'in' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-amber-500 hover:bg-amber-400';
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <h3 className="text-lg font-black text-white">Pourquoi le stock change ?</h3>
                <p className="mt-1 mb-4 text-sm text-slate-400">{subtitle}</p>
                <StockChangeReasonChips direction={direction} value={kind} onChange={setKind} />
                <div className="mt-6 flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-bold text-white hover:bg-white/5">
                        Annuler
                    </button>
                    <button
                        type="button"
                        disabled={!kind}
                        onClick={() => { if (kind) onSelect(kind); }}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-black text-white disabled:opacity-40 ${confirmTone}`}
                    >
                        Valider
                    </button>
                </div>
            </div>
        </div>
    );
}
