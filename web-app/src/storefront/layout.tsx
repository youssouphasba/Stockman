'use client';

/* eslint-disable @next/next/no-img-element -- les médias sont déjà optimisés par Stockman. */
import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, Mail, MapPin, Menu, Phone, Search, ShoppingBag, X } from 'lucide-react';
import { booleanSetting, enumSetting, textSetting, type StorefrontPageKind, type StorefrontSite, type ThemeSettings } from './types';

export const NAVIGATION: Array<{ page: StorefrontPageKind; label: string }> = [
    { page: 'home', label: 'Accueil' },
    { page: 'catalog', label: 'Catalogue' },
    { page: 'contact', label: 'Contact' },
];

export function siteDisplayName(settings: ThemeSettings, site: StorefrontSite) {
    return textSetting(settings, 'site_name') || site.name;
}

export function AnnouncementBar({ settings, onNavigate }: { settings: ThemeSettings; onNavigate: (page: StorefrontPageKind) => void }) {
    const text = textSetting(settings, 'announcement_text');
    if (!text) return null;
    const link = enumSetting(settings, 'announcement_link', ['none', 'catalog', 'contact'] as const, 'none');
    const content = <span className="text-center text-xs font-medium tracking-wide sm:text-sm">{text}</span>;
    return (
        <div className="bg-[var(--sf-accent)] px-4 py-2.5 text-[var(--sf-on-accent)]">
            <div className="mx-auto flex max-w-7xl justify-center">
                {link === 'none' ? content : (
                    <button type="button" onClick={() => onNavigate(link)} className="underline-offset-4 hover:underline">{content}</button>
                )}
            </div>
        </div>
    );
}

