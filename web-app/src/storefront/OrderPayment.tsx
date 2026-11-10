'use client';

/* eslint-disable @next/next/no-img-element -- logo d'opérateur : petit fichier statique, déjà à sa taille d'affichage. */
// Paiement d'une commande dans la boutique. Le client paie le commerçant directement, une seule
// fois (articles et livraison), sur son compte Wave ou Orange Money, ou à la livraison.
// Avant la commande : le choix du mode. Après : le montant, le numéro à copier, « J'ai payé »,
// puis la confirmation de la boutique, qui s'affiche toute seule.
import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Loader2 } from 'lucide-react';

export type PaymentWallet = { id: string; label: string; phone: string; name?: string | null; link?: string | null };
export type PaymentOptions = { wallets: PaymentWallet[]; on_delivery: boolean };
export type PaymentStatus = 'awaiting' | 'declared' | 'paid';

// Commande que le client vient de passer ; gardée sur son appareil pour qu'il retrouve la page de
// paiement après être passé dans l'application de son opérateur.
export type PlacedOrder = {
    orderId: string;
    orderNumber: string;
    token: string;
    amountDue: number;
    currency: string;
    method: string;
    status: PaymentStatus;
    orderStatus: string;
};

const POLL_MS = 6000;

// Logo de chaque opérateur, servi depuis web-app/public/payment/ ; pour un opérateur sans fichier
// (null), une pastille à sa couleur le remplace.
const WALLET_LOGOS: Record<string, string | null> = { wave: '/payment/wave.png', orange_money: '/payment/orange_money.jpg' };
const WALLET_COLORS: Record<string, string> = { wave: '#1DC8FF', orange_money: '#FF7900' };
// Fond de la vignette : celui du logo, pour que les deux opérateurs aient une vignette carrée de même taille.
const WALLET_TILES: Record<string, string> = { wave: '#1DC8FF', orange_money: '#000000' };

export function WalletMark({ id, label, size = 44 }: { id: string; label: string; size?: number }) {
    const logo = WALLET_LOGOS[id];
    const box = { width: size, height: size, borderRadius: Math.round(size / 4) };
    if (logo) {
        return (
            <span className="inline-flex shrink-0 items-center justify-center overflow-hidden" style={{ ...box, backgroundColor: WALLET_TILES[id] || 'transparent' }}>
                <img src={logo} alt={label} width={size} height={size} className="h-full w-full object-contain" />
            </span>
        );
    }
    return <span aria-hidden="true" className="inline-block shrink-0" style={{ ...box, backgroundColor: WALLET_COLORS[id] || 'currentColor' }} />;
}
const CLOSED = ['cancelled', 'rejected'];

function storageKey(slug: string) {
    return `stockman-order-${slug}`;
}

function readStored(slug: string): PlacedOrder | null {
    try {
        const raw = window.localStorage.getItem(storageKey(slug));
        const value = raw ? JSON.parse(raw) : null;
        return value && typeof value.orderId === 'string' && typeof value.token === 'string' ? value : null;
    } catch {
        return null;
    }
}

function writeStored(slug: string, order: PlacedOrder | null) {
    try {
        if (order) window.localStorage.setItem(storageKey(slug), JSON.stringify(order));
        else window.localStorage.removeItem(storageKey(slug));
    } catch {
        // Stockage indisponible (navigation privée) : la page de paiement reste affichée tant qu'elle est ouverte.
    }
}

// Une commande livrée par Denkma se paie avant son départ : le livreur n'encaisse jamais pour la boutique.
export function paymentOptionsFor(options: PaymentOptions | null | undefined, denkmaDelivery: boolean): PaymentOptions | null {
    if (!options) return null;
    return denkmaDelivery ? { ...options, on_delivery: false } : options;
}

// Mode choisi s'il est encore proposé, sinon le premier proposé.
export function offeredPaymentMethod(options: PaymentOptions | null | undefined, chosen: string | null): string | null {
    if (!options) return null;
    const offered = chosen === 'on_delivery' ? options.on_delivery : options.wallets.some((wallet) => wallet.id === chosen);
    return offered ? chosen : defaultPaymentMethod(options);
}

