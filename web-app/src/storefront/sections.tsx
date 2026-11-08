'use client';

/* eslint-disable @next/next/no-img-element -- les médias et photos de produits sont déjà optimisés par Stockman. */
import React, { useMemo, useState } from 'react';
import {
    ArrowRight, Clock, CreditCard, Gift, Leaf, Mail, MapPin, MessageCircle, MessagesSquare, Phone, Search, Send, ShieldCheck, Sparkles, Store, Truck,
} from 'lucide-react';
import { accentButtonClass, ProductCard, ProductImage, type CardStyle } from './commerce-ui';
import { EmptySectionFrame } from './layout';
import type { ContactForm, StorefrontCommerce } from './useStorefrontCommerce';
import {
    booleanSetting, enumSetting, numberSetting, textSetting,
    type StorefrontMedia, type StorefrontPageKind, type StorefrontProduct, type StorefrontSite, type ThemeSectionData,
} from './types';

export type SectionContext = {
    site: StorefrontSite;
    products: StorefrontProduct[];
    media: Record<string, StorefrontMedia>;
    commerce: StorefrontCommerce;
    preview: boolean;
    outline: boolean;
    navigate: (page: StorefrontPageKind, category?: string | null) => void;
    openProduct: (product: StorefrontProduct) => void;
    catalogQuery: string;
    catalogCategory: string | null;
};

const CARD_STYLES = ['minimal', 'bordered', 'portrait'] as const;
const DESKTOP_COLUMNS: Record<number, string> = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' };
const PRODUCTS_PER_PAGE = 48;

