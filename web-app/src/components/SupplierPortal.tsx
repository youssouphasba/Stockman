'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    BadgeCheck,
    Loader2,
    Package,
    Pencil,
    Plus,
    RefreshCcw,
    Search,
    ShoppingCart,
    Star,
    Store,
    Trash2,
    Truck,
    Users,
} from 'lucide-react';
import {
    ApiError,
    CatalogProductCreate,
    CatalogProductData,
    SupplierClientData,
    SupplierDashboardData,
    SupplierOrderData,
    SupplierProfileData,
    SupplierRatingData,
    supplierCatalog,
    supplierDashboard,
    supplierOrders,
    supplierProfile,
} from '../services/api';

type Section = 'overview' | 'profile' | 'catalog' | 'orders';

type ProfileForm = {
    company_name: string;
    description: string;
    phone: string;
    address: string;
    city: string;
    categories: string;
    delivery_zones: string;
    min_order_amount: string;
    average_delivery_days: string;
};

type ProductForm = {
    name: string;
    description: string;
    category: string;
    subcategory: string;
    price: string;
    unit: string;
    min_order_quantity: string;
    stock_available: string;
    available: boolean;
};

const defaultProfile: ProfileForm = {
    company_name: '',
    description: '',
    phone: '',
    address: '',
    city: '',
    categories: '',
    delivery_zones: '',
    min_order_amount: '0',
    average_delivery_days: '3',
};

const defaultProduct: ProductForm = {
    name: '',
    description: '',
    category: '',
    subcategory: '',
    price: '0',
    unit: 'unite',
    min_order_quantity: '1',
    stock_available: '0',
    available: true,
};

const fmtCurrency = (n?: number) => `${new Intl.NumberFormat('fr-FR').format(n || 0)} F`;
const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
const splitCsv = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);

const statusLabel = (status?: string) => ({
    pending: 'Nouvelle',
    confirmed: 'Confirmee',
    shipped: 'Expediee',
    partially_delivered: 'Partiellement livree',
    delivered: 'Livree',
    cancelled: 'Annulee',
}[status || ''] || (status || 'Inconnu'));

const statusTone = (status?: string) => ({
    pending: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    confirmed: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    shipped: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
    partially_delivered: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
    delivered: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    cancelled: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
}[status || ''] || 'bg-white/5 text-slate-300 border-white/10');

const orderActions = (order: SupplierOrderData) => {
    if (order.status === 'pending') return [{ label: 'Confirmer', value: 'confirmed' }, { label: 'Annuler', value: 'cancelled' }];
    if (order.status === 'confirmed') return [{ label: 'Expedier', value: 'shipped' }];
    return [];
};