export function defaultPaymentMethod(options: PaymentOptions | null | undefined): string | null {
    if (!options) return null;
    return options.wallets[0]?.id || (options.on_delivery ? 'on_delivery' : null);
}

// Numéro lisible : +221 77 123 45 67.
export function displayPhone(phone: string): string {
    const match = /^\+221(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
    return match ? `+221 ${match[1]} ${match[2]} ${match[3]} ${match[4]}` : phone;
}

// Numéro tel qu'on le saisit dans l'application de l'opérateur au Sénégal : sans indicatif.
export function localPhone(phone: string): string {
    return phone.startsWith('+221') ? phone.slice(4) : phone;
}

export function usePlacedOrder(slug: string, enabled: boolean) {
    const [placed, setPlaced] = useState<PlacedOrder | null>(null);
    const [declaring, setDeclaring] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (enabled && slug) setPlaced(readStored(slug));
    }, [enabled, slug]);

    const save = useCallback((order: PlacedOrder | null) => {
        setPlaced(order);
        if (slug) writeStored(slug, order);
    }, [slug]);

    const merge = useCallback((state: { status?: string; order_status?: string; amount_due?: number; method?: string }) => {
        setPlaced((current) => {
            if (!current) return current;
            const next: PlacedOrder = {
                ...current,
                status: (state.status as PaymentStatus) || current.status,
                orderStatus: state.order_status || current.orderStatus,
                amountDue: typeof state.amount_due === 'number' ? state.amount_due : current.amountDue,
                method: state.method || current.method,
            };
            writeStored(slug, next);
            return next;
        });
    }, [slug]);

    const orderId = placed?.orderId;
    const token = placed?.token;
    const settled = !placed || placed.status === 'paid' || CLOSED.includes(placed.orderStatus);

    // La confirmation de la boutique arrive toute seule ; rien n'est demandé tant que l'onglet est caché.
    useEffect(() => {
        if (!orderId || !token || settled) return undefined;
        let stopped = false;
        const refresh = async () => {
            if (document.visibilityState !== 'visible') return;
            try {
                const response = await fetch(`/api/public/ecommerce/${slug}/orders/${orderId}/payment`, { headers: { 'X-Order-Token': token } });
                if (stopped) return;
                if (response.status === 404) {
                    save(null);
                    return;
                }
                if (response.ok) merge(await response.json());
            } catch {
                // Réseau instable : le prochain passage réessaiera.
            }
        };
        void refresh();
        const timer = window.setInterval(refresh, POLL_MS);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            stopped = true;
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, [merge, orderId, save, settled, slug, token]);

    const declare = useCallback(async () => {
        if (!orderId || !token) return;
        setDeclaring(true);
        setError(null);
        try {
            const response = await fetch(`/api/public/ecommerce/${slug}/orders/${orderId}/payment/declared`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : "Impossible de prévenir la boutique pour le moment.");
            merge(data);
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : "Impossible de prévenir la boutique pour le moment.");
        } finally {
            setDeclaring(false);
        }
    }, [merge, orderId, slug, token]);

    return { placed, place: save, dismiss: () => save(null), declare, declaring, error };
}

export type PlacedOrderState = ReturnType<typeof usePlacedOrder>;

