'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, ChevronRight, ChevronLeft, BookOpen, MousePointerClick, SlidersHorizontal, LayoutGrid, Info, Lightbulb } from 'lucide-react';

export interface GuideDetail {
    label: string;
    description: string;
    type?: 'button' | 'filter' | 'card' | 'info' | 'tip';
}

export interface GuideStep {
    targetId?: string;
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    details?: GuideDetail[];
}

interface ScreenGuideProps {
    guideKey: string;
    steps: GuideStep[];
    autoStart?: boolean;
}

const DETAIL_ICONS = {
    button: MousePointerClick,
    filter: SlidersHorizontal,
    card: LayoutGrid,
    info: Info,
    tip: Lightbulb,
};

const DETAIL_COLORS = {
    button: 'text-blue-400 bg-blue-400/10',
    filter: 'text-amber-400 bg-amber-400/10',
    card: 'text-emerald-400 bg-emerald-400/10',
    info: 'text-slate-400 bg-slate-400/10',
    tip: 'text-purple-400 bg-purple-400/10',
};

export default function ScreenGuide({ guideKey, steps, autoStart = true }: ScreenGuideProps) {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    const resetGuide = useCallback(() => {
        setSearchQuery('');
        setCurrentStepIndex(0);
        setExpandedSections(new Set(steps.length ? [0] : []));
    }, [steps.length]);

    useEffect(() => {
        const shown = localStorage.getItem(`guide_completed_${guideKey}`);
        if (!shown && autoStart) {
            const timer = setTimeout(() => {
                resetGuide();
                setIsVisible(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [guideKey, autoStart, resetGuide]);

    useEffect(() => {
        const onOpenGuide = (event: Event) => {
            const customEvent = event as CustomEvent<{ guideKey?: string; reset?: boolean }>;
            const requestedKey = customEvent.detail?.guideKey;
            if (requestedKey && requestedKey !== guideKey) return;
            if (customEvent.detail?.reset !== false) {
                resetGuide();
            }
            setIsVisible(true);
        };
        window.addEventListener('stockman:open-guide', onOpenGuide as EventListener);
        return () => window.removeEventListener('stockman:open-guide', onOpenGuide as EventListener);
    }, [guideKey, resetGuide]);

    const toggleSection = (idx: number) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const handleClose = () => {
        localStorage.setItem(`guide_completed_${guideKey}`, 'true');
        setIsVisible(false);
    };

    const query = searchQuery.toLowerCase();
    const filteredSteps = useMemo(() => query
        ? steps.filter(s =>
            s.title.toLowerCase().includes(query) ||
            s.content.toLowerCase().includes(query) ||
            s.details?.some(d => d.label.toLowerCase().includes(query) || d.description.toLowerCase().includes(query))
        )
        : steps, [query, steps]);

    useEffect(() => {
        if (!filteredSteps.length) return;
        const currentVisible = filteredSteps.some((step) => steps.indexOf(step) === currentStepIndex);
        if (!currentVisible) {
            const firstVisibleIndex = steps.indexOf(filteredSteps[0]);
            setCurrentStepIndex(firstVisibleIndex);
            setExpandedSections(new Set([firstVisibleIndex]));
        }
    }, [currentStepIndex, filteredSteps, steps]);

    const navigationSteps = filteredSteps.length ? filteredSteps : steps;
    const currentNavigationIndex = Math.max(
        0,
        navigationSteps.findIndex((step) => steps.indexOf(step) === currentStepIndex),
    );
    const currentStep = navigationSteps[currentNavigationIndex] || null;
    const currentRealIndex = currentStep ? steps.indexOf(currentStep) : 0;
    const progress = steps.length ? ((currentRealIndex + 1) / steps.length) * 100 : 0;

    const focusStep = useCallback((idx: number) => {
        setCurrentStepIndex(idx);
        setExpandedSections(new Set([idx]));
        requestAnimationFrame(() => {
            document.getElementById(`guide-step-${guideKey}-${idx}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        });
    }, [guideKey]);

    const handlePrevious = () => {
        if (currentNavigationIndex <= 0) return;
        const previousRealIndex = steps.indexOf(navigationSteps[currentNavigationIndex - 1]);
        focusStep(previousRealIndex);
    };

    const handleNext = () => {
        if (currentNavigationIndex >= navigationSteps.length - 1) {
            handleClose();
            return;
        }
        const nextRealIndex = steps.indexOf(navigationSteps[currentNavigationIndex + 1]);
        focusStep(nextRealIndex);
    };

    if (!isVisible) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-[9999] bg-slate-950/30 backdrop-blur-[1px] transition-opacity"
                onClick={handleClose}
            />

            <div className="fixed top-0 right-0 bottom-0 z-[10000] w-full max-w-lg bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                <BookOpen size={20} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white tracking-tight">
                                    {t('guide.help_center', { defaultValue: "Centre d'aide" })}
                                </h2>
                                <p className="text-xs text-slate-400">
                                    {filteredSteps.length} {t('guide.sections', { defaultValue: 'sections' })}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    {/* Search */}
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={t('guide.search_placeholder', { defaultValue: 'Rechercher dans le guide...' })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-primary/50 transition-colors"
                    />
                    {steps.length > 0 && (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                                        {t('guide.step_progress', { defaultValue: 'Parcours guidé' })}
                                    </p>
                                    <h3 className="mt-1 text-sm font-bold text-white">
                                        {currentStep?.title || t('guide.help_center', { defaultValue: "Centre d'aide" })}
                                    </h3>
                                    <p className="mt-1 text-xs text-slate-400">
                                        {t('guide.step_counter', { defaultValue: 'Étape {{current}} sur {{total}}', current: currentRealIndex + 1, total: steps.length })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handlePrevious}
                                        disabled={currentNavigationIndex <= 0}
                                        className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <span className="flex items-center gap-1">
                                            <ChevronLeft size={14} />
                                            {t('guide.previous', { defaultValue: 'Précédent' })}
                                        </span>
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-primary/90"
                                    >
                                        <span className="flex items-center gap-1">
                                            {currentNavigationIndex >= navigationSteps.length - 1
                                                ? t('guide.finish', { defaultValue: 'Terminer' })
                                                : t('guide.next', { defaultValue: 'Suivant' })}
                                            <ChevronRight size={14} />
                                        </span>
                                    </button>
                                </div>
                            </div>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Sections */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-2">
                    {filteredSteps.map((step, idx) => {
                        const realIdx = steps.indexOf(step);
                        const isExpanded = expandedSections.has(realIdx);
                        const hasDetails = step.details && step.details.length > 0;

                        return (
                            <div
                                id={`guide-step-${guideKey}-${realIdx}`}
                                key={realIdx}
                                className={`rounded-2xl border overflow-hidden transition-all ${currentStepIndex === realIdx ? 'border-primary/40 bg-primary/[0.03]' : 'border-white/10'}`}
                            >
                                <button
                                    onClick={() => {
                                        setCurrentStepIndex(realIdx);
                                        if (currentStepIndex === realIdx) toggleSection(realIdx);
                                        else setExpandedSections(new Set([realIdx]));
                                    }}
                                    className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-white/5 transition-colors"
                                >
                                    <div className="mt-0.5 w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 text-xs font-black text-primary">
                                        {realIdx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-white">{step.title}</h4>
                                        {!isExpanded && (
                                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{step.content}</p>
                                        )}
                                    </div>
                                    <div className="mt-1 shrink-0 text-slate-500">
                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-0 border-t border-white/5">
                                        <p className="text-sm text-slate-300 leading-relaxed mt-3 mb-3">
                                            {step.content}
                                        </p>

                                        {hasDetails && (
                                            <div className="space-y-2 mt-3">
                                                {step.details!.map((detail, dIdx) => {
                                                    const dtype = detail.type || 'info';
                                                    const Icon = DETAIL_ICONS[dtype];
                                                    const colorClass = DETAIL_COLORS[dtype];
                                                    return (
                                                        <div key={dIdx} className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] p-3">
                                                            <div className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${colorClass}`}>
                                                                <Icon size={13} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-xs font-bold text-white">{detail.label}</span>
                                                                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{detail.description}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {filteredSteps.length === 0 && (
                        <div className="text-center py-12 text-slate-500 text-sm">
                            {t('guide.no_results', { defaultValue: 'Aucun résultat pour cette recherche' })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between">
                    <div className="flex gap-4 text-[10px] uppercase tracking-widest text-slate-500">
                        <span className="flex items-center gap-1"><MousePointerClick size={10} className="text-blue-400" /> {t('guide.legend_button', { defaultValue: 'Bouton' })}</span>
                        <span className="flex items-center gap-1"><SlidersHorizontal size={10} className="text-amber-400" /> {t('guide.legend_filter', { defaultValue: 'Filtre' })}</span>
                        <span className="flex items-center gap-1"><LayoutGrid size={10} className="text-emerald-400" /> {t('guide.legend_card', { defaultValue: 'Carte' })}</span>
                        <span className="flex items-center gap-1"><Lightbulb size={10} className="text-purple-400" /> {t('guide.legend_tip', { defaultValue: 'Astuce' })}</span>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                    >
                        {t('guide.close', { defaultValue: 'Fermer' })}
                    </button>
                </div>
            </div>
        </>
    );
}
