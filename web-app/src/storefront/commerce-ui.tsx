'use client';

/* eslint-disable @next/next/no-img-element -- les images des produits et des médias sont déjà optimisées par Stockman. */
import React, { useEffect, useRef, useState } from 'react';
import { Check, Minus, Plus, Send, ShoppingBag, Trash2, X } from 'lucide-react';
import { formatAmount, type OrderForm, type StorefrontCommerce } from './useStorefrontCommerce';
import DenkmaDeliveryPicker, { useDenkmaDelivery } from './DenkmaDelivery';
import { OrderPaymentPanel, PaymentChoice, offeredPaymentMethod, paymentOptionsFor } from './OrderPayment';
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
        <article className={`sf-card group flex h-full flex-col ${bordered ? 'rounded-[var(--sf-radius)] border border-[var(--sf-border)] bg-[var(--sf-bg)] p-3' : ''}`}>
            <button type="button" onClick={() => onOpen(product)} className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sf-accent)]" aria-label={`Voir ${product.name}`}>
                <div className={`relative overflow-hidden rounded-[var(--sf-radius)] bg-[var(--sf-surface)] ${portrait ? 'aspect-[3/4]' : 'aspect-square'}`}>
                    <ProductImage product={product} className="transition duration-700 group-hover:scale-105" />
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

