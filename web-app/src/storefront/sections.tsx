'use client';

/* eslint-disable @next/next/no-img-element -- les médias et photos de produits sont déjà optimisés par Stockman. */
import React, { useMemo, useState } from 'react';
import {
    ArrowRight, Clock, CreditCard, Gift, ImageIcon, Leaf, Mail, MapPin, MessageCircle, MessagesSquare, Pause, Phone, Play, Quote, Search, Send, ShieldCheck, Sparkles, Store, Truck,
} from 'lucide-react';
import { THEME_CONTRACT } from '../lib/ecommerceThemes';
import { accentButtonClass, ProductCard, ProductImage, type CardStyle } from './commerce-ui';
import { EditableText, type InlineEdit } from './editable';
import { EmptySectionFrame } from './layout';
import type { ContactForm, StorefrontCommerce } from './useStorefrontCommerce';
import {
    booleanSetting, enumSetting, numberSetting, textSetting,
    type StorefrontMedia, type StorefrontPageKind, type StorefrontProduct, type StorefrontSite, type ThemeBlockData, type ThemeSectionData,
} from './types';

export type MotionStyle = 'none' | 'subtle' | 'expressive';

export type SectionContext = {
    site: StorefrontSite;
    products: StorefrontProduct[];
    media: Record<string, StorefrontMedia>;
    commerce: StorefrontCommerce;
    preview: boolean;
    outline: boolean;
    motion: MotionStyle;
    pageId: string;
    // Présent uniquement dans l'aperçu de l'éditeur visuel : les textes se modifient sur place.
    edit: InlineEdit | null;
    navigate: (page: StorefrontPageKind, category?: string | null) => void;
    openProduct: (product: StorefrontProduct) => void;
    catalogQuery: string;
    catalogCategory: string | null;
};

type TextSpec = { label?: string; max_length?: number; multiline?: boolean };
type SectionSpecs = Record<string, { settings: Record<string, TextSpec>; blocks?: Record<string, { settings: Record<string, TextSpec> }> }>;
const SECTION_SPECS = THEME_CONTRACT.sections as unknown as SectionSpecs;
const CARD_STYLES = ['minimal', 'bordered', 'portrait'] as const;
const DESKTOP_COLUMNS: Record<number, string> = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' };
const PRODUCTS_PER_PAGE = 48;
// Durée d'un tour pour environ huit messages : la vitesse reste la même quel que soit leur nombre.
const MARQUEE_SECONDS = { slow: 48, normal: 32, fast: 20 } as const;
const HEADING_CLASS = 'text-2xl font-semibold tracking-tight text-[var(--sf-text)] [font-family:var(--sf-font-heading)] sm:text-3xl';

// Décalage d'apparition des éléments d'une même rangée.
function delay(index: number) {
    return { '--sf-delay': `${Math.min(index, 8) * 80}ms` } as React.CSSProperties;
}

// Texte d'un réglage de section ou de bloc, modifiable sur place dans l'éditeur visuel.
function Text({ context, section, block, settingKey, as, className, fallback }: {
    context: SectionContext;
    section: ThemeSectionData;
    block?: ThemeBlockData;
    settingKey: string;
    as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div';
    className?: string;
    fallback?: string;
}) {
    const spec = block ? SECTION_SPECS[section.type]?.blocks?.[block.type]?.settings[settingKey] : SECTION_SPECS[section.type]?.settings[settingKey];
    const settings = (block || section).settings;
    const raw = settings[settingKey];
    // Dans l'éditeur, le texte est repris tel quel pour ne pas déplacer la saisie.
    const value = context.edit ? (typeof raw === 'string' ? raw : '') : textSetting(settings, settingKey);
    const field = block ? `${context.pageId}.${section.id}.${block.id}.${settingKey}` : `${context.pageId}.${section.id}.${settingKey}`;
    return (
        <EditableText
            as={as}
            value={value}
            field={field}
            edit={context.edit}
            label={spec?.label || settingKey}
            fallback={fallback}
            multiline={!!spec?.multiline}
            maxLength={spec?.max_length}
            className={className}
        />
    );
}

function hasText(context: SectionContext, settings: Record<string, unknown>, key: string) {
    return !!context.edit || !!textSetting(settings, key);
}

