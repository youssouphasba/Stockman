'use client';

import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Package, LogIn, LayoutDashboard, LineChart, ShoppingCart, ShieldCheck, AlertCircle as AlertIcon, Menu, Users, Truck, Store, Settings2, BarChart3, Bell, ClipboardList, ScanBarcode, ArrowLeftRight, Star, CheckCircle2, XCircle, Zap, LogOut, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Sidebar from "../components/Sidebar";
import Dashboard from "../components/Dashboard";
import ExecutiveDashboard from "../components/ExecutiveDashboard";
import Inventory from "../components/Inventory";
import POS from "../components/POS";
import Accounting from "../components/Accounting";
import CRM from "../components/CRM";
import Orders from "../components/Orders";
import Suppliers from "../components/Suppliers";
import Activity from "../components/Activity";
import Alerts from "../components/Alerts";
import Settings from "../components/Settings";
import Staff from "../components/Staff";
import AdminDashboard from "../components/AdminDashboard";
import Subscription from "../components/Subscription";
import SupplierPortal from "../components/SupplierPortal";
import StockHistory from "../components/StockHistory";
import AbcAnalysis from "../components/AbcAnalysis";
import InventoryCounting from "../components/InventoryCounting";
import ExpiryAlerts from "../components/ExpiryAlerts";
import MultiStoreDashboard from "../components/MultiStoreDashboard";
import ProductionView from "../components/ProductionView";
import TableManagement from "../components/TableManagement";
import Reservations from "../components/Reservations";
import KitchenDisplay from "../components/KitchenDisplay";
import ReportsLibrary from "../components/ReportsLibrary";
import ChatModal from "../components/ChatModal";
import AiChatPanel from "../components/AiChatPanel";
import SupportPanel from "../components/SupportPanel";
import NotificationCenter from "../components/NotificationCenter";
import VerifyEmailPanel from "../components/VerifyEmailPanel";
import { auth, userFeatures, chat as chatApi, demo as demoApi, ApiError, UserFeatures, removeToken, type AuthResponse, type DemoSessionInfo } from "../services/api";
import { getAccessContext } from "../utils/access";
import TrialBanner from "../components/TrialBanner";
import EnterpriseSignupModal from "../components/EnterpriseSignupModal";
import { AnalyticsFiltersProvider } from "../contexts/AnalyticsFiltersContext";
import GlobalFiltersBar from "../components/analytics/GlobalFiltersBar";
import { BUSINESS_TYPE_GROUP_IDS, MOBILE_APP_URL, PLAN_COMPARISON_ROWS } from "../data/marketing";

