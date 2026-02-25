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
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
    user?: any;
    isMobileOpen: boolean;
    onMobileClose: () => void;
    onOpenChat: () => void;
    unreadMessages?: number;
}

type SidebarItem = {
    id: string;
    icon: any;
    label: string;
    roles?: string[];
    permission?: string; // module permission key required for staff users
};

type SidebarGroup = {
    id: string;
    icon: any;
    label: string;
    children: SidebarItem[];
    roles?: string[];
    permission?: string;
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
    unreadMessages = 0,
}: SidebarProps) {
    const { t } = useTranslation();

    const menuEntries: SidebarEntry[] = [
        { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard.title') },
        { id: 'multi_stores', icon: Store, label: t('sidebar.multi_stores'), roles: ['shopkeeper', 'admin'] },
        { id: 'pos', icon: ShoppingCart, label: t('sidebar.pos'), roles: ['shopkeeper', 'staff', 'admin'] },
        { id: 'orders', icon: ClipboardList, label: t('tabs.orders'), roles: ['shopkeeper', 'admin'] },
        { id: 'accounting', icon: TrendingUp, label: t('admin.segments.finance'), roles: ['shopkeeper', 'admin'] },
        {
            id: 'stock_group',
            icon: Package,
            label: t('sidebar.stock_inventory'),
            roles: ['shopkeeper', 'staff', 'admin'],
            children: [
                { id: 'inventory', icon: Package, label: t('common.stock'), roles: ['shopkeeper', 'staff', 'admin'] },
                { id: 'alerts', icon: AlertCircle, label: t('alerts.title'), roles: ['shopkeeper', 'staff', 'admin'] },
                { id: 'stock_history', icon: HistoryIcon, label: t('sidebar.stock_history'), roles: ['shopkeeper', 'admin'] },
                { id: 'inventory_counting', icon: RefreshCcw, label: t('dashboard.rotating_inventory'), roles: ['shopkeeper', 'admin'] },
                { id: 'expiry_alerts', icon: AlertCircle, label: t('sidebar.expiry'), roles: ['shopkeeper', 'admin'] },
                { id: 'stats', icon: BarChart3, label: t('sidebar.abc_analysis'), roles: ['shopkeeper', 'admin'] },
            ],
        },
        { id: 'crm', icon: Users, label: t('crm.title'), roles: ['shopkeeper', 'staff', 'admin'] },
        { id: 'staff', icon: UserCheck, label: t('sidebar.staff'), roles: ['shopkeeper', 'admin', 'staff'], permission: 'staff' },
        {
            id: 'suppliers_group',
            icon: Truck,
            label: t('tabs.suppliers'),
            roles: ['shopkeeper', 'supplier', 'admin'],
            children: [
                { id: 'suppliers', icon: Users, label: t('sidebar.my_suppliers'), roles: ['shopkeeper', 'admin'] },
                { id: 'supplier_portal', icon: Truck, label: t('sidebar.supplier_portal'), roles: ['supplier', 'admin'] },
            ],
        },
        {
            id: 'system_group',
            icon: Clock,
            label: t('sidebar.system'),
            roles: ['shopkeeper', 'staff', 'admin'],
            children: [
                { id: 'activity', icon: Clock, label: t('sidebar.system_history'), roles: ['shopkeeper', 'admin'] },
            ],
        },
        { id: 'admin', icon: ShieldCheck, label: t('tabs.admin'), roles: ['admin', 'superadmin'] },
        {
            id: 'account_group',
            icon: Settings,
            label: t('settings.account'),
            children: [
                { id: 'subscription', icon: CreditCard, label: t('tabs.subscription'), roles: ['shopkeeper', 'admin'] },
                { id: 'settings', icon: Settings, label: t('admin.segments.settings') },
            ],
        },
    ];

    const canSeeItem = (roles?: string[], permission?: string) => {
        if (!roles) return true;
        if (!user) return true;
        // Superadmin voit tout
        if (user.role === 'superadmin') return true;
        if (roles.includes(user.role)) {
            // For staff with a permission requirement, check it
            if (user.role === 'staff' && permission) {
                const perm = user.permissions?.[permission];
                return perm === 'read' || perm === 'write';
            }
            return true;
        }
        return false;
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
        if (!canSeeItem(item.roles, item.permission)) return null;
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
            <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
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
            </button>
        );
    };

    const renderGroup = (group: SidebarGroup) => {
        if (!canSeeItem(group.roles, group.permission)) return null;
        const visibleChildren = group.children.filter(c => canSeeItem(c.roles, c.permission));
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

            <aside
                className={`w-64 h-screen bg-[#0F172A] border-r border-white/10 flex flex-col p-4 fixed left-0 top-0 z-50 transition-transform duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                    }`}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 mb-6 px-1">
                    <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                        <Package className="text-white" size={18} />
                    </div>
                    <h2 className="text-xl text-gradient tracking-tight flex-1">Stockman</h2>
                    <button
                        onClick={onMobileClose}
                        className="md:hidden text-slate-400 hover:text-white transition-colors p-1"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto custom-scrollbar pr-1">
                    {menuEntries.map(entry =>
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