function Container({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

function SectionHeading({ context, section, fallback = '', align = 'left' }: { context: SectionContext; section: ThemeSectionData; fallback?: string; align?: 'left' | 'center' }) {
    if (!hasText(context, section.settings, 'heading') && !fallback) return null;
    return (
        <div data-sf-reveal className={align === 'center' ? 'text-center' : ''}>
            <Text context={context} section={section} settingKey="heading" as="h2" fallback={fallback} className={HEADING_CLASS} />
        </div>
    );
}

function Paragraphs({ text, className = '' }: { text: string; className?: string }) {
    return (
        <div className={`space-y-4 ${className}`}>
            {text.split(/\n{2,}/).map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}
        </div>
    );
}

// Texte long : paragraphes sur le site, champ unique modifiable dans l'éditeur.
function LongText({ context, section, settingKey, className }: { context: SectionContext; section: ThemeSectionData; settingKey: string; className: string }) {
    if (context.edit) return <Text context={context} section={section} settingKey={settingKey} as="p" className={`block whitespace-pre-line ${className}`} />;
    const text = textSetting(section.settings, settingKey);
    return text ? <Paragraphs text={text} className={className} /> : null;
}

function ResponsiveImage({ media, sizes, className = '', eager = false }: { media: StorefrontMedia; sizes: string; className?: string; eager?: boolean }) {
    const variants = Object.entries(media.urls).map(([width, url]) => [Number(width), url] as const).sort((a, b) => a[0] - b[0]);
    const fallback = (variants.find(([width]) => width >= 1600) || variants[variants.length - 1])?.[1];
    return (
        <img
            src={fallback}
            srcSet={variants.map(([width, url]) => `${url} ${width}w`).join(', ')}
            sizes={sizes}
            alt={media.alt || ''}
            width={media.width}
            height={media.height}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : undefined}
            decoding="async"
            className={className}
        />
    );
}

function mediaOf(context: SectionContext, settings: Record<string, unknown>) {
    const id = settings.image_asset_id;
    return typeof id === 'string' ? context.media[id] : undefined;
}

function TargetButton({ context, section, inverted = false }: { context: SectionContext; section: ThemeSectionData; inverted?: boolean }) {
    if (!hasText(context, section.settings, 'button_label')) return null;
    const target = enumSetting(section.settings, 'button_target', ['catalog', 'contact'] as const, 'catalog');
    const className = inverted
        ? 'inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--sf-radius-pill)] bg-[#FFFFFF] px-7 text-sm font-semibold text-[#111111] transition hover:opacity-90'
        : `${accentButtonClass(context.outline)} min-h-12 px-7`;
    const content = (
        <>
            <Text context={context} section={section} settingKey="button_label" />
            <ArrowRight className="sf-arrow h-4 w-4" aria-hidden="true" />
        </>
    );
    // Dans l'éditeur, le bouton sert à modifier son texte ; vide, il reste estompé car masqué sur le site.
    if (context.edit) return <span className={`${className} ${textSetting(section.settings, 'button_label') ? '' : 'opacity-60'}`}>{content}</span>;
    return <button type="button" onClick={() => context.navigate(target)} className={className}>{content}</button>;
}

function HeroSection({ section, context, first }: { section: ThemeSectionData; context: SectionContext; first: boolean }) {
    const settings = section.settings;
    const media = mediaOf(context, settings);
    const requested = enumSetting(settings, 'layout', ['overlay', 'split', 'text'] as const, 'text');
    // Sans image, la bannière reste lisible en texte seul : aucune image de remplacement n'est inventée.
    const layout = media ? requested : 'text';
    const height = enumSetting(settings, 'height', ['compact', 'medium', 'tall'] as const, 'medium');
    const centered = enumSetting(settings, 'alignment', ['left', 'center'] as const, 'left') === 'center';
    // Hauteur plafonnée : une bannière haute reste confortable sur un grand écran vertical.
    const minHeight = { compact: 'min-h-[320px]', medium: 'min-h-[440px]', tall: 'min-h-[520px] lg:min-h-[min(72vh,760px)]' }[height];
    const tag = first ? 'h1' : 'h2';
    const heading = (className: string) => <Text context={context} section={section} settingKey="heading" as={tag} fallback={context.site.name} className={className} />;
    const subheading = (className: string) => hasText(context, settings, 'subheading') && <Text context={context} section={section} settingKey="subheading" as="p" className={`whitespace-pre-line ${className}`} />;

    if (layout === 'overlay' && media) {
        return (
            <section className={`relative isolate flex overflow-hidden ${minHeight}`}>
                <div className="absolute inset-0 -z-10 overflow-hidden">
                    <ResponsiveImage media={media} sizes="100vw" eager={first} className="sf-kenburns h-full w-full object-cover" />
                </div>
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[rgba(0,0,0,0.7)] via-[rgba(0,0,0,0.34)] to-[rgba(0,0,0,0.12)]" aria-hidden="true" />
                <Container className={`sf-hero-in flex w-full flex-col justify-end py-16 sm:py-24 ${centered ? 'items-center text-center' : ''}`}>
                    {heading('block max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-[#FFFFFF] [font-family:var(--sf-font-heading)] sm:text-6xl lg:text-7xl')}
                    {subheading('mt-6 block max-w-2xl text-base leading-7 text-[rgba(255,255,255,0.9)] sm:text-lg')}
                    <div className="mt-9"><TargetButton context={context} section={section} inverted /></div>
                </Container>
            </section>
        );
    }
    if (layout === 'split' && media) {
        return (
            <section className="overflow-hidden bg-[var(--sf-surface)]">
                <Container className={`grid items-center gap-8 py-8 sm:py-12 lg:grid-cols-2 lg:gap-16 ${height === 'compact' ? 'lg:py-14' : 'lg:py-20'}`}>
                    <div className={`sf-hero-in ${centered ? 'text-center lg:text-left' : ''}`}>
                        {heading('block text-4xl font-semibold leading-[1.08] tracking-tight text-[var(--sf-text)] [font-family:var(--sf-font-heading)] sm:text-5xl lg:text-6xl')}
                        {subheading('mt-5 block max-w-xl text-base leading-7 text-[var(--sf-muted)] sm:text-lg')}
                        <div className="mt-8"><TargetButton context={context} section={section} /></div>
                    </div>
                    <div data-sf-reveal className="order-first overflow-hidden rounded-[var(--sf-radius-lg)] bg-[var(--sf-bg)] lg:order-none">
                        <ResponsiveImage media={media} sizes="(min-width: 1024px) 50vw, 100vw" eager={first} className="sf-kenburns aspect-[4/3] h-full w-full object-cover" />
                    </div>
                </Container>
            </section>
        );
    }
    return (
        <section className={`relative flex overflow-hidden bg-[var(--sf-surface)] ${height === 'compact' ? 'min-h-[260px]' : height === 'tall' ? 'min-h-[480px]' : 'min-h-[360px]'}`}>
            <div aria-hidden="true" className="sf-float pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[var(--sf-accent-soft)] blur-3xl sm:h-[28rem] sm:w-[28rem]" />
            <div aria-hidden="true" className="sf-float pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[var(--sf-accent-soft)] opacity-70 blur-3xl [animation-delay:-7s]" />
            <Container className={`sf-hero-in relative flex w-full flex-col justify-center py-14 ${centered ? 'items-center text-center' : ''}`}>
                <span className="mb-6 h-1 w-12 rounded-full bg-[var(--sf-accent)]" aria-hidden="true" />
                {heading('block max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight text-[var(--sf-text)] [font-family:var(--sf-font-heading)] sm:text-6xl lg:text-7xl')}
                {subheading('mt-6 block max-w-2xl text-base leading-7 text-[var(--sf-muted)] sm:text-lg')}
                <div className="mt-8"><TargetButton context={context} section={section} /></div>
            </Container>
        </section>
    );
}

function useCategories(products: StorefrontProduct[]) {
    return useMemo(() => {
        const map = new Map<string, { name: string; count: number; image: StorefrontProduct | null }>();
        for (const product of products) {
            if (!product.category) continue;
            const entry = map.get(product.category) || { name: product.category, count: 0, image: null };
            entry.count += 1;
            if (!entry.image && product.image) entry.image = product;
            map.set(product.category, entry);
        }
        return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr', { numeric: true, sensitivity: 'base' }));
    }, [products]);
}

// Nombre de colonnes sur ordinateur qui évite une vignette isolée sur la dernière rangée.
function balancedColumns(count: number) {
    if (count <= 5) return Math.max(2, count);
    if (count % 3 === 0) return 3;
    if (count % 5 === 0) return 5;
    return 4;
}

function CategoryListSection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    const categories = useCategories(context.products);
    const max = numberSetting(section.settings, 'max_items', 3, 12, 6);
    const style = enumSetting(section.settings, 'style', ['tiles', 'chips'] as const, 'tiles');
    const visible = categories.slice(0, max);
    if (visible.length === 0) return context.preview ? <EmptySectionFrame label="Catégories (aucun produit classé dans une catégorie)" /> : null;
    if (style === 'chips') {
        return (
            <section className="py-8 sm:py-10">
                <Container>
                    <SectionHeading context={context} section={section} />
                    <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
                        {visible.map((category, index) => (
                            <button key={category.name} data-sf-reveal style={delay(index)} type="button" onClick={() => context.navigate('catalog', category.name)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--sf-radius-pill)] border border-[var(--sf-border)] bg-[var(--sf-bg)] px-5 text-sm font-medium text-[var(--sf-text)] transition-colors hover:border-[var(--sf-accent)] hover:bg-[var(--sf-accent-soft)]">
                                {category.name}
                                <span className="text-xs text-[var(--sf-muted)]">{category.count}</span>
                            </button>
                        ))}
                    </div>
                </Container>
            </section>
        );
    }
    return (
        <section className="py-10 sm:py-16 lg:py-20">
            <Container>
                <SectionHeading context={context} section={section} />
                <div className={`mt-8 ${SCROLLER} gap-3 sm:grid-cols-3 sm:gap-4 ${DESKTOP_COLUMNS[balancedColumns(visible.length)]} lg:gap-6`}>
                    {visible.map((category, index) => (
                        <div key={category.name} data-sf-reveal style={delay(index < 3 ? index : 0)} className="w-[44%] shrink-0 snap-start sm:w-auto">
                            <button type="button" onClick={() => context.navigate('catalog', category.name)} className="sf-card group relative block aspect-[4/5] w-full overflow-hidden rounded-[var(--sf-radius-lg)] bg-[var(--sf-surface)] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sf-accent)]">
                                {category.image ? <ProductImage product={category.image} className="transition duration-700 group-hover:scale-105" /> : null}
                                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(0,0,0,0.72)] to-transparent p-5 pt-20">
                                    <span className="block text-lg font-semibold text-[#FFFFFF] [font-family:var(--sf-font-heading)] sm:text-xl">{category.name}</span>
                                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-[rgba(255,255,255,0.88)]">
                                        {category.count} produit{category.count > 1 ? 's' : ''}
                                        <ArrowRight className="sf-arrow h-3 w-3" aria-hidden="true" />
                                    </span>
                                </span>
                            </button>
                        </div>
                    ))}
                </div>
            </Container>
        </section>
    );
}

