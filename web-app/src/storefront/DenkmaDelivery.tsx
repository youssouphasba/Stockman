'use client';

// Livraison Denkma au moment de la commande : le client choisit sa position (à domicile) ou un
// point relais sur la page Denkma, sans écrire d'adresse. Commun aux deux rendus de la vitrine.
import React, { useCallback, useEffect, useRef, useState } from 'react';

export type DenkmaMode = 'home_to_home' | 'home_to_relay';
export type DenkmaChoice = { sessionId: string; mode: DenkmaMode; amount: number; relayName?: string | null };
type DenkmaOption = { mode: DenkmaMode; label: string; from_amount: number };
type PendingSession = { sessionId: string; mode: DenkmaMode; url: string; embedded: boolean };

const POLL_MS = 3000;
const SESSION_MS = 30 * 60 * 1000;
const DESCRIPTIONS: Record<DenkmaMode, string> = {
    home_to_home: 'Le livreur vient au point exact que vous indiquez sur la carte.',
    home_to_relay: 'Vous retirez votre colis dans un point relais Denkma proche de chez vous.',
};

async function readError(response: Response, fallback: string) {
    try {
        const data = await response.json();
        return typeof data?.detail === 'string' ? data.detail : fallback;
    } catch {
        return fallback;
    }
}

