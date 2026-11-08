'use client';

// Styles prêts à l'emploi d'un modèle, montrés sous forme de miniatures abstraites (couleurs,
// angles) : aucun contenu de démonstration. Commun au panneau d'apparence et à l'éditeur visuel.
import React from 'react';
import { Check } from 'lucide-react';
import type { ThemeField, ThemePreset } from '../lib/ecommerceAppearance';

const SCHEMES: Record<string, { bg: string; surface: string; text: string; muted: string }> = {
    light: { bg: '#FFFFFF', surface: '#F5F6F8', text: '#111827', muted: '#9CA3AF' },
    cream: { bg: '#FBF8F3', surface: '#F2ECE2', text: '#1F1A14', muted: '#A39684' },
    dark: { bg: '#0F1217', surface: '#181C23', text: '#F3F4F6', muted: '#6B7280' },
};

export default function ThemePresetPicker({ presets, fields, active, brandColor, disabled, onApply }: {
    presets: ThemePreset[];
    fields: ThemeField[];
    active: string | null;
    brandColor?: string;
    disabled: boolean;
    onApply: (preset: ThemePreset) => void;
}) {
    const optionLabel = (key: string, value: string) => fields.find((field) => field.scope === 'global' && field.key === key)?.options?.find((option) => option.value === value)?.label;
    return (
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Styles prêts à l'emploi">
            {presets.map((preset) => {
                const scheme = SCHEMES[preset.settings.color_scheme] || SCHEMES.light;
                const square = preset.settings.corner_style === 'square';
                const accent = brandColor && /^#[0-9A-F]{6}$/i.test(brandColor) ? brandColor : scheme.text;
                const selected = active === preset.id;
                const summary = Object.entries(preset.settings).map(([key, value]) => optionLabel(key, value)).filter(Boolean).join(' · ');
                return (
                    <button
                        key={preset.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={disabled}
                        onClick={() => onApply(preset)}
                        className={`flex flex-col gap-3 rounded-2xl border p-3 text-left transition disabled:opacity-60 ${selected ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                    >
                        <span aria-hidden="true" className="block overflow-hidden border border-white/10" style={{ background: scheme.bg, borderRadius: square ? 4 : 14 }}>
                            <span className="block h-2.5" style={{ background: accent }} />
                            <span className="flex flex-col gap-1.5 p-3">
                                <span className="block h-2.5 w-3/4" style={{ background: scheme.text, borderRadius: square ? 1 : 999 }} />
                                <span className="block h-2 w-1/2" style={{ background: scheme.muted, borderRadius: square ? 1 : 999 }} />
                                <span className="mt-1 grid grid-cols-3 gap-1.5">
                                    {[0, 1, 2].map((index) => <span key={index} className="block h-7" style={{ background: scheme.surface, borderRadius: square ? 2 : 8 }} />)}
                                </span>
                            </span>
                        </span>
                        <span className="flex items-center justify-between gap-2 text-sm font-black text-white">
                            {preset.label}
                            {selected && <Check size={16} className="text-primary" aria-hidden="true" />}
                        </span>
                        <span className="text-xs leading-5 text-slate-400">{summary}</span>
                    </button>
                );
            })}
        </div>
    );
}
