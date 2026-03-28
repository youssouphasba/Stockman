'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Shield, Activity, Users, Store, AlertCircle, CheckCircle2,
    RefreshCw, TrendingUp, Globe, Search, MessageSquare,
    Lock, Unlock, Trash2, Crown, Clock, Package,
    BarChart2, Zap, Bell, ChevronDown, X, CreditCard, Wallet, AlertTriangle, Mail, Newspaper
} from 'lucide-react';
import { admin as adminApi } from '../services/api';
import AdminProductsPanel from './admin/AdminProductsPanel';
import AdminCatalogPanel from './admin/AdminCatalogPanel';

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: any; icon: any; color: string; sub?: string }) {
    return (
        <div className="glass-card p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
                <div className={`p-2 rounded-xl ${color} bg-opacity-10`}>
                    <Icon size={18} className={color.replace('bg-', 'text-')} />
                </div>
            </div>
            <span className="text-3xl font-black text-white">{value}</span>
            {sub && <span className="text-xs text-slate-500">{sub}</span>}
        </div>
    );
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3500);
        return () => clearTimeout(t);
    }, [onClose]);
    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${type === 'success' ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300' : 'bg-rose-950 border-rose-500/30 text-rose-300'}`}>
            {type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-semibold">{message}</span>
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
    );
}

