'use client';

// Domaine du site : adresse Stockman, connexion d'un domaine en trois étapes et suivi de son état.
// Mêmes règles que la carte mobile (lib/ecommerceDomain.ts) ; le serveur vérifie chaque opération.
import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock, Copy, ExternalLink, Globe, Info, Link2, RefreshCw, Trash2 } from 'lucide-react';
import { ecommerce as ecommerceApi, type EcommerceSite } from '../services/api';
import {
    DNS_PROVIDERS,
    describeDomainState,
    domainInputProblem,
    domainRecords,
    domainState,
    formatCheckedAt,
    recordPurpose,
    redirectHint,
    shouldAutoCheck,
    type DomainTone,
} from '../lib/ecommerceDomain';

const TONES: Record<DomainTone, { box: string; icon: React.ReactNode }> = {
    neutral: { box: 'border-white/15 bg-white/[0.03]', icon: <Globe size={18} className="text-slate-300" aria-hidden="true" /> },
    progress: { box: 'border-sky-400/40 bg-sky-500/10', icon: <Clock size={18} className="text-sky-300" aria-hidden="true" /> },
    warning: { box: 'border-amber-400/40 bg-amber-500/10', icon: <Info size={18} className="text-amber-300" aria-hidden="true" /> },
    success: { box: 'border-emerald-400/40 bg-emerald-500/10', icon: <Check size={18} className="text-emerald-300" aria-hidden="true" /> },
};
const smallButton = 'inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-50';
const mainButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition-colors disabled:opacity-50';

