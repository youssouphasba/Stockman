'use client';

import Button from '../ui/Button';
import React, { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { admin as adminApi } from '../../services/api';

// Catalogue, sous-onglet Marketplace : produits des fournisseurs reliés par les commerçants à leurs produits.
export default function AdminMarketplaceAdoption({ refreshToken = 0 }: { refreshToken?: number }) {
    const [catalogAdoption, setCatalogAdoption] = useState<any[]>([]);
    const [catalogAdoptionLoading, setCatalogAdoptionLoading] = useState(false);

    const loadCatalogAdoption = async () => {
        setCatalogAdoptionLoading(true);
        try { setCatalogAdoption(await adminApi.getCatalogAdoption(50) || []); }
        catch { setCatalogAdoption([]); }
        finally { setCatalogAdoptionLoading(false); }
    };

    useEffect(() => { void loadCatalogAdoption(); }, [refreshToken]);

    return (
            <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h3 className="text-lg font-black text-white uppercase tracking-widest">Adoption des catalogues fournisseurs</h3>
                    <Button variant="primary" size="md" onClick={loadCatalogAdoption} disabled={catalogAdoptionLoading} className="uppercase tracking-widest">
                        {catalogAdoptionLoading ? 'Chargement...' : 'Actualiser'}
                    </Button>
                </div>

                {catalogAdoptionLoading && <div className="text-center py-20 text-slate-500 text-sm">Chargement...</div>}

                {!catalogAdoptionLoading && catalogAdoption.length === 0 && (
                    <div className="glass-card p-16 text-center">
                        <Package size={48} className="mx-auto mb-4 text-slate-600" />
                        <p className="text-slate-500 text-sm uppercase tracking-widest font-black mb-6">Aucune donnée</p>
                        <Button variant="primary" size="lg" onClick={loadCatalogAdoption} className="uppercase tracking-widest">Charger</Button>
                    </div>
                )}

                {!catalogAdoptionLoading && catalogAdoption.length > 0 && (() => {
                    const maxAdoption = Math.max(...catalogAdoption.map(p => p.adoption_count), 1);
                    return (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="glass-card p-5">
                                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Produits adoptés</div>
                                    <div className="text-2xl font-black text-white">{catalogAdoption.length}</div>
                                </div>
                                <div className="glass-card p-5">
                                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Top adoption</div>
                                    <div className="text-2xl font-black text-primary">{catalogAdoption[0]?.adoption_count || 0}</div>
                                    <div className="text-xs text-slate-500 truncate mt-1">{catalogAdoption[0]?.display_name || '—'}</div>
                                </div>
                                <div className="glass-card p-5">
                                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Produits reliés</div>
                                    <div className="text-2xl font-black text-white">{catalogAdoption.reduce((s, p) => s + p.adoption_count, 0).toLocaleString('fr-FR')}</div>
                                </div>
                            </div>

                            <div className="glass-card overflow-hidden">
                                <div className="p-5 border-b border-white/5 bg-white/5">
                                    <h4 className="text-sm font-black text-white uppercase tracking-widest">Top {catalogAdoption.length} produits les plus adoptés</h4>
                                    <p className="text-xs text-slate-500 mt-1">Produits des catalogues fournisseurs que les commerçants ont reliés à leurs propres produits, en général à la réception d'une commande.</p>
                                </div>
                                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                                    {catalogAdoption.map((p: any, i: number) => {
                                        const barW = Math.max((p.adoption_count / maxAdoption) * 100, 2);
                                        return (
                                            <div key={p.catalog_id} className="px-5 py-3 flex items-center gap-4 hover:bg-white/5 transition-all">
                                                <span className="shrink-0 w-7 text-right text-xs font-black text-slate-600">#{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-sm font-bold truncate ${p.is_deleted ? 'text-slate-500 italic' : 'text-white'}`} title={p.catalog_id}>{p.display_name}</span>
                                                        {p.is_published && <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Publié</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${barW}%` }} />
                                                        </div>
                                                        <span className="shrink-0 text-[10px] text-slate-500">{[p.supplier_name || p.sector, p.category].filter(Boolean).join(' · ') || '—'}</span>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <div className="text-sm font-black text-white">{p.adoption_count}</div>
                                                    <div className="text-[10px] text-slate-500">{p.unique_users} {p.unique_users > 1 ? 'commerçants' : 'commerçant'}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    );
                })()}
            </div>
    );
}
