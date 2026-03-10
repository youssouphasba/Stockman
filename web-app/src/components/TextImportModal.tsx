'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Sparkles } from 'lucide-react';
import Modal from './Modal';
import { products as productsApi } from '../services/api';

type TextImportModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

export default function TextImportModal({ isOpen, onClose, onSuccess }: TextImportModalProps) {
    const { t } = useTranslation();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setText('');
        setLoading(false);
        setError(null);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleImport = async () => {
        if (!text.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const result = await productsApi.importText(text, true);
            const count = result.created ?? result.count ?? result.products?.length ?? 0;
            window.alert(t('products.import_text_success', { count }));
            reset();
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.message || t('products.import_text_error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={t('products.import_text_title')} maxWidth="xl">
            <div className="space-y-5">
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Import IA</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        {t('products.import_text_help')}
                    </p>
                </div>

                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('products.import_text_placeholder')}
                    rows={10}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white outline-none transition-all focus:border-primary/40"
                />

                {error ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-300">
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                ) : null}

                <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-400 transition-all hover:bg-white/5 hover:text-white"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleImport}
                        disabled={loading || !text.trim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Sparkles size={16} className={loading ? 'animate-pulse' : ''} />
                        {loading ? t('common.loading', 'Chargement...') : t('products.import_text_btn')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
