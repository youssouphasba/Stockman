
'use client';

import React, { useState, useEffect } from 'react';
import {
    Hammer,
    Plus,
    LayoutDashboard,
    HardHat,
    Truck,
    FileText,
    TrendingUp,
    Clock,
    Search,
    ChevronRight,
    MapPin,
    Phone,
    Calendar,
    DollarSign,
    MoreVertical,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { projects, Project, ProjectDashboard } from '../services/api';

export default function ProjectView() {
    const { t } = useTranslation();
    const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'projects' | 'materials' | 'situations'>('dashboard');
    const [dashboardData, setDashboardData] = useState<ProjectDashboard | null>(null);
    const [projectList, setProjectList] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [dash, list] = await Promise.all([
                projects.dashboard(),
                projects.list()
            ]);
            setDashboardData(dash);
            setProjectList(list);
        } catch (err) {
            console.error('Failed to load project data:', err);
        } finally {
            setLoading(false);
        }
    };

    const stats = [
        { label: t('projects.active_projects'), value: dashboardData?.active_projects || 0, icon: HardHat, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: t('projects.completed_month'), value: dashboardData?.completed_month || 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: t('projects.total_budget'), value: `${dashboardData?.total_budget?.toLocaleString() || 0} CFA`, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { label: t('projects.margin_percent'), value: `${dashboardData?.margin_percent || 0}%`, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0F172A] p-6 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/20 text-primary">
                            <Hammer size={28} />
                        </div>
                        {t('tabs.projects')}
                    </h1>
                    <p className="text-slate-400 mt-1">{t('projects.subtitle', 'Gérez vos chantiers, matériaux et situations de travaux.')}</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20">
                    <Plus size={20} />
                    {t('projects.new_project')}
                </button>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl w-fit mb-8 border border-white/5">
                {[
                    { id: 'dashboard', label: t('common.dashboard'), icon: LayoutDashboard },
                    { id: 'projects', label: t('tabs.projects'), icon: HardHat },
                    { id: 'materials', label: t('projects.materials'), icon: Truck },
                    { id: 'situations', label: t('projects.situations'), icon: FileText }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSubTab === tab.id
                                ? 'bg-white/10 text-white shadow-lg border border-white/10'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    {activeSubTab === 'dashboard' && (
                        <div className="space-y-8">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {stats.map((stat) => (
                                    <div key={stat.label} className="glass-card p-6 flex items-center gap-5 group hover:border-primary/30 transition-all border border-white/10">
                                        <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                            <stat.icon size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                                            <p className="text-2xl font-black text-white">{stat.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Main Dashboard Content */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Recent Projects */}
                                <div className="lg:col-span-2 space-y-4">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Clock size={20} className="text-primary" />
                                        {t('projects.recent_projects')}
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {projectList.slice(0, 4).map((project) => (
                                            <div key={project.project_id} className="glass-card p-5 group hover:border-primary/20 transition-all border border-white/5">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${project.status === 'en_cours' ? 'bg-blue-500/20 text-blue-400' :
                                                            project.status === 'termine' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                'bg-slate-500/20 text-slate-400'
                                                        }`}>
                                                        {t(`projects.status.${project.status}`)}
                                                    </div>
                                                    <button className="text-slate-500 hover:text-white transition-colors">
                                                        <MoreVertical size={18} />
                                                    </button>
                                                </div>
                                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">{project.name}</h3>
                                                <p className="text-sm text-slate-400 mb-4 line-clamp-1">{project.client_name}</p>

                                                <div className="flex flex-col gap-2 mt-auto">
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <MapPin size={12} />
                                                        <span className="truncate">{project.address || t('common.no_address')}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                        <div className="text-xs text-slate-500">{t('common.budget')}</div>
                                                        <div className="text-sm font-black text-white">{project.budget_estimate.toLocaleString()} CFA</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Quick Insights / Alerts */}
                                <div className="space-y-4">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <AlertCircle size={20} className="text-amber-400" />
                                        {t('projects.alerts')}
                                    </h2>
                                    <div className="glass-card p-6 space-y-4 border border-white/5">
                                        <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                                                <AlertCircle size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-amber-400">Dépassement de budget</p>
                                                <p className="text-xs text-slate-400 mt-1">Chantier "Villa Riviera" à 110% du budget.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'projects' && (
                        <div className="space-y-6">
                            {/* Search & Filters */}
                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="text"
                                        placeholder={t('projects.search_placeholder', 'Rechercher un chantier...')}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 transition-all"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-all">
                                        {t('common.all')}
                                    </button>
                                    <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-all">
                                        {t('projects.status.en_cours')}
                                    </button>
                                </div>
                            </div>

                            {/* Projects Table/Grid */}
                            <div className="glass-card overflow-hidden border border-white/5">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 border-b border-white/10">
                                        <tr>
                                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">{t('projects.project_name')}</th>
                                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">{t('projects.client')}</th>
                                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">{t('projects.budget')}</th>
                                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">{t('projects.progress')}</th>
                                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">{t('projects.status')}</th>
                                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {projectList.map((project) => (
                                            <tr key={project.project_id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                                                            {project.name.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-white group-hover:text-primary transition-colors">{project.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-slate-300">{project.client_name}</span>
                                                        <span className="text-xs text-slate-500">{project.client_phone}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-sm font-black text-white">{project.budget_estimate.toLocaleString()} CFA</span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="w-full max-w-[120px]">
                                                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                                            <span>Avancement</span>
                                                            <span>45%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary rounded-full" style={{ width: '45%' }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${project.status === 'en_cours' ? 'bg-blue-500/20 text-blue-400' :
                                                            project.status === 'termine' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                'bg-slate-500/20 text-slate-400'
                                                        }`}>
                                                        {t(`projects.status.${project.status}`)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                                                        <ChevronRight size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