export default function SupplierPortal() {
    const [activeSection, setActiveSection] = useState<Section>('overview');
    const [loading, setLoading] = useState(true);
    const [sectionLoading, setSectionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [profile, setProfile] = useState<SupplierProfileData | null>(null);
    const [profileForm, setProfileForm] = useState<ProfileForm>(defaultProfile);
    const [stats, setStats] = useState<SupplierDashboardData | null>(null);
    const [ratings, setRatings] = useState<SupplierRatingData[]>([]);
    const [clients, setClients] = useState<SupplierClientData[]>([]);

    const [catalog, setCatalog] = useState<CatalogProductData[]>([]);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [editingProduct, setEditingProduct] = useState<CatalogProductData | null>(null);
    const [productForm, setProductForm] = useState<ProductForm>(defaultProduct);
    const [showProductForm, setShowProductForm] = useState(false);

    const [orders, setOrders] = useState<SupplierOrderData[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<SupplierOrderData | null>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [clientFilter, setClientFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);

    const filteredCatalog = useMemo(() => {
        const q = catalogSearch.trim().toLowerCase();
        if (!q) return catalog;
        return catalog.filter((p) => [p.name, p.category, p.subcategory, p.description].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
    }, [catalog, catalogSearch]);

    const syncProfileForm = (data?: SupplierProfileData | null) => {
        setProfileForm(data ? {
            company_name: data.company_name || '',
            description: data.description || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            categories: (data.categories || []).join(', '),
            delivery_zones: (data.delivery_zones || []).join(', '),
            min_order_amount: String(data.min_order_amount ?? 0),
            average_delivery_days: String(data.average_delivery_days ?? 3),
        } : defaultProfile);
    };

    async function loadOverview() {
        const [dashboard, profileData, ratingsData, clientsData] = await Promise.all([
            supplierDashboard.get(),
            supplierProfile.get().catch((err) => err instanceof ApiError && err.status === 404 ? null : Promise.reject(err)),
            supplierDashboard.getRatings(),
            supplierOrders.getClients(),
        ]);
        setStats(dashboard);
        setProfile(profileData);
        syncProfileForm(profileData);
        setRatings(ratingsData);
        setClients(clientsData);
    }

    async function loadCatalog() {
        setCatalog(await supplierCatalog.list());
    }

    async function loadOrders() {
        const data = await supplierOrders.list(statusFilter || undefined, clientFilter || undefined, startDate || undefined, endDate || undefined);
        setOrders(data);
        setSelectedOrder((current) => data.find((order) => order.order_id === current?.order_id) || null);
    }

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError(null);
            try {
                await loadOverview();
            } catch (err) {
                console.error(err);
                setError("Impossible de charger le portail fournisseur.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        if (loading) return;
        if (activeSection !== 'catalog' && activeSection !== 'orders') return;
        (async () => {
            setSectionLoading(true);
            setError(null);
            try {
                if (activeSection === 'catalog') await loadCatalog();
                if (activeSection === 'orders') await loadOrders();
            } catch (err) {
                console.error(err);
                setError("Impossible de charger cette section.");
            } finally {
                setSectionLoading(false);
            }
        })();
    }, [activeSection, loading, statusFilter, clientFilter, startDate, endDate]);

    const saveProfile = async () => {
        if (!profileForm.company_name.trim()) return window.alert('Le nom de societe est obligatoire.');
        setBusyId('profile');
        try {
            const payload = {
                company_name: profileForm.company_name.trim(),
                description: profileForm.description.trim(),
                phone: profileForm.phone.trim(),
                address: profileForm.address.trim(),
                city: profileForm.city.trim(),
                categories: splitCsv(profileForm.categories),
                delivery_zones: splitCsv(profileForm.delivery_zones),
                min_order_amount: Number(profileForm.min_order_amount || 0),
                average_delivery_days: Math.max(1, Number(profileForm.average_delivery_days || 3)),
            };
            const saved = profile ? await supplierProfile.update(payload) : await supplierProfile.create(payload);
            setProfile(saved);
            syncProfileForm(saved);
            await loadOverview();
            window.alert('Profil fournisseur enregistre.');
        } catch (err) {
            console.error(err);
            setError("Impossible d'enregistrer le profil.");
        } finally {
            setBusyId(null);
        }
    };

    const openProductForm = (product?: CatalogProductData) => {
        setEditingProduct(product || null);
        setProductForm(product ? {
            name: product.name,
            description: product.description || '',
            category: product.category || '',
            subcategory: product.subcategory || '',
            price: String(product.price || 0),
            unit: product.unit || 'unite',
            min_order_quantity: String(product.min_order_quantity || 1),
            stock_available: String(product.stock_available || 0),
            available: !!product.available,
        } : defaultProduct);
        setShowProductForm(true);
    };

    const saveProduct = async () => {
        if (!productForm.name.trim()) return window.alert('Le nom du produit est obligatoire.');
        setBusyId('catalog');
        try {
            const payload: CatalogProductCreate = {
                name: productForm.name.trim(),
                description: productForm.description.trim(),
                category: productForm.category.trim(),
                subcategory: productForm.subcategory.trim(),
                price: Number(productForm.price || 0),
                unit: productForm.unit.trim() || 'unite',
                min_order_quantity: Math.max(1, Number(productForm.min_order_quantity || 1)),
                stock_available: Math.max(0, Number(productForm.stock_available || 0)),
                available: productForm.available,
            };
            if (editingProduct) await supplierCatalog.update(editingProduct.catalog_id, payload);
            else await supplierCatalog.create(payload);
            setShowProductForm(false);
            setEditingProduct(null);
            setProductForm(defaultProduct);
            await Promise.all([loadCatalog(), loadOverview()]);
        } catch (err) {
            console.error(err);
            setError("Impossible d'enregistrer ce produit.");
        } finally {
            setBusyId(null);
        }
    };

    const deleteProduct = async (product: CatalogProductData) => {
        if (!window.confirm(`Supprimer "${product.name}" du catalogue ?`)) return;
        setBusyId(product.catalog_id);
        try {
            await supplierCatalog.delete(product.catalog_id);
            await Promise.all([loadCatalog(), loadOverview()]);
        } catch (err) {
            console.error(err);
            setError("Impossible de supprimer ce produit.");
        } finally {
            setBusyId(null);
        }
    };

    const toggleAvailability = async (product: CatalogProductData) => {
        setBusyId(product.catalog_id);
        try {
            await supplierCatalog.update(product.catalog_id, { ...product, available: !product.available });
            await Promise.all([loadCatalog(), loadOverview()]);
        } catch (err) {
            console.error(err);
            setError("Impossible de mettre a jour la disponibilite.");
        } finally {
            setBusyId(null);
        }
    };

    const updateOrderStatus = async (order: SupplierOrderData, nextStatus: string) => {
        if (!window.confirm(`Passer ${order.order_id} au statut "${statusLabel(nextStatus)}" ?`)) return;
        setBusyId(order.order_id);
        try {
            await supplierOrders.updateStatus(order.order_id, nextStatus);
            await Promise.all([loadOrders(), loadOverview()]);
        } catch (err) {
            console.error(err);
            setError("Impossible de mettre a jour cette commande.");
        } finally {
            setBusyId(null);
        }
    };

    const refreshAll = async () => {
        setSectionLoading(true);
        setError(null);
        try {
            await loadOverview();
            if (activeSection === 'catalog') await loadCatalog();
            if (activeSection === 'orders') await loadOrders();
        } catch (err) {
            console.error(err);
            setError("Impossible d'actualiser le portail.");
        } finally {
            setSectionLoading(false);
        }
    };

    if (loading) {
        return <div className="flex flex-1 items-center justify-center bg-[#0F172A]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    return (
        <div className="flex-1 overflow-y-auto bg-[#0F172A] p-8 custom-scrollbar">
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary"><Truck className="h-4 w-4" /> Portail fournisseur marketplace</div>
                    <h1 className="text-3xl font-black text-white">Catalogue, commandes et fiabilite fournisseur</h1>
                </div>
                <button type="button" onClick={() => void refreshAll()} className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"><RefreshCcw className={`h-4 w-4 ${sectionLoading ? 'animate-spin' : ''}`} /> Actualiser</button>
            </div>
            <div className="mb-6 flex flex-wrap gap-3">
                {[{ id: 'overview', label: 'Vue d ensemble', icon: Store }, { id: 'profile', label: 'Profil', icon: BadgeCheck }, { id: 'catalog', label: 'Catalogue', icon: Package }, { id: 'orders', label: 'Commandes', icon: ShoppingCart }].map((tab) => <button key={tab.id} type="button" onClick={() => setActiveSection(tab.id as Section)} className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold ${activeSection === tab.id ? 'border-primary bg-primary text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}><tab.icon className="h-4 w-4" />{tab.label}</button>)}
            </div>
            {error && <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>}
            {activeSection === 'overview' && <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    {[{ label: 'Catalogue', value: stats?.catalog_products || 0, icon: Package }, { label: 'Commandes', value: stats?.total_orders || 0, icon: ShoppingCart }, { label: 'Actions en attente', value: stats?.pending_action || 0, icon: Truck }, { label: 'CA livre', value: fmtCurrency(stats?.total_revenue), icon: Store }, { label: 'Ce mois-ci', value: fmtCurrency(stats?.revenue_this_month), icon: BadgeCheck }, { label: 'Clients actifs', value: stats?.active_clients || 0, icon: Users }].map((kpi) => <div key={kpi.label} className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{kpi.label}</span><div className="rounded-xl bg-primary/10 p-2 text-primary"><kpi.icon className="h-5 w-5" /></div></div><div className="text-3xl font-black text-white">{String(kpi.value)}</div></div>)}
                </div>
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-black text-white">Fiabilite visible par les commercants</h2><span className={`rounded-full border px-3 py-1 text-xs font-bold ${profile?.is_verified ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-100'}`}>{profile?.is_verified ? 'Verifie' : 'A completer'}</span></div>
                        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="rounded-xl border border-white/10 bg-[#0B1220] p-4"><div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Note moyenne</div><div className="mt-3 flex items-center gap-2 text-2xl font-black text-white"><Star className="h-5 w-5 text-amber-300" />{(stats?.rating_average || 0).toFixed(1)}</div><div className="mt-2 text-sm text-slate-400">{stats?.rating_count || 0} avis</div></div>
                            <div className="rounded-xl border border-white/10 bg-[#0B1220] p-4"><div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Panier moyen</div><div className="mt-3 text-2xl font-black text-white">{fmtCurrency(stats?.avg_order_value)}</div></div>
                            <div className="rounded-xl border border-white/10 bg-[#0B1220] p-4"><div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Statuts</div><div className="mt-3 flex flex-wrap gap-2">{Object.entries(stats?.orders_by_status || {}).map(([status, count]) => <span key={status} className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone(status)}`}>{statusLabel(status)}: {count}</span>)}{Object.keys(stats?.orders_by_status || {}).length === 0 && <span className="text-sm text-slate-500">Aucune commande</span>}</div></div>
                        </div>
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-[#0B1220] p-4"><h3 className="mb-3 font-black text-white">Top produits</h3><div className="space-y-3">{(stats?.top_products || []).length === 0 && <div className="text-sm text-slate-500">Pas encore de tendance produit.</div>}{(stats?.top_products || []).map((p, index) => <div key={`${p.name}-${index}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"><div className="font-semibold text-white">{p.name}</div><div className="text-lg font-black text-primary">{p.total_qty}</div></div>)}</div></div>
                            <div className="rounded-xl border border-white/10 bg-[#0B1220] p-4"><h3 className="mb-3 font-black text-white">Clients marchands recents</h3><div className="space-y-3">{clients.length === 0 && <div className="text-sm text-slate-500">Aucun client marchand pour le moment.</div>}{clients.slice(0, 6).map((client) => <div key={client.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"><div className="flex items-center justify-between gap-4"><div><div className="font-semibold text-white">{client.name}</div><div className="text-xs text-slate-400">Derniere commande: {fmtDate(client.latest_order_at)}</div></div><div className="text-right"><div className="text-lg font-black text-primary">{client.total_orders}</div><div className="text-xs text-slate-400">commande(s)</div></div></div></div>)}</div></div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="text-lg font-black text-white">Profil marketplace</h2><div className="mt-4 space-y-3 text-sm text-slate-300"><div><div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Societe</div><div className="mt-1 text-lg font-black text-white">{profile?.company_name || 'A completer'}</div></div><div><div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Ville</div><div className="mt-1">{profile?.city || '-'}</div></div><div><div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Zones</div><div className="mt-1">{(profile?.delivery_zones || []).join(', ') || '-'}</div></div><div><div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Minimum de commande</div><div className="mt-1">{fmtCurrency(profile?.min_order_amount)}</div></div><div><div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Delai moyen</div><div className="mt-1">{profile?.average_delivery_days || 0} jour(s)</div></div></div></div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="text-lg font-black text-white">Avis recents</h2><div className="mt-4 space-y-3">{ratings.length === 0 && <div className="text-sm text-slate-500">Les premiers avis apparaitront apres vos premieres livraisons.</div>}{ratings.slice(0, 5).map((rating) => <div key={rating.rating_id} className="rounded-xl border border-white/10 bg-[#0B1220] p-4"><div className="mb-2 flex items-center justify-between gap-4"><div className="font-semibold text-white">{rating.shopkeeper_name}</div><div className="inline-flex items-center gap-1 text-amber-300"><Star className="h-4 w-4 fill-current" /><span className="font-black">{rating.score}/5</span></div></div><div className="text-sm text-slate-300">{rating.comment || 'Aucun commentaire laisse.'}</div><div className="mt-2 text-xs text-slate-500">{fmtDate(rating.created_at)}</div></div>)}</div></div>
                    </div>
                </div>
            </div>}
            {activeSection === 'profile' && <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <h2 className="mb-2 text-xl font-black text-white">Profil fournisseur</h2>
                    <p className="mb-6 text-sm text-slate-400">Ce profil doit rester simple mais suffisamment fiable pour alimenter la marketplace.</p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {[['Nom de societe', 'company_name'], ['Telephone pro', 'phone'], ['Ville', 'city'], ['Adresse', 'address'], ['Categories', 'categories'], ['Zones de livraison', 'delivery_zones'], ['Minimum de commande', 'min_order_amount'], ['Delai moyen (jours)', 'average_delivery_days']].map(([label, key]) => <label key={key} className={`space-y-2 ${key === 'address' ? 'md:col-span-2' : ''}`}><span className="text-sm font-semibold text-slate-200">{label}</span><input value={(profileForm as Record<string, string>)[key]} onChange={(e) => setProfileForm((current) => ({ ...current, [key]: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-white outline-none focus:border-primary/50" /></label>)}
                        <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold text-slate-200">Description</span><textarea value={profileForm.description} onChange={(e) => setProfileForm((current) => ({ ...current, description: e.target.value }))} className="min-h-[120px] w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-white outline-none focus:border-primary/50" /></label>
                    </div>
                    <div className="mt-6 flex justify-end"><button type="button" onClick={() => void saveProfile()} disabled={busyId === 'profile'} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{busyId === 'profile' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />} Enregistrer le profil</button></div>
                </div>
                <div className="space-y-6">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6"><h3 className="text-lg font-black text-white">Checklist minimale</h3><div className="mt-4 space-y-3 text-sm text-slate-300">{['company_name', 'phone', 'categories', 'delivery_zones'].map((key) => <div key={key} className="flex items-center gap-3"><div className={`h-2.5 w-2.5 rounded-full ${profileForm[key as keyof ProfileForm].trim() ? 'bg-emerald-400' : 'bg-slate-600'}`} />{key === 'company_name' ? 'Nom de societe' : key === 'phone' ? 'Telephone pro' : key === 'categories' ? 'Categories' : 'Zones de livraison'}</div>)}</div></div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6"><h3 className="text-lg font-black text-white">Rappel produit</h3><ul className="mt-4 space-y-3 text-sm text-slate-400"><li>Ce compte doit rester un portail de publication et de commandes.</li><li>Le but principal est d'ameliorer les donnees et le parcours d'approvisionnement du commercant.</li><li>Un profil clair augmente la confiance et reduit les allers-retours.</li></ul></div>
                </div>
            </div>}
            {activeSection === 'catalog' && <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-black text-white">Catalogue fournisseur</h2><p className="mt-1 text-sm text-slate-400">Publiez des fiches propres pour permettre la comparaison, la commande et le matching produit.</p></div><div className="flex flex-col gap-3 sm:flex-row"><label className="relative min-w-[280px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0B1220] py-3 pl-10 pr-4 text-white outline-none focus:border-primary/50" placeholder="Rechercher dans le catalogue" /></label><button type="button" onClick={() => openProductForm()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Nouveau produit</button></div></div>
                    {showProductForm && <div className="mt-5 rounded-2xl border border-white/10 bg-[#0B1220] p-5"><div className="mb-4 flex items-center justify-between gap-4"><h3 className="text-lg font-black text-white">{editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}</h3><button type="button" onClick={() => { setShowProductForm(false); setEditingProduct(null); setProductForm(defaultProduct); }} className="text-sm font-bold text-slate-400 hover:text-white">Fermer</button></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2">{[['Nom', 'name'], ['Categorie', 'category'], ['Sous-categorie', 'subcategory'], ['Prix', 'price'], ['Unite', 'unit'], ['Stock disponible', 'stock_available'], ['Minimum de commande', 'min_order_quantity']].map(([label, key]) => <label key={key} className="space-y-2"><span className="text-sm font-semibold text-slate-200">{label}</span><input value={(productForm as Record<string, string | boolean>)[key] as string} onChange={(e) => setProductForm((current) => ({ ...current, [key]: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-primary/50" /></label>)}<label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold text-slate-200">Description</span><textarea value={productForm.description} onChange={(e) => setProductForm((current) => ({ ...current, description: e.target.value }))} className="min-h-[110px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-primary/50" /></label><label className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 md:col-span-2"><input type="checkbox" checked={productForm.available} onChange={(e) => setProductForm((current) => ({ ...current, available: e.target.checked }))} />Produit visible et commandable</label></div><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => { setShowProductForm(false); setEditingProduct(null); setProductForm(defaultProduct); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white">Annuler</button><button type="button" onClick={() => void saveProduct()} disabled={busyId === 'catalog'} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{busyId === 'catalog' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}{editingProduct ? 'Mettre a jour' : 'Ajouter au catalogue'}</button></div></div>}
                </div>
                {sectionLoading && <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300"><Loader2 className="h-4 w-4 animate-spin text-primary" />Chargement du catalogue...</div>}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">{!sectionLoading && filteredCatalog.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-sm text-slate-400">Aucun produit catalogue pour le moment.</div>}{filteredCatalog.map((product) => <div key={product.catalog_id} className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="mb-4 flex items-start justify-between gap-4"><div><div className="text-lg font-black text-white">{product.name}</div><div className="mt-1 text-sm text-slate-400">{[product.category, product.subcategory].filter(Boolean).join(' / ') || 'Sans categorie'}</div></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${product.available ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-slate-600/30 bg-slate-700/30 text-slate-300'}`}>{product.available ? 'Disponible' : 'Masque'}</span></div><div className="space-y-2 text-sm text-slate-300"><div className="flex items-center justify-between"><span className="text-slate-500">Prix</span><span className="font-bold text-white">{fmtCurrency(product.price)} / {product.unit}</span></div><div className="flex items-center justify-between"><span className="text-slate-500">Stock</span><span className="font-bold text-white">{product.stock_available}</span></div><div className="flex items-center justify-between"><span className="text-slate-500">MOQ</span><span className="font-bold text-white">{product.min_order_quantity}</span></div><div className="rounded-xl border border-white/10 bg-[#0B1220] p-3 text-slate-400">{product.description || 'Aucune description.'}</div></div><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => openProductForm(product)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white"><Pencil className="h-4 w-4" />Modifier</button><button type="button" onClick={() => void toggleAvailability(product)} disabled={busyId === product.catalog_id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{product.available ? 'Masquer' : 'Rendre visible'}</button><button type="button" onClick={() => void deleteProduct(product)} disabled={busyId === product.catalog_id} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-100 disabled:opacity-60"><Trash2 className="h-4 w-4" />Supprimer</button></div></div>)}</div>
            </div>}
            {activeSection === 'orders' && <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="mb-5"><h2 className="text-xl font-black text-white">Commandes recues</h2><p className="mt-1 text-sm text-slate-400">Filtrez, ouvrez les details et traitez les actions encore disponibles cote fournisseur.</p></div><div className="grid grid-cols-1 gap-4 lg:grid-cols-4"><label className="space-y-2"><span className="text-sm font-semibold text-slate-200">Statut</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-white outline-none focus:border-primary/50"><option value="">Tous les statuts</option><option value="pending">Nouvelles</option><option value="confirmed">Confirmees</option><option value="shipped">Expediees</option><option value="partially_delivered">Partiellement livrees</option><option value="delivered">Livrees</option><option value="cancelled">Annulees</option></select></label><label className="space-y-2"><span className="text-sm font-semibold text-slate-200">Client marchand</span><select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-white outline-none focus:border-primary/50"><option value="">Tous les clients</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label className="space-y-2"><span className="text-sm font-semibold text-slate-200">Debut</span><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-white outline-none focus:border-primary/50" /></label><label className="space-y-2"><span className="text-sm font-semibold text-slate-200">Fin</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-white outline-none focus:border-primary/50" /></label></div></div>
                {sectionLoading && <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300"><Loader2 className="h-4 w-4 animate-spin text-primary" />Chargement des commandes...</div>}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]"><div className="space-y-4">{!sectionLoading && orders.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-sm text-slate-400">Aucune commande trouvee avec ces filtres.</div>}{orders.map((order) => <button key={order.order_id} type="button" onClick={() => setSelectedOrder(order)} className={`w-full rounded-2xl border p-5 text-left ${selectedOrder?.order_id === order.order_id ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-lg font-black text-white">{order.shopkeeper_name}</div><div className="mt-1 text-sm text-slate-400">{order.order_id} - {fmtDate(order.created_at)}</div></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone(order.status)}`}>{statusLabel(order.status)}</span></div><div className="grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-3"><div className="rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3"><div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Montant</div><div className="mt-2 font-black text-white">{fmtCurrency(order.total_amount)}</div></div><div className="rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3"><div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Articles</div><div className="mt-2 font-black text-white">{order.items_count || order.items?.length || 0}</div></div><div className="rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3"><div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Livraison</div><div className="mt-2 font-black text-white">{fmtDate(order.expected_delivery)}</div></div></div></button>)}</div><aside className="rounded-2xl border border-white/10 bg-white/5 p-6">{!selectedOrder ? <div className="flex min-h-[340px] flex-col items-center justify-center text-center"><ShoppingCart className="mb-4 h-12 w-12 text-slate-600" /><h3 className="text-lg font-black text-white">Selectionnez une commande</h3><p className="mt-2 max-w-sm text-sm text-slate-400">Les details et les actions fournisseur apparaitront ici.</p></div> : <div className="space-y-5"><div><div className="flex flex-wrap items-center gap-3"><h3 className="text-xl font-black text-white">{selectedOrder.shopkeeper_name}</h3><span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone(selectedOrder.status)}`}>{statusLabel(selectedOrder.status)}</span></div><div className="mt-2 text-sm text-slate-400">{selectedOrder.order_id} - creee le {fmtDate(selectedOrder.created_at)}</div></div><div className="grid grid-cols-2 gap-4"><div className="rounded-xl border border-white/10 bg-[#0B1220] p-4"><div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Montant</div><div className="mt-2 text-2xl font-black text-white">{fmtCurrency(selectedOrder.total_amount)}</div></div><div className="rounded-xl border border-white/10 bg-[#0B1220] p-4"><div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Livraison souhaitee</div><div className="mt-2 text-lg font-black text-white">{fmtDate(selectedOrder.expected_delivery)}</div></div></div>{selectedOrder.notes && <div className="rounded-xl border border-white/10 bg-[#0B1220] p-4"><div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Note du commercant</div><div className="text-sm leading-6 text-slate-300">{selectedOrder.notes}</div></div>}<div><div className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Lignes de commande</div><div className="space-y-3">{(selectedOrder.items || []).map((item) => <div key={item.item_id} className="rounded-xl border border-white/10 bg-[#0B1220] p-4"><div className="flex items-start justify-between gap-4"><div><div className="font-semibold text-white">{item.product_name || item.product?.name || 'Produit'}</div><div className="mt-1 text-sm text-slate-400">{item.quantity} x {fmtCurrency(item.unit_price)}</div></div><div className="text-right"><div className="text-lg font-black text-primary">{fmtCurrency(item.total_price)}</div>{typeof selectedOrder.received_items?.[item.item_id] === 'number' && <div className="mt-1 text-xs text-slate-500">Recu: {selectedOrder.received_items[item.item_id]}</div>}</div></div></div>)}</div></div><div><div className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Actions disponibles</div><div className="flex flex-wrap gap-3">{orderActions(selectedOrder).length === 0 && <div className="text-sm text-slate-500">Aucune action cote fournisseur. La suite se passe cote commercant pour la reception.</div>}{orderActions(selectedOrder).map((action) => <button key={action.value} type="button" onClick={() => void updateOrderStatus(selectedOrder, action.value)} disabled={busyId === selectedOrder.order_id} className={`rounded-xl px-4 py-3 text-sm font-bold text-white ${action.value === 'cancelled' ? 'bg-rose-500/15 text-rose-100' : action.value === 'shipped' ? 'bg-sky-500/15 text-sky-100' : 'bg-primary'}`}>{busyId === selectedOrder.order_id ? 'Traitement...' : action.label}</button>)}</div></div></div>}</aside></div>
            </div>}
        </div>
    );
}
