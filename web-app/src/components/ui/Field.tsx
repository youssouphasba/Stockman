'use client';

import React from 'react';
import { cn } from '../../lib/cn';

// Classes partagées des champs de saisie : même hauteur, même bordure, même focus partout.
export const inputClass = cn(
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors',
    'placeholder:text-slate-500 focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20',
    'disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-rose-500/60',
);
export const selectClass = cn(inputClass, 'bg-background');
export const textareaClass = cn(inputClass, 'resize-none');

type FieldProps = {
    label: React.ReactNode;
    hint?: React.ReactNode;
    // Message affiché sous le champ ; pensez à passer aussi aria-invalid au champ.
    error?: React.ReactNode;
    htmlFor?: string;
    className?: string;
    children: React.ReactNode;
};

// Étiquette, aide et erreur autour d'un champ.
export default function Field({ label, hint, error, htmlFor, className, children }: FieldProps) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <label htmlFor={htmlFor} className="text-sm font-semibold text-white">{label}</label>
            {hint ? <p className="text-xs leading-5 text-slate-500">{hint}</p> : null}
            {children}
            {error ? <p role="alert" className="text-xs font-semibold text-rose-400">{error}</p> : null}
        </div>
    );
}
