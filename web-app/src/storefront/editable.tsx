'use client';

// Édition des textes directement dans l'aperçu de l'éditeur visuel. Hors de l'éditeur, le texte
// est affiché normalement : aucun visiteur ne peut modifier la boutique.
import React, { useLayoutEffect, useRef } from 'react';
import { cleanInlineText } from './livePreview';

export type InlineEdit = { onEdit: (field: string, value: string) => void };

type Props = {
    as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div';
    value: string;
    field?: string;
    edit: InlineEdit | null;
    label: string;
    // Texte affiché quand le réglage est vide (par exemple le nom de la boutique) ; rappelé en
    // filigrane dans l'éditeur.
    fallback?: string;
    multiline?: boolean;
    maxLength?: number;
    className?: string;
};

export function EditableText({ as = 'span', value, field, edit, label, fallback, multiline = false, maxLength, className = '' }: Props) {
    const ref = useRef<HTMLElement | null>(null);
    const latest = useRef(value);
    const Tag = as as React.ElementType;
    useLayoutEffect(() => { latest.current = value; }, [value]);

    // Élément non contrôlé pendant la saisie : le texte reçu de l'éditeur ne déplace pas le curseur.
    useLayoutEffect(() => {
        const element = ref.current;
        if (!element || !edit) return;
        if (document.activeElement !== element && element.textContent !== value) element.textContent = value;
    }, [edit, value]);

    if (!edit || !field) return <Tag className={className}>{value || fallback || ''}</Tag>;
    return (
        <Tag
            ref={ref}
            className={`${className} sf-editable`}
            contentEditable="plaintext-only"
            suppressContentEditableWarning
            spellCheck
            role="textbox"
            aria-label={`Modifier : ${label}`}
            aria-multiline={multiline}
            data-placeholder={fallback || label}
            onClick={(event: React.MouseEvent) => event.stopPropagation()}
            onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
                if (!multiline && event.key === 'Enter') {
                    event.preventDefault();
                    event.currentTarget.blur();
                }
            }}
            onInput={(event: React.FormEvent<HTMLElement>) => {
                // innerText conserve les retours à la ligne saisis ; textContent ignore la casse affichée.
                const element = event.currentTarget;
                edit.onEdit(field, cleanInlineText(multiline ? element.innerText : element.textContent || '', multiline, maxLength));
            }}
            onBlur={(event: React.FocusEvent<HTMLElement>) => {
                // En quittant le champ, le texte affiché reprend la valeur retenue (limite de longueur comprise).
                if (event.currentTarget.textContent !== latest.current) event.currentTarget.textContent = latest.current;
            }}
        />
    );
}
