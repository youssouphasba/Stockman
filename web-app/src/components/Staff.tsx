'use client';
// Force redeploy with latest fixes

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Users,
    UserPlus,
    Search,
    Mail,
    Shield,
    ShieldCheck,
    ShieldAlert,
    Trash2,
    Edit2,
    CheckCircle2,
    XCircle,
    Eye,
    Pencil,
    MessageSquare,
    ExternalLink,
    Store,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { subUsers as subUsersApi, stores as storesApi } from '../services/api';
import type { PermissionLevel, UserPermissions, StorePermissions } from '../services/api';
import Modal from './Modal';
import ScreenGuide, { GuideStep } from './ScreenGuide';

const MODULE_LABEL_KEYS: Record<string, string> = {
    pos: 'staff.module_pos',
    stock: 'staff.module_stock',
    accounting: 'staff.module_accounting',
    crm: 'staff.module_crm',
    suppliers: 'staff.module_suppliers',
    staff: 'staff.module_team',
};

type StaffPermissions = Record<keyof UserPermissions, PermissionLevel>;

type AccountRole = 'billing_admin' | 'org_admin';

const ROLE_TEMPLATE_KEYS: Record<string, { labelKey: string; permissions: StaffPermissions }> = {
    cashier: { labelKey: 'staff.role_cashier', permissions: { pos: 'write', stock: 'read', accounting: 'none', crm: 'read', suppliers: 'none', staff: 'none' } },
    stock_manager: { labelKey: 'staff.role_stock', permissions: { pos: 'none', stock: 'write', accounting: 'none', crm: 'none', suppliers: 'read', staff: 'none' } },
    accountant: { labelKey: 'staff.role_accountant', permissions: { pos: 'read', stock: 'read', accounting: 'write', crm: 'none', suppliers: 'read', staff: 'none' } },
    manager: { labelKey: 'staff.role_manager', permissions: { pos: 'write', stock: 'write', accounting: 'read', crm: 'write', suppliers: 'write', staff: 'write' } },
    crm_agent: { labelKey: 'staff.role_crm', permissions: { pos: 'read', stock: 'none', accounting: 'none', crm: 'write', suppliers: 'none', staff: 'none' } },
};

