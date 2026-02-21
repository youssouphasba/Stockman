'use client';

import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Package, LogIn, LayoutDashboard, LineChart, ShoppingCart, ShieldCheck, AlertCircle as AlertIcon, Menu } from "lucide-react";
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
import ChatModal from "../components/ChatModal";
import { auth, chat as chatApi, ApiError } from "../services/api";

export default function Home() {
  const { t, ready } = useTranslation();
  const [isLogged, setIsLogged] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [email, setEmail] = useState('demo@stockman.pro');
  const [password, setPassword] = useState('password123');
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

        {/* Chat modal — overlay, does not change activeTab */}
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            fetchUnread();
          }}
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

        {/* Right Side: Login Card */}
        <div className="glass-card flex flex-col gap-8 shadow-2xl relative overflow-hidden group p-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all"></div>

          <div className="flex flex-col gap-2 relative z-10">
            <h3 className="text-2xl font-bold text-white">Connexion</h3>
            <p className="text-slate-400">Accédez à votre espace professionnel</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm">
              <AlertIcon size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-5 relative z-10">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-300">Email professionnel</label>
              <input
                type="email"
                placeholder="nom@boutique.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-300">Mot de passe</label>
                <a href="#" className="text-xs text-primary hover:underline">Oublié ?</a>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
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
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={20} />
              )}
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
            <div className="text-center">
              <span className="text-sm text-muted">Pas encore membre ? <a href="#" className="text-primary font-bold hover:underline">S'inscrire</a></span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