function sortProducts(products: StorefrontProduct[], sort: 'name' | 'price_asc' | 'price_desc') {
    const sorted = [...products];
    if (sort === 'price_asc') sorted.sort((a, b) => a.selling_price - b.selling_price);
    else if (sort === 'price_desc') sorted.sort((a, b) => b.selling_price - a.selling_price);
    // Tri naturel : « Produit 2 » avant « Produit 10 ».
    else sorted.sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true, sensitivity: 'base' }));
    return sorted;
}

// Sur téléphone, une rangée peut défiler au doigt (la carte suivante dépasse pour inviter au geste) ;
// à partir de la tablette, elle redevient une grille.
const SCROLLER = 'sf-scroller -mx-4 flex snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:snap-none sm:overflow-visible sm:px-0 sm:pb-0';

function ProductList({ products, columns, cardStyle, context, reveal = true, carousel = false }: { products: StorefrontProduct[]; columns: number; cardStyle: CardStyle; context: SectionContext; reveal?: boolean; carousel?: boolean }) {
    const desktop = `sm:grid-cols-3 ${DESKTOP_COLUMNS[columns] || 'lg:grid-cols-4'}`;
    return (
        <div className={carousel ? `${SCROLLER} gap-3 ${desktop} sm:gap-x-4 sm:gap-y-8 lg:gap-x-6` : `grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 sm:gap-y-8 ${desktop} lg:gap-x-6`}>
            {products.map((product, index) => (
                // Le catalogue filtré au clavier s'affiche sans animation : la recherche reste immédiate.
                <div
                    key={product.product_id}
                    data-sf-reveal={reveal ? '' : undefined}
                    style={reveal ? delay(carousel ? (index < 3 ? index : 0) : index % columns) : undefined}
                    className={carousel ? 'w-[64%] shrink-0 snap-start sm:w-auto' : undefined}
                >
                    <ProductCard product={product} cardStyle={cardStyle} currency={context.site.currency} outline={context.outline} onOpen={context.openProduct} onAdd={context.commerce.addToCart} />
                </div>
            ))}
        </div>
    );
}

function mobileCarousel(settings: Record<string, unknown>, fallback: 'grid' | 'carousel') {
    return enumSetting(settings, 'mobile_layout', ['grid', 'carousel'] as const, fallback) === 'carousel';
}

