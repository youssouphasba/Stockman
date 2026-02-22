'use client';

import React, { useState, useEffect } from 'react';
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
    ExternalLink
} from 'lucide-react';
import { subUsers as subUsersApi } from '../services/api';
import Modal from './Modal';

const MODULE_LABELS: Record<string, string> = {
    pos:        '🧾 Ventes (POS)',
    stock:      '📦 Stock',
    accounting: '💼 Comptabilité',
    crm:        '👥 Clients (CRM)',
    suppliers:  '🚚 Fournisseurs',
    staff:      '🏪 Gestion équipe',
};

const ROLE_TEMPLATES: Record<string, { label: string; permissions: Record<string, string> }> = {
    cashier:       { label: '🧾 Caissier',       permissions: { pos: 'write', stock: 'read',  accounting: 'none',  crm: 'read',  suppliers: 'none',  staff: 'none'  } },
    stock_manager: { label: '📦 Stock',           permissions: { pos: 'none',  stock: 'write', accounting: 'none',  crm: 'none',  suppliers: 'read',  staff: 'none'  } },
    accountant:    { label: '💼 Comptable',       permissions: { pos: 'read',  stock: 'read',  accounting: 'write', crm: 'none',  suppliers: 'read',  staff: 'none'  } },
    manager:       { label: '🏪 Manager',         permissions: { pos: 'write', stock: 'write', accounting: 'read',  crm: 'write', suppliers: 'write', staff: 'write' } },
    crm_agent:     { label: '👥 CRM / Clients',   permissions: { pos: 'read',  stock: 'none',  accounting: 'none',  crm: 'write', suppliers: 'none',  staff: 'none'  } },
};

export default function Staff() {
    const { t } = useTranslation();
    const [users, setUsers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
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
        }
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            setError(null);
            const data = await subUsersApi.list();
            setUsers(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error("Staff load error", err);
            setError(err.message || "Erreur de chargement");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setEditingUser(null);
        setForm({
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
            }
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (user: any) => {
        setEditingUser(user);
        setForm({
            name: user.name,
            email: user.email,
            password: '',
            permissions: user.permissions || {
                stock: 'none',
                accounting: 'none',
                crm: 'none',
                pos: 'read',
                suppliers: 'none',
                staff: 'none',
            }
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingUser) {
                await subUsersApi.update(editingUser.user_id, {
                    name: form.name,
                    permissions: form.permissions
                });
            } else {
                await subUsersApi.create({
                    ...form,
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

    const togglePermission = (module: string) => {
        const levels: ('none' | 'read' | 'write')[] = ['none', 'read', 'write'];
        const current = (form.permissions as any)[module] || 'none';
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
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
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
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-white font-bold">{user.name}</h3>
                                    <p className="text-xs text-slate-400">{user.email}</p>
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
                onClose={() => setIsModalOpen(false)}
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
                            {Object.entries(ROLE_TEMPLATES).map(([key, tpl]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, permissions: { ...tpl.permissions } }))}
                                    className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:border-primary/50 hover:text-primary hover:bg-primary/10 transition-all"
                                >
                                    {tpl.label}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            {['pos', 'stock', 'accounting', 'crm', 'suppliers', 'staff'].map(mod => (
                                <div key={mod} className="flex items-center justify-between p-3 glass-card bg-white/5 border-white/10">
                                    <span className="text-slate-200 font-medium">{MODULE_LABELS[mod] || mod}</span>
                                    <button
                                        type="button"
                                        onClick={() => togglePermission(mod)}
                                        className="transition-all active:scale-95"
                                    >
                                        {getPermissionBadge((form.permissions as any)[mod])}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6 mt-6 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
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
