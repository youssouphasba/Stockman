'use client';

import { useState } from 'react';
import { Apple, CheckCircle2, Smartphone, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { admin } from '../../services/api';

type UpdatePlatform = 'android' | 'ios';

export default function AppUpdateNotificationsPanel() {
    const { t } = useTranslation();
    const [platform, setPlatform] = useState<UpdatePlatform>('android');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ accepted: number; failed: number; unique_tokens: number } | null>(null);
    const [error, setError] = useState('');

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSending(true);
        setError('');
        setResult(null);
        try {
            const response = await admin.notifyAppUpdate({ platform, title: title.trim(), message: message.trim() });
            setResult(response);
        } catch (requestError: any) {
            setError(requestError?.message || t('admin_app_updates.send_error'));
        } finally {
            setSending(false);
        }
    }

    return (
        <section className="mx-auto w-full max-w-4xl space-y-6">
            <header>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{t('admin_app_updates.eyebrow')}</p>
                <h2 className="mt-2 text-2xl font-black text-white">{t('admin_app_updates.title')}</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                    {t('admin_app_updates.description')}
                </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-7">
                <fieldset className="space-y-2">
                    <legend className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('admin_app_updates.platform')}</legend>
                    <div className="grid grid-cols-2 gap-3">
                        {([
                            { id: 'android' as const, label: t('admin_app_updates.android'), Icon: Smartphone },
                            { id: 'ios' as const, label: t('admin_app_updates.ios'), Icon: Apple },
                        ]).map(({ id, label, Icon }) => (
                            <button
                                key={id}
                                type="button"
                                aria-pressed={platform === id}
                                onClick={() => setPlatform(id)}
                                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition-colors ${platform === id ? 'border-primary/50 bg-primary/15 text-primary' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                            >
                                <Icon size={17} />
                                {label}
                            </button>
                        ))}
                    </div>
                </fieldset>

                <label className="block space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('admin_app_updates.notification_title')}</span>
                    <input
                        required
                        maxLength={80}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-primary/60"
                    />
                </label>

                <label className="block space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('admin_app_updates.message')}</span>
                    <textarea
                        required
                        maxLength={240}
                        rows={3}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-primary/60"
                    />
                </label>

                <button
                    type="submit"
                    disabled={sending || !title.trim() || !message.trim()}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Send size={16} />
                    {sending ? t('admin_app_updates.sending') : t('admin_app_updates.send')}
                </button>

                {result ? (
                    <p role="status" className="flex items-start gap-2 text-sm text-emerald-300">
                        <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                        {t('admin_app_updates.accepted', { accepted: result.accepted, unique: result.unique_tokens })}
                        {result.failed > 0 ? ` ${t('admin_app_updates.failed', { count: result.failed })}` : ''}
                    </p>
                ) : null}
                {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
            </form>
        </section>
    );
}
