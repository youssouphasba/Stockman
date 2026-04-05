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
    Calendar,
    ArrowUpDown,
    ShoppingBag,
    X,
    Undo2
} from 'lucide-react';
import {
    ai as aiApi,
    crmAnalytics as crmAnalyticsApi,
    customers as customersApi,
    promotions as promotionsApi,
    type AnalyticsKpiDetail,
    type CrmAnalyticsOverview,
    type Promotion,
    type User,
} from '../services/api';
import Modal from './Modal';
import LoyaltySettingsModal from './LoyaltySettingsModal';
import CampaignModal from './CampaignModal';
import { exportCRM } from '../utils/ExportService';
import { getAccessContext } from '../utils/access';
import KpiCard from './analytics/KpiCard';
import AnalyticsKpiDetailsModal from './analytics/AnalyticsKpiDetailsModal';
import {
    applyPendingDebtToCustomer,
    buildPendingDebtEntry,
    getPendingDebtEntries,
    mergeCustomersOfflineState,
} from '../services/offlineState';
import ScreenGuide, { GuideStep } from './ScreenGuide';

type CRMProps = {
    user?: User | null;
};

const CRM_PERIODS = [
    { label: '30j', value: 30 },
    { label: '90j', value: 90 },
    { label: '1an', value: 365 },
];

const SEGMENT_STYLES: Record<string, string> = {
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    blue: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
    violet: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
    slate: 'border-white/10 bg-white/5 text-slate-300',
};

