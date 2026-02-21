'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronRight, ChevronLeft, CheckCircle2, HelpCircle } from 'lucide-react';

export interface GuideStep {
    targetId?: string;
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface ScreenGuideProps {
    guideKey: string;
    steps: GuideStep[];
    autoStart?: boolean;
}

export default function ScreenGuide({ guideKey, steps, autoStart = true }: ScreenGuideProps) {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [hasCompleted, setHasCompleted] = useState(false);

    useEffect(() => {
        const completed = localStorage.getItem(`guide_completed_${guideKey}`);
        if (completed) {
            setHasCompleted(true);
        } else if (autoStart) {
            setTimeout(() => setIsVisible(true), 1500);
        }
    }, [guideKey, autoStart]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem(`guide_completed_${guideKey}`, 'true');
        setIsVisible(false);
        setHasCompleted(true);
    };

    const handleSkip = () => {
        localStorage.setItem(`guide_completed_${guideKey}`, 'true');
        setIsVisible(false);
        setHasCompleted(true);
    };

    if (!isVisible) {
        if (hasCompleted) {
            return (
                <button
                    onClick={() => setIsVisible(true)}
                    className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary/20 hover:bg-primary/40 border border-primary/20 text-primary flex items-center justify-center backdrop-blur-md shadow-lg transition-all z-40 group"
                >
                    <HelpCircle size={24} />
                    <span className="absolute right-14 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 whitespace-nowrap">
                        Besoin d'aide ?
                    </span>
                </button>
            );
        }
        return null;
    }

    const step = steps[currentStep];

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 pointer-events-none">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] pointer-events-auto" onClick={handleSkip} />

            {/* Guide Card */}
            <div className="relative w-full max-w-sm glass-card p-8 shadow-2xl animate-in zoom-in-95 duration-300 pointer-events-auto border-primary/30">
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-primary/20 flex items-center justify-center">
                        <span className="text-3xl font-black text-primary">
                            {currentStep + 1}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-xl font-black text-white uppercase tracking-tighter">
                            {step.title}
                        </h4>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {step.content}
                        </p>
                    </div>

                    {/* Progress dots */}
                    <div className="flex gap-2">
                        {steps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1 rounded-full transition-all ${idx === currentStep ? 'w-6 bg-primary' : 'w-2 bg-white/10'
                                    }`}
                            />
                        ))}
                    </div>

                    <div className="flex w-full gap-3 mt-4">
                        {currentStep > 0 && (
                            <button
                                onClick={handleBack}
                                className="flex-1 py-4 rounded-xl border border-white/10 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all"
                            >
                                <ChevronLeft className="inline -mt-0.5 mr-1" size={14} /> Retour
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="flex-[2] py-4 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                        >
                            {currentStep === steps.length - 1 ? (
                                <>Terminer <CheckCircle2 size={14} /></>
                            ) : (
                                <>Continuer <ChevronRight size={14} /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
