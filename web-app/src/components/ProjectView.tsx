
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Hammer, Plus, HardHat, Truck, FileText, LayoutDashboard,
    Play, CheckCircle2, XCircle, Loader2, Users, Package,
    MapPin, TrendingUp, DollarSign, Calendar, BookOpen, UserCheck, BarChart3, Printer, Trash2, CloudSun, CloudRain, Sun, Wind
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { projects, products as productsApi, Project, ProjectDashboard } from '../services/api';
import { useDateFormatter } from '../hooks/useDateFormatter';

type SubTab = 'dashboard' | 'projects' | 'devis' | 'journal' | 'sousTraitants' | 'planning' | 'materials' | 'situations';

const CORPS_OPTIONS = [
    { key: 'gros_oeuvre', labelKey: 'projects.corps_gros_oeuvre', icon: '🧱' },
    { key: 'plomberie', labelKey: 'projects.corps_plomberie', icon: '🚿' },
    { key: 'electricite', labelKey: 'projects.corps_electricite', icon: '⚡' },
    { key: 'peinture', labelKey: 'projects.corps_peinture', icon: '🎨' },
    { key: 'carrelage', labelKey: 'projects.corps_carrelage', icon: '🧱' },
    { key: 'menuiserie', labelKey: 'projects.corps_menuiserie', icon: '🪑' },
    { key: 'toiture', labelKey: 'projects.corps_toiture', icon: '🏠' },
    { key: 'ferronnerie', labelKey: 'projects.corps_ferronnerie', icon: '⚒️' },
    { key: 'etancheite', labelKey: 'projects.corps_etancheite', icon: '💧' },
    { key: 'autre', labelKey: 'projects.corps_autre', icon: '📦' },
];

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
            <div className="w-full max-w-lg bg-[#1E293B] rounded-t-2xl p-4 md:p-6 max-h-[85vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-lg font-black text-white">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><XCircle size={22} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
            {children}
        </div>
    );
}

const input = "w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50";

const statusColor = (s: string) => {
    switch (s) {
        case 'devis': return 'bg-amber-500/20 text-amber-400';
        case 'en_cours': return 'bg-blue-500/20 text-blue-400';
        case 'termine': return 'bg-emerald-500/20 text-emerald-400';
        case 'facture': return 'bg-purple-500/20 text-purple-400';
        default: return 'bg-slate-500/20 text-slate-400';
    }
};

const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toFixed(0);
};