function SeeAll({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <button type="button" onClick={onClick} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--sf-text)] underline-offset-4 hover:underline">
            {label} <ArrowRight className="sf-arrow h-4 w-4" aria-hidden="true" />
        </button>
    );
}

function ProductGridSection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    const settings = section.settings;
    const sort = enumSetting(settings, 'sort', ['name', 'price_asc', 'price_desc'] as const, 'name');
    const max = numberSetting(settings, 'max_items', 4, 48, 8);
    const products = useMemo(() => sortProducts(context.products, sort).slice(0, max), [context.products, sort, max]);
    if (products.length === 0) return context.preview ? <EmptySectionFrame label="Sélection de produits (aucun produit publié)" /> : null;
    return (
        <section className="py-10 sm:py-16 lg:py-20">
            <Container>
                <div className="flex items-end justify-between gap-4">
                    <SectionHeading context={context} section={section} />
                    {context.products.length > products.length && <SeeAll onClick={() => context.navigate('catalog')} label="Tout voir" />}
                </div>
                <div className="mt-8"><ProductList products={products} columns={numberSetting(settings, 'columns', 2, 5, 4)} cardStyle={enumSetting(settings, 'card_style', CARD_STYLES, 'minimal')} context={context} carousel={mobileCarousel(settings, 'grid')} /></div>
            </Container>
        </section>
    );
}

// Produits réels d'une catégorie du catalogue ; sans catégorie ni produit, la section reste masquée.
function FeaturedCollectionSection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    const settings = section.settings;
    const category = textSetting(settings, 'category');
    const max = numberSetting(settings, 'max_items', 4, 24, 8);
    const products = useMemo(() => {
        const wanted = category.toLocaleLowerCase('fr');
        return sortProducts(context.products.filter((product) => wanted && (product.category || '').trim().toLocaleLowerCase('fr') === wanted), 'name');
    }, [category, context.products]);
    if (products.length === 0) {
        return context.preview ? <EmptySectionFrame label={category ? `Collection mise en avant (aucun produit dans « ${category} »)` : 'Collection mise en avant (choisissez une catégorie)'} /> : null;
    }
    const categoryName = products[0].category || category;
    return (
        <section className="py-10 sm:py-16 lg:py-20">
            <Container>
                <div className="flex items-end justify-between gap-4">
                    <SectionHeading context={context} section={section} fallback={categoryName} />
                    <SeeAll onClick={() => context.navigate('catalog', categoryName)} label="Voir la collection" />
                </div>
                <div className="mt-8"><ProductList products={products.slice(0, max)} columns={numberSetting(settings, 'columns', 2, 5, 4)} cardStyle={enumSetting(settings, 'card_style', CARD_STYLES, 'minimal')} context={context} carousel={mobileCarousel(settings, 'carousel')} /></div>
            </Container>
        </section>
    );
}

function ImageBannerSection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    const settings = section.settings;
    const media = mediaOf(context, settings);
    if (!media) return context.preview ? <EmptySectionFrame label="Bannière promotionnelle (ajoutez une image)" /> : null;
    const height = enumSetting(settings, 'height', ['compact', 'medium', 'tall'] as const, 'medium');
    const centered = enumSetting(settings, 'alignment', ['left', 'center'] as const, 'left') === 'center';
    const minHeight = { compact: 'min-h-[280px]', medium: 'min-h-[400px]', tall: 'min-h-[520px]' }[height];
    return (
        <section className="py-8 sm:py-10">
            <Container>
                <div data-sf-reveal className={`relative isolate flex overflow-hidden rounded-[var(--sf-radius-lg)] ${minHeight}`}>
                    <div className="absolute inset-0 -z-10 overflow-hidden">
                        <ResponsiveImage media={media} sizes="(min-width: 1280px) 1216px, 100vw" className="sf-kenburns h-full w-full object-cover" />
                    </div>
                    <div className={`absolute inset-0 -z-10 ${centered ? 'bg-[rgba(0,0,0,0.45)]' : 'bg-gradient-to-r from-[rgba(0,0,0,0.7)] via-[rgba(0,0,0,0.4)] to-[rgba(0,0,0,0.1)]'}`} aria-hidden="true" />
                    <div className={`flex w-full flex-col justify-center p-8 sm:p-14 ${centered ? 'items-center text-center' : 'max-w-2xl'}`}>
                        {hasText(context, settings, 'heading') && <Text context={context} section={section} settingKey="heading" as="h2" className="block text-3xl font-semibold leading-tight tracking-tight text-[#FFFFFF] [font-family:var(--sf-font-heading)] sm:text-5xl" />}
                        {hasText(context, settings, 'text') && <Text context={context} section={section} settingKey="text" as="p" className="mt-4 block whitespace-pre-line text-base leading-7 text-[rgba(255,255,255,0.92)]" />}
                        <div className="mt-7"><TargetButton context={context} section={section} inverted /></div>
                    </div>
                </div>
            </Container>
        </section>
    );
}

function ImageWithTextSection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    const settings = section.settings;
    const media = mediaOf(context, settings);
    if (!context.edit && !textSetting(settings, 'heading') && !textSetting(settings, 'text') && !media) return context.preview ? <EmptySectionFrame label="Image et texte" /> : null;
    const imageRight = enumSetting(settings, 'image_position', ['left', 'right'] as const, 'left') === 'right';
    return (
        <section className="py-10 sm:py-16 lg:py-20">
            <Container className={`grid items-center gap-10 ${media ? 'lg:grid-cols-2 lg:gap-16' : 'max-w-3xl text-center'}`}>
                {media && (
                    <div data-sf-reveal className={`overflow-hidden rounded-[var(--sf-radius-lg)] bg-[var(--sf-surface)] ${imageRight ? 'lg:order-2' : ''}`}>
                        <ResponsiveImage media={media} sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[4/5] h-full w-full object-cover transition duration-700 hover:scale-[1.03] sm:aspect-[4/3] lg:aspect-[4/5]" />
                    </div>
                )}
                <div data-sf-reveal style={delay(1)}>
                    {hasText(context, settings, 'heading') && <Text context={context} section={section} settingKey="heading" as="h2" className="block text-3xl font-semibold leading-tight tracking-tight text-[var(--sf-text)] [font-family:var(--sf-font-heading)] sm:text-4xl" />}
                    <LongText context={context} section={section} settingKey="text" className="mt-5 text-base leading-7 text-[var(--sf-muted)]" />
                    <div className="mt-8"><TargetButton context={context} section={section} /></div>
                </div>
            </Container>
        </section>
    );
}

