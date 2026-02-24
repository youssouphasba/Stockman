'use client';

import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Package, LogIn, LayoutDashboard, LineChart, ShoppingCart, ShieldCheck, AlertCircle as AlertIcon, Menu, Users, Truck, Store, Settings2, BarChart3, Bell, ClipboardList, ScanBarcode, ArrowLeftRight, Star, CheckCircle2, XCircle, Zap, LogOut, Sparkles } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Dashboard from "../components/Dashboard";
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
import ChatModal from "../components/ChatModal";
import AiChatPanel from "../components/AiChatPanel";
import { auth, chat as chatApi, ApiError } from "../services/api";

export default function Home() {
  const { t, ready } = useTranslation();
  const [isLogged, setIsLogged] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('demo@stockman.pro');
  const [password, setPassword] = useState('password123');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('shopkeeper');
  const [businessType, setBusinessType] = useState('');
  const [howDidYouHear, setHowDidYouHear] = useState('');
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sidebar & Chat state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Check for existing session
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      loadUser();
    }
  }, []);

  const loadUser = async () => {
    try {
      const userData = await auth.me();
      setUser(userData);
      setIsLogged(true);
    } catch (err) {
      localStorage.removeItem('auth_token');
      setIsLogged(false);
    }
  };

  // Poll unread message count every 30 seconds when logged in
  const fetchUnread = useCallback(async () => {
    try {
      const res = await chatApi.getUnreadCount();
      setUnreadMessages(res.unread || 0);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    if (!isLogged) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isLogged, fetchUnread]);

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError(null);
    setPassword('');
    setConfirmPassword('');
    if (m === 'register') { setEmail(''); }
    else { setEmail('demo@stockman.pro'); setPassword('password123'); }
  };

  const handleRegister = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password) return setError('Nom, email et mot de passe sont requis.');
    if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    if (password !== confirmPassword) return setError('Les mots de passe ne correspondent pas.');
    setLoading(true);
    try {
      const response = await auth.register({
        email, password, name, role,
        phone: phone || undefined,
        business_type: businessType || undefined,
        how_did_you_hear: howDidYouHear || undefined,
      });
      localStorage.setItem('auth_token', response.access_token);
      setUser(response.user);
      setIsLogged(true);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await auth.login(email, password);
      localStorage.setItem('auth_token', response.access_token);
      setUser(response.user);
      setIsLogged(true);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    auth.logout();
    setUser(null);
    setIsLogged(false);
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !ready) return <div className="min-h-screen bg-[#0F172A]" />;

  // Guard Enterprise : Starter/Pro n'ont pas accès au web
  if (isLogged && user?.role !== 'admin' && !['enterprise', 'premium'].includes(user?.plan)) {
    const currentPlan = user?.plan === 'pro' ? 'Pro' : 'Starter';

    const WEB_MODULES = [
      {
        icon: LayoutDashboard, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20',
        name: 'Dashboard', tagline: 'Pilotage en temps réel',
        features: [
          'KPIs instantanés : CA, ventes, marge nette',
          'Graphiques de revenus sur 7j / 30j / 90j',
          'Alertes stock bas et péremptions en un coup d\'œil',
          'Résumé IA quotidien de votre activité',
          'Comparaison automatique période sur période',
        ],
      },
      {
        icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
        name: 'Inventaire', tagline: 'Gestion de stock complète',
        features: [
          'Import en masse via CSV ou Excel',
          'Scan code-barres intégré dans le navigateur',
          'Filtres par emplacement, catégorie, fournisseur',
          'Gestion des lots, numéros de série et péremptions',
          'Inventaire comptable et comptage physique guidé',
          'Analyse ABC (classification produits A/B/C)',
        ],
      },
      {
        icon: ShoppingCart, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20',
        name: 'Caisse (POS)', tagline: 'Point de vente professionnel',
        features: [
          'Interface caisse rapide avec recherche produit',
          'Remises en % ou montant fixe validées serveur',
          'Paiements partagés : espèces + mobile + carte',
          'Multi-terminaux : caisse 1, caisse 2… sélectionnable',
          'Retours sur vente avec génération d\'avoir',
          'Reçus personnalisés : logo, nom, message de pied',
        ],
      },
      {
        icon: LineChart, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
        name: 'Comptabilité', tagline: 'Finances & reporting avancé',
        features: [
          'Compte de résultat P&L : revenus, coûts, bénéfice',
          'Gestion des dépenses par catégorie avec édition',
          'Valeur du stock au coût et à la vente',
          'Onglets : paiements, pertes/casses, charges',
          'Classement des produits les plus rentables',
          'Export CSV des données financières filtrées',
        ],
      },
      {
        icon: Users, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20',
        name: 'CRM Clients', tagline: 'Fidélisation & marketing',
        features: [
          'Segmentation automatique Bronze / Silver / Gold',
          'Bannière anniversaires clients (7 jours à venir)',
          'Historique complet des achats par client',
          'Tableau de bord : panier moyen, clients inactifs',
          'Campagnes de fidélité et programmes de points',
          'Export de la liste clients en CSV (filtres actifs)',
        ],
      },
      {
        icon: ClipboardList, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20',
        name: 'Commandes', tagline: 'Réapprovisionnement intelligent',
        features: [
          'Création de bons de commande fournisseurs',
          'Suggestions de réapprovisionnement automatiques',
          'Suivi statut : brouillon → envoyé → reçu',
          'Réception partielle avec mise à jour stock auto',
          'Historique commandes avec PDF téléchargeable',
        ],
      },
      {
        icon: Truck, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20',
        name: 'Fournisseurs', tagline: 'Portail fournisseur dédié',
        features: [
          'Fiche fournisseur complète (contact, conditions)',
          'Portail web sécurisé pour chaque fournisseur',
          'Consultation du catalogue et des prix fournisseur',
          'Historique des échanges et documents partagés',
          'Intégration directe avec les commandes',
        ],
      },
      {
        icon: Bell, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20',
        name: 'Alertes', tagline: 'Surveillance proactive',
        features: [
          'Alertes stock bas configurables par produit',
          'Alertes péremption : 7j, 14j, 30j avant expiry',
          'Journal des alertes avec historique complet',
          'Seuils personnalisables par article ou catégorie',
          'Notifications push mobile (Pro + Enterprise)',
        ],
      },
      {
        icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20',
        name: 'Équipe', tagline: 'Gestion du personnel & rôles',
        features: [
          '6 modules de permission granulaires (none/read/write)',
          'Templates de rôles : caissier, comptable, manager…',
          'Délégation : un manager peut gérer l\'équipe',
          'Anti-escalade : impossible de créer un super-admin',
          'Audit log complet de toutes les actions équipe',
        ],
      },
      {
        icon: Store, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20',
        name: 'Multi-Boutiques', tagline: 'Vue consolidée & transferts',
        features: [
          'Dashboard consolidé : CA total, toutes boutiques',
          'Tableau comparatif des performances par boutique',
          'Transfert de stock entre boutiques en 1 clic',
          'Paramètres individuels par boutique (devise, reçu)',
          'Basculer d\'une boutique à l\'autre instantanément',
          'Boutiques illimitées (vs 1 Starter, 2 Pro)',
        ],
      },
      {
        icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20',
        name: 'Historique & Analyse', tagline: 'Traçabilité totale',
        features: [
          'Historique complet des mouvements de stock',
          'Analyse ABC : concentrer les efforts sur les produits A',
          'Rapport de pertes et ajustements d\'inventaire',
          'Filtres avancés : date, produit, employé, boutique',
          'Export complet pour audit comptable',
        ],
      },
      {
        icon: Settings2, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20',
        name: 'Paramètres', tagline: 'Personnalisation totale',
        features: [
          'Emplacements de stock : rayon A, réserve, entrepôt…',
          'Multi-terminaux par boutique : caisse 1, drive…',
          'Personnalisation des reçus (logo, en-tête, pied)',
          'Devise par boutique (XOF, EUR, USD, GHS…)',
          'Règles de rappel et notifications automatiques',
        ],
      },
    ];

    const COMPARE = [
      { feature: 'Application mobile complète', starter: true, pro: true, enterprise: true },
      { feature: 'Boutiques', starter: '1', pro: '2', enterprise: 'Illimité' },
      { feature: 'Utilisateurs / staff', starter: '1', pro: '5', enterprise: 'Illimité' },
      { feature: 'IA (Assistant Stockman)', starter: 'Limité', pro: 'Illimité', enterprise: 'Illimité' },
      { feature: 'Application web back-office', starter: false, pro: false, enterprise: true },
      { feature: 'Dashboard & reporting web', starter: false, pro: false, enterprise: true },
      { feature: 'Caisse POS web multi-terminaux', starter: false, pro: false, enterprise: true },
      { feature: 'Comptabilité P&L avancée', starter: false, pro: false, enterprise: true },
      { feature: 'CRM avancé & anniversaires', starter: false, pro: false, enterprise: true },
      { feature: 'Commandes fournisseurs web', starter: false, pro: false, enterprise: true },
      { feature: 'Vue multi-boutiques consolidée', starter: false, pro: false, enterprise: true },
      { feature: 'Transfert de stock inter-boutiques', starter: false, pro: false, enterprise: true },
      { feature: 'Gestion équipe & permissions', starter: false, pro: false, enterprise: true },
      { feature: 'Audit log des actions', starter: false, pro: false, enterprise: true },
      { feature: 'Emplacements de stock (web)', starter: false, pro: false, enterprise: true },
    ];

    const renderCell = (val: boolean | string) => {
      if (val === true) return <CheckCircle2 size={16} className="text-emerald-400 mx-auto" />;
      if (val === false) return <XCircle size={16} className="text-slate-700 mx-auto" />;
      return <span className="text-xs font-bold text-slate-300">{val}</span>;
    };

    return (
      <main className="min-h-screen bg-[#0F172A] overflow-y-auto">
        {/* ── HERO ── */}
        <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-primary/10 to-transparent">
          <div className="max-w-6xl mx-auto px-6 py-14 text-center">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 text-xs font-bold px-4 py-2 rounded-full border border-amber-500/20 mb-6">
              <ShieldCheck size={13} /> Plan actuel : <strong>{currentPlan}</strong> — accès mobile uniquement
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
              Votre back-office professionnel,<br />
              <span className="text-primary">disponible partout sur le web</span>
            </h1>
            <p className="text-slate-400 max-w-2xl mx-auto text-base mb-8">
              Le plan <strong className="text-white">Enterprise</strong> débloque l'application web complète de Stockman —
              12 modules puissants pour piloter votre commerce depuis n'importe quel ordinateur, tablette ou écran.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://stockmanapp.com/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-black rounded-xl transition-all shadow-xl shadow-primary/25 text-sm"
              >
                <Zap size={16} /> Passer à Enterprise maintenant
              </a>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold rounded-xl transition-all text-sm"
              >
                <LogOut size={14} /> Déconnexion
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-12 space-y-16">

          {/* ── MODULES ── */}
          <section>
            <div className="text-center mb-10">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Ce qui vous attend</p>
              <h2 className="text-2xl font-black text-white">12 modules professionnels inclus</h2>
              <p className="text-slate-500 text-sm mt-1">Chaque module conçu pour les commerces qui veulent aller plus loin.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {WEB_MODULES.map(mod => {
                const Icon = mod.icon;
                return (
                  <div key={mod.name} className={`rounded-2xl border ${mod.border} ${mod.bg} p-5 flex flex-col gap-3`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-black/30`}>
                        <Icon size={18} className={mod.color} />
                      </div>
                      <div>
                        <h3 className={`text-sm font-black ${mod.color}`}>{mod.name}</h3>
                        <p className="text-[11px] text-slate-500">{mod.tagline}</p>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {mod.features.map(f => (
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
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Comparaison des plans</p>
              <h2 className="text-2xl font-black text-white">Tout ce qui est inclus</h2>
            </div>
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-4 bg-white/5 border-b border-white/10">
                <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Fonctionnalité</div>
                <div className="p-4 text-center">
                  {user?.plan === 'starter' && (
                    <span className="inline-block bg-amber-500/20 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full mb-1">Plan actuel</span>
                  )}
                  <p className="text-sm font-black text-slate-400">Starter</p>
                </div>
                <div className="p-4 text-center">
                  {user?.plan === 'pro' && (
                    <span className="inline-block bg-amber-500/20 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full mb-1">Plan actuel</span>
                  )}
                  <p className="text-sm font-black text-blue-400">Pro</p>
                </div>
                <div className="p-4 text-center relative">
                  <span className="inline-block bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full mb-1">Recommandé</span>
                  <p className="text-sm font-black text-primary">Enterprise</p>
                </div>
              </div>
              {/* Rows */}
              {COMPARE.map((row, i) => (
                <div key={row.feature} className={`grid grid-cols-4 border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                  <div className="p-3.5 text-xs text-slate-300 flex items-center">{row.feature}</div>
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
            <h2 className="text-2xl font-black text-white mb-2">Prêt à passer au niveau supérieur ?</h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto mb-6">
              Rejoignez les commerces qui utilisent le back-office Enterprise pour prendre de meilleures décisions, gérer leur équipe efficacement et développer leur activité.
            </p>
            <a
              href="https://stockmanapp.com/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-xl transition-all shadow-xl shadow-primary/30 text-base"
            >
              <Zap size={18} /> Voir les tarifs Enterprise
            </a>
            <p className="text-slate-600 text-xs mt-4">
              Votre application mobile <strong className="text-slate-500">{currentPlan}</strong> reste disponible en attendant.
            </p>
          </section>

        </div>
      </main>
    );
  }

  if (isLogged) {
    return (
      <main className="min-h-screen bg-[#0F172A] md:pl-64 flex">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
          user={user}
          isMobileOpen={isSidebarOpen}
          onMobileClose={() => setIsSidebarOpen(false)}
          onOpenChat={() => setIsChatOpen(true)}
          unreadMessages={unreadMessages}
        />

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
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

          {/* Page content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
            {activeTab === 'multi_stores' && <MultiStoreDashboard />}
            {activeTab === 'pos' && <POS />}
            {activeTab === 'inventory' && <Inventory />}
            {activeTab === 'orders' && <Orders />}
            {activeTab === 'accounting' && <Accounting />}
            {activeTab === 'crm' && <CRM />}
            {activeTab === 'staff' && <Staff />}
            {activeTab === 'suppliers' && <Suppliers />}
            {activeTab === 'activity' && <Activity />}
            {activeTab === 'alerts' && <Alerts />}
            {activeTab === 'stock_history' && <StockHistory />}
            {activeTab === 'stats' && <AbcAnalysis />}
            {activeTab === 'inventory_counting' && <InventoryCounting />}
            {activeTab === 'expiry_alerts' && <ExpiryAlerts />}
            {activeTab === 'subscription' && <Subscription />}
            {activeTab === 'admin' && <AdminDashboard />}
            {activeTab === 'supplier_portal' && <SupplierPortal />}
            {activeTab === 'settings' && <Settings />}
          </div>
        </div>

        {/* Floating AI chat button */}
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95"
        >
          <Sparkles size={18} />
          <span className="text-sm">Assistant IA</span>
        </button>

        {/* AI chat panel */}
        <AiChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          currentUser={user}
        />

      </main>
    );
  }

  return (
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
              Votre commerce, <br />
              <span className="text-secondary">maîtrisé et optimisé.</span>
            </h2>
            <p className="text-xl text-muted leading-relaxed max-w-lg">
              La puissance de la gestion de stock intelligente, maintenant disponible sur grand écran pour une expertise totale.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
            <div className="flex items-center gap-4 group">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors">
                <LayoutDashboard size={24} className="text-primary" />
              </div>
              <span className="text-lg font-medium text-slate-200">Tableau de Bord Profond</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors">
                <LineChart size={24} className="text-primary" />
              </div>
              <span className="text-lg font-medium text-slate-200">Analyses IA & Prévisions</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors">
                <ShoppingCart size={24} className="text-primary" />
              </div>
              <span className="text-lg font-medium text-slate-200">Ventes & CRM Intégrés</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors">
                <ShieldCheck size={24} className="text-primary" />
              </div>
              <span className="text-lg font-medium text-slate-200">Sécurisé & Synchronisé</span>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="glass-card flex flex-col gap-6 shadow-2xl relative overflow-hidden group p-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all"></div>

          <div className="flex flex-col gap-1 relative z-10">
            <h3 className="text-2xl font-bold text-white">{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h3>
            <p className="text-slate-400">{mode === 'login' ? 'Accédez à votre espace professionnel' : 'Essai gratuit 3 mois — sans carte bancaire'}</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm relative z-10">
              <AlertIcon size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-4 relative z-10">
            {mode === 'register' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300">Nom complet</label>
                <input
                  type="text"
                  placeholder="Votre nom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-300">Email professionnel</label>
              <input
                type="email"
                placeholder="nom@boutique.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>

            {mode === 'register' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300">Téléphone WhatsApp <span className="text-slate-500 font-normal">(optionnel — détecte la devise)</span></label>
                <input
                  type="tel"
                  placeholder="+221 77 000 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-300">Mot de passe</label>
                {mode === 'login' && <a href="#" className="text-xs text-primary hover:underline">Oublié ?</a>}
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => mode === 'login' && e.key === 'Enter' && handleLogin()}
                className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>

            {mode === 'register' && (<>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300">Confirmer le mot de passe</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300">Vous êtes</label>
                <div className="flex gap-2">
                  {[{ val: 'shopkeeper', label: 'Commerçant' }, { val: 'supplier', label: 'Fournisseur' }].map(r => (
                    <button
                      key={r.val}
                      onClick={() => setRole(r.val)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${role === r.val ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                    >{r.label}</button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300">Type de commerce <span className="text-slate-500 font-normal">(optionnel)</span></label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                >
                  <option value="" className="bg-[#1E293B]">Choisir...</option>
                  {['Boutique générale', 'Épicerie / Alimentation', 'Quincaillerie', 'Pharmacie', 'Grossiste', 'Restaurant / Snack', 'Autre'].map(bt => (
                    <option key={bt} value={bt} className="bg-[#1E293B]">{bt}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300">Comment avez-vous connu Stockman ? <span className="text-slate-500 font-normal">(optionnel)</span></label>
                <select
                  value={howDidYouHear}
                  onChange={(e) => setHowDidYouHear(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                >
                  <option value="" className="bg-[#1E293B]">Choisir...</option>
                  {['Bouche à oreille', 'Réseau social', 'Google', 'Un ami / collègue', 'Autre'].map(h => (
                    <option key={h} value={h} className="bg-[#1E293B]">{h}</option>
                  ))}
                </select>
              </div>
            </>)}
          </div>

          <div className="flex flex-col gap-4 relative z-10">
            <button
              onClick={mode === 'login' ? handleLogin : handleRegister}
              disabled={loading}
              className={`btn-primary w-full py-4 rounded-xl flex items-center justify-center gap-3 text-lg shadow-xl shadow-primary/20 ${loading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Connexion...' : 'Création...'}
                </>
              ) : mode === 'login' ? (
                <><LogIn size={20} /> Se connecter</>
              ) : (
                <><LogIn size={20} /> Créer mon compte</>
              )}
            </button>
            <div className="text-center">
              {mode === 'login' ? (
                <span className="text-sm text-muted">Pas encore membre ?{' '}
                  <button onClick={() => switchMode('register')} className="text-primary font-bold hover:underline">S'inscrire</button>
                </span>
              ) : (
                <span className="text-sm text-muted">Déjà membre ?{' '}
                  <button onClick={() => switchMode('login')} className="text-primary font-bold hover:underline">Se connecter</button>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
