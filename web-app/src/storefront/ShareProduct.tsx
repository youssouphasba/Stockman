'use client';

// Partage d'un produit : feuille de partage du téléphone si elle existe, sinon WhatsApp et la copie
// du lien. Le lien ouvre la page du produit, avec sa photo et son prix dans l'aperçu.
import React, { useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { productUrl } from './productLinks';

export default function ShareProduct({ slug, productId, name, className = '', disabled = false }: {
    slug: string;
    productId: string;
    name: string;
    className?: string;
    disabled?: boolean;
}) {
    const [state, setState] = useState<'idle' | 'menu' | 'copied'>('idle');
    if (disabled) return null;

    const share = async () => {
        const url = productUrl(slug, productId);
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            try {
                await navigator.share({ title: name, url });
                return;
            } catch (error) {
                // Partage annulé par le visiteur : rien d'autre à faire.
                if (error instanceof DOMException && error.name === 'AbortError') return;
            }
        }
        setState((current) => (current === 'menu' ? 'idle' : 'menu'));
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(productUrl(slug, productId));
            setState('copied');
            window.setTimeout(() => setState('idle'), 2500);
        } catch {
            setState('idle');
        }
    };

    const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${name} ${productUrl(slug, productId)}`)}`;

    return (
        <div className="relative">
            <button type="button" onClick={share} className={className} aria-label={`Partager ${name}`} aria-expanded={state === 'menu'}>
                {state === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
                <span>{state === 'copied' ? 'Lien copié' : 'Partager'}</span>
            </button>
            {state === 'menu' && (
                <div className="absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded-xl border border-black/10 bg-white text-sm text-[#111827] shadow-xl">
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => setState('idle')} className="flex items-center gap-2 px-4 py-3 font-medium hover:bg-black/5">
                        <Share2 className="h-4 w-4" aria-hidden="true" />Envoyer sur WhatsApp
                    </a>
                    <button type="button" onClick={copy} className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium hover:bg-black/5">
                        <Link2 className="h-4 w-4" aria-hidden="true" />Copier le lien
                    </button>
                </div>
            )}
        </div>
    );
}
