'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../hooks/useDateFormatter';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    PieChart as PieChartIcon,
    Plus,
    Trash2,
    Filter,
    Download,
    Calendar,
    Wallet,
    FileText,
    ArrowRight
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { accounting as accountingApi, expenses as expensesApi } from '../services/api';
import StatCard from './StatCard';
import AccountingReportModal from './AccountingReportModal';
import InvoiceModal from './InvoiceModal';

const PERIODS = [
    { label: '7 jours', value: 7 },
    { label: '30 jours', value: 30 },
    { label: '90 jours', value: 90 },
    { label: 'Année', value: 365 },
];

export default function Accounting() {
    const { t } = useTranslation();
    const { formatDate, formatCurrency } = useDateFormatter();
    const [stats, setStats] = useState<any>(null);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(30);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);

    // New expense state
    const [newExpense, setNewExpense] = useState({ category: 'other', amount: '', description: '' });
    const [saving, setSaving] = useState(false);

    // Filter state
    const [filterExpenseCategory, setFilterExpenseCategory] = useState('all');
    const [isExpenseFilterOpen, setIsExpenseFilterOpen] = useState(false);

    const EXPENSE_CATEGORIES = [
        { value: 'rent', label: 'Loyer' },
        { value: 'salary', label: 'Salaires' },
        { value: 'transport', label: 'Transport' },
        { value: 'water', label: 'Eau / Électricité' },
        { value: 'merchandise', label: 'Marchandises' },
        { value: 'other', label: 'Autres' },
    ];

    useEffect(() => {
        loadData();
    }, [period]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsRes, expensesRes] = await Promise.all([
                accountingApi.getStats(period),
                expensesApi.list(period)
            ]);
            setStats(statsRes);
            setExpenses(Array.isArray(expensesRes?.items) ? expensesRes.items : (Array.isArray(expensesRes) ? expensesRes : []));
        } catch (err) {
            console.error("Accounting load error", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpense.amount) return;
        setSaving(true);
        try {
            await expensesApi.create({
                ...newExpense,
                amount: parseFloat(newExpense.amount)
            });
            setShowExpenseModal(false);
            setNewExpense({ category: 'other', amount: '', description: '' });
            loadData();
        } catch (err) {
            console.error("Save expense error", err);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm("Supprimer cette dépense ?")) return;
        try {
            await expensesApi.delete(id);
            loadData();
        } catch (err) {
            console.error("Delete expense error", err);
        }
    };

    if (loading && !stats) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    // Prepare chart data if available
    const chartData = stats?.daily_stats || [];

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar">
            <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Finance & Comptabilité</h1>
                    <p className="text-slate-400">Analyse de performance et gestion des flux.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-white/5 p-1 rounded-xl flex gap-1 border border-white/10 mr-2">
                        {PERIODS.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p.value ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowReportModal(true)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all font-bold"
                    >
                        <FileText size={18} className="text-primary" /> Rapports PDF
                    </button>
                    <button
                        onClick={() => setShowInvoiceModal(true)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all font-bold"
                    >
                        <Download size={18} className="text-primary" /> Facture Manuelle
                    </button>
                    <button
                        onClick={() => setShowExpenseModal(true)}
                        className="btn-primary rounded-xl px-4 py-2 flex items-center gap-2 text-sm shadow-lg shadow-primary/20"
                    >
                        <Plus size={18} /> Nouvelle Dépense
                    </button>
                </div>
            </header>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard
                    label="Chiffre d'Affaires"
                    value={formatCurrency(stats?.total_revenue || stats?.revenue || 0)}
                    trend={{ value: "Auto", isUp: true }}
                    icon={DollarSign}
                    color="bg-emerald-500"
                />
                <StatCard
                    label="Marge Brute"
                    value={formatCurrency(stats?.gross_profit || 0)}
                    trend={{ value: "Calculé", isUp: true }}
                    icon={TrendingUp}
                    color="bg-amber-500"
                />
                <StatCard
                    label="Dépenses Total"
                    value={formatCurrency(stats?.total_expenses || stats?.expenses || 0)}
                    trend={{ value: "Fixe/Var", isUp: false }}
                    icon={Wallet}
                    color="bg-rose-500"
                />
                <StatCard
                    label="Bénéfice Net"
                    value={formatCurrency(stats?.net_profit || 0)}
                    trend={{ value: "Final", isUp: true }}
                    icon={PieChartIcon}
                    color="bg-sky-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Evolution Chart */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="glass-card p-6 min-h-[400px] flex flex-col">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <TrendingUp size={20} className="text-primary" />
                                Évolution Financière
                            </h3>
                            <div className="flex gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                                    <span className="text-slate-400">Revenus</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                    <span className="text-slate-400">Profit</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 w-full min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#475569"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(str) => {
                                            const d = new Date(str);
                                            return `${d.getDate()}/${d.getMonth() + 1}`;
                                        }}
                                    />
                                    <YAxis
                                        stroke="#475569"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                        itemStyle={{ color: '#fff', fontSize: '12px' }}
                                        labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '10px' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                    <Area type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Wallet size={20} className="text-primary" />
                                Historique des Dépenses
                            </h3>
                            <div className="relative">
                                <button
                                    onClick={() => setIsExpenseFilterOpen(prev => !prev)}
                                    className={`p-2 rounded-lg transition-all ${filterExpenseCategory !== 'all' ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <Filter size={18} />
                                </button>
                                {isExpenseFilterOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-44 bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                                        <button
                                            onClick={() => { setFilterExpenseCategory('all'); setIsExpenseFilterOpen(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${filterExpenseCategory === 'all' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            Toutes catégories
                                        </button>
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <button
                                                key={cat.value}
                                                onClick={() => { setFilterExpenseCategory(cat.value); setIsExpenseFilterOpen(false); }}
                                                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${filterExpenseCategory === cat.value ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            {expenses.filter(e => filterExpenseCategory === 'all' || e.category === filterExpenseCategory).length === 0 ? (
                                <div className="text-center py-10 text-slate-500 font-medium">Aucune dépense sur cette période.</div>
                            ) : (
                                expenses.filter(e => filterExpenseCategory === 'all' || e.category === filterExpenseCategory).map((exp: any) => (
                                    <div key={exp.expense_id} className="group flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 text-xs font-black">
                                                {exp.category.substring(0, 3).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-sm tracking-tight">{exp.description || exp.category}</h4>
                                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{formatDate(exp.created_at)} • {exp.category}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="text-rose-400 font-black text-lg">-{formatCurrency(exp.amount)}</span>
                                            <button
                                                onClick={() => handleDeleteExpense(exp.expense_id)}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-500 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Analysis & Breakdown */}
                <div className="flex flex-col gap-8">
                    <div className="glass-card p-8 flex flex-col items-center">
                        <h3 className="text-lg font-bold text-white self-start mb-8 w-full border-b border-white/5 pb-4">Rentabilité Opérationnelle</h3>

                        {/* Circular Progress (Marge) */}
                        <div className="relative w-56 h-56 mb-8">
                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ffffff05" strokeWidth="2.5" />
                                <circle
                                    cx="18" cy="18" r="15.915" fill="none"
                                    stroke="#3B82F6" strokeWidth="2.5"
                                    strokeDasharray={`${stats ? (stats.gross_profit / stats.revenue) * 100 : 0} ${100 - (stats ? (stats.gross_profit / stats.revenue) * 100 : 0)}`}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black text-white">{stats && stats.revenue > 0 ? ((stats.gross_profit / stats.revenue) * 100).toFixed(0) : 0}%</span>
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Marge</span>
                            </div>
                        </div>

                        <div className="w-full space-y-4">
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-slate-400">Coût des Ventes</span>
                                    <span className="text-sm font-bold text-white">{formatCurrency(stats?.total_cogs || stats?.cogs || 0)}</span>
                                </div>
                                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${stats && stats.revenue > 0 ? (stats.cogs / stats.revenue) * 100 : 0}%` }}></div>
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-slate-400">Charges Fixes</span>
                                    <span className="text-sm font-bold text-white">{formatCurrency(stats?.total_expenses || stats?.expenses || 0)}</span>
                                </div>
                                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${stats && stats.revenue > 0 ? (stats.expenses / stats.revenue) * 100 : 0}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 pt-6 border-t border-white/5 w-full text-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                                <TrendingUp size={12} className="text-primary" />
                                <span className="text-[10px] text-primary font-black uppercase tracking-widest">IA Insights: Performant</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <DollarSign size={20} className="text-primary" />
                            Méthodes de Paiement
                        </h3>
                        <div className="space-y-4">
                            {Object.entries(stats?.payment_breakdown || {}).map(([method, amount]: [string, any]) => (
                                <div key={method} className="flex flex-col gap-1.5 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{method}</span>
                                        <span className="text-sm font-black text-white">{formatCurrency(amount)}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${method === 'cash' ? 'bg-emerald-500' : method === 'credit' ? 'bg-indigo-500' : 'bg-amber-500'}`}
                                            style={{ width: `${stats?.revenue > 0 ? (amount / stats.revenue) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <TrendingDown size={20} className="text-rose-400" />
                            Analyse des Pertes
                        </h3>
                        <div className="space-y-4">
                            {Object.entries(stats?.loss_breakdown || {}).map(([reason, amount]: [string, any]) => (
                                <div key={reason} className="flex justify-between items-center p-3 bg-rose-500/5 rounded-xl border border-rose-500/10">
                                    <span className="text-xs font-bold text-slate-400">{reason}</span>
                                    <span className="text-sm font-black text-rose-400">-{formatCurrency(amount)}</span>
                                </div>
                            ))}
                            {Object.keys(stats?.loss_breakdown || {}).length === 0 && (
                                <p className="text-xs text-slate-500 italic text-center py-4">Aucune perte enregistrée.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AccountingReportModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                stats={stats}
                expenses={expenses}
                period={period}
            />

            <InvoiceModal
                isOpen={showInvoiceModal}
                onClose={() => setShowInvoiceModal(false)}
            />

            {/* Expense Modal (Unchanged categories but better styling) */}
            {showExpenseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowExpenseModal(false)}></div>
                    <div className="glass-card w-full max-w-md relative z-10 p-8">
                        <h2 className="text-2xl font-bold text-white mb-6">Nouvelle Dépense</h2>
                        <form onSubmit={handleCreateExpense} className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Catégorie</label>
                                <select
                                    className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 text-sm font-bold"
                                    value={newExpense.category}
                                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                                >
                                    <option value="rent">Loyer</option>
                                    <option value="salary">Salaires</option>
                                    <option value="transport">Transport</option>
                                    <option value="water">Eau / Électricité</option>
                                    <option value="merchandise">Achat Marchandises</option>
                                    <option value="other">Autres</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Montant (F)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 text-xl font-black"
                                    value={newExpense.amount}
                                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Description</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Facture SDE Janvier..."
                                    className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 text-sm"
                                    value={newExpense.description}
                                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowExpenseModal(false)}
                                    className="flex-1 px-4 py-4 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 btn-primary py-4 rounded-xl font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