export default function CRM({ user }: CRMProps) {
    const { t, i18n } = useTranslation();
    const { formatDate, formatCurrency } = useDateFormatter();
    const access = getAccessContext(user);
    const canManageLoyalty = access.isOrgAdmin;
    const canManagePromotions = access.isOrgAdmin || access.effectivePermissions.crm === 'write';
    const [customers, setCustomers] = useState<any[]>([]);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Modal & Detail State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
    const [detailTab, setDetailTab] = useState<'info' | 'history' | 'purchases'>('info');
    // Vague 7: AI customer summary + message generator
    const [customerSummaryText, setCustomerSummaryText] = useState<string | null>(null);
    const [customerSummaryLoading, setCustomerSummaryLoading] = useState(false);
    const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
    const [messageLoading, setMessageLoading] = useState(false);
    const [messageType, setMessageType] = useState<string>('promo');
    const [messageCopied, setMessageCopied] = useState(false);
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
    const [promotionSaving, setPromotionSaving] = useState(false);
    const [promotionsLoading, setPromotionsLoading] = useState(false);
    const [promotionForm, setPromotionForm] = useState({
        title: '',
        description: '',
        discount_percentage: '',
        points_required: '',
        is_active: true,
    });

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
    const [analyticsPeriod, setAnalyticsPeriod] = useState<number>(90);
    const [useCustomRange, setUseCustomRange] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [analyticsOverview, setAnalyticsOverview] = useState<CrmAnalyticsOverview | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState<AnalyticsKpiDetail | null>(null);
    const [pendingCrmSummary, setPendingCrmSummary] = useState({ pendingCustomers: 0, pendingDebtChanges: 0, pendingTotal: 0 });

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
        loadPromotions();
    }, []);

    useEffect(() => {
        loadCustomers();
    }, [sortBy]);

    useEffect(() => {
        if (!useCustomRange) {
            loadAnalytics();
        }
    }, [analyticsPeriod, useCustomRange]);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const res = await customersApi.list(0, 200, sortBy);
            const merged = mergeCustomersOfflineState(res.items || res);
            setCustomers(merged.customers);
            setPendingCrmSummary(merged.summary);
            // Auto-trigger churn prediction
            aiApi.churnPrediction(i18n.language).then(res => setChurnData(res)).catch(() => { });
        } catch (err) {
            console.error("CRM load error", err);
        } finally {
            setLoading(false);
        }
    };

    const loadPromotions = async () => {
        setPromotionsLoading(true);
        try {
            const res = await promotionsApi.list();
            setPromotions(Array.isArray(res) ? res : []);
        } catch (err) {
            console.error('CRM promotions load error', err);
            setPromotions([]);
        } finally {
            setPromotionsLoading(false);
        }
    };

    const loadAnalytics = async () => {
        setAnalyticsLoading(true);
        try {
            const res = await crmAnalyticsApi.getOverview(
                useCustomRange ? undefined : analyticsPeriod,
                useCustomRange ? startDate : undefined,
                useCustomRange ? endDate : undefined,
            );
            setAnalyticsOverview(res);
        } catch (err) {
            console.error("CRM analytics load error", err);
            setAnalyticsOverview(null);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const loadBirthdays = async () => {
        try {
            const res = await customersApi.getBirthdays(7);
            setBirthdays(Array.isArray(res) ? res : []);
        } catch { /* silent */ }
    };

    const openPromotionModal = (promotion?: Promotion) => {
        if (promotion) {
            setEditingPromotion(promotion);
            setPromotionForm({
                title: promotion.title || '',
                description: promotion.description || '',
                discount_percentage: promotion.discount_percentage?.toString() || '',
                points_required: promotion.points_required?.toString() || '',
                is_active: promotion.is_active ?? true,
            });
        } else {
            setEditingPromotion(null);
            setPromotionForm({
                title: '',
                description: '',
                discount_percentage: '',
                points_required: '',
                is_active: true,
            });
        }
        setIsPromotionModalOpen(true);
    };

    const handleOpenAddModal = () => {
        setCustomerForm({ name: '', phone: '', email: '', notes: '', category: 'particulier', birthday: '' });
        setIsAddModalOpen(true);
    };

    const handleExportExcel = () => exportCRM(filteredCustomers, 'F', 'excel');
    const handleExportPDF = () => exportCRM(filteredCustomers, 'F', 'pdf');

    const handleOpenCrmDetail = async (metric: string) => {
        setDetailOpen(true);
        setDetailLoading(true);
        setDetail(null);
        try {
            const res = await crmAnalyticsApi.getKpiDetails(
                metric,
                useCustomRange ? undefined : analyticsPeriod,
                useCustomRange ? startDate : undefined,
                useCustomRange ? endDate : undefined,
            );
            setDetail(res);
        } catch (err) {
            console.error("CRM KPI detail error", err);
            setDetail(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleApplyCustomRange = () => {
        if (!startDate || !endDate) return;
        loadAnalytics();
    };

    const handleSaveCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerForm.name) return;
        setSaving(true);
        try {
            await customersApi.create(customerForm);
            setIsAddModalOpen(false);
            loadCustomers();
            loadAnalytics();
        } catch (err) {
            console.error("Create customer error", err);
        } finally {
            setSaving(false);
        }
    };

    const handleSavePromotion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!promotionForm.title.trim()) return;
        setPromotionSaving(true);
        try {
            const payload = {
                title: promotionForm.title.trim(),
                description: promotionForm.description.trim(),
                discount_percentage: promotionForm.discount_percentage ? Number(promotionForm.discount_percentage) : undefined,
                points_required: promotionForm.points_required ? Number(promotionForm.points_required) : undefined,
                is_active: promotionForm.is_active,
            };
            if (editingPromotion) {
                await promotionsApi.update(editingPromotion.promotion_id, payload);
            } else {
                await promotionsApi.create(payload);
            }
            setIsPromotionModalOpen(false);
            setEditingPromotion(null);
            await loadPromotions();
        } catch (err) {
            console.error('Save promotion error', err);
        } finally {
            setPromotionSaving(false);
        }
    };

    const handleDeletePromotion = async (promotionId: string) => {
        if (!window.confirm('Supprimer cette promotion ?')) return;
        try {
            await promotionsApi.delete(promotionId);
            await loadPromotions();
        } catch (err) {
            console.error('Delete promotion error', err);
        }
    };

    const handleTogglePromotion = async (promotion: Promotion) => {
        try {
            await promotionsApi.update(promotion.promotion_id, {
                title: promotion.title,
                description: promotion.description || '',
                discount_percentage: promotion.discount_percentage,
                points_required: promotion.points_required,
                is_active: !promotion.is_active,
            });
            await loadPromotions();
        } catch (err) {
            console.error('Toggle promotion error', err);
        }
    };

    const handleOpenDetail = async (customer: any) => {
        setSelectedCustomer(customer);
        setDetailTab('info');
        setIsDetailModalOpen(true);
        setLoadingHistory(true);
        setCustomerSales([]);
        setCustomerSummaryText(null);
        setGeneratedMessage(null);
        setMessageType('promo');
        setMessageCopied(false);
        if (String(customer.customer_id || '').startsWith('offline-customer-')) {
            setDebtHistory([]);
            setLoadingHistory(false);
            return;
        }
        try {
            const [debtsRes, salesRes] = await Promise.all([
                customersApi.getDebts(customer.customer_id),
                customersApi.getSales(customer.customer_id)
            ]);
            const baseHistory = Array.isArray(debtsRes?.items) ? debtsRes.items : (Array.isArray(debtsRes) ? debtsRes : []);
            setDebtHistory([...getPendingDebtEntries(customer.customer_id), ...baseHistory]);
            setCustomerSales(salesRes?.sales || []);
        } catch (err) {
            console.error("Error loading customer detail", err);
            setDebtHistory(getPendingDebtEntries(customer.customer_id));
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleCancelPayment = async (paymentId: string, amount: number) => {
        if (!selectedCustomer) return;
        if (!window.confirm(t('crm.confirm_cancel_payment', { amount: formatCurrency(Math.abs(amount)) }))) return;
        try {
            await customersApi.cancelPayment(selectedCustomer.customer_id, paymentId);
            const [debtsRes] = await Promise.all([customersApi.getDebts(selectedCustomer.customer_id)]);
            const baseHistory = Array.isArray(debtsRes?.items) ? debtsRes.items : (Array.isArray(debtsRes) ? debtsRes : []);
            setDebtHistory(baseHistory);
            await loadCustomers();
            const updated = customers.find((c: any) => c.customer_id === selectedCustomer.customer_id);
            if (updated) setSelectedCustomer(updated);
        } catch {
            alert(t('crm.cancel_payment_error'));
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
        const matchSearch = (c.name || '').toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search);
        const matchCategory = filterCategory === 'all' || (c.category || 'particulier') === filterCategory;
        const matchTier = filterTier === 'all' || getTier(c) === filterTier;
        return matchSearch && matchCategory && matchTier;
    });

    const debtHistoryWithBalance = (() => {
        let runningBalance = Number(selectedCustomer?.current_debt || 0);
        return (Array.isArray(debtHistory) ? debtHistory : []).map((entry) => {
            const amount = Number(entry.amount || 0);
            const isDebtIncrease = entry.type === 'credit_sale' || (entry.type === 'payment' && amount < 0);
            const row = {
                ...entry,
                isDebtIncrease,
                balance_after: runningBalance,
            };
            runningBalance = isDebtIncrease ? runningBalance - Math.abs(amount) : runningBalance + Math.abs(amount);
            return row;
        });
    })();

    const crmSteps: GuideStep[] = [
        {
            title: t('guide.crm.role_title', "Rôle du CRM"),
            content: t('guide.crm.role_content', "Le CRM centralise vos clients, leur historique d'achats, leurs points de fidélité, leurs dettes et vos actions marketing. Tout client créé ici est disponible au POS lors d'une vente."),
        },
        {
            title: t('guide.crm.clients_title', "Onglet Clients"),
            content: t('guide.crm.clients_content', "Liste de tous vos clients avec filtres et actions."),
            details: [
                { label: t('guide.crm.btn_new', "Bouton + Nouveau Client"), description: t('guide.crm.btn_new_desc', "Crée une fiche client : nom, téléphone, email, catégorie (particulier, professionnel, VIP), date d'anniversaire."), type: 'button' as const },
                { label: t('guide.crm.search', "Barre de recherche"), description: t('guide.crm.search_desc', "Recherche par nom, téléphone ou email."), type: 'filter' as const },
                { label: t('guide.crm.filter_category', "Filtre catégorie"), description: t('guide.crm.filter_category_desc', "Particulier, professionnel, VIP, etc."), type: 'filter' as const },
                { label: t('guide.crm.filter_tier', "Filtre niveau"), description: t('guide.crm.filter_tier_desc', "Gold, Silver, Bronze, Standard — basé sur les points de fidélité."), type: 'filter' as const },
                { label: t('guide.crm.card_client', "Carte client"), description: t('guide.crm.card_client_desc', "Affiche nom, points, niveau, indicateur de dette. Cliquez pour ouvrir la fiche complète."), type: 'card' as const },
                { label: t('guide.crm.btn_whatsapp', "Icône WhatsApp"), description: t('guide.crm.btn_whatsapp_desc', "Ouvre WhatsApp avec le numéro du client pré-rempli."), type: 'button' as const },
            ],
        },
        {
            title: t('guide.crm.detail_title', "Fiche client"),
            content: t('guide.crm.detail_content', "Ouvrez une fiche client pour accéder à l'historique complet et gérer la relation."),
            details: [
                { label: t('guide.crm.tab_info', "Onglet Info"), description: t('guide.crm.tab_info_desc', "Coordonnées, catégorie, points accumulés, solde de dette, niveau de fidélité."), type: 'info' as const },
                { label: t('guide.crm.tab_history', "Onglet Historique"), description: t('guide.crm.tab_history_desc', "Toutes les transactions et paiements du client classés par date."), type: 'info' as const },
                { label: t('guide.crm.tab_purchases', "Onglet Achats"), description: t('guide.crm.tab_purchases_desc', "Liste des ventes associées à ce client avec montant et articles."), type: 'info' as const },
                { label: t('guide.crm.btn_debt', "Gérer la dette"), description: t('guide.crm.btn_debt_desc', "Ajoutez ou enregistrez un remboursement de dette. Le solde se met à jour en temps réel."), type: 'button' as const },
            ],
        },
        {
            title: t('guide.crm.segments_title', "Onglet Segments"),
            content: t('guide.crm.segments_content', "L'IA segmente automatiquement vos clients en groupes selon leur comportement d'achat : VIP, fidèles, inactifs, à risque de churn. Utilisez ces segments pour cibler vos actions marketing."),
        },
        {
            title: t('guide.crm.promos_title', "Onglet Promotions"),
            content: t('guide.crm.promos_content', "Créez et gérez vos offres promotionnelles."),
            details: [
                { label: t('guide.crm.btn_new_promo', "Créer une promotion"), description: t('guide.crm.btn_new_promo_desc', "Définissez le nom, le type de remise (%), les produits concernés, la période de validité et les clients éligibles."), type: 'button' as const },
                { label: t('guide.crm.promo_toggle', "Activer / désactiver"), description: t('guide.crm.promo_toggle_desc', "Activez ou mettez en pause une promotion sans la supprimer."), type: 'button' as const },
            ],
        },
        {
            title: t('guide.crm.birthdays_title', "Onglet Anniversaires"),
            content: t('guide.crm.birthdays_content', "Liste des clients dont l'anniversaire approche. Envoyez un message WhatsApp personnalisé directement depuis cet onglet pour renforcer la relation client."),
        },
        {
            title: t('guide.crm.campaigns_title', "Onglet Campagnes"),
            content: t('guide.crm.campaigns_content', "Créez des campagnes de communication ciblées. Chaque campagne peut être envoyée via WhatsApp à un segment ou à l'ensemble de vos clients."),
        },
        {
            title: "Utilisation de l'IA",
            content: "L'IA sur le CRM sert à mieux comprendre un client puis à préparer une prise de contact plus pertinente. Elle s'utilise depuis la fiche client.",
            details: [
                { label: 'Résumé IA', description: "Le résumé apparaît dans l'onglet Infos d'une fiche client après clic sur Analyser.", type: 'card' as const },
                { label: 'Message IA', description: "Le message est généré sur clic selon le type choisi : promotion, réactivation, rappel de dette ou anniversaire.", type: 'button' as const },
                { label: 'Validation humaine', description: "Le texte généré est une base de travail. Relisez-le toujours avant envoi, surtout pour une dette ou une relance sensible.", type: 'tip' as const },
            ],
        },
    ];

    return (
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
            <ScreenGuide steps={crmSteps} guideKey="crm_tour" />
            <header className="flex flex-wrap justify-between items-start gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('crm.title') || 'Gestion Clients (CRM)'}</h1>
                    <p className="text-slate-400">{t('crm.subtitle') || 'Fidélisez votre clientèle et suivez les dettes.'}</p>
                </div>
                {pendingCrmSummary.pendingTotal > 0 && (
                    <div className="max-w-2xl rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200">
                        <div className="flex flex-wrap items-center gap-2">
                            <AlertCircle size={14} />
                            <span>
                                {pendingCrmSummary.pendingCustomers} client(s) et {pendingCrmSummary.pendingDebtChanges} op?ration(s) de dette sont encore en attente de synchronisation.
                            </span>
                        </div>
                    </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setIsCampaignModalOpen(true)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all font-bold"
                    >
                        <Megaphone size={20} className="text-primary" /> Campagne
                    </button>
                    {canManageLoyalty && (<button
                        onClick={() => setIsLoyaltyModalOpen(true)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all font-bold"
                    >
                        <Settings size={20} className="text-primary" /> Fidélité
                    </button>)}
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

            <div className="mb-8 glass-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">Promotions</p>
                        <h2 className="mt-2 text-2xl font-black text-white">Offres de fidélisation</h2>
                        <p className="mt-2 max-w-3xl text-sm text-slate-400">
                            Prépare les avantages visibles dans le CRM pour animer les campagnes, récompenser la fidélité et cadrer les offres en boutique.
                        </p>
                    </div>
                    {canManagePromotions && (
                        <button
                            type="button"
                            onClick={() => openPromotionModal()}
                            className="rounded-xl bg-primary px-4 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:brightness-110"
                        >
                            Nouvelle promotion
                        </button>
                    )}
                </div>
                {promotionsLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
                    </div>
                ) : promotions.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center">
                        <Megaphone size={28} className="mx-auto text-slate-600" />
                        <p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Aucune promotion active</p>
                        <p className="mt-2 text-sm text-slate-400">Crée une offre pour préparer tes campagnes et tes récompenses de fidélité.</p>
                    </div>
                ) : (
                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {promotions.map((promotion) => (
                            <div key={promotion.promotion_id} className={`rounded-3xl border p-5 transition-all ${promotion.is_active ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 bg-white/[0.03]'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-lg font-black text-white">{promotion.title}</h3>
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${promotion.is_active ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-slate-500/20 bg-slate-500/10 text-slate-300'}`}>
                                                {promotion.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-400">{promotion.description || 'Sans description.'}</p>
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Remise</p>
                                        <p className="mt-1 text-lg font-black text-white">
                                            {promotion.discount_percentage ? `${promotion.discount_percentage}%` : '—'}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Points</p>
                                        <p className="mt-1 text-lg font-black text-white">
                                            {promotion.points_required ?? '—'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleTogglePromotion(promotion)}
                                        disabled={!canManagePromotions}
                                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-300 transition-all hover:border-primary/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {promotion.is_active ? 'Désactiver' : 'Activer'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openPromotionModal(promotion)}
                                        disabled={!canManagePromotions}
                                        className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary transition-all hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Modifier
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeletePromotion(promotion.promotion_id)}
                                        disabled={!canManagePromotions}
                                        className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-rose-300 transition-all hover:bg-rose-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Birthday banner */}
            {birthdays.length > 0 && (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-4">
                    <Cake size={20} className="text-amber-400 shrink-0" />
                    <div className="flex-1">
                        <span className="text-amber-400 font-bold text-sm">
                            {birthdays.length === 1
                                ? `🎂 Anniversaire dans 7 jours : ${birthdays[0].name}`
                                : `🎂 ${birthdays.length} anniversaires à venir : ${birthdays.filter(Boolean).slice(0, 3).map((b: any) => b.name || '—').join(', ')}${birthdays.length > 3 ? '…' : ''}`
                            }
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            setIsCampaignModalOpen(true);
                        }}
                        className="text-xs font-black text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-xl hover:bg-amber-500/20 transition-all shrink-0"
                    >
                        Envoyer vÅ“ux
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

            <div className="mb-8 grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
                <div className="glass-card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">CRM Analytics</p>
                            <h2 className="mt-2 text-2xl font-black text-white">Vue d'ensemble client</h2>
                            <p className="mt-2 max-w-3xl text-sm text-slate-400">
                                {analyticsOverview?.summary || "Suivez l'activation, la retention, les dettes et les clients a relancer sur le compte."}
                            </p>
                            <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                                {useCustomRange && startDate && endDate
                                    ? `Periode personnalisee du ${formatDate(startDate)} au ${formatDate(endDate)}`
                                    : `Donnees mutualisees a l'echelle du compte • ${analyticsPeriod} jours`}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {!useCustomRange && CRM_PERIODS.map((period) => (
                                <button
                                    key={period.value}
                                    type="button"
                                    onClick={() => setAnalyticsPeriod(period.value)}
                                    className={`rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all ${analyticsPeriod === period.value
                                        ? 'border-primary bg-primary text-white'
                                        : 'border-white/10 bg-white/5 text-slate-400 hover:border-primary/30 hover:text-white'
                                        }`}
                                >
                                    {period.label}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setUseCustomRange((value) => !value)}
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all ${useCustomRange
                                    ? 'border-primary/40 bg-primary/15 text-primary'
                                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-primary/30 hover:text-white'
                                    }`}
                            >
                                <Calendar size={14} />
                                Dates
                            </button>
                            {useCustomRange ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-all focus:border-primary/40"
                                    />
                                    <span className="text-sm text-slate-500">→</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-all focus:border-primary/40"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleApplyCustomRange}
                                        disabled={!startDate || !endDate}
                                        className="rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Appliquer
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {analyticsLoading && !analyticsOverview ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
                        </div>
                    ) : (
                        <div className="mt-6 grid gap-3 md:grid-cols-2">
                            {(analyticsOverview?.recommendations?.length
                                ? analyticsOverview.recommendations
                                : [
                                    "Identifiez les clients qui n'ont pas achete recemment pour lancer une relance ciblee.",
                                    "Surveillez les anniversaires, les dettes ouvertes et les clients a risque pour prioriser les actions commerciales.",
                                ]
                            ).map((recommendation, index) => (
                                <div
                                    key={`${recommendation}-${index}`}
                                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4"
                                >
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                                        Recommandation {index + 1}
                                    </p>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-200">{recommendation}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">Segments</p>
                            <h3 className="mt-2 text-xl font-black text-white">Clientele a cibler</h3>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                            {analyticsOverview?.segments?.length || 0} groupes
                        </span>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {(analyticsOverview?.segments || []).map((segment) => {
                            const metricBySegment: Record<string, string> = {
                                vip: 'vip_customers',
                                loyal: 'loyal_customers',
                                occasional: 'occasional_customers',
                                new: 'new_customers',
                                at_risk: 'at_risk_customers',
                                inactive: 'inactive_customers',
                            };
                            const metric = metricBySegment[segment.id];
                            return (
                                <button
                                    key={segment.id}
                                    type="button"
                                    onClick={() => metric && handleOpenCrmDetail(metric)}
                                    className={`rounded-2xl border px-4 py-4 text-left transition hover:border-primary/30 hover:bg-white/[0.06] ${SEGMENT_STYLES[segment.accent] || SEGMENT_STYLES.slate}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.18em]">{segment.label}</p>
                                            <p className="mt-2 text-sm leading-relaxed text-slate-100">{segment.description}</p>
                                        </div>
                                        <span className="rounded-full border border-current/15 px-2.5 py-1 text-sm font-black">
                                            {segment.count}
                                        </span>
                                    </div>
                                    {segment.examples.length > 0 ? (
                                        <p className="mt-3 text-xs text-slate-200/90">
                                            Exemples : {segment.examples.join(', ')}
                                        </p>
                                    ) : (
                                        <p className="mt-3 text-xs text-slate-300/80">Voir le detail</p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 mb-8">
                <KpiCard
                    icon={Users}
                    label="Base clients"
                    value={(analyticsOverview?.kpis.total_customers || 0).toLocaleString('fr-FR')}
                    hint="Tous les clients du compte"
                    onClick={() => handleOpenCrmDetail('total_customers')}
                />
                <KpiCard
                    icon={TrendingUp}
                    label="Clients actifs"
                    value={(analyticsOverview?.kpis.active_customers || 0).toLocaleString('fr-FR')}
                    hint={`Clients actifs sur ${analyticsPeriod} jours`}
                    onClick={() => handleOpenCrmDetail('active_customers')}
                />
                <KpiCard
                    icon={UserPlus}
                    label="Nouveaux clients"
                    value={(analyticsOverview?.kpis.new_customers || 0).toLocaleString('fr-FR')}
                    hint={`Crees sur ${analyticsPeriod} jours`}
                    onClick={() => handleOpenCrmDetail('new_customers')}
                />
                <KpiCard
                    icon={AlertCircle}
                    label="Clients inactifs"
                    value={(analyticsOverview?.kpis.inactive_customers || 0).toLocaleString('fr-FR')}
                    hint="Sans achat recent"
                    onClick={() => handleOpenCrmDetail('inactive_customers')}
                />
                <KpiCard
                    icon={ShoppingBag}
                    label="Panier moyen"
                    value={formatCurrency(analyticsOverview?.kpis.average_basket || 0)}
                    hint={`Panier moyen sur ${analyticsPeriod} jours`}
                    onClick={() => handleOpenCrmDetail('average_basket')}
                />
                <KpiCard
                    icon={TrendingUp}
                    label="Taux de reachat"
                    value={`${(analyticsOverview?.kpis.repeat_rate || 0).toFixed(1)}%`}
                    hint="Clients avec 2 achats ou plus"
                    onClick={() => handleOpenCrmDetail('repeat_rate')}
                />
                <KpiCard
                    icon={CreditCard}
                    label="Encours clients"
                    value={formatCurrency(analyticsOverview?.kpis.debt_balance || 0)}
                    hint={`${(analyticsOverview?.kpis.debt_customers || 0).toLocaleString('fr-FR')} clients en dette`}
                    onClick={() => handleOpenCrmDetail('debt_balance')}
                />
                <KpiCard
                    icon={Zap}
                    label="Clients a risque"
                    value={(analyticsOverview?.kpis.at_risk_customers || 0).toLocaleString('fr-FR')}
                    hint="Clients a relancer en priorite"
                    onClick={() => handleOpenCrmDetail('at_risk_customers')}
                />
                <KpiCard
                    icon={Cake}
                    label="Anniversaires"
                    value={(analyticsOverview?.kpis.birthdays_soon || 0).toLocaleString('fr-FR')}
                    hint="Dans les 7 prochains jours"
                    onClick={() => handleOpenCrmDetail('birthdays_soon')}
                />
                <KpiCard
                    icon={ShieldCheck}
                    label="Clients VIP"
                    value={(analyticsOverview?.kpis.vip_customers || 0).toLocaleString('fr-FR')}
                    hint="Clients a forte valeur"
                    onClick={() => handleOpenCrmDetail('vip_customers')}
                />
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
                                                        {(c.name || '?').charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-bold flex items-center gap-2">
                                                            {c.name}
                                                            {c.offline_pending && (
                                                                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">
                                                                    Hors ligne
                                                                </span>
                                                            )}
                                                        </span>
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
                                                <span className={`font-bold ${(c.current_debt || 0) > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                                    {formatCurrency(c.current_debt || 0)}
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
                                    {(selectedCustomer?.name || '?').charAt(0)}
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
                                    onClick={() => setDetailTab('purchases')}
                                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${detailTab === 'purchases' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
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
                                        <p className="text-xl font-black text-rose-500 flex items-center gap-2">
                                            <span>{formatCurrency(selectedCustomer.current_debt || 0)}</span>
                                            {selectedCustomer.offline_pending_debt && (
                                                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">
                                                    En attente
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* AI Customer Summary */}
                                <div className="p-5 bg-violet-500/5 border border-violet-500/20 rounded-3xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <Zap size={12} className="text-violet-400" />
                                            Résumé IA
                                        </p>
                                        <button
                                            onClick={async () => {
                                                setCustomerSummaryLoading(true);
                                                setCustomerSummaryText(null);
                                                try {
                                                    const res = await aiApi.customerSummary(selectedCustomer.customer_id, i18n.language);
                                                    setCustomerSummaryText(res?.summary || null);
                                                } catch {
                                                    setCustomerSummaryText(null);
                                                } finally {
                                                    setCustomerSummaryLoading(false);
                                                }
                                            }}
                                            disabled={customerSummaryLoading}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                        >
                                            {customerSummaryLoading ? (
                                                <div className="w-3 h-3 border border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
                                            ) : (
                                                <Zap size={11} />
                                            )}
                                            Analyser
                                        </button>
                                    </div>
                                    {customerSummaryLoading && (
                                        <p className="text-xs text-slate-500 italic">Génération en cours…</p>
                                    )}
                                    {customerSummaryText && (
                                        <p className="text-sm text-slate-300 leading-relaxed">{customerSummaryText}</p>
                                    )}
                                    {!customerSummaryLoading && !customerSummaryText && (
                                        <p className="text-xs text-slate-600 italic">Cliquez sur Analyser pour générer un résumé IA de ce client.</p>
                                    )}
                                </div>

                                {/* AI Message Generator */}
                                <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <MessageSquare size={12} className="text-emerald-400" />
                                            Message IA
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={messageType}
                                                onChange={e => { setMessageType(e.target.value); setGeneratedMessage(null); }}
                                                className="text-[10px] font-bold bg-white/10 border border-white/10 text-slate-300 rounded-lg px-2 py-1 outline-none"
                                            >
                                                <option value="promo">Promotion</option>
                                                <option value="reengagement">Réactivation</option>
                                                <option value="debt_reminder">Rappel dette</option>
                                                <option value="birthday">Anniversaire</option>
                                            </select>
                                            <button
                                                onClick={async () => {
                                                    setMessageLoading(true);
                                                    setGeneratedMessage(null);
                                                    setMessageCopied(false);
                                                    try {
                                                        const res = await aiApi.generateCustomerMessage(selectedCustomer.customer_id, messageType, i18n.language);
                                                        setGeneratedMessage(res?.message || null);
                                                    } catch {
                                                        setGeneratedMessage(null);
                                                    } finally {
                                                        setMessageLoading(false);
                                                    }
                                                }}
                                                disabled={messageLoading}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                            >
                                                {messageLoading ? (
                                                    <div className="w-3 h-3 border border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
                                                ) : (
                                                    <Zap size={11} />
                                                )}
                                                Générer
                                            </button>
                                        </div>
                                    </div>
                                    {messageLoading && (
                                        <p className="text-xs text-slate-500 italic">Rédaction en cours…</p>
                                    )}
                                    {generatedMessage && (
                                        <div className="space-y-2">
                                            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{generatedMessage}</p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { navigator.clipboard.writeText(generatedMessage); setMessageCopied(true); setTimeout(() => setMessageCopied(false), 2000); }}
                                                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-[10px] font-bold transition-all"
                                                >
                                                    {messageCopied ? '✓ Copié' : 'Copier'}
                                                </button>
                                                <button
                                                    onClick={() => selectedCustomer.phone && window.open(`https://wa.me/${selectedCustomer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMessage)}`, '_blank')}
                                                    disabled={!selectedCustomer.phone}
                                                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold transition-all disabled:opacity-40"
                                                >
                                                    WhatsApp
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {!messageLoading && !generatedMessage && (
                                        <p className="text-xs text-slate-600 italic">Choisissez un type et cliquez sur Générer.</p>
                                    )}
                                </div>
                            </div>
                        ) : detailTab === 'history' ? (
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
                                        {debtHistoryWithBalance.map((rawDebt, idx) => {
                                            const debt = {
                                                ...rawDebt,
                                                is_payment: !rawDebt.isDebtIncrease,
                                                description: rawDebt.details || (rawDebt.isDebtIncrease ? 'Achat à crédit' : 'Remboursement'),
                                                remaining: rawDebt.balance_after,
                                                amount: Math.abs(rawDebt.amount || 0),
                                            };
                                            return (
                                            <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center group hover:bg-white/10 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${debt.isDebtIncrease ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                        {debt.isDebtIncrease ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white">{debt.description || (debt.is_payment ? 'Remboursement' : 'Achat à crédit')}</p>
                                                        <p className="text-[10px] text-slate-500 font-medium">{formatDate(debt.date)} • {debt.reference || '-'}{debt.pending ? ' • Hors ligne' : ''}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className={`text-sm font-black ${debt.is_payment ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {debt.is_payment ? '-' : '+'}{formatCurrency(debt.amount || 0)}
                                                        </p>
                                                        <p className="text-[9px] text-slate-600 font-bold uppercase">Solde: {formatCurrency(debt.remaining || 0)}</p>
                                                    </div>
                                                    {rawDebt.type === 'payment' && rawDebt.payment_id && (
                                                        <button
                                                            onClick={() => handleCancelPayment(rawDebt.payment_id, rawDebt.amount)}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400"
                                                            title={t('crm.cancel_payment')}
                                                        >
                                                            <Undo2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Purchases tab */}
                        {detailTab === 'purchases' && (
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
                                <div className="text-3xl font-bold text-rose-500 mt-1">{formatCurrency(selectedCustomer.current_debt || 0)}</div>
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
            {canManageLoyalty && (
                <LoyaltySettingsModal
                    isOpen={isLoyaltyModalOpen}
                    onClose={() => setIsLoyaltyModalOpen(false)}
                />
            )}

            {/* Marketing Campaign Modal */}
            <CampaignModal
                isOpen={isCampaignModalOpen}
                onClose={() => setIsCampaignModalOpen(false)}
            />
            <Modal
                isOpen={isPromotionModalOpen}
                onClose={() => {
                    setIsPromotionModalOpen(false);
                    setEditingPromotion(null);
                }}
                title={editingPromotion ? 'Modifier la promotion' : 'Nouvelle promotion'}
            >
                <form className="space-y-4" onSubmit={handleSavePromotion}>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-slate-400 font-medium">Titre</label>
                        <input
                            type="text"
                            value={promotionForm.title}
                            onChange={(e) => setPromotionForm((current) => ({ ...current, title: e.target.value }))}
                            className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                            placeholder="Ex : 10 % de remise VIP"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-slate-400 font-medium">Description</label>
                        <textarea
                            value={promotionForm.description}
                            onChange={(e) => setPromotionForm((current) => ({ ...current, description: e.target.value }))}
                            rows={4}
                            className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all resize-none"
                            placeholder="Explique les conditions ou l’usage conseillé de cette promotion."
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-slate-400 font-medium">Remise (%)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={promotionForm.discount_percentage}
                                onChange={(e) => setPromotionForm((current) => ({ ...current, discount_percentage: e.target.value }))}
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                                placeholder="0"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-slate-400 font-medium">Points requis</label>
                            <input
                                type="number"
                                min="0"
                                value={promotionForm.points_required}
                                onChange={(e) => setPromotionForm((current) => ({ ...current, points_required: e.target.value }))}
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <input
                            type="checkbox"
                            checked={promotionForm.is_active}
                            onChange={(e) => setPromotionForm((current) => ({ ...current, is_active: e.target.checked }))}
                            className="h-4 w-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/40"
                        />
                        <div>
                            <p className="text-sm font-bold text-white">Promotion active</p>
                            <p className="text-xs text-slate-500">La promotion pourra être visible immédiatement dans le CRM.</p>
                        </div>
                    </label>
                    <div className="flex gap-4 pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => {
                                setIsPromotionModalOpen(false);
                                setEditingPromotion(null);
                            }}
                            className="flex-1 px-4 py-3 text-slate-400 hover:text-white transition-colors font-bold"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={promotionSaving || !promotionForm.title.trim()}
                            className="flex-1 rounded-xl bg-primary px-4 py-3 text-white font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {promotionSaving ? 'Enregistrement…' : editingPromotion ? 'Mettre à jour' : 'Créer la promotion'}
                        </button>
                    </div>
                </form>
            </Modal>
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
                                    const rawAmount = parseFloat(debtForm.amount);
                                    const signedAmount = debtForm.type === 'payment' ? rawAmount : -rawAmount;
                                    const response = await customersApi.addDebt(selectedCustomer.customer_id, {
                                        amount: signedAmount,
                                        is_payment: debtForm.type === 'payment',
                                        description: debtForm.reason || undefined,
                                    });
                                    setIsDebtModalOpen(false);
                                    setDebtForm({ amount: '', type: 'addition', reason: '' });
                                    if ((response as any)?.offline_pending) {
                                        setSelectedCustomer(applyPendingDebtToCustomer(selectedCustomer, signedAmount));
                                        setCustomers((prev) => prev.map((customer) =>
                                            customer.customer_id === selectedCustomer.customer_id
                                                ? applyPendingDebtToCustomer(customer, signedAmount)
                                                : customer,
                                        ));
                                        setDebtHistory((prev) => [
                                            buildPendingDebtEntry(selectedCustomer.customer_id, signedAmount, debtForm.reason || undefined),
                                            ...prev,
                                        ]);
                                        setPendingCrmSummary((prev) => ({
                                            ...prev,
                                            pendingDebtChanges: prev.pendingDebtChanges + 1,
                                            pendingTotal: prev.pendingTotal + 1,
                                        }));
                                        return;
                                    }
                                    const [updatedCustomer, debtRes] = await Promise.all([
                                        customersApi.get(selectedCustomer.customer_id),
                                        customersApi.getDebts(selectedCustomer.customer_id),
                                    ]);
                                    const mergedCustomer = mergeCustomersOfflineState([updatedCustomer]).customers[0] || updatedCustomer;
                                    setSelectedCustomer(mergedCustomer);
                                    const baseHistory = Array.isArray(debtRes?.items) ? debtRes.items : (Array.isArray(debtRes) ? debtRes : []);
                                    setDebtHistory([...getPendingDebtEntries(selectedCustomer.customer_id), ...baseHistory]);
                                    loadCustomers();
                                    loadAnalytics();
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
            <AnalyticsKpiDetailsModal
                open={detailOpen}
                detail={detail}
                loading={detailLoading}
                onClose={() => setDetailOpen(false)}
            />
        </div>
    );
}
