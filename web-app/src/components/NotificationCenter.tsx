'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Bell, CheckCheck, Circle } from 'lucide-react';
import { userNotifications } from '../services/api';

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
    onUnreadChange?: (count: number) => void;
}

export default function NotificationCenter({ isOpen, onClose, onUnreadChange }: NotificationCenterProps) {
    const { t } = useTranslation();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [unread, setUnread] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await userNotifications.list(0, 50);
            setNotifications(res.items || []);
            setUnread(res.unread || 0);
            onUnreadChange?.(res.unread || 0);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [onUnreadChange]);

    useEffect(() => {
        if (isOpen) load();
    }, [isOpen, load]);

    // Poll every 60s when open
    useEffect(() => {
        if (!isOpen) return;
        const iv = setInterval(load, 60000);
        return () => clearInterval(iv);
    }, [isOpen, load]);

    const handleMarkRead = async (messageId: string) => {
        try {
            await userNotifications.markRead(messageId);
            setNotifications(prev => prev.map(n =>
                n.message_id === messageId ? { ...n, is_read: true } : n
            ));
            setUnread(prev => Math.max(0, prev - 1));
            onUnreadChange?.(Math.max(0, unread - 1));
        } catch { /* silent */ }
    };

    const handleMarkAllRead = async () => {
        try {
            await userNotifications.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnread(0);
            onUnreadChange?.(0);
        } catch { /* silent */ }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-md bg-[#0F172A] border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <h2 className="font-black text-white text-lg">{t('notifications.title')}</h2>
                        {unread > 0 && (
                            <span className="bg-rose-500/20 text-rose-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                                {unread} {t('notifications.unread')}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {unread > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-[10px] font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                            >
                                <CheckCheck size={14} /> {t('notifications.markAllRead')}
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading && notifications.length === 0 ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-20">
                            <Bell size={48} className="mx-auto text-slate-700 mb-4" />
                            <p className="text-slate-500 font-bold">{t('notifications.empty')}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {notifications.map((notif) => (
                                <button
                                    key={notif.message_id}
                                    onClick={() => !notif.is_read && handleMarkRead(notif.message_id)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                                        notif.is_read
                                            ? 'bg-white/3 border-white/5 opacity-60'
                                            : 'bg-white/5 border-primary/20 hover:bg-white/10'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {!notif.is_read && (
                                            <Circle size={8} className="text-primary fill-primary mt-1.5 shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-white text-sm truncate">{notif.title}</p>
                                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{notif.content}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[9px] text-slate-600">
                                                    {new Date(notif.sent_at).toLocaleString()}
                                                </span>
                                                <span className="text-[9px] text-slate-700">
                                                    {notif.sent_by}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