export default function EcommerceDomainPanel({ site, canEdit, readOnlyMessage, onSiteChange, onNotice }: {
    site: EcommerceSite;
    canEdit: boolean;
    readOnlyMessage?: string;
    onSiteChange: (site: EcommerceSite) => void;
    onNotice: (tone: 'success' | 'error', message: string) => void;
}) {
    const [domain, setDomain] = useState('');
    const [busy, setBusy] = useState<null | 'connect' | 'check' | 'disconnect'>(null);
    const [provider, setProvider] = useState<string | null>(null);
    const autoChecked = useRef<string | null>(null);

    const state = domainState(site);
    const status = describeDomainState(site);
    const records = domainRecords(site);
    const checkedAt = formatCheckedAt(site.domain_checked_at);
    const redirect = redirectHint(site);
    const stockmanUrl = site.stockman_site_url || site.site_url;
    const inputProblem = domain.trim() ? domainInputProblem(domain) : null;
    const siteHost = records.find((record) => record.purpose === 'site')?.host || site.custom_domain || 'www.votredomaine.com';

    // Tant que le domaine attend le DNS ou son certificat, une vérification part à l'ouverture.
    useEffect(() => {
        if (!canEdit || !site.custom_domain || autoChecked.current === site.custom_domain || !shouldAutoCheck(site)) return;
        autoChecked.current = site.custom_domain;
        ecommerceApi.checkDomain().then(onSiteChange).catch(() => undefined);
    }, [canEdit, site, onSiteChange]);

    async function run(kind: 'connect' | 'check' | 'disconnect', action: () => Promise<EcommerceSite>, success: (next: EcommerceSite) => string, fallback: string) {
        if (busy) return null;
        setBusy(kind);
        try {
            const next = await action();
            onSiteChange(next);
            onNotice('success', success(next));
            return next;
        } catch (error: any) {
            onNotice('error', error?.message || fallback);
            return null;
        } finally {
            setBusy(null);
        }
    }

    async function connect(event: React.FormEvent) {
        event.preventDefault();
        const problem = domainInputProblem(domain);
        if (problem) {
            onNotice('error', problem);
            return;
        }
        const next = await run('connect', () => ecommerceApi.connectDomain(domain.trim()), (value) => (domainState(value) === 'active' ? 'Domaine connecté : votre site est en ligne.' : 'Domaine enregistré. Ajoutez maintenant les enregistrements indiqués.'), 'Impossible de connecter ce domaine pour le moment.');
        if (next) setDomain('');
    }

    function disconnect() {
        if (!window.confirm(`Retirer ${site.custom_domain} ? Votre site ne s'ouvrira plus sur ce domaine ; il reste en ligne à son adresse Stockman.`)) return;
        void run('disconnect', () => ecommerceApi.disconnectDomain(), () => 'Domaine retiré. Votre site reste en ligne à son adresse Stockman.', 'Impossible de retirer le domaine pour le moment.');
    }

    async function copy(value: string, label: string) {
        try {
            await navigator.clipboard.writeText(value);
            onNotice('success', `${label} copié.`);
        } catch {
            onNotice('error', 'Copie impossible dans ce navigateur : sélectionnez le texte puis copiez-le.');
        }
    }

    function address(label: string, url: string) {
        return (
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
                <p className="mt-2 break-all text-sm font-black text-white">{url}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className={smallButton} onClick={() => void copy(url, 'Lien')}><Copy size={14} aria-hidden="true" />Copier</button>
                    <a href={url} target="_blank" rel="noreferrer" className={smallButton}><ExternalLink size={14} aria-hidden="true" />Ouvrir</a>
                </div>
            </div>
        );
    }

    const recordTable = (
        <div className="space-y-3">
            <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-white/5 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        <tr>
                            <th scope="col" className="px-4 py-3 font-black">Type</th>
                            <th scope="col" className="px-4 py-3 font-black">Nom</th>
                            <th scope="col" className="px-4 py-3 font-black">Valeur</th>
                            <th scope="col" className="px-4 py-3"><span className="sr-only">Copier</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((record) => (
                            <tr key={`${record.type}-${record.name}-${record.value}`} className="border-t border-white/10 align-top">
                                <td className="px-4 py-3 font-mono font-black text-primary">{record.type}</td>
                                <td className="px-4 py-3 font-mono text-white">{record.name}</td>
                                <td className="px-4 py-3">
                                    <span className="block break-all font-mono text-white">{record.value}</span>
                                    <span className="mt-1 block text-xs text-slate-400">{recordPurpose(record, site)}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button type="button" className={smallButton} onClick={() => void copy(record.value, 'Valeur')} aria-label={`Copier la valeur ${record.type} ${record.name}`}>
                                        <Copy size={14} aria-hidden="true" />Copier
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs leading-5 text-slate-400">
                Supprimez les anciens enregistrements A, AAAA ou CNAME sur ces mêmes noms. Certains fournisseurs demandent le nom complet (par exemple {siteHost}) au lieu du nom court.
            </p>
        </div>
    );

    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4">
                <p className="text-sm font-black text-white">Domaine du site</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">Votre site reste toujours accessible à son adresse Stockman. Vous pouvez aussi l'ouvrir sur un nom de domaine que vous possédez.</p>
            </div>

            <div role="status" className={`flex gap-3 rounded-2xl border-l-4 border p-4 ${TONES[status.tone].box}`}>
                <span className="mt-0.5 shrink-0">{TONES[status.tone].icon}</span>
                <div>
                    <p className="text-sm font-black text-white">{status.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{status.text}</p>
                    {redirect && <p className={`mt-1 text-sm leading-6 ${site.domain_redirect_ready ? 'text-slate-300' : 'text-amber-200'}`}>{redirect}</p>}
                </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
                {state === 'active' && site.custom_domain && address('Votre domaine', `https://${site.custom_domain}`)}
                {stockmanUrl && address('Adresse Stockman', stockmanUrl)}
            </div>

            {state === 'not_connected' && !canEdit && readOnlyMessage && (
                <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">{readOnlyMessage}</p>
            )}

            {state === 'not_connected' && canEdit && (
                <form onSubmit={(event) => void connect(event)} className="mt-5 space-y-4">
                    <p className="text-sm font-black text-white">Connecter votre nom de domaine</p>
                    <ol className="grid gap-3 md:grid-cols-3">
                        {['Saisissez le domaine que vous possédez.', 'Ajoutez chez votre fournisseur les enregistrements que Stockman vous indique.', 'Lancez la vérification : le site passe sur votre domaine dès que tout est prêt.'].map((step, index) => (
                            <li key={step} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-black text-primary">{index + 1}</span>
                                <span className="text-sm leading-6 text-slate-300">{step}</span>
                            </li>
                        ))}
                    </ol>
                    <div>
                        <label htmlFor="ecommerce-domain-input" className="text-sm font-bold text-white">Votre nom de domaine</label>
                        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                            <input
                                id="ecommerce-domain-input"
                                value={domain}
                                onChange={(event) => setDomain(event.target.value)}
                                placeholder="votredomaine.com"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                disabled={busy !== null}
                                aria-describedby="ecommerce-domain-help"
                                aria-invalid={!!inputProblem}
                                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                            />
                            <button type="submit" className={`${mainButton} bg-primary text-white hover:bg-primary/90`} disabled={busy !== null || !domain.trim()}>
                                <Link2 size={18} aria-hidden="true" />{busy === 'connect' ? 'Connexion...' : 'Connecter ce domaine'}
                            </button>
                        </div>
                        <p id="ecommerce-domain-help" className={`mt-2 text-xs leading-5 ${inputProblem ? 'text-amber-200' : 'text-slate-400'}`}>
                            {inputProblem || "Sans https://. Avec un domaine comme votredomaine.com, le site s'ouvre sur www.votredomaine.com et votredomaine.com y redirige. Un sous-domaine (boutique.votredomaine.com) est aussi accepté."}
                        </p>
                    </div>
                    <p className="text-xs leading-5 text-slate-500">Pas encore de domaine ? Achetez-le chez un fournisseur (OVHcloud, GoDaddy, Namecheap...), puis revenez ici.</p>
                </form>
            )}

            {state !== 'not_connected' && state !== 'active' && (
                <div className="mt-5 space-y-4">
                    <p className="text-sm font-black text-white">Enregistrements à créer chez votre fournisseur</p>
                    {recordTable}
                    <div>
                        <p className="text-sm font-bold text-white">Où faire ces réglages ?</p>
                        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Fournisseur du domaine">
                            {DNS_PROVIDERS.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    role="radio"
                                    aria-checked={provider === item.key}
                                    onClick={() => setProvider(provider === item.key ? null : item.key)}
                                    className={`min-h-9 rounded-full border px-4 text-xs font-bold transition ${provider === item.key ? 'border-primary bg-primary/15 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        {provider && <p className="mt-2 text-sm leading-6 text-slate-300">{DNS_PROVIDERS.find((item) => item.key === provider)?.tip}</p>}
                    </div>
                </div>
            )}

            {state === 'active' && records.length > 0 && (
                <details className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02]">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm font-bold text-white [&::-webkit-details-marker]:hidden">Voir les enregistrements DNS</summary>
                    <div className="border-t border-white/10 p-4">{recordTable}</div>
                </details>
            )}

            {state !== 'not_connected' && !canEdit && readOnlyMessage && (
                <p className="mt-4 text-xs leading-5 text-slate-400">{readOnlyMessage}</p>
            )}

            {state !== 'not_connected' && canEdit && (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button type="button" className={`${mainButton} bg-white/10 text-white hover:bg-white/15`} disabled={busy !== null} onClick={() => void run('check', () => ecommerceApi.checkDomain(), (value) => describeDomainState(value).title, 'Impossible de vérifier le domaine pour le moment.')}>
                        <RefreshCw size={18} aria-hidden="true" className={busy === 'check' ? 'animate-spin' : undefined} />{state === 'active' ? 'Vérifier à nouveau' : 'Vérifier maintenant'}
                    </button>
                    <button type="button" className={`${mainButton} text-rose-200 hover:bg-rose-500/10`} disabled={busy !== null} onClick={disconnect}>
                        <Trash2 size={18} aria-hidden="true" />{busy === 'disconnect' ? 'Retrait...' : 'Retirer ce domaine'}
                    </button>
                    {checkedAt && <span className="text-xs text-slate-400">{checkedAt}</span>}
                </div>
            )}
        </div>
    );
}
