'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    // Phrase courte sous le titre.
    description?: React.ReactNode;
    children: React.ReactNode;
    // Boutons d'action affichés sous le contenu, hors de la zone qui défile.
    footer?: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '6xl' | 'full';
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Fenêtres ouvertes, de la plus ancienne à la plus récente : seule la dernière réagit à Échap et à Tab
// (par exemple une confirmation ouverte par-dessus un formulaire).
const openStack: symbol[] = [];

const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-[95vw]'
};

export default function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    maxWidth = 'md'
}: ModalProps) {
    const { t } = useTranslation();
    const titleId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    // onClose change souvent à chaque rendu : on garde la dernière version sans relancer les effets.
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!isOpen) return;
        const token = Symbol('modal');
        openStack.push(token);
        const isTop = () => openStack[openStack.length - 1] === token;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const dialog = dialogRef.current;
        // Met le focus sur la fenêtre (pas sur un champ, pour ne pas ouvrir le clavier sur téléphone).
        dialog?.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isTop()) return;
            if (e.key === 'Escape') {
                onCloseRef.current();
                return;
            }
            if (e.key !== 'Tab' || !dialog) return;
            // Garde la navigation au clavier à l'intérieur de la fenêtre.
            const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            openStack.splice(openStack.indexOf(token), 1);
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Voile */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Fenêtre */}
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={cn(
                    "relative glass-card w-full shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col outline-none",
                    maxWidthClasses[maxWidth]
                )}
            >
                {/* En-tête */}
                <div className="flex items-start justify-between gap-4 p-6 border-b theme-border bg-white/5">
                    <div className="min-w-0">
                        <h2 id={titleId} className="text-xl font-bold theme-text">{title}</h2>
                        {description ? <p className="mt-1 text-sm theme-text-muted">{description}</p> : null}
                    </div>
                    <button
                        type="button"
                        aria-label={t('modals.close')}
                        onClick={onClose}
                        className="shrink-0 p-2 hover:bg-white/10 rounded-full theme-text-muted hover:text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Contenu */}
                <div className="p-4 md:p-6 overflow-y-auto max-h-[70vh] md:max-h-[80vh]">
                    {children}
                </div>

                {footer ? (
                    <div className="flex flex-wrap items-center justify-end gap-3 border-t theme-border px-4 py-4 md:px-6">
                        {footer}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
