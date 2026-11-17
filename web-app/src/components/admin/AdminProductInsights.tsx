'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, PlusCircle, RefreshCw } from 'lucide-react';
import { admin as adminApi } from '../../services/api';

type Props = {
    refreshToken?: number;
    showToast: (message: string, type?: 'success' | 'error') => void;
    onOpenOwner?: (owner: { user_id: string; name?: string; email?: string }) => void;
};

const QUALITY_ORDER = ['no_selling_price', 'no_purchase_price', 'negative_stock', 'no_category', 'no_barcode'];
const QUALITY_HINT: Record<string, string> = {
    no_selling_price: 'Le produit peut être vendu à 0.',
    no_purchase_price: 'La marge ne peut pas être calculée.',
    negative_stock: 'Ventes enregistrées sans stock suffisant.',
    no_category: 'Rapports par catégorie incomplets.',
    no_barcode: 'Pas de scan possible en caisse.',
};

function formatPrice(value: number, currency: string) {
    const suffix = currency === 'XOF' || currency === 'XAF' ? 'FCFA' : currency === 'EUR' ? '€' : currency === '—' ? '' : currency;
    return `${Number(value || 0).toLocaleString('fr-FR', { maximumFractionDigits: currency === 'EUR' ? 2 : 0 })} ${suffix}`.trim();
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="mb-4">
            <h3 className="text-base font-black text-white">{title}</h3>
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
    );
}

