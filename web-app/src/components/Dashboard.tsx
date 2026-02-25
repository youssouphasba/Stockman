import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    TrendingUp,
    ShoppingCart,
    Package,
    Clock,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    Sparkles,
    ArrowUpRight,
    AlertTriangle,
    AlertCircle,
    Eye,
    EyeOff,
    Settings,
    ChevronRight,
    PieChart as PieChartIcon,
    X,
    Bell,
} from 'lucide-react';
import {
    LineChart as ReLineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as ReTooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart as RePieChart,
    Pie,
    Cell
} from 'recharts';
import StatCard from './StatCard';
import { dashboard as dashboardApi, ai as aiApi, statistics as statsApi, sales as salesApi } from '../services/api';
import { useDateFormatter } from '../hooks/useDateFormatter';
import AiSummaryModal from './AiSummaryModal';
import DigitalReceiptModal from './DigitalReceiptModal';
import ScreenGuide, { GuideStep } from './ScreenGuide';
import { exportDashboard } from '../utils/ExportService';

interface DashboardProps {
    onNavigate?: (tab: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
    const { t, i18n } = useTranslation();
    const { formatCurrency } = useDateFormatter();
    const [data, setData] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [forecast, setForecast] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<number>(30); // Default 30 days
    const [aiSummary, setAiSummary] = useState<string>('');
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [anomalies, setAnomalies] = useState<any[]>([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const settingsPanelRef = useRef<HTMLDivElement>(null);

    // Visibility Toggles
    const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
        kpi: true,
        forecast: true,
        stock_value: true,
        recent_sales: true,
        reminders: true,
        distribution: true,
        stock_status: true
    });

    useEffect(() => {
        async function fetchDashboard() {
            setLoading(true);
            try {
                // Données essentielles en priorité
                const [res, statsRes] = await Promise.all([
                    dashboardApi.get(),
                    statsApi.get(period),
                ]);
                setData(res);
                setStats(statsRes);
            } catch (err) {
                console.error('Error fetching dashboard', err);
                return;
            } finally {
                setLoading(false);
            }

            // Données IA en arrière-plan (non bloquantes)
            // Ne pas appeler detectAnomalies si aucun produit (évite les faux positifs)
            const hasProducts = (res?.total_products || 0) > 0;
            Promise.allSettled([
                aiApi.dailySummary(i18n.language),
                salesApi.forecast(),
                hasProducts ? aiApi.detectAnomalies(i18n.language) : Promise.resolve({ anomalies: [] }),
            ]).then(([aiRes, forecastRes, anomaliesRes]) => {
                if (aiRes.status === 'fulfilled') setAiSummary(aiRes.value.summary);
                if (forecastRes.status === 'fulfilled') setForecast(forecastRes.value);
                if (anomaliesRes.status === 'fulfilled') setAnomalies(anomaliesRes.value.anomalies || []);
            });
        }
        fetchDashboard();
    }, [period, i18n.language]);

    // Close settings panel on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (settingsPanelRef.current && !settingsPanelRef.current.contains(e.target as Node)) {
                setIsSettingsOpen(false);
            }
        };
        if (isSettingsOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isSettingsOpen]);

    if (loading && !data) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#0F172A]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];

    const toggleSection = (section: string) => {
        setVisibleSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleExportStats = (format: 'excel' | 'pdf' = 'excel') => {
        exportDashboard(data, 'F', period, format);
    };



    const dashboardSteps: GuideStep[] = [
        {
            title: "Bienvenue sur votre Dashboard",
            content: "C'est ici que vous pouvez suivre la santé de votre commerce en un coup d'œil.",
            position: "center"
        },
        {
            title: "Indicateurs Clés (KPI)",
            content: "Suivez votre chiffre d'affaires, le nombre de ventes et la valeur de votre stock en temps réel.",
            targetId: "kpi-stats"
        },
        {
            title: "Prévisions IA",
            content: "Notre intelligence artificielle analyse vos données pour prédire vos ventes futures et vous aider à anticiper.",
            targetId: "sales-forecast"
        },
        {
            title: "Smart Reminders",
            content: "L'IA vous donne des conseils personnalisés et vous rappelle les actions urgentes à effectuer.",
            targetId: "smart-reminders"
        }
    ];

    return (
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0F172A] animate-in fade-in duration-700">
            <ScreenGuide guideKey="dashboard_tour" steps={dashboardSteps} />
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">{t('dashboard.title')}</h1>
                    <p className="text-slate-400 font-medium">{t('dashboard.sub_greeting')}</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    {anomalies.length > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 animate-pulse">
                            <AlertTriangle size={18} />
                            <span className="text-xs font-black uppercase tracking-widest">{anomalies.length} Anomalies détectées</span>
                        </div>
                    )}

                    {/* Settings panel */}
                    <div className="relative" ref={settingsPanelRef}>
                        <button
                            onClick={() => setIsSettingsOpen(prev => !prev)}
                            className={`glass-card p-2 transition-all outline-none ${isSettingsOpen ? 'text-primary border-primary/30' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Settings size={20} />
                        </button>
                        {isSettingsOpen && (
                            <div className="absolute top-full right-0 mt-2 w-56 bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl z-50 p-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Sections visibles</span>
                                    <button onClick={() => setIsSettingsOpen(false)} className="text-slate-500 hover:text-white">
                                        <X size={14} />
                                    </button>
                                </div>
                                {Object.entries(visibleSections).map(([key, visible]) => (
                                    <label key={key} className="flex items-center justify-between py-2 cursor-pointer group">
                                        <span className="text-sm text-slate-300 group-hover:text-white capitalize">{key.replace('_', ' ')}</span>
                                        <div
                                            onClick={() => toggleSection(key)}
                                            className={`w-8 h-4 rounded-full transition-all cursor-pointer ${visible ? 'bg-primary' : 'bg-white/10'}`}
                                        >
                                            <div className={`w-3 h-3 rounded-full bg-white shadow mt-0.5 transition-all ${visible ? 'ml-4.5 translate-x-4' : 'ml-0.5'}`} />
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <select
                        value={period}
                        onChange={(e) => setPeriod(Number(e.target.value))}
                        className="glass-card bg-white/5 border-white/10 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-primary/50 font-bold"
                    >
                        <option value={1}>{t('common.today')}</option>
                        <option value={7}>{t('common.last_7_days')}</option>
                        <option value={30}>{t('common.last_30_days')}</option>
                        <option value={90}>{t('common.last_90_days')}</option>
                    </select>
                    <div className="flex gap-1">
                        <button
                            onClick={() => handleExportStats('excel')}
                            className="glass-card px-3 py-2 text-sm font-black text-emerald-400 hover:bg-white/10 transition-colors border border-white/5 flex items-center gap-1.5"
                            title="Exporter Excel"
                        >
                            <ChevronDown size={14} />
                            XLS
                        </button>
                        <button
                            onClick={() => handleExportStats('pdf')}
                            className="glass-card px-3 py-2 text-sm font-black text-red-400 hover:bg-white/10 transition-colors border border-white/5"
                            title="Exporter PDF"
                        >
                            PDF
                        </button>
                    </div>
                    <button
                        onClick={() => onNavigate?.('pos')}
                        className="btn-primary py-2 px-6 shadow-lg shadow-primary/20 font-black uppercase tracking-widest"
                    >
                        + {t('dashboard.today_sales')}
                    </button>
                </div>
            </header>

            {/* KPI Stats */}
            {visibleSections.kpi && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <StatCard
                        label={t('dashboard.today_revenue')}
                        value={formatCurrency(data?.today_revenue || 0)}
                        icon={TrendingUp}
                        color="bg-emerald-500"
                    />
                    <StatCard
                        label={t('dashboard.today_sales')}
                        value={data?.today_sales_count || 0}
                        icon={ShoppingCart}
                        color="bg-blue-500"
                    />
                    <StatCard
                        label={t('dashboard.stock_value')}
                        value={formatCurrency(data?.total_stock_value || 0)}
                        icon={Package}
                        color="bg-amber-500"
                    />
                    <StatCard
                        label={t('dashboard.month_revenue')}
                        value={formatCurrency(data?.month_revenue || 0)}
                        icon={TrendingUp}
                        color="bg-purple-500"
                    />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Advanced Analytics Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Sales Forecast (Mobile Parity) */}
                    {visibleSections.forecast && forecast && (
                        <div className="glass-card p-6 min-h-[350px] flex flex-col bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/10">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                                    <Sparkles size={20} className="text-primary" />
                                    Prévisions de Ventes (IA)
                                </h3>
                                <div className="text-[10px] text-primary font-black uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">Confidence: 94%</div>
                            </div>
                            <div className="flex-1 w-full min-h-[250px]">
                                {(!forecast?.daily_forecast || forecast.daily_forecast.length === 0) ? (
                                    <div className="h-full flex items-center justify-center text-slate-500 text-sm flex-col gap-2">
                                        <Package size={32} className="text-slate-700" />
                                        <p>Pas assez de données de ventes pour générer une prévision</p>
                                    </div>
                                ) : (
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <AreaChart data={forecast.daily_forecast.filter((d: any) => d?.date != null)}>
                                        <defs>
                                            <linearGradient id="colorForecastReal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorForecastPred" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#475569"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(str) => str ? str.split('-').slice(1).reverse().join('/') : ''}
                                        />
                                        <YAxis
                                            stroke="#475569"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val)}
                                        />
                                        <ReTooltip
                                            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                                            labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '10px' }}
                                            formatter={(value: any, _: any, props: any) => {
                                                const isPred = props?.payload?.is_predicted;
                                                return [`${Number(value).toLocaleString('fr-FR')}`, isPred ? 'Prévu' : 'Réel'];
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="expected_revenue"
                                            stroke="#3B82F6"
                                            strokeWidth={2.5}
                                            fillOpacity={1}
                                            fill="url(#colorForecastReal)"
                                            dot={false}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Stock Value Evolution (Mobile Parity) */}
                    {visibleSections.stock_value && (
                        <div className="glass-card p-6 min-h-[400px] flex flex-col">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                                    <Package size={20} className="text-primary" />
                                    Évolution de la Valeur du Stock
                                </h3>
                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest bg-white/5 px-2 py-1 rounded">Historique {period}J</div>
                            </div>
                            <div className="flex-1 w-full min-h-[300px]">
                                {(!stats?.stock_value_history || stats.stock_value_history.length === 0 || stats.stock_value_history.every((d: any) => d.value === 0)) ? (
                                    <div className="h-full flex items-center justify-center text-slate-500 text-sm flex-col gap-2">
                                        <Package size={32} className="text-slate-700" />
                                        <p>Aucune donnée de stock disponible pour cette période</p>
                                    </div>
                                ) : (
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <AreaChart data={stats.stock_value_history.filter((d: any) => d?.date != null)}>
                                        <defs>
                                            <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#475569"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(str) => str ? str.split('-').slice(1).reverse().join('/') : ''}
                                        />
                                        <YAxis
                                            stroke="#475569"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val)}
                                        />
                                        <ReTooltip
                                            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                                            labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '10px' }}
                                            formatter={(value: any) => [`${Number(value).toLocaleString('fr-FR')}`, 'Valeur stock']}
                                        />
                                        <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorStock)" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Recent Sales Table */}
                    {visibleSections.recent_sales && (
                        <div className="glass-card p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">{t('dashboard.recent_sales')}</h3>
                                <button
                                    onClick={() => onNavigate?.('pos')}
                                    className="text-[10px] text-primary font-black uppercase tracking-widest hover:underline"
                                >
                                    {t('dashboard.see_more')}
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                            <th className="pb-4">Réf.</th>
                                            <th className="pb-4">Articles</th>
                                            <th className="pb-4">Montant</th>
                                            <th className="pb-4">Heure</th>
                                            <th className="pb-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {(Array.isArray(data?.recent_sales) ? data.recent_sales : []).map((sale: any) => (
                                            <tr key={sale.sale_id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                <td className="py-4 font-mono text-slate-400">#{sale.sale_id.slice(-4).toUpperCase()}</td>
                                                <td className="py-4 text-white font-bold tracking-tight">{sale.items?.length || 0} art.</td>
                                                <td className="py-4 font-black text-primary">{formatCurrency(sale.total_amount)}</td>
                                                <td className="py-4 text-slate-400 flex items-center gap-2">
                                                    <Clock size={12} />
                                                    {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-4 text-right">
                                                    <button
                                                        onClick={() => { setSelectedSale(sale); setIsReceiptModalOpen(true); }}
                                                        className="p-2 rounded-lg hover:bg-primary/10 text-slate-400 hover:text-primary transition-all"
                                                        title="Voir le reçu"
                                                    >
                                                        <ArrowUpRight size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* AI & Quick Insights Column */}
                <div className="flex flex-col gap-8">
                    {/* Smart Reminders (Mobile Parity) */}
                    {visibleSections.reminders && (() => {
                        // Build real data-driven reminders
                        const reminders: { icon: React.ReactNode; label: string; value: string; color: string; bg: string; border: string }[] = [];

                        if ((data?.out_of_stock_count || 0) > 0) reminders.push({
                            icon: <AlertTriangle size={15} />,
                            label: 'Rupture de stock',
                            value: `${data.out_of_stock_count} produit${data.out_of_stock_count > 1 ? 's' : ''}`,
                            color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20'
                        });
                        if ((data?.low_stock_count || 0) > 0) reminders.push({
                            icon: <AlertCircle size={15} />,
                            label: 'Stock faible',
                            value: `${data.low_stock_count} produit${data.low_stock_count > 1 ? 's' : ''} sous le seuil`,
                            color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20'
                        });
                        if ((data?.unread_alerts || 0) > 0) reminders.push({
                            icon: <Bell size={15} />,
                            label: 'Alertes non lues',
                            value: `${data.unread_alerts} alerte${data.unread_alerts > 1 ? 's' : ''}`,
                            color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20'
                        });
                        if ((data?.overstock_count || 0) > 0) reminders.push({
                            icon: <Package size={15} />,
                            label: 'Surstock détecté',
                            value: `${data.overstock_count} produit${data.overstock_count > 1 ? 's' : ''} en excès`,
                            color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20'
                        });
                        if ((data?.today_sales_count || 0) > 0) reminders.push({
                            icon: <ShoppingCart size={15} />,
                            label: "Ventes aujourd'hui",
                            value: `${data.today_sales_count} vente${data.today_sales_count > 1 ? 's' : ''}`,
                            color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20'
                        });

                        return (
                            <div className="glass-card p-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-3xl -mr-12 -mt-12"></div>
                                <div className="flex items-center gap-3 mb-5 relative z-10">
                                    <Sparkles className="text-primary animate-pulse" size={22} />
                                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">Smart Reminders</h3>
                                </div>

                                <div className="space-y-2 relative z-10">
                                    {reminders.length === 0 ? (
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                            <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                                            <p className="text-sm text-emerald-300 font-semibold">Tout est à jour — aucun problème détecté</p>
                                        </div>
                                    ) : reminders.map((r, idx) => (
                                        <div key={idx} className={`flex items-center justify-between gap-3 p-3 rounded-lg ${r.bg} border ${r.border}`}>
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className={`shrink-0 ${r.color}`}>{r.icon}</span>
                                                <span className={`text-xs font-bold ${r.color} uppercase tracking-wide`}>{r.label}</span>
                                            </div>
                                            <span className="text-white text-xs font-black shrink-0">{r.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* AI summary as a separate sub-section */}
                                {aiSummary && (
                                    <div className="mt-4 pt-4 border-t border-white/5 relative z-10">
                                        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">{aiSummary}</p>
                                        <button
                                            onClick={() => setIsAiModalOpen(true)}
                                            className="mt-3 text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all outline-none"
                                        >
                                            Voir le rapport complet <ChevronRight size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Category Distribution (Mobile Parity) */}
                    {visibleSections.distribution && (
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2 uppercase tracking-tighter">
                                <PieChartIcon size={18} className="text-primary" />
                                Répartition des Stocks
                            </h3>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={Array.isArray(stats?.stock_by_category) ? stats.stock_by_category : []}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {(Array.isArray(stats?.stock_by_category) ? stats.stock_by_category : []).map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <ReTooltip />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                {(Array.isArray(stats?.stock_by_category) ? stats.stock_by_category : []).slice(0, 4).map((cat: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest truncate">{cat.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Stock Status List */}
                    {visibleSections.stock_status && (
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2 uppercase tracking-tighter">
                                <AlertTriangle size={18} className="text-amber-500" />
                                {t('dashboard.stock_status')}
                            </h3>
                            <div className="flex flex-col gap-3">
                                {/* Out of stock summary row */}
                                <div className="flex justify-between items-center p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                    <span className="text-rose-400 text-xs font-black uppercase tracking-widest">{t('dashboard.out_of_stock')}</span>
                                    <span className="text-xl font-black text-white">{data?.out_of_stock_count || 0}</span>
                                </div>
                                {/* Out-of-stock products */}
                                {(data?.critical_products || []).filter((p: any) => p.quantity === 0).map((p: any) => (
                                    <div key={p.product_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-white text-sm font-semibold truncate">{p.name}</span>
                                            {p.sku && <span className="text-slate-500 text-[10px] font-mono">{p.sku}</span>}
                                        </div>
                                        <span className="text-rose-400 text-sm font-black shrink-0 ml-2">0 {p.unit || 'pcs'}</span>
                                    </div>
                                ))}

                                {/* Low stock summary row */}
                                <div className="flex justify-between items-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mt-1">
                                    <span className="text-amber-400 text-xs font-black uppercase tracking-widest">{t('dashboard.low_stock')}</span>
                                    <span className="text-xl font-black text-white">{data?.low_stock_count || 0}</span>
                                </div>
                                {/* Low-stock products */}
                                {(data?.critical_products || []).filter((p: any) => p.quantity > 0).map((p: any) => (
                                    <div key={p.product_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-white text-sm font-semibold truncate">{p.name}</span>
                                            {p.sku && <span className="text-slate-500 text-[10px] font-mono">{p.sku}</span>}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                            <span className="text-amber-400 text-sm font-black">{p.quantity}</span>
                                            <span className="text-slate-500 text-xs">{p.unit || 'pcs'}</span>
                                            {p.min_stock > 0 && (
                                                <span className="text-slate-600 text-[10px]">/ min {p.min_stock}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Overstock if any */}
                                {(data?.overstock_products || []).length > 0 && (
                                    <>
                                        <div className="flex justify-between items-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 mt-1">
                                            <span className="text-blue-400 text-xs font-black uppercase tracking-widest">Surstock</span>
                                            <span className="text-xl font-black text-white">{data?.overstock_count || 0}</span>
                                        </div>
                                        {(data?.overstock_products || []).map((p: any) => (
                                            <div key={p.product_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-white text-sm font-semibold truncate">{p.name}</span>
                                                    {p.sku && <span className="text-slate-500 text-[10px] font-mono">{p.sku}</span>}
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                    <span className="text-blue-400 text-sm font-black">{p.quantity}</span>
                                                    <span className="text-slate-500 text-xs">{p.unit || 'pcs'}</span>
                                                    {p.max_stock > 0 && (
                                                        <span className="text-slate-600 text-[10px]">/ max {p.max_stock}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AiSummaryModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                summary={aiSummary}
                data={data}
            />

            <DigitalReceiptModal
                isOpen={isReceiptModalOpen}
                onClose={() => { setIsReceiptModalOpen(false); setSelectedSale(null); }}
                sale={selectedSale}
            />
        </div>
    );
}