export default function ProjectView() {
    const { t } = useTranslation();
    const { formatCurrency } = useDateFormatter();
    const [activeTab, setActiveTab] = useState<SubTab>('projects');
    const [loading, setLoading] = useState(true);
    const [projectList, setProjectList] = useState<Project[]>([]);
    const [dashboard, setDashboard] = useState<ProjectDashboard | null>(null);
    const [productsList, setProductsList] = useState<any[]>([]);

    // Modals
    const [showNewProject, setShowNewProject] = useState(false);
    const [showAllocate, setShowAllocate] = useState(false);
    const [showLabor, setShowLabor] = useState(false);
    const [showSituation, setShowSituation] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any | null>(null);

    // BTP new modals
    const [showDevisModal, setShowDevisModal] = useState(false);
    const [showJournalModal, setShowJournalModal] = useState(false);
    const [showSubModal, setShowSubModal] = useState(false);
    const [showPhaseModal, setShowPhaseModal] = useState(false);
    const [showPaySubModal, setShowPaySubModal] = useState<string | null>(null); // sub_id

    // Devis form
    const [devisForm, setDevisForm] = useState({ designation: '', lot: '', unite: 'u', quantity: 1, unit_price: 0 });
    // Journal form
    const [journalForm, setJournalForm] = useState({ date: new Date().toISOString().split('T')[0], weather: 'soleil', workers_count: 1, work_done: '', materials_received: '', incidents: '', notes: '' });
    // Subcontractor form
    const [subForm, setSubForm] = useState({ name: '', corps_metier: 'autre', contact: '', contract_amount: 0, notes: '' });
    // Phase form
    const [phaseForm, setPhaseForm] = useState({ name: '', corps_metier: 'autre', start_date: '', end_date: '', status: 'pending' });
    // Pay sub form
    const [paySubAmount, setPaySubAmount] = useState(0);
    // Retention percent for new project
    const [newRetentionPercent, setNewRetentionPercent] = useState('');

    // New project form
    const [newName, setNewName] = useState('');
    const [newClient, setNewClient] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [newBudget, setNewBudget] = useState('');
    const [newDesc, setNewDesc] = useState('');

    // Allocate form
    const [allocProductId, setAllocProductId] = useState('');
    const [allocQty, setAllocQty] = useState('');
    const [allocCorps, setAllocCorps] = useState('autre');

    // Labor form
    const [laborName, setLaborName] = useState('');
    const [laborRole, setLaborRole] = useState('');
    const [laborDays, setLaborDays] = useState('');
    const [laborRate, setLaborRate] = useState('');
    const [laborCorps, setLaborCorps] = useState('autre');

    // Situation form
    const [sitLabel, setSitLabel] = useState('');
    const [sitPercent, setSitPercent] = useState('');
    const [sitAmount, setSitAmount] = useState('');
    const [sitNotes, setSitNotes] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [p, d] = await Promise.all([projects.list(), projects.dashboard()]);
            setProjectList(p);
            setDashboard(d);
            const resp = await productsApi.list(undefined, 0, 200);
            setProductsList(resp.items || resp);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleCreateProject = async () => {
        if (!newName.trim() || submitting) return;
        setSubmitting(true); setError(null);
        try {
            await projects.create({
                name: newName, client_name: newClient, client_phone: newPhone,
                address: newAddress, budget_estimate: parseFloat(newBudget) || 0, description: newDesc,
                retention_percent: parseFloat(newRetentionPercent) || 0,
            });
            setShowNewProject(false);
            setNewName(''); setNewClient(''); setNewPhone(''); setNewAddress(''); setNewBudget(''); setNewDesc(''); setNewRetentionPercent('');
            loadData();
        } catch (e: any) { setError(e?.message || t('common.error')); }
        finally { setSubmitting(false); }
    };

    const handleStartProject = async (p: Project) => {
        try { await projects.update(p.project_id, { status: 'en_cours' }); loadData(); }
        catch (e: any) { alert(e?.message || t('common.error')); }
    };

    const handleCompleteProject = async (p: Project) => {
        if (!confirm('Clôturer ce chantier ? Cette action est irréversible.')) return;
        try { await projects.complete(p.project_id); loadData(); }
        catch (e: any) { alert(e?.message || t('common.error')); }
    };

    const handleAllocate = async () => {
        if (!selectedProject || !allocProductId || !allocQty || submitting) return;
        setSubmitting(true); setError(null);
        try {
            await projects.allocateMaterial(selectedProject.project_id, {
                product_id: allocProductId, quantity: parseFloat(allocQty), corps_metier: allocCorps,
            });
            setShowAllocate(false);
            setAllocProductId(''); setAllocQty(''); setAllocCorps('autre');
            loadData();
        } catch (e: any) { setError(e?.message || t('common.error')); }
        finally { setSubmitting(false); }
    };

    const handleAddLabor = async () => {
        if (!selectedProject || !laborName || submitting) return;
        setSubmitting(true); setError(null);
        try {
            await projects.addLabor(selectedProject.project_id, {
                name: laborName, role: laborRole, days: parseFloat(laborDays) || 1,
                daily_rate: parseFloat(laborRate) || 0, corps_metier: laborCorps,
            });
            setShowLabor(false);
            setLaborName(''); setLaborRole(''); setLaborDays(''); setLaborRate(''); setLaborCorps('autre');
            loadData();
        } catch (e: any) { setError(e?.message || t('common.error')); }
        finally { setSubmitting(false); }
    };

    const handleAddSituation = async () => {
        if (!selectedProject || !sitLabel || submitting) return;
        setSubmitting(true); setError(null);
        try {
            await projects.addSituation(selectedProject.project_id, {
                label: sitLabel, percent: parseFloat(sitPercent) || 0,
                amount: parseFloat(sitAmount) || 0, notes: sitNotes,
            });
            setShowSituation(false);
            setSitLabel(''); setSitPercent(''); setSitAmount(''); setSitNotes('');
            loadData();
        } catch (e: any) { setError(e?.message || t('common.error')); }
        finally { setSubmitting(false); }
    };

    const tabs: { key: SubTab; label: string; Icon: any }[] = [
        { key: 'dashboard', label: t('common.dashboard', 'Tableau de bord'), Icon: LayoutDashboard },
        { key: 'projects', label: t('tabs.projects', 'Chantiers'), Icon: HardHat },
        { key: 'materials', label: t('projects.materials', 'Matériaux'), Icon: Truck },
        { key: 'situations', label: t('projects.situations', 'Factures'), Icon: FileText },
        { key: 'devis', label: t('projects.tab_quotes'), Icon: FileText },
        { key: 'journal', label: t('projects.tab_journal'), Icon: BookOpen },
        { key: 'sousTraitants', label: t('projects.tab_subcontractors'), Icon: UserCheck },
        { key: 'planning', label: t('projects.tab_planning'), Icon: Calendar },
    ];

    if (loading) {
        return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;
    }

    // Aggregate all materials / situations
    const allMaterials = projectList.flatMap(p => p.materials_allocated.map(m => ({ ...m, projectName: p.name })))
        .sort((a, b) => new Date(b.allocated_at).getTime() - new Date(a.allocated_at).getTime());
    const allSituations = projectList.flatMap(p => p.situations.map(s => ({ sit: s, projectName: p.name })))
        .sort((a, b) => new Date(b.sit.date).getTime() - new Date(a.sit.date).getTime());

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0F172A] p-6 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black text-white flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/20 text-primary"><Hammer size={24} /></div>
                    🏗️ {t('tabs.projects', 'Chantiers')}
                </h1>
                <button onClick={() => setShowNewProject(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/80 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 text-sm">
                    <Plus size={18} /> {t('projects.new_project', 'Nouveau chantier')}
                </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit mb-6 border border-white/5">
                {tabs.map(({ key, label, Icon }) => (
                    <button key={key} onClick={() => setActiveTab(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === key ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
                        <Icon size={15} /> {label}
                    </button>
                ))}
            </div>

            {/* ─── Dashboard Tab ─── */}
            {activeTab === 'dashboard' && dashboard && (
                <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: t('projects.active_projects', 'Actifs'), value: dashboard.active_projects, Icon: HardHat, cls: 'text-blue-400 bg-blue-500/10' },
                            { label: t('projects.total_budget', 'Budget total'), value: `${fmt(dashboard.total_budget)}`, Icon: DollarSign, cls: 'text-amber-400 bg-amber-500/10' },
                            { label: t('projects.actual', 'Coût réel'), value: `${fmt(dashboard.total_actual)}`, Icon: TrendingUp, cls: 'text-emerald-400 bg-emerald-500/10' },
                            { label: t('projects.margin_percent', 'Marge'), value: `${dashboard.margin_percent}%`, Icon: TrendingUp, cls: 'text-purple-400 bg-purple-500/10' },
                        ].map(({ label, value, Icon, cls }) => (
                            <div key={label} className="glass-card p-4 flex items-center gap-3 border border-white/5">
                                <div className={`p-3 rounded-xl ${cls.split(' ')[1]}`}><Icon size={20} className={cls.split(' ')[0]} /></div>
                                <div><p className="text-xs text-slate-400">{label}</p><p className="text-xl font-black text-white">{value}</p></div>
                            </div>
                        ))}
                    </div>
                    <div className="glass-card p-5 border border-white/5">
                        <h2 className="font-bold text-white mb-4">Chantiers récents</h2>
                        <div className="space-y-3">
                            {projectList.slice(0, 5).map(p => (
                                <div key={p.project_id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                    <div>
                                        <p className="font-semibold text-white text-sm">{p.name}</p>
                                        <p className="text-xs text-slate-400">{p.client_name}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${statusColor(p.status)}`}>
                                        {t(`projects.status_${p.status}`, p.status)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Projects Tab ─── */}
            {activeTab === 'projects' && (
                projectList.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500">
                        <HardHat size={56} className="mb-4 opacity-30" />
                        <p className="text-lg font-bold">{t('projects.no_projects', 'Aucun chantier')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {projectList.map(project => {
                            const budgetUsed = project.budget_estimate > 0
                                ? Math.round((project.actual_cost / project.budget_estimate) * 100) : 0;
                            const totalInvoiced = project.situations.reduce((s, sit) => s + sit.amount, 0);
                            return (
                                <div key={project.project_id} className="glass-card p-5 border border-white/5 flex flex-col gap-3">
                                    {/* Header */}
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-white">{project.name}</p>
                                            {project.client_name && <p className="text-xs text-slate-400 mt-0.5">👤 {project.client_name}</p>}
                                            {project.address && <p className="text-xs text-slate-400">📍 {project.address}</p>}
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${statusColor(project.status)}`}>
                                            {t(`projects.status_${project.status}`, project.status)}
                                        </span>
                                    </div>

                                    {/* Budget progress */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-400">Budget : {fmt(project.actual_cost)} / {fmt(project.budget_estimate)}</span>
                                            <span className={budgetUsed > 100 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{budgetUsed}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all"
                                                style={{ width: `${Math.min(budgetUsed, 100)}%`, backgroundColor: budgetUsed > 100 ? '#F44336' : budgetUsed > 80 ? '#FF9800' : '#4CAF50' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex gap-4 text-xs text-slate-400">
                                        <span>📦 {project.materials_allocated.length} matériaux</span>
                                        <span>👷 {project.labor_entries.length} ouvriers</span>
                                        <span>💰 {fmt(totalInvoiced)} facturé</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-2">
                                        {project.status === 'devis' && (
                                            <button onClick={() => handleStartProject(project)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all">
                                                <Play size={13} /> Démarrer
                                            </button>
                                        )}
                                        {project.status === 'en_cours' && (
                                            <>
                                                <button onClick={() => { setSelectedProject(project); setAllocProductId(''); setAllocQty(''); setShowAllocate(true); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all">
                                                    <Package size={13} /> Matériau
                                                </button>
                                                <button onClick={() => { setSelectedProject(project); setLaborName(''); setShowLabor(true); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-all">
                                                    <Users size={13} /> Ouvrier
                                                </button>
                                                <button onClick={() => { setSelectedProject(project); setSitLabel(''); setShowSituation(true); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold rounded-lg transition-all">
                                                    <FileText size={13} /> Facture
                                                </button>
                                                <button onClick={() => handleCompleteProject(project)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all">
                                                    <CheckCircle2 size={13} /> Clôturer
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    {/* Quick-nav to BTP tabs */}
                                    <div className="flex gap-2 pt-2 border-t border-white/5 mt-2">
                                        {(['devis', 'journal', 'sousTraitants', 'planning'] as SubTab[]).map(tab => (
                                            <button key={tab} onClick={e => { e.stopPropagation(); setSelectedProject(project); setActiveTab(tab); }}
                                                className="flex-1 text-xs py-1.5 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all capitalize">
                                                {tab === 'sousTraitants' ? 'Sous-traitants' : tab === 'devis' ? 'Devis' : tab === 'journal' ? 'Journal' : 'Planning'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* ─── Materials Tab ─── */}
            {activeTab === 'materials' && (
                allMaterials.length === 0 ? (
                    <div className="text-center py-20 text-slate-500"><Truck size={56} className="mx-auto mb-4 opacity-30" /><p>{t('projects.no_materials', 'Aucun matériau affecté')}</p></div>
                ) : (
                    <div className="space-y-2">
                        {allMaterials.map((m, i) => (
                            <div key={i} className="glass-card px-4 py-3 border border-white/5 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-white text-sm">{m.name}</p>
                                    <p className="text-xs text-slate-400">{m.projectName} · {t(CORPS_OPTIONS.find(c => c.key === m.corps_metier)?.labelKey || m.corps_metier)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-white text-sm">{m.quantity} {m.unit}</p>
                                    <p className="text-xs text-slate-400">{fmt(m.total_cost)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ─── Situations Tab ─── */}
            {activeTab === 'situations' && (
                allSituations.length === 0 ? (
                    <div className="text-center py-20 text-slate-500"><FileText size={56} className="mx-auto mb-4 opacity-30" /><p>{t('projects.no_situations', 'Aucune situation de travaux')}</p></div>
                ) : (
                    <div className="space-y-2">
                        {allSituations.map((item, i) => (
                            <div key={i} className="glass-card px-4 py-3 border border-white/5 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-white text-sm">{item.sit.label}</p>
                                    <p className="text-xs text-slate-400">{item.projectName} · {item.sit.percent}%</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="font-bold text-white text-sm">{fmt(item.sit.amount)}</p>
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${item.sit.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                        {item.sit.paid ? t('projects.paid', 'Payé') : t('projects.pending', 'En attente')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ─── Devis Tab ─── */}
            {activeTab === 'devis' && selectedProject && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-white font-bold text-lg">{selectedProject.name}</h3>
                            {selectedProject.retention_percent > 0 && (
                                <span className="text-xs text-amber-400">Retenue de garantie : {selectedProject.retention_percent}%</span>
                            )}
                        </div>
                        <button onClick={() => setShowDevisModal(true)} className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                            <Plus size={14} /> Ajouter ligne
                        </button>
                    </div>
                    <div className="glass-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="border-b border-white/10">
                                <tr className="text-xs text-slate-400 uppercase">
                                    <th className="p-3 text-left">Lot</th>
                                    <th className="p-3 text-left">Désignation</th>
                                    <th className="p-3 text-right">Qté</th>
                                    <th className="p-3 text-left">Unité</th>
                                    <th className="p-3 text-right">P.U.</th>
                                    <th className="p-3 text-right">Total</th>
                                    <th className="p-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(selectedProject.devis_items || []).map((item: any, i: number) => (
                                    <tr key={item.item_id} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/2' : ''}`}>
                                        <td className="p-3 text-slate-400">{item.lot || '—'}</td>
                                        <td className="p-3 text-white">{item.designation}</td>
                                        <td className="p-3 text-right text-white">{item.quantity}</td>
                                        <td className="p-3 text-slate-400">{item.unite}</td>
                                        <td className="p-3 text-right text-white">{item.unit_price.toLocaleString()}</td>
                                        <td className="p-3 text-right font-bold text-primary">{item.total.toLocaleString()}</td>
                                        <td className="p-3">
                                            <button onClick={async () => {
                                                const updated = await projects.deleteDevisItem(selectedProject.project_id, item.item_id);
                                                setSelectedProject(updated);
                                                setProjectList(prev => prev.map(p => p.project_id === updated.project_id ? updated : p));
                                            }} className="text-slate-500 hover:text-rose-400 transition-colors"><Trash2 size={14} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t border-white/20">
                                <tr>
                                    <td colSpan={5} className="p-3 text-right text-slate-400 font-bold">Total HT</td>
                                    <td className="p-3 text-right text-white font-bold text-base">
                                        {((selectedProject.devis_items || []).reduce((s: number, i: any) => s + i.total, 0)).toLocaleString()}
                                    </td>
                                    <td></td>
                                </tr>
                                {selectedProject.retention_percent > 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-3 text-right text-amber-400 text-xs">Retenue de garantie ({selectedProject.retention_percent}%)</td>
                                        <td className="p-3 text-right text-amber-400 text-xs">
                                            -{Math.round((selectedProject.devis_items || []).reduce((s: number, i: any) => s + i.total, 0) * selectedProject.retention_percent / 100).toLocaleString()}
                                        </td>
                                        <td></td>
                                    </tr>
                                )}
                            </tfoot>
                        </table>
                    </div>
                    {(selectedProject.devis_items || []).length === 0 && (
                        <div className="text-center py-12 text-slate-500">Aucune ligne de devis. Cliquez sur "Ajouter ligne".</div>
                    )}
                </div>
            )}
            {activeTab === 'devis' && !selectedProject && (
                <div className="text-center py-16 text-slate-500">Sélectionnez un chantier dans l'onglet "Chantiers" pour voir son devis.</div>
            )}

            {/* ─── Journal Tab ─── */}
            {activeTab === 'journal' && selectedProject && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-white font-bold text-lg">Journal — {selectedProject.name}</h3>
                        <button onClick={() => setShowJournalModal(true)} className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                            <Plus size={14} /> Nouvelle entrée
                        </button>
                    </div>
                    <div className="space-y-3">
                        {(selectedProject.journal || []).length === 0 && <div className="text-center py-12 text-slate-500">Aucune entrée de journal.</div>}
                        {[...(selectedProject.journal || [])].reverse().map((entry: any) => (
                            <div key={entry.entry_id} className="glass-card p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white">{entry.date}</span>
                                        <span className="text-lg">{entry.weather === 'soleil' ? '☀️' : entry.weather === 'pluie' ? '🌧️' : entry.weather === 'nuageux' ? '⛅' : '💨'}</span>
                                        <span className="text-xs text-slate-400">{entry.workers_count} ouvriers</span>
                                    </div>
                                </div>
                                {entry.work_done && <p className="text-sm text-slate-300 mb-1"><span className="text-slate-500">Travaux :</span> {entry.work_done}</p>}
                                {entry.materials_received && <p className="text-sm text-slate-300 mb-1"><span className="text-slate-500">Matériaux reçus :</span> {entry.materials_received}</p>}
                                {entry.incidents && <p className="text-sm text-rose-400 mb-1"><span className="text-slate-500">Incidents :</span> {entry.incidents}</p>}
                                {entry.notes && <p className="text-xs text-slate-500 italic">{entry.notes}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {activeTab === 'journal' && !selectedProject && (
                <div className="text-center py-16 text-slate-500">Sélectionnez un chantier dans l'onglet "Chantiers".</div>
            )}

            {/* ─── Sous-traitants Tab ─── */}
            {activeTab === 'sousTraitants' && selectedProject && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-white font-bold text-lg">Sous-traitants — {selectedProject.name}</h3>
                        <button onClick={() => setShowSubModal(true)} className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                            <Plus size={14} /> Ajouter sous-traitant
                        </button>
                    </div>
                    <div className="space-y-3">
                        {(selectedProject.subcontractors || []).length === 0 && <div className="text-center py-12 text-slate-500">Aucun sous-traitant.</div>}
                        {(selectedProject.subcontractors || []).map((sub: any) => {
                            const progress = sub.contract_amount > 0 ? (sub.paid_amount / sub.contract_amount) * 100 : 0;
                            return (
                                <div key={sub.sub_id} className="glass-card p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="text-white font-bold">{sub.name}</div>
                                            <div className="text-xs text-slate-400">{t(CORPS_OPTIONS.find(c => c.key === sub.corps_metier)?.labelKey || sub.corps_metier)}{sub.contact ? ` · ${sub.contact}` : ''}</div>
                                        </div>
                                        <button onClick={() => setShowPaySubModal(sub.sub_id)} className="btn-primary px-3 py-1.5 rounded-lg text-xs">Payer</button>
                                    </div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-400">Marché : <span className="text-white font-bold">{sub.contract_amount.toLocaleString()}</span></span>
                                        <span className="text-slate-400">Payé : <span className="text-emerald-400 font-bold">{sub.paid_amount.toLocaleString()}</span></span>
                                        <span className="text-slate-400">Reste : <span className="text-amber-400 font-bold">{(sub.contract_amount - sub.paid_amount).toLocaleString()}</span></span>
                                    </div>
                                    <div className="h-1.5 bg-white/10 rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} /></div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {activeTab === 'sousTraitants' && !selectedProject && (
                <div className="text-center py-16 text-slate-500">Sélectionnez un chantier dans l'onglet "Chantiers".</div>
            )}

            {/* ─── Planning Tab ─── */}
            {activeTab === 'planning' && selectedProject && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-white font-bold text-lg">Planning — {selectedProject.name}</h3>
                        <button onClick={() => setShowPhaseModal(true)} className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                            <Plus size={14} /> Ajouter phase
                        </button>
                    </div>
                    <div className="space-y-2">
                        {(selectedProject.phases || []).length === 0 && <div className="text-center py-12 text-slate-500">Aucune phase définie.</div>}
                        {(selectedProject.phases || []).map((phase: any) => (
                            <div key={phase.phase_id} className="glass-card p-4 flex items-center gap-4">
                                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${phase.status === 'done' ? 'bg-emerald-400' : phase.status === 'in_progress' ? 'bg-blue-400' : 'bg-slate-500'}`} />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-bold text-sm">{phase.name}</span>
                                        <span className="text-xs text-slate-500">{t(CORPS_OPTIONS.find(c => c.key === phase.corps_metier)?.labelKey || '')}</span>
                                    </div>
                                    {(phase.start_date || phase.end_date) && (
                                        <div className="text-xs text-slate-400 mt-0.5">{phase.start_date || '?'} → {phase.end_date || '?'}</div>
                                    )}
                                </div>
                                <select
                                    value={phase.status}
                                    onChange={async (e) => {
                                        const updated = await projects.updatePhase(selectedProject.project_id, phase.phase_id, { status: e.target.value });
                                        setSelectedProject(updated);
                                        setProjectList(prev => prev.map(p => p.project_id === updated.project_id ? updated : p));
                                    }}
                                    className="bg-[#0F172A] border border-white/10 rounded-lg p-1.5 text-white text-xs outline-none"
                                >
                                    <option value="pending">En attente</option>
                                    <option value="in_progress">En cours</option>
                                    <option value="done">Terminé</option>
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {activeTab === 'planning' && !selectedProject && (
                <div className="text-center py-16 text-slate-500">Sélectionnez un chantier dans l'onglet "Chantiers".</div>
            )}

            {/* ═══ New Project Modal ═══ */}
            {showNewProject && (
                <Modal title={t('projects.new_project', 'Nouveau chantier')} onClose={() => setShowNewProject(false)}>
                    {error && <p className="mb-3 text-sm text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
                    <Field label={t('projects.project_name', 'Nom du chantier')}>
                        <input className={input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Villa Résidence..." />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label={t('projects.client_name', 'Client')}>
                            <input className={input} value={newClient} onChange={e => setNewClient(e.target.value)} />
                        </Field>
                        <Field label={t('projects.client_phone', 'Téléphone')}>
                            <input className={input} value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                        </Field>
                    </div>
                    <Field label={t('projects.address', 'Adresse / Lieu')}>
                        <input className={input} value={newAddress} onChange={e => setNewAddress(e.target.value)} />
                    </Field>
                    <Field label={t('projects.budget_estimate', 'Budget estimé')}>
                        <input className={input} type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)} />
                    </Field>
                    <Field label={t('projects.description', 'Description / Notes')}>
                        <textarea className={`${input} h-16 resize-none`} value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                    </Field>
                    <Field label="Retenue de garantie (%)">
                        <input className={input} type="number" min={0} max={20} step={0.5} value={newRetentionPercent} onChange={e => setNewRetentionPercent(e.target.value)} placeholder="Ex: 5" />
                    </Field>
                    <div className="flex gap-3 mt-2">
                        <button onClick={() => setShowNewProject(false)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-all">
                            {t('common.cancel', 'Annuler')}
                        </button>
                        <button onClick={handleCreateProject} disabled={submitting || !newName.trim()}
                            className="flex-1 py-2.5 bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-bold rounded-xl transition-all">
                            {submitting ? '...' : t('projects.create', 'Créer')}
                        </button>
                    </div>
                </Modal>
            )}

            {/* ═══ Allocate Material Modal ═══ */}
            {showAllocate && selectedProject && (
                <Modal title={t('projects.allocate_title', 'Affecter un matériau')} onClose={() => setShowAllocate(false)}>
                    <p className="text-xs text-slate-400 mb-4">{selectedProject.name}</p>
                    {error && <p className="mb-3 text-sm text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
                    <Field label={t('projects.select_product', 'Produit')}>
                        <div className="max-h-36 overflow-y-auto space-y-1 mb-1">
                            {productsList.map((p: any) => (
                                <button key={p.product_id} onClick={() => setAllocProductId(p.product_id)}
                                    className={`w-full flex justify-between px-3 py-2 rounded-xl text-sm transition-all ${allocProductId === p.product_id ? 'bg-primary/20 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                                    <span>{p.name}</span><span className="text-slate-500">Stock: {p.quantity} {p.unit}</span>
                                </button>
                            ))}
                        </div>
                    </Field>
                    <Field label={t('projects.quantity', 'Quantité')}>
                        <input className={input} type="number" value={allocQty} onChange={e => setAllocQty(e.target.value)} />
                    </Field>
                    <Field label={t('projects.corps_metier', 'Corps de métier')}>
                        <div className="flex flex-wrap gap-2">
                            {CORPS_OPTIONS.map(c => (
                                <button key={c.key} onClick={() => setAllocCorps(c.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${allocCorps === c.key ? 'bg-primary/20 border-primary text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                                    {c.icon} {t(c.labelKey)}
                                </button>
                            ))}
                        </div>
                    </Field>
                    <div className="flex gap-3 mt-3">
                        <button onClick={() => setShowAllocate(false)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl">{t('common.cancel', 'Annuler')}</button>
                        <button onClick={handleAllocate} disabled={submitting || !allocProductId || !allocQty}
                            className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all">
                            {submitting ? '...' : t('projects.allocate', 'Affecter')}
                        </button>
                    </div>
                </Modal>
            )}

            {/* ═══ Labor Modal ═══ */}
            {showLabor && selectedProject && (
                <Modal title={t('projects.add_labor', "Ajouter main d'œuvre")} onClose={() => setShowLabor(false)}>
                    <p className="text-xs text-slate-400 mb-4">{selectedProject.name}</p>
                    {error && <p className="mb-3 text-sm text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
                    <Field label={t('projects.worker_name', 'Nom')}>
                        <input className={input} value={laborName} onChange={e => setLaborName(e.target.value)} />
                    </Field>
                    <Field label={t('projects.worker_role', 'Rôle (ex: Maçon)')}>
                        <input className={input} value={laborRole} onChange={e => setLaborRole(e.target.value)} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label={t('projects.days', 'Jours')}>
                            <input className={input} type="number" value={laborDays} onChange={e => setLaborDays(e.target.value)} />
                        </Field>
                        <Field label={t('projects.daily_rate', 'Tarif / jour')}>
                            <input className={input} type="number" value={laborRate} onChange={e => setLaborRate(e.target.value)} />
                        </Field>
                    </div>
                    <Field label={t('projects.corps_metier', 'Corps de métier')}>
                        <div className="flex flex-wrap gap-2">
                            {CORPS_OPTIONS.map(c => (
                                <button key={c.key} onClick={() => setLaborCorps(c.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${laborCorps === c.key ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                                    {c.icon} {t(c.labelKey)}
                                </button>
                            ))}
                        </div>
                    </Field>
                    <div className="flex gap-3 mt-3">
                        <button onClick={() => setShowLabor(false)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl">{t('common.cancel', 'Annuler')}</button>
                        <button onClick={handleAddLabor} disabled={submitting || !laborName}
                            className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all">
                            {submitting ? '...' : t('projects.add', 'Ajouter')}
                        </button>
                    </div>
                </Modal>
            )}

            {/* ═══ Situation Modal ═══ */}
            {showSituation && selectedProject && (
                <Modal title={t('projects.add_situation', 'Nouvelle situation de travaux')} onClose={() => setShowSituation(false)}>
                    <p className="text-xs text-slate-400 mb-4">{selectedProject.name}</p>
                    {error && <p className="mb-3 text-sm text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
                    <Field label={t('projects.sit_label', 'Libellé')}>
                        <input className={input} value={sitLabel} onChange={e => setSitLabel(e.target.value)} placeholder="Gros œuvre terminé..." />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label={t('projects.sit_percent', '% avancement')}>
                            <input className={input} type="number" value={sitPercent} onChange={e => setSitPercent(e.target.value)} />
                        </Field>
                        <Field label={t('projects.sit_amount', 'Montant')}>
                            <input className={input} type="number" value={sitAmount} onChange={e => setSitAmount(e.target.value)} />
                        </Field>
                    </div>
                    <Field label={t('projects.sit_notes', 'Notes')}>
                        <textarea className={`${input} h-16 resize-none`} value={sitNotes} onChange={e => setSitNotes(e.target.value)} />
                    </Field>
                    <div className="flex gap-3 mt-3">
                        <button onClick={() => setShowSituation(false)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl">{t('common.cancel', 'Annuler')}</button>
                        <button onClick={handleAddSituation} disabled={submitting || !sitLabel}
                            className="flex-1 py-2.5 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all">
                            {submitting ? '...' : t('projects.add', 'Ajouter')}
                        </button>
                    </div>
                </Modal>
            )}

            {/* ═══ Devis Modal ═══ */}
            {showDevisModal && selectedProject && (
                <Modal title="Ajouter une ligne de devis" onClose={() => setShowDevisModal(false)}>
                    <Field label="Désignation *"><input value={devisForm.designation} onChange={e => setDevisForm(f => ({...f, designation: e.target.value}))} className={input} placeholder="Fouilles, béton armé..." /></Field>
                    <Field label="Lot"><input value={devisForm.lot} onChange={e => setDevisForm(f => ({...f, lot: e.target.value}))} className={input} placeholder="Gros œuvre, Plomberie..." /></Field>
                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Quantité"><input type="number" min={0} value={devisForm.quantity} onChange={e => setDevisForm(f => ({...f, quantity: Number(e.target.value)}))} className={input} /></Field>
                        <Field label="Unité"><input value={devisForm.unite} onChange={e => setDevisForm(f => ({...f, unite: e.target.value}))} className={input} placeholder="m², ml, u..." /></Field>
                        <Field label="Prix unitaire"><input type="number" min={0} value={devisForm.unit_price} onChange={e => setDevisForm(f => ({...f, unit_price: Number(e.target.value)}))} className={input} /></Field>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl text-sm text-white mt-2">Total : <span className="font-bold text-primary">{(devisForm.quantity * devisForm.unit_price).toLocaleString()}</span></div>
                    <button onClick={async () => {
                        if (!devisForm.designation) return;
                        const updated = await projects.addDevisItem(selectedProject.project_id, devisForm);
                        setSelectedProject(updated);
                        setProjectList(prev => prev.map(p => p.project_id === updated.project_id ? updated : p));
                        setDevisForm({ designation: '', lot: '', unite: 'u', quantity: 1, unit_price: 0 });
                        setShowDevisModal(false);
                    }} className="btn-primary w-full py-3 rounded-xl mt-4 font-bold">Ajouter</button>
                </Modal>
            )}

            {/* ═══ Journal Modal ═══ */}
            {showJournalModal && selectedProject && (
                <Modal title="Entrée journal de chantier" onClose={() => setShowJournalModal(false)}>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Date"><input type="date" value={journalForm.date} onChange={e => setJournalForm(f => ({...f, date: e.target.value}))} className={input} /></Field>
                        <Field label="Météo">
                            <select value={journalForm.weather} onChange={e => setJournalForm(f => ({...f, weather: e.target.value}))} className={input}>
                                <option value="soleil">☀️ Soleil</option>
                                <option value="nuageux">⛅ Nuageux</option>
                                <option value="pluie">🌧️ Pluie</option>
                                <option value="vent">💨 Vent</option>
                            </select>
                        </Field>
                    </div>
                    <Field label="Nb ouvriers"><input type="number" min={0} value={journalForm.workers_count} onChange={e => setJournalForm(f => ({...f, workers_count: Number(e.target.value)}))} className={input} /></Field>
                    <Field label="Travaux effectués"><textarea value={journalForm.work_done} onChange={e => setJournalForm(f => ({...f, work_done: e.target.value}))} className={input + ' h-20 resize-none'} placeholder="Coulage dalle, pose parpaings..." /></Field>
                    <Field label="Matériaux reçus"><input value={journalForm.materials_received} onChange={e => setJournalForm(f => ({...f, materials_received: e.target.value}))} className={input} placeholder="Sacs ciment, fers..." /></Field>
                    <Field label="Incidents"><input value={journalForm.incidents} onChange={e => setJournalForm(f => ({...f, incidents: e.target.value}))} className={input} placeholder="Accident, panne matériel..." /></Field>
                    <Field label="Notes"><input value={journalForm.notes} onChange={e => setJournalForm(f => ({...f, notes: e.target.value}))} className={input} /></Field>
                    <button onClick={async () => {
                        const updated = await projects.addJournalEntry(selectedProject.project_id, journalForm);
                        setSelectedProject(updated);
                        setProjectList(prev => prev.map(p => p.project_id === updated.project_id ? updated : p));
                        setJournalForm({ date: new Date().toISOString().split('T')[0], weather: 'soleil', workers_count: 1, work_done: '', materials_received: '', incidents: '', notes: '' });
                        setShowJournalModal(false);
                    }} className="btn-primary w-full py-3 rounded-xl mt-4 font-bold">Enregistrer</button>
                </Modal>
            )}

            {/* ═══ Sous-traitant Modal ═══ */}
            {showSubModal && selectedProject && (
                <Modal title="Ajouter un sous-traitant" onClose={() => setShowSubModal(false)}>
                    <Field label="Nom / Entreprise *"><input value={subForm.name} onChange={e => setSubForm(f => ({...f, name: e.target.value}))} className={input} placeholder="Entreprise DIALLO..." /></Field>
                    <Field label="Corps de métier">
                        <select value={subForm.corps_metier} onChange={e => setSubForm(f => ({...f, corps_metier: e.target.value}))} className={input}>
                            {CORPS_OPTIONS.map(c => <option key={c.key} value={c.key}>{c.icon} {t(c.labelKey)}</option>)}
                        </select>
                    </Field>
                    <Field label="Contact"><input value={subForm.contact} onChange={e => setSubForm(f => ({...f, contact: e.target.value}))} className={input} placeholder="+221 77..." /></Field>
                    <Field label="Montant du marché"><input type="number" min={0} value={subForm.contract_amount} onChange={e => setSubForm(f => ({...f, contract_amount: Number(e.target.value)}))} className={input} /></Field>
                    <Field label="Notes"><input value={subForm.notes} onChange={e => setSubForm(f => ({...f, notes: e.target.value}))} className={input} /></Field>
                    <button onClick={async () => {
                        if (!subForm.name) return;
                        const updated = await projects.addSubcontractor(selectedProject.project_id, subForm);
                        setSelectedProject(updated);
                        setProjectList(prev => prev.map(p => p.project_id === updated.project_id ? updated : p));
                        setSubForm({ name: '', corps_metier: 'autre', contact: '', contract_amount: 0, notes: '' });
                        setShowSubModal(false);
                    }} className="btn-primary w-full py-3 rounded-xl mt-4 font-bold">Ajouter</button>
                </Modal>
            )}

            {/* ═══ Pay Subcontractor Modal ═══ */}
            {showPaySubModal && selectedProject && (() => {
                const sub = (selectedProject.subcontractors || []).find((s: any) => s.sub_id === showPaySubModal);
                if (!sub) return null;
                return (
                    <Modal title={`Payer ${sub.name}`} onClose={() => setShowPaySubModal(null)}>
                        <div className="text-sm text-slate-400 mb-4">Reste à payer : <span className="text-white font-bold">{(sub.contract_amount - sub.paid_amount).toLocaleString()}</span></div>
                        <Field label="Montant"><input type="number" min={0} value={paySubAmount} onChange={e => setPaySubAmount(Number(e.target.value))} className={input} /></Field>
                        <button onClick={async () => {
                            const updated = await projects.paySubcontractor(selectedProject.project_id, showPaySubModal, { amount: paySubAmount });
                            setSelectedProject(updated);
                            setProjectList(prev => prev.map(p => p.project_id === updated.project_id ? updated : p));
                            setPaySubAmount(0);
                            setShowPaySubModal(null);
                        }} className="btn-primary w-full py-3 rounded-xl mt-4 font-bold">Confirmer paiement</button>
                    </Modal>
                );
            })()}

            {/* ═══ Phase Modal ═══ */}
            {showPhaseModal && selectedProject && (
                <Modal title="Ajouter une phase" onClose={() => setShowPhaseModal(false)}>
                    <Field label="Nom de la phase *"><input value={phaseForm.name} onChange={e => setPhaseForm(f => ({...f, name: e.target.value}))} className={input} placeholder="Fondations, Gros œuvre..." /></Field>
                    <Field label="Corps de métier">
                        <select value={phaseForm.corps_metier} onChange={e => setPhaseForm(f => ({...f, corps_metier: e.target.value}))} className={input}>
                            {CORPS_OPTIONS.map(c => <option key={c.key} value={c.key}>{c.icon} {t(c.labelKey)}</option>)}
                        </select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Début"><input type="date" value={phaseForm.start_date} onChange={e => setPhaseForm(f => ({...f, start_date: e.target.value}))} className={input} /></Field>
                        <Field label="Fin prévue"><input type="date" value={phaseForm.end_date} onChange={e => setPhaseForm(f => ({...f, end_date: e.target.value}))} className={input} /></Field>
                    </div>
                    <button onClick={async () => {
                        if (!phaseForm.name) return;
                        const updated = await projects.addPhase(selectedProject.project_id, phaseForm);
                        setSelectedProject(updated);
                        setProjectList(prev => prev.map(p => p.project_id === updated.project_id ? updated : p));
                        setPhaseForm({ name: '', corps_metier: 'autre', start_date: '', end_date: '', status: 'pending' });
                        setShowPhaseModal(false);
                    }} className="btn-primary w-full py-3 rounded-xl mt-4 font-bold">Ajouter</button>
                </Modal>
            )}
        </div>
    );
}
