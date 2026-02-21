'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    TrendingUp,
    MessageSquare,
    Search,
    Filter,
    Plus,
    CheckCircle,
    Clock,
    XCircle,
    ChevronRight,
    Edit2,
    Trash2,
    Truck,
    Box
} from 'lucide-react';
import { supplierDashboard, supplierOrders, supplierCatalog } from '../services/api';

export default function SupplierPortal() {
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState<'dashboard' | 'orders' | 'catalog'>('dashboard');
    const [stats, setStats] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [catalog, setCatalog] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const data = await supplierDashboard.get();
            setStats(data);
        } catch (err) {
            console.error("Supplier dashboard error", err);
        } finally {
            setLoading(false);
        }
    };

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await supplierOrders.list();
            setOrders(Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []));
        } finally {
            setLoading(false);
        }
    };

    const loadCatalog = async () => {
        setLoading(true);
        try {
            const data = await supplierCatalog.list();
            setCatalog(Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeSection === 'orders') loadOrders();
        if (activeSection === 'catalog') loadCatalog();
    }, [activeSection]);

    if (loading && !stats) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0F172A]">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Portail Fournisseur</h1>
                    <p className="text-slate-400">Gérez votre catalogue et vos commandes reçues.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadDashboard} className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
                        <TrendingUp size={20} />
                    </button>
                    {activeSection === 'catalog' && (
                        <button className="btn-primary rounded-xl px-5 py-3 flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105">
                            <Plus size={20} /> Nouveau Produit
                        </button>
                    )}
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                {[
                    { id: 'dashboard', icon: LayoutDashboard, label: 'Tableau de Bord' },
                    { id: 'orders', icon: ShoppingCart, label: 'Commandes Reçues' },
                    { id: 'catalog', icon: Package, label: 'Mon Catalogue' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id as any)}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all border ${activeSection === tab.id
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeSection === 'dashboard' && (
                <div className="space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="glass-card p-6 flex flex-col gap-2">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ventes Totales</span>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-white">{stats?.total_sales || 0}</span>
                                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500"><TrendingUp size={24} /></div>
                            </div>
                        </div>
                        <div className="glass-card p-6 flex flex-col gap-2">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Revenue</span>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-emerald-500">{stats?.total_revenue || 0} F</span>
                                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500"><CheckCircle size={24} /></div>
                            </div>
                        </div>
                        <div className="glass-card p-6 flex flex-col gap-2">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Commandes En cours</span>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-amber-500">{stats?.pending_orders || 0}</span>
                                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500"><Clock size={24} /></div>
                            </div>
                        </div>
                        <div className="glass-card p-6 flex flex-col gap-2">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Clients Actifs</span>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-primary">{stats?.active_clients || 0}</span>
                                <div className="p-3 rounded-xl bg-primary/10 text-primary"><Users size={24} /></div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Orders Preview */}
                    <div className="glass-card p-6 border-white/10">
                        <h3 className="text-lg font-bold text-white mb-6">Dernières Commandes</h3>
                        <div className="space-y-4">
                            {(Array.isArray(orders) ? orders.slice(0, 5) : []).map(order => (
                                <div key={order.order_id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-primary/10 text-primary"><ShoppingCart size={20} /></div>
                                        <div>
                                            <h4 className="text-white font-bold">{order.shopkeeper_name}</h4>
                                            <p className="text-xs text-slate-500">{order.items_count} articles • {order.total_amount} F</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${order.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                                            }`}>
                                            {order.status}
                                        </span>
                                        <ChevronRight size={18} className="text-slate-600" />
                                    </div>
                                </div>
                            ))}
                            {orders.length === 0 && (
                                <div className="text-center py-10 text-slate-500">Aucune commande récente.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'catalog' && (
                <div className="glass-card overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <h3 className="text-lg font-bold text-white">Mon Catalogue</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Rechercher mes produits..."
                                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary/50"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                        {(Array.isArray(catalog) ? catalog : []).map(product => (
                            <div key={product.id} className="glass-card p-4 flex flex-col gap-4 group">
                                <div className="aspect-square bg-white/5 rounded-xl border border-white/10 overflow-hidden relative">
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <button className="p-2 bg-white/10 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all"><Edit2 size={16} /></button>
                                        <button className="p-2 bg-red-500/10 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                                    </div>
                                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                                        <Box size={40} />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-white font-bold">{product.name}</h4>
                                    <p className="text-xs text-slate-500">{product.category}</p>
                                    <div className="mt-2 flex justify-between items-baseline">
                                        <span className="text-emerald-500 font-black text-lg">{product.price} F</span>
                                        <span className="text-[10px] text-slate-500 uppercase font-black">Stock : {product.stock}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {catalog.length === 0 && (
                            <div className="col-span-full py-20 text-center text-slate-500 flex flex-col items-center gap-4">
                                <Package size={64} className="opacity-10" />
                                <p>Votre catalogue est vide. Ajoutez vos produits pour qu'ils apparaissent sur la marketplace.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeSection === 'orders' && (
                <div className="glass-card overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-white/5 flex items-center gap-2">
                        <Truck size={20} className="text-slate-400" />
                        <h3 className="text-lg font-bold text-white">Gestion des Commandes</h3>
                    </div>
                    <div className="p-10 text-center text-slate-500 flex flex-col items-center gap-4">
                        <Clock size={48} className="opacity-10" />
                        <p>Toutes vos commandes sont à jour.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
