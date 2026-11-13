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