export default function Staff() {
    const { t } = useTranslation();
    const [users, setUsers] = useState<any[]>([]);
    const [stores, setStores] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState<{
        name: string;
        email: string;
        password: string;
        permissions: StaffPermissions;
        accountRoles: AccountRole[];
        storeIds: string[];
        storePermissions: StorePermissions;
    }>({
        name: '',
        email: '',
        password: '',
        permissions: {
            stock: 'none',
            accounting: 'none',
            crm: 'none',
            pos: 'read',
            suppliers: 'none',
            staff: 'none',
        },
        accountRoles: [],
        storeIds: [],
        storePermissions: {},
    });
    const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);
    const formBaselineRef = useRef('');

    const confirmDiscardChanges = (onConfirm: () => void) => {
        const title = t('common.unsaved_changes_title', { defaultValue: 'Modifications non enregistrées' });
        const message = t('common.unsaved_changes_message', { defaultValue: 'Vous avez des modifications non enregistrées. Voulez-vous quitter sans enregistrer ?' });
        if (window.confirm(`${title}\n\n${message}`)) {
            onConfirm();
        }
    };

    const getFormSnapshot = () => JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        permissions: form.permissions,
        accountRoles: form.accountRoles,
        storeIds: form.storeIds,
        storePermissions: form.storePermissions,
        editingId: editingUser?.user_id || '',
    });

    const requestCloseModal = () => {
        if (!formBaselineRef.current || formBaselineRef.current === getFormSnapshot()) {
            setIsModalOpen(false);
            return;
        }
        confirmDiscardChanges(() => setIsModalOpen(false));
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            setError(null);
            const [data, storesData] = await Promise.all([
                subUsersApi.list(),
                storesApi.list().catch(() => []),
            ]);
            setUsers(Array.isArray(data) ? data : []);
            setStores(Array.isArray(storesData) ? storesData : []);
        } catch (err: any) {
            console.error("Staff load error", err);
            setError(err.message || "Erreur de chargement");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setEditingUser(null);
        const baseline = {
            name: '',
            email: '',
            password: '',
            permissions: {
                stock: 'none',
                accounting: 'none',
                crm: 'none',
                pos: 'read',
                suppliers: 'none',
                staff: 'none',
            },
            accountRoles: [],
            storeIds: [],
            storePermissions: {},
        };
        setForm(baseline);
        setExpandedStoreId(null);
        formBaselineRef.current = JSON.stringify({ ...baseline, editingId: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (user: any) => {
        setEditingUser(user);
        const baseline = {
            name: user.name,
            email: user.email,
            password: '',
            permissions: {
                stock: 'none',
                accounting: 'none',
                crm: 'none',
                pos: 'read',
                suppliers: 'none',
                staff: 'none',
                ...(user.permissions || {})
            },
            accountRoles: user.account_roles || [],
            storeIds: user.store_ids || [],
            storePermissions: user.store_permissions || {},
        };
        setForm(baseline);
        setExpandedStoreId((user.store_ids || [])[0] || null);
        formBaselineRef.current = JSON.stringify({ ...baseline, editingId: user.user_id || '' });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingUser) {
                await subUsersApi.update(editingUser.user_id, {
                    name: form.name,
                    permissions: form.permissions,
                    account_roles: form.accountRoles,
                    store_ids: form.storeIds,
                    store_permissions: form.storePermissions,
                });
            } else {
                await subUsersApi.create({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    permissions: form.permissions,
                    account_roles: form.accountRoles,
                    store_ids: form.storeIds,
                    store_permissions: form.storePermissions,
                    role: 'staff'
                });
            }
            setIsModalOpen(false);
            loadUsers();
        } catch (err) {
            console.error("Staff save error", err);
            alert(t('common.error'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm(t('users.delete_user_confirm'))) return;
        try {
            await subUsersApi.delete(userId);
            loadUsers();
        } catch (err) {
            console.error("Delete user error", err);
        }
    };

    const togglePermission = (module: keyof StaffPermissions) => {
        const levels: ('none' | 'read' | 'write')[] = ['none', 'read', 'write'];
        const current = form.permissions[module] || 'none';
        const currentIndex = levels.indexOf(current as any);
        const next = levels[(currentIndex + 1) % levels.length];

        setForm({
            ...form,
            permissions: {
                ...form.permissions,
                [module]: next
            }
        });
    };

    const handleWhatsAppInvite = (user: any) => {
        const appUrl = window.location.origin;
        const message = t('users.whatsapp_invite_msg', {
            name: user.name,
            email: user.email,
            password: '********',
            url: appUrl
        });
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const toggleAccountRole = (role: AccountRole) => {
        if (role === 'org_admin' && !form.accountRoles.includes('org_admin')) {
            const confirmed = window.confirm('Admin operations donne un acces complet aux operations, aux magasins et a la gestion d equipe. Continuer ?');
            if (!confirmed) return;
        }
        setForm((prev) => ({
            ...prev,
            accountRoles: prev.accountRoles.includes(role)
                ? prev.accountRoles.filter((r) => r !== role)
                : [...prev.accountRoles, role]
        }));
    };

    const toggleStoreAssignment = (storeId: string) => {
        setForm((prev) => {
            const isSelected = prev.storeIds.includes(storeId);
            const nextStoreIds = isSelected ? prev.storeIds.filter((id) => id !== storeId) : [...prev.storeIds, storeId];
            const nextStorePermissions = { ...prev.storePermissions };
            if (isSelected) {
                delete nextStorePermissions[storeId];
            }
            if (!expandedStoreId && !isSelected) {
                setExpandedStoreId(storeId);
            }
            if (expandedStoreId === storeId && isSelected) {
                setExpandedStoreId(nextStoreIds[0] || null);
            }
            return {
                ...prev,
                storeIds: nextStoreIds,
                storePermissions: nextStorePermissions,
            };
        });
    };

    const toggleStorePermission = (storeId: string, module: keyof StaffPermissions) => {
        setForm((prev) => {
            const currentStorePermissions = { ...(prev.storePermissions[storeId] || {}) };
            const current = currentStorePermissions[module] || prev.permissions[module] || 'none';
            const next = current === 'none' ? 'read' : current === 'read' ? 'write' : 'none';
            if (next === prev.permissions[module]) {
                delete currentStorePermissions[module];
            } else {
                currentStorePermissions[module] = next;
            }
            const nextStorePermissions = { ...prev.storePermissions };
            if (Object.keys(currentStorePermissions).length === 0) {
                delete nextStorePermissions[storeId];
            } else {
                nextStorePermissions[storeId] = currentStorePermissions;
            }
            return {
                ...prev,
                storePermissions: nextStorePermissions,
            };
        });
    };

    const getPermissionBadge = (level: string) => {
        switch (level) {
            case 'write': return <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase"><Pencil size={10} /> {t('users.perm_management')}</span>;
            case 'read': return <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 uppercase"><Eye size={10} /> {t('users.perm_read_only')}</span>;
            default: return <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 uppercase"><XCircle size={10} /> {t('users.perm_no_access')}</span>;
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    const filteredUsers = (Array.isArray(users) ? users : []).filter(u =>
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase())
    );

    const staffSteps: GuideStep[] = [
        {
            title: t('guide.staff.role_title', "Rôle de l'écran Personnel"),
            content: t('guide.staff.role_content', "Cet écran permet de gérer les comptes de votre équipe et de contrôler finement ce que chaque membre peut voir et faire dans l'application. Chaque employé a un identifiant et un mot de passe pour se connecter."),
        },
        {
            title: t('guide.staff.list_title', "Liste du personnel"),
            content: t('guide.staff.list_content', "Chaque membre de l'équipe est affiché sous forme de carte."),
            details: [
                { label: t('guide.staff.search', "Barre de recherche"), description: t('guide.staff.search_desc', "Trouvez un employé par nom ou email."), type: 'filter' as const },
                { label: t('guide.staff.btn_add', "Bouton + Ajouter un employé"), description: t('guide.staff.btn_add_desc', "Ouvre le formulaire de création d'un nouveau compte employé."), type: 'button' as const },
                { label: t('guide.staff.card_member', "Carte membre"), description: t('guide.staff.card_member_desc', "Affiche nom, email, nombre de boutiques assignées, badges de permissions et rôles spéciaux."), type: 'card' as const },
                { label: t('guide.staff.btn_edit', "Modifier (crayon)"), description: t('guide.staff.btn_edit_desc', "Modifie les permissions, les boutiques assignées et les rôles de l'employé."), type: 'button' as const },
                { label: t('guide.staff.btn_delete', "Supprimer (🗑️)"), description: t('guide.staff.btn_delete_desc', "Supprime le compte de l'employé. L'historique des actions reste conservé."), type: 'button' as const },
                { label: t('guide.staff.btn_whatsapp', "Icône WhatsApp"), description: t('guide.staff.btn_whatsapp_desc', "Envoie un message WhatsApp avec les identifiants de connexion à l'employé."), type: 'button' as const },
            ],
        },
        {
            title: t('guide.staff.form_title', "Formulaire d'ajout / modification"),
            content: t('guide.staff.form_content', "Le formulaire permet de configurer précisément l'accès de chaque employé."),
            details: [
                { label: t('guide.staff.role_templates', "Modèles de rôle"), description: t('guide.staff.role_templates_desc', "Boutons préconfigurés : Caissier, Gestionnaire de stock, Comptable, Manager, Agent CRM. Chaque modèle préremplit les permissions standard du poste."), type: 'button' as const },
                { label: t('guide.staff.permissions', "Permissions par module"), description: t('guide.staff.permissions_desc', "Pour chaque module (POS, Stock, Comptabilité, CRM, Fournisseurs, Personnel), définissez : Aucun accès / Lecture seule / Lecture + écriture."), type: 'info' as const },
                { label: t('guide.staff.special_roles', "Rôles spéciaux"), description: t('guide.staff.special_roles_desc', "Admin facturation : gère l'abonnement. Admin organisation : peut gérer le personnel et les boutiques."), type: 'info' as const },
                { label: t('guide.staff.store_assign', "Assignation aux boutiques"), description: t('guide.staff.store_assign_desc', "Choisissez à quelle(s) boutique(s) l'employé a accès. Vous pouvez définir des permissions différentes par boutique."), type: 'info' as const },
            ],
        },
    ];

    return (
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
            <ScreenGuide steps={staffSteps} guideKey="staff_tour" />
            {error && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-rose-500">
                        <ShieldAlert size={20} />
                        <span className="font-medium text-sm">{error}</span>
                    </div>
                    <button
                        onClick={loadUsers}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all"
                    >
                        Réessayer
                    </button>
                </div>
            )}

            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('users.title') || 'Gestion de l\'Équipe'}</h1>
                    <p className="text-slate-400">{t('users.subtitle_empty') || 'Gérez vos employés et leurs accès aux différents modules.'}</p>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="btn-primary rounded-xl px-5 py-3 flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105"
                >
                    <UserPlus size={20} /> {t('users.new_employee_title') || 'Ajouter un employée'}
                </button>
            </header>

            {/* User List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map(user => (
                    <div key={user.user_id} className="glass-card p-6 flex flex-col gap-6 group hover:border-primary/30 transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl border-2 border-primary/10">
                                    {(user.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-white font-bold">{user.name}</h3>
                                    <p className="text-xs text-slate-400">{user.email}</p>
                                    {!!(user.store_ids || []).length && (
                                        <p className="text-[11px] text-slate-500 mt-1">{user.store_ids.length} magasin(s) assignes</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleWhatsAppInvite(user)} className="p-2 rounded-lg bg-white/5 text-emerald-500 hover:bg-emerald-500/10 transition-all" title="Inviter">
                                    <MessageSquare size={16} />
                                </button>
                                <button onClick={() => handleOpenEdit(user)} className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all">
                                    <Edit2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-4">{t('users.permissions_section_title')}</h4>
                            {(user.account_roles || []).length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {(user.account_roles || []).map((role: AccountRole) => (
                                        <span key={role} className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase">
                                            {role === 'org_admin' ? 'Admin opérations' : 'Admin facturation'}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(user.permissions || {}).map(([mod, level]: [string, any]) => (
                                    <div key={mod} className="flex flex-col gap-1">
                                        <span className="text-[10px] text-slate-400 capitalize">{mod}</span>
                                        {getPermissionBadge(level)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => handleDelete(user.user_id)}
                            className="mt-2 w-full py-2 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                        >
                            <Trash2 size={14} className="inline mr-2" /> {t('users.delete_btn')}
                        </button>
                    </div>
                ))}

                {filteredUsers.length === 0 && (
                    <div className="col-span-full p-20 glass-card text-center text-slate-500 flex flex-col items-center gap-4">
                        <Users size={64} className="opacity-10" />
                        <p>{t('users.empty_state_title')}</p>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={requestCloseModal}
                title={editingUser ? t('users.edit_access_title') : t('users.new_employee_title')}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-slate-400 font-medium">{t('users.full_name_label')}</label>
                            <input
                                required
                                type="text"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                            />
                        </div>

                        {!editingUser && (
                            <>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-slate-400 font-medium">{t('users.email_label')}</label>
                                    <input
                                        required
                                        type="email"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-slate-400 font-medium">{t('users.password_label')}</label>
                                    <input
                                        required
                                        type="password"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/10">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">{t('users.permissions_section_title')}</h3>

                        {/* Role Templates */}
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(ROLE_TEMPLATE_KEYS).map(([key, tpl]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, permissions: tpl.permissions }))}
                                    className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:border-primary/50 hover:text-primary hover:bg-primary/10 transition-all"
                                >
                                    {t(tpl.labelKey)}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            {(['pos', 'stock', 'accounting', 'crm', 'suppliers', 'staff'] as (keyof StaffPermissions)[]).map(mod => (
                                <div key={mod} className="flex items-center justify-between p-3 glass-card bg-white/5 border-white/10">
                                    <span className="text-slate-200 font-medium">{t(MODULE_LABEL_KEYS[mod] || mod)}</span>
                                    <button
                                        type="button"
                                        onClick={() => togglePermission(mod)}
                                        className="transition-all active:scale-95"
                                    >
                                        {getPermissionBadge(form.permissions[mod])}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3 pt-2">
                            <div>
                                <h4 className="text-sm font-bold text-white">Magasins assignes</h4>
                                <p className="text-xs text-slate-500 mt-1">Les droits generaux s appliquent partout, puis tu peux affiner magasin par magasin.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {stores.map((store) => {
                                    const selected = form.storeIds.includes(store.store_id);
                                    return (
                                        <button
                                            key={store.store_id}
                                            type="button"
                                            onClick={() => toggleStoreAssignment(store.store_id)}
                                            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-slate-400'}`}
                                        >
                                            {store.name}
                                        </button>
                                    );
                                })}
                            </div>

                            {form.storeIds.map((storeId) => {
                                const store = stores.find((item) => item.store_id === storeId);
                                const isExpanded = expandedStoreId === storeId;
                                return (
                                    <div key={storeId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedStoreId(isExpanded ? null : storeId)}
                                            className="w-full flex items-center justify-between gap-4 text-left"
                                        >
                                            <div>
                                                <div className="text-sm font-bold text-white">{store?.name || storeId}</div>
                                                <div className="text-[11px] text-slate-500 mt-1">
                                                    {form.storePermissions[storeId] ? 'Droits specifiques configures' : 'Suit les permissions generales'}
                                                </div>
                                            </div>
                                            {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                                        </button>
                                        {isExpanded && (
                                            <div className="space-y-2 mt-4">
                                                {(['pos', 'stock', 'accounting', 'crm', 'suppliers', 'staff'] as (keyof StaffPermissions)[]).map(mod => (
                                                    <div key={`${storeId}-${mod}`} className="flex items-center justify-between p-3 glass-card bg-white/5 border-white/10">
                                                        <span className="text-slate-200 font-medium">{t(MODULE_LABEL_KEYS[mod] || mod)}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleStorePermission(storeId, mod)}
                                                            className="transition-all active:scale-95"
                                                        >
                                                            {getPermissionBadge(form.storePermissions[storeId]?.[mod] || form.permissions[mod])}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="space-y-2 pt-2">
                            <div className="text-xs text-slate-500">`Admin facturation` gere l abonnement. `Admin operations` gere les magasins, les modules et l equipe.</div>
                            <div className="flex items-center justify-between p-3 glass-card bg-white/5 border-white/10">
                                <span className="text-slate-200 font-medium">Admin facturation</span>
                                <button
                                    type="button"
                                    onClick={() => toggleAccountRole('billing_admin')}
                                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${form.accountRoles.includes('billing_admin') ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                                >
                                    {form.accountRoles.includes('billing_admin') ? 'Actif' : 'Inactif'}
                                </button>
                            </div>
                            <div className="flex items-center justify-between p-3 glass-card bg-white/5 border-white/10">
                                <span className="text-slate-200 font-medium">Admin opérations</span>
                                <button
                                    type="button"
                                    onClick={() => toggleAccountRole('org_admin')}
                                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${form.accountRoles.includes('org_admin') ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                                >
                                    {form.accountRoles.includes('org_admin') ? 'Actif' : 'Inactif'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6 mt-6 border-t border-white/10">
                        <button
                            type="button"
                            onClick={requestCloseModal}
                            className="flex-1 px-4 py-2 text-slate-400 hover:text-white transition-colors font-bold"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 btn-primary py-2 rounded-lg font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {saving ? '...' : t('common.save')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