export function ProductDialog({ product, currency, outline, inCart, onClose, onAdd }: {
    product: StorefrontProduct;
    currency: string;
    outline: boolean;
    inCart: number;
    onClose: () => void;
    onAdd: (product: StorefrontProduct, quantity: number) => void;
}) {
    const closeRef = useRef<HTMLButtonElement>(null);
    const [quantity, setQuantity] = useState(1);
    useEscape(onClose);
    useEffect(() => { closeRef.current?.focus(); }, []);
    const unit = unitLabel(product.unit);
    // Le stock publié borne la quantité, en tenant compte de ce qui est déjà au panier.
    const remaining = Math.max(0, Math.floor(product.quantity) - inCart);
    const canAdd = product.available && remaining > 0;
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
            <div className="sf-overlay absolute inset-0 bg-[var(--sf-overlay)]" onClick={onClose} aria-hidden="true" />
            <div role="dialog" aria-modal="true" aria-labelledby="sf-product-title" className="sf-sheet relative grid max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-[var(--sf-radius-lg)] bg-[var(--sf-bg)] text-[var(--sf-text)] shadow-2xl sm:grid-cols-2 sm:rounded-[var(--sf-radius-lg)]">
                {/* Un seul bouton de fermeture : sur la photo au téléphone, en haut à droite sur ordinateur. */}
                <button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--sf-bg)] text-[var(--sf-text)] shadow-md hover:bg-[var(--sf-surface)]">
                    <X className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="relative aspect-square overflow-hidden bg-[var(--sf-surface)] sm:aspect-auto sm:min-h-[460px]">
                    <ProductImage product={product} />
                </div>
                <div className="flex flex-col p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8 sm:pt-16">
                    {product.category && <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--sf-muted)]">{product.category}</p>}
                    <h2 id="sf-product-title" className="mt-2 text-2xl font-semibold leading-tight [font-family:var(--sf-font-heading)] sm:text-3xl">{product.name}</h2>
                    <p className="mt-3 text-xl font-semibold">
                        {formatAmount(product.selling_price, currency)}
                        {unit !== 'pièce' && <span className="text-base font-normal text-[var(--sf-muted)]"> / {unit}</span>}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--sf-muted)]">
                        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${product.available ? 'bg-[#16A34A]' : 'bg-[var(--sf-muted)]'}`} />
                        {product.available ? 'Disponible' : 'Rupture de stock : ce produit ne peut pas être commandé pour le moment.'}
                    </p>
                    {product.description && <p className="mt-5 whitespace-pre-line text-sm leading-7 text-[var(--sf-text)]">{product.description}</p>}
                    <div className="mt-auto flex items-center gap-3 pt-8">
                        {canAdd && (
                            <div className="inline-flex h-12 shrink-0 items-center rounded-[var(--sf-radius-pill)] border border-[var(--sf-border)]" role="group" aria-label="Quantité">
                                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1} aria-label="Diminuer la quantité" className="inline-flex h-12 w-11 items-center justify-center disabled:opacity-40"><Minus className="h-4 w-4" aria-hidden="true" /></button>
                                <span className="min-w-8 text-center text-sm font-semibold" aria-live="polite">{quantity}</span>
                                <button type="button" onClick={() => setQuantity((value) => Math.min(remaining, value + 1))} disabled={quantity >= remaining} aria-label="Augmenter la quantité" className="inline-flex h-12 w-11 items-center justify-center disabled:opacity-40"><Plus className="h-4 w-4" aria-hidden="true" /></button>
                            </div>
                        )}
                        <button type="button" onClick={() => onAdd(product, Math.min(quantity, remaining))} disabled={!canAdd} className={`${accentButtonClass(outline)} min-h-12 flex-1`}>
                            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                            {product.available && remaining === 0 ? 'Quantité maximale au panier' : 'Ajouter au panier'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Confirmation d'ajout : en bas de l'écran sur téléphone, en haut à droite sur ordinateur.
export function CartToast({ product, currency, count, outline, onOpenCart, onClose }: {
    product: StorefrontProduct;
    currency: string;
    count: number;
    outline: boolean;
    onOpenCart: () => void;
    onClose: () => void;
}) {
    return (
        <div className="sf-pop fixed inset-x-3 bottom-3 z-[45] mx-auto max-w-md rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-[var(--sf-bg)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-[var(--sf-text)] shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-24 sm:w-96 sm:pb-4">
            <div className="flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-sm font-semibold">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--sf-accent)] text-[var(--sf-on-accent)]"><Check className="h-3.5 w-3.5" aria-hidden="true" /></span>
                    Ajouté au panier
                </p>
                <button type="button" onClick={onClose} aria-label="Fermer la confirmation" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--sf-muted)] hover:bg-[var(--sf-surface)]"><X className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <div className="mt-3 flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[var(--sf-radius)] bg-[var(--sf-surface)]"><ProductImage product={product} /></div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{product.name}</p>
                    <p className="text-sm text-[var(--sf-muted)]">{formatAmount(product.selling_price, currency)}</p>
                </div>
            </div>
            <button type="button" onClick={onOpenCart} className={`${accentButtonClass(outline)} mt-4 w-full`}>
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                Voir le panier ({count})
            </button>
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
    const denkma = useDenkmaDelivery(site.slug, Boolean(site.denkma_delivery), preview);
    const paymentOptions = paymentOptionsFor(site.payment, denkma.available);
    const [chosenPayment, setPaymentMethod] = useState<string | null>(null);
    const paymentMethod = offeredPaymentMethod(paymentOptions, chosenPayment);
    // Avec Denkma, le lieu de livraison et un téléphone joignable par le livreur sont indispensables.
    const deliveryReady = !denkma.available || Boolean(denkma.choice && form.phone.trim());
    const canSubmit = !preview && !commerce.order.submitting && form.name.trim() && commerce.lines.length > 0 && !denkma.loading && deliveryReady;
    const update = (key: keyof OrderForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="sf-overlay absolute inset-0 bg-[var(--sf-overlay)]" onClick={onClose} aria-hidden="true" />
            <aside role="dialog" aria-modal="true" aria-labelledby="sf-cart-title" className="sf-drawer relative flex h-full w-full max-w-md flex-col bg-[var(--sf-bg)] text-[var(--sf-text)] shadow-2xl">
                <div className="flex items-center justify-between border-b border-[var(--sf-border)] px-6 py-5">
                    <h2 id="sf-cart-title" className="text-lg font-semibold [font-family:var(--sf-font-heading)]">Votre panier</h2>
                    <button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer le panier" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--sf-muted)] hover:bg-[var(--sf-surface)]">
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                    {commerce.order.success && <p role="status" className="mb-5 rounded-[var(--sf-radius)] bg-[var(--sf-accent-soft)] p-4 text-sm font-medium">{commerce.order.success}</p>}
                    {commerce.placedOrder.placed && (
                        <div className="mb-5"><OrderPaymentPanel state={commerce.placedOrder} options={site.payment} variant="theme" format={formatAmount} /></div>
                    )}
                    {commerce.lines.length === 0 ? (
                        commerce.placedOrder.placed ? null :
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
                        <form className="mt-6 space-y-3 border-t border-[var(--sf-border)] pt-6" onSubmit={(event) => { event.preventDefault(); void commerce.submitOrder(form, denkma.choice ? { destination_session_id: denkma.choice.sessionId } : null, paymentMethod).then((ok) => { if (ok) { setForm(EMPTY_ORDER); denkma.reset(); } }); }}>
                            {denkma.choice && (
                                <>
                                    <div className="flex items-baseline justify-between text-sm text-[var(--sf-muted)]"><span>Articles</span><span>{formatAmount(commerce.total, currency)}</span></div>
                                    <div className="flex items-baseline justify-between text-sm text-[var(--sf-muted)]"><span>Livraison Denkma</span><span>{formatAmount(denkma.fee, currency)}</span></div>
                                </>
                            )}
                            <div className="flex items-baseline justify-between">
                                <span className="text-sm text-[var(--sf-muted)]">Total</span>
                                <span className="text-xl font-semibold">{formatAmount(commerce.total + denkma.fee, currency)}</span>
                            </div>
                            <label className="block text-sm font-medium" htmlFor="sf-order-name">Nom complet <span aria-hidden="true">*</span></label>
                            <input id="sf-order-name" required value={form.name} onChange={update('name')} autoComplete="name" className={fieldClass} />
                            <label className="block text-sm font-medium" htmlFor="sf-order-phone">Téléphone{denkma.available && <> <span aria-hidden="true">*</span> <span className="font-normal text-[var(--sf-muted)]">(pour le livreur)</span></>}</label>
                            <input id="sf-order-phone" type="tel" required={denkma.available} value={form.phone} onChange={update('phone')} autoComplete="tel" className={fieldClass} />
                            <label className="block text-sm font-medium" htmlFor="sf-order-email">E-mail</label>
                            <input id="sf-order-email" type="email" value={form.email} onChange={update('email')} autoComplete="email" className={fieldClass} />
                            {denkma.available || denkma.loading ? (
                                <DenkmaDeliveryPicker delivery={denkma} variant="theme" format={(amount) => formatAmount(amount, currency)} />
                            ) : (
                                <>
                                    <label className="block text-sm font-medium" htmlFor="sf-order-address">Adresse de livraison</label>
                                    <textarea id="sf-order-address" rows={2} value={form.address} onChange={update('address')} autoComplete="street-address" className={`${fieldClass} resize-none`} />
                                </>
                            )}
                            <label className="block text-sm font-medium" htmlFor="sf-order-notes">Note pour la boutique</label>
                            <textarea id="sf-order-notes" rows={2} value={form.notes} onChange={update('notes')} className={`${fieldClass} resize-none`} />
                            {paymentOptions && <PaymentChoice options={paymentOptions} value={paymentMethod} onChange={setPaymentMethod} variant="theme" />}
                            {site.payment_instructions && (
                                <div className="rounded-[var(--sf-radius)] bg-[var(--sf-surface)] p-4 text-sm leading-6"><p className="font-semibold">{site.payment ? 'À savoir sur le paiement' : 'Paiement'}</p><p className="mt-1 whitespace-pre-line text-[var(--sf-muted)]">{site.payment_instructions}</p></div>
                            )}
                            {site.delivery_info && (
                                <div className="rounded-[var(--sf-radius)] bg-[var(--sf-surface)] p-4 text-sm leading-6"><p className="font-semibold">Livraison</p><p className="mt-1 whitespace-pre-line text-[var(--sf-muted)]">{site.delivery_info}</p></div>
                            )}
                            {commerce.order.error && <p role="alert" className="rounded-[var(--sf-radius)] border border-[var(--sf-text)] p-3 text-sm font-medium">{commerce.order.error}</p>}
                            <button type="submit" disabled={!canSubmit} className={`${accentButtonClass(outline)} w-full`}>
                                <Send className="h-4 w-4" aria-hidden="true" />
                                {preview ? "Commandes désactivées dans l'aperçu" : commerce.order.submitting ? 'Envoi...' : paymentMethod && paymentMethod !== 'on_delivery' && site.payment ? 'Commander et payer' : 'Envoyer la commande'}
                            </button>
                        </form>
                    )}
                </div>
            </aside>
        </div>
    );
}
