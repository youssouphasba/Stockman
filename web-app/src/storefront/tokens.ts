// Jetons de style des modèles à sections : palettes sémantiques, contraste calculé et formes.
// La couleur de marque enregistrée n'est jamais remplacée : un contour la rend visible si besoin.
import type { CSSProperties } from 'react';
import { enumSetting, type ThemeSettings } from './types';

type Palette = { bg: string; surface: string; text: string; muted: string; border: string; overlay: string };

const PALETTES: Record<'light' | 'cream' | 'dark', Palette> = {
    light: { bg: '#FFFFFF', surface: '#F5F6F8', text: '#111827', muted: '#4B5563', border: '#E5E7EB', overlay: 'rgba(17, 24, 39, 0.55)' },
    cream: { bg: '#FBF8F3', surface: '#F2ECE2', text: '#1F1A14', muted: '#5C5246', border: '#E4DBCC', overlay: 'rgba(31, 26, 20, 0.5)' },
    dark: { bg: '#0F1217', surface: '#181C23', text: '#F3F4F6', muted: '#AEB6C2', border: '#2B313B', overlay: 'rgba(0, 0, 0, 0.55)' },
};

const DEFAULT_ACCENT: Record<keyof typeof PALETTES, string> = { light: '#111827', cream: '#2F2419', dark: '#F3F4F6' };

function channel(value: number) {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
    const match = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!match) return 0;
    const value = parseInt(match[1], 16);
    return 0.2126 * channel((value >> 16) & 255) + 0.7152 * channel((value >> 8) & 255) + 0.0722 * channel(value & 255);
}

export function contrastRatio(first: string, second: string): number {
    const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (light + 0.05) / (dark + 0.05);
}

// Le meilleur des deux textes atteint toujours au moins 4,5:1, quelle que soit la couleur de fond.
export function readableTextOn(background: string): string {
    return contrastRatio(background, '#FFFFFF') >= contrastRatio(background, '#111111') ? '#FFFFFF' : '#111111';
}

function withAlpha(hex: string, alpha: number) {
    const value = parseInt(hex.slice(1), 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

export type StorefrontTokens = {
    style: CSSProperties;
    scheme: keyof typeof PALETTES;
    accent: string;
    onAccent: string;
    // Contour ajouté aux actions quand la couleur de marque se distingue mal du fond (WCAG 1.4.11).
    accentNeedsOutline: boolean;
};

export function buildTokens(settings: ThemeSettings, brandColor: string | null | undefined): StorefrontTokens {
    const scheme = enumSetting(settings, 'color_scheme', ['light', 'cream', 'dark'] as const, 'light');
    const palette = PALETTES[scheme];
    const accent = brandColor && /^#[0-9a-f]{6}$/i.test(brandColor) ? brandColor.toUpperCase() : DEFAULT_ACCENT[scheme];
    const square = enumSetting(settings, 'corner_style', ['rounded', 'square'] as const, 'rounded') === 'square';
    const style = {
        '--sf-bg': palette.bg,
        '--sf-surface': palette.surface,
        '--sf-text': palette.text,
        '--sf-muted': palette.muted,
        '--sf-border': palette.border,
        '--sf-overlay': palette.overlay,
        '--sf-accent': accent,
        '--sf-on-accent': readableTextOn(accent),
        '--sf-accent-soft': withAlpha(accent, scheme === 'dark' ? 0.22 : 0.1),
        '--sf-radius': square ? '2px' : '14px',
        '--sf-radius-lg': square ? '4px' : '24px',
        '--sf-radius-pill': square ? '2px' : '999px',
    } as CSSProperties;
    return { style, scheme, accent, onAccent: readableTextOn(accent), accentNeedsOutline: contrastRatio(accent, palette.bg) < 3 };
}

export const FONT_PAIRINGS = ['modern', 'editorial', 'friendly', 'technical'] as const;
export type FontPairing = typeof FONT_PAIRINGS[number];