function Brand({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
    return (
        <span className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            {logoUrl && <img src={logoUrl} alt="" width={44} height={44} className="h-9 w-9 shrink-0 rounded-[var(--sf-radius)] object-cover sm:h-11 sm:w-11" />}
            <span className="truncate text-base font-semibold tracking-tight text-[var(--sf-text)] [font-family:var(--sf-font-heading)] sm:text-xl">{name}</span>
        </span>
    );
}

// En-tête : ombre dès que la page défile, masqué en descendant et réaffiché en remontant.
function useHeaderScroll() {
    const [state, setState] = useState({ scrolled: false, hidden: false });
    useEffect(() => {
        let last = window.scrollY;
        let frame = 0;
        const update = () => {
            frame = 0;
            const y = Math.max(0, window.scrollY);
            const delta = y - last;
            setState((current) => {
                const scrolled = y > 8;
                const hidden = y < 140 ? false : delta > 8 ? true : delta < -8 ? false : current.hidden;
                return scrolled === current.scrolled && hidden === current.hidden ? current : { scrolled, hidden };
            });
            if (y < 140 || Math.abs(delta) > 8) last = y;
        };
        const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, []);
    return state;
}

export function Header({ settings, site, logoUrl, page, cartCount, onNavigate, onSearch, onOpenCart }: {
    settings: ThemeSettings;
    site: StorefrontSite;
    logoUrl?: string | null;
    page: StorefrontPageKind;
    cartCount: number;
    onNavigate: (page: StorefrontPageKind) => void;
    onSearch: (query: string) => void;
    onOpenCart: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [query, setQuery] = useState('');
    const scroll = useHeaderScroll();
    const closeMenuRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!menuOpen) return undefined;
        closeMenuRef.current?.focus();
        const handle = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
        window.addEventListener('keydown', handle);
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handle);
            document.body.style.overflow = previous;
        };
    }, [menuOpen]);
    const centered = enumSetting(settings, 'header_layout', ['logo-left', 'logo-center'] as const, 'logo-left') === 'logo-center';
    const showSearch = booleanSetting(settings, 'show_search', true);
    const name = siteDisplayName(settings, site);
    const navigate = (target: StorefrontPageKind) => { setMenuOpen(false); onNavigate(target); };
    const nav = (
        <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
            {NAVIGATION.map((item) => (
                <button
                    key={item.page}
                    type="button"
                    onClick={() => navigate(item.page)}
                    aria-current={page === item.page ? 'page' : undefined}
                    className={`rounded-[var(--sf-radius-pill)] px-4 py-2 text-sm font-medium transition ${page === item.page ? 'bg-[var(--sf-surface)] text-[var(--sf-text)]' : 'text-[var(--sf-muted)] hover:text-[var(--sf-text)]'}`}
                >
                    {item.label}
                </button>
            ))}
        </nav>
    );
    const search = showSearch && (
        <form role="search" className="hidden md:block" onSubmit={(event) => { event.preventDefault(); onSearch(query); }}>
            <label htmlFor="sf-search" className="sr-only">Rechercher un produit</label>
            <div className="flex items-center gap-2 rounded-[var(--sf-radius-pill)] border border-[var(--sf-border)] bg-[var(--sf-bg)] px-4 focus-within:border-[var(--sf-text)]">
                <Search className="h-4 w-4 text-[var(--sf-muted)]" aria-hidden="true" />
                <input id="sf-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher" className="h-10 w-40 bg-transparent text-sm text-[var(--sf-text)] outline-none placeholder:text-[var(--sf-muted)] xl:w-56" />
            </div>
        </form>
    );
    const cart = (
        <button type="button" onClick={onOpenCart} aria-label={`Ouvrir le panier, ${cartCount} article${cartCount > 1 ? 's' : ''}`} className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--sf-text)] hover:bg-[var(--sf-surface)]">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--sf-accent)] px-1.5 text-[11px] font-semibold leading-5 text-[var(--sf-on-accent)]">{cartCount}</span>}
        </button>
    );
    return (
        <header
            data-scrolled={scroll.scrolled ? 'true' : undefined}
            data-hidden={scroll.hidden && !menuOpen ? 'true' : undefined}
            className="sticky top-0 z-40 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--sf-bg)]/85"
        >
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:h-20 sm:gap-4 sm:px-6 lg:px-8">
                <button type="button" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu" aria-expanded={menuOpen} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--sf-text)] hover:bg-[var(--sf-surface)] lg:hidden">
                    <Menu className="h-5 w-5" aria-hidden="true" />
                </button>
                {centered ? (
                    <>
                        <div className="hidden flex-1 lg:flex">{nav}</div>
                        <button type="button" onClick={() => navigate('home')} className="mx-auto min-w-0 lg:mx-0"><Brand name={name} logoUrl={logoUrl} /></button>
                        <div className="flex flex-1 items-center justify-end gap-2">{search}{cart}</div>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={() => navigate('home')} className="min-w-0"><Brand name={name} logoUrl={logoUrl} /></button>
                        <div className="flex flex-1 justify-center">{nav}</div>
                        <div className="flex items-center gap-2">{search}{cart}</div>
                    </>
                )}
            </div>
            {menuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="sf-overlay absolute inset-0 bg-[var(--sf-overlay)]" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                    <div role="dialog" aria-modal="true" aria-label="Menu" className="sf-drawer-left relative flex h-full w-[86vw] max-w-sm flex-col overflow-y-auto bg-[var(--sf-bg)] text-[var(--sf-text)] shadow-2xl">
                        <div className="flex items-center justify-between gap-3 border-b border-[var(--sf-border)] px-5 py-4">
                            <Brand name={name} logoUrl={logoUrl} />
                            <button ref={closeMenuRef} type="button" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--sf-surface)]"><X className="h-5 w-5" aria-hidden="true" /></button>
                        </div>
                        {showSearch && (
                            <form role="search" className="px-5 pt-5" onSubmit={(event) => { event.preventDefault(); setMenuOpen(false); onSearch(query); }}>
                                <label htmlFor="sf-search-mobile" className="sr-only">Rechercher un produit</label>
                                <div className="flex items-center gap-2 rounded-[var(--sf-radius-pill)] border border-[var(--sf-border)] bg-[var(--sf-bg)] px-4 focus-within:border-[var(--sf-text)]">
                                    <Search className="h-4 w-4 text-[var(--sf-muted)]" aria-hidden="true" />
                                    <input id="sf-search-mobile" type="search" enterKeyHint="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un produit" className="h-12 w-full bg-transparent text-base outline-none placeholder:text-[var(--sf-muted)]" />
                                </div>
                            </form>
                        )}
                        <nav aria-label="Navigation mobile" className="flex flex-col px-3 pt-4">
                            {NAVIGATION.map((item) => (
                                <button key={item.page} type="button" onClick={() => navigate(item.page)} aria-current={page === item.page ? 'page' : undefined} className={`flex min-h-14 items-center justify-between rounded-[var(--sf-radius)] px-3 text-left text-xl font-semibold [font-family:var(--sf-font-heading)] ${page === item.page ? 'bg-[var(--sf-surface)]' : 'hover:bg-[var(--sf-surface)]'}`}>
                                    {item.label}
                                    <ChevronRight className="h-5 w-5 text-[var(--sf-muted)]" aria-hidden="true" />
                                </button>
                            ))}
                        </nav>
                        {(site.phone || site.email || site.address) && (
                            <div className="mt-auto space-y-3 border-t border-[var(--sf-border)] px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-sm text-[var(--sf-muted)]">
                                {site.phone && <a href={`tel:${site.phone.replace(/\s+/g, '')}`} className="flex items-center gap-3 hover:text-[var(--sf-text)]"><Phone className="h-4 w-4 shrink-0" aria-hidden="true" />{site.phone}</a>}
                                {site.email && <a href={`mailto:${site.email}`} className="flex items-center gap-3 break-all hover:text-[var(--sf-text)]"><Mail className="h-4 w-4 shrink-0" aria-hidden="true" />{site.email}</a>}
                                {site.address && <p className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{site.address}</p>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}

export function Footer({ settings, site, onNavigate }: { settings: ThemeSettings; site: StorefrontSite; onNavigate: (page: StorefrontPageKind) => void }) {
    const text = textSetting(settings, 'footer_text');
    const name = siteDisplayName(settings, site);
    return (
        <footer className="mt-20 border-t border-[var(--sf-border)] bg-[var(--sf-surface)] text-[var(--sf-text)]">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
                <div>
                    <p className="text-lg font-semibold [font-family:var(--sf-font-heading)]">{name}</p>
                    {text && <p className="mt-3 max-w-sm whitespace-pre-line text-sm leading-6 text-[var(--sf-muted)]">{text}</p>}
                </div>
                <nav aria-label="Pied de page">
                    <p className="text-sm font-semibold">Navigation</p>
                    <ul className="mt-3 space-y-2">
                        {NAVIGATION.map((item) => (
                            <li key={item.page}><button type="button" onClick={() => onNavigate(item.page)} className="text-sm text-[var(--sf-muted)] hover:text-[var(--sf-text)]">{item.label}</button></li>
                        ))}
                    </ul>
                </nav>
                <div>
                    <p className="text-sm font-semibold">Nous joindre</p>
                    <ul className="mt-3 space-y-2 text-sm text-[var(--sf-muted)]">
                        {site.address && <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{site.address}</span></li>}
                        {site.phone && <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><a href={`tel:${site.phone.replace(/\s+/g, '')}`} className="hover:text-[var(--sf-text)]">{site.phone}</a></li>}
                        {site.email && <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><a href={`mailto:${site.email}`} className="break-all hover:text-[var(--sf-text)]">{site.email}</a></li>}
                    </ul>
                </div>
            </div>
            <div className="border-t border-[var(--sf-border)] px-4 py-5 text-center text-xs text-[var(--sf-muted)]">
                © {new Date().getFullYear()} {name}
            </div>
        </footer>
    );
}

export function PreviewBanner({ expiresAt, siteEnabled }: { expiresAt?: string | null; siteEnabled?: boolean }) {
    const date = expiresAt ? new Date(expiresAt) : null;
    const time = date && !Number.isNaN(date.getTime()) ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : null;
    return (
        <div role="status" className="border-b border-[#F59E0B] bg-[#FFFBEB] px-4 py-3 text-center text-sm font-semibold leading-6 text-[#78350F]">
            Aperçu privé : ce rendu n'est visible qu'avec ce lien{time ? `, jusqu'à ${time}` : ''}. Les commandes et les messages sont désactivés.
            {siteEnabled === false ? ' Le site public est actuellement désactivé.' : ''}
        </div>
    );
}

// Dans l'aperçu seulement : cadre explicite pour une section encore vide, jamais de faux contenu.
export function EmptySectionFrame({ label }: { label: string }) {
    return (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="rounded-[var(--sf-radius-lg)] border-2 border-dashed border-[var(--sf-border)] px-6 py-10 text-center text-sm text-[var(--sf-muted)]">
                Section à compléter : {label}. Elle reste masquée sur le site public tant qu'elle est vide.
            </div>
        </div>
    );
}
