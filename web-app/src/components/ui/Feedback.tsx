'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import Modal from '../Modal';
import Button from './Button';

// Confirmations et messages de l'application web, à la place de window.confirm et window.alert :
// mêmes couleurs que Stockman, textes traduits, sans bloquer la page.

type ConfirmOptions = {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    // Bouton rouge pour une suppression ou une action irréversible.
    danger?: boolean;
};

type NoticeTone = 'info' | 'success' | 'error';

type FeedbackContextValue = {
    confirm: (options: ConfirmOptions | string) => Promise<boolean>;
    notify: (message: string, tone?: NoticeTone) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

type PendingConfirm = ConfirmOptions & { resolve: (value: boolean) => void };
type Notice = { id: number; message: string; tone: NoticeTone };

const DANGER_WORDS = /supprim|retir|annuler|d[ée]connect|abandon|cl[ôo]tur|d[ée]finitiv|irr[ée]versible|delete|remove|cancel/i;

const NOTICE_STYLES: Record<NoticeTone, { icon: typeof Info; className: string }> = {
    info: { icon: Info, className: 'border-sky-500/30 text-sky-300' },
    success: { icon: CheckCircle2, className: 'border-emerald-500/30 text-emerald-300' },
    error: { icon: XCircle, className: 'border-rose-500/30 text-rose-300' },
};

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation();
    const [pending, setPending] = useState<PendingConfirm | null>(null);
    const [notices, setNotices] = useState<Notice[]>([]);
    const nextId = useRef(1);

    const confirm = useCallback((options: ConfirmOptions | string) => {
        const normalized: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
        return new Promise<boolean>((resolve) => {
            setPending({ danger: DANGER_WORDS.test(normalized.message), ...normalized, resolve });
        });
    }, []);

    const notify = useCallback((message: string, tone: NoticeTone = 'info') => {
        const id = nextId.current++;
        setNotices((current) => [...current.slice(-3), { id, message, tone }]);
    }, []);

    const close = (value: boolean) => {
        pending?.resolve(value);
        setPending(null);
    };

    return (
        <FeedbackContext.Provider value={{ confirm, notify }}>
            {children}
            {pending ? (
                <Modal
                    isOpen
                    onClose={() => close(false)}
                    title={pending.title || t('modals.confirm')}
                    maxWidth="sm"
                    footer={(
                        <>
                            <Button variant="secondary" onClick={() => close(false)}>{pending.cancelLabel || t('modals.cancel')}</Button>
                            <Button variant={pending.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{pending.confirmLabel || t('modals.confirm')}</Button>
                        </>
                    )}
                >
                    <div className="flex items-start gap-3">
                        {pending.danger ? <AlertTriangle size={20} className="mt-0.5 shrink-0 text-rose-400" aria-hidden="true" /> : null}
                        <p className="whitespace-pre-line text-sm leading-6 text-slate-300">{pending.message}</p>
                    </div>
                </Modal>
            ) : null}
            <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
                {notices.map((notice) => (
                    <NoticeItem key={notice.id} notice={notice} onDismiss={() => setNotices((current) => current.filter((item) => item.id !== notice.id))} />
                ))}
            </div>
        </FeedbackContext.Provider>
    );
}

function NoticeItem({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
    const { t } = useTranslation();
    const { icon: Icon, className } = NOTICE_STYLES[notice.tone];
    const dismissRef = useRef(onDismiss);
    dismissRef.current = onDismiss;
    useEffect(() => {
        // Les erreurs restent plus longtemps pour laisser le temps de les lire.
        const timer = window.setTimeout(() => dismissRef.current(), notice.tone === 'error' ? 8000 : 5000);
        return () => window.clearTimeout(timer);
    }, [notice.tone]);
    return (
        <div className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-surface-raised p-4 shadow-2xl ${className}`}>
            <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="flex-1 whitespace-pre-line text-sm leading-5 text-white">{notice.message}</p>
            <button type="button" onClick={onDismiss} aria-label={t('modals.close')} className="shrink-0 rounded-full p-1 text-slate-400 hover:text-white">
                <X size={14} />
            </button>
        </div>
    );
}

export function useFeedback(): FeedbackContextValue {
    const context = useContext(FeedbackContext);
    if (context) return context;
    // Hors du fournisseur (pages isolées) : on retombe sur les fenêtres du navigateur.
    return {
        confirm: async (options) => window.confirm(typeof options === 'string' ? options : options.message),
        notify: (message) => window.alert(message),
    };
}
