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
    Download,
    Activity,
    Target,
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
import { dashboard as dashboardApi, ai as aiApi, statistics as statsApi, sales as salesApi, restaurant as restaurantApi, UserFeatures } from '../services/api';
import { useDateFormatter } from '../hooks/useDateFormatter';
import AiSummaryModal from './AiSummaryModal';
import DigitalReceiptModal from './DigitalReceiptModal';
import ScreenGuide, { GuideStep } from './ScreenGuide';
import { exportDashboard } from '../utils/ExportService';

interface DashboardProps {
    onNavigate?: (tab: string) => void;
    features?: UserFeatures | null;
}

export default function Dashboard({ onNavigate, features }: DashboardProps) {
    const { t, i18n } = useTranslation();
    const { formatCurrency } = useDateFormatter();
    const [data, setData] = useState<any>(null);
    const [restaurantStats, setRestaurantStats] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [forecast, setForecast] = useState<any>(null);
    const [showForecastTable, setShowForecastTable] = useState(false); // Added state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const isRestaurant = features?.is_restaurant || ['restaurant', 'traiteur', 'boulangerie'].includes(features?.sector || '');
    const [period, setPeriod] = useState<number>(30); // Default 30 days
    const [aiSummary, setAiSummary] = useState<string>('');
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [anomalies, setAnomalies] = useState<any[]>([]);
    const [healthScore, setHealthScore] = useState<any>(null);
    const [prediction, setPrediction] = useState<any>(null);
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
            setError(null);
            let dashboardRes: any = null;
            let partialError = false;
            try {
                // Données essentielles en priorité
                const [dashboardResult, statsResult, restaurantResult] = await Promise.allSettled([
                    dashboardApi.get(),
                    statsApi.get(period),
                    isRestaurant ? restaurantApi.stats() : Promise.resolve(null),
                ]);
                if (dashboardResult.status !== 'fulfilled') {
                    throw dashboardResult.reason;
                }
                dashboardRes = dashboardResult.value;
                setData(dashboardRes);

                if (statsResult.status === 'fulfilled') {
                    setStats(statsResult.value);
                } else {
                    setStats(null);
                    partialError = true;
                    console.warn('Dashboard stats unavailable', statsResult.reason);
                }

                if (isRestaurant) {
                    if (restaurantResult.status === 'fulfilled') {
                        setRestaurantStats(restaurantResult.value);
                    } else {
                        setRestaurantStats(null);
                        partialError = true;
                        console.warn('Restaurant dashboard stats unavailable', restaurantResult.reason);
                    }
                } else {
                    setRestaurantStats(null);
                }
                if (partialError) {
                    setError(t('dashboard.partial_load_error', { defaultValue: 'Certaines données secondaires du tableau de bord sont temporairement indisponibles.' }));
                }
            } catch (err) {
                console.error('Error fetching dashboard', err);
                setError(t('dashboard.load_error', { defaultValue: 'Impossible de charger le tableau de bord pour le moment.' }));
                return;
            } finally {
                setLoading(false);
            }

            // Données IA en arrière-plan (non bloquantes)
            // Ne pas appeler detectAnomalies si aucun produit (évite les faux positifs)
            const hasProducts = (dashboardRes?.total_products || 0) > 0;
            Promise.allSettled([
                aiApi.dailySummary(i18n.language),
                salesApi.forecast(),
                hasProducts ? aiApi.detectAnomalies(i18n.language) : Promise.resolve({ anomalies: [] }),
                aiApi.businessHealthScore(),
                aiApi.dashboardPrediction(),
            ]).then(([aiRes, forecastRes, anomaliesRes, healthRes, predictionRes]) => {
                if (aiRes.status === 'fulfilled') setAiSummary(aiRes.value.summary);
                if (forecastRes.status === 'fulfilled') setForecast(forecastRes.value);
                if (anomaliesRes.status === 'fulfilled') setAnomalies(anomaliesRes.value.anomalies || []);
                if (healthRes.status === 'fulfilled') setHealthScore(healthRes.value);
                if (predictionRes.status === 'fulfilled') setPrediction(predictionRes.value);
            });
        }
        void fetchDashboard();
    }, [period, i18n.language, isRestaurant, reloadKey]);

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

    if (loading && !data && !error) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#0F172A]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#0F172A] px-6">
                <div className="glass-card max-w-md w-full p-8 text-center border border-rose-500/20">
                    <AlertCircle size={28} className="mx-auto mb-4 text-rose-400" />
                    <h2 className="text-xl font-black text-white mb-2">
                        {t('dashboard.load_error_title', { defaultValue: 'Chargement impossible' })}
                    </h2>
                    <p className="text-sm text-slate-400 leading-6 mb-6">{error}</p>
                    <button
                        onClick={() => setReloadKey((value) => value + 1)}
                        className="btn-primary px-6 py-3"
                    >
                        {t('common.retry', { defaultValue: 'Réessayer' })}
                    </button>
                </div>
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



    const dashboardSteps: GuideStep[] = isRestaurant ? [
        {
            title: t('guide.dashboard.role_title', "Rôle du tableau de bord"),
            content: t('guide.dashboard.role_content', "Le tableau de bord restaurant est votre vue d'ensemble en temps réel. Il regroupe le chiffre d'affaires du jour, les couverts servis, le ticket moyen et l'occupation des tables. Consultez-le en début de service pour anticiper la charge."),
        },
        {
            title: t('guide.dashboard.restaurant_kpi_title', "Cartes KPI du service"),
            content: t('guide.dashboard.restaurant_kpi_content', "Les 4 cartes en haut affichent les indicateurs clés du service en cours. Elles se mettent à jour automatiquement."),
            details: [
                { label: t('guide.dashboard.card_today_revenue', "CA du jour"), description: t('guide.dashboard.card_today_revenue_desc', "Total des ventes encaissées aujourd'hui."), type: 'card' },
                { label: t('guide.dashboard.card_covers', "Couverts servis"), description: t('guide.dashboard.card_covers_desc', "Nombre de clients servis depuis l'ouverture."), type: 'card' },
                { label: t('guide.dashboard.card_avg_ticket', "Ticket moyen"), description: t('guide.dashboard.card_avg_ticket_desc', "Montant moyen dépensé par client."), type: 'card' },
                { label: t('guide.dashboard.card_tables', "Tables occupées"), description: t('guide.dashboard.card_tables_desc', "Ratio tables occupées / total + commandes en cuisine."), type: 'card' },
            ],
        },
        {
            title: t('guide.dashboard.restaurant_hourly_title', "Graphique CA par heure"),
            content: t('guide.dashboard.restaurant_hourly_content', "Courbe du chiffre d'affaires heure par heure. Identifiez les pics de service (rush du midi, du soir) pour mieux organiser votre équipe. Survolez la courbe pour voir le montant exact par tranche horaire."),
        },
        {
            title: t('guide.dashboard.restaurant_dishes_title', "Top 5 plats & Réservations"),
            content: t('guide.dashboard.restaurant_dishes_content', "En colonne droite : les 5 plats les plus vendus du jour et les réservations à venir avec le nom du client, le nombre de couverts et le statut (confirmé / arrivé)."),
        },
    ] : [
        {
            title: t('guide.dashboard.role_title', "Rôle du tableau de bord"),
            content: t('guide.dashboard.role_content_commerce', "Le tableau de bord est la première page que vous voyez après connexion. Il donne une vue d'ensemble de la santé de votre commerce : chiffre d'affaires, ventes, stock et alertes. Toutes les données sont filtrées par la boutique active sélectionnée dans la barre latérale."),
        },
        {
            title: t('guide.dashboard.header_title', "Barre d'en-tête"),
            content: t('guide.dashboard.header_content', "La barre en haut du tableau de bord contient les contrôles principaux pour personnaliser votre vue et agir rapidement."),
            details: [
                { label: t('guide.dashboard.btn_anomalies', "Badge anomalies"), description: t('guide.dashboard.btn_anomalies_desc', "S'affiche en rouge clignotant si l'IA a détecté des anomalies (écarts de stock, ventes inhabituelles). Cliquez pour les consulter dans le rapport IA."), type: 'info' },
                { label: t('guide.dashboard.btn_settings', "Bouton ⚙️ (paramètres d'affichage)"), description: t('guide.dashboard.btn_settings_desc', "Ouvre un panneau pour masquer ou afficher les sections du tableau de bord (KPI, prévisions, graphique stock, ventes récentes, rappels, distribution, statut stock)."), type: 'button' },
                { label: t('guide.dashboard.filter_period', "Sélecteur de période"), description: t('guide.dashboard.filter_period_desc', "Filtrez les données par : Aujourd'hui, 7 jours, 30 jours ou 90 jours. Change les graphiques, les KPI et les statistiques affichées."), type: 'filter' },
                { label: t('guide.dashboard.btn_export_xls', "Bouton XLS"), description: t('guide.dashboard.btn_export_xls_desc', "Exporte les données du tableau de bord au format Excel. Utile pour le reporting ou la comptabilité."), type: 'button' },
                { label: t('guide.dashboard.btn_export_pdf', "Bouton PDF"), description: t('guide.dashboard.btn_export_pdf_desc', "Exporte un résumé visuel en PDF. Pratique pour partager avec un associé ou imprimer."), type: 'button' },
                { label: t('guide.dashboard.btn_new_sale', "Bouton + Vente"), description: t('guide.dashboard.btn_new_sale_desc', "Ouvre directement le terminal de vente (POS) pour enregistrer une nouvelle vente."), type: 'button' },
            ],
        },
        {
            title: t('guide.dashboard.kpi_title', "Cartes KPI"),
            content: t('guide.dashboard.kpi_content', "Les 4 cartes colorées en haut affichent les indicateurs clés de performance. Elles se mettent à jour à chaque changement de période."),
            details: [
                { label: t('guide.dashboard.card_revenue', "CA du jour"), description: t('guide.dashboard.card_revenue_desc', "Chiffre d'affaires encaissé aujourd'hui (toutes méthodes de paiement confondues)."), type: 'card' },
                { label: t('guide.dashboard.card_sales_count', "Ventes du jour"), description: t('guide.dashboard.card_sales_count_desc', "Nombre total de transactions effectuées aujourd'hui."), type: 'card' },
                { label: t('guide.dashboard.card_stock_value', "Valeur du stock"), description: t('guide.dashboard.card_stock_value_desc', "Valeur totale de votre inventaire au prix d'achat. Un stock élevé immobilise de la trésorerie."), type: 'card' },
                { label: t('guide.dashboard.card_month_revenue', "CA du mois"), description: t('guide.dashboard.card_month_revenue_desc', "Chiffre d'affaires cumulé sur le mois en cours."), type: 'card' },
            ],
        },
        {
            title: t('guide.dashboard.forecast_title', "Prévisions IA"),
            content: t('guide.dashboard.forecast_content', "Ce graphique montre les prévisions de ventes générées par l'intelligence artificielle à partir de votre historique. La courbe bleue représente le chiffre d'affaires attendu jour par jour. Le badge en haut à droite indique le niveau de confiance du modèle."),
            details: [
                { label: t('guide.dashboard.forecast_chart', "Graphique prévisionnel"), description: t('guide.dashboard.forecast_chart_desc', "Survolez un point pour voir le montant prévu. Les données réelles et les prédictions sont différenciées."), type: 'info' },
                { label: t('guide.dashboard.forecast_table', "Tableau prévisions par produit"), description: t('guide.dashboard.forecast_table_desc', "Cliquez sur 'Prévisions par produit' pour voir le détail : stock actuel, vitesse de vente/jour, prévision à 7j et 30j, tendance (hausse/baisse) et niveau de risque."), type: 'button' },
                { label: t('guide.dashboard.forecast_export', "Exporter CSV prévisions"), description: t('guide.dashboard.forecast_export_desc', "Dans le tableau de prévisions, cliquez 'Exporter CSV' pour télécharger les données complètes de tous vos produits."), type: 'button' },
                { label: t('guide.dashboard.forecast_tip', "Astuce"), description: t('guide.dashboard.forecast_tip_desc', "Plus vous avez d'historique de ventes, plus les prévisions sont précises. Après 30 jours de données, les prévisions deviennent fiables."), type: 'tip' },
            ],
        },
        {
            title: t('guide.dashboard.stock_evolution_title', "Évolution de la valeur du stock"),
            content: t('guide.dashboard.stock_evolution_content', "Graphique en courbe montrant comment la valeur de votre stock évolue dans le temps sur la période sélectionnée. Une courbe descendante constante peut indiquer un problème de réapprovisionnement. Une courbe montante peut signaler un surstock."),
        },
        {
            title: t('guide.dashboard.recent_sales_title', "Ventes récentes"),
            content: t('guide.dashboard.recent_sales_content', "Tableau listant les dernières transactions enregistrées avec la référence, le nombre d'articles, le montant et l'heure."),
            details: [
                { label: t('guide.dashboard.sale_ref', "Référence (#)"), description: t('guide.dashboard.sale_ref_desc', "Identifiant unique de la vente (4 derniers caractères)."), type: 'info' },
                { label: t('guide.dashboard.sale_receipt', "Bouton flèche (↗)"), description: t('guide.dashboard.sale_receipt_desc', "Ouvre le reçu numérique de la vente avec le détail des articles, le mode de paiement et la possibilité de le partager."), type: 'button' },
                { label: t('guide.dashboard.sale_see_more', "Voir plus"), description: t('guide.dashboard.sale_see_more_desc', "Lien vers le terminal POS pour consulter l'historique complet des ventes."), type: 'button' },
            ],
        },
        {
            title: t('guide.dashboard.reminders_title', "Rappels intelligents & IA"),
            content: t('guide.dashboard.reminders_content', "Cette section combine deux fonctions : les rappels automatiques basés sur vos données et le résumé IA quotidien."),
            details: [
                { label: t('guide.dashboard.reminder_oos', "Rupture de stock"), description: t('guide.dashboard.reminder_oos_desc', "Nombre de produits à stock zéro. Action urgente : réapprovisionnez ces produits pour ne pas perdre de ventes."), type: 'info' },
                { label: t('guide.dashboard.reminder_low', "Stock faible"), description: t('guide.dashboard.reminder_low_desc', "Produits dont la quantité est en dessous du seuil minimum défini."), type: 'info' },
                { label: t('guide.dashboard.reminder_alerts', "Alertes non lues"), description: t('guide.dashboard.reminder_alerts_desc', "Nombre d'alertes système non encore consultées."), type: 'info' },
                { label: t('guide.dashboard.reminder_overstock', "Surstock"), description: t('guide.dashboard.reminder_overstock_desc', "Produits dont la quantité dépasse le seuil maximum. Risque d'immobilisation de trésorerie."), type: 'info' },
                { label: t('guide.dashboard.reminder_ai', "Résumé IA quotidien"), description: t('guide.dashboard.reminder_ai_desc', "L'IA analyse vos données et produit un résumé en langage naturel. Cliquez 'Voir le rapport complet' pour le détail."), type: 'button' },
            ],
        },
        {
            title: t('guide.dashboard.distribution_title', "Distribution par catégorie"),
            content: t('guide.dashboard.distribution_content', "Graphique en camembert (donut) montrant la répartition de votre stock par catégorie de produits. Les 4 premières catégories sont affichées en légende. Utile pour identifier si votre stock est trop concentré sur une seule catégorie."),
        },
        {
            title: t('guide.dashboard.stock_status_title', "Statut du stock"),
            content: t('guide.dashboard.stock_status_content', "Liste détaillée des produits en rupture, en stock faible et en surstock avec le nom, le SKU, la quantité actuelle et le seuil configuré."),
            details: [
                { label: t('guide.dashboard.status_oos', "Section rouge — Rupture"), description: t('guide.dashboard.status_oos_desc', "Produits à quantité 0. Chaque ligne affiche le nom et l'unité."), type: 'card' },
                { label: t('guide.dashboard.status_low', "Section orange — Stock faible"), description: t('guide.dashboard.status_low_desc', "Produits sous le seuil minimum. Affiche la quantité actuelle et le minimum configuré."), type: 'card' },
                { label: t('guide.dashboard.status_over', "Section bleue — Surstock"), description: t('guide.dashboard.status_over_desc', "Produits au-dessus du seuil maximum. Affiche la quantité actuelle et le maximum configuré."), type: 'card' },
                { label: t('guide.dashboard.status_tip', "Astuce"), description: t('guide.dashboard.status_tip_desc', "Configurez les seuils min/max de chaque produit dans l'inventaire pour que ces alertes soient pertinentes."), type: 'tip' },
            ],
        },
    ];

    return (
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar bg-[#0F172A] animate-in fade-in duration-700">
            <ScreenGuide guideKey="dashboard_tour" steps={dashboardSteps} />
            {error && data && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-400" />
                    <div className="flex-1">
                        <p className="font-bold text-amber-300 mb-1">
                            {t('dashboard.partial_load_title', { defaultValue: 'Certaines données n’ont pas pu être chargées' })}
                        </p>
                        <p className="text-amber-100/90">{error}</p>
                    </div>
                    <button
                        onClick={() => setReloadKey((value) => value + 1)}
                        className="rounded-xl border border-amber-400/30 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-200 hover:bg-amber-500/10"
                    >
                        {t('common.retry', { defaultValue: 'Réessayer' })}
                    </button>
                </div>
            )}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">{t('dashboard.title')}</h1>
                    <p className="text-slate-400 font-medium">{t('dashboard.sub_greeting')}</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    {anomalies.length > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 animate-pulse">
                            <AlertTriangle size={18} />
                            <span className="text-xs font-black uppercase tracking-widest">{t('dashboard.anomalies_detected', { count: anomalies.length })}</span>
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
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">{t('dashboard.visible_sections')}</span>
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
                        {isRestaurant ? '+ Commande' : `+ ${t('dashboard.today_sales')}`}
                    </button>
                </div>
            </header>

            {/* KPI Stats */}
            {visibleSections.kpi && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {isRestaurant ? (<>
                        <StatCard
                            label="CA du jour"
                            value={formatCurrency(restaurantStats?.today_revenue || 0)}
                            icon={TrendingUp}
                            color="bg-emerald-500"
                        />
                        <StatCard
                            label="Couverts servis"
                            value={restaurantStats?.today_covers || 0}
                            icon={ShoppingCart}
                            color="bg-blue-500"
                        />
                        <StatCard
                            label="Ticket moyen"
                            value={formatCurrency(restaurantStats?.avg_ticket || 0)}
                            icon={TrendingUp}
                            color="bg-amber-500"
                        />
                        <StatCard
                            label={`Tables occupées (${restaurantStats?.tables_occupied || 0}/${restaurantStats?.tables_total || 0})`}
                            value={restaurantStats?.kitchen_pending ? `🍳 ${restaurantStats.kitchen_pending} en cuisine` : 'Cuisine vide'}
                            icon={Package}
                            color="bg-purple-500"
                        />
                    </>) : (<>
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
                    </>)}
                </div>
            )}

            {/* Business Health Score + Monthly Prediction */}
            {(healthScore || prediction) && (
                <div className={`grid gap-6 mb-10 ${healthScore && prediction ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-1'}`}>
                    {/* Health Score Gauge */}
                    {healthScore && (
                        <div className="glass-card p-6 flex flex-col items-center bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/10">
                            <div className="flex items-center gap-2 mb-4 self-start">
                                <Activity size={18} className="text-emerald-400" />
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">
                                    {t('dashboard.health_score', 'Santé business')}
                                </h3>
                            </div>
                            {/* Circular gauge */}
                            <div className="relative w-36 h-36 mb-4">
                                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                                    <circle
                                        cx="60" cy="60" r="52" fill="none"
                                        stroke={healthScore.color === 'green' ? '#10B981' : healthScore.color === 'orange' ? '#F59E0B' : '#EF4444'}
                                        strokeWidth="10"
                                        strokeLinecap="round"
                                        strokeDasharray={`${(healthScore.score / 100) * 327} 327`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-3xl font-black ${healthScore.color === 'green' ? 'text-emerald-400' : healthScore.color === 'orange' ? 'text-amber-400' : 'text-rose-400'}`}>
                                        {healthScore.score}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">/100</span>
                                </div>
                            </div>
                            {/* Component breakdown */}
                            <div className="w-full space-y-2">
                                {[
                                    { key: 'margin', label: t('dashboard.health_margin', 'Marge'), max: 30 },
                                    { key: 'rotation', label: t('dashboard.health_rotation', 'Rotation'), max: 20 },
                                    { key: 'debt_recovery', label: t('dashboard.health_debt', 'Recouvrement'), max: 20 },
                                    { key: 'trend', label: t('dashboard.health_trend', 'Tendance CA'), max: 30 },
                                ].map(({ key, label, max }) => {
                                    const val = healthScore.components?.[key] ?? 0;
                                    const pct = max > 0 ? (val / max) * 100 : 0;
                                    return (
                                        <div key={key} className="flex items-center gap-3">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider w-24 truncate">{label}</span>
                                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-300 font-bold w-10 text-right">{val.toFixed(0)}/{max}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Monthly Revenue Prediction */}
                    {prediction && (
                        <div className="glass-card p-6 flex flex-col bg-gradient-to-br from-violet-500/5 to-transparent border-violet-500/10">
                            <div className="flex items-center gap-2 mb-4">
                                <Target size={18} className="text-violet-400" />
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">
                                    {t('dashboard.monthly_prediction', 'Projection mensuelle')}
                                </h3>
                            </div>
                            <div className="flex-1 flex flex-col justify-center items-center">
                                <span className="text-3xl font-black text-white mb-1">
                                    {formatCurrency(prediction.projected_revenue)}
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">
                                    {t('dashboard.estimated_end_month', 'Estimé fin de mois')}
                                </span>
                                {/* Progress bar current vs projected */}
                                <div className="w-full mb-3">
                                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                        <span>{t('dashboard.current', 'Actuel')}: {formatCurrency(prediction.current_revenue)}</span>
                                        <span>J{prediction.days_elapsed}/{prediction.days_in_month}</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-violet-500 to-primary rounded-full"
                                            style={{ width: `${Math.min((prediction.current_revenue / prediction.projected_revenue) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                                {/* Delta vs last month */}
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                                    prediction.delta_vs_last_month >= 0
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                    <TrendingUp size={14} className={prediction.delta_vs_last_month < 0 ? 'rotate-180' : ''} />
                                    {prediction.delta_vs_last_month >= 0 ? '+' : ''}{prediction.delta_vs_last_month.toFixed(1)}% {t('dashboard.vs_last_month', 'vs mois dernier')}
                                </div>
                                <span className="text-[10px] text-slate-600 mt-2 uppercase tracking-widest">
                                    {prediction.confidence === 'high' ? t('dashboard.confidence_high', 'Confiance élevée')
                                        : prediction.confidence === 'medium' ? t('dashboard.confidence_medium', 'Confiance moyenne')
                                        : t('dashboard.confidence_low', 'Confiance faible')}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Restaurant-specific sections */}
            {isRestaurant && restaurantStats && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Graphique CA par heure */}
                    <div className="lg:col-span-2 glass-card p-5">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <TrendingUp size={16} className="text-primary" />
                            CA par heure
                        </h3>
                        {restaurantStats.hourly_revenue?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={160}>
                                <AreaChart data={restaurantStats.hourly_revenue}>
                                    <defs>
                                        <linearGradient id="colorHourly" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(h) => `${h}h`} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} width={60} />
                                    <ReTooltip formatter={(v: any) => formatCurrency(v)} labelFormatter={(h) => `${h}h00`} contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                                    <Area type="monotone" dataKey="revenue" stroke="#f59e0b" fill="url(#colorHourly)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-40 flex items-center justify-center text-slate-500 text-sm">{t('dashboard.restaurant_no_service')}</div>
                        )}
                    </div>

                    {/* Top plats + Réservations */}
                    <div className="space-y-4">
                        {/* Top 5 plats */}
                        <div className="glass-card p-4">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-3">{t('dashboard.restaurant_top_dishes')}</h3>
                            {restaurantStats.top_dishes?.length > 0 ? (
                                <ul className="space-y-2">
                                    {restaurantStats.top_dishes.slice(0, 5).map((d: any, i: number) => (
                                        <li key={i} className="flex justify-between items-center">
                                            <span className="text-sm text-slate-300 truncate">{d.name}</span>
                                            <span className="text-xs font-bold text-amber-400 ml-2 shrink-0">×{d.qty}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-slate-500">{t('dashboard.restaurant_no_dishes')}</p>
                            )}
                        </div>

                        {/* Prochaines réservations */}
                        <div className="glass-card p-4">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-3">{t('dashboard.restaurant_reservations')}</h3>
                            {restaurantStats.today_reservations?.length > 0 ? (
                                <ul className="space-y-2">
                                    {restaurantStats.today_reservations.map((r: any, i: number) => (
                                        <li key={i} className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm text-white font-medium">{r.time} — {r.customer_name}</p>
                                                <p className="text-xs text-slate-500">{t('dashboard.restaurant_covers', { count: r.covers })}{r.notes ? ` · ${r.notes}` : ''}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'arrived' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                {r.status === 'arrived' ? t('dashboard.restaurant_arrived') : t('dashboard.restaurant_confirmed')}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-slate-500">{t('dashboard.restaurant_no_reservations')}</p>
                            )}
                        </div>
                    </div>
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
                                    {t('dashboard.ai_forecast_title')}
                                </h3>
                                <div className="text-[10px] text-primary font-black uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">{t('dashboard.forecast_confidence')}</div>
                            </div>
                            <div className="flex-1 w-full min-h-[250px]">
                                {(!forecast?.daily_forecast || forecast.daily_forecast.length === 0) ? (
                                    <div className="h-full flex items-center justify-center text-slate-500 text-sm flex-col gap-2">
                                        <Package size={32} className="text-slate-700" />
                                        <p>{t('dashboard.no_forecast_data')}</p>
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
                                                return [`${Number(value).toLocaleString('fr-FR')}`, isPred ? t('dashboard.forecast_predicted') : t('dashboard.forecast_actual')];
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

                            {/* Tableau Détaillé par Produit */}
                            {forecast?.products && forecast.products.length > 0 && (
                                <div className="mt-8 border-t border-white/10 pt-6">
                                    <button
                                        onClick={() => setShowForecastTable(!showForecastTable)}
                                        className="w-full flex justify-between items-center mb-4 group"
                                    >
                                        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider group-hover:text-white transition-colors">
                                            {t('dashboard.forecast_details', 'Prévisions par produit')}
                                        </h4>
                                        <div className="p-1 rounded bg-white/5 group-hover:bg-white/10 transition-colors">
                                            {showForecastTable ? <ChevronUp size={16} className="text-slate-400 group-hover:text-white" /> : <ChevronDown size={16} className="text-slate-400 group-hover:text-white" />}
                                        </div>
                                    </button>

                                    {showForecastTable && (
                                        <>
                                            <div className="flex justify-end mb-4">
                                                <button
                                                    onClick={() => {
                                                        const header = ['Produit', 'Stock', 'Vit. (j)', 'Prév. 7j', 'Prév. 30j', 'Tendance', 'Risque'].join(',');
                                                        const rows = forecast.products.map((p: any) => `"${p.name.replace(/"/g, '""')}",${p.current_stock},${p.velocity.toFixed(2)},${p.predicted_sales_7d},${p.predicted_sales_30d},"${p.trend}","${p.risk_level}"`);
                                                        const csv = [header, ...rows].join('\n');
                                                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                                        const link = document.createElement('a');
                                                        link.href = URL.createObjectURL(blob);
                                                        link.download = `forecast_${new Date().toISOString().split('T')[0]}.csv`;
                                                        link.click();
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors border border-white/5"
                                                    title={t('dashboard.export_csv', 'Exporter CSV')}
                                                >
                                                    <Download size={14} /> {t('common.export', 'Exporter CSV')}
                                                </button>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm text-slate-400">
                                                    <thead className="text-xs uppercase bg-white/5 text-slate-500">
                                                        <tr>
                                                            <th className="px-4 py-3 rounded-tl-lg">{t('dashboard.col_product', 'Produit')}</th>
                                                            <th className="px-4 py-3">{t('dashboard.col_stock', 'Stock')}</th>
                                                            <th className="px-4 py-3">{t('dashboard.col_velocity', 'Vit. (j)')}</th>
                                                            <th className="px-4 py-3">{t('dashboard.col_forecast_7d', '7j')}</th>
                                                            <th className="px-4 py-3">{t('dashboard.col_forecast_30d', '30j')}</th>
                                                            <th className="px-4 py-3 rounded-tr-lg">{t('dashboard.col_trend', 'Tendance')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {forecast.products.slice(0, 5).map((p: any, i: number) => (
                                                            <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-slate-200">
                                                                    <div className="truncate max-w-[150px]" title={p.name}>{p.name}</div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className={p.risk_level === 'critical' ? 'text-rose-400 font-bold' : p.risk_level === 'warning' ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                                                                        {p.current_stock}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3">{p.velocity.toFixed(1)}</td>
                                                                <td className="px-4 py-3 text-emerald-400 font-semibold">+{p.predicted_sales_7d}</td>
                                                                <td className="px-4 py-3 text-emerald-500 font-semibold">+{p.predicted_sales_30d}</td>
                                                                <td className="px-4 py-3">
                                                                    {p.trend === 'up' || p.trend === 'en hausse' ? <TrendingUp size={14} className="text-emerald-400" /> :
                                                                     p.trend === 'down' || p.trend === 'en baisse' ? <TrendingUp size={14} className="text-rose-400 rotate-180" /> :
                                                                     <span className="text-slate-500">—</span>}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {forecast.products.length > 5 && (
                                                    <div className="text-center mt-3 pt-3 border-t border-white/5 text-xs text-slate-500">
                                                        {t('dashboard.export_csv_for_more', 'Exportez au format CSV pour voir la totalité des produits')}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                        </div>
                    )}

                    {/* Stock Value Evolution (Mobile Parity) */}
                    {visibleSections.stock_value && (
                        <div className="glass-card p-6 min-h-[400px] flex flex-col">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                                    <Package size={20} className="text-primary" />
                                    {t('dashboard.stock_value_evolution')}
                                </h3>
                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest bg-white/5 px-2 py-1 rounded">{t('dashboard.period_history', { count: period })}</div>
                            </div>
                            <div className="flex-1 w-full min-h-[300px]">
                                {(!stats?.stock_value_history || stats.stock_value_history.length === 0 || stats.stock_value_history.every((d: any) => d.value === 0)) ? (
                                    <div className="h-full flex items-center justify-center text-slate-500 text-sm flex-col gap-2">
                                        <Package size={32} className="text-slate-700" />
                                        <p>{t('dashboard.no_stock_data')}</p>
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
                                            formatter={(value: any) => [`${Number(value).toLocaleString('fr-FR')}`, t('dashboard.stock_value')]}
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
                                            <th className="pb-4">{t('dashboard.col_ref')}</th>
                                            <th className="pb-4">{t('dashboard.col_items')}</th>
                                            <th className="pb-4">{t('dashboard.col_amount')}</th>
                                            <th className="pb-4">{t('dashboard.col_time')}</th>
                                            <th className="pb-4 text-right">{t('dashboard.col_action')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {(Array.isArray(data?.recent_sales) ? data.recent_sales : []).map((sale: any) => (
                                            <tr key={sale.sale_id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                <td className="py-4 font-mono text-slate-400">#{sale.sale_id.slice(-4).toUpperCase()}</td>
                                                <td className="py-4 text-white font-bold tracking-tight">{sale.items?.length || 0} {t('dashboard.items_abbrev')}</td>
                                                <td className="py-4 font-black text-primary">{formatCurrency(sale.total_amount)}</td>
                                                <td className="py-4 text-slate-400 flex items-center gap-2">
                                                    <Clock size={12} />
                                                    {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-4 text-right">
                                                    <button
                                                        onClick={() => { setSelectedSale(sale); setIsReceiptModalOpen(true); }}
                                                        className="p-2 rounded-lg hover:bg-primary/10 text-slate-400 hover:text-primary transition-all"
                                                        title={t('dashboard.view_receipt')}
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
                            label: t('dashboard.out_of_stock'),
                            value: t('dashboard.reminder_products', { count: data.out_of_stock_count }),
                            color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20'
                        });
                        if ((data?.low_stock_count || 0) > 0) reminders.push({
                            icon: <AlertCircle size={15} />,
                            label: t('dashboard.low_stock'),
                            value: t('dashboard.reminder_products_low', { count: data.low_stock_count }),
                            color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20'
                        });
                        if ((data?.unread_alerts || 0) > 0) reminders.push({
                            icon: <Bell size={15} />,
                            label: t('dashboard.unread_alerts_label'),
                            value: t('dashboard.reminder_alerts', { count: data.unread_alerts }),
                            color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20'
                        });
                        if ((data?.overstock_count || 0) > 0) reminders.push({
                            icon: <Package size={15} />,
                            label: t('dashboard.overstock'),
                            value: t('dashboard.reminder_products_overstock', { count: data.overstock_count }),
                            color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20'
                        });
                        if ((data?.today_sales_count || 0) > 0) reminders.push({
                            icon: <ShoppingCart size={15} />,
                            label: t('dashboard.today_sales'),
                            value: t('dashboard.reminder_sales', { count: data.today_sales_count }),
                            color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20'
                        });

                        return (
                            <div className="glass-card p-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-3xl -mr-12 -mt-12"></div>
                                <div className="flex items-center gap-3 mb-5 relative z-10">
                                    <Sparkles className="text-primary animate-pulse" size={22} />
                                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">{t('dashboard.smart_reminders')}</h3>
                                </div>

                                <div className="space-y-2 relative z-10">
                                    {reminders.length === 0 ? (
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                            <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                                            <p className="text-sm text-emerald-300 font-semibold">{t('dashboard.all_good')}</p>
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
                                            {t('dashboard.see_full_report')} <ChevronRight size={14} />
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
                                {t('dashboard.stock_distribution')}
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
                                            <span className="text-blue-400 text-xs font-black uppercase tracking-widest">{t('dashboard.overstock')}</span>
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
