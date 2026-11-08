'use client';

/* eslint-disable @next/next/no-img-element -- les images des produits et des médias sont déjà optimisées par Stockman. */
import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus, Send, ShoppingBag, Trash2, X } from 'lucide-react';
import { formatAmount, type OrderForm, type StorefrontCommerce } from './useStorefrontCommerce';
import type { StorefrontProduct, StorefrontSite } from './types';

export type CardStyle = 'minimal' | 'bordered' | 'portrait';

const UNIT_LABELS: Record<string, string> = { piece: 'pièce', pièce: 'pièce', kg: 'kg', g: 'g', l: 'L', ml: 'mL', m: 'm' };

export function unitLabel(unit?: string | null) {
    const value = (unit || 'piece').trim();
    return UNIT_LABELS[value.toLowerCase()] || value;
}

function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || '·';
}

export function ProductImage({ product, className = '' }: { product: StorefrontProduct; className?: string }) {
    if (product.image) {
        return <img src={product.image} alt={product.name} loading="lazy" decoding="async" className={`h-full w-full object-cover ${className}`} />;
    }
    // Sans photo, un monogramme tiré du nom du produit : aucune image inventée.
    return (
        <div aria-hidden="true" className="flex h-full w-full items-center justify-center bg-[var(--sf-surface)] text-2xl font-semibold text-[var(--sf-muted)] [font-family:var(--sf-font-heading)]">
            {initials(product.name)}
        </div>
    );
}

export function accentButtonClass(outline: boolean) {
    return `inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--sf-radius-pill)] bg-[var(--sf-accent)] px-6 text-sm font-semibold text-[var(--sf-on-accent)] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)] disabled:cursor-not-allowed disabled:opacity-50 ${outline ? 'ring-1 ring-[var(--sf-text)]' : ''}`;
}

export function ProductCard({ product, cardStyle, currency, outline, onOpen, onAdd }: {
    product: StorefrontProduct;
    cardStyle: CardStyle;
    currency: string;
    outline: boolean;
    onOpen: (product: StorefrontProduct) => void;
    onAdd: (product: StorefrontProduct) => void;
}) {
    const price = formatAmount(product.selling_price, currency);
    const unit = unitLabel(product.unit);
    const showUnit = unit !== 'pièce';
    const portrait = cardStyle === 'portrait';
    const bordered = cardStyle === 'bordered';
    return (
        <article className={`group flex h-full flex-col ${bordered ? 'rounded-[var(--sf-radius)] border border-[var(--sf-border)] bg-[var(--sf-bg)] p-3' : ''}`}>
            <button type="button" onClick={() => onOpen(product)} className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sf-accent)]" aria-label={`Voir ${product.name}`}>
                <div className={`relative overflow-hidden rounded-[var(--sf-radius)] bg-[var(--sf-surface)] ${portrait ? 'aspect-[3/4]' : 'aspect-square'}`}>
                    <ProductImage product={product} className="transition duration-500 group-hover:scale-[1.03]" />
                    {!product.available && (
                        <span className="absolute left-3 top-3 rounded-[var(--sf-radius-pill)] bg-[var(--sf-bg)] px-3 py-1 text-xs font-semibold text-[var(--sf-text)] shadow-sm">Indisponible</span>
                    )}
                </div>
            </button>
            <div className={`flex flex-1 flex-col ${portrait ? 'pt-4 text-center' : 'pt-3'}`}>
                {product.category && !portrait && <p className="text-xs font-medium uppercase tracking-wide text-[var(--sf-muted)]">{product.category}</p>}
                <h3 className={`mt-1 text-[var(--sf-text)] [font-family:var(--sf-font-heading)] ${portrait ? 'text-base font-medium' : 'text-sm font-semibold'} line-clamp-2`}>{product.name}</h3>
                <p className={`mt-1 text-sm text-[var(--sf-text)] ${portrait ? '' : 'font-semibold'}`}>
                    {price}{showUnit && <span className="font-normal text-[var(--sf-muted)]"> / {unit}</span>}
                </p>
                {bordered && (
                    <p className={`mt-1 text-xs font-medium ${product.available ? 'text-[var(--sf-muted)]' : 'text-[var(--sf-text)]'}`}>
                        {product.available ? 'Disponible' : 'Rupture de stock'}
                    </p>
                )}
                <div className={`mt-auto pt-3 ${portrait ? 'flex justify-center' : ''}`}>
                    <button
                        type="button"
                        onClick={() => onAdd(product)}
                        disabled={!product.available}
                        className={bordered ? `${accentButtonClass(outline)} w-full` : 'inline-flex min-h-11 items-center gap-2 rounded-[var(--sf-radius-pill)] border border-[var(--sf-border)] px-4 text-sm font-medium text-[var(--sf-text)] transition hover:border-[var(--sf-text)] disabled:cursor-not-allowed disabled:opacity-50'}
                        aria-label={`Ajouter ${product.name} au panier`}
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Ajouter
                    </button>
                </div>
            </div>
        </article>
    );
}

