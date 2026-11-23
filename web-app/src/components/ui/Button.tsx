'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

// Bouton partagé de l'application web.
// - primary : action principale de la zone (une seule par zone de préférence) ;
// - secondary : action neutre (annuler, fermer, exporter) ;
// - soft : action secondaire mise en avant, teintée de vert ;
// - ghost : action discrète dans une barre d'outils ;
// - danger : suppression ou action irréversible.
// Le type HTML n'est pas imposé : sans `type`, un bouton dans un formulaire le soumet, comme un <button> natif.
export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    secondary: 'border border-white/10 bg-white/5 text-white hover:bg-white/10',
    soft: 'bg-primary/10 text-primary hover:bg-primary hover:text-white',
    ghost: 'text-slate-400 hover:bg-white/5 hover:text-white',
    danger: 'bg-rose-500 text-white hover:bg-rose-600',
};

const SIZES: Record<ButtonSize, string> = {
    sm: 'min-h-9 px-3 py-1.5 text-xs',
    md: 'min-h-11 px-4 py-2.5 text-sm',
    lg: 'min-h-12 px-6 py-3 text-sm',
    icon: 'h-11 w-11 p-0',
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    // Affiche un indicateur, désactive le bouton et conserve sa largeur.
    loading?: boolean;
    ref?: React.Ref<HTMLButtonElement>;
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
    return cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
    );
}

export default function Button({ variant = 'primary', size = 'md', loading = false, disabled, className, children, ...props }: ButtonProps) {
    return (
        <button
            {...props}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={buttonClass(variant, size, className)}
        >
            {loading ? <Loader2 size={16} className="animate-spin shrink-0" aria-hidden="true" /> : null}
            {children}
        </button>
    );
}