const STYLES = {
    theme: {
        title: 'text-sm font-medium',
        option: 'flex w-full items-center gap-3 rounded-[var(--sf-radius)] border bg-[var(--sf-bg)] p-4 text-left text-sm transition',
        optionOn: 'border-[var(--sf-accent)] ring-1 ring-[var(--sf-accent)]',
        optionOff: 'border-[var(--sf-border)] hover:border-[var(--sf-accent)]',
        muted: 'text-[var(--sf-muted)]',
        panel: 'space-y-4 rounded-[var(--sf-radius)] border border-[var(--sf-border)] bg-[var(--sf-surface)] p-5 text-sm leading-6',
        amount: 'text-3xl font-semibold [font-family:var(--sf-font-heading)]',
        box: 'rounded-[var(--sf-radius)] border border-[var(--sf-border)] bg-[var(--sf-bg)] p-4',
        number: 'text-2xl font-semibold tracking-wide',
        button: 'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sf-radius-pill)] bg-[var(--sf-accent)] px-6 text-sm font-semibold text-[var(--sf-on-accent)] disabled:opacity-60',
        ghost: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--sf-radius-pill)] border border-[var(--sf-border)] px-4 text-sm font-semibold',
        link: 'text-sm font-semibold underline underline-offset-4',
        good: 'rounded-[var(--sf-radius)] bg-[var(--sf-accent-soft)] p-4 font-medium',
        error: 'rounded-[var(--sf-radius)] border border-[var(--sf-text)] p-3 text-sm font-medium',
        step: 'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--sf-text)] text-xs font-semibold text-[var(--sf-bg)]',
    },
    basic: {
        title: 'text-sm font-black text-slate-950',
        option: 'flex w-full items-center gap-3 rounded-xl border bg-white p-4 text-left text-sm transition',
        optionOn: 'border-emerald-500 ring-1 ring-emerald-500',
        optionOff: 'border-slate-200 hover:border-emerald-500',
        muted: 'text-slate-500',
        panel: 'space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-800',
        amount: 'text-3xl font-black text-slate-950',
        box: 'rounded-xl border border-slate-200 bg-white p-4',
        number: 'text-2xl font-black tracking-wide text-slate-950',
        button: 'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-black text-white disabled:opacity-60',
        ghost: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800',
        link: 'text-sm font-bold text-emerald-700 underline underline-offset-4',
        good: 'rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-900',
        error: 'rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700',
        step: 'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white',
    },
};

type Variant = keyof typeof STYLES;

export function PaymentChoice({ options, value, onChange, variant }: {
    options: PaymentOptions;
    value: string | null;
    onChange: (method: string) => void;
    variant: Variant;
}) {
    const s = STYLES[variant];
    const choices = [
        ...options.wallets.map((wallet) => ({ id: wallet.id, wallet: wallet.label as string | null, label: `Payer avec ${wallet.label}`, text: 'Vous payez la boutique juste après la commande : le numéro et le montant exact s’affichent.' })),
        ...(options.on_delivery ? [{ id: 'on_delivery', wallet: null as string | null, label: 'Payer à la livraison', text: 'Vous payez la boutique à la réception de votre commande.' }] : []),
    ];
    return (
        <div className="space-y-3" role="radiogroup" aria-labelledby="sf-payment-title">
            <p id="sf-payment-title" className={s.title}>Paiement <span aria-hidden="true">*</span></p>
            {choices.map((choice) => {
                const selected = value === choice.id;
                return (
                    <button key={choice.id} type="button" role="radio" aria-checked={selected} onClick={() => onChange(choice.id)} className={`${s.option} ${selected ? s.optionOn : s.optionOff}`}>
                        <span aria-hidden="true" className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-current' : 'border-current opacity-40'}`}>
                            {selected && <span className="h-2.5 w-2.5 rounded-full bg-current" />}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="font-semibold">{choice.label}</span>
                            <span className={s.muted}>{choice.text}</span>
                        </span>
                        {choice.wallet && <WalletMark id={choice.id} label={choice.wallet} />}
                    </button>
                );
            })}
            <p className={`text-xs leading-5 ${s.muted}`}>Un seul paiement, articles et livraison compris, versé directement à la boutique.</p>
        </div>
    );
}

function WalletDetails({ wallet, amount, variant }: { wallet: PaymentWallet; amount: string; variant: Variant }) {
    const s = STYLES[variant];
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(localPhone(wallet.phone));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
        } catch {
            setCopied(false);
        }
    };
    return (
        <div className={s.box}>
            <p className={`flex items-center gap-3 ${s.muted}`}><WalletMark id={wallet.id} label={wallet.label} size={36} />Numéro {wallet.label} de la boutique</p>
            <p className={s.number}>{displayPhone(wallet.phone)}</p>
            {wallet.name && <p className={s.muted}>Au nom de <span className="font-semibold">{wallet.name}</span> : vérifiez ce nom avant de valider.</p>}
            <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void copy()} className={s.ghost}>
                    {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                    <span aria-live="polite">{copied ? 'Numéro copié' : 'Copier le numéro'}</span>
                </button>
                {wallet.link && (
                    <a href={wallet.link} target="_blank" rel="noopener noreferrer" className={s.ghost}>
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        Ouvrir {wallet.label}
                    </a>
                )}
            </div>
            <p className={`mt-3 ${s.muted}`}>Montant à saisir : <span className="font-semibold">{amount}</span></p>
        </div>
    );
}