function useEscape(onClose: () => void) {
    useEffect(() => {
        const handle = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handle);
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handle);
            document.body.style.overflow = previous;
        };
    }, [onClose]);
}

export function ProductDialog({ product, currency, outline, onClose, onAdd }: {
    product: StorefrontProduct;
    currency: string;
    outline: boolean;
    onClose: () => void;
    onAdd: (product: StorefrontProduct) => void;
}) {
    const closeRef = useRef<HTMLButtonElement>(null);
    useEscape(onClose);
    useEffect(() => { closeRef.current?.focus(); }, []);
    const unit = unitLabel(product.unit);
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
            <div className="absolute inset-0 bg-[var(--sf-overlay)]" onClick={onClose} aria-hidden="true" />
            <div role="dialog" aria-modal="true" aria-labelledby="sf-product-title" className="relative grid max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-[var(--sf-radius-lg)] bg-[var(--sf-bg)] text-[var(--sf-text)] shadow-2xl sm:grid-cols-2 sm:rounded-[var(--sf-radius-lg)]">
                <div className="aspect-square bg-[var(--sf-surface)] sm:aspect-auto sm:min-h-[420px]">
                    <ProductImage product={product} />
                </div>
                <div className="flex flex-col p-6 sm:p-8">
                    <button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer" className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--sf-muted)] hover:bg-[var(--sf-surface)]">
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                    {product.category && <p className="text-xs font-medium uppercase tracking-wide text-[var(--sf-muted)]">{product.category}</p>}
                    <h2 id="sf-product-title" className="mt-2 text-2xl font-semibold leading-tight [font-family:var(--sf-font-heading)]">{product.name}</h2>
                    <p className="mt-3 text-xl font-semibold">
                        {formatAmount(product.selling_price, currency)}
                        {unit !== 'pièce' && <span className="text-base font-normal text-[var(--sf-muted)]"> / {unit}</span>}
                    </p>
                    <p className="mt-2 text-sm text-[var(--sf-muted)]">{product.available ? 'Disponible' : 'Rupture de stock : ce produit ne peut pas être commandé pour le moment.'}</p>
                    {product.description && <p className="mt-5 whitespace-pre-line text-sm leading-7 text-[var(--sf-text)]">{product.description}</p>}
                    <div className="mt-auto pt-8">
                        <button type="button" onClick={() => onAdd(product)} disabled={!product.available} className={`${accentButtonClass(outline)} w-full`}>
                            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                            Ajouter au panier
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const EMPTY_ORDER: OrderForm = { name: '', phone: '', email: '', address: '', notes: '' };
const fieldClass = 'w-full rounded-[var(--sf-radius)] border border-[var(--sf-border)] bg-[var(--sf-bg)] px-4 py-3 text-sm text-[var(--sf-text)] outline-none placeholder:text-[var(--sf-muted)] focus:border-[var(--sf-text)]';

export function CartDrawer({ commerce, site, preview, outline, onClose }: {
    commerce: StorefrontCommerce;
    site: StorefrontSite;
    preview: boolean;
    outline: boolean;
    onClose: () => void;
}) {
    const [form, setForm] = useState<OrderForm>(EMPTY_ORDER);
    const closeRef = useRef<HTMLButtonElement>(null);
    useEscape(onClose);
    useEffect(() => { closeRef.current?.focus(); }, []);
    const currency = site.currency || 'XOF';
    const canSubmit = !preview && !commerce.order.submitting && form.name.trim() && commerce.lines.length > 0;
    const update = (key: keyof OrderForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-[var(--sf-overlay)]" onClick={onClose} aria-hidden="true" />
            <aside role="dialog" aria-modal="true" aria-labelledby="sf-cart-title" className="relative flex h-full w-full max-w-md flex-col bg-[var(--sf-bg)] text-[var(--sf-text)] shadow-2xl">
                <div className="flex items-center justify-between border-b border-[var(--sf-border)] px-6 py-5">
                    <h2 id="sf-cart-title" className="text-lg font-semibold [font-family:var(--sf-font-heading)]">Votre panier</h2>
                    <button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer le panier" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--sf-muted)] hover:bg-[var(--sf-surface)]">
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {commerce.order.success && <p role="status" className="mb-5 rounded-[var(--sf-radius)] bg-[var(--sf-accent-soft)] p-4 text-sm font-medium">{commerce.order.success}</p>}
                    {commerce.lines.length === 0 ? (
                        <p className="text-sm text-[var(--sf-muted)]">Votre panier est vide.</p>
                    ) : (
                        <ul className="space-y-4">
                            {commerce.lines.map((line) => (
                                <li key={line.product.product_id} className="flex gap-4">
                                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[var(--sf-radius)] bg-[var(--sf-surface)]"><ProductImage product={line.product} /></div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold">{line.product.name}</p>
                                        <p className="text-sm text-[var(--sf-muted)]">{formatAmount(line.product.selling_price, currency)}</p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <button type="button" onClick={() => commerce.updateQuantity(line.product.product_id, line.quantity - 1)} aria-label={`Retirer une unité de ${line.product.name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--sf-border)]"><Minus className="h-4 w-4" aria-hidden="true" /></button>
                                            <span className="min-w-8 text-center text-sm font-semibold" aria-live="polite">{line.quantity}</span>
                                            <button type="button" onClick={() => commerce.updateQuantity(line.product.product_id, line.quantity + 1)} disabled={line.quantity >= line.product.quantity} aria-label={`Ajouter une unité de ${line.product.name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--sf-border)] disabled:opacity-40"><Plus className="h-4 w-4" aria-hidden="true" /></button>
                                            <button type="button" onClick={() => commerce.updateQuantity(line.product.product_id, 0)} aria-label={`Supprimer ${line.product.name} du panier`} className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--sf-muted)] hover:bg-[var(--sf-surface)]"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {commerce.lines.length > 0 && (
                        <form className="mt-6 space-y-3 border-t border-[var(--sf-border)] pt-6" onSubmit={(event) => { event.preventDefault(); void commerce.submitOrder(form).then((ok) => { if (ok) setForm(EMPTY_ORDER); }); }}>
                            <div className="flex items-baseline justify-between">
                                <span className="text-sm text-[var(--sf-muted)]">Total</span>
                                <span className="text-xl font-semibold">{formatAmount(commerce.total, currency)}</span>
                            </div>
                            <label className="block text-sm font-medium" htmlFor="sf-order-name">Nom complet <span aria-hidden="true">*</span></label>
                            <input id="sf-order-name" required value={form.name} onChange={update('name')} autoComplete="name" className={fieldClass} />
                            <label className="block text-sm font-medium" htmlFor="sf-order-phone">Téléphone</label>
                            <input id="sf-order-phone" type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" className={fieldClass} />
                            <label className="block text-sm font-medium" htmlFor="sf-order-email">E-mail</label>
                            <input id="sf-order-email" type="email" value={form.email} onChange={update('email')} autoComplete="email" className={fieldClass} />
                            <label className="block text-sm font-medium" htmlFor="sf-order-address">Adresse de livraison</label>
                            <textarea id="sf-order-address" rows={2} value={form.address} onChange={update('address')} autoComplete="street-address" className={`${fieldClass} resize-none`} />
                            <label className="block text-sm font-medium" htmlFor="sf-order-notes">Note pour la boutique</label>
                            <textarea id="sf-order-notes" rows={2} value={form.notes} onChange={update('notes')} className={`${fieldClass} resize-none`} />
                            {site.payment_instructions && (
                                <div className="rounded-[var(--sf-radius)] bg-[var(--sf-surface)] p-4 text-sm leading-6"><p className="font-semibold">Paiement</p><p className="mt-1 whitespace-pre-line text-[var(--sf-muted)]">{site.payment_instructions}</p></div>
                            )}
                            {site.delivery_info && (
                                <div className="rounded-[var(--sf-radius)] bg-[var(--sf-surface)] p-4 text-sm leading-6"><p className="font-semibold">Livraison</p><p className="mt-1 whitespace-pre-line text-[var(--sf-muted)]">{site.delivery_info}</p></div>
                            )}
                            {commerce.order.error && <p role="alert" className="rounded-[var(--sf-radius)] border border-[var(--sf-text)] p-3 text-sm font-medium">{commerce.order.error}</p>}
                            <button type="submit" disabled={!canSubmit} className={`${accentButtonClass(outline)} w-full`}>
                                <Send className="h-4 w-4" aria-hidden="true" />
                                {preview ? "Commandes désactivées dans l'aperçu" : commerce.order.submitting ? 'Envoi...' : 'Envoyer la commande'}
                            </button>
                        </form>
                    )}
                </div>
            </aside>
        </div>
    );
}