function RichTextSection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    if (!hasText(context, section.settings, 'text')) return context.preview ? <EmptySectionFrame label={textSetting(section.settings, 'heading') || 'Texte'} /> : null;
    const centered = enumSetting(section.settings, 'alignment', ['left', 'center'] as const, 'left') === 'center';
    return (
        <section className="py-10 sm:py-16 lg:py-20">
            <Container className={`max-w-3xl ${centered ? 'text-center' : ''}`}>
                <SectionHeading context={context} section={section} align={centered ? 'center' : 'left'} />
                <div data-sf-reveal style={delay(1)}>
                    <LongText context={context} section={section} settingKey="text" className="mt-5 text-base leading-8 text-[var(--sf-muted)] sm:text-lg" />
                </div>
            </Container>
        </section>
    );
}

const FEATURE_ICONS = {
    truck: Truck, map: MapPin, card: CreditCard, chat: MessagesSquare, phone: Phone,
    clock: Clock, shield: ShieldCheck, star: Sparkles, leaf: Leaf, gift: Gift,
} as const;

// Dans l'éditeur, les éléments encore vides restent visibles pour être remplis sur place.
function visibleBlocks(section: ThemeSectionData, context: SectionContext, filled: (block: ThemeBlockData) => boolean) {
    return context.edit ? section.blocks : section.blocks.filter(filled);
}

function FeaturesSection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    const blocks = visibleBlocks(section, context, (block) => !!(textSetting(block.settings, 'title') || textSetting(block.settings, 'text')));
    if (blocks.length === 0) return context.preview ? <EmptySectionFrame label="Points forts" /> : null;
    return (
        <section className="py-10 sm:py-16 lg:py-20">
            <Container>
                <SectionHeading context={context} section={section} />
                <div className={`mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 ${blocks.length >= 3 ? 'lg:grid-cols-3' : ''}`}>
                    {blocks.map((block, index) => {
                        const Icon = FEATURE_ICONS[enumSetting(block.settings, 'icon', Object.keys(FEATURE_ICONS) as Array<keyof typeof FEATURE_ICONS>, 'star')];
                        return (
                            <div key={block.id} data-sf-reveal style={delay(index)}>
                                {/* Sur téléphone, l'icône se place à côté du texte : la liste reste compacte. */}
                                <div className="sf-card flex h-full gap-4 rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-[var(--sf-bg)] p-5 sm:block sm:p-6">
                                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--sf-accent-soft)] text-[var(--sf-text)] sm:h-12 sm:w-12"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                                    <div className="min-w-0">
                                        {hasText(context, block.settings, 'title') && <Text context={context} section={section} block={block} settingKey="title" as="h3" className="block text-base font-semibold text-[var(--sf-text)] [font-family:var(--sf-font-heading)] sm:mt-4" />}
                                        {hasText(context, block.settings, 'text') && <Text context={context} section={section} block={block} settingKey="text" as="p" className="mt-1 block whitespace-pre-line text-sm leading-6 text-[var(--sf-muted)] sm:mt-2" />}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Container>
        </section>
    );
}

function FaqSection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    const blocks = visibleBlocks(section, context, (block) => !!(textSetting(block.settings, 'question') && textSetting(block.settings, 'answer')));
    if (blocks.length === 0) return context.preview ? <EmptySectionFrame label="Questions fréquentes" /> : null;
    return (
        <section className="py-10 sm:py-16 lg:py-20">
            <Container className="max-w-3xl">
                <SectionHeading context={context} section={section} />
                <div className="mt-6 sm:mt-8 divide-y divide-[var(--sf-border)] border-y border-[var(--sf-border)]">
                    {blocks.map((block, index) => context.edit ? (
                        // Dans l'éditeur, questions et réponses restent ouvertes pour être modifiées directement.
                        <div key={block.id} className="py-5">
                            <Text context={context} section={section} block={block} settingKey="question" as="p" className="block text-base font-semibold text-[var(--sf-text)]" />
                            <Text context={context} section={section} block={block} settingKey="answer" as="p" className="mt-3 block whitespace-pre-line text-sm leading-7 text-[var(--sf-muted)]" />
                        </div>
                    ) : (
                        <details key={block.id} data-sf-reveal style={delay(index)} className="group py-5">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-[var(--sf-text)] [&::-webkit-details-marker]:hidden">
                                {textSetting(block.settings, 'question')}
                                <span aria-hidden="true" className="text-xl text-[var(--sf-muted)] transition-transform duration-300 group-open:rotate-45">+</span>
                            </summary>
                            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--sf-muted)]">{textSetting(block.settings, 'answer')}</p>
                        </details>
                    ))}
                </div>
            </Container>
        </section>
    );
}

