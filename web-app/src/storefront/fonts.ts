// Polices hébergées avec le site (aucun appel à un service tiers au chargement de la boutique).
import { Inter, Nunito, Playfair_Display, Space_Grotesk } from 'next/font/google';
import type { FontPairing } from './tokens';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--sf-font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap', variable: '--sf-font-playfair' });
const nunito = Nunito({ subsets: ['latin'], display: 'swap', variable: '--sf-font-nunito' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap', variable: '--sf-font-space' });

export const FONT_VARIABLES = [inter.variable, playfair.variable, nunito.variable, spaceGrotesk.variable].join(' ');

const PAIRINGS: Record<FontPairing, { heading: string; body: string }> = {
    modern: { heading: 'var(--sf-font-inter)', body: 'var(--sf-font-inter)' },
    editorial: { heading: 'var(--sf-font-playfair)', body: 'var(--sf-font-inter)' },
    friendly: { heading: 'var(--sf-font-nunito)', body: 'var(--sf-font-nunito)' },
    technical: { heading: 'var(--sf-font-space)', body: 'var(--sf-font-inter)' },
};

export function fontStyle(pairing: FontPairing): Record<string, string> {
    const fonts = PAIRINGS[pairing] || PAIRINGS.modern;
    return { '--sf-font-heading': `${fonts.heading}, system-ui, sans-serif`, '--sf-font-body': `${fonts.body}, system-ui, sans-serif` };
}
