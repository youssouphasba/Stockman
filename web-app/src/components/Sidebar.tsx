'use client';

import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    Settings,
    LogOut,
    TrendingUp,
    Clock,
    CreditCard,
    Globe,
    Truck,
    AlertCircle,
    BarChart3,
    FileText,
    History as HistoryIcon,
    ShieldCheck,
    MessageCircle,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    X,
    UserCheck,
    RefreshCcw,
    Store,
    Factory,
    UtensilsCrossed,
    CalendarCheck,
    ChefHat,
    Bell,
    HelpCircle,
    MapPin,
    Sun,
    Moon,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { getAccessContext } from '../utils/access';
import type { UserPermissions } from '../services/api';
import { ecommerce as ecommerceApi, stores as storesApi, type EcommerceStats, type Store as StoreRecord } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
    user?: any;
    isMobileOpen: boolean;
    onMobileClose: () => void;
    onOpenChat: () => void;
    onOpenSupport: () => void;
    onOpenNotifications: () => void;
    unreadMessages?: number;
    unreadNotifications?: number;
    features?: {
        has_production: boolean;
        is_restaurant?: boolean;
        sector?: string;
    };
    modules?: Record<string, boolean>;
}

type SidebarItem = {
    id: string;
    icon: any;
    label: string;
    roles?: string[];
    permission?: keyof UserPermissions;
    accountRole?: 'billing_admin' | 'org_admin';
    managerOnly?: boolean;
    operational?: boolean;
};

type SidebarGroup = {
    id: string;
    icon: any;
    label: string;
    children: SidebarItem[];
    roles?: string[];
    permission?: keyof UserPermissions;
    accountRole?: 'billing_admin' | 'org_admin';
    managerOnly?: boolean;
    operational?: boolean;
};

type SidebarEntry = SidebarItem | (SidebarGroup & { children: SidebarItem[] });

function isGroup(entry: SidebarEntry): entry is SidebarGroup {
    return 'children' in entry;
}