function MarqueeSection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    const [paused, setPaused] = useState(false);
    const blocks = visibleBlocks(section, context, (block) => !!textSetting(block.settings, 'text'));
    if (blocks.length === 0) return context.preview ? <EmptySectionFrame label="Bandeau défilant" /> : null;
    const accent = enumSetting(section.settings, 'style', ['accent', 'outline'] as const, 'accent') === 'accent';
    // Pas de défilement dans l'éditeur (pour écrire) ni quand les animations sont coupées.
    const moving = context.motion !== 'none' && !context.edit;
    // Chaque moitié de la piste contient au moins huit messages pour couvrir les grands écrans.
    const repeat = moving ? Math.max(1, Math.ceil(8 / blocks.length)) : 1;
    const seconds = MARQUEE_SECONDS[enumSetting(section.settings, 'speed', ['slow', 'normal', 'fast'] as const, 'normal')] * ((repeat * blocks.length) / 8);
    const separator = <span aria-hidden="true" className="opacity-60">✦</span>;
    const item = (block: ThemeBlockData, copy: string | null) => (
        <span key={copy ? `${block.id}-${copy}` : block.id} data-duplicate={copy ? '' : undefined} aria-hidden={copy ? true : undefined} className="inline-flex shrink-0 items-center gap-10">
            {copy ? textSetting(block.settings, 'text') : <Text context={context} section={section} block={block} settingKey="text" />}
            {separator}
        </span>
    );
    const group = (index: number) => (
        <div key={index} data-duplicate={index ? '' : undefined} aria-hidden={index ? true : undefined} className="sf-marquee-group flex shrink-0 items-center gap-10 pr-10">
            {Array.from({ length: repeat }, (_, round) => blocks.map((block) => item(block, index || round ? `${index}-${round}` : null)))}
        </div>
    );
    return (
        <section
            aria-label={sectionLabel(section.type)}
            className={`sf-marquee relative overflow-hidden py-4 ${accent ? 'bg-[var(--sf-accent)] text-[var(--sf-on-accent)]' : 'border-y border-[var(--sf-border)] text-[var(--sf-text)]'}`}
            style={{ '--sf-marquee-duration': `${seconds}s` } as React.CSSProperties}
        >
            <div className="sf-marquee-track flex w-max text-sm font-semibold uppercase tracking-[0.18em]" data-static={moving ? undefined : 'true'} data-paused={paused ? 'true' : undefined}>
                {group(0)}
                {moving && group(1)}
            </div>
            {moving && (
                <button
                    type="button"
                    onClick={() => setPaused((value) => !value)}
                    aria-label={paused ? 'Reprendre le défilement' : 'Mettre en pause le défilement'}
                    className={`sf-marquee-toggle absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full ${accent ? 'bg-[var(--sf-accent)] text-[var(--sf-on-accent)] ring-1 ring-current' : 'bg-[var(--sf-bg)] text-[var(--sf-text)] ring-1 ring-[var(--sf-border)]'}`}
                >
                    {paused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
            )}
        </section>
    );
}