export default function Home() {
  const { t, ready, i18n } = useTranslation();
  const [isLogged, setIsLogged] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [features, setFeatures] = useState<UserFeatures | null>(null);
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [demoBootLoading, setDemoBootLoading] = useState(false);
  const searchParams = useSearchParams();

  const [showSignup, setShowSignup] = useState(false);
  const [demoSessionInfo, setDemoSessionInfo] = useState<DemoSessionInfo | null>(null);
  const [showDemoLeadPrompt, setShowDemoLeadPrompt] = useState(false);
  const [demoLeadEmail, setDemoLeadEmail] = useState('');
  const [demoLeadError, setDemoLeadError] = useState<string | null>(null);
  const [demoLeadSaving, setDemoLeadSaving] = useState(false);
  const effectivePlan = user?.effective_plan || user?.plan;
  const subscriptionPlan = user?.subscription_plan || user?.plan || effectivePlan;
  const subscriptionAccessPhase = user?.subscription_access_phase || 'active';
  const requiresPaymentAttention = Boolean(user?.requires_payment_attention);
  const access = getAccessContext(user);
  const isOrgAdmin = access.isOrgAdmin;
  const isBillingAdmin = access.isBillingAdmin;
  const hasOperationalAccess = access.hasOperationalAccess;
  const isBillingOnly = access.isBillingOnly;
  const isRestaurantBusiness = features?.is_restaurant || ['restaurant', 'traiteur', 'boulangerie'].includes(features?.sector || '');
  const analyticsEnabled = !isRestaurantBusiness && ['dashboard', 'multi_stores', 'stock_history', 'stats', 'reports'].includes(activeTab);
  const needsEmailVerification = isLogged && user?.required_verification === 'email' && user?.can_access_web === false;
  const isSubscriptionRecoveryMode =
    isLogged &&
    user?.role !== 'admin' &&
    user?.role !== 'superadmin' &&
    user?.role !== 'supplier' &&
    ['restricted', 'read_only'].includes(subscriptionAccessPhase);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const formatDemoExpiration = (value?: string | null) => {
    if (!value) return t('demo_lead.not_available');
    return new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language || undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  };

  const hydrateAuthenticatedUser = useCallback((userData: any) => {
    setUser(userData);
    setIsLogged(true);
    if (userData?.currency) {
      localStorage.setItem('user_currency', userData.currency);
    }
    import('../services/api').then(({ settings: settingsApi }) => {
      settingsApi.get().then((s: any) => {
        if (s?.currency) localStorage.setItem('user_currency', s.currency);
        if (s?.modules) setModules(s.modules);
      }).catch(() => { });
    });
    userFeatures.get().then(setFeatures).catch(() => { });
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const userData = await auth.me();
      hydrateAuthenticatedUser(userData);
    } catch (err) {
      removeToken();
      setIsLogged(false);
      setUser(null);
    } finally {
      setInitialLoading(false);
    }
  }, [hydrateAuthenticatedUser]);

  const clearQueryParam = useCallback((key: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(key)) return;
    url.searchParams.delete(key);
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Clean up legacy demo URL params (runs once on mount)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const demoKeys = ['demo_access_token', 'demo_refresh_token', 'demo_type', 'demo_expires_at', 'demo_session_id'];
    const hasAny = demoKeys.some((k) => url.searchParams.has(k));
    if (hasAny) {
      demoKeys.forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  useEffect(() => {
    const demoIntent = searchParams.get('demo');
    if (!demoIntent) return;

    if (demoIntent !== 'enterprise') {
      clearQueryParam('demo');
      return;
    }

    if (initialLoading || isLogged || demoBootLoading) return;

    let cancelled = false;
    setDemoBootLoading(true);
    setError(null);

    demoApi.createSession('enterprise')
      .then((payload) => {
        if (cancelled) return;
        hydrateAuthenticatedUser(payload.user);
        setDemoSessionInfo(payload.demo_session);
        setDemoLeadEmail(payload.demo_session.contact_email || '');
        setShowDemoLeadPrompt(!payload.demo_session.contact_email);
        clearQueryParam('demo');
      })
      .catch((err) => {
        if (cancelled) return;
        clearQueryParam('demo');
        setError(err instanceof ApiError ? err.message : "Impossible de lancer la demo Enterprise.");
      })
      .finally(() => {
        if (cancelled) return;
        setDemoBootLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clearQueryParam, demoBootLoading, hydrateAuthenticatedUser, initialLoading, isLogged, searchParams]);

  // Load authenticated user (runs once on mount)
  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (searchParams.get('signup') === 'true') {
      setShowSignup(true);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    if (!isLogged || !user?.is_demo || !user?.demo_session_id) {
      setDemoSessionInfo(null);
      setShowDemoLeadPrompt(false);
      setDemoLeadEmail('');
      setDemoLeadError(null);
      return;
    }

    demoApi.getCurrentSession()
      .then((session) => {
        if (cancelled) return;
        setDemoSessionInfo(session);
        setDemoLeadEmail(session.contact_email || '');
        setDemoLeadError(null);
        setShowDemoLeadPrompt(!session.contact_email);
      })
      .catch(() => {
        if (cancelled) return;
        setDemoSessionInfo(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isLogged, user?.is_demo, user?.demo_session_id]);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await chatApi.getUnreadCount();
      setUnreadMessages(res.unread || 0);
    } catch {
    }
  }, []);

  useEffect(() => {
    if (!isLogged) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isLogged, fetchUnread]);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await auth.login(email, password);
      hydrateAuthenticatedUser(response.user);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : t('common.auth_error', { defaultValue: "Erreur d'authentification" }));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.logout().catch(() => undefined);
    removeToken();
    localStorage.removeItem('user_currency');
    setUser(null);
    setIsLogged(false);
  };

  const handleSaveDemoLead = async () => {
    const normalizedEmail = demoLeadEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setDemoLeadError(t('demo_lead.required'));
      return;
    }
    setDemoLeadSaving(true);
    setDemoLeadError(null);
    try {
      const updatedSession = await demoApi.captureContact(normalizedEmail);
      setDemoSessionInfo(updatedSession);
      setDemoLeadEmail(updatedSession.contact_email || normalizedEmail);
      setShowDemoLeadPrompt(false);
    } catch (err) {
      setDemoLeadError(err instanceof ApiError ? err.message : t('demo_lead.save_error'));
    } finally {
      setDemoLeadSaving(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLogged && isBillingOnly && activeTab !== 'subscription') {
      setActiveTab('subscription');
    }
  }, [activeTab, isBillingOnly, isLogged]);

  if (!mounted || !ready || initialLoading || demoBootLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-6">
        <div className="glass-card p-8 text-center max-w-md w-full">
          <div className="w-10 h-10 mx-auto mb-4 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <h1 className="text-xl font-black text-white mb-2">Preparation de la demo Enterprise</h1>
          <p className="text-slate-400 text-sm">
            Nous ouvrons votre session de demonstration sur l&apos;app web.
          </p>
        </div>
      </div>
    );
  }

  if (needsEmailVerification) {
    return (
      <VerifyEmailPanel
        user={user}
        onVerified={(verifiedUser) => {
          setUser(verifiedUser);
          userFeatures.get().then(setFeatures).catch(() => { });
          import('../services/api').then(({ settings: settingsApi }) => {
            settingsApi.get().then((s: any) => { if (s?.modules) setModules(s.modules); }).catch(() => { });
          });
        }}
        onLogout={handleLogout}
      />
    );
  }

  if (isSubscriptionRecoveryMode) {
    const planLabel = subscriptionPlan === 'enterprise' ? 'Enterprise' : subscriptionPlan === 'pro' ? 'Pro' : 'Starter';
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl glass-card p-8 md:p-10 border border-amber-500/20">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertIcon size={28} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-400 font-black">{t('home.recovery.badge')}</p>
              <h1 className="text-3xl font-black text-white tracking-tight">
                {t('home.recovery.title', { plan: planLabel })}
              </h1>
            </div>
          </div>
          <p className="text-slate-300 leading-relaxed text-sm md:text-base mb-6">
            {t('home.recovery.desc')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-2">{t('home.recovery.phase')}</p>
              <p className="text-white font-bold capitalize">{subscriptionAccessPhase}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-2">{t('home.recovery.grace_end')}</p>
              <p className="text-white font-bold">{user?.grace_until ? new Date(user.grace_until).toLocaleDateString('fr-FR') : '—'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-2">{t('home.recovery.read_only')}</p>
              <p className="text-white font-bold">{user?.read_only_after ? new Date(user.read_only_after).toLocaleDateString('fr-FR') : '—'}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-8">
            <p className="text-sm text-slate-300 mb-2">{t('home.recovery.can_do')}</p>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>{t('home.recovery.can_do_1')}</li>
              <li>{t('home.recovery.can_do_2')}</li>
              <li>{t('home.recovery.can_do_3')}</li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setActiveTab('subscription')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white font-black tracking-tight hover:scale-[1.01] transition-transform"
            >
              <Zap size={18} /> {t('home.recovery.cta_regularize')}
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-slate-200 font-black tracking-tight hover:bg-white/10"
            >
              <LogOut size={18} /> {t('home.recovery.cta_logout')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Guard Enterprise : Starter/Pro n'ont pas accès au web
  if (isLogged && user?.role !== 'admin' && user?.role !== 'superadmin' && user?.role !== 'supplier' && effectivePlan !== 'enterprise') {
    const currentPlan = effectivePlan === 'pro' ? 'Pro' : 'Starter';

    const WEB_MODULES_CONFIG = [
      { key: 'dashboard', icon: LayoutDashboard, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', count: 5 },
      { key: 'inventory', icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', count: 6 },
      { key: 'pos', icon: ShoppingCart, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', count: 6 },
      { key: 'accounting', icon: LineChart, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', count: 6 },
      { key: 'crm', icon: Users, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', count: 6 },
      { key: 'orders', icon: ClipboardList, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', count: 5 },
      { key: 'suppliers', icon: Truck, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', count: 5 },
      { key: 'alerts', icon: Bell, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', count: 5 },
      { key: 'staff', icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', count: 5 },
      { key: 'multi_stores', icon: Store, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', count: 6 },
      { key: 'history', icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', count: 5 },
      { key: 'settings', icon: Settings2, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', count: 5 },
    ];

    const renderCell = (val: boolean | string) => {
      if (val === true) return <CheckCircle2 size={16} className="text-emerald-400 mx-auto" />;
      if (val === false) return <XCircle size={16} className="text-slate-700 mx-auto" />;
      if (val === 'unlimited') return <span className="text-xs font-bold text-slate-300">{t('home.compare.unlimited')}</span>;
      if (val === 'limited') return <span className="text-xs font-bold text-slate-300">{t('home.compare.limited')}</span>;
      return <span className="text-xs font-bold text-slate-300">{val}</span>;
    };

    return (
      <main className="min-h-screen bg-[#0F172A] overflow-y-auto">
        {/* ── HERO ── */}
        <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-primary/10 to-transparent">
          <div className="max-w-6xl mx-auto px-6 py-14 text-center">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 text-xs font-bold px-4 py-2 rounded-full border border-amber-500/20 mb-6">
              <ShieldCheck size={13} /> {t('home.upsell.badge', { plan: currentPlan })}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
              {t('home.upsell.h1')}<br />
              <span className="text-primary">{t('home.upsell.h1_gradient')}</span>
            </h1>
            <p className="text-slate-400 max-w-2xl mx-auto text-base mb-8">
              {t('home.upsell.subtitle')}
            </p>
            <div className="max-w-3xl mx-auto rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left mb-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-3">{t('home.upsell.mobile_note_title')}</p>
              <p className="text-sm text-slate-300 leading-6">{t('home.upsell.mobile_note_desc')}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                {BUSINESS_TYPE_GROUP_IDS.map((id) => (
                  <div key={id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-black text-white mb-1">{t(`home.business_groups.${id}.title`)}</p>
                    <p className="text-[11px] text-slate-500 leading-5">{t(`home.business_groups.${id}.description`)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={MOBILE_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold rounded-xl transition-all text-sm"
              >
                <Package size={16} /> {t('home.upsell.cta_mobile')}
              </a>
              <a
                href="/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-black rounded-xl transition-all shadow-xl shadow-primary/25 text-sm"
              >
                <Zap size={16} /> {t('home.upsell.cta_upgrade')}
              </a>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold rounded-xl transition-all text-sm"
              >
                <LogOut size={14} /> {t('home.upsell.cta_logout')}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-12 space-y-16">

          {/* ── MODULES ── */}
          <section>
            <div className="text-center mb-10">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">{t('home.upsell.modules_eyebrow')}</p>
              <h2 className="text-2xl font-black text-white">{t('home.upsell.modules_title')}</h2>
              <p className="text-slate-500 text-sm mt-1">{t('home.upsell.modules_subtitle')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {WEB_MODULES_CONFIG.map(mod => {
                const Icon = mod.icon;
                const features = Array.from({ length: mod.count }, (_, i) => t(`home.modules.${mod.key}.f${i + 1}`));
                return (
                  <div key={mod.key} className={`rounded-2xl border ${mod.border} ${mod.bg} p-5 flex flex-col gap-3`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-black/30">
                        <Icon size={18} className={mod.color} />
                      </div>
                      <div>
                        <h3 className={`text-sm font-black ${mod.color}`}>{t(`home.modules.${mod.key}.name`)}</h3>
                        <p className="text-[11px] text-slate-500">{t(`home.modules.${mod.key}.tagline`)}</p>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {features.map(f => (
                        <li key={f} className="flex items-start gap-2">
                          <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-xs text-slate-300 leading-relaxed">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── COMPARISON TABLE ── */}
          <section>
            <div className="text-center mb-8">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">{t('home.upsell.compare_eyebrow')}</p>
              <h2 className="text-2xl font-black text-white">{t('home.upsell.compare_title')}</h2>
            </div>
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <div className="grid grid-cols-4 bg-white/5 border-b border-white/10">
                <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">{t('home.compare.col_feature')}</div>
                <div className="p-4 text-center">
                  {user?.plan === 'starter' && (
                    <span className="inline-block bg-amber-500/20 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full mb-1">{t('home.compare.current_plan')}</span>
                  )}
                  <p className="text-sm font-black text-slate-400">Starter</p>
                </div>
                <div className="p-4 text-center">
                  {user?.plan === 'pro' && (
                    <span className="inline-block bg-amber-500/20 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full mb-1">{t('home.compare.current_plan')}</span>
                  )}
                  <p className="text-sm font-black text-blue-400">Pro</p>
                </div>
                <div className="p-4 text-center relative">
                  <span className="inline-block bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full mb-1">{t('home.compare.recommended')}</span>
                  <p className="text-sm font-black text-primary">Enterprise</p>
                </div>
              </div>
              {PLAN_COMPARISON_ROWS.map((row, i) => (
                <div key={row.key} className={`grid grid-cols-4 border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                  <div className="p-3.5 text-xs text-slate-300 flex items-center">{t(`home.compare.${row.key}`)}</div>
                  <div className="p-3.5 flex items-center justify-center">{renderCell(row.starter)}</div>
                  <div className="p-3.5 flex items-center justify-center">{renderCell(row.pro)}</div>
                  <div className="p-3.5 flex items-center justify-center bg-primary/5">{renderCell(row.enterprise)}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── FINAL CTA ── */}
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
            <Star size={32} className="text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white mb-2">{t('home.upsell.cta_final_title')}</h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto mb-6">{t('home.upsell.cta_final_desc')}</p>
            <a
              href="/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-xl transition-all shadow-xl shadow-primary/30 text-base"
            >
              <Zap size={18} /> {t('home.upsell.cta_final_btn')}
            </a>
            <p className="text-slate-600 text-xs mt-4">
              {t('home.upsell.mobile_remains', { plan: currentPlan })}
            </p>
          </section>

        </div>
      </main>
    );
  }

  if (isLogged && user?.role !== 'admin' && user?.role !== 'superadmin' && user?.role !== 'supplier' && !isBillingAdmin && !hasOperationalAccess) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-6">
        <div className="max-w-md glass-card p-8 text-center">
          <h1 className="text-2xl font-bold mb-3">{t('home.limited_access.title')}</h1>
          <p className="text-slate-400 text-sm leading-6">{t('home.limited_access.desc')}</p>
        </div>
      </div>
    );
  }

  /*

  if (isLogged && user?.role !== ‘admin’ && user?.role !== ‘superadmin’ && user?.role !== ‘supplier’ && !isBillingAdmin && !hasOperationalAccess) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-6">
        <div className="max-w-md glass-card p-8 text-center">
          <h1 className="text-2xl font-bold mb-3">{t(‘home.limited_access.title’)}</h1>
          <p className="text-slate-400 text-sm leading-6">{t(‘home.limited_access.desc’)}</p>
        </div>
      </div>
    );
  }

  */

  if (isLogged) {
    return (
      <AnalyticsFiltersProvider enabled={analyticsEnabled}>
        <>
          {showDemoLeadPrompt && (
            <div className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#111827] shadow-2xl shadow-black/40 overflow-hidden">
                <div className="px-6 py-5 border-b border-white/10 bg-white/5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-primary font-black mb-2">{t('demo_lead.badge')}</p>
                  <h2 className="text-2xl font-black text-white tracking-tight">{t('demo_lead.title')}</h2>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-sm text-slate-300 leading-6">
                    {t('demo_lead.description')}
                  </p>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                    <span className="font-semibold text-white">{demoSessionInfo?.label || t('demo_lead.default_label')}</span>
                    <span className="text-slate-500"> · </span>
                    {t('demo_lead.expires_at', { value: formatDemoExpiration(demoSessionInfo?.expires_at) })}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="demo-contact-email" className="block text-xs uppercase tracking-widest text-slate-500 font-black">
                      {t('demo_lead.contact_label')}
                    </label>
                    <input
                      id="demo-contact-email"
                      type="email"
                      value={demoLeadEmail}
                      onChange={(e) => setDemoLeadEmail(e.target.value)}
                      placeholder={t('demo_lead.contact_placeholder')}
                      autoComplete="email"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/40"
                    />
                  </div>
                  {demoLeadError ? <p className="text-sm text-rose-300">{demoLeadError}</p> : null}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDemoLeadPrompt(false)}
                      className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-200 font-black"
                    >
                      {t('demo_lead.later')}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDemoLead}
                      disabled={demoLeadSaving}
                      className="flex-1 rounded-2xl bg-primary px-4 py-3 text-white font-black disabled:opacity-60"
                    >
                      {demoLeadSaving ? t('demo_lead.saving') : t('demo_lead.save')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <main className="min-h-screen bg-[#0F172A] md:pl-64 flex">
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onLogout={handleLogout}
              user={user}
              features={features || undefined}
              modules={modules}
              isMobileOpen={isSidebarOpen}
              onMobileClose={() => setIsSidebarOpen(false)}
              onOpenChat={() => setIsChatOpen(true)}
              onOpenSupport={() => setIsSupportOpen(true)}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              unreadMessages={unreadMessages}
              unreadNotifications={unreadNotifications}
            />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
              <TrialBanner onNavigateToSubscription={() => setActiveTab('subscription')} userRole={user?.role} />
              {/* Mobile top bar */}
              <div className="md:hidden flex items-center gap-3 p-4 border-b border-white/10 bg-[#0F172A] shrink-0">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                  <Menu size={20} />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                    <Package className="text-white" size={14} />
                  </div>
                  <span className="text-white font-bold text-gradient">Stockman</span>
                </div>
              </div>

              {analyticsEnabled && (
                <div className="shrink-0">
                  <GlobalFiltersBar />
                </div>
              )}

              {/* Page content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'dashboard' && (
                  isRestaurantBusiness
                    ? <Dashboard onNavigate={setActiveTab} features={features} />
                    : <ExecutiveDashboard onNavigate={setActiveTab} />
                )}
                {activeTab === 'multi_stores' && <MultiStoreDashboard user={user} />}
                {activeTab === 'pos' && <POS />}
                {activeTab === 'inventory' && <Inventory />}
                {activeTab === 'orders' && <Orders />}
                {activeTab === 'accounting' && <Accounting />}
                {activeTab === 'reports' && <ReportsLibrary user={user} features={features} />}
                {activeTab === 'crm' && <CRM user={user} />}
                {activeTab === 'staff' && <Staff />}
                {activeTab === 'suppliers' && <Suppliers />}
                {activeTab === 'activity' && <Activity />}
                {activeTab === 'alerts' && <Alerts />}
                {activeTab === 'stock_history' && <StockHistory />}
                {activeTab === 'stats' && <AbcAnalysis />}
                {activeTab === 'inventory_counting' && <InventoryCounting />}
                {activeTab === 'expiry_alerts' && <ExpiryAlerts />}
                {activeTab === 'subscription' && <Subscription />}
                {activeTab === 'production' && <ProductionView onNavigate={setActiveTab} />}
                {activeTab === 'tables' && <TableManagement />}
                {activeTab === 'reservations' && <Reservations />}
                {activeTab === 'kitchen' && <KitchenDisplay />}
                {activeTab === 'admin' && <AdminDashboard />}
                {activeTab === 'supplier_portal' && <SupplierPortal />}
                {activeTab === 'settings' && <Settings user={user} />}
              </div>
            </div>

            {/* Floating AI chat button */}
            <button
              onClick={() => setIsChatOpen(true)}
              className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95"
            >
              <Sparkles size={18} />
              <span className="text-sm">{t('home.ai_assistant')}</span>
            </button>

            {/* AI chat panel */}
            <AiChatPanel
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              currentUser={user}
              features={features}
            />

            {/* Support panel */}
            <SupportPanel
              isOpen={isSupportOpen}
              onClose={() => setIsSupportOpen(false)}
            />

            {/* Notification center */}
            <NotificationCenter
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              onUnreadChange={setUnreadNotifications}
            />

          </main>
        </>
      </AnalyticsFiltersProvider>
    );
  }

  return (
    <>
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#0F172A]">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left Side: Brand & Welcome */}
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Package className="text-white" size={28} />
              </div>
              <h1 className="text-5xl text-gradient tracking-tight">Stockman</h1>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="text-4xl font-extrabold text-white leading-tight">
                {t('home.brand.h2')} <br />
                <span className="text-secondary">{t('home.brand.h2_gradient')}</span>
              </h2>
              <p className="text-xl text-muted leading-relaxed max-w-lg">
                {t('home.brand.subtitle')}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-3">{t('home.brand.business_label')}</p>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_TYPE_GROUP_IDS.flatMap((id) =>
                  (t(`home.business_groups.${id}.tags`, { returnObjects: true }) as string[])
                ).map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-400 leading-6 mt-4">{t('home.brand.mobile_note')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
              <div className="flex items-center gap-4 group">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors">
                  <LayoutDashboard size={24} className="text-primary" />
                </div>
                <span className="text-lg font-medium text-slate-200">{t('home.brand.feature_1')}</span>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors">
                  <LineChart size={24} className="text-primary" />
                </div>
                <span className="text-lg font-medium text-slate-200">{t('home.brand.feature_2')}</span>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors">
                  <ShoppingCart size={24} className="text-primary" />
                </div>
                <span className="text-lg font-medium text-slate-200">{t('home.brand.feature_3')}</span>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors">
                  <ShieldCheck size={24} className="text-primary" />
                </div>
                <span className="text-lg font-medium text-slate-200">{t('home.brand.feature_4')}</span>
              </div>
            </div>
          </div>

          {/* Right Side: Auth Card */}
          <div className="glass-card flex flex-col gap-6 shadow-2xl relative overflow-hidden group p-8">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all"></div>

            <div className="flex flex-col gap-1 relative z-10">
              <h3 className="text-2xl font-bold text-white">{t('home.login.title')}</h3>
              <p className="text-slate-400">{t('home.login.subtitle')}</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm relative z-10">
                <AlertIcon size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-4 relative z-10">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300">{t('home.login.email_label')}</label>
                <input
                  type="email"
                  placeholder={t('home.login.email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-300">{t('home.login.password_label')}</label>
                  <a href="#" className="text-xs text-primary hover:underline">{t('home.login.forgot_password')}</a>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 relative z-10">
              <button
                onClick={handleLogin}
                disabled={loading}
                className={`btn-primary w-full py-4 rounded-xl flex items-center justify-center gap-3 text-lg shadow-xl shadow-primary/20 ${loading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('home.login.btn_loading')}
                  </>
                ) : (
                  <><LogIn size={20} /> {t('home.login.btn_login')}</>
                )}
              </button>
              <div className="text-center">
                <span className="text-sm text-muted">{t('home.login.create_account')}{' '}
                  <button
                    onClick={() => setShowSignup(true)}
                    className="text-primary font-bold hover:underline bg-transparent border-none cursor-pointer p-0"
                  >{t('home.login.create_account_link')}</button>
                </span>
                <div className="mt-3 flex items-center justify-center gap-3 text-xs">
                  <a href="/pricing" className="text-slate-400 hover:text-white transition-colors">{t('home.login.compare_plans')}</a>
                  <span className="text-white/10">|</span>
                  <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">{t('home.login.open_mobile')}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showSignup && (
        <EnterpriseSignupModal
          onClose={() => setShowSignup(false)}
          onSuccess={(response: AuthResponse) => {
            setShowSignup(false);
            setEmail(response.user.email);
            setPassword('');
            hydrateAuthenticatedUser(response.user);
          }}
        />
      )}
    </>
  );
}