export default function Sidebar({
    activeTab,
    setActiveTab,
    onLogout,
    user,
    isMobileOpen,
    onMobileClose,
    onOpenChat,
    onOpenSupport,
    onOpenNotifications,
    unreadMessages = 0,
    unreadNotifications = 0,
    features,
    modules = {},
}: SidebarProps) {
    const { t } = useTranslation();
    const { isDark, toggleTheme } = useTheme();

    const isRestaurant = features?.is_restaurant || ['restaurant', 'traiteur'].includes(features?.sector || '');
    const isProductionOnly = features?.has_production && !isRestaurant;

    // Helper: returns false only when explicitly disabled in modules
    const modEnabled = (key: string) => modules[key] !== false;
    const access = getAccessContext(user);
    const accountRoles = access.accountRoles;
    const effectivePermissions = access.effectivePermissions;
    const isSuperAdmin = access.isSuperAdmin;
    const isOrgAdmin = access.isOrgAdmin;
    const isBillingAdmin = access.isBillingAdmin;
    const hasOperationalAccess = access.hasOperationalAccess;
    const hasEnterpriseLocations = user?.role === 'admin' || user?.role === 'superadmin' || (user?.effective_plan || user?.plan) === 'enterprise';
    const [storeList, setStoreList] = useState<StoreRecord[]>([]);
    const [storesLoading, setStoresLoading] = useState(false);
    const [switchingStoreId, setSwitchingStoreId] = useState<string | null>(null);
    const [openingEcommerceSite, setOpeningEcommerceSite] = useState(false);
    const [ecommerceSite, setEcommerceSite] = useState<{ site_url: string; enabled: boolean } | null>(null);
    const [ecommerceMenuOpen, setEcommerceMenuOpen] = useState(false);
    const [ecommerceStats, setEcommerceStats] = useState<EcommerceStats | null>(null);
    const [ecommerceStatsOpen, setEcommerceStatsOpen] = useState(false);
    const [ecommerceStatsLoading, setEcommerceStatsLoading] = useState(false);

    // Entrées communes (toujours visibles)
    const commonBottom: SidebarEntry[] = [
        { id: 'admin', icon: ShieldCheck, label: t('tabs.admin'), roles: ['admin', 'superadmin'] },
        {
            id: 'account_group',
            icon: Settings,
            label: t('settings.account'),
            children: [
                { id: 'subscription', icon: CreditCard, label: t('tabs.subscription'), roles: ['shopkeeper', 'staff', 'admin'], accountRole: 'billing_admin' },
                { id: 'settings', icon: Settings, label: t('admin.segments.settings'), roles: ['shopkeeper', 'staff', 'admin'], accountRole: 'org_admin' },
            ],
        },
    ];

    const menuEntries: SidebarEntry[] = isRestaurant ? [
        // ── RESTAURANT ──────────────────────────────────────────
        { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard.title'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'dashboard' },
        { id: 'multi_stores', icon: Store, label: t('sidebar.multi_stores'), roles: ['shopkeeper', 'staff', 'admin'], accountRole: 'org_admin', managerOnly: true },
        { id: 'pos', icon: ShoppingCart, label: t('sidebar.pos'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'pos' },
        { id: 'tables', icon: UtensilsCrossed, label: t('sidebar.tables'), roles: ['shopkeeper', 'staff', 'admin'] },
        { id: 'reservations', icon: CalendarCheck, label: t('sidebar.reservations'), roles: ['shopkeeper', 'staff', 'admin'] },
        { id: 'kitchen', icon: ChefHat, label: t('sidebar.kitchen'), roles: ['shopkeeper', 'staff', 'admin'] },
        { id: 'production', icon: Factory, label: t('sidebar.recipes'), roles: ['shopkeeper', 'staff', 'admin'] },
        { id: 'accounting', icon: TrendingUp, label: t('admin.segments.finance'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'accounting' },
        { id: 'reports', icon: FileText, label: t('sidebar.reports'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'accounting' },
        { id: 'staff', icon: UserCheck, label: t('sidebar.staff'), roles: ['shopkeeper', 'admin', 'staff'], permission: 'staff' },
        {
            id: 'system_group', icon: Clock, label: t('sidebar.system'), roles: ['shopkeeper', 'staff', 'admin'], accountRole: 'org_admin', managerOnly: true,
            children: [{ id: 'activity', icon: Clock, label: t('sidebar.system_history'), roles: ['shopkeeper', 'staff', 'admin'], accountRole: 'org_admin' }],
        },
        ...commonBottom,
    ] : isProductionOnly ? [
        // ── PRODUCTION (boulangerie, couture, forge…) ─────────────
        { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard.title'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'dashboard' },
        { id: 'multi_stores', icon: Store, label: t('sidebar.multi_stores'), roles: ['shopkeeper', 'staff', 'admin'], accountRole: 'org_admin', managerOnly: true },
        { id: 'pos', icon: ShoppingCart, label: t('sidebar.pos'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'pos' },
        { id: 'production', icon: Factory, label: t('production.title'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'stock' },
        {
            id: 'stock_group', icon: Package, label: t('sidebar.stock_inventory'), roles: ['shopkeeper', 'staff', 'admin'],
            children: [
                { id: 'inventory', icon: Package, label: t('common.stock'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'stock' },
                ...(hasEnterpriseLocations ? [{ id: 'locations', icon: MapPin, label: t('settings_workspace.stores.locations.title'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'stock' } as SidebarItem] : []),
                { id: 'alerts', icon: AlertCircle, label: t('alerts.title'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'stock' },
                { id: 'stock_history', icon: HistoryIcon, label: t('sidebar.stock_history'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'stock' },
                { id: 'expiry_alerts', icon: AlertCircle, label: t('sidebar.expiry'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'stock' },
            ],
        },
        { id: 'accounting', icon: TrendingUp, label: t('admin.segments.finance'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'accounting' },
        { id: 'staff', icon: UserCheck, label: t('sidebar.staff'), roles: ['shopkeeper', 'admin', 'staff'], permission: 'staff' },
        {
            id: 'suppliers_group', icon: Truck, label: t('tabs.suppliers'), roles: ['shopkeeper', 'staff', 'supplier', 'admin'],
            children: [
                { id: 'suppliers', icon: Users, label: t('sidebar.my_suppliers'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'suppliers' },
                { id: 'supplier_portal', icon: Truck, label: t('sidebar.supplier_portal'), roles: ['supplier', 'admin'] },
            ],
        },
        {
            id: 'system_group', icon: Clock, label: t('sidebar.system'), roles: ['shopkeeper', 'staff', 'admin'], accountRole: 'org_admin', managerOnly: true,
            children: [{ id: 'activity', icon: Clock, label: t('sidebar.system_history'), roles: ['shopkeeper', 'staff', 'admin'], accountRole: 'org_admin' }],
        },
        ...commonBottom,
    ] : [
        // ── COMMERCE (défaut) ─────────────────────────────────────
        { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard.title'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'dashboard' },
        { id: 'multi_stores', icon: Store, label: t('sidebar.multi_stores'), roles: ['shopkeeper', 'staff', 'admin'], accountRole: 'org_admin', managerOnly: true },
        { id: 'pos', icon: ShoppingCart, label: t('sidebar.pos'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'pos' },
        { id: 'orders', icon: ClipboardList, label: t('tabs.orders'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'stock' },
        { id: 'accounting', icon: TrendingUp, label: t('admin.segments.finance'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'accounting' },
        { id: 'reports', icon: FileText, label: t('sidebar.reports'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'accounting' },
        {
            id: 'stock_group', icon: Package, label: t('sidebar.stock_inventory'), roles: ['shopkeeper', 'staff', 'admin'],
            children: [
                { id: 'inventory', icon: Package, label: t('common.stock'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'stock' },
                ...(hasEnterpriseLocations ? [{ id: 'locations', icon: MapPin, label: t('settings_workspace.stores.locations.title'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'stock' } as SidebarItem] : []),
                { id: 'alerts', icon: AlertCircle, label: t('alerts.title'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'stock' },
                { id: 'stock_history', icon: HistoryIcon, label: t('sidebar.stock_history'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'stock' },
                { id: 'inventory_counting', icon: RefreshCcw, label: t('dashboard.rotating_inventory'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'stock' },
                { id: 'expiry_alerts', icon: AlertCircle, label: t('sidebar.expiry'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'stock' },
                { id: 'stats', icon: BarChart3, label: t('sidebar.abc_analysis'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'stock', managerOnly: true },
            ],
        },
        { id: 'crm', icon: Users, label: t('crm.title'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'crm' },
        ...(hasEnterpriseLocations ? [{ id: 'planner', icon: CalendarCheck, label: t('planner.title'), roles: ['shopkeeper', 'staff', 'admin'] } as SidebarItem] : []),
        { id: 'staff', icon: UserCheck, label: t('sidebar.staff'), roles: ['shopkeeper', 'admin', 'staff'], permission: 'staff' },
        {
            id: 'suppliers_group', icon: Truck, label: t('tabs.suppliers'), roles: ['shopkeeper', 'staff', 'supplier', 'admin'],
            children: [
                { id: 'suppliers', icon: Users, label: t('sidebar.my_suppliers'), roles: ['shopkeeper', 'staff', 'admin'], permission: 'suppliers' },
                { id: 'supplier_portal', icon: Truck, label: t('sidebar.supplier_portal'), roles: ['supplier', 'admin'] },
            ],
        },
        {
            id: 'system_group', icon: Clock, label: t('sidebar.system'), roles: ['shopkeeper', 'staff', 'admin'], accountRole: 'org_admin', managerOnly: true,
            children: [{ id: 'activity', icon: Clock, label: t('sidebar.system_history'), roles: ['shopkeeper', 'staff', 'admin'], accountRole: 'org_admin' }],
        },
        ...commonBottom,
    ];

    // IDs that can be disabled via modules dict
    const MODULE_GATED: Record<string, string> = {
        reservations: 'reservations',
        kitchen: 'kitchen',
        crm: 'crm',
        orders: 'orders',
        accounting: 'accounting',
        reports: 'accounting',
        inventory: 'stock_management',
        inventory_counting: 'stock_management',
        locations: 'stock_management',
        alerts: 'alerts',
        stock_history: 'history',
        expiry_alerts: 'alerts',
        stats: 'statistics',
    };

    const filteredMenuEntries = menuEntries.filter(entry => {
        const modKey = MODULE_GATED[entry.id];
        if (modKey) return modEnabled(modKey);
        return true;
    });

    const canSeeItem = (roles?: string[], permission?: keyof UserPermissions, accountRole?: 'billing_admin' | 'org_admin', managerOnly?: boolean) => {
        if (!roles) return true;
        if (!user) return true;
        if (isSuperAdmin) return true;
        if (user.role === 'supplier') return roles.includes(user.role);
        if (managerOnly && !isOrgAdmin) return false;
        if (accountRole === 'billing_admin' && !isBillingAdmin) return false;
        if (accountRole === 'org_admin' && !isOrgAdmin) return false;
        if (!hasOperationalAccess && accountRole !== 'billing_admin') return false;
        if (!roles.includes(user.role)) return false;
        if (permission && !isOrgAdmin) {
            const perm = effectivePermissions[permission];
            return perm === 'read' || perm === 'write';
        }
        return true;
    };

    useEffect(() => {
        let cancelled = false;

        if (!user || user.role === 'supplier') {
            setStoreList([]);
            setStoresLoading(false);
            setSwitchingStoreId(null);
            return () => {
                cancelled = true;
            };
        }

        setStoresLoading(true);
        storesApi.list()
            .then((stores) => {
                if (cancelled) return;
                setStoreList(stores || []);
            })
            .catch(() => {
                if (cancelled) return;
                setStoreList([]);
            })
            .finally(() => {
                if (cancelled) return;
                setStoresLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [user?.user_id, user?.active_store_id, (user?.store_ids || []).join(',')]);

    const refreshEcommerceSite = React.useCallback(() => {
        let cancelled = false;
        if (!user || user.role === 'supplier' || !hasOperationalAccess) {
            setEcommerceSite(null);
            return () => { cancelled = true; };
        }
        ecommerceApi.getSite()
            .then((site) => {
                if (cancelled) return;
                setEcommerceSite(site?.enabled ? { site_url: site.site_url, enabled: true } : null);
            })
            .catch(() => {
                if (!cancelled) setEcommerceSite(null);
            });
        return () => {
            cancelled = true;
        };
    }, [hasOperationalAccess, user, user?.active_store_id]);

    useEffect(() => refreshEcommerceSite(), [refreshEcommerceSite]);

    useEffect(() => {
        window.addEventListener('ecommerce:changed', refreshEcommerceSite);
        return () => window.removeEventListener('ecommerce:changed', refreshEcommerceSite);
    }, [refreshEcommerceSite]);

    const activeStore = storeList.find((store) => store.store_id === user?.active_store_id) || null;
    const canSwitchStores = storeList.length > 1;

    const handleStoreSwitch = async (storeId: string) => {
        if (!storeId || storeId === user?.active_store_id) {
            return;
        }
        setSwitchingStoreId(storeId);
        try {
            await storesApi.setActive(storeId);
            window.location.reload();
        } catch (error) {
            console.error(error);
            setSwitchingStoreId(null);
        }
    };

    const openEcommerceSite = async () => {
        if (openingEcommerceSite) return;
        setOpeningEcommerceSite(true);
        try {
            const site = await ecommerceApi.getSite();
            if (site?.enabled && site?.site_url) {
                const url = new URL(site.site_url);
                url.searchParams.set('preview', '1');
                window.open(url.toString(), '_blank', 'noopener,noreferrer');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setOpeningEcommerceSite(false);
        }
    };

    const openEcommerceStats = async () => {
        setEcommerceMenuOpen(false);
        setEcommerceStatsOpen(true);
        setEcommerceStatsLoading(true);
        try {
            setEcommerceStats(await ecommerceApi.getStats());
        } catch (error) {
            console.error(error);
            setEcommerceStats(null);
        } finally {
            setEcommerceStatsLoading(false);
        }
    };

    const openEcommerceSettings = () => {
        setEcommerceMenuOpen(false);
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('settings:target-section', 'ecommerce');
        }
        handleTabClick('settings');
        window.setTimeout(() => window.dispatchEvent(new Event('settings:open-ecommerce')), 0);
    };

    const formatCurrency = (value: number, currency = 'XOF') => {
        try {
            return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: currency === 'XOF' ? 0 : 2 }).format(value || 0);
        } catch {
            return `${new Intl.NumberFormat('fr-FR').format(value || 0)} ${currency}`;
        }
    };

    const getDefaultOpenGroups = (): Set<string> => {
        const open = new Set<string>();
        for (const entry of menuEntries) {
            if (isGroup(entry)) {
                for (const child of entry.children) {
                    if (child.id === activeTab) {
                        open.add(entry.id);
                    }
                }
            }
        }
        return open;
    };

    const [openGroups, setOpenGroups] = useState<Set<string>>(getDefaultOpenGroups);

    useEffect(() => {
        for (const entry of menuEntries) {
            if (isGroup(entry)) {
                for (const child of entry.children) {
                    if (child.id === activeTab) {
                        setOpenGroups(prev => new Set([...prev, entry.id]));
                        return;
                    }
                }
            }
        }
    }, [activeTab]);

    const toggleGroup = (groupId: string) => {
        setOpenGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    const handleTabClick = (tabId: string) => {
        setActiveTab(tabId);
        onMobileClose();
    };

    const renderItem = (item: SidebarItem, indent = false) => {
        const modKey = MODULE_GATED[item.id];
        if (modKey && !modEnabled(modKey)) return null;
        if (!canSeeItem(item.roles, item.permission, item.accountRole, item.managerOnly)) return null;
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
            <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(event) => {
                    const isPrimaryClick = event.button === 0;
                    const hasModifier = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
                    if (!isPrimaryClick || hasModifier) return;
                    event.preventDefault();
                    handleTabClick(item.id);
                }}
                className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 group ${indent ? 'py-2 pl-8 pr-3' : 'p-3'
                    } ${isActive
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
            >
                <Icon
                    size={16}
                    className={isActive ? 'text-primary shrink-0' : 'group-hover:text-primary transition-colors shrink-0'}
                />
                <span className="font-medium text-sm text-left">{item.label}</span>
            </a>
        );
    };

    const renderGroup = (group: SidebarGroup) => {
        if (!canSeeItem(group.roles, group.permission, group.accountRole, group.managerOnly)) return null;
        const visibleChildren = group.children.filter(c => {
            const modKey = MODULE_GATED[c.id];
            return (!modKey || modEnabled(modKey)) && canSeeItem(c.roles, c.permission, c.accountRole, c.managerOnly);
        });
        if (visibleChildren.length === 0) return null;

        const isOpen = openGroups.has(group.id);
        const hasActiveChild = group.children.some(c => c.id === activeTab);
        const GroupIcon = group.icon;

        return (
            <div key={group.id} className="flex flex-col">
                <button
                    onClick={() => toggleGroup(group.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${hasActiveChild
                        ? 'text-primary'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                >
                    <GroupIcon
                        size={16}
                        className={hasActiveChild ? 'text-primary shrink-0' : 'group-hover:text-primary transition-colors shrink-0'}
                    />
                    <span className="font-medium text-sm flex-1 text-left">{group.label}</span>
                    {isOpen
                        ? <ChevronDown size={13} className="shrink-0 opacity-60" />
                        : <ChevronRight size={13} className="shrink-0 opacity-60" />
                    }
                </button>

                <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                >
                    <div className="flex flex-col gap-0.5 py-1 pl-3 border-l border-white/10 ml-5 mt-0.5">
                        {visibleChildren.map(child => renderItem(child, true))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Mobile overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                    onClick={onMobileClose}
                />
            )}

            {ecommerceStatsOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Statistiques E-com</p>
                                <h2 className="mt-1 text-2xl font-black text-white">Performance de la boutique</h2>
                                <p className="mt-1 text-sm text-slate-400">Données des 30 derniers jours, hors ouvertures en mode aperçu depuis Stockman.</p>
                            </div>
                            <button type="button" onClick={() => setEcommerceStatsOpen(false)} className="rounded-full border border-white/10 p-2 text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        {ecommerceStatsLoading ? (
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-sm font-bold text-slate-300">Chargement des statistiques...</div>
                        ) : ecommerceStats ? (
                            <div className="space-y-5">
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    {[
                                        ['Visites', ecommerceStats.visits_30d],
                                        ['Visiteurs uniques', ecommerceStats.unique_visitors_30d],
                                        ['Ajouts panier', ecommerceStats.add_to_cart_30d],
                                        ['Commandes', ecommerceStats.orders_30d],
                                    ].map(([label, value]) => (
                                        <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
                                            <p className="mt-2 text-2xl font-black text-white">{Number(value).toLocaleString('fr-FR')}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">CA E-com</p>
                                        <p className="mt-2 text-xl font-black text-white">{formatCurrency(ecommerceStats.revenue_30d, ecommerceStats.site?.currency || 'XOF')}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Panier moyen</p>
                                        <p className="mt-2 text-xl font-black text-white">{formatCurrency(ecommerceStats.average_order_30d, ecommerceStats.site?.currency || 'XOF')}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Conversion</p>
                                        <p className="mt-2 text-xl font-black text-white">{ecommerceStats.conversion_rate_30d}%</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Produits visibles</p>
                                        <p className="mt-2 text-xl font-black text-white">{ecommerceStats.visible_products.toLocaleString('fr-FR')} / {ecommerceStats.catalog_products.toLocaleString('fr-FR')}</p>
                                    </div>
                                </div>
                                <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                        <h3 className="font-black text-white">Produits ajoutés au panier</h3>
                                        <div className="mt-3 space-y-2">
                                            {ecommerceStats.top_cart_products.length ? ecommerceStats.top_cart_products.map((item) => (
                                                <div key={item.product_id} className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2 text-sm">
                                                    <span className="truncate text-slate-300">{item.name}</span>
                                                    <span className="font-black text-white">{Number(item.quantity).toLocaleString('fr-FR')}</span>
                                                </div>
                                            )) : <p className="text-sm text-slate-500">Aucun ajout au panier sur la période.</p>}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                        <h3 className="font-black text-white">Produits commandés</h3>
                                        <div className="mt-3 space-y-2">
                                            {ecommerceStats.top_ordered_products.length ? ecommerceStats.top_ordered_products.map((item) => (
                                                <div key={item.product_id} className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2 text-sm">
                                                    <span className="truncate text-slate-300">{item.name}</span>
                                                    <span className="font-black text-white">{Number(item.quantity).toLocaleString('fr-FR')}</span>
                                                </div>
                                            )) : <p className="text-sm text-slate-500">Aucune commande sur la période.</p>}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">En attente</p>
                                        <p className="mt-2 text-xl font-black text-white">{ecommerceStats.pending_orders}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Confirmées</p>
                                        <p className="mt-2 text-xl font-black text-white">{ecommerceStats.confirmed_orders}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Ruptures catalogue</p>
                                        <p className="mt-2 text-xl font-black text-white">{ecommerceStats.out_of_stock_products}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm font-bold text-rose-200">Impossible de charger les statistiques E-com.</div>
                        )}
                    </div>
                </div>
            )}

            <aside
                className={`w-64 h-screen theme-sidebar border-r flex flex-col p-4 shrink-0 transition-all duration-300 fixed left-0 top-0 z-50 md:sticky md:top-0 md:z-auto ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                    }`}
            >
                {/* Logo + Theme Toggle */}
                <div className="flex items-center gap-2.5 mb-6 px-1">
                    <Image
                        src="/icon.png"
                        alt="Stockman"
                        width={36}
                        height={36}
                        className="rounded-lg shrink-0"
                    />
                    <h2 className="text-xl text-gradient tracking-tight flex-1">Stockman</h2>
                    <button
                        onClick={toggleTheme}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors theme-text-muted"
                        title={isDark ? 'Mode clair' : 'Mode sombre'}
                    >
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                    <button
                        onClick={onMobileClose}
                        className="md:hidden theme-text-muted hover:text-foreground transition-colors p-1"
                    >
                        <X size={18} />
                    </button>
                </div>

                {hasOperationalAccess && user?.role !== 'supplier' && ecommerceSite?.enabled && (
                    <div className="relative mb-4">
                        <button
                            type="button"
                            onClick={() => setEcommerceMenuOpen((open) => !open)}
                            disabled={openingEcommerceSite}
                            className="flex w-full items-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-left text-primary transition-all hover:bg-primary/15 disabled:opacity-60"
                        >
                            <Globe size={17} className="shrink-0" />
                            <span className="flex-1 text-sm font-black">E-com</span>
                            <ChevronDown size={14} />
                        </button>
                        {ecommerceMenuOpen && (
                            <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-white/10 bg-[#111827] p-2 shadow-2xl">
                                <button type="button" onClick={openEcommerceSite} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-200 hover:bg-white/5">
                                    <Globe size={16} className="text-primary" />
                                    Voir le site
                                </button>
                                <button type="button" onClick={openEcommerceStats} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-200 hover:bg-white/5">
                                    <BarChart3 size={16} className="text-primary" />
                                    Voir les statistiques E-com
                                </button>
                                <button type="button" onClick={openEcommerceSettings} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-200 hover:bg-white/5">
                                    <Settings size={16} className="text-primary" />
                                    Paramètres E-com
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {storeList.length > 0 && (
                    <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                            <Store size={13} className="text-primary" />
                            <span>{t('sidebar.store_switcher.title', { defaultValue: 'Boutique active' })}</span>
                        </div>
                        <p className="mt-2 truncate text-sm font-bold text-white">
                            {activeStore?.name || user?.store_name || t('sidebar.store_switcher.empty', { defaultValue: 'Aucune boutique active' })}
                        </p>
                        {canSwitchStores ? (
                            <select
                                value={switchingStoreId || user?.active_store_id || ''}
                                onChange={(event) => void handleStoreSwitch(event.target.value)}
                                disabled={storesLoading || !!switchingStoreId}
                                className="mt-3 w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-primary disabled:opacity-60"
                            >
                                {storeList.map((store) => (
                                    <option key={store.store_id} value={store.store_id}>
                                        {store.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="mt-2 text-xs text-slate-400">
                                {storesLoading
                                    ? t('sidebar.store_switcher.loading', { defaultValue: 'Chargement des boutiques...' })
                                    : t('sidebar.store_switcher.single', { defaultValue: 'Une seule boutique vous est attribuée.' })}
                            </p>
                        )}
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto custom-scrollbar pr-1">
                    {filteredMenuEntries.map(entry =>
                        isGroup(entry) ? renderGroup(entry) : renderItem(entry)
                    )}
                </nav>

                {/* Messages button */}
                <div className="mt-3 pt-3 border-t border-white/10">
                    <button
                        onClick={() => {
                            onOpenChat();
                            onMobileClose();
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all group"
                    >
                        <div className="relative shrink-0">
                            <MessageCircle size={16} className="group-hover:text-primary transition-colors" />
                            {unreadMessages > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                                    {unreadMessages > 9 ? '9+' : unreadMessages}
                                </span>
                            )}
                        </div>
                        <span className="font-medium text-sm flex-1 text-left">{t('sidebar.messages')}</span>
                        {unreadMessages > 0 && (
                            <span className="bg-rose-500/20 text-rose-400 text-[9px] font-black px-2 py-0.5 rounded-full">
                                {unreadMessages}
                            </span>
                        )}
                    </button>
                </div>

                {/* Notifications button */}
                    <button
                        onClick={() => {
                            onOpenNotifications();
                            onMobileClose();
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all group"
                    >
                        <div className="relative shrink-0">
                            <Bell size={16} className="group-hover:text-primary transition-colors" />
                            {unreadNotifications > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                </span>
                            )}
                        </div>
                        <span className="font-medium text-sm flex-1 text-left">{t('sidebar.notifications')}</span>
                        {unreadNotifications > 0 && (
                            <span className="bg-rose-500/20 text-rose-400 text-[9px] font-black px-2 py-0.5 rounded-full">
                                {unreadNotifications}
                            </span>
                        )}
                    </button>

                    {/* Support button */}
                    <button
                        onClick={() => {
                            onOpenSupport();
                            onMobileClose();
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all group"
                    >
                        <HelpCircle size={16} className="group-hover:text-primary transition-colors" />
                        <span className="font-medium text-sm flex-1 text-left">{t('sidebar.support')}</span>
                    </button>

                {/* Logout */}
                <button
                    onClick={onLogout}
                    className="flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all mt-1"
                >
                    <LogOut size={16} />
                    <span className="font-medium text-sm">{t('settings.logout')}</span>
                </button>
            </aside>
        </>
    );
}
