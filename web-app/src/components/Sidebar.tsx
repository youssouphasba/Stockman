'use client';

import React from 'react';
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
    ShieldCheck
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
    user?: any;
}

export default function Sidebar({ activeTab, setActiveTab, onLogout, user }: SidebarProps) {
    const { t } = useTranslation();

    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard.title') },
        { id: 'pos', icon: ShoppingCart, label: 'Ventes (POS)', roles: ['shopkeeper', 'staff', 'admin'] },
        { id: 'inventory', icon: Package, label: t('common.stock'), roles: ['shopkeeper', 'staff', 'admin'] },
        { id: 'orders', icon: ShoppingCart, label: 'Commandes', roles: ['shopkeeper', 'admin'] },
        { id: 'accounting', icon: TrendingUp, label: 'Finance', roles: ['shopkeeper', 'admin'] },
        { id: 'crm', icon: Users, label: t('crm.title'), roles: ['shopkeeper', 'staff', 'admin'] },
        { id: 'staff', icon: ShieldCheck, label: 'Personnel', roles: ['shopkeeper', 'admin'] },
        { id: 'suppliers', icon: Users, label: 'Fournisseurs', roles: ['shopkeeper', 'admin'] },
        { id: 'supplier_portal', icon: Truck, label: 'Portail Fournisseur', roles: ['supplier', 'admin'] },
        { id: 'stock_history', icon: HistoryIcon, label: 'Historique Stock', roles: ['shopkeeper', 'admin'] },
        { id: 'activity', icon: Clock, label: 'Historique Système', roles: ['shopkeeper', 'admin'] },
        { id: 'alerts', icon: AlertCircle, label: t('alerts.title'), roles: ['shopkeeper', 'staff', 'admin'] },
        { id: 'stats', icon: BarChart3, label: 'Analyses ABC', roles: ['shopkeeper', 'admin'] },
        { id: 'subscription', icon: CreditCard, label: 'Abonnement', roles: ['shopkeeper', 'admin'] },
        { id: 'inventory_counting', icon: ShieldCheck, label: 'Inventaire Tournant', roles: ['shopkeeper', 'admin'] },
        { id: 'expiry_alerts', icon: AlertCircle, label: 'Péremption', roles: ['shopkeeper', 'admin'] },
        { id: 'admin', icon: Globe, label: 'Admin', roles: ['admin'] },
        { id: 'settings', icon: Settings, label: t('admin.segments.settings') },
    ];

    const filteredMenu = menuItems.filter(item => {
        if (!item.roles) return true;
        if (!user) return true; // Show all for demo if no user object
        return item.roles.includes(user.role);
    });

    return (
        <aside className="w-64 h-screen bg-[#0F172A] border-r border-white/10 flex flex-col p-6 fixed left-0 top-0 z-50">
            <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <Package className="text-white" size={24} />
                </div>
                <h2 className="text-2xl text-gradient tracking-tight">Stockman</h2>
            </div>

            <nav className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2 -mr-4">
                {filteredMenu.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <Icon size={20} className={isActive ? 'text-primary' : 'group-hover:text-primary transition-colors'} />
                            <span className="font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            <button
                onClick={onLogout}
                className="flex items-center gap-4 p-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all mt-auto"
            >
                <LogOut size={20} />
                <span className="font-medium">Déconnexion</span>
            </button>
        </aside>
    );
}
