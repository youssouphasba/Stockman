'use client';

import React from 'react';
import { ImageIcon, Images, Minus, Plus } from 'lucide-react';
import { THEME_COLOR_SWATCHES, type ThemeField, type ThemeMediaItem } from '../lib/ecommerceAppearance';

const inputClass = 'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-primary/50 disabled:opacity-60';
const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-50';

// Champ de réglage commun au panneau d'apparence et à l'éditeur visuel, généré depuis le registre.
export default function ThemeFieldInput({ field, value, disabled, media, onChange, onPick }: {
    field: ThemeField;
    value: string;
    disabled: boolean;
    media?: ThemeMediaItem | null;
    onChange: (value: string) => void;
    onPick?: () => void;
}) {
    if (field.type === 'media_id') {
        return (
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    {media?.thumbnail_url ? (
                        // Les médias sont déjà optimisés en WebP par le serveur.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={media.thumbnail_url} alt={media.alt || field.label} width={64} height={64} className="h-16 w-16 object-cover" />
                    ) : (
                        <ImageIcon size={22} className="text-slate-500" aria-label={value ? 'Image indisponible' : 'Aucune image'} />
                    )}
                </div>
                {!disabled && onPick && (
                    <button type="button" className={secondaryButton} onClick={onPick}>
                        <Images size={16} />{value ? "Changer l'image" : 'Choisir une image'}
                    </button>
                )}
                {!disabled && value && <button type="button" className={secondaryButton} onClick={() => onChange('')}>Retirer</button>}
            </div>
        );
    }
    if (field.type === 'color' || field.type === 'enum') {
        const options = field.type === 'color' ? THEME_COLOR_SWATCHES.map((swatch) => ({ value: swatch.value, label: swatch.label })) : field.options || [];
        const current = field.type === 'color' ? value.toUpperCase() : value;
        const custom = field.type === 'color' && current && !options.some((option) => option.value === current);
        return (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3" role="radiogroup" aria-label={field.label}>
                {options.map((option) => {
                    const active = current === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={disabled}
                            onClick={() => onChange(option.value)}
                            className={`flex min-h-11 items-center gap-2 rounded-2xl border px-3 text-left text-sm font-bold transition disabled:opacity-60 ${active ? 'border-primary bg-primary/10 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                        >
                            {field.type === 'color' && <span className="h-5 w-5 shrink-0 rounded-full border border-white/20" style={{ backgroundColor: option.value }} />}
                            {option.label}
                        </button>
                    );
                })}
                {custom && (
                    <span className="flex min-h-11 items-center gap-2 rounded-2xl border border-primary bg-primary/10 px-3 text-sm font-bold text-white">
                        <span className="h-5 w-5 shrink-0 rounded-full border border-white/20" style={{ backgroundColor: current }} />
                        Couleur actuelle {current}
                    </span>
                )}
            </div>
        );
    }
    if (field.type === 'boolean') {
        const checked = value === 'true';
        return (
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold text-white">
                <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked ? 'true' : 'false')} className="h-5 w-5 accent-[#10B981]" />
                {checked ? 'Activé' : 'Désactivé'}
            </label>
        );
    }
    if (field.type === 'integer') {
        const min = field.min ?? 0;
        const max = field.max ?? 99;
        const number = value ? Number(value) : min;
        const step = (delta: number) => onChange(String(Math.min(max, Math.max(min, number + delta))));
        return (
            <div className="flex items-center gap-3">
                <button type="button" aria-label={`Diminuer : ${field.label}`} className={secondaryButton} disabled={disabled || number <= min} onClick={() => step(-1)}><Minus size={16} /></button>
                <span className="min-w-10 text-center text-base font-black text-white" aria-live="polite">{number}</span>
                <button type="button" aria-label={`Augmenter : ${field.label}`} className={secondaryButton} disabled={disabled || number >= max} onClick={() => step(1)}><Plus size={16} /></button>
                <span className="text-xs text-slate-500">de {min} à {max}</span>
            </div>
        );
    }
    const common = {
        value,
        disabled,
        maxLength: field.max_length,
        onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
        className: field.multiline ? `${inputClass} resize-none` : inputClass,
        'aria-label': field.label,
    };
    return field.multiline ? <textarea rows={3} {...common} /> : <input {...common} />;
}