const PLAN_COLORS: Record<string, string> = {
    enterprise: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    pro: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    starter: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    trial: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

function formatAdminMoney(amount: any, currency?: string) {
    if (amount === null || amount === undefined || amount === '') return '—';
    const numeric = Number(amount);
    if (!Number.isFinite(numeric)) return `${amount} ${currency || ''}`.trim();
    if (currency === 'EUR') return `${numeric.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    const suffix = currency === 'XOF' || currency === 'XAF' ? 'FCFA' : (currency || '');
    return `${numeric.toLocaleString('fr-FR')} ${suffix}`.trim();
}

function formatAdminDate(value?: string | Date | null) {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatAccessPhaseLabel(phase?: string | null) {
    switch (phase) {
        case 'active':
            return 'Actif';
        case 'grace':
            return 'Gr?ce';
        case 'restricted':
            return 'Restreint';
        case 'read_only':
            return 'Lecture seule';
        default:
            return phase || '—';
    }
}

function formatSubscriptionEventType(eventType?: string | null) {
    switch (eventType) {
        case 'manual_grace_granted':
            return 'Gr?ce manuelle accord?e';
        case 'manual_read_only_enabled':
            return 'Lecture seule activ?e';
        case 'manual_read_only_disabled':
            return 'Lecture seule retir?e';
        case 'checkout_created':
            return 'Checkout cr??';
        case 'payment_succeeded':
            return 'Paiement r?ussi';
        case 'payment_failed':
            return 'Paiement ?chou?';
        case 'subscription_renewed':
            return 'Abonnement renouvel?';
        case 'subscription_expired':
            return 'Abonnement expir?';
        case 'subscription_cancelled':
            return 'Abonnement annul?';
        default:
            return eventType || '—';
    }
}

function formatDemoTypeLabel(demoType?: string | null) {
    switch (demoType) {
        case 'retail':
            return 'Commerce';
        case 'restaurant':
            return 'Restaurant';
        case 'enterprise':
            return 'Enterprise';
        default:
            return demoType || '—';
    }
}

function formatDemoSessionStatus(status?: string | null) {
    switch (status) {
        case 'active':
            return 'Active';
        case 'expired':
            return 'Expir?e';
        case 'cleaned':
            return 'Nettoy?e';
        default:
            return status || '—';
    }
}

function formatRemainingDuration(seconds?: number | null) {
    if (seconds === null || seconds === undefined) return '—';
    if (seconds <= 0) return 'Expir?e';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours <= 0) return `${minutes} min`;
    return `${hours}h ${minutes}m`;
}

export default function AdminDashboard() {
    const [activeSection, setActiveSection] = useState<'overview' | 'finance' | 'subscriptions' | 'demos' | 'users' | 'stores' | 'products' | 'catalog' | 'disputes' | 'security' | 'broadcast' | 'support' | 'leads' | 'legal'>('overview');
    const [health, setHealth] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [onboardingStats, setOnboardingStats] = useState<any>(null);
    const [otpStats, setOtpStats] = useState<any>(null);
    const [enterpriseStats, setEnterpriseStats] = useState<any>(null);
    const [conversionStats, setConversionStats] = useState<any>(null);
    const [subscriptionOverview, setSubscriptionOverview] = useState<any>(null);
    const [subscriptionAccounts, setSubscriptionAccounts] = useState<any[]>([]);
    const [subscriptionAccountsTotal, setSubscriptionAccountsTotal] = useState(0);
    const [subscriptionEvents, setSubscriptionEvents] = useState<any[]>([]);
    const [subscriptionAlerts, setSubscriptionAlerts] = useState<any>(null);
    const [demoOverview, setDemoOverview] = useState<any>(null);
    const [demoSessions, setDemoSessions] = useState<any[]>([]);
    const [demoSessionsTotal, setDemoSessionsTotal] = useState(0);
    const [users, setUsers] = useState<any[]>([]);
    const [stores, setStores] = useState<any[]>([]);
    const [disputes, setDisputes] = useState<any[]>([]);
    const [disputeFilter, setDisputeFilter] = useState<'all' | 'open' | 'resolved'>('all');
    const [securityEvents, setSecurityEvents] = useState<any[]>([]);
    const [securityStats, setSecurityStats] = useState<any>(null);
    const [verificationEvents, setVerificationEvents] = useState<any[]>([]);
    const [verificationEventsTotal, setVerificationEventsTotal] = useState(0);
    const [activeSessions, setActiveSessions] = useState<any[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [messageHistory, setMessageHistory] = useState<any[]>([]);
    const [messageHistoryTotal, setMessageHistoryTotal] = useState(0);
    const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '' });
    const [leadContacts, setLeadContacts] = useState<any[]>([]);
    const [leadSubscribers, setLeadSubscribers] = useState<any[]>([]);
    const [leadsLoading, setLeadsLoading] = useState(false);
    const [legalLoading, setLegalLoading] = useState(false);
    const [legalSaving, setLegalSaving] = useState<'cgu' | 'privacy' | null>(null);
    const [cguContent, setCguContent] = useState('');
    const [privacyContent, setPrivacyContent] = useState('');
    const [cguUpdatedAt, setCguUpdatedAt] = useState<string | null>(null);
    const [privacyUpdatedAt, setPrivacyUpdatedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [replyTicketId, setReplyTicketId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [replying, setReplying] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [subscriptionSearch, setSubscriptionSearch] = useState('');
    const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<'all' | 'active' | 'expired' | 'cancelled'>('all');
    const [subscriptionProviderFilter, setSubscriptionProviderFilter] = useState<'all' | 'stripe' | 'flutterwave' | 'revenuecat' | 'none'>('all');
    const [demoSearch, setDemoSearch] = useState('');
    const [demoStatusFilter, setDemoStatusFilter] = useState<'all' | 'active' | 'expired' | 'cleaned'>('all');
    const [demoTypeFilter, setDemoTypeFilter] = useState<'all' | 'retail' | 'restaurant' | 'enterprise'>('all');
    const [demoSurfaceFilter, setDemoSurfaceFilter] = useState<'all' | 'mobile' | 'web'>('all');
    const [verificationProviderFilter, setVerificationProviderFilter] = useState<'all' | 'firebase' | 'resend'>('all');
    const [verificationChannelFilter, setVerificationChannelFilter] = useState<'all' | 'phone' | 'email'>('all');
    const [securitySearch, setSecuritySearch] = useState('');
    const [securityView, setSecurityView] = useState<'all' | 'failed_logins' | 'successful_logins' | 'password_changes' | 'verifications' | 'sessions'>('all');
    const [messageTypeFilter, setMessageTypeFilter] = useState<'all' | 'broadcast' | 'announcement' | 'individual'>('all');
    const [grantingGraceAction, setGrantingGraceAction] = useState<string | null>(null);
    const [togglingReadOnlyAccountId, setTogglingReadOnlyAccountId] = useState<string | null>(null);
    const [refreshingPaymentLinksAccountId, setRefreshingPaymentLinksAccountId] = useState<string | null>(null);
    const [sendingReminderAccountId, setSendingReminderAccountId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [sectionRefreshTick, setSectionRefreshTick] = useState(0);
    const [togglingUser, setTogglingUser] = useState<string | null>(null);
    const [deletingUser, setDeletingUser] = useState<string | null>(null);
    const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ user_id: string; email: string; name: string } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
    };

    useEffect(() => { loadInitialData(); }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [healthRes, statsRes, onboardingRes, otpRes, enterpriseRes, conversionRes] = await Promise.all([
                adminApi.getHealth(),
                adminApi.getDetailedStats(),
                adminApi.getOnboardingStats(),
                adminApi.getOtpStats(),
                adminApi.getEnterpriseSignupStats(),
                adminApi.getConversionStats(),
            ]);
            setHealth(healthRes);
            setStats(statsRes);
            setOnboardingStats(onboardingRes);
            setOtpStats(otpRes);
            setEnterpriseStats(enterpriseRes);
            setConversionStats(conversionRes);
        } catch (err) {
            console.error('Admin data load error', err);
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        setRefreshing(true);
        try { setUsers(await adminApi.listUsers()); }
        finally { setRefreshing(false); }
    };

    const handleGrantGrace = async (accountId: string, days = 7) => {
        const noteInput = window.prompt(`Note interne optionnelle pour ${days} jours de grace`, '');
        if (noteInput === null) return;
        const actionKey = `${accountId}:${days}`;
        setGrantingGraceAction(actionKey);
        try {
            await adminApi.grantSubscriptionGrace(accountId, days, noteInput.trim() || undefined);
            await loadSubscriptions();
            showToast(`Grace de ${days} jours accordee.`);
        } catch {
            showToast("Impossible d'accorder la grace.", 'error');
        } finally {
            setGrantingGraceAction(null);
        }
    };

    const handleToggleReadOnly = async (accountId: string, enabled: boolean) => {
        const noteInput = window.prompt(
            enabled
                ? 'Note interne optionnelle pour passer ce compte en lecture seule'
                : 'Note interne optionnelle pour retirer la lecture seule',
            '',
        );
        if (noteInput === null) return;
        setTogglingReadOnlyAccountId(accountId);
        try {
            if (enabled) {
                await adminApi.enableSubscriptionReadOnly(accountId, noteInput.trim() || undefined);
                showToast('Compte passe en lecture seule.');
            } else {
                await adminApi.disableSubscriptionReadOnly(accountId, noteInput.trim() || undefined);
                showToast('Lecture seule retiree.');
            }
            await loadSubscriptions();
        } catch {
            showToast("Impossible de modifier l'etat lecture seule.", 'error');
        } finally {
            setTogglingReadOnlyAccountId(null);
        }
    };

    const handleRegeneratePaymentLinks = async (accountId: string) => {
        setRefreshingPaymentLinksAccountId(accountId);
        try {
            await adminApi.regenerateSubscriptionLinks(accountId);
            await loadSubscriptions();
            showToast('Liens de paiement regeneres.');
        } catch {
            showToast('Impossible de regenerer les liens.', 'error');
        } finally {
            setRefreshingPaymentLinksAccountId(null);
        }
    };

    const handleSendReminder = async (accountId: string, daysLeft = 1) => {
        setSendingReminderAccountId(accountId);
        try {
            await adminApi.sendSubscriptionReminder(accountId, daysLeft);
            await loadSubscriptions();
            showToast('Rappel envoye.');
        } catch {
            showToast("Impossible d'envoyer le rappel.", 'error');
        } finally {
            setSendingReminderAccountId(null);
        }
    };

    const loadSubscriptions = async () => {
        setRefreshing(true);
        try {
            const [overviewRes, accountsRes, eventsRes, alertsRes] = await Promise.all([
                adminApi.getSubscriptionsOverview(),
                adminApi.listSubscriptionAccounts({ limit: 80 }),
                adminApi.listSubscriptionEvents({ limit: 40 }),
                adminApi.getSubscriptionAlerts(),
            ]);
            setSubscriptionOverview(overviewRes);
            setSubscriptionAccounts(accountsRes?.items || []);
            setSubscriptionAccountsTotal(accountsRes?.total || 0);
            setSubscriptionEvents(eventsRes?.items || []);
            setSubscriptionAlerts(alertsRes);
        } finally {
            setRefreshing(false);
        }
    };

    const loadDemos = async () => {
        setRefreshing(true);
        try {
            const [overviewRes, sessionsRes] = await Promise.all([
                adminApi.getDemoSessionsOverview(),
                adminApi.listDemoSessions({ limit: 200 }),
            ]);
            setDemoOverview(overviewRes);
            setDemoSessions(sessionsRes?.items || []);
            setDemoSessionsTotal(sessionsRes?.total || 0);
        } finally {
            setRefreshing(false);
        }
    };

    const loadStores = async () => {
        setRefreshing(true);
        try {
            const data = await adminApi.listStores();
            setStores(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
        } finally { setRefreshing(false); }
    };

    const loadDisputes = async () => {
        setRefreshing(true);
        try {
            const data = await adminApi.listDisputes();
            setDisputes(data?.items || []);
        } finally { setRefreshing(false); }
    };

    const loadSecurity = async () => {
        setRefreshing(true);
        try {
            const [eventsRes, statsRes, verificationRes, sessionsRes] = await Promise.all([
                adminApi.listSecurityEvents(),
                adminApi.getSecurityStats(),
                adminApi.listVerificationEvents({ limit: 50 }),
                adminApi.getActiveSessions(),
            ]);
            setSecurityEvents(eventsRes?.items || []);
            setSecurityStats(statsRes);
            setVerificationEvents(verificationRes?.items || []);
            setVerificationEventsTotal(verificationRes?.total || 0);
            setActiveSessions(Array.isArray(sessionsRes) ? sessionsRes : []);
        } finally { setRefreshing(false); }
    };

    const loadTickets = async () => {
        setRefreshing(true);
        try { setTickets(await adminApi.listTickets() || []); }
        finally { setRefreshing(false); }
    };

    const loadBroadcastHistory = async () => {
        setRefreshing(true);
        try {
            const response = await adminApi.listMessages(messageTypeFilter === 'all' ? undefined : messageTypeFilter, 0, 80);
            setMessageHistory(response?.items || []);
            setMessageHistoryTotal(response?.total || 0);
        } finally {
            setRefreshing(false);
        }
    };

    const loadLegalDocuments = async () => {
        setLegalLoading(true);
        try {
            const [cguRes, privacyRes] = await Promise.all([
                adminApi.getCGU('fr'),
                adminApi.getPrivacy('fr'),
            ]);
            setCguContent(cguRes?.content || '');
            setPrivacyContent(privacyRes?.content || '');
            setCguUpdatedAt(cguRes?.updated_at || null);
            setPrivacyUpdatedAt(privacyRes?.updated_at || null);
        } catch (err) {
            console.error('Legal documents load error', err);
            showToast("Impossible de charger les documents juridiques.", 'error');
        } finally {
            setLegalLoading(false);
        }
    };

    useEffect(() => {
        if (activeSection === 'subscriptions' || activeSection === 'finance') loadSubscriptions();
        if (activeSection === 'demos') loadDemos();
        if (activeSection === 'users') loadUsers();
        if (activeSection === 'stores') loadStores();
        if (activeSection === 'disputes') loadDisputes();
        if (activeSection === 'security') loadSecurity();
        if (activeSection === 'support') loadTickets();
        if (activeSection === 'broadcast') loadBroadcastHistory();
        if (activeSection === 'legal') loadLegalDocuments();
        if (activeSection === 'leads') {
            setLeadsLoading(true);
            adminApi.getLeads().then(r => {
                setLeadContacts(r.contacts || []);
                setLeadSubscribers(r.subscribers || []);
            }).catch(() => {}).finally(() => setLeadsLoading(false));
        }
    }, [activeSection]);

    useEffect(() => {
        if (activeSection === 'broadcast') loadBroadcastHistory();
    }, [activeSection, messageTypeFilter]);

    const handleToggleUser = async (userId: string, currentStatus: boolean) => {
        setTogglingUser(userId);
        try {
            await adminApi.toggleUser(userId);
            setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_active: !currentStatus } : u));
            showToast(currentStatus ? 'Utilisateur banni.' : 'Utilisateur réactivé.');
        } catch {
            showToast('Erreur lors de la modification.', 'error');
        } finally {
            setTogglingUser(null);
        }
    };

    const handleDeleteUser = async () => {
        if (!confirmDeleteUser) return;
        setDeletingUser(confirmDeleteUser.user_id);
        try {
            await adminApi.deleteUser(confirmDeleteUser.email);
            setUsers(prev => prev.filter(u => u.user_id !== confirmDeleteUser.user_id));
            showToast(`Compte "${confirmDeleteUser.name}" supprimé avec toutes ses données.`);
        } catch {
            showToast('Erreur lors de la suppression.', 'error');
        } finally {
            setDeletingUser(null);
            setConfirmDeleteUser(null);
        }
    };

    const handleReplyTicket = async () => {
        if (!replyTicketId || !replyContent.trim()) return;
        setReplying(true);
        try {
            await adminApi.replyTicket(replyTicketId, replyContent.trim());
            setReplyTicketId(null);
            setReplyContent('');
            loadTickets();
            showToast('Réponse envoyée.');
        } catch {
            showToast('Erreur lors de l\'envoi.', 'error');
        } finally {
            setReplying(false);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!userSearch.trim()) return users;
        const q = userSearch.toLowerCase();
        return users.filter(u =>
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.country_code?.toLowerCase().includes(q) ||
            u.plan?.toLowerCase().includes(q)
        );
    }, [users, userSearch]);

    const filteredDisputes = useMemo(() => {
        if (disputeFilter === 'all') return disputes;
        return disputes.filter(d => disputeFilter === 'open' ? d.status === 'open' : d.status !== 'open');
    }, [disputes, disputeFilter]);

    const filteredSubscriptionAccounts = useMemo(() => {
        return subscriptionAccounts.filter(account => {
            const matchesSearch = !subscriptionSearch.trim() || [
                account.display_name,
                account.account_id,
                account.owner_name,
                account.owner_email,
                account.billing_contact_email,
                account.currency,
                account.country_code,
            ].some(value => String(value || '').toLowerCase().includes(subscriptionSearch.toLowerCase()));
            const matchesStatus = subscriptionStatusFilter === 'all' || account.subscription_status === subscriptionStatusFilter;
            const matchesProvider = subscriptionProviderFilter === 'all' || account.subscription_provider === subscriptionProviderFilter;
            return matchesSearch && matchesStatus && matchesProvider;
        });
    }, [subscriptionAccounts, subscriptionProviderFilter, subscriptionSearch, subscriptionStatusFilter]);

    const filteredSubscriptionEvents = useMemo(() => {
        return subscriptionEvents.filter(event => {
            const matchesProvider = subscriptionProviderFilter === 'all' || event.provider === subscriptionProviderFilter;
            const matchesSearch = !subscriptionSearch.trim() || [
                event.account_id,
                event.owner_user_id,
                event.provider_reference,
                event.message,
                event.event_type,
            ].some(value => String(value || '').toLowerCase().includes(subscriptionSearch.toLowerCase()));
            return matchesProvider && matchesSearch;
        });
    }, [subscriptionEvents, subscriptionProviderFilter, subscriptionSearch]);

    const filteredDemoSessions = useMemo(() => {
        return demoSessions.filter((session) => {
            const matchesSearch = !demoSearch.trim() || [
                session.demo_session_id,
                session.contact_email,
                session.account_id,
                session.owner_user_id,
            ].some((value) => String(value || '').toLowerCase().includes(demoSearch.toLowerCase()));
            const matchesStatus = demoStatusFilter === 'all' || session.status === demoStatusFilter;
            const matchesType = demoTypeFilter === 'all' || session.demo_type === demoTypeFilter;
            const matchesSurface = demoSurfaceFilter === 'all' || session.surface === demoSurfaceFilter;
            return matchesSearch && matchesStatus && matchesType && matchesSurface;
        });
    }, [demoSearch, demoSessions, demoStatusFilter, demoSurfaceFilter, demoTypeFilter]);

    const filteredVerificationEvents = useMemo(() => {
        return verificationEvents.filter((event) => {
            const matchesProvider = verificationProviderFilter === 'all' || event.provider === verificationProviderFilter;
            const matchesChannel = verificationChannelFilter === 'all' || event.channel === verificationChannelFilter;
            return matchesProvider && matchesChannel;
        });
    }, [verificationChannelFilter, verificationEvents, verificationProviderFilter]);

    const normalizedSecuritySearch = securitySearch.trim().toLowerCase();

    const filteredSecurityEvents = useMemo(() => {
        return securityEvents.filter((event) => {
            const eventType = String(event.type || '').toLowerCase();
            const matchesType =
                securityView === 'all'
                || (securityView === 'failed_logins' && eventType.includes('failed'))
                || (securityView === 'successful_logins' && eventType.includes('success'))
                || (securityView === 'password_changes' && eventType.includes('password'));

            const haystack = [
                event.type,
                event.user_email,
                event.user_name,
                event.user_id,
                event.ip_address,
                event.details,
                event.reason,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            const matchesSearch = !normalizedSecuritySearch || haystack.includes(normalizedSecuritySearch);
            return matchesType && matchesSearch;
        });
    }, [normalizedSecuritySearch, securityEvents, securityView]);

    const filteredSecurityVerifications = useMemo(() => {
        return filteredVerificationEvents.filter((event) => {
            if (securityView !== 'all' && securityView !== 'verifications') return false;
            const haystack = [
                event.type,
                event.channel,
                event.provider,
                event.user_name,
                event.user_email,
                event.user_id,
                event.target,
                event.identifier,
                event.email,
                event.phone_number,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return !normalizedSecuritySearch || haystack.includes(normalizedSecuritySearch);
        });
    }, [filteredVerificationEvents, normalizedSecuritySearch, securityView]);

    const filteredSecuritySessions = useMemo(() => {
        return activeSessions.filter((session) => {
            if (securityView !== 'all' && securityView !== 'sessions') return false;
            const haystack = [
                session.user_name,
                session.user_email,
                session.user_id,
                session.session_id,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return !normalizedSecuritySearch || haystack.includes(normalizedSecuritySearch);
        });
    }, [activeSessions, normalizedSecuritySearch, securityView]);

    const securityInsights = useMemo(() => {
        const failed = securityEvents.filter((event) => String(event.type || '').toLowerCase().includes('failed'));
        const recentFailuresByUser = new Map<string, number>();
        failed.forEach((event) => {
            const key = event.user_email || event.user_id || event.ip_address || 'unknown';
            recentFailuresByUser.set(key, (recentFailuresByUser.get(key) || 0) + 1);
        });
        const riskyActors = Array.from(recentFailuresByUser.entries())
            .filter(([, count]) => count >= 3)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);

        return {
            suspiciousAttempts: failed.length,
            riskyActors,
            activeAlerts:
                (securityStats?.blocked_users || 0)
                + riskyActors.length
                + (securityStats?.failed_logins_24h || 0 > 10 ? 1 : 0),
        };
    }, [securityEvents, securityStats]);

    const financeSummary = useMemo(() => {
        const overview = subscriptionOverview || {};
        const accounts = filteredSubscriptionAccounts || [];
        const events = filteredSubscriptionEvents || [];

        const mrrRows = Array.isArray(overview?.mrr_estimate) ? overview.mrr_estimate : [];
        const primaryMrr = mrrRows[0] || null;
        const primaryArr = primaryMrr?.amount ? Number(primaryMrr.amount) * 12 : null;
        const paymentVolumeRows = Array.isArray(overview?.payment_volume_30d) ? overview.payment_volume_30d : [];
        const paymentVolumePrimary = paymentVolumeRows[0] || null;

        const activePaidAccounts = Number(overview?.active_paid_accounts || 0);
        const paymentsCount30d = Number(overview?.payments_count_30d || 0);
        const averagePaymentValue = paymentVolumePrimary && paymentsCount30d > 0
            ? Number(paymentVolumePrimary.amount || 0) / paymentsCount30d
            : null;

        const plans = Object.entries(overview?.by_plan || {}) as [string, number][];
        const providers = Object.entries(overview?.by_provider || {}) as [string, number][];

        const accountsAtRisk = accounts.filter((account: any) =>
            ['grace', 'restricted', 'read_only'].includes(String(account.subscription_access_phase || '')) ||
            ['expired', 'cancelled'].includes(String(account.subscription_status || '')) ||
            Boolean(account.manual_read_only_enabled) ||
            Boolean(account.manual_access_grace_until)
        );

        const reminderCandidates = accounts.filter((account: any) =>
            (account.last_payment_links?.stripe_url || account.last_payment_links?.flutterwave_url) &&
            (
                ['grace', 'restricted', 'read_only'].includes(String(account.subscription_access_phase || '')) ||
                ['expired', 'cancelled'].includes(String(account.subscription_status || '')) ||
                String(account.subscription_provider || '') === 'none'
            )
        );

        const recentPaymentEvents = events.filter((event: any) =>
            ['payment_succeeded', 'subscription_renewed', 'checkout_created', 'payment_failed'].includes(String(event.event_type || ''))
        );

        const byCountry = Object.entries(accounts.reduce((acc: Record<string, number>, account: any) => {
            const country = String(account.country_code || '—');
            acc[country] = (acc[country] || 0) + 1;
            return acc;
        }, {}))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);

        return {
            primaryMrr,
            primaryArr,
            paymentVolumePrimary,
            averagePaymentValue,
            activePaidAccounts,
            paymentsCount30d,
            plans,
            providers,
            paymentVolumeRows,
            accountsAtRisk,
            reminderCandidates,
            recentPaymentEvents,
            byCountry,
        };
    }, [filteredSubscriptionAccounts, filteredSubscriptionEvents, subscriptionOverview]);

    if (loading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    const tabs = [
        { id: 'overview', icon: TrendingUp, label: 'Vue d\'ensemble' },
        { id: 'finance', icon: Wallet, label: 'Finance' },
        { id: 'subscriptions', icon: CreditCard, label: 'Abonnements' },
        { id: 'demos', icon: Clock, label: 'Demos' },
        { id: 'users', icon: Users, label: 'Utilisateurs' },
        { id: 'stores', icon: Store, label: 'Boutiques' },
        { id: 'products', icon: Package, label: 'Produits' },
        { id: 'catalog', icon: BarChart2, label: 'Catalogue' },
        { id: 'disputes', icon: AlertCircle, label: 'Litiges' },
        { id: 'security', icon: Shield, label: 'Sécurité' },
        { id: 'support', icon: MessageSquare, label: 'Support' },
        { id: 'broadcast', icon: Bell, label: 'Broadcast' },
        { id: 'legal', icon: Newspaper, label: 'L?gal' },
        { id: 'leads', icon: Mail, label: 'Leads' },
    ];

    return (
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar bg-[#0F172A]">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Delete user confirmation modal */}
            {confirmDeleteUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-red-500/10">
                                <Trash2 size={20} className="text-red-400" />
                            </div>
                            <h3 className="text-lg font-black text-white">Supprimer ce compte ?</h3>
                        </div>
                        <p className="text-slate-400 text-sm mb-2">
                            Cette action est <span className="text-red-400 font-bold">irréversible</span>. Toutes les données seront supprimées :
                        </p>
                        <ul className="text-xs text-slate-500 mb-4 list-disc list-inside">
                            <li>Produits, ventes, clients, dépenses</li>
                            <li>Boutiques, alertes, fournisseurs</li>
                            <li>Sous-utilisateurs (staff)</li>
                        </ul>
                        <div className="bg-white/5 rounded-xl p-3 mb-5">
                            <p className="text-white font-bold text-sm">{confirmDeleteUser.name}</p>
                            <p className="text-slate-500 text-xs">{confirmDeleteUser.email}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDeleteUser(null)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={!!deletingUser}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/30 transition-all disabled:opacity-40"
                            >
                                {deletingUser ? 'Suppression...' : 'Supprimer définitivement'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1 uppercase tracking-tighter">Backoffice Admin</h1>
                    <p className="text-slate-400 text-sm">Supervision globale du système Stockman.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold uppercase tracking-widest ${['ok', 'online', 'healthy'].includes(String(health?.status || '')) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                        <Activity size={16} />
                        {['ok', 'online', 'healthy'].includes(String(health?.status || '')) ? 'Opérationnel' : 'Erreur'}
                    </div>
                    <button onClick={() => {
                        if (activeSection === 'subscriptions' || activeSection === 'finance') loadSubscriptions();
                        else if (activeSection === 'demos') loadDemos();
                        else if (activeSection === 'users') loadUsers();
                        else if (activeSection === 'stores') loadStores();
                        else if (activeSection === 'products' || activeSection === 'catalog') setSectionRefreshTick((current) => current + 1);
                        else if (activeSection === 'disputes') loadDisputes();
                        else if (activeSection === 'security') loadSecurity();
                        else if (activeSection === 'support') loadTickets();
                        else if (activeSection === 'broadcast') loadBroadcastHistory();
                        else if (activeSection === 'legal') loadLegalDocuments();
                        else if (activeSection === 'leads') {
                            setLeadsLoading(true);
                            adminApi.getLeads().then(r => { setLeadContacts(r.contacts || []); setLeadSubscribers(r.subscribers || []); }).catch(() => {}).finally(() => setLeadsLoading(false));
                        }
                        else loadInitialData();
                    }} className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </header>

            {/* Nav Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id as any)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap border ${activeSection === tab.id ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'}`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* -- OVERVIEW -- */}
            {activeSection === 'overview' && (
                <div className="space-y-8">
                    {/* KPI Row 1 */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <StatCard label="Shopkeepers" value={stats?.users_by_role?.shopkeeper || 0} icon={Users} color="bg-primary" sub={`+${stats?.signups_today || 0} aujourd'hui`} />
                        <StatCard label="CA Global (30j)" value={`${(stats?.revenue_month || 0).toLocaleString()} F`} icon={TrendingUp} color="bg-emerald-500" sub={`Aujourd'hui : ${(stats?.revenue_today || 0).toLocaleString()} F`} />
                        <StatCard label="Tickets Ouverts" value={stats?.open_tickets || 0} icon={MessageSquare} color="bg-amber-500" />
                        <StatCard label="Pays Couverts" value={Object.keys(stats?.users_by_country || {}).length} icon={Globe} color="bg-blue-400" sub={`${stats?.recent_signups || 0} inscrits (7j)`} />
                    </div>

                    {/* KPI Row 2 — Plans & Trials */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <StatCard label="Enterprise" value={stats?.users_by_plan?.enterprise || 0} icon={Crown} color="bg-purple-500" />
                        <StatCard label="Pro" value={stats?.users_by_plan?.pro || 0} icon={Zap} color="bg-blue-500" />
                        <StatCard label="Starter" value={stats?.users_by_plan?.starter || 0} icon={Package} color="bg-emerald-500" />
                        <StatCard
                            label="Trials expirant (7j)"
                            value={stats?.trials_expiring_soon || 0}
                            icon={Clock}
                            color={stats?.trials_expiring_soon > 0 ? 'bg-rose-500' : 'bg-slate-500'}
                            sub="Relance recommandée"
                        />
                    </div>

                    {/* Géographie + Top Boutiques */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="glass-card p-6">
                            <h3 className="text-base font-black text-white mb-5 flex items-center gap-2 uppercase tracking-tighter">
                                <Globe size={18} className="text-primary" /> Distribution Géographique
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(stats?.users_by_country || {})
                                    .sort(([, a]: any, [, b]: any) => b - a)
                                    .map(([country, count]: [string, any]) => (
                                        <div key={country} className="flex items-center gap-3">
                                            <span className="text-slate-400 w-10 text-sm font-bold font-mono">{country || '??'}</span>
                                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(count / Math.max(...Object.values(stats.users_by_country) as number[])) * 100}%` }} />
                                            </div>
                                            <span className="text-white font-black text-sm w-6 text-right">{count}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-base font-black text-white mb-5 flex items-center gap-2 uppercase tracking-tighter">
                                <BarChart2 size={18} className="text-primary" /> Top Boutiques (CA)
                            </h3>
                            {(stats?.top_stores || []).length > 0 ? (
                                <div className="space-y-3">
                                    {stats.top_stores.map((s: any, i: number) => (
                                        <div key={s.store_id} className="flex items-center gap-3">
                                            <span className="text-slate-600 font-black text-sm w-5">#{i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-bold text-sm truncate">{s.name}</p>
                                                <p className="text-slate-500 text-xs">{s.sales_count} ventes</p>
                                            </div>
                                            <span className="text-emerald-400 font-black text-sm">{s.revenue.toLocaleString()} F</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-600 text-sm text-center py-8">Aucune donnée de vente</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                        <StatCard label="OTP envoyes" value={otpStats?.sent_today || 0} icon={Bell} color="bg-indigo-500" sub="Aujourd'hui" />
                        <StatCard label="OTP verifies" value={otpStats?.verified_today || 0} icon={CheckCircle2} color="bg-emerald-500" sub="Aujourd'hui" />
                        <StatCard label="Taux verification" value={`${onboardingStats?.verification_rate || 0}%`} icon={TrendingUp} color="bg-sky-500" sub={`${onboardingStats?.verified_total || 0} verifies`} />
                        <StatCard label="Temps moyen OTP" value={`${onboardingStats?.avg_minutes_to_verify || 0} min`} icon={Clock} color="bg-violet-500" sub={`${onboardingStats?.window_days || 30} jours`} />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <div className="glass-card p-6">
                            <h3 className="text-base font-black text-white mb-5 uppercase tracking-tighter">Onboarding & conversion</h3>
                            <div className="grid grid-cols-2 gap-4 mb-5">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-2">Funnel</p>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center justify-between text-slate-300"><span>Comptes crees</span><strong className="text-white">{onboardingStats?.funnel?.signup_completed || 0}</strong></div>
                                        <div className="flex items-center justify-between text-slate-300"><span>OTP envoyes</span><strong className="text-white">{onboardingStats?.funnel?.otp_sent || 0}</strong></div>
                                        <div className="flex items-center justify-between text-slate-300"><span>OTP verifies</span><strong className="text-white">{onboardingStats?.funnel?.otp_verified || 0}</strong></div>
                                        <div className="flex items-center justify-between text-slate-300"><span>Premiers logins</span><strong className="text-white">{onboardingStats?.funnel?.first_login || 0}</strong></div>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-2">Conversion</p>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center justify-between text-slate-300"><span>Comptes payants</span><strong className="text-white">{conversionStats?.paying_accounts || 0}</strong></div>
                                        <div className="flex items-center justify-between text-slate-300"><span>Trials actifs</span><strong className="text-white">{conversionStats?.active_trials || 0}</strong></div>
                                        <div className="flex items-center justify-between text-slate-300"><span>Trials a risque</span><strong className="text-white">{conversionStats?.trials_expiring_soon || 0}</strong></div>
                                        <div className="flex items-center justify-between text-slate-300"><span>Taux global</span><strong className="text-emerald-400">{conversionStats?.conversion_rate || 0}%</strong></div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-3">Par plan</p>
                                    <div className="space-y-2">
                                        {Object.entries(onboardingStats?.by_plan || {}).map(([plan, count]) => (
                                            <div key={plan} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-300 capitalize">{plan}</span>
                                                <strong className="text-white">{Number(count)}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-3">Par surface</p>
                                    <div className="space-y-2">
                                        {Object.entries(onboardingStats?.by_surface || {}).map(([surface, count]) => (
                                            <div key={surface} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-300 capitalize">{surface}</span>
                                                <strong className="text-white">{Number(count)}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-base font-black text-white mb-5 uppercase tracking-tighter">OTP & Enterprise</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-3">Twilio</p>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center justify-between text-slate-300"><span>Envoyes</span><strong className="text-white">{otpStats?.providers?.twilio?.sent || 0}</strong></div>
                                        <div className="flex items-center justify-between text-slate-300"><span>Echecs envoi</span><strong className="text-white">{otpStats?.providers?.twilio?.send_failed || 0}</strong></div>
                                        <div className="flex items-center justify-between text-slate-300"><span>Expir?s</span><strong className="text-white">{otpStats?.providers?.twilio?.expired || 0}</strong></div>
                                        <div className="flex items-center justify-between text-slate-300"><span>Taux</span><strong className="text-emerald-400">{otpStats?.providers?.twilio?.verification_rate || 0}%</strong></div>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-3">Resend</p>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center justify-between text-slate-300"><span>Envoyes</span><strong className="text-white">{otpStats?.providers?.resend?.sent || 0}</strong></div>
                                        <div className="flex items-center justify-between text-slate-300"><span>Echecs envoi</span><strong className="text-white">{otpStats?.providers?.resend?.send_failed || 0}</strong></div>
                                        <div className="flex items-center justify-between text-slate-300"><span>Expir?s</span><strong className="text-white">{otpStats?.providers?.resend?.expired || 0}</strong></div>
                                        <div className="flex items-center justify-between text-slate-300"><span>Taux</span><strong className="text-emerald-400">{otpStats?.providers?.resend?.verification_rate || 0}%</strong></div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-2">Enterprise crees</p>
                                    <strong className="text-2xl text-white">{enterpriseStats?.created || 0}</strong>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-2">Email verifies</p>
                                    <strong className="text-2xl text-white">{enterpriseStats?.verified || 0}</strong>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-2">Premiere vente</p>
                                    <strong className="text-2xl text-white">{enterpriseStats?.with_first_sale || 0}</strong>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-2">Actives</p>
                                    <strong className="text-2xl text-white">{enterpriseStats?.activated || 0}</strong>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-2">Inactifs J+1</p>
                                    <strong className="text-2xl text-amber-400">{enterpriseStats?.inactive_after_1d || 0}</strong>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-2">Inactifs J+7</p>
                                    <strong className="text-2xl text-rose-400">{enterpriseStats?.inactive_after_7d || 0}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* -- USERS -- */}
            {activeSection === 'finance' && (
                <div className="space-y-8">
                    <div className="glass-card p-6 bg-gradient-to-br from-emerald-500/10 via-transparent to-sky-500/10 border border-emerald-500/10">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">Pilotage financier</p>
                                <h2 className="mt-2 text-2xl font-black text-white tracking-tight">Vue finance admin</h2>
                                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
                                    Cette vue regroupe le revenu plateforme, la santé des abonnements, le recouvrement et les comptes à surveiller.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">CA plateforme 30j</p>
                                    <p className="mt-1 text-lg font-black text-white">{formatAdminMoney(financeSummary.paymentVolumePrimary?.amount, financeSummary.paymentVolumePrimary?.currency)}</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Paiements 30j</p>
                                    <p className="mt-1 text-lg font-black text-white">{subscriptionOverview?.payments_count_30d || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
                        <StatCard label="MRR principal" value={financeSummary.primaryMrr ? formatAdminMoney(financeSummary.primaryMrr.amount, financeSummary.primaryMrr.currency) : '—'} icon={TrendingUp} color="bg-emerald-500" sub={financeSummary.primaryMrr?.currency || 'Aucune devise'} />
                        <StatCard label="ARR estimé" value={financeSummary.primaryArr ? formatAdminMoney(financeSummary.primaryArr, financeSummary.primaryMrr?.currency) : '—'} icon={BarChart2} color="bg-sky-500" sub="Projection annuelle" />
                        <StatCard label="Comptes payants" value={subscriptionOverview?.active_paid_accounts || 0} icon={Wallet} color="bg-primary" sub="Actifs" />
                        <StatCard label="Trials actifs" value={subscriptionOverview?.active_trials || 0} icon={Clock} color="bg-amber-500" sub={`${subscriptionOverview?.trials_expiring_3d || 0} expirent sous 3 jours`} />
                        <StatCard label="Panier paiement" value={financeSummary.averagePaymentValue !== null ? formatAdminMoney(financeSummary.averagePaymentValue, financeSummary.paymentVolumePrimary?.currency) : '—'} icon={CreditCard} color="bg-violet-500" sub="Moyenne 30 jours" />
                        <StatCard label="Alertes recouvrement" value={subscriptionAlerts?.summary?.total || 0} icon={Bell} color={(subscriptionAlerts?.summary?.critical || 0) > 0 ? 'bg-rose-500' : 'bg-indigo-500'} sub={`${subscriptionAlerts?.summary?.critical || 0} critiques`} />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="glass-card p-6">
                            <h3 className="text-base font-black text-white uppercase tracking-tighter mb-4">Répartition abonnements</h3>
                            <div className="space-y-5">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Par plan</p>
                                    <div className="space-y-2">
                                        {financeSummary.plans.length ? financeSummary.plans.map(([plan, count]) => (
                                            <div key={plan} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-300 capitalize">{plan}</span>
                                                <strong className="text-white">{Number(count)}</strong>
                                            </div>
                                        )) : <p className="text-sm text-slate-500">Aucune donnée.</p>}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Par provider</p>
                                    <div className="space-y-2">
                                        {financeSummary.providers.length ? financeSummary.providers.map(([provider, count]) => (
                                            <div key={provider} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-300 capitalize">{provider || 'none'}</span>
                                                <strong className="text-white">{Number(count)}</strong>
                                            </div>
                                        )) : <p className="text-sm text-slate-500">Aucune donnée.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-base font-black text-white uppercase tracking-tighter mb-4">Volume et couverture</h3>
                            <div className="space-y-5">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Volume paiements 30 jours</p>
                                    <div className="space-y-2">
                                        {financeSummary.paymentVolumeRows.length ? financeSummary.paymentVolumeRows.map((row: any) => (
                                            <div key={row.currency} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-300">{row.currency}</span>
                                                <strong className="text-white">{formatAdminMoney(row.amount, row.currency)}</strong>
                                            </div>
                                        )) : <p className="text-sm text-slate-500">Aucun paiement confirmé sur la fenêtre.</p>}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Top pays comptes payants / suivis</p>
                                    <div className="space-y-2">
                                        {financeSummary.byCountry.length ? financeSummary.byCountry.map(([country, count]) => (
                                            <div key={country} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-300">{country}</span>
                                                <strong className="text-white">{Number(count)}</strong>
                                            </div>
                                        )) : <p className="text-sm text-slate-500">Aucune donnée pays.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-base font-black text-white uppercase tracking-tighter mb-4">Santé du recouvrement</h3>
                            <div className="space-y-3">
                                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-300">Comptes à risque</p>
                                    <p className="mt-2 text-3xl font-black text-white">{financeSummary.accountsAtRisk.length}</p>
                                    <p className="mt-1 text-xs text-slate-300">Grâce, lecture seule, expirés ou annulés.</p>
                                </div>
                                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Relances possibles</p>
                                    <p className="mt-2 text-3xl font-black text-white">{financeSummary.reminderCandidates.length}</p>
                                    <p className="mt-1 text-xs text-slate-300">Comptes avec lien de paiement déjà généré.</p>
                                </div>
                                <button
                                    onClick={() => setActiveSection('subscriptions')}
                                    className="w-full rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-black uppercase tracking-widest text-primary hover:bg-primary/20 transition-all"
                                >
                                    Ouvrir la vue abonnements détaillée
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="glass-card overflow-hidden">
                            <div className="p-5 border-b border-white/5 bg-white/5 flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-black text-white uppercase tracking-tighter">Comptes à surveiller</h3>
                                    <p className="mt-1 text-xs text-slate-500">Priorité au recouvrement et aux risques d'accès.</p>
                                </div>
                                <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rose-300">
                                    {financeSummary.accountsAtRisk.length} à traiter
                                </span>
                            </div>
                            <div className="divide-y divide-white/5 max-h-[560px] overflow-y-auto custom-scrollbar">
                                {financeSummary.accountsAtRisk.length ? financeSummary.accountsAtRisk.slice(0, 12).map((account: any) => (
                                    <div key={account.account_id} className="p-5 hover:bg-white/5 transition-all">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-white">{account.display_name || account.owner_name || account.account_id}</p>
                                                <p className="text-xs text-slate-500">{account.owner_email || account.billing_contact_email || '—'}</p>
                                                <p className="text-xs text-slate-400">
                                                    {account.country_code || '—'} · {account.currency || '—'} · {formatAccessPhaseLabel(account.subscription_access_phase || 'active')}
                                                </p>
                                            </div>
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${account.manual_read_only_enabled ? 'border-rose-500/20 bg-rose-500/10 text-rose-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>
                                                {account.manual_read_only_enabled ? 'Lecture seule' : account.subscription_status || 'Risque'}
                                            </span>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button
                                                onClick={() => void handleSendReminder(account.account_id, 1)}
                                                disabled={sendingReminderAccountId === account.account_id}
                                                className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-200 hover:bg-sky-500/20 disabled:opacity-40"
                                            >
                                                {sendingReminderAccountId === account.account_id ? '...' : 'Envoyer rappel'}
                                            </button>
                                            <button
                                                onClick={() => void handleRegeneratePaymentLinks(account.account_id)}
                                                disabled={refreshingPaymentLinksAccountId === account.account_id}
                                                className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-40"
                                            >
                                                {refreshingPaymentLinksAccountId === account.account_id ? '...' : 'Régénérer lien'}
                                            </button>
                                            <button
                                                onClick={() => setActiveSection('subscriptions')}
                                                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:bg-white/10"
                                            >
                                                Voir le compte
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-12 text-center text-slate-600 text-sm">Aucun compte à risque pour les filtres en cours.</div>
                                )}
                            </div>
                        </div>

                        <div className="glass-card overflow-hidden">
                            <div className="p-5 border-b border-white/5 bg-white/5 flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-black text-white uppercase tracking-tighter">Flux de paiement récents</h3>
                                    <p className="mt-1 text-xs text-slate-500">Paiements, renouvellements, échecs et checkouts.</p>
                                </div>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300">
                                    {financeSummary.recentPaymentEvents.length} événements
                                </span>
                            </div>
                            <div className="divide-y divide-white/5 max-h-[560px] overflow-y-auto custom-scrollbar">
                                {financeSummary.recentPaymentEvents.length ? financeSummary.recentPaymentEvents.slice(0, 14).map((event: any) => (
                                    <div key={event.event_id} className="p-5 hover:bg-white/5 transition-all">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-white">{formatSubscriptionEventType(event.event_type)}</p>
                                                <p className="mt-1 text-xs text-slate-500">{event.account_id || '—'} · {event.provider || '—'} · {event.status || '—'}</p>
                                            </div>
                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${event.status === 'failed' ? 'bg-rose-500/10 text-rose-300' : event.event_type === 'checkout_created' ? 'bg-sky-500/10 text-sky-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                                                {formatAdminMoney(event.amount, event.currency)}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                                            <span>{event.plan || '—'}</span>
                                            <span>{formatAdminDate(event.created_at)}</span>
                                        </div>
                                        {event.message ? <p className="mt-2 text-xs text-slate-500">{event.message}</p> : null}
                                    </div>
                                )) : (
                                    <div className="p-12 text-center text-slate-600 text-sm">Aucun flux de paiement récent.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'subscriptions' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Comptes payants" value={subscriptionOverview?.active_paid_accounts || 0} icon={Wallet} color="bg-emerald-500" sub="Actifs" />
                        <StatCard label="Trials actifs" value={subscriptionOverview?.active_trials || 0} icon={Clock} color="bg-amber-500" sub={`${subscriptionOverview?.trials_expiring_3d || 0} expirent sous 3 jours`} />
                        <StatCard label="Abonnements a risque" value={subscriptionOverview?.subscriptions_expiring_soon || 0} icon={AlertTriangle} color="bg-rose-500" sub="Expirent sous 7 jours" />
                        <StatCard label="Paiements 30j" value={subscriptionOverview?.payments_count_30d || 0} icon={CreditCard} color="bg-blue-500" sub="Tous providers" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            label="MRR estime"
                            value={subscriptionOverview?.mrr_estimate?.length ? formatAdminMoney(subscriptionOverview.mrr_estimate[0]?.amount, subscriptionOverview.mrr_estimate[0]?.currency) : '—'}
                            icon={TrendingUp}
                            color="bg-primary"
                            sub={subscriptionOverview?.mrr_estimate?.length > 1 ? `+${subscriptionOverview.mrr_estimate.length - 1} devises` : 'Devise principale'}
                        />
                        <StatCard label="Annul?s" value={subscriptionOverview?.cancelled_accounts || 0} icon={X} color="bg-slate-500" />
                        <StatCard label="Expir?s" value={subscriptionOverview?.expired_accounts || 0} icon={Clock} color="bg-rose-500" />
                        <StatCard label="Alertes" value={subscriptionAlerts?.summary?.total || 0} icon={Bell} color={(subscriptionAlerts?.summary?.critical || 0) > 0 ? 'bg-rose-500' : 'bg-indigo-500'} sub={`${subscriptionAlerts?.summary?.critical || 0} critiques`} />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="glass-card p-6 xl:col-span-1">
                            <h3 className="text-base font-black text-white mb-5 uppercase tracking-tighter">Repartition</h3>
                            <div className="space-y-5">
                                <div>
                                    <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-3">Par plan</p>
                                    <div className="space-y-2">
                                        {Object.entries(subscriptionOverview?.by_plan || {}).map(([plan, count]) => (
                                            <div key={plan} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-300 capitalize">{plan}</span>
                                                <strong className="text-white">{Number(count)}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-3">Par provider</p>
                                    <div className="space-y-2">
                                        {Object.entries(subscriptionOverview?.by_provider || {}).map(([provider, count]) => (
                                            <div key={provider} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-300 capitalize">{provider}</span>
                                                <strong className="text-white">{Number(count)}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-3">Volumes 30 jours</p>
                                    <div className="space-y-2">
                                        {(subscriptionOverview?.payment_volume_30d || []).length > 0 ? (
                                            subscriptionOverview.payment_volume_30d.map((row: any) => (
                                                <div key={row.currency} className="flex items-center justify-between text-sm">
                                                    <span className="text-slate-300">{row.currency}</span>
                                                    <strong className="text-white">{formatAdminMoney(row.amount, row.currency)}</strong>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-500">Aucun paiement confirme sur la fenetre.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6 xl:col-span-1">
                            <h3 className="text-base font-black text-white mb-5 uppercase tracking-tighter">Alertes et anomalies</h3>
                            <div className="space-y-3">
                                {(subscriptionAlerts?.items || []).length > 0 ? (
                                    subscriptionAlerts.items.map((alert: any) => (
                                        <div key={alert.code} className={`rounded-2xl border p-4 ${alert.severity === 'critical' ? 'border-rose-500/30 bg-rose-500/10' : 'border-amber-500/20 bg-amber-500/10'}`}>
                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                <p className="text-sm font-black text-white">{alert.title}</p>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${alert.severity === 'critical' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                                    {alert.count}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-300 leading-relaxed">{alert.message}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                                        Aucune anomalie majeure detectee pour le moment.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="glass-card p-6 xl:col-span-1">
                            <h3 className="text-base font-black text-white mb-5 uppercase tracking-tighter">?v?nements r?cents</h3>
                            <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                                {filteredSubscriptionEvents.length > 0 ? (
                                    filteredSubscriptionEvents.map((event: any) => (
                                        <div key={event.event_id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <div>
                                                    <p className="text-sm font-black text-white">{formatSubscriptionEventType(event.event_type)}</p>
                                                    <p className="text-[11px] text-slate-500 uppercase tracking-widest">{event.provider} · {event.source}</p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${event.status === 'failed' ? 'bg-rose-500/20 text-rose-300' : event.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-slate-300'}`}>
                                                    {event.status || '—'}
                                                </span>
                                            </div>
                                            <div className="space-y-1 text-xs text-slate-300">
                                                <p><span className="text-slate-500">Compte :</span> {event.account_id || '—'}</p>
                                                <p><span className="text-slate-500">Plan :</span> {event.plan || '—'}</p>
                                                <p><span className="text-slate-500">Montant :</span> {formatAdminMoney(event.amount, event.currency)}</p>
                                                <p><span className="text-slate-500">Reference :</span> {event.provider_reference || '—'}</p>
                                                <p><span className="text-slate-500">Date :</span> {formatAdminDate(event.created_at)}</p>
                                            </div>
                                            {event.message && <p className="text-xs text-slate-400 mt-3">{event.message}</p>}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-500">Aucun evenement disponible.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden">
                        <div className="p-5 border-b border-white/5 bg-white/5 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                            <div>
                                <h3 className="text-base font-black text-white uppercase tracking-tighter">
                                    Comptes abonnes {refreshing ? '' : `(${filteredSubscriptionAccounts.length}/${subscriptionAccountsTotal})`}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Source de verite : business_accounts</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                <div className="relative w-full sm:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                                    <input
                                        type="text"
                                        value={subscriptionSearch}
                                        onChange={e => setSubscriptionSearch(e.target.value)}
                                        placeholder="Compte, email, devise, pays..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                                    />
                                </div>
                                <select
                                    value={subscriptionStatusFilter}
                                    onChange={e => setSubscriptionStatusFilter(e.target.value as any)}
                                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                >
                                    <option value="all">Tous statuts</option>
                                    <option value="active">Actifs</option>
                                    <option value="expired">Expir?s</option>
                                    <option value="cancelled">Annul?s</option>
                                </select>
                                <select
                                    value={subscriptionProviderFilter}
                                    onChange={e => setSubscriptionProviderFilter(e.target.value as any)}
                                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                >
                                    <option value="all">Tous providers</option>
                                    <option value="stripe">Stripe</option>
                                    <option value="flutterwave">Flutterwave</option>
                                    <option value="revenuecat">RevenueCat</option>
                                    <option value="none">Aucun</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                        <th className="px-6 py-4">Compte</th>
                                        <th className="px-6 py-4">Plan</th>
                                        <th className="px-6 py-4">Provider</th>
                                        <th className="px-6 py-4">Pays / Devise</th>
                                        <th className="px-6 py-4">Echeance</th>
                                        <th className="px-6 py-4">Dernier paiement</th>
                                        <th className="px-6 py-4">Liens paiement</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {filteredSubscriptionAccounts.map(account => (
                                        <tr key={account.account_id} className="hover:bg-white/5 transition-all">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-white font-bold">{account.display_name}</p>
                                                    <p className="text-[11px] text-slate-500">{account.account_id}</p>
                                                    <p className="text-[11px] text-slate-500">{account.owner_email || account.billing_contact_email || '—'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-2">
                                                    <span className={`w-fit px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${PLAN_COLORS[account.plan] || PLAN_COLORS.starter}`}>
                                                        {account.plan}
                                                    </span>
                                                    <span className={`w-fit px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${account.subscription_status === 'active' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : account.subscription_status === 'cancelled' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-rose-500/10 text-rose-300 border-rose-500/20'}`}>
                                                        {account.subscription_status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-300">
                                                    <p className="font-semibold capitalize">{account.subscription_provider || 'none'}</p>
                                                    <p className="text-[11px] text-slate-500">{account.subscription_provider_id || 'Sans reference'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                <p>{account.country_code || '—'} / {account.currency || '—'}</p>
                                                <p className="text-[11px] text-slate-500">{account.stores_count || 0} boutiques · {account.users_count || 0} utilisateurs</p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                <p>{formatAccessPhaseLabel(account.subscription_access_phase || 'active')}</p>
                                                <p>{formatAdminDate(account.subscription_end || account.trial_ends_at)}</p>
                                                <p className="text-[11px] text-slate-500">
                                                    {account.manual_access_grace_until ? `Grace manuelle jusque ${formatAdminDate(account.manual_access_grace_until)}` : (account.subscription_end ? 'Abonnement payant' : 'Trial / aucun paiement')}
                                                </p>
                                                {account.manual_read_only_enabled && (
                                                    <p className="mt-1 inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase border bg-rose-500/10 text-rose-300 border-rose-500/20">
                                                        Lecture seule manuelle
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                <p>{formatAdminMoney(account.last_payment_amount, account.last_payment_currency)}</p>
                                                <p className="text-[11px] text-slate-500">{formatAdminDate(account.last_payment_at)}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-2 text-xs">
                                                    {account.last_payment_links?.stripe_url ? (
                                                        <a
                                                            href={account.last_payment_links.stripe_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center justify-center rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-primary hover:bg-primary/20 transition"
                                                        >
                                                            Stripe
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-600">Stripe: —</span>
                                                    )}
                                                    {account.last_payment_links?.flutterwave_url ? (
                                                        <a
                                                            href={account.last_payment_links.flutterwave_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-200 hover:bg-emerald-500/20 transition"
                                                        >
                                                            Mobile Money
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-600">Mobile Money: —</span>
                                                    )}
                                                    {account.last_payment_links_generated_at ? (
                                                        <span className="text-[10px] text-slate-500">
                                                            Genere le {formatAdminDate(account.last_payment_links_generated_at)}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => void handleRegeneratePaymentLinks(account.account_id)}
                                                        disabled={refreshingPaymentLinksAccountId === account.account_id || sendingReminderAccountId === account.account_id || grantingGraceAction !== null || togglingReadOnlyAccountId === account.account_id}
                                                        className="px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-40"
                                                    >
                                                        {refreshingPaymentLinksAccountId === account.account_id ? '...' : 'R?g?n?rer'}
                                                    </button>
                                                    <button
                                                        onClick={() => void handleSendReminder(account.account_id, 1)}
                                                        disabled={sendingReminderAccountId === account.account_id || refreshingPaymentLinksAccountId === account.account_id || grantingGraceAction !== null || togglingReadOnlyAccountId === account.account_id}
                                                        className="px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs font-bold text-sky-200 hover:bg-sky-500/20 disabled:opacity-40"
                                                    >
                                                        {sendingReminderAccountId === account.account_id ? '...' : 'Envoyer rappel'}
                                                    </button>
                                                    {[7, 14, 30].map(days => {
                                                        const actionKey = `${account.account_id}:${days}`;
                                                        return (
                                                            <button
                                                                key={days}
                                                                onClick={() => void handleGrantGrace(account.account_id, days)}
                                                                disabled={grantingGraceAction !== null || togglingReadOnlyAccountId === account.account_id}
                                                                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-40"
                                                            >
                                                                {grantingGraceAction === actionKey ? '...' : `${days}j`}
                                                            </button>
                                                        );
                                                    })}
                                                    <button
                                                        onClick={() => void handleToggleReadOnly(account.account_id, !account.manual_read_only_enabled)}
                                                        disabled={togglingReadOnlyAccountId === account.account_id || grantingGraceAction !== null}
                                                        className={`px-3 py-2 rounded-xl border text-xs font-bold disabled:opacity-40 ${
                                                            account.manual_read_only_enabled
                                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
                                                                : 'bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/20'
                                                        }`}
                                                    >
                                                        {togglingReadOnlyAccountId === account.account_id
                                                            ? '...'
                                                            : account.manual_read_only_enabled
                                                                ? 'Retirer lecture seule'
                                                                : 'Passer en lecture seule'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredSubscriptionAccounts.length === 0 && (
                                        <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-600">Aucun compte ne correspond aux filtres.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'users' && (
                <div className="glass-card overflow-hidden">
                    <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/5">
                        <h3 className="text-base font-black text-white uppercase tracking-tighter">
                            Utilisateurs {refreshing ? '' : `(${filteredUsers.length})`}
                        </h3>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                            <input
                                type="text"
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                placeholder="Nom, email, pays, plané"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                            />
                            {userSearch && (
                                <button onClick={() => setUserSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                    <th className="px-6 py-4">Utilisateur</th>
                                    <th className="px-6 py-4">Plan</th>
                                    <th className="px-6 py-4">Pays</th>
                                    <th className="px-6 py-4">Statut</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {filteredUsers.map(user => (
                                    <tr key={user.user_id} className="hover:bg-white/5 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-xs shrink-0">
                                                    {user.name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold">{user.name}</p>
                                                    <p className="text-[10px] text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${PLAN_COLORS[user.plan] || PLAN_COLORS.starter}`}>
                                                {user.plan || 'starter'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">{user.country_code || '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${user.is_active !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                                {user.is_active !== false ? 'Actif' : 'Banni'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleToggleUser(user.user_id, user.is_active !== false)}
                                                disabled={togglingUser === user.user_id}
                                                className={`p-2 rounded-lg transition-all ${user.is_active !== false ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'} disabled:opacity-40`}
                                                title={user.is_active !== false ? 'Bannir' : 'Réactiver'}
                                            >
                                                {togglingUser === user.user_id
                                                    ? <RefreshCw size={15} className="animate-spin" />
                                                    : user.is_active !== false ? <Lock size={15} /> : <Unlock size={15} />
                                                }
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteUser({ user_id: user.user_id, email: user.email, name: user.name })}
                                                disabled={deletingUser === user.user_id}
                                                className="p-2 rounded-lg transition-all text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                                                title="Supprimer le compte"
                                            >
                                                {deletingUser === user.user_id
                                                    ? <RefreshCw size={15} className="animate-spin" />
                                                    : <Trash2 size={15} />
                                                }
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-600">Aucun utilisateur trouvé</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* -- STORES -- */}
            {activeSection === 'stores' && (
                <div className="glass-card overflow-hidden">
                    <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <h3 className="text-base font-black text-white uppercase tracking-tighter">
                            Boutiques {refreshing ? '' : `(${stores.length})`}
                        </h3>
                        <button onClick={loadStores} className="p-2 text-slate-400 hover:text-white transition-all">
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                    <th className="px-6 py-4">Boutique</th>
                                    <th className="px-6 py-4">Propriétaire</th>
                                    <th className="px-6 py-4">Pays</th>
                                    <th className="px-6 py-4">Produits</th>
                                    <th className="px-6 py-4">CA Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {stores.map((store: any) => (
                                    <tr key={store.store_id} className="hover:bg-white/5 transition-all">
                                        <td className="px-6 py-4">
                                            <p className="text-white font-bold">{store.name}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">{store.store_id?.slice(-8)}</p>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">{store.owner_name || '—'}</td>
                                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">{store.country_code || '—'}</td>
                                        <td className="px-6 py-4 text-white font-bold">{store.product_count ?? '—'}</td>
                                        <td className="px-6 py-4 text-emerald-400 font-black">{store.total_revenue != null ? `${store.total_revenue.toLocaleString()} F` : '—'}</td>
                                    </tr>
                                ))}
                                {stores.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-600">Aucune boutique</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* -- DISPUTES -- */}
            {activeSection === 'products' && (
                <AdminProductsPanel refreshToken={sectionRefreshTick} showToast={showToast} />
            )}

            {activeSection === 'catalog' && (
                <AdminCatalogPanel refreshToken={sectionRefreshTick} showToast={showToast} />
            )}

            {activeSection === 'disputes' && (
                <div className="glass-card overflow-hidden">
                    <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <div>
                            <h3 className="text-base font-black text-white uppercase tracking-tighter">Litiges ({filteredDisputes.length})</h3>
                            <p className="mt-1 text-xs text-slate-400">
                                Réclamations et contestations liées à un paiement, un produit, un service ou une livraison.
                            </p>
                        </div>
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1">
                            {(['all', 'open', 'resolved'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setDisputeFilter(f)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${disputeFilter === f ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {f === 'all' ? 'Tous' : f === 'open' ? 'Ouverts' : 'Résolus'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="px-5 py-3 border-b border-white/5 bg-white/[0.03] flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 font-bold text-rose-300">
                            À traiter : litiges ouverts ou en cours d'analyse
                        </span>
                        <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 font-bold text-sky-300">
                            Exemples : paiement contesté, produit non conforme, livraison incomplète
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        {filteredDisputes.length > 0 ? (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                        <th className="px-6 py-4">Sujet</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Utilisateur</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Statut</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {filteredDisputes.map((dispute: any) => (
                                        <tr key={dispute.id} className="hover:bg-white/5 transition-all">
                                            <td className="px-6 py-4">
                                                <p className="text-white font-bold">{dispute.subject}</p>
                                                <p className="mt-1 text-[11px] text-slate-500">
                                                    {dispute.description || 'Réclamation en attente de traitement.'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300">
                                                    {dispute.type || 'Autre'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400">{dispute.user_name}</td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">{new Date(dispute.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${dispute.status === 'open' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                    {dispute.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-primary hover:underline font-black text-xs uppercase tracking-widest">Gérer</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-20 text-center text-slate-600 flex flex-col items-center gap-4">
                                <CheckCircle2 size={48} className="opacity-20" />
                                <p className="font-black uppercase tracking-widest text-xs">Aucun litige {disputeFilter !== 'all' ? `(${disputeFilter})` : ''}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* -- DEMOS -- */}
            {activeSection === 'demos' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <StatCard label="Sessions actives" value={demoOverview?.active_sessions || 0} icon={Clock} color="bg-sky-500" sub={`${demoOverview?.expiring_24h || 0} expirent <24h`} />
                        <StatCard label="Expirees" value={demoOverview?.expired_sessions || 0} icon={AlertTriangle} color="bg-amber-500" sub={`${demoOverview?.stale_expired_uncleaned || 0} a nettoyer`} />
                        <StatCard label="Nettoyees" value={demoOverview?.cleaned_sessions || 0} icon={Trash2} color="bg-emerald-500" sub={`${demoOverview?.created_in_window || 0} creees / ${demoOverview?.window_days || 30}j`} />
                        <StatCard label="Contacts captes" value={demoOverview?.contacts_captured || 0} icon={CheckCircle2} color="bg-emerald-500" sub="Emails enregistres" />
                        <StatCard label="Contacts en attente" value={demoOverview?.contacts_pending || 0} icon={Zap} color="bg-primary" sub={`${demoSessionsTotal || 0} sessions total`} />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="glass-card p-6">
                            <h3 className="text-base font-black text-white uppercase tracking-tighter mb-4">Par type</h3>
                            <div className="space-y-3">
                                {Object.entries(demoOverview?.by_type || {}).map(([type, count]: [string, any]) => (
                                    <div key={type} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">{formatDemoTypeLabel(type)}</span>
                                        <span className="text-white font-black">{count}</span>
                                    </div>
                                ))}
                                {!Object.keys(demoOverview?.by_type || {}).length && (
                                    <p className="text-slate-600 text-sm">Aucune session demo.</p>
                                )}
                            </div>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-base font-black text-white uppercase tracking-tighter mb-4">Par surface</h3>
                            <div className="space-y-3">
                                {Object.entries(demoOverview?.by_surface || {}).map(([surface, count]: [string, any]) => (
                                    <div key={surface} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400 capitalize">{surface}</span>
                                        <span className="text-white font-black">{count}</span>
                                    </div>
                                ))}
                                {!Object.keys(demoOverview?.by_surface || {}).length && (
                                    <p className="text-slate-600 text-sm">Aucune repartition disponible.</p>
                                )}
                            </div>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-base font-black text-white uppercase tracking-tighter mb-4">Par statut</h3>
                            <div className="space-y-3">
                                {Object.entries(demoOverview?.by_status || {}).map(([status, count]: [string, any]) => (
                                    <div key={status} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">{formatDemoSessionStatus(status)}</span>
                                        <span className="text-white font-black">{count}</span>
                                    </div>
                                ))}
                                {!Object.keys(demoOverview?.by_status || {}).length && (
                                    <p className="text-slate-600 text-sm">Aucune repartition disponible.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-5 flex flex-col xl:flex-row gap-3 xl:items-center">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                value={demoSearch}
                                onChange={(e) => setDemoSearch(e.target.value)}
                                placeholder="Rechercher une session, un email, un compte..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-primary/40"
                            />
                        </div>
                        <select value={demoStatusFilter} onChange={(e) => setDemoStatusFilter(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white">
                            <option value="all">Tous statuts</option>
                            <option value="active">Actives</option>
                            <option value="expired">Expirees</option>
                            <option value="cleaned">Nettoyees</option>
                        </select>
                        <select value={demoTypeFilter} onChange={(e) => setDemoTypeFilter(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white">
                            <option value="all">Tous types</option>
                            <option value="retail">Commerce</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                        <select value={demoSurfaceFilter} onChange={(e) => setDemoSurfaceFilter(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white">
                            <option value="all">Toutes surfaces</option>
                            <option value="mobile">Mobile</option>
                            <option value="web">Web</option>
                        </select>
                    </div>

                    <div className="glass-card overflow-hidden">
                        <div className="p-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-white uppercase tracking-tighter">Sessions demo ({filteredDemoSessions.length})</h3>
                                <p className="text-xs text-slate-500 mt-1">Vue admin sur le type, la surface, l'expiration, la capture email et le nettoyage.</p>
                            </div>
                            <button onClick={loadDemos} className="p-2 text-slate-400 hover:text-white transition-all">
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/[0.02] text-slate-500 text-[11px] uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Session</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Surface</th>
                                        <th className="px-6 py-4">Contact</th>
                                        <th className="px-6 py-4">Statut</th>
                                        <th className="px-6 py-4">Debut</th>
                                        <th className="px-6 py-4">Expiration</th>
                                        <th className="px-6 py-4">Restant</th>
                                        <th className="px-6 py-4">Nettoyage</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredDemoSessions.length > 0 ? filteredDemoSessions.map((session: any) => (
                                        <tr key={session.demo_session_id} className="hover:bg-white/[0.03]">
                                            <td className="px-6 py-4">
                                                <div className="text-white font-semibold text-sm">{session.demo_session_id}</div>
                                                <div className="text-slate-500 text-xs">{session.account_id || '—'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300 text-sm">{formatDemoTypeLabel(session.demo_type)}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-slate-300 text-xs capitalize">
                                                    {session.surface || '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-white text-sm">{session.contact_email || '—'}</div>
                                                <div className="text-slate-500 text-xs">{session.country_code || '—'} · {session.currency || '—'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full border text-xs font-bold ${
                                                    session.status === 'active'
                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                                        : session.status === 'expired'
                                                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                                                            : 'bg-slate-500/10 border-slate-500/20 text-slate-300'
                                                }`}>
                                                    {formatDemoSessionStatus(session.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-sm">{formatAdminDate(session.started_at || session.created_at)}</td>
                                            <td className="px-6 py-4 text-slate-400 text-sm">{formatAdminDate(session.expires_at)}</td>
                                            <td className="px-6 py-4 text-slate-300 text-sm">{formatRemainingDuration(session.remaining_seconds)}</td>
                                            <td className="px-6 py-4 text-slate-400 text-sm">
                                                {session.status === 'cleaned'
                                                    ? `${session.cleanup_items_deleted || 0} docs`
                                                    : 'En attente'}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={9} className="px-6 py-12 text-center text-slate-600 text-sm">
                                                Aucune session demo ne correspond aux filtres.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* -- SECURITY -- */}
            {activeSection === 'security' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                        <StatCard label="Echecs connexion (24h)" value={securityStats?.failed_logins_24h || 0} icon={Shield} color="bg-rose-500" />
                        <StatCard label="Connexions reussies" value={securityStats?.successful_logins_24h || 0} icon={CheckCircle2} color="bg-emerald-500" />
                        <StatCard label="Changements MDP (7j)" value={securityStats?.password_changes_7d || 0} icon={Lock} color="bg-amber-500" />
                        <StatCard label="Utilisateurs bloques" value={securityStats?.blocked_users || 0} icon={Trash2} color="bg-primary" />
                        <StatCard label="Verifications" value={verificationEventsTotal} icon={Bell} color="bg-sky-500" />
                        <StatCard label="Sessions actives" value={activeSessions.length} icon={Activity} color="bg-violet-500" />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[1.15fr,0.85fr] gap-6">
                        <div className="glass-card p-5">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div>
                                    <h3 className="text-base font-black text-white uppercase tracking-tighter">Centre d'alertes</h3>
                                    <p className="mt-1 text-xs text-slate-500">Vue de triage pour repérer rapidement les comptes à surveiller et les signaux faibles.</p>
                                </div>
                                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-300">
                                    {securityInsights.activeAlerts} alerte(s)
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-300">Tentatives suspectes</p>
                                    <p className="mt-2 text-3xl font-black text-white">{securityInsights.suspiciousAttempts}</p>
                                    <p className="mt-2 text-xs text-slate-300">Connexions echouees visibles dans les evenements charges.</p>
                                </div>
                                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">Acteurs a surveiller</p>
                                    <p className="mt-2 text-3xl font-black text-white">{securityInsights.riskyActors.length}</p>
                                    <p className="mt-2 text-xs text-slate-300">Utilisateurs ou identifiants avec plusieurs echecs rapproches.</p>
                                </div>
                                <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">Sessions ouvertes</p>
                                    <p className="mt-2 text-3xl font-black text-white">{activeSessions.length}</p>
                                    <p className="mt-2 text-xs text-slate-300">Sessions encore valides a surveiller ou a filtrer rapidement.</p>
                                </div>
                            </div>
                            <div className="mt-5 space-y-3">
                                {securityInsights.riskyActors.length > 0 ? securityInsights.riskyActors.map(([actor, count]) => (
                                    <div key={actor} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-bold text-white">{actor}</p>
                                            <p className="mt-1 text-xs text-slate-500">{count} echec(s) detecte(s) dans les evenements charges.</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSecurityView('failed_logins');
                                                setSecuritySearch(actor === 'unknown' ? '' : actor);
                                            }}
                                            className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-rose-300 transition-all hover:bg-rose-500/15"
                                        >
                                            Enqueter
                                        </button>
                                    </div>
                                )) : (
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-500">
                                        Aucun regroupement prioritaire sur les evenements actuellement charges.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="glass-card p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <h3 className="text-base font-black text-white uppercase tracking-tighter">Vues prêtes à l'emploi</h3>
                                    <p className="mt-1 text-xs text-slate-500">Basculez rapidement vers le bon sous-ensemble de securite.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'all', label: 'Vue complete' },
                                    { id: 'failed_logins', label: 'Echecs connexion' },
                                    { id: 'successful_logins', label: 'Connexions reussies' },
                                    { id: 'password_changes', label: 'Mots de passe' },
                                    { id: 'verifications', label: 'OTP et verifications' },
                                    { id: 'sessions', label: 'Sessions actives' },
                                ].map((view) => (
                                    <button
                                        key={view.id}
                                        onClick={() => setSecurityView(view.id as typeof securityView)}
                                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-all ${securityView === view.id ? 'border-primary/40 bg-primary/10 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                                    >
                                        {view.label}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recherche securite</label>
                                <div className="relative mt-2">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        value={securitySearch}
                                        onChange={(e) => setSecuritySearch(e.target.value)}
                                        placeholder="Email, user_id, IP, session, detail..."
                                        className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white outline-none transition-all focus:border-primary/40"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden">
                        <div className="p-5 border-b border-white/5 bg-white/5 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-base font-black text-white uppercase tracking-tighter">Evenements recents</h3>
                                <p className="mt-1 text-xs text-slate-500">Journal des evenements securite avec recherche et focus par type d'incident.</p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
                                {filteredSecurityEvents.length} evenement(s)
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4">Evenement</th>
                                        <th className="px-6 py-4">Utilisateur</th>
                                        <th className="px-6 py-4">IP / detail</th>
                                        <th className="px-6 py-4">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredSecurityEvents.filter(Boolean).length > 0 ? filteredSecurityEvents.filter(Boolean).map((event: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-white/5">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${String(event.type || '').includes('failed') ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                                    <span className="text-white font-bold text-xs uppercase tracking-widest">{event.type || 'inconnu'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-semibold text-white">{event.user_name || event.user_email || 'Utilisateur inconnu'}</p>
                                                    <p className="text-xs text-slate-500">{event.user_id || event.user_email || 'Identifiant indisponible'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-mono text-slate-400">{event.ip_address || 'IP non remontee'}</p>
                                                    <p className="text-xs text-slate-500">{event.details || event.reason || 'Aucun detail complementaire'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">{formatAdminDate(event.created_at)}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="p-10 text-center text-slate-600 text-sm">Aucun evenement securite ne correspond aux filtres actuels.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden">
                        <div className="p-5 border-b border-white/5 bg-white/5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h3 className="text-base font-black text-white uppercase tracking-tighter">Journal des verifications</h3>
                                <p className="mt-1 text-xs text-slate-500">Historique des verifications e-mail et telephone, avec le provider utilise.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <select
                                    value={verificationChannelFilter}
                                    onChange={(e) => setVerificationChannelFilter(e.target.value as typeof verificationChannelFilter)}
                                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white outline-none transition-all focus:border-primary/40"
                                >
                                    <option value="all">Tous les canaux</option>
                                    <option value="phone">Telephone</option>
                                    <option value="email">E-mail</option>
                                </select>
                                <select
                                    value={verificationProviderFilter}
                                    onChange={(e) => setVerificationProviderFilter(e.target.value as typeof verificationProviderFilter)}
                                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white outline-none transition-all focus:border-primary/40"
                                >
                                    <option value="all">Tous les providers</option>
                                    <option value="firebase">Firebase</option>
                                    <option value="resend">Resend</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Canal</th>
                                        <th className="px-6 py-4">Provider</th>
                                        <th className="px-6 py-4">Utilisateur</th>
                                        <th className="px-6 py-4">Cible</th>
                                        <th className="px-6 py-4">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredSecurityVerifications.filter(Boolean).length > 0 ? filteredSecurityVerifications.filter(Boolean).map((event: any) => (
                                        <tr key={event.event_id || `${event.type}-${event.created_at}`} className="hover:bg-white/5">
                                            <td className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-white">{event.type || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-slate-300">{event.channel || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-slate-300">{event.provider || '-'}</td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-semibold text-white">{event.user_name || event.user_email || 'Inconnu'}</p>
                                                    <p className="text-xs text-slate-500">{event.user_id || '-'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-400">{event.target || event.identifier || event.email || event.phone_number || '-'}</td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{formatAdminDate(event.created_at)}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-600 text-sm">
                                                Aucun evenement de verification pour ces filtres.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden">
                        <div className="p-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-white uppercase tracking-tighter">Sessions actives</h3>
                                <p className="mt-1 text-xs text-slate-500">Vue d'ensemble des sessions encore valides pour les utilisateurs.</p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
                                {filteredSecuritySessions.length} session(s)
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4">Utilisateur</th>
                                        <th className="px-6 py-4">Session</th>
                                        <th className="px-6 py-4">Creee</th>
                                        <th className="px-6 py-4">Expire</th>
                                        <th className="px-6 py-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredSecuritySessions.filter(Boolean).length > 0 ? filteredSecuritySessions.filter(Boolean).map((session: any) => (
                                        <tr key={session.session_id || `${session.user_id}-${session.created_at}`} className="hover:bg-white/5">
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-semibold text-white">{session.user_name || 'Inconnu'}</p>
                                                    <p className="text-xs text-slate-500">{session.user_email || session.user_id || '-'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono text-slate-400">{session.session_id || '-'}</td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{formatAdminDate(session.created_at)}</td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{formatAdminDate(session.expires_at)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setSecuritySearch(session.user_email || session.user_id || '')}
                                                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-white/10"
                                                    >
                                                        Filtrer
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const matchedUser = users.find((user: any) => user.user_id === session.user_id || user.email === session.user_email);
                                                            if (!matchedUser) return;
                                                            handleToggleUser(matchedUser.user_id, matchedUser.is_active !== false);
                                                        }}
                                                        disabled={!users.find((user: any) => user.user_id === session.user_id || user.email === session.user_email)}
                                                        className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-rose-300 transition-all hover:bg-rose-500/15 disabled:opacity-40"
                                                    >
                                                        Suspendre
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-600 text-sm">
                                                Aucune session active ne correspond aux filtres.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'support' && (
                <div className="glass-card overflow-hidden">
                    <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <div>
                            <h3 className="text-base font-black text-white uppercase tracking-tighter">Support Client ({tickets.length})</h3>
                            <p className="mt-1 text-xs text-slate-400">
                                Demandes d'aide liées à l'application : bugs, accès, configuration et questions d'usage.
                            </p>
                        </div>
                        <button onClick={loadTickets} className="p-2 text-slate-400 hover:text-white transition-all">
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <div className="px-5 py-3 border-b border-white/5 bg-white/[0.03] flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 font-bold text-amber-300">
                            À traiter : tickets ouverts d'assistance produit
                        </span>
                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 font-bold text-blue-300">
                            Exemples : connexion, paramétrage, bug, incompréhension d'une fonctionnalité
                        </span>
                    </div>
                    <div className="divide-y divide-white/5">
                        {tickets.filter(Boolean).length > 0 ? tickets.filter(Boolean).map((ticket: any) => (
                            <div key={ticket.ticket_id}>
                                <div className="p-5 hover:bg-white/5 transition-all flex justify-between items-center group">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${ticket.status === 'open' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                            <h4 className="text-white font-bold">{ticket.subject}</h4>
                                            <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-300">
                                                {ticket.type || 'Assistance'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">De <span className="text-slate-400 font-semibold">{ticket.user_name}</span> · {new Date(ticket.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <button
                                        onClick={() => { setReplyTicketId(replyTicketId === ticket.ticket_id ? null : ticket.ticket_id); setReplyContent(''); }}
                                        className={`px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${replyTicketId === ticket.ticket_id ? 'bg-primary text-white border-primary' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-primary hover:text-white hover:border-primary'}`}
                                    >
                                        Répondre
                                    </button>
                                </div>
                                {replyTicketId === ticket.ticket_id && (
                                    <div className="px-5 pb-4 flex gap-3 animate-in slide-in-from-top-2 duration-200">
                                        <input
                                            type="text"
                                            value={replyContent}
                                            onChange={e => setReplyContent(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleReplyTicket()}
                                            placeholder="Votre réponse"
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary/50 transition-all"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleReplyTicket}
                                            disabled={replying || !replyContent.trim()}
                                            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-primary/80 transition-all"
                                        >
                                            {replying ? '...' : 'Envoyer'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="p-20 text-center text-slate-600 font-black uppercase tracking-widest text-xs opacity-40">{'Tous les tickets sont r\u00e9solus ?'}</div>
                        )}
                    </div>
                </div>
            )}

            {/* -- BROADCAST -- */}
            {activeSection === 'leads' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <StatCard label="Contact Messages" value={leadContacts.length} icon={Mail} color="bg-blue-500" />
                        <StatCard label="Newsletter Subscribers" value={leadSubscribers.length} icon={Newspaper} color="bg-emerald-500" />
                    </div>

                    {leadsLoading && (
                        <div className="text-center py-12 text-slate-500">Chargement...</div>
                    )}

                    {/* Contact Messages */}
                    <div className="glass-card overflow-hidden">
                        <div className="p-5 border-b border-white/5 bg-white/5">
                            <div className="flex items-center gap-3">
                                <Mail size={20} className="text-blue-400" />
                                <h4 className="text-base font-black text-white uppercase tracking-tighter">Messages de contact</h4>
                                <span className="text-xs text-slate-500 ml-auto">{leadContacts.length} message(s)</span>
                            </div>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {leadContacts.filter(Boolean).length > 0 ? leadContacts.filter(Boolean).map((c: any) => (
                                <div key={c._id || c.email + c.created_at} className="p-5 hover:bg-white/5 transition-all">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-white">{c.name}</span>
                                                {c.type && (
                                                    <span className="rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-300 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest">
                                                        {c.type}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-primary">{c.email}</p>
                                            {c.company && <p className="text-xs text-slate-500">?? {c.company}</p>}
                                            <p className="text-sm text-slate-300 leading-relaxed mt-2">{c.message}</p>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                            {formatAdminDate(c.created_at)}
                                        </span>
                                    </div>
                                </div>
                            )) : !leadsLoading ? (
                                <div className="p-12 text-center text-slate-600 text-sm">
                                    Aucun message de contact pour le moment.
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Newsletter Subscribers */}
                    <div className="glass-card overflow-hidden">
                        <div className="p-5 border-b border-white/5 bg-white/5">
                            <div className="flex items-center gap-3">
                                <Newspaper size={20} className="text-emerald-400" />
                                <h4 className="text-base font-black text-white uppercase tracking-tighter">Abonnés newsletter</h4>
                                <span className="text-xs text-slate-500 ml-auto">{leadSubscribers.length} abonné(s)</span>
                            </div>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {leadSubscribers.filter(Boolean).length > 0 ? leadSubscribers.filter(Boolean).map((s: any) => (
                                <div key={s._id || s.email} className="p-4 hover:bg-white/5 transition-all flex items-center justify-between">
                                    <span className="text-sm font-semibold text-white">{s.email}</span>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        {formatAdminDate(s.created_at)}
                                    </span>
                                </div>
                            )) : !leadsLoading ? (
                                <div className="p-12 text-center text-slate-600 text-sm">
                                    Aucun abonné newsletter pour le moment.
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'broadcast' && (
                <div className="grid grid-cols-1 xl:grid-cols-[1.1fr,0.9fr] gap-8">
                    <div className="glass-card p-8 bg-gradient-to-br from-primary/5 to-transparent">
                        <div className="flex items-center gap-3 mb-8">
                            <Bell size={28} className="text-primary" />
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Diffusion Globale</h3>
                        </div>
                        <div className="space-y-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Titre</label>
                                <input
                                    type="text"
                                    value={broadcastForm.title}
                                    onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                                    className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 transition-all"
                                    placeholder="Ex: Nouvelle mise à jour disponible !"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Message</label>
                                <textarea
                                    value={broadcastForm.message}
                                    onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                                    rows={5}
                                    className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 transition-all resize-none"
                                    placeholder="Contenu du messagé"
                                />
                            </div>
                            <button
                                onClick={async () => {
                                    if (!broadcastForm.message.trim()) return;
                                    setSaving(true);
                                    try {
                                        await adminApi.broadcast(broadcastForm.message, broadcastForm.title);
                                        showToast('Message diffusé à tous les utilisateurs.');
                                        setBroadcastForm({ title: '', message: '' });
                                        await loadBroadcastHistory();
                                    } catch {
                                        showToast('Erreur lors de la diffusion.', 'error');
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving || !broadcastForm.message.trim()}
                                className="w-full py-4 rounded-xl bg-primary text-white font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                            >
                                {saving ? 'Envoi en cours…' : 'Diffuser à tous les utilisateurs'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="glass-card p-6 border-amber-500/20 bg-amber-500/5">
                            <h4 className="text-amber-400 font-black uppercase tracking-widest text-xs mb-3">? Attention</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Les messages seront envoyés instantanément à <strong className="text-white">tous les utilisateurs</strong> (Shopkeepers et Suppliers) via push notification. Vérifiez le contenu avant d'envoyer.
                            </p>
                        </div>
                        <div className="glass-card p-6">
                            <h4 className="text-slate-400 font-black uppercase tracking-widest text-xs mb-4">Aperçu mobile</h4>
                            <div className="bg-[#020617] rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center text-center gap-3 min-h-[180px]">
                                <Bell size={24} className="text-primary" />
                                <p className="text-white font-black text-sm">{broadcastForm.title || 'Titre du message'}</p>
                                <p className="text-slate-500 text-xs px-4 leading-relaxed">{broadcastForm.message || 'Le contenu apparaîtra ici.'}</p>
                            </div>
                        </div>
                        <div className="glass-card overflow-hidden">
                            <div className="p-5 border-b border-white/5 bg-white/5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h4 className="text-base font-black text-white uppercase tracking-tighter">Historique des messages</h4>
                                    <p className="mt-1 text-xs text-slate-500">{messageHistoryTotal} message(s) archiv?(s) pour suivi admin.</p>
                                </div>
                                <select
                                    value={messageTypeFilter}
                                    onChange={(e) => setMessageTypeFilter(e.target.value as typeof messageTypeFilter)}
                                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white outline-none transition-all focus:border-primary/40"
                                >
                                    <option value="all">Tous les types</option>
                                    <option value="broadcast">Broadcast</option>
                                    <option value="announcement">Annonce</option>
                                    <option value="individual">Individuel</option>
                                </select>
                            </div>
                            <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto custom-scrollbar">
                                {messageHistory.filter(Boolean).length > 0 ? messageHistory.filter(Boolean).map((message: any) => (
                                    <div key={message.message_id || `${message.sent_at}-${message.title}`} className="p-5 hover:bg-white/5 transition-all">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${message.type === 'broadcast'
                                                        ? 'border-violet-500/20 bg-violet-500/10 text-violet-300'
                                                        : message.type === 'individual'
                                                            ? 'border-sky-500/20 bg-sky-500/10 text-sky-300'
                                                            : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                                                        }`}>
                                                        {message.type || 'message'}
                                                    </span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                        {formatAdminDate(message.sent_at)}
                                                    </span>
                                                </div>
                                                <h5 className="text-sm font-bold text-white">{message.title || 'Sans titre'}</h5>
                                                <p className="text-sm leading-relaxed text-slate-300">{message.content}</p>
                                            </div>
                                            <div className="min-w-[180px] space-y-1 text-right">
                                                <p className="text-xs text-slate-500">Cible</p>
                                                <p className="text-sm font-semibold text-white">{message.target || 'all'}</p>
                                                <p className="text-xs text-slate-500">Envoyé par {message.sent_by || 'admin'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-12 text-center text-slate-600 text-sm">
                                        Aucun message admin pour ce filtre.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'legal' && (
                <div className="grid grid-cols-1 gap-8">
                    <div className="glass-card p-6 border border-primary/10 bg-primary/5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Documents juridiques</h3>
                                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
                                    Modifiez ici les CGU et la politique de confidentialité affichées dans l'application. Les changements sont enregistrés en base et deviennent la source affichée aux utilisateurs.
                                </p>
                            </div>
                            <button
                                onClick={loadLegalDocuments}
                                className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"
                                title="Rafraîchir"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    </div>

                    {legalLoading ? (
                        <div className="glass-card p-12 flex items-center justify-center">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-8">
                            <div className="glass-card p-8">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <h4 className="text-xl font-black text-white">Conditions générales d'utilisation</h4>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                            Version française de référence affichée dans l'application pour les CGU.
                                        </p>
                                        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                                            Dernière mise à jour : {formatAdminDate(cguUpdatedAt)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            setLegalSaving('cgu');
                                            try {
                                                await adminApi.updateCGU(cguContent);
                                                await loadLegalDocuments();
                                                showToast('CGU mises à jour.');
                                            } catch {
                                                showToast("Impossible d'enregistrer les CGU.", 'error');
                                            } finally {
                                                setLegalSaving(null);
                                            }
                                        }}
                                        disabled={legalSaving === 'cgu' || !cguContent.trim()}
                                        className="rounded-xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {legalSaving === 'cgu' ? 'Enregistrement...' : 'Enregistrer les CGU'}
                                    </button>
                                </div>
                                <textarea
                                    value={cguContent}
                                    onChange={(e) => setCguContent(e.target.value)}
                                    rows={28}
                                    className="mt-6 min-h-[560px] w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-white outline-none transition-all focus:border-primary/40"
                                    placeholder="Saisissez ici les CGU au format Markdown."
                                />
                            </div>

                            <div className="glass-card p-8">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <h4 className="text-xl font-black text-white">Politique de confidentialité</h4>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                            Version française de référence affichée dans l'application pour la confidentialité et la protection des données.
                                        </p>
                                        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                                            Dernière mise à jour : {formatAdminDate(privacyUpdatedAt)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            setLegalSaving('privacy');
                                            try {
                                                await adminApi.updatePrivacy(privacyContent);
                                                await loadLegalDocuments();
                                                showToast('Politique de confidentialité mise à jour.');
                                            } catch {
                                                showToast("Impossible d'enregistrer la politique de confidentialité.", 'error');
                                            } finally {
                                                setLegalSaving(null);
                                            }
                                        }}
                                        disabled={legalSaving === 'privacy' || !privacyContent.trim()}
                                        className="rounded-xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {legalSaving === 'privacy' ? 'Enregistrement...' : 'Enregistrer la politique'}
                                    </button>
                                </div>
                                <textarea
                                    value={privacyContent}
                                    onChange={(e) => setPrivacyContent(e.target.value)}
                                    rows={28}
                                    className="mt-6 min-h-[560px] w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-white outline-none transition-all focus:border-primary/40"
                                    placeholder="Saisissez ici la politique de confidentialité au format Markdown."
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
