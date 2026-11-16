'use client';

import { useEffect, useState } from 'react';
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
    const [announcement, setAnnouncement] = useState<{ android: string; ios: string; message: string }>({ android: '', ios: '', message: '' });
    const [requiredByPlatform, setRequiredByPlatform] = useState<Record<UpdatePlatform, boolean>>({ android: false, ios: false });
    const [announceRequired, setAnnounceRequired] = useState(false);
    const [detection, setDetection] = useState<{ minDevices: number; detected: Record<UpdatePlatform, { version: string; source: string; devices: number }> } | null>(null);
    const [announcePlatform, setAnnouncePlatform] = useState<UpdatePlatform>('android');
    const [announceVersion, setAnnounceVersion] = useState('');
    const [announceMessage, setAnnounceMessage] = useState('');
    const [announcing, setAnnouncing] = useState(false);
    const [announceStatus, setAnnounceStatus] = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        admin.getAppUpdateAnnouncement()
            .then((current) => {
                setAnnouncement({ android: current.android, ios: current.ios, message: current.message });
                setAnnounceMessage(current.message || '');
                setDetection({ minDevices: current.min_devices, detected: current.detected });
                setRequiredByPlatform({ android: Boolean(current.android_required), ios: Boolean(current.ios_required) });
            })
            .catch(() => undefined);
    }, []);

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

    async function handleAnnounce(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setAnnouncing(true);
        setAnnounceStatus(null);
        try {
            const response = await admin.announceAppUpdate({
                platform: announcePlatform,
                version: announceVersion.trim(),
                message: announceMessage.trim(),
                required: announceRequired,
            });
            setRequiredByPlatform((current) => ({ ...current, [announcePlatform]: response.required }));
            setAnnouncement((current) => ({ ...current, [announcePlatform]: response.version, message: response.message }));
            setAnnounceVersion('');
            setAnnounceStatus({ ok: true, text: t('admin_app_updates.announce_done', { version: response.version }) });
        } catch (requestError: any) {
            setAnnounceStatus({ ok: false, text: requestError?.message || t('admin_app_updates.announce_error') });
        } finally {
            setAnnouncing(false);
        }
    }

    async function handleWithdraw(target: UpdatePlatform) {
        setAnnounceStatus(null);
        try {
            await admin.withdrawAppUpdate(target);
            setAnnouncement((current) => ({ ...current, [target]: '' }));
            setRequiredByPlatform((current) => ({ ...current, [target]: false }));
        } catch (requestError: any) {
            setAnnounceStatus({ ok: false, text: requestError?.message || t('admin_app_updates.announce_error') });
        }
    }

    const platformOptions = [
        { id: 'android' as const, label: t('admin_app_updates.android'), Icon: Smartphone },
        { id: 'ios' as const, label: t('admin_app_updates.ios'), Icon: Apple },
    ];

    return (
        <section className="mx-auto w-full max-w-4xl space-y-6">
            <header>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{t('admin_app_updates.eyebrow')}</p>
                <h2 className="mt-2 text-2xl font-black text-white">{t('admin_app_updates.title')}</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                    {t('admin_app_updates.description')}
                </p>
            </header>

            <form onSubmit={handleAnnounce} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-7">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">{t('admin_app_updates.announce_title')}</h3>
                    <p className="mt-1 text-sm text-slate-400">{t('admin_app_updates.announce_description')}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    {platformOptions.map(({ id, label, Icon }) => (
                        <div key={id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                            <div className="space-y-1 text-sm text-slate-300">
                                <span className="flex items-center gap-2 font-bold">
                                    <Icon size={15} />
                                    {label}
                                </span>
                                <span className="block">
                                    {detection?.detected?.[id]?.version
                                        ? t(detection.detected[id].source === 'app_store' ? 'admin_app_updates.detected_store' : 'admin_app_updates.detected_devices', { version: detection.detected[id].version, count: detection.detected[id].devices })
                                        : t('admin_app_updates.detected_none', { count: detection?.minDevices ?? 3 })}
                                </span>
                                <span className="block text-slate-400">
                                    {announcement[id]
                                        ? t(requiredByPlatform[id] ? 'admin_app_updates.announce_current_required' : 'admin_app_updates.announce_current', { version: announcement[id] })
                                        : t('admin_app_updates.announce_none')}
                                </span>
                            </div>
                            {announcement[id] ? (
                                <button type="button" onClick={() => handleWithdraw(id)} className="text-xs font-bold text-rose-300 hover:text-rose-200">
                                    {t('admin_app_updates.announce_withdraw')}
                                </button>
                            ) : null}
                        </div>
                    ))}
                </div>

                <fieldset className="space-y-2">
                    <legend className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('admin_app_updates.platform')}</legend>
                    <div className="grid grid-cols-2 gap-3">
                        {platformOptions.map(({ id, label, Icon }) => (
                            <button
                                key={id}
                                type="button"
                                aria-pressed={announcePlatform === id}
                                onClick={() => setAnnouncePlatform(id)}
                                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition-colors ${announcePlatform === id ? 'border-primary/50 bg-primary/15 text-primary' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                            >
                                <Icon size={17} />
                                {label}
                            </button>
                        ))}
                    </div>
                </fieldset>

                <label className="block space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('admin_app_updates.announce_version')}</span>
                    <input
                        required
                        value={announceVersion}
                        onChange={(event) => setAnnounceVersion(event.target.value)}
                        placeholder="1.0.26"
                        inputMode="decimal"
                        maxLength={40}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-primary/60"
                    />
                </label>

                <label className="block space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('admin_app_updates.announce_message')}</span>
                    <textarea
                        maxLength={240}
                        rows={3}
                        value={announceMessage}
                        onChange={(event) => setAnnounceMessage(event.target.value)}
                        placeholder={t('admin_app_updates.announce_message_placeholder')}
                        className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-primary/60"
                    />
                    <span className="block text-xs text-slate-500">{t('admin_app_updates.announce_message_hint')}</span>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                    <input
                        type="checkbox"
                        checked={announceRequired}
                        onChange={(event) => setAnnounceRequired(event.target.checked)}
                        className="mt-1 h-4 w-4 accent-primary"
                    />
                    <span className="space-y-1">
                        <span className="block text-sm font-bold text-white">{t('admin_app_updates.announce_required')}</span>
                        <span className="block text-xs text-slate-400">{t('admin_app_updates.announce_required_hint')}</span>
                    </span>
                </label>

                <button
                    type="submit"
                    disabled={announcing || !announceVersion.trim()}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {announcing ? t('admin_app_updates.announce_sending') : t('admin_app_updates.announce_send')}
                </button>

                {announceStatus ? (
                    <p role={announceStatus.ok ? 'status' : 'alert'} className={`text-sm ${announceStatus.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{announceStatus.text}</p>
                ) : null}
            </form>

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
