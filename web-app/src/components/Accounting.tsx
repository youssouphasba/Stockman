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
    Edit2,
    X,
    Package,
    BarChart2
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';
import { accounting as accountingApi, expenses as expensesApi, ai as aiApi } from '../services/api';
import StatCard from './StatCard';
import AccountingReportModal from './AccountingReportModal';
import InvoiceModal from './InvoiceModal';

const PERIODS = [
    { label: '7j', value: 7 },
    { label: '30j', value: 30 },
    { label: '90j', value: 90 },
    { label: '1an', value: 365 },
];

const EXPENSE_CATEGORIES = [
    { value: 'rent', label: 'Loyer' },
    { value: 'salary', label: 'Salaires' },
    { value: 'transport', label: 'Transport' },
    { value: 'water', label: 'Eau / Électricité' },
    { value: 'merchandise', label: 'Achat Marchandises' },
    { value: 'other', label: 'Autres' },
];

export default function Accounting() {
    const { t } = useTranslation();
    const { formatDate, formatCurrency } = useDateFormatter();
    const [stats, setStats] = useState<any>(null);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(30);

    // Custom date range
    const [useCustomRange, setUseCustomRange] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Modals
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);

    // Expense form
    const [editingExpense, setEditingExpense] = useState<any>(null);
    const [newExpense, setNewExpense] = useState({ category: 'other', amount: '', description: '' });
    const [saving, setSaving] = useState(false);

    // Filters
    const [filterExpenseCategory, setFilterExpenseCategory] = useState('all');
    const [isExpenseFilterOpen, setIsExpenseFilterOpen] = useState(false);

    // Tab for right panel
    const [rightTab, setRightTab] = useState<'profitability' | 'payments' | 'losses' | 'products'>('profitability');

    // AI P&L analysis
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [showMonthlyReport, setShowMonthlyReport] = useState(false);
    const [monthlyReport, setMonthlyReport] = useState('');
    const [reportLoading, setReportLoading] = useState(false);

    const { i18n } = useTranslation();

    useEffect(() => {
        if (!useCustomRange) loadData();
    }, [period, useCustomRange]);

    const loadData = async (sd?: string, ed?: string) => {
        setLoading(true);
        try {
            const [statsRes, expensesRes] = await Promise.all([
                sd || ed
                    ? accountingApi.getStats(undefined, sd, ed)
                    : accountingApi.getStats(period),
                sd || ed
                    ? expensesApi.list(undefined, sd, ed)
                    : expensesApi.list(period)
            ]);
            setStats(statsRes);
            setExpenses(Array.isArray(expensesRes?.items) ? expensesRes.items : (Array.isArray(expensesRes) ? expensesRes : []));
            // Auto-load AI analysis after data
            aiApi.plAnalysis(i18n.language, period).then(res => setAiAnalysis(res.analysis)).catch(() => {});
        } catch (err) {
            console.error("Accounting load error", err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        setReportLoading(true);
        setShowMonthlyReport(true);
        try {
            const res = await aiApi.monthlyReport(i18n.language);
            setMonthlyReport(res.report);
        } catch (e) {
            setMonthlyReport('Erreur lors de la génération du rapport.');
        } finally {
            setReportLoading(false);
        }
    };

    const handleDownloadReport = () => {
        const blob = new Blob([monthlyReport], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport_mensuel_${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleApplyCustomRange = () => {
        if (startDate && endDate) {
            loadData(startDate, endDate);
        }
    };

    const handleOpenAddExpense = () => {
        setEditingExpense(null);
        setNewExpense({ category: 'other', amount: '', description: '' });
        setShowExpenseModal(true);
    };

    const handleOpenEditExpense = (exp: any) => {
        setEditingExpense(exp);
        setNewExpense({ category: exp.category, amount: String(exp.amount), description: exp.description || '' });
        setShowExpenseModal(true);
    };

    const handleSaveExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpense.amount) return;
        setSaving(true);
        try {
            const payload = { ...newExpense, amount: parseFloat(newExpense.amount) };
            if (editingExpense) {
                await expensesApi.update(editingExpense.expense_id, payload);
            } else {
                await expensesApi.create(payload);
            }
            setShowExpenseModal(false);
            loadData(useCustomRange ? startDate : undefined, useCustomRange ? endDate : undefined);
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
            loadData(useCustomRange ? startDate : undefined, useCustomRange ? endDate : undefined);
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

    // Chart data — backend returns daily_revenue array; filter out items with missing date
    const chartData = (stats?.daily_revenue || []).filter((d: any) => d?.date != null);

    // Product performance — top 8 by revenue
    const topProducts = (stats?.product_performance || [])
        .filter((p: any) => p.revenue > 0)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 8);

    const marginPct = stats?.revenue > 0 ? ((stats.gross_profit / stats.revenue) * 100) : 0;
    const netMarginPct = stats?.revenue > 0 ? ((stats.net_profit / stats.revenue) * 100) : 0;

    const filteredExpenses = expenses.filter(e => filterExpenseCategory === 'all' || e.category === filterExpenseCategory);

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Finance & Comptabilité</h1>
                    <p className="text-slate-400">Analyse P&L, dépenses et performance produits.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Period selector */}
                    {!useCustomRange && (
                        <div className="bg-white/5 p-1 rounded-xl flex gap-1 border border-white/10">
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
                    )}

                    {/* Custom date range toggle */}
                    <button
                        onClick={() => { setUseCustomRange(v => !v); }}
                        className={`p-2 rounded-xl border transition-all ${useCustomRange ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                        title="Plage de dates personnalisée"
                    >
                        <Calendar size={18} />
                    </button>

                    {useCustomRange && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-primary/50"
                            />
                            <span className="text-slate-500 text-sm">→</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-primary/50"
                            />
                            <button
                                onClick={handleApplyCustomRange}
                                disabled={!startDate || !endDate}
                                className="btn-primary px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
                            >
                                OK
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleGenerateReport}
                        className="bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-purple-300 hover:text-white hover:bg-purple-500/20 transition-all font-bold"
                    >
                        <BarChart2 size={18} className="text-purple-400" /> Rapport IA
                    </button>
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
                        <Download size={18} className="text-primary" /> Facture
                    </button>
                    <button
                        onClick={handleOpenAddExpense}
                        className="btn-primary rounded-xl px-4 py-2 flex items-center gap-2 text-sm shadow-lg shadow-primary/20"
                    >
                        <Plus size={18} /> Nouvelle Dépense
                    </button>
                </div>
            </header>

            {/* AI P&L Analysis */}
            {aiAnalysis && (
                <div className="mb-8 glass-card p-5 border-l-4 border-l-purple-500 bg-purple-500/5 flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <BarChart2 size={16} className="text-purple-400" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Analyse IA</p>
                        <p className="text-slate-300 text-sm leading-relaxed">{aiAnalysis}</p>
                    </div>
                </div>
            )}

            {/* Monthly Report Modal */}
            {showMonthlyReport && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowMonthlyReport(false)}>
                    <div className="bg-[#1E293B] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-white font-bold text-lg flex items-center gap-2"><BarChart2 size={20} className="text-purple-400" /> Rapport Mensuel IA</h2>
                            <div className="flex gap-2">
                                {monthlyReport && <button onClick={handleDownloadReport} className="text-xs text-primary hover:underline flex items-center gap-1"><Download size={14} /> Télécharger</button>}
                                <button onClick={() => setShowMonthlyReport(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {reportLoading ? (
                                <div className="flex items-center justify-center py-10 gap-3">
                                    <div className="w-6 h-6 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
                                    <span className="text-slate-400 text-sm">Génération en cours…</span>
                                </div>
                            ) : (
                                <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">{monthlyReport}</pre>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    label="Chiffre d'Affaires"
                    value={formatCurrency(stats?.revenue || 0)}
                    trend={{ value: `${stats?.sales_count || 0} ventes`, isUp: true }}
                    icon={DollarSign}
                    color="bg-emerald-500"
                />
                <StatCard
                    label="Marge Brute"
                    value={formatCurrency(stats?.gross_profit || 0)}
                    trend={{ value: `${marginPct.toFixed(1)}%`, isUp: marginPct > 20 }}
                    icon={TrendingUp}
                    color="bg-amber-500"
                />
                <StatCard
                    label="Dépenses"
                    value={formatCurrency(stats?.expenses || 0)}
                    trend={{ value: "Charges", isUp: false }}
                    icon={Wallet}
                    color="bg-rose-500"
                />
                <StatCard
                    label="Bénéfice Net"
                    value={formatCurrency(stats?.net_profit || 0)}
                    trend={{ value: `${netMarginPct.toFixed(1)}% marge nette`, isUp: (stats?.net_profit || 0) > 0 }}
                    icon={PieChartIcon}
                    color="bg-sky-500"
                />
            </div>

            {/* Stock value row */}
            {(stats?.stock_value > 0 || stats?.stock_selling_value > 0) && (
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="glass-card p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                            <Package size={20} className="text-violet-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Valeur Stock (Coût)</p>
                            <p className="text-white font-black text-xl">{formatCurrency(stats.stock_value)}</p>
                        </div>
                    </div>
                    <div className="glass-card p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <BarChart2 size={20} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Valeur Stock (Vente)</p>
                            <p className="text-white font-black text-xl">{formatCurrency(stats.stock_selling_value)}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Chart + Expenses */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Evolution Chart */}
                    <div className="glass-card p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <TrendingUp size={18} className="text-primary" />
                                Évolution Financière
                                <span className="text-xs text-slate-500 font-normal ml-1">{stats?.period_label}</span>
                            </h3>
                            <div className="flex gap-4 text-xs">
                                <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>Revenus</span>
                                <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>Profit</span>
                            </div>
                        </div>
                        <div className="h-64">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                                        <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false}
                                            tickFormatter={(str) => { if (!str) return ''; const d = new Date(str); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                                        <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false}
                                            tickFormatter={(val) => val == null ? '' : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val)} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                                            labelStyle={{ color: '#64748b', fontSize: '10px' }}
                                        />
                                        <Area type="monotone" dataKey="revenue" name="Revenus" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                                        <Area type="monotone" dataKey="profit" name="Profit" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-600 text-sm">Aucune donnée sur cette période</div>
                            )}
                        </div>
                    </div>

                    {/* Product Performance Table */}
                    {topProducts.length > 0 && (
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <BarChart2 size={18} className="text-primary" />
                                Top Produits — Performance
                            </h3>
                            <div className="space-y-3">
                                {topProducts.map((p: any, i: number) => {
                                    const margin = p.revenue > 0 ? ((p.revenue - p.cogs) / p.revenue) * 100 : 0;
                                    return (
                                        <div key={p.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                            <span className="text-[10px] font-black text-slate-600 w-5 text-right">#{i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-bold text-sm truncate">{p.name}</p>
                                                <p className="text-[10px] text-slate-500">{p.qty_sold} unités vendues</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white font-bold text-sm">{formatCurrency(p.revenue)}</p>
                                                <p className={`text-[10px] font-bold ${margin > 20 ? 'text-emerald-400' : margin > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                    marge {margin.toFixed(0)}%
                                                </p>
                                            </div>
                                            <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${margin > 20 ? 'bg-emerald-500' : margin > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                    style={{ width: `${Math.min(Math.abs(margin), 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Expense History */}
                    <div className="glass-card p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Wallet size={18} className="text-primary" />
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
                                    <div className="absolute top-full right-0 mt-2 w-48 bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl z-50 p-2">
                                        <button onClick={() => { setFilterExpenseCategory('all'); setIsExpenseFilterOpen(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${filterExpenseCategory === 'all' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                            Toutes catégories
                                        </button>
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <button key={cat.value} onClick={() => { setFilterExpenseCategory(cat.value); setIsExpenseFilterOpen(false); }}
                                                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${filterExpenseCategory === cat.value ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {filteredExpenses.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 font-medium">Aucune dépense sur cette période.</div>
                            ) : (
                                filteredExpenses.map((exp: any) => (
                                    <div key={exp.expense_id} className="group flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 text-xs font-black">
                                                {exp.category.substring(0, 3).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-sm">{exp.description || exp.category}</h4>
                                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                                                    {formatDate(exp.created_at)} · {EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.label || exp.category}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-rose-400 font-black text-lg">-{formatCurrency(exp.amount)}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => handleOpenEditExpense(exp)} className="p-2 text-slate-500 hover:text-primary transition-colors">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteExpense(exp.expense_id)} className="p-2 text-slate-500 hover:text-rose-500 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel — tabs */}
                <div className="flex flex-col gap-6">
                    {/* Tab selector */}
                    <div className="glass-card p-1.5 flex gap-1">
                        {([
                            { key: 'profitability', label: 'P&L' },
                            { key: 'payments', label: 'Paiements' },
                            { key: 'losses', label: 'Pertes' },
                            { key: 'products', label: 'Charges' },
                        ] as const).map(tab => (
                            <button key={tab.key} onClick={() => setRightTab(tab.key)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${rightTab === tab.key ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* P&L Tab */}
                    {rightTab === 'profitability' && (
                        <div className="glass-card p-6 flex flex-col items-center">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest self-start mb-6">Rentabilité Opérationnelle</h3>
                            {/* Marge brute circular */}
                            <div className="relative w-44 h-44 mb-6">
                                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ffffff05" strokeWidth="3" />
                                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3B82F6" strokeWidth="3"
                                        strokeDasharray={`${Math.max(0, Math.min(marginPct, 100))} ${100 - Math.max(0, Math.min(marginPct, 100))}`} />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-black text-white">{marginPct.toFixed(0)}%</span>
                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Marge brute</span>
                                </div>
                            </div>
                            <div className="w-full space-y-3">
                                {[
                                    { label: 'Chiffre d\'affaires', value: stats?.revenue || 0, color: 'bg-emerald-500', pct: 100 },
                                    { label: 'Coût des ventes', value: stats?.cogs || 0, color: 'bg-blue-500', pct: stats?.revenue > 0 ? (stats.cogs / stats.revenue) * 100 : 0 },
                                    { label: 'Charges fixes', value: stats?.expenses || 0, color: 'bg-rose-500', pct: stats?.revenue > 0 ? (stats.expenses / stats.revenue) * 100 : 0 },
                                    { label: 'Pertes stock', value: stats?.total_losses || 0, color: 'bg-orange-500', pct: stats?.revenue > 0 ? (stats.total_losses / stats.revenue) * 100 : 0 },
                                ].map(row => (
                                    <div key={row.label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-[10px] font-bold text-slate-400">{row.label}</span>
                                            <span className="text-xs font-black text-white">{formatCurrency(row.value)}</span>
                                        </div>
                                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                            <div className={`${row.color} h-full rounded-full transition-all`} style={{ width: `${Math.min(row.pct, 100)}%` }} />
                                        </div>
                                    </div>
                                ))}
                                <div className="mt-2 p-3 rounded-xl border-2 border-primary/30 bg-primary/5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black text-primary uppercase tracking-widest">Bénéfice Net</span>
                                        <span className={`text-sm font-black ${(stats?.net_profit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {formatCurrency(stats?.net_profit || 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payments Tab */}
                    {rightTab === 'payments' && (
                        <div className="glass-card p-6">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Méthodes de Paiement</h3>
                            <div className="space-y-4">
                                {Object.keys(stats?.payment_breakdown || {}).length === 0 ? (
                                    <p className="text-xs text-slate-500 italic text-center py-4">Aucune vente sur cette période.</p>
                                ) : (
                                    Object.entries(stats?.payment_breakdown || {}).map(([method, amount]: [string, any]) => (
                                        <div key={method} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    {method === 'cash' ? '💵 Espèces' : method === 'credit' ? '💳 Crédit' : method === 'mobile_money' ? '📱 Mobile Money' : method}
                                                </span>
                                                <span className="text-sm font-black text-white">{formatCurrency(amount)}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${method === 'cash' ? 'bg-emerald-500' : method === 'credit' ? 'bg-indigo-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${stats?.revenue > 0 ? (amount / stats.revenue) * 100 : 0}%` }} />
                                            </div>
                                            <p className="text-[10px] text-slate-600 mt-1 text-right">
                                                {stats?.revenue > 0 ? ((amount / stats.revenue) * 100).toFixed(1) : 0}%
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Losses Tab */}
                    {rightTab === 'losses' && (
                        <div className="glass-card p-6">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <TrendingDown size={16} className="text-rose-400" /> Analyse des Pertes
                            </h3>
                            <div className="space-y-3">
                                {Object.keys(stats?.loss_breakdown || {}).length === 0 ? (
                                    <p className="text-xs text-slate-500 italic text-center py-6">Aucune perte enregistrée. 🎉</p>
                                ) : (
                                    Object.entries(stats?.loss_breakdown || {}).map(([reason, amount]: [string, any]) => (
                                        <div key={reason} className="flex justify-between items-center p-3 bg-rose-500/5 rounded-xl border border-rose-500/10">
                                            <span className="text-xs font-bold text-slate-400 truncate flex-1 mr-2">{reason}</span>
                                            <span className="text-sm font-black text-rose-400 shrink-0">-{formatCurrency(amount)}</span>
                                        </div>
                                    ))
                                )}
                                {stats?.total_losses > 0 && (
                                    <div className="pt-3 border-t border-white/5 flex justify-between">
                                        <span className="text-xs font-bold text-slate-500">Total pertes</span>
                                        <span className="text-sm font-black text-rose-400">-{formatCurrency(stats.total_losses)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Charges breakdown Tab */}
                    {rightTab === 'products' && (
                        <div className="glass-card p-6">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Répartition des Charges</h3>
                            <div className="space-y-3">
                                {Object.keys(stats?.expenses_breakdown || {}).length === 0 ? (
                                    <p className="text-xs text-slate-500 italic text-center py-6">Aucune dépense sur cette période.</p>
                                ) : (
                                    Object.entries(stats?.expenses_breakdown || {})
                                        .sort(([, a]: any, [, b]: any) => b - a)
                                        .map(([cat, amount]: [string, any]) => {
                                            const label = EXPENSE_CATEGORIES.find(c => c.value === cat)?.label || cat;
                                            const pct = (stats?.expenses || 0) > 0 ? (amount / stats.expenses) * 100 : 0;
                                            return (
                                                <div key={cat} className="p-3 bg-white/5 rounded-xl border border-white/5">
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <span className="text-xs font-bold text-slate-300">{label}</span>
                                                        <span className="text-xs font-black text-white">{formatCurrency(amount)}</span>
                                                    </div>
                                                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                                        <div className="bg-rose-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <p className="text-[10px] text-slate-600 mt-1 text-right">{pct.toFixed(0)}%</p>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AccountingReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} stats={stats} expenses={expenses} period={period} startDate={startDate} endDate={endDate} />
            <InvoiceModal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} />

            {/* Expense Add/Edit Modal */}
            {showExpenseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowExpenseModal(false)} />
                    <div className="glass-card w-full max-w-md relative z-10 p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">{editingExpense ? 'Modifier la dépense' : 'Nouvelle Dépense'}</h2>
                            <button onClick={() => setShowExpenseModal(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveExpense} className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Catégorie</label>
                                <select
                                    className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 text-sm font-bold"
                                    value={newExpense.category}
                                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                                >
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Montant</label>
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
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowExpenseModal(false)}
                                    className="flex-1 px-4 py-4 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all">
                                    Annuler
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 btn-primary py-4 rounded-xl font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-2">
                                    {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