function ImageGallerySection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    const items = section.blocks.map((block) => ({ block, media: mediaOf(context, block.settings) })).filter((entry) => entry.media || context.edit);
    if (!items.some((entry) => entry.media)) {
        if (!context.preview) return null;
        if (!context.edit || items.length === 0) return <EmptySectionFrame label="Galerie d'images (ajoutez des images)" />;
    }
    const mosaic = enumSetting(section.settings, 'layout', ['grid', 'mosaic'] as const, 'grid') === 'mosaic';
    return (
        <section className="py-10 sm:py-16 lg:py-20">
            <Container>
                <SectionHeading context={context} section={section} />
                <div className={`mt-8 grid gap-3 sm:gap-4 ${mosaic ? 'grid-flow-dense auto-rows-[160px] grid-cols-2 sm:auto-rows-[220px] lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}>
                    {items.map(({ block, media }, index) => (
                        <div key={block.id} data-sf-reveal style={delay(index)} className={`${mosaic && index === 0 ? 'col-span-2 row-span-2' : ''} ${mosaic ? '' : 'aspect-square'}`}>
                            <figure className="sf-card group relative m-0 h-full overflow-hidden rounded-[var(--sf-radius-lg)] bg-[var(--sf-surface)]">
                                {media ? (
                                    <ResponsiveImage media={media} sizes={mosaic && index === 0 ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 33vw, 50vw'} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                                ) : (
                                    <span className="flex h-full min-h-[160px] w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--sf-border)] text-xs text-[var(--sf-muted)]">
                                        <ImageIcon className="h-5 w-5" aria-hidden="true" /> Image à choisir dans les réglages
                                    </span>
                                )}
                                {media && hasText(context, block.settings, 'caption') && (
                                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(0,0,0,0.7)] to-transparent p-4 pt-12 text-sm font-medium text-[#FFFFFF]">
                                        <Text context={context} section={section} block={block} settingKey="caption" />
                                    </figcaption>
                                )}
                            </figure>
                        </div>
                    ))}
                </div>
            </Container>
        </section>
    );
}

// Uniquement des avis réels saisis par le commerçant : aucune note ni aucun avis n'est généré.
function TestimonialsSection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    const blocks = visibleBlocks(section, context, (block) => !!textSetting(block.settings, 'quote'));
    if (blocks.length === 0) return context.preview ? <EmptySectionFrame label="Avis clients (uniquement des avis réels de vos clients)" /> : null;
    return (
        <section className="py-10 sm:py-16 lg:py-20">
            <Container>
                <SectionHeading context={context} section={section} />
                <div className={blocks.length === 1 ? 'mt-8 max-w-2xl' : `mt-8 ${SCROLLER} gap-3 sm:grid-cols-2 sm:gap-4 ${blocks.length >= 3 ? 'md:grid-cols-3' : ''}`}>
                    {blocks.map((block, index) => (
                        <div key={block.id} data-sf-reveal style={delay(index < 3 ? index : 0)} className={blocks.length === 1 ? undefined : 'w-[86%] shrink-0 snap-start sm:w-auto'}>
                            <figure className="sf-card m-0 flex h-full flex-col rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-[var(--sf-surface)] p-7">
                                <Quote className="h-7 w-7 text-[var(--sf-muted)]" aria-hidden="true" />
                                <blockquote className="mt-4 flex-1 text-base leading-7 text-[var(--sf-text)]">
                                    <Text context={context} section={section} block={block} settingKey="quote" as="p" className="block whitespace-pre-line" />
                                </blockquote>
                                {(hasText(context, block.settings, 'author') || hasText(context, block.settings, 'detail')) && (
                                    <figcaption className="mt-6 text-sm">
                                        {hasText(context, block.settings, 'author') && <Text context={context} section={section} block={block} settingKey="author" className="block font-semibold text-[var(--sf-text)]" />}
                                        {hasText(context, block.settings, 'detail') && <Text context={context} section={section} block={block} settingKey="detail" className="block text-[var(--sf-muted)]" />}
                                    </figcaption>
                                )}
                            </figure>
                        </div>
                    ))}
                </div>
            </Container>
        </section>
    );
}

const EMPTY_CONTACT: ContactForm = { name: '', phone: '', email: '', company: '', subject: '', message: '' };
const contactField = 'w-full rounded-[var(--sf-radius)] border border-[var(--sf-border)] bg-[var(--sf-bg)] px-4 py-3 text-sm text-[var(--sf-text)] outline-none placeholder:text-[var(--sf-muted)] focus:border-[var(--sf-text)]';

function ContactSection({ section, context, first }: { section: ThemeSectionData; context: SectionContext; first: boolean }) {
    const [form, setForm] = useState<ContactForm>(EMPTY_CONTACT);
    const settings = section.settings;
    const site = context.site;
    const showForm = booleanSetting(settings, 'show_form', true);
    const whatsapp = booleanSetting(settings, 'show_whatsapp', true) && site.whatsapp_phone ? `https://wa.me/${site.whatsapp_phone.replace(/[^\d]/g, '')}` : null;
    const { contact } = context.commerce;
    const canSend = !context.preview && !contact.submitting && form.name.trim() && form.email.trim() && form.subject.trim() && form.message.trim();
    const update = (key: keyof ContactForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
    return (
        <section className="py-10 sm:py-16 lg:py-20">
            <Container className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
                <div data-sf-reveal>
                    <Text context={context} section={section} settingKey="heading" as={first ? 'h1' : 'h2'} fallback="Contact" className="block text-3xl font-semibold tracking-tight text-[var(--sf-text)] [font-family:var(--sf-font-heading)] sm:text-4xl" />
                    {hasText(context, settings, 'text') && <Text context={context} section={section} settingKey="text" as="p" className="mt-4 block whitespace-pre-line text-base leading-7 text-[var(--sf-muted)]" />}
                    <ul className="mt-6 sm:mt-8 space-y-4 text-sm text-[var(--sf-text)]">
                        {site.address && <li className="flex gap-3"><Store className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sf-muted)]" aria-hidden="true" /><span>{site.address}</span></li>}
                        {site.phone && <li className="flex gap-3"><Phone className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sf-muted)]" aria-hidden="true" /><a className="underline-offset-4 hover:underline" href={`tel:${site.phone.replace(/\s+/g, '')}`}>{site.phone}</a></li>}
                        {site.email && <li className="flex gap-3"><Mail className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sf-muted)]" aria-hidden="true" /><a className="break-all underline-offset-4 hover:underline" href={`mailto:${site.email}`}>{site.email}</a></li>}
                    </ul>
                    {whatsapp && (
                        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`${accentButtonClass(context.outline)} mt-8`}>
                            <MessageCircle className="h-4 w-4" aria-hidden="true" /> Écrire sur WhatsApp
                        </a>
                    )}
                </div>
                {showForm && (
                    <form data-sf-reveal style={delay(1)} className="space-y-4 rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-[var(--sf-surface)] p-6 sm:p-8" onSubmit={(event) => { event.preventDefault(); void context.commerce.submitContact(form).then((ok) => { if (ok) setForm(EMPTY_CONTACT); }); }}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><label htmlFor={`${section.id}-name`} className="mb-1 block text-sm font-medium text-[var(--sf-text)]">Nom <span aria-hidden="true">*</span></label><input id={`${section.id}-name`} required autoComplete="name" value={form.name} onChange={update('name')} className={contactField} /></div>
                            <div><label htmlFor={`${section.id}-email`} className="mb-1 block text-sm font-medium text-[var(--sf-text)]">E-mail <span aria-hidden="true">*</span></label><input id={`${section.id}-email`} required type="email" autoComplete="email" value={form.email} onChange={update('email')} className={contactField} /></div>
                            <div><label htmlFor={`${section.id}-phone`} className="mb-1 block text-sm font-medium text-[var(--sf-text)]">Téléphone</label><input id={`${section.id}-phone`} type="tel" autoComplete="tel" value={form.phone} onChange={update('phone')} className={contactField} /></div>
                            <div><label htmlFor={`${section.id}-company`} className="mb-1 block text-sm font-medium text-[var(--sf-text)]">Entreprise</label><input id={`${section.id}-company`} autoComplete="organization" value={form.company} onChange={update('company')} className={contactField} /></div>
                        </div>
                        <div><label htmlFor={`${section.id}-subject`} className="mb-1 block text-sm font-medium text-[var(--sf-text)]">Objet <span aria-hidden="true">*</span></label><input id={`${section.id}-subject`} required value={form.subject} onChange={update('subject')} className={contactField} /></div>
                        <div><label htmlFor={`${section.id}-message`} className="mb-1 block text-sm font-medium text-[var(--sf-text)]">Message <span aria-hidden="true">*</span></label><textarea id={`${section.id}-message`} required rows={5} value={form.message} onChange={update('message')} className={`${contactField} resize-none`} /></div>
                        {contact.success && <p role="status" className="rounded-[var(--sf-radius)] bg-[var(--sf-accent-soft)] p-3 text-sm font-medium text-[var(--sf-text)]">{contact.success}</p>}
                        {contact.error && <p role="alert" className="rounded-[var(--sf-radius)] border border-[var(--sf-text)] p-3 text-sm font-medium text-[var(--sf-text)]">{contact.error}</p>}
                        <button type="submit" disabled={!canSend} className={accentButtonClass(context.outline)}>
                            <Send className="h-4 w-4" aria-hidden="true" />
                            {context.preview ? "Messages désactivés dans l'aperçu" : contact.submitting ? 'Envoi...' : 'Envoyer le message'}
                        </button>
                    </form>
                )}
            </Container>
        </section>
    );
}