export function useDenkmaDelivery(slug: string, enabled: boolean, disabled: boolean) {
    const [options, setOptions] = useState<DenkmaOption[] | null>(null);
    const [choice, setChoice] = useState<DenkmaChoice | null>(null);
    const [pending, setPending] = useState<PendingSession | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [starting, setStarting] = useState<DenkmaMode | null>(null);
    const startedAt = useRef(0);

    useEffect(() => {
        let cancelled = false;
        if (!enabled || disabled || !slug) {
            setOptions([]);
            return undefined;
        }
        setOptions(null);
        fetch(`/api/public/ecommerce/${slug}/delivery`, { cache: 'no-store' })
            .then((response) => (response.ok ? response.json() : { modes: [] }))
            .then((data) => { if (!cancelled) setOptions(Array.isArray(data?.modes) ? data.modes : []); })
            .catch(() => { if (!cancelled) setOptions([]); });
        return () => { cancelled = true; };
    }, [disabled, enabled, slug]);

    const check = useCallback(async (session: PendingSession) => {
        const response = await fetch(`/api/public/ecommerce/${slug}/delivery/session/${encodeURIComponent(session.sessionId)}`, { cache: 'no-store' });
        if (!response.ok) {
            setPending(null);
            setError(await readError(response, 'La livraison Denkma est indisponible pour le moment.'));
            return;
        }
        const data = await response.json();
        if (data?.confirmed) {
            setChoice({ sessionId: session.sessionId, mode: data.mode || session.mode, amount: Number(data.amount) || 0, relayName: data.relay_name || null });
            setPending(null);
            setError(null);
        }
    }, [slug]);

    // Confirmation détectée par le message de la page intégrée, sinon par une vérification régulière.
    useEffect(() => {
        if (!pending) return undefined;
        let origin = '';
        try {
            origin = new URL(pending.url).origin;
        } catch {
            origin = '';
        }
        const receive = (event: MessageEvent) => {
            if (event.origin === origin && event.data?.type === 'denkma-destination' && event.data?.session === pending.sessionId) void check(pending);
        };
        window.addEventListener('message', receive);
        const timer = window.setInterval(() => {
            if (Date.now() - startedAt.current > SESSION_MS) {
                setPending(null);
                setError('Le choix a expiré. Recommencez.');
                return;
            }
            void check(pending).catch(() => undefined);
        }, POLL_MS);
        return () => {
            window.removeEventListener('message', receive);
            window.clearInterval(timer);
        };
    }, [check, pending]);

    const start = useCallback(async (mode: DenkmaMode) => {
        setError(null);
        setStarting(mode);
        try {
            const response = await fetch(`/api/public/ecommerce/${slug}/delivery/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, page_origin: window.location.origin }),
            });
            if (!response.ok) throw new Error(await readError(response, "Impossible d'ouvrir la carte Denkma pour le moment."));
            const data = await response.json();
            startedAt.current = Date.now();
            setChoice(null);
            setPending({ sessionId: data.session_id, mode, url: data.url, embedded: Boolean(data.embedded) });
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : "Impossible d'ouvrir la carte Denkma pour le moment.");
        } finally {
            setStarting(null);
        }
    }, [slug]);

    return {
        loading: enabled && !disabled && options === null,
        available: enabled && !disabled && (options?.length ?? 0) > 0,
        options: options || [],
        choice,
        pending,
        error,
        starting,
        start,
        cancel: () => setPending(null),
        reset: () => { setChoice(null); setPending(null); setError(null); },
        fee: choice?.amount || 0,
    };
}

export type DenkmaDelivery = ReturnType<typeof useDenkmaDelivery>;

const STYLES = {
    theme: {
        title: 'text-sm font-medium',
        card: 'flex w-full flex-col gap-1 rounded-[var(--sf-radius)] border border-[var(--sf-border)] bg-[var(--sf-bg)] p-4 text-left text-sm transition hover:border-[var(--sf-accent)] disabled:opacity-60',
        muted: 'text-[var(--sf-muted)]',
        summary: 'rounded-[var(--sf-radius)] bg-[var(--sf-surface)] p-4 text-sm leading-6',
        link: 'text-sm font-semibold underline underline-offset-4',
        panel: 'relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[var(--sf-radius-lg)] bg-[var(--sf-bg)] text-[var(--sf-text)] shadow-2xl sm:rounded-[var(--sf-radius-lg)]',
        button: 'inline-flex min-h-11 items-center justify-center rounded-[var(--sf-radius-pill)] bg-[var(--sf-accent)] px-6 text-sm font-semibold text-[var(--sf-on-accent)]',
        error: 'rounded-[var(--sf-radius)] border border-[var(--sf-text)] p-3 text-sm font-medium',
    },
    basic: {
        title: 'text-sm font-black text-slate-950',
        card: 'flex w-full flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4 text-left text-sm transition hover:border-emerald-500 disabled:opacity-60',
        muted: 'text-slate-500',
        summary: 'rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950',
        link: 'text-sm font-bold text-emerald-700 underline underline-offset-4',
        panel: 'relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white text-slate-950 shadow-2xl sm:rounded-2xl',
        button: 'inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-6 text-sm font-black text-white',
        error: 'rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700',
    },
};

export default function DenkmaDeliveryPicker({ delivery, variant, format }: {
    delivery: DenkmaDelivery;
    variant: 'theme' | 'basic';
    format: (amount: number) => string;
}) {
    const s = STYLES[variant];
    const { choice, pending } = delivery;
    return (
        <div className="space-y-3" role="group" aria-labelledby="denkma-delivery-title">
            <p id="denkma-delivery-title" className={s.title}>Livraison par Denkma <span aria-hidden="true">*</span></p>
            {delivery.loading && <p className={`text-sm ${s.muted}`}>Chargement des modes de livraison...</p>}
            {choice ? (
                <div className={s.summary} role="status">
                    <p className="font-semibold">{choice.mode === 'home_to_relay' ? `Point relais : ${choice.relayName || 'choisi'}` : 'À domicile : position confirmée'}</p>
                    <p>Livraison : {format(choice.amount)}</p>
                    <button type="button" className={`mt-1 ${s.link}`} onClick={delivery.reset}>Modifier</button>
                </div>
            ) : (
                delivery.options.map((option) => (
                    <button key={option.mode} type="button" className={s.card} disabled={delivery.starting !== null} onClick={() => void delivery.start(option.mode)}>
                        <span className="font-semibold">{option.mode === 'home_to_relay' ? 'En point relais' : 'À domicile'} · à partir de {format(option.from_amount)}</span>
                        <span className={s.muted}>{DESCRIPTIONS[option.mode]}</span>
                        <span className={`font-semibold ${s.muted}`}>{delivery.starting === option.mode ? 'Ouverture...' : option.mode === 'home_to_relay' ? 'Choisir mon point relais' : 'Indiquer ma position'}</span>
                    </button>
                ))
            )}
            {!choice && <p className={`text-xs leading-5 ${s.muted}`}>Aucune adresse à écrire : vous indiquez le lieu sur la carte Denkma, puis le prix exact s&apos;affiche. La livraison se règle avec la commande.</p>}
            {delivery.error && <p role="alert" className={s.error}>{delivery.error}</p>}
            {pending && (
                <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/50" onClick={delivery.cancel} aria-hidden="true" />
                    <div role="dialog" aria-modal="true" aria-label="Choisir le lieu de livraison avec Denkma" className={s.panel}>
                        <div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-3">
                            <p className="text-sm font-semibold">{pending.mode === 'home_to_relay' ? 'Choisissez votre point relais' : 'Indiquez votre position'}</p>
                            <button type="button" onClick={delivery.cancel} className={s.link}>Fermer</button>
                        </div>
                        {pending.embedded ? (
                            <iframe src={pending.url} title="Carte Denkma" allow="geolocation" className="h-[70vh] w-full border-0" />
                        ) : (
                            <div className="space-y-4 p-5 text-sm leading-6">
                                <p>La carte Denkma s&apos;ouvre dans un nouvel onglet. Confirmez-y {pending.mode === 'home_to_relay' ? 'votre point relais' : 'votre position'}, puis revenez ici : le prix de la livraison s&apos;affichera tout seul.</p>
                                <a href={pending.url} target="_blank" rel="noopener noreferrer" className={s.button}>Ouvrir la carte Denkma</a>
                                <p className={s.muted} role="status">En attente de votre confirmation...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