export function OrderPaymentPanel({ state, options, variant, format }: {
    state: PlacedOrderState;
    options: PaymentOptions | null | undefined;
    variant: Variant;
    format: (amount: number, currency: string) => string;
}) {
    const s = STYLES[variant];
    const { placed } = state;
    const [payNow, setPayNow] = useState<string | null>(null);
    if (!placed) return null;
    const amount = format(placed.amountDue, placed.currency);
    const wallets = options?.wallets || [];
    const chosen = wallets.find((wallet) => wallet.id === (payNow || placed.method)) || null;
    const cancelled = CLOSED.includes(placed.orderStatus);

    return (
        <section className={s.panel} aria-labelledby="sf-placed-title">
            <div>
                <p id="sf-placed-title" className="font-semibold">Commande {placed.orderNumber} envoyée</p>
                <p className={s.muted}>Total, livraison comprise</p>
                <p className={s.amount}>{amount}</p>
            </div>

            {cancelled ? (
                <p role="status" className={s.error}>La boutique a annulé cette commande. Ne payez pas ; contactez-la si vous avez déjà payé.</p>
            ) : placed.status === 'paid' ? (
                <p role="status" className={s.good}><Check className="mr-2 inline h-4 w-4" aria-hidden="true" />Paiement confirmé par la boutique. Votre commande est en préparation.</p>
            ) : placed.status === 'declared' ? (
                <div role="status" className={s.good}>
                    <p className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />La boutique vérifie votre paiement.</p>
                    <p className={`mt-1 font-normal ${s.muted}`}>Vous pouvez laisser cette page ouverte : la confirmation s’affichera ici toute seule.</p>
                </div>
            ) : chosen ? (
                <>
                    <ol className="space-y-4">
                        <li className="flex gap-3">
                            <span className={s.step} aria-hidden="true">1</span>
                            <div className="min-w-0 flex-1 space-y-3">
                                <p className="font-semibold">Envoyez {amount} avec {chosen.label}</p>
                                <WalletDetails wallet={chosen} amount={amount} variant={variant} />
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <span className={s.step} aria-hidden="true">2</span>
                            <div className="min-w-0 flex-1 space-y-3">
                                <p className="font-semibold">Revenez ici et prévenez la boutique</p>
                                <button type="button" onClick={() => void state.declare()} disabled={state.declaring} className={s.button}>
                                    {state.declaring ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                                    {state.declaring ? 'Envoi...' : 'J’ai payé'}
                                </button>
                            </div>
                        </li>
                    </ol>
                    {wallets.length > 1 && (
                        <p className={s.muted}>
                            Autre moyen : {wallets.filter((wallet) => wallet.id !== chosen.id).map((wallet) => (
                                <button key={wallet.id} type="button" onClick={() => setPayNow(wallet.id)} className={s.link}>payer avec {wallet.label}</button>
                            ))}
                        </p>
                    )}
                </>
            ) : (
                <div className="space-y-3">
                    <p role="status" className={s.good}>Vous paierez la boutique à la réception de votre commande.</p>
                    {wallets.length > 0 && (
                        <p className={s.muted}>
                            Vous préférez payer maintenant ? {wallets.map((wallet, index) => (
                                <React.Fragment key={wallet.id}>
                                    {index > 0 && ' ou '}
                                    <button type="button" onClick={() => setPayNow(wallet.id)} className={s.link}>avec {wallet.label}</button>
                                </React.Fragment>
                            ))}
                        </p>
                    )}
                </div>
            )}

            {state.error && <p role="alert" className={s.error}>{state.error}</p>}
            {/* Tant qu'un paiement mobile est attendu, la page reste : le client doit pouvoir y revenir. */}
            {(placed.status === 'paid' || cancelled || !chosen) && <button type="button" onClick={state.dismiss} className={s.link}>Fermer</button>}
        </section>
    );
}