function Container({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

function SectionHeading({ title, align = 'left' }: { title: string; align?: 'left' | 'center' }) {
    if (!title) return null;
    return <h2 className={`text-2xl font-semibold tracking-tight text-[var(--sf-text)] [font-family:var(--sf-font-heading)] sm:text-3xl ${align === 'center' ? 'text-center' : ''}`}>{title}</h2>;
}

function Paragraphs({ text, className = '' }: { text: string; className?: string }) {
    return (
        <div className={`space-y-4 ${className}`}>
            {text.split(/\n{2,}/).map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}
        </div>
    );
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

function TargetButton({ label, target, context, inverted = false }: { label: string; target: StorefrontPageKind; context: SectionContext; inverted?: boolean }) {
    if (!label) return null;
    return (
        <button
            type="button"
            onClick={() => context.navigate(target)}
            className={inverted
                ? 'inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--sf-radius-pill)] bg-[#FFFFFF] px-7 text-sm font-semibold text-[#111111] transition hover:opacity-90'
                : `${accentButtonClass(context.outline)} min-h-12 px-7`}
        >
            {label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
    );
}

function HeroSection({ section, context, first }: { section: ThemeSectionData; context: SectionContext; first: boolean }) {
    const settings = section.settings;
    const heading = textSetting(settings, 'heading') || context.site.name;
    const text = textSetting(settings, 'subheading');
    const media = typeof settings.image_asset_id === 'string' ? context.media[settings.image_asset_id] : undefined;
    const requested = enumSetting(settings, 'layout', ['overlay', 'split', 'text'] as const, 'text');
    // Sans image, la bannière reste lisible en texte seul : aucune image de remplacement n'est inventée.
    const layout = media ? requested : 'text';
    const height = enumSetting(settings, 'height', ['compact', 'medium', 'tall'] as const, 'medium');
    const centered = enumSetting(settings, 'alignment', ['left', 'center'] as const, 'left') === 'center';
    const target = enumSetting(settings, 'button_target', ['catalog', 'contact'] as const, 'catalog');
    const label = textSetting(settings, 'button_label');
    // Hauteur plafonnée : une bannière haute reste confortable sur un grand écran vertical.
    const minHeight = { compact: 'min-h-[320px]', medium: 'min-h-[440px]', tall: 'min-h-[520px] lg:min-h-[min(72vh,760px)]' }[height];
    const HeadingTag = first ? 'h1' : 'h2';

    if (layout === 'overlay' && media) {
        return (
            <section className={`relative isolate flex overflow-hidden ${minHeight}`}>
                <ResponsiveImage media={media} sizes="100vw" eager={first} className="absolute inset-0 -z-10 h-full w-full object-cover" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[rgba(0,0,0,0.65)] via-[rgba(0,0,0,0.35)] to-[rgba(0,0,0,0.15)]" aria-hidden="true" />
                <Container className={`flex w-full flex-col justify-end py-16 sm:py-20 ${centered ? 'items-center text-center' : ''}`}>
                    <HeadingTag className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-[#FFFFFF] [font-family:var(--sf-font-heading)] sm:text-5xl lg:text-6xl">{heading}</HeadingTag>
                    {text && <p className="mt-5 max-w-2xl whitespace-pre-line text-base leading-7 text-[rgba(255,255,255,0.9)] sm:text-lg">{text}</p>}
                    {label && <div className="mt-8"><TargetButton label={label} target={target} context={context} inverted /></div>}
                </Container>
            </section>
        );
    }
    if (layout === 'split' && media) {
        return (
            <section className="bg-[var(--sf-surface)]">
                <Container className={`grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-16 ${height === 'compact' ? 'lg:py-14' : 'lg:py-20'}`}>
                    <div className={centered ? 'text-center lg:text-left' : ''}>
                        <HeadingTag className="text-4xl font-semibold leading-tight tracking-tight text-[var(--sf-text)] [font-family:var(--sf-font-heading)] sm:text-5xl">{heading}</HeadingTag>
                        {text && <p className="mt-5 max-w-xl whitespace-pre-line text-base leading-7 text-[var(--sf-muted)] sm:text-lg">{text}</p>}
                        {label && <div className="mt-8"><TargetButton label={label} target={target} context={context} /></div>}
                    </div>
                    <div className="overflow-hidden rounded-[var(--sf-radius-lg)] bg-[var(--sf-bg)]">
                        <ResponsiveImage media={media} sizes="(min-width: 1024px) 50vw, 100vw" eager={first} className="aspect-[4/3] h-full w-full object-cover" />
                    </div>
                </Container>
            </section>
        );
    }
    return (
        <section className={`flex bg-[var(--sf-surface)] ${height === 'compact' ? 'min-h-[260px]' : height === 'tall' ? 'min-h-[480px]' : 'min-h-[360px]'}`}>
            <Container className={`flex w-full flex-col justify-center py-14 ${centered ? 'items-center text-center' : ''}`}>
                <span className="mb-6 h-1 w-12 rounded-full bg-[var(--sf-accent)]" aria-hidden="true" />
                <HeadingTag className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-[var(--sf-text)] [font-family:var(--sf-font-heading)] sm:text-5xl lg:text-6xl">{heading}</HeadingTag>
                {text && <p className="mt-5 max-w-2xl whitespace-pre-line text-base leading-7 text-[var(--sf-muted)] sm:text-lg">{text}</p>}
                {label && <div className="mt-8"><TargetButton label={label} target={target} context={context} /></div>}
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

function CategoryListSection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    const categories = useCategories(context.products);
    const max = numberSetting(section.settings, 'max_items', 3, 12, 6);
    const style = enumSetting(section.settings, 'style', ['tiles', 'chips'] as const, 'tiles');
    const visible = categories.slice(0, max);
    if (visible.length === 0) return context.preview ? <EmptySectionFrame label="Catégories (aucun produit classé dans une catégorie)" /> : null;
    const title = textSetting(section.settings, 'heading');
    if (style === 'chips') {
        return (
            <section className="py-10">
                <Container>
                    <SectionHeading title={title} />
                    <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
                        {visible.map((category) => (
                            <button key={category.name} type="button" onClick={() => context.navigate('catalog', category.name)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--sf-radius-pill)] border border-[var(--sf-border)] bg-[var(--sf-bg)] px-5 text-sm font-medium text-[var(--sf-text)] transition hover:border-[var(--sf-accent)] hover:bg-[var(--sf-accent-soft)]">
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
        <section className="py-14">
            <Container>
                <SectionHeading title={title} />
                <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-6">
                    {visible.map((category) => (
                        <button key={category.name} type="button" onClick={() => context.navigate('catalog', category.name)} className="group relative aspect-[4/5] overflow-hidden rounded-[var(--sf-radius-lg)] bg-[var(--sf-surface)] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sf-accent)]">
                            {category.image ? <ProductImage product={category.image} className="transition duration-700 group-hover:scale-105" /> : null}
                            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(0,0,0,0.7)] to-transparent p-4 pt-16">
                                <span className="block text-base font-semibold text-[#FFFFFF] [font-family:var(--sf-font-heading)] sm:text-lg">{category.name}</span>
                                <span className="text-xs text-[rgba(255,255,255,0.85)]">{category.count} produit{category.count > 1 ? 's' : ''}</span>
                            </span>
                        </button>
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

function ProductList({ products, columns, cardStyle, context }: { products: StorefrontProduct[]; columns: number; cardStyle: CardStyle; context: SectionContext }) {
    return (
        <div className={`grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 ${DESKTOP_COLUMNS[columns] || 'lg:grid-cols-4'} lg:gap-x-6`}>
            {products.map((product) => (
                <ProductCard key={product.product_id} product={product} cardStyle={cardStyle} currency={context.site.currency} outline={context.outline} onOpen={context.openProduct} onAdd={context.commerce.addToCart} />
            ))}
        </div>
    );
}

function ProductGridSection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    const settings = section.settings;
    const sort = enumSetting(settings, 'sort', ['name', 'price_asc', 'price_desc'] as const, 'name');
    const max = numberSetting(settings, 'max_items', 4, 48, 8);
    const products = useMemo(() => sortProducts(context.products, sort).slice(0, max), [context.products, sort, max]);
    if (products.length === 0) return context.preview ? <EmptySectionFrame label="Sélection de produits (aucun produit publié)" /> : null;
    return (
        <section className="py-14">
            <Container>
                <div className="flex items-end justify-between gap-4">
                    <SectionHeading title={textSetting(settings, 'heading')} />
                    {context.products.length > products.length && (
                        <button type="button" onClick={() => context.navigate('catalog')} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--sf-text)] underline-offset-4 hover:underline">
                            Tout voir <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    )}
                </div>
                <div className="mt-8"><ProductList products={products} columns={numberSetting(settings, 'columns', 2, 5, 4)} cardStyle={enumSetting(settings, 'card_style', CARD_STYLES, 'minimal')} context={context} /></div>
            </Container>
        </section>
    );
}

function ImageWithTextSection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    const settings = section.settings;
    const heading = textSetting(settings, 'heading');
    const text = textSetting(settings, 'text');
    const media = typeof settings.image_asset_id === 'string' ? context.media[settings.image_asset_id] : undefined;
    if (!heading && !text && !media) return context.preview ? <EmptySectionFrame label="Image et texte" /> : null;
    const imageRight = enumSetting(settings, 'image_position', ['left', 'right'] as const, 'left') === 'right';
    return (
        <section className="py-14">
            <Container className={`grid items-center gap-10 ${media ? 'lg:grid-cols-2 lg:gap-16' : 'max-w-3xl text-center'}`}>
                {media && (
                    <div className={`overflow-hidden rounded-[var(--sf-radius-lg)] bg-[var(--sf-surface)] ${imageRight ? 'lg:order-2' : ''}`}>
                        <ResponsiveImage media={media} sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[4/5] h-full w-full object-cover sm:aspect-[4/3] lg:aspect-[4/5]" />
                    </div>
                )}
                <div>
                    {heading && <h2 className="text-3xl font-semibold leading-tight tracking-tight text-[var(--sf-text)] [font-family:var(--sf-font-heading)] sm:text-4xl">{heading}</h2>}
                    {text && <Paragraphs text={text} className="mt-5 text-base leading-7 text-[var(--sf-muted)]" />}
                    {textSetting(settings, 'button_label') && (
                        <div className="mt-8"><TargetButton label={textSetting(settings, 'button_label')} target={enumSetting(settings, 'button_target', ['catalog', 'contact'] as const, 'catalog')} context={context} /></div>
                    )}
                </div>
            </Container>
        </section>
    );
}

function RichTextSection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    const heading = textSetting(section.settings, 'heading');
    const text = textSetting(section.settings, 'text');
    if (!text) return context.preview ? <EmptySectionFrame label={heading || 'Texte'} /> : null;
    const centered = enumSetting(section.settings, 'alignment', ['left', 'center'] as const, 'left') === 'center';
    return (
        <section className="py-14">
            <Container className={`max-w-3xl ${centered ? 'text-center' : ''}`}>
                <SectionHeading title={heading} align={centered ? 'center' : 'left'} />
                <Paragraphs text={text} className="mt-5 text-base leading-8 text-[var(--sf-muted)] sm:text-lg" />
            </Container>
        </section>
    );
}

const FEATURE_ICONS = {
    truck: Truck, map: MapPin, card: CreditCard, chat: MessagesSquare, phone: Phone,
    clock: Clock, shield: ShieldCheck, star: Sparkles, leaf: Leaf, gift: Gift,
} as const;

function FeaturesSection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    const blocks = section.blocks.filter((block) => textSetting(block.settings, 'title') || textSetting(block.settings, 'text'));
    if (blocks.length === 0) return context.preview ? <EmptySectionFrame label="Points forts" /> : null;
    return (
        <section className="py-14">
            <Container>
                <SectionHeading title={textSetting(section.settings, 'heading')} />
                <div className={`mt-8 grid gap-4 sm:grid-cols-2 ${blocks.length >= 3 ? 'lg:grid-cols-3' : ''}`}>
                    {blocks.map((block) => {
                        const Icon = FEATURE_ICONS[enumSetting(block.settings, 'icon', Object.keys(FEATURE_ICONS) as Array<keyof typeof FEATURE_ICONS>, 'star')];
                        return (
                            <div key={block.id} className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-[var(--sf-bg)] p-6">
                                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--sf-accent-soft)] text-[var(--sf-text)]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                                {textSetting(block.settings, 'title') && <h3 className="mt-4 text-base font-semibold text-[var(--sf-text)] [font-family:var(--sf-font-heading)]">{textSetting(block.settings, 'title')}</h3>}
                                {textSetting(block.settings, 'text') && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--sf-muted)]">{textSetting(block.settings, 'text')}</p>}
                            </div>
                        );
                    })}
                </div>
            </Container>
        </section>
    );
}

function FaqSection({ section, context }: { section: ThemeSectionData; context: SectionContext }) {
    const blocks = section.blocks.filter((block) => textSetting(block.settings, 'question') && textSetting(block.settings, 'answer'));
    if (blocks.length === 0) return context.preview ? <EmptySectionFrame label="Questions fréquentes" /> : null;
    return (
        <section className="py-14">
            <Container className="max-w-3xl">
                <SectionHeading title={textSetting(section.settings, 'heading')} />
                <div className="mt-8 divide-y divide-[var(--sf-border)] border-y border-[var(--sf-border)]">
                    {blocks.map((block) => (
                        <details key={block.id} className="group py-5">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-[var(--sf-text)] [&::-webkit-details-marker]:hidden">
                                {textSetting(block.settings, 'question')}
                                <span aria-hidden="true" className="text-xl text-[var(--sf-muted)] transition group-open:rotate-45">+</span>
                            </summary>
                            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--sf-muted)]">{textSetting(block.settings, 'answer')}</p>
                        </details>
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
    const heading = textSetting(settings, 'heading') || 'Contact';
    const text = textSetting(settings, 'text');
    const showForm = booleanSetting(settings, 'show_form', true);
    const whatsapp = booleanSetting(settings, 'show_whatsapp', true) && site.whatsapp_phone ? `https://wa.me/${site.whatsapp_phone.replace(/[^\d]/g, '')}` : null;
    const { contact } = context.commerce;
    const canSend = !context.preview && !contact.submitting && form.name.trim() && form.email.trim() && form.subject.trim() && form.message.trim();
    const update = (key: keyof ContactForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
    const HeadingTag = first ? 'h1' : 'h2';
    return (
        <section className="py-14">
            <Container className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
                <div>
                    <HeadingTag className="text-3xl font-semibold tracking-tight text-[var(--sf-text)] [font-family:var(--sf-font-heading)] sm:text-4xl">{heading}</HeadingTag>
                    {text && <p className="mt-4 whitespace-pre-line text-base leading-7 text-[var(--sf-muted)]">{text}</p>}
                    <ul className="mt-8 space-y-4 text-sm text-[var(--sf-text)]">
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
                    <form className="space-y-4 rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-[var(--sf-surface)] p-6 sm:p-8" onSubmit={(event) => { event.preventDefault(); void context.commerce.submitContact(form).then((ok) => { if (ok) setForm(EMPTY_CONTACT); }); }}>
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
    const HeadingTag = first ? 'h1' : 'h2';
    return (
        <section className="py-12">
            <Container>
                <HeadingTag className="text-3xl font-semibold tracking-tight text-[var(--sf-text)] [font-family:var(--sf-font-heading)] sm:text-4xl">{textSetting(settings, 'heading') || 'Catalogue'}</HeadingTag>
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
                    <div className="mt-6"><ProductList products={visible} columns={numberSetting(settings, 'columns', 2, 5, 4)} cardStyle={enumSetting(settings, 'card_style', CARD_STYLES, 'minimal')} context={context} /></div>
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

// Registre de confiance : seul un type enregistré produit un rendu ; un type inconnu est ignoré.
export function renderSection(section: ThemeSectionData, context: SectionContext, first: boolean) {
    switch (section.type) {
        case 'hero': return <HeroSection key={section.id} section={section} context={context} first={first} />;
        case 'category-list': return <CategoryListSection key={section.id} section={section} context={context} />;
        case 'product-grid': return <ProductGridSection key={section.id} section={section} context={context} />;
        case 'image-with-text': return <ImageWithTextSection key={section.id} section={section} context={context} />;
        case 'rich-text': return <RichTextSection key={section.id} section={section} context={context} />;
        case 'features': return <FeaturesSection key={section.id} section={section} context={context} />;
        case 'faq': return <FaqSection key={section.id} section={section} context={context} />;
        case 'contact': return <ContactSection key={section.id} section={section} context={context} first={first} />;
        case 'catalog': return <CatalogSection key={`${section.id}:${context.catalogQuery}:${context.catalogCategory || ''}`} section={section} context={context} first={first} />;
        default: return null;
    }
}
