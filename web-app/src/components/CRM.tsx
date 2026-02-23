'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../hooks/useDateFormatter';
import {
    Users,
    UserPlus,
    Search,
    Phone,
    Mail,
    CreditCard,
    MessageSquare,
    ChevronRight,
    MoreVertical,
    Filter,
    Shield,
    ShieldCheck,
    ShieldQuestion,
    ExternalLink,
    AlertCircle,
    History,
    TrendingUp,
    TrendingDown,
    Download,
    Megaphone,
    Settings,
    FileText,
    Zap,
    Cake,
    ArrowUpDown,
    ShoppingBag,
    X
} from 'lucide-react';
import { customers as customersApi, ai as aiApi } from '../services/api';
import Modal from './Modal';
import LoyaltySettingsModal from './LoyaltySettingsModal';
import CampaignModal from './CampaignModal';
import { exportCRM } from '../utils/ExportService';


export default function CRM() {
    const { t, i18n } = useTranslation();
    const { formatDate, formatCurrency } = useDateFormatter();
    const [customers, setCustomers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Modal & Detail State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [detailTab, setDetailTab] = useState<'info' | 'history'>('info');
    const [debtHistory, setDebtHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [customerForm, setCustomerForm] = useState({
        name: '',
        phone: '',
        email: '',
        notes: '',
        category: 'particulier',
        birthday: ''
    });
    const [saving, setSaving] = useState(false);

    // Debt Management State
    const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
    const [debtForm, setDebtForm] = useState({ amount: '', type: 'addition', reason: '' });

    // Filter & Sort State
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterTier, setFilterTier] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('name');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Birthdays & Sales
    const [birthdays, setBirthdays] = useState<any[]>([]);
    const [customerSales, setCustomerSales] = useState<any[]>([]);

    // AI Churn Prediction
    const [churnData, setChurnData] = useState<{ at_risk: any[]; total_at_risk: number; summary: string } | null>(null);
    const [showChurn, setShowChurn] = useState(true);
    const [loadingSales, setLoadingSales] = useState(false);

    const CATEGORIES = [
        { id: 'particulier', label: 'Particulier', color: 'bg-slate-500/10 text-slate-500' },
        { id: 'revendeur', label: 'Revendeur', color: 'bg-blue-500/10 text-blue-500' },
        { id: 'pro', label: 'Professionnel', color: 'bg-indigo-500/10 text-indigo-500' },
        { id: 'elite', label: 'Elite / VIP', color: 'bg-amber-500/10 text-amber-500' },
    ];

    const TIER_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
        bronze: { color: 'text-amber-700', icon: Shield, label: 'Bronze' },
        argent: { color: 'text-slate-400', icon: ShieldCheck, label: 'Argent' },
        or: { color: 'text-amber-400', icon: ShieldCheck, label: 'Or' },
        platine: { color: 'text-blue-200', icon: ShieldCheck, label: 'Platine' },
    };

    const getTier = (customer: any) => {
        const spent = customer.total_spent || 0;
        if (spent > 1000000) return 'platine';
        if (spent > 500000) return 'or';
        if (spent > 100000) return 'argent';
        return 'bronze';
    };

    useEffect(() => {
        loadCustomers();
        loadBirthdays();
    }, []);

    useEffect(() => {
        loadCustomers();
    }, [sortBy]);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const res = await customersApi.list(0, 200, sortBy);
            setCustomers(res.items || res);
            // Auto-trigger churn prediction
            aiApi.churnPrediction(i18n.language).then(res => setChurnData(res)).catch(() => {});
        } catch (err) {
            console.error("CRM load error", err);
        } finally {
            setLoading(false);
        }
    };

    const loadBirthdays = async () => {
        try {
            const res = await customersApi.getBirthdays(7);
            setBirthdays(Array.isArray(res) ? res : []);
        } catch { /* silent */ }
    };

    const handleOpenAddModal = () => {
        setCustomerForm({ name: '', phone: '', email: '', notes: '', category: 'particulier', birthday: '' });
        setIsAddModalOpen(true);
    };

    const handleExportExcel = () => exportCRM(filteredCustomers, 'F', 'excel');
    const handleExportPDF = () => exportCRM(filteredCustomers, 'F', 'pdf');

    const handleSaveCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerForm.name) return;
        setSaving(true);
        try {
            await customersApi.create(customerForm);
            setIsAddModalOpen(false);
            loadCustomers();
        } catch (err) {
            console.error("Create customer error", err);
        } finally {
            setSaving(false);
        }
    };

    const handleOpenDetail = async (customer: any) => {
        setSelectedCustomer(customer);
        setDetailTab('info');
        setIsDetailModalOpen(true);
        setLoadingHistory(true);
        setCustomerSales([]);
        try {
            const [debtsRes, salesRes] = await Promise.all([
                customersApi.getDebts(customer.customer_id),
                customersApi.getSales(customer.customer_id)
            ]);
            setDebtHistory(Array.isArray(debtsRes?.items) ? debtsRes.items : (Array.isArray(debtsRes) ? debtsRes : []));
            setCustomerSales(salesRes?.sales || []);
        } catch (err) {
            console.error("Error loading customer detail", err);
            setDebtHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleWhatsApp = (phone: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    if (loading && customers.length === 0) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    const filteredCustomers = (Array.isArray(customers) ? customers : []).filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search);
        const matchCategory = filterCategory === 'all' || (c.category || 'particulier') === filterCategory;
        const matchTier = filterTier === 'all' || getTier(c) === filterTier;
        return matchSearch && matchCategory && matchTier;
    });

    // CRM summary stats
    const avgBasket = customers.length > 0
        ? customers.reduce((s, c) => s + (c.average_basket || 0), 0) / customers.filter(c => (c.visit_count || 0) > 0).length || 0
        : 0;
    const inactiveCount = customers.filter(c => {
        if (!c.last_purchase_date) return true;
        const diff = (Date.now() - new Date(c.last_purchase_date).getTime()) / (1000 * 60 * 60 * 24);
        return diff > 30;
    }).length;

    return (
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('crm.title') || 'Gestion Clients (CRM)'}</h1>
                    <p className="text-slate-400">{t('crm.subtitle') || 'Fidélisez votre clientèle et suivez les dettes.'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setIsCampaignModalOpen(true)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all font-bold"
                    >
                        <Megaphone size={20} className="text-primary" /> Campagne
                    </button>
                    <button
                        onClick={() => setIsLoyaltyModalOpen(true)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all font-bold"
                    >
                        <Settings size={20} className="text-primary" /> Fidélité
                    </button>
                    <div className="h-10 w-[1px] bg-white/10 mx-1"></div>
                    <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-3 hover:bg-white/5 text-emerald-400 hover:text-emerald-300 transition-all border-r border-white/10"
                            title="Exporter Excel (.xlsx)"
                        >
                            <Download size={18} />
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="px-4 py-3 hover:bg-white/5 text-red-400 hover:text-red-300 transition-all"
                            title="Exporter PDF"
                        >
                            <FileText size={18} />
                        </button>
                    </div>
                    <button
                        onClick={handleOpenAddModal}
                        className="btn-primary rounded-xl px-5 py-3 flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105"
                    >
                        <UserPlus size={20} /> {t('crm.add_customer') || 'Nouveau Client'}
                    </button>
                </div>
            </header>

            {/* Birthday banner */}
            {birthdays.length > 0 && (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-4">
                    <Cake size={20} className="text-amber-400 shrink-0" />
                    <div className="flex-1">
                        <span className="text-amber-400 font-bold text-sm">
                            {birthdays.length === 1
                                ? `🎂 Anniversaire dans 7 jours : ${birthdays[0].name}`
                                : `🎂 ${birthdays.length} anniversaires à venir : ${birthdays.slice(0, 3).map((b: any) => b.name).join(', ')}${birthdays.length > 3 ? '…' : ''}`
                            }
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            setIsCampaignModalOpen(true);
                        }}
                        className="text-xs font-black text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-xl hover:bg-amber-500/20 transition-all shrink-0"
                    >
                        Envoyer vœux
                    </button>
                </div>
            )}

            {/* AI Churn Prediction Banner */}
            {churnData && showChurn && churnData.total_at_risk > 0 && (
                <div className="mb-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-2xl">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <Zap size={20} className="text-violet-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-violet-300 font-bold text-sm mb-1">
                                    IA — {churnData.total_at_risk} clients à risque de churn
                                </p>
                                <p className="text-slate-300 text-sm leading-relaxed">{churnData.summary}</p>
                                {churnData.at_risk.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {churnData.at_risk.slice(0, 5).map((c: any) => (
                                            <span key={c.customer_id} className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-lg font-medium">
                                                {c.name}
                                            </span>
                                        ))}
                                        {churnData.at_risk.length > 5 && (
                                            <span className="text-xs text-slate-500">+{churnData.at_risk.length - 5} autres</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <button onClick={() => setShowChurn(false)} className="text-slate-500 hover:text-slate-300 transition-colors shrink-0">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="glass-card p-5 flex flex-col gap-2">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Clients</span>
                    <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold text-white">{customers.length}</span>
                        <div className="p-3 rounded-xl bg-primary/10 text-primary"><Users size={20} /></div>
                    </div>
                </div>
                <div className="glass-card p-5 flex flex-col gap-2">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Panier Moyen</span>
                    <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-white">{formatCurrency(avgBasket)}</span>
                        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400"><ShoppingBag size={20} /></div>
                    </div>
                </div>
                <div className="glass-card p-5 flex flex-col gap-2">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Clients en Dette</span>
                    <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold text-amber-500">
                            {(Array.isArray(customers) ? customers : []).filter(c => (c.total_debt || 0) > 0).length}
                        </span>
                        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500"><CreditCard size={20} /></div>
                    </div>
                </div>
                <div className="glass-card p-5 flex flex-col gap-2">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Inactifs +30j</span>
                    <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold text-rose-400">{inactiveCount}</span>
                        <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400"><AlertCircle size={20} /></div>
                    </div>
                </div>
            </div>

            {/* Tier & Sort chips */}
            <div className="flex flex-wrap gap-2 mb-4">
                {/* Tier filter */}
                {[
                    { key: 'all', label: 'Tous' },
                    { key: 'bronze', label: '🥉 Bronze' },
                    { key: 'argent', label: '🥈 Argent' },
                    { key: 'or', label: '🥇 Or' },
                    { key: 'platine', label: '💎 Platine' },
                ].map(t => (
                    <button key={t.key} onClick={() => setFilterTier(t.key)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${filterTier === t.key ? 'bg-primary text-white border-primary' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:border-primary/40'}`}>
                        {t.label}
                    </button>
                ))}
                <div className="h-6 w-px bg-white/10 mx-1 self-center" />
                {/* Sort */}
                {[
                    { key: 'name', label: 'A→Z' },
                    { key: 'total_spent', label: 'Plus dépensé' },
                    { key: 'visits', label: 'Plus visités' },
                    { key: 'last_purchase', label: 'Récents' },
                ].map(s => (
                    <button key={s.key} onClick={() => setSortBy(s.key)}
                        className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${sortBy === s.key ? 'bg-white/20 text-white border-white/30' : 'bg-white/5 text-slate-500 border-white/10 hover:text-slate-300'}`}>
                        <ArrowUpDown size={10} /> {s.label}
                    </button>
                ))}
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder={t('crm.search_placeholder') || "Rechercher un client..."}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                    />
                </div>
                <div className="flex gap-2 relative">
                    <button
                        onClick={() => setIsFilterOpen(prev => !prev)}
                        className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${filterCategory !== 'all'
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                            }`}
                    >
                        <Filter size={20} />
                        <span className="hidden md:inline">{t('common.filter') || 'Filtrer'}</span>
                    </button>
                    {isFilterOpen && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                            <button
                                onClick={() => { setFilterCategory('all'); setIsFilterOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${filterCategory === 'all' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            >
                                Tous les clients
                            </button>
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => { setFilterCategory(cat.id); setIsFilterOpen(false); }}
                                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${filterCategory === cat.id ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={() => {
                            if (selectedCustomer) {
                                setDetailTab('history');
                                setIsDetailModalOpen(true);
                            }
                        }}
                        title="Historique (sélectionnez d'abord un client)"
                        className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"
                    >
                        <History size={20} />
                    </button>
                </div>
            </div>

            {/* Client List */}
            <div className="glass-card overflow-hidden">
                {filteredCustomers.length === 0 ? (
                    <div className="p-20 text-center text-slate-500 flex flex-col items-center gap-4">
                        <Users size={48} className="opacity-20" />
                        <p>{t('crm.no_customers_found') || 'Aucun client trouvé.'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 text-slate-500 uppercase text-[10px] tracking-widest bg-white/5">
                                    <th className="px-6 py-4 font-semibold">Client</th>
                                    <th className="px-6 py-4 font-semibold">Rang</th>
                                    <th className="px-6 py-4 font-semibold text-right">Panier moy.</th>
                                    <th className="px-6 py-4 font-semibold">Dernière visite</th>
                                    <th className="px-6 py-4 font-semibold text-right">Encours</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredCustomers.map((c) => {
                                    const tier = getTier(c);
                                    const tc = TIER_CONFIG[tier];
                                    const TierIcon = tc.icon;

                                    return (
                                        <tr key={c.customer_id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border-2 border-primary/10">
                                                        {c.name.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-bold">{c.name}</span>
                                                        <span className="text-xs text-slate-500">{c.phone || t('crm.no_phone') || 'Sans mobile'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`flex items-center gap-2 ${tc.color} font-bold text-xs uppercase tracking-tighter`}>
                                                    <TierIcon size={14} />
                                                    {tc.label}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-white font-bold text-sm">{formatCurrency(c.average_basket || 0)}</span>
                                                <p className="text-[10px] text-slate-500">{c.visit_count || 0} visites</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                {c.last_purchase_date ? (
                                                    <span className="text-xs text-slate-400">{formatDate(c.last_purchase_date)}</span>
                                                ) : (
                                                    <span className="text-xs text-slate-600 italic">Jamais</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-bold ${(c.total_debt || 0) > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                                    {formatCurrency(c.total_debt || 0)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleOpenDetail(c)}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Customer Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title={t('crm.add_customer') || 'Ajouter un Client'}
            >
                <form onSubmit={handleSaveCustomer} className="space-y-4">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-slate-400 font-medium">{t('common.name') || 'Nom'}</label>
                            <input
                                required
                                type="text"
                                placeholder="Jean Dupont"
                                value={customerForm.name}
                                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-slate-400 font-medium">{t('common.phone') || 'Téléphone'}</label>
                            <input
                                type="tel"
                                placeholder="+225 ..."
                                value={customerForm.phone}
                                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-slate-400 font-medium">{t('common.email') || 'Email'}</label>
                            <input
                                type="email"
                                placeholder="client@email.com"
                                value={customerForm.email}
                                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-slate-400 font-medium">Catégorie</label>
                            <select
                                value={customerForm.category}
                                onChange={(e) => setCustomerForm({ ...customerForm, category: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all font-medium appearance-none"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat.id} value={cat.id} className="bg-[#0F172A]">{cat.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-slate-400 font-medium">Date de Naissance (Optionnel)</label>
                            <input
                                type="date"
                                value={customerForm.birthday}
                                onChange={(e) => setCustomerForm({ ...customerForm, birthday: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                            />
                        </div>
                    </div>
                    <div className="flex gap-4 pt-6 mt-6 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            className="flex-1 px-4 py-2 text-slate-400 hover:text-white transition-colors font-bold"
                        >
                            {t('common.cancel') || 'Annuler'}
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 btn-primary py-2 rounded-lg font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {saving ? '...' : (t('common.save') || 'Enregistrer')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Customer Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={selectedCustomer?.name || ''}
                maxWidth="xl"
            >
                {selectedCustomer && (
                    <div className="space-y-6">
                        {/* Profile Header & Tabs */}
                        <div className="flex flex-col items-center gap-6 border-b border-white/10 pb-6">
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary border-4 border-primary/10">
                                    {selectedCustomer.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex gap-2 justify-center mt-1">
                                        <div className={`flex items-center gap-2 ${TIER_CONFIG[getTier(selectedCustomer)].color} font-bold text-[10px] uppercase tracking-widest`}>
                                            {React.createElement(TIER_CONFIG[getTier(selectedCustomer)].icon, { size: 14 })}
                                            {TIER_CONFIG[getTier(selectedCustomer)].label}
                                        </div>
                                        {selectedCustomer.category && selectedCustomer.category !== 'particulier' && (
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${CATEGORIES.find(cat => cat.id === selectedCustomer.category)?.color || 'bg-white/10 text-slate-400'}`}>
                                                {CATEGORIES.find(cat => cat.id === selectedCustomer.category)?.label}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setDetailTab('info')}
                                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${detailTab === 'info' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                >
                                    Infos
                                </button>
                                <button
                                    onClick={() => setDetailTab('history')}
                                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${detailTab === 'history' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                >
                                    Dettes
                                </button>
                                <button
                                    onClick={() => setDetailTab('purchases' as any)}
                                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${detailTab === ('purchases' as any) ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                >
                                    Achats ({customerSales.length})
                                </button>
                            </div>
                        </div>

                        {detailTab === 'info' ? (
                            <div className="animate-in fade-in duration-300 space-y-8">
                                {/* Contact Quick Actions */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <button
                                        onClick={() => handleWhatsApp(selectedCustomer.phone)}
                                        className="flex flex-col items-center gap-2 p-4 glass-card hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all text-emerald-400 border border-emerald-500/10"
                                    >
                                        <MessageSquare size={20} />
                                        <span className="text-[10px] font-bold uppercase">WhatsApp</span>
                                    </button>
                                    <button
                                        onClick={() => selectedCustomer.phone && window.open(`tel:${selectedCustomer.phone}`, '_self')}
                                        disabled={!selectedCustomer.phone}
                                        className="flex flex-col items-center gap-2 p-4 glass-card hover:bg-blue-500/10 hover:border-blue-500/30 transition-all text-blue-400 border border-blue-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Phone size={20} />
                                        <span className="text-[10px] font-bold uppercase">Appeler</span>
                                    </button>
                                    <button
                                        onClick={() => selectedCustomer.email && window.open(`mailto:${selectedCustomer.email}`, '_blank')}
                                        disabled={!selectedCustomer.email}
                                        className="flex flex-col items-center gap-2 p-4 glass-card hover:bg-purple-500/10 hover:border-purple-500/30 transition-all text-purple-400 border border-purple-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Mail size={20} />
                                        <span className="text-[10px] font-bold uppercase">Email</span>
                                    </button>
                                    <div className="flex flex-col items-center gap-2 p-4 glass-card bg-primary/5 border-primary/20 text-primary">
                                        <Zap size={20} />
                                        <div className="flex flex-col items-center">
                                            <span className="text-sm font-black">{selectedCustomer.loyalty_points || 0}</span>
                                            <span className="text-[9px] font-bold uppercase tracking-tighter">Points</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats & Category */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-5 bg-white/5 border border-white/5 rounded-3xl space-y-1">
                                        <p className="text-[10px] font-black text-slate-500 uppercase">Catégorie</p>
                                        <div className="flex items-center gap-2 text-white font-bold">
                                            <Shield size={16} className="text-primary" />
                                            {selectedCustomer.category || 'Particulier'}
                                        </div>
                                    </div>
                                    <div className="p-5 bg-white/5 border border-white/5 rounded-3xl space-y-1">
                                        <p className="text-[10px] font-black text-slate-500 uppercase">Total Dépensé</p>
                                        <p className="text-xl font-black text-white">{formatCurrency(selectedCustomer.total_spent || 0)}</p>
                                    </div>
                                    <div className="p-5 bg-rose-500/5 border border-rose-500/20 rounded-3xl space-y-1">
                                        <p className="text-[10px] font-black text-rose-500/50 uppercase">Dette Actuelle</p>
                                        <p className="text-xl font-black text-rose-500">{formatCurrency(selectedCustomer.total_debt || 0)}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in fade-in duration-300 space-y-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-sm font-black text-white uppercase tracking-widest px-1 border-l-4 border-primary">Dernières Opérations</h4>
                                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-bold">{debtHistory.length} opérations</span>
                                </div>

                                {loadingHistory ? (
                                    <div className="py-10 flex justify-center">
                                        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                    </div>
                                ) : debtHistory.length === 0 ? (
                                    <div className="py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                        <History size={40} className="mx-auto text-slate-700 mb-3" />
                                        <p className="text-sm text-slate-500 font-bold uppercase">Aucun historique trouvé</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                        {(Array.isArray(debtHistory) ? debtHistory : []).map((debt, idx) => (
                                            <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center group hover:bg-white/10 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${debt.is_payment ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        {debt.is_payment ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white">{debt.description || (debt.is_payment ? 'Remboursement' : 'Achat à crédit')}</p>
                                                        <p className="text-[10px] text-slate-500 font-medium">{formatDate(debt.date)} • {debt.reference || '-'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-black ${debt.is_payment ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {debt.is_payment ? '-' : '+'}{formatCurrency(debt.amount || 0)}
                                                    </p>
                                                    <p className="text-[9px] text-slate-600 font-bold uppercase">Solde: {formatCurrency(debt.remaining || 0)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Purchases tab */}
                        {detailTab === ('purchases' as any) && (
                            <div className="animate-in fade-in duration-300 space-y-3">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-sm font-black text-white uppercase tracking-widest px-1 border-l-4 border-emerald-500">Historique des Achats</h4>
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">{customerSales.length} transactions</span>
                                </div>
                                {loadingHistory ? (
                                    <div className="py-10 flex justify-center">
                                        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    </div>
                                ) : customerSales.length === 0 ? (
                                    <div className="py-16 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                        <ShoppingBag size={40} className="mx-auto text-slate-700 mb-3" />
                                        <p className="text-sm text-slate-500 font-bold">Aucun achat enregistré</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                        {customerSales.map((sale: any, idx: number) => (
                                            <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center hover:bg-white/10 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                                        <ShoppingBag size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white">
                                                            #{(sale.sale_id || '').substring(0, 8).toUpperCase()}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500">{formatDate(sale.created_at)} · {(sale.items || []).length} article(s)</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-emerald-400">{formatCurrency(sale.total_amount || 0)}</p>
                                                    <p className="text-[10px] text-slate-600 uppercase">{sale.payment_method || 'cash'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Financial Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="glass-card p-6 bg-rose-500/5 border-rose-500/10">
                                <span className="text-rose-400 text-sm font-medium">Encours Actuel</span>
                                <div className="text-3xl font-bold text-rose-500 mt-1">{formatCurrency(selectedCustomer.total_debt || 0)}</div>
                                <button
                                    onClick={() => setIsDebtModalOpen(true)}
                                    className="mt-4 w-full py-2 bg-rose-500 text-white rounded-lg font-bold text-sm hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
                                >
                                    Gérer la Dette (Manuel)
                                </button>
                            </div>
                            <div className="glass-card p-6 bg-emerald-500/5 border-emerald-500/10">
                                <span className="text-emerald-400 text-sm font-medium">Total Achats</span>
                                <div className="text-3xl font-bold text-emerald-500 mt-1">{formatCurrency(selectedCustomer.total_spent || 0)}</div>
                                <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                    <span>{selectedCustomer.visit_count || 0} visites</span>
                                    <span>Dernier: {selectedCustomer.last_purchase_date ? formatDate(selectedCustomer.last_purchase_date) : 'Jamais'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="glass-card p-6">
                            <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-widest text-slate-400">
                                <MoreVertical size={14} /> Notes & Informations
                            </h4>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                {selectedCustomer.notes || "Aucune note particulière pour ce client. Utilisez cet espace pour noter ses préférences ou habitudes d'achat."}
                            </p>
                        </div>
                    </div>
                )}
            </Modal >

            {/* Loyalty Settings Modal */}
            <LoyaltySettingsModal
                isOpen={isLoyaltyModalOpen}
                onClose={() => setIsLoyaltyModalOpen(false)}
            />

            {/* Marketing Campaign Modal */}
            <CampaignModal
                isOpen={isCampaignModalOpen}
                onClose={() => setIsCampaignModalOpen(false)}
            />
            {/* Manual Debt Modal */}
            <Modal
                isOpen={isDebtModalOpen}
                onClose={() => setIsDebtModalOpen(false)}
                title={`Gérer Dette: ${selectedCustomer?.name}`}
            >
                <div className="space-y-4">
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 mb-4">
                        <button
                            onClick={() => setDebtForm({ ...debtForm, type: 'addition' })}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${debtForm.type === 'addition' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-white'}`}
                        >
                            Ajouter Dette
                        </button>
                        <button
                            onClick={() => setDebtForm({ ...debtForm, type: 'payment' })}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${debtForm.type === 'payment' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
                        >
                            Encaisser Paiement
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-slate-400 font-medium">Montant</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={debtForm.amount}
                                onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all font-bold text-xl"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-slate-400 font-medium">Motif / Commentaire</label>
                            <input
                                type="text"
                                placeholder="Paiement partiel, Achat à crédit..."
                                value={debtForm.reason}
                                onChange={(e) => setDebtForm({ ...debtForm, reason: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6 mt-6 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsDebtModalOpen(false)}
                            className="flex-1 px-4 py-2 text-slate-400 hover:text-white transition-colors font-bold"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={async () => {
                                if (!debtForm.amount || !selectedCustomer) return;
                                setSaving(true);
                                try {
                                    await customersApi.addDebt(selectedCustomer.customer_id, {
                                        amount: parseFloat(debtForm.amount),
                                        is_payment: debtForm.type === 'payment',
                                        description: debtForm.reason || undefined,
                                    });
                                    setIsDebtModalOpen(false);
                                    setDebtForm({ amount: '', type: 'addition', reason: '' });
                                    // Refresh customer details
                                    const res = await customersApi.getDebts(selectedCustomer.customer_id);
                                    setDebtHistory(Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []));
                                    loadCustomers();
                                } catch (err) {
                                    console.error(err);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                            disabled={saving}
                            className={`flex-1 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 ${debtForm.type === 'addition' ? 'bg-rose-500 shadow-rose-500/20' : 'bg-emerald-500 shadow-emerald-500/20'} text-white`}
                        >
                            {saving ? '...' : 'Confirmer'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
