'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

// État vide partagé : liste sans résultat, données pas encore chargées.
// Les cellules de tableau vides gardent un simple <td> : ce composant est fait pour les zones en carte.
type EmptyStateProps = {
    icon: LucideIcon;
    title: React.ReactNode;
    message?: React.ReactNode;
    // Bouton ou lien proposé à l'utilisateur (ex. « Créer », « Charger »).
    action?: React.ReactNode;
    className?: string;
};

export default function EmptyState({ icon: Icon, title, message, action, className }: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-6 py-12 text-center', className)}>
            <Icon size={36} className="text-slate-600" aria-hidden="true" />
            <p className="mt-4 text-sm font-bold text-slate-300">{title}</p>
            {message ? <p className="mt-2 max-w-md text-sm text-slate-500">{message}</p> : null}
            {action ? <div className="mt-6">{action}</div> : null}
        </div>
    );
}