// Onglet Produits, vue Analyse : qualité des fiches, produits les plus vendus, produits à ajouter au catalogue.
export default function AdminProductInsights({ refreshToken = 0, showToast, onOpenOwner }: Props) {
    const [country, setCountry] = useState('');
    const [sector, setSector] = useState('');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [handled, setHandled] = useState<Record<string, string>>({});
    const requestId = useRef(0);

    const load = async (refresh = false) => {
        const current = ++requestId.current;
        setLoading(true);
        try {
            const result = await adminApi.getProductsInsights({ country, sector, refresh });
            if (current === requestId.current) setData(result);
        } catch (error: any) {
            if (current === requestId.current) showToast(error?.message || 'Impossible de charger l’analyse des produits.', 'error');
        } finally {
            if (current === requestId.current) setLoading(false);
        }
    };

    useEffect(() => {
        void load(refreshToken > 0);
        // showToast change à chaque rendu du tableau de bord.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [country, sector, refreshToken]);

    const addToCatalog = async (candidate: any) => {
        setBusyKey(candidate.key);
        try {
            if (candidate.pending_catalog_id) {
                await adminApi.verifyCatalogProduct(candidate.pending_catalog_id);
                setHandled(current => ({ ...current, [candidate.key]: 'Fiche vérifiée : elle est proposée aux commerçants.' }));
                showToast(`« ${candidate.name} » est maintenant proposé aux commerçants.`);
            } else {
                await adminApi.createCatalogProduct({
                    display_name: candidate.name,
                    aliases: candidate.variants,
                    category: candidate.category || undefined,
                    sector: candidate.sector || sector || undefined,
                    unit: candidate.unit || undefined,
                    barcodes: candidate.barcodes,
                    country_codes: candidate.countries,
                    publication_status: 'draft',
                });
                setHandled(current => ({ ...current, [candidate.key]: 'Fiche créée en brouillon : relisez-la dans l’onglet Catalogue.' }));
                showToast(`« ${candidate.name} » ajouté au catalogue en brouillon.`);
            }
        } catch (error: any) {
            showToast(error?.message || 'Impossible d’ajouter ce produit au catalogue.', 'error');
        } finally {
            setBusyKey(null);
        }
    };

    const quality = data?.quality;
    const totalProducts = quality?.total_products || 0;
    const selectClass = 'bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50';

    return (
        <div className="space-y-6">
            <div className="glass-card p-5 flex flex-wrap items-center gap-3 justify-between">
                <div className="flex flex-wrap gap-2">
                    <select value={country} onChange={event => setCountry(event.target.value)} className={selectClass} aria-label="Pays">
                        <option value="">Tous les pays</option>
                        {(data?.countries || []).map((code: string) => <option key={code} value={code}>{code}</option>)}
                    </select>
                    <select value={sector} onChange={event => setSector(event.target.value)} className={selectClass} aria-label="Secteur">
                        <option value="">Tous les secteurs</option>
                        {(data?.sectors || []).map((item: any) => <option key={item.key} value={item.key}>{item.label}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                    {data?.computed_at ? <span>Données du {new Date(data.computed_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}, recalculées toutes les 5 minutes</span> : null}
                    <button onClick={() => void load(true)} className="p-2 text-slate-400 hover:text-white" title="Recalculer maintenant">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {!data && loading ? (
                <div className="glass-card py-16 text-center text-slate-400"><Loader2 className="mx-auto animate-spin" size={20} /></div>
            ) : null}

            {quality ? (
                <div className="glass-card p-6">
                    <SectionTitle title="Qualité des fiches produits" subtitle={`Sur ${totalProducts.toLocaleString('fr-FR')} produits en vente chez les commerçants (comptes de démonstration exclus).`} />
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                        {QUALITY_ORDER.map(flag => {
                            const value = quality.totals?.[flag] || 0;
                            const pct = totalProducts ? Math.round((value / totalProducts) * 100) : 0;
                            const serious = ['no_selling_price', 'negative_stock'].includes(flag);
                            return (
                                <div key={flag} className={`rounded-2xl border p-4 ${value && serious ? 'border-rose-500/20 bg-rose-500/10' : 'border-white/10 bg-white/5'}`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{quality.labels?.[flag] || flag}</p>
                                    <p className={`mt-2 text-2xl font-black ${value && serious ? 'text-rose-300' : 'text-white'}`}>{value.toLocaleString('fr-FR')}</p>
                                    <p className="text-[11px] text-slate-500">{pct} % · {QUALITY_HINT[flag]}</p>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-5 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                                    <th className="py-2 pr-4">Commerçant à accompagner</th>
                                    <th className="py-2 pr-4 text-right">Produits</th>
                                    <th className="py-2 pr-4 text-right">Sans prix de vente</th>
                                    <th className="py-2 pr-4 text-right">Sans prix d’achat</th>
                                    <th className="py-2 pr-4 text-right">Stock négatif</th>
                                    <th className="py-2 text-right">Sans catégorie</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {(quality.merchants || []).filter((row: any) => row.issues > 0).slice(0, 15).map((row: any) => (
                                    <tr key={row.user_id}>
                                        <td className="py-2.5 pr-4">
                                            <button
                                                disabled={!onOpenOwner}
                                                onClick={() => onOpenOwner?.({ user_id: row.user_id, name: row.name, email: row.email })}
                                                className="text-left hover:underline disabled:no-underline"
                                            >
                                                <span className="block font-semibold text-slate-100">{row.name}</span>
                                                <span className="block text-[11px] text-slate-500">{row.email}{row.country_code ? ` · ${row.country_code}` : ''}</span>
                                            </button>
                                        </td>
                                        <td className="py-2.5 pr-4 text-right text-slate-300">{row.products}</td>
                                        <td className={`py-2.5 pr-4 text-right ${row.no_selling_price ? 'font-bold text-rose-300' : 'text-slate-500'}`}>{row.no_selling_price}</td>
                                        <td className={`py-2.5 pr-4 text-right ${row.no_purchase_price ? 'text-amber-300' : 'text-slate-500'}`}>{row.no_purchase_price}</td>
                                        <td className={`py-2.5 pr-4 text-right ${row.negative_stock ? 'font-bold text-rose-300' : 'text-slate-500'}`}>{row.negative_stock}</td>
                                        <td className="py-2.5 text-right text-slate-400">{row.no_category}</td>
                                    </tr>
                                ))}
                                {!(quality.merchants || []).some((row: any) => row.issues > 0) && (
                                    <tr><td colSpan={6} className="py-6 text-center text-xs text-slate-500">Aucun commerçant avec des prix manquants ou un stock négatif.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}

            {data ? (
                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                    <div className="glass-card p-6">
                        <SectionTitle title="Produits les plus vendus, 30 derniers jours" subtitle="Classés par nombre de commerçants qui les vendent, puis par quantité. Ventes payées uniquement." />
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                                        <th className="py-2 pr-4">Produit</th>
                                        <th className="py-2 pr-4 text-right">Commerçants</th>
                                        <th className="py-2 pr-4 text-right">Quantité</th>
                                        <th className="py-2 text-right">Pays</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {(data.top_sold || []).map((row: any, index: number) => (
                                        <tr key={`${row.name}-${index}`}>
                                            <td className="py-2.5 pr-4 text-slate-100"><span className="mr-2 text-slate-500">{index + 1}.</span>{row.name}</td>
                                            <td className="py-2.5 pr-4 text-right font-bold text-white">{row.merchants}</td>
                                            <td className="py-2.5 pr-4 text-right text-slate-300">{Number(row.quantity).toLocaleString('fr-FR')}</td>
                                            <td className="py-2.5 text-right text-xs text-slate-500">{(row.countries || []).join(', ') || '—'}</td>
                                        </tr>
                                    ))}
                                    {!(data.top_sold || []).length && <tr><td colSpan={4} className="py-6 text-center text-xs text-slate-500">Aucune vente sur 30 jours.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <SectionTitle
                            title="Produits à ajouter au catalogue"
                            subtitle="Créés à la main par au moins deux commerçants et absents du catalogue proposé. L’ajout crée une fiche en brouillon, à relire dans l’onglet Catalogue avant publication."
                        />
                        <div className="space-y-2">
                            {(data.candidates || []).map((candidate: any) => (
                                <div key={candidate.key} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0">
                                        <p className="font-bold text-white">{candidate.name}</p>
                                        <p className="text-[11px] text-slate-500 truncate">
                                            {candidate.merchants} commerçants · {candidate.stores} boutiques
                                            {candidate.countries?.length ? ` · ${candidate.countries.join(', ')}` : ''}
                                            {candidate.category ? ` · ${candidate.category}` : ''}
                                            {candidate.unit ? ` · ${candidate.unit}` : ''}
                                        </p>
                                        {candidate.variants?.length > 1 ? <p className="text-[11px] text-slate-600 truncate">Aussi écrit : {candidate.variants.slice(1).join(', ')}</p> : null}
                                        {candidate.prices?.length ? (
                                            <p className="text-[11px] text-slate-400">
                                                Prix pratiqué : {candidate.prices.map((price: any) => `${formatPrice(price.median, price.currency)} (médiane de ${price.count})`).join(' · ')}
                                            </p>
                                        ) : null}
                                    </div>
                                    {handled[candidate.key] ? (
                                        <p className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-emerald-300"><CheckCircle2 size={14} /> {handled[candidate.key]}</p>
                                    ) : (
                                        <button
                                            onClick={() => void addToCatalog(candidate)}
                                            disabled={busyKey === candidate.key}
                                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-black text-primary hover:bg-primary/20 disabled:opacity-50"
                                        >
                                            {busyKey === candidate.key ? <Loader2 size={13} className="animate-spin" /> : <PlusCircle size={13} />}
                                            {candidate.pending_catalog_id ? 'Vérifier la fiche existante' : 'Ajouter au catalogue'}
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!(data.candidates || []).length && <p className="py-6 text-center text-xs text-slate-500">Aucun produit commun à plusieurs commerçants hors catalogue.</p>}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