function CatalogSection({ section, context, first }: { section: ThemeSectionData; context: SectionContext; first: boolean }) {
    const settings = section.settings;
    const categories = useCategories(context.products);
    const [query, setQuery] = useState(context.catalogQuery);
    const [category, setCategory] = useState<string | null>(context.catalogCategory);
    const [sort, setSort] = useState<'name' | 'price_asc' | 'price_desc'>('name');
    const [page, setPage] = useState(1);
    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return sortProducts(context.products.filter((product) => (
            (!category || product.category === category)
            && (!normalized || [product.name, product.description, product.category].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized)))
        )), sort);
    }, [category, context.products, query, sort]);
    const pages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));
    const current = Math.min(page, pages);
    const visible = filtered.slice((current - 1) * PRODUCTS_PER_PAGE, current * PRODUCTS_PER_PAGE);
    return (
        <section className="py-12">
            <Container>
                <Text context={context} section={section} settingKey="heading" as={first ? 'h1' : 'h2'} fallback="Catalogue" className="block text-3xl font-semibold tracking-tight text-[var(--sf-text)] [font-family:var(--sf-font-heading)] sm:text-4xl" />
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-2 rounded-[var(--sf-radius-pill)] border border-[var(--sf-border)] bg-[var(--sf-bg)] px-4 focus-within:border-[var(--sf-text)]">
                        <Search className="h-4 w-4 text-[var(--sf-muted)]" aria-hidden="true" />
                        <label htmlFor={`${section.id}-query`} className="sr-only">Rechercher dans le catalogue</label>
                        <input id={`${section.id}-query`} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Rechercher un produit" className="h-12 w-full bg-transparent text-sm text-[var(--sf-text)] outline-none placeholder:text-[var(--sf-muted)]" />
                    </div>
                    <label htmlFor={`${section.id}-sort`} className="sr-only">Trier les produits</label>
                    <select id={`${section.id}-sort`} value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-12 rounded-[var(--sf-radius-pill)] border border-[var(--sf-border)] bg-[var(--sf-bg)] px-4 text-sm text-[var(--sf-text)]">
                        <option value="name">Ordre alphabétique</option>
                        <option value="price_asc">Prix croissant</option>
                        <option value="price_desc">Prix décroissant</option>
                    </select>
                </div>
                {booleanSetting(settings, 'show_filters', true) && categories.length > 0 && (
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Filtrer par catégorie">
                        {[{ name: null as string | null, label: 'Tout' }, ...categories.map((item) => ({ name: item.name as string | null, label: item.name }))].map((item) => (
                            <button key={item.label} type="button" aria-pressed={category === item.name} onClick={() => { setCategory(item.name); setPage(1); }} className={`inline-flex min-h-10 shrink-0 items-center rounded-[var(--sf-radius-pill)] border px-4 text-sm font-medium transition ${category === item.name ? 'border-[var(--sf-accent)] bg-[var(--sf-accent)] text-[var(--sf-on-accent)]' : 'border-[var(--sf-border)] text-[var(--sf-text)] hover:border-[var(--sf-text)]'}`}>
                                {item.label}
                            </button>
                        ))}
                    </div>
                )}
                <p className="mt-6 text-sm text-[var(--sf-muted)]" aria-live="polite">{filtered.length} produit{filtered.length > 1 ? 's' : ''}</p>
                {visible.length === 0 ? (
                    <p className="mt-10 text-center text-sm text-[var(--sf-muted)]">Aucun produit ne correspond à votre recherche.</p>
                ) : (
                    <div className="mt-6"><ProductList products={visible} columns={numberSetting(settings, 'columns', 2, 5, 4)} cardStyle={enumSetting(settings, 'card_style', CARD_STYLES, 'minimal')} context={context} reveal={false} /></div>
                )}
                {pages > 1 && (
                    <nav aria-label="Pages du catalogue" className="mt-10 flex items-center justify-center gap-3">
                        <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="min-h-11 rounded-[var(--sf-radius-pill)] border border-[var(--sf-border)] px-5 text-sm font-medium text-[var(--sf-text)] disabled:opacity-40">Précédent</button>
                        <span className="text-sm text-[var(--sf-muted)]">Page {current} sur {pages}</span>
                        <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)} className="min-h-11 rounded-[var(--sf-radius-pill)] border border-[var(--sf-border)] px-5 text-sm font-medium text-[var(--sf-text)] disabled:opacity-40">Suivant</button>
                    </nav>
                )}
            </Container>
        </section>
    );
}

export function sectionLabel(type: string) {
    return (SECTION_SPECS[type] as { label?: string } | undefined)?.label || type;
}

// Registre de confiance : seul un type enregistré produit un rendu ; un type inconnu est ignoré.
export function renderSection(section: ThemeSectionData, context: SectionContext, first: boolean) {
    switch (section.type) {
        case 'hero': return <HeroSection key={section.id} section={section} context={context} first={first} />;
        case 'category-list': return <CategoryListSection key={section.id} section={section} context={context} />;
        case 'product-grid': return <ProductGridSection key={section.id} section={section} context={context} />;
        case 'featured-collection': return <FeaturedCollectionSection key={section.id} section={section} context={context} />;
        case 'image-banner': return <ImageBannerSection key={section.id} section={section} context={context} />;
        case 'image-with-text': return <ImageWithTextSection key={section.id} section={section} context={context} />;
        case 'rich-text': return <RichTextSection key={section.id} section={section} context={context} />;
        case 'features': return <FeaturesSection key={section.id} section={section} context={context} />;
        case 'faq': return <FaqSection key={section.id} section={section} context={context} />;
        case 'marquee': return <MarqueeSection key={section.id} section={section} context={context} />;
        case 'image-gallery': return <ImageGallerySection key={section.id} section={section} context={context} />;
        case 'testimonials': return <TestimonialsSection key={section.id} section={section} context={context} />;
        case 'contact': return <ContactSection key={section.id} section={section} context={context} first={first} />;
        case 'catalog': return <CatalogSection key={`${section.id}:${context.catalogQuery}:${context.catalogCategory || ''}`} section={section} context={context} first={first} />;
        default: return null;
    }
}
