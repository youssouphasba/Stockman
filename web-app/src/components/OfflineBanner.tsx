'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export default function OfflineBanner() {
    const [isOnline, setIsOnline] = useState(true);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            // Hide banner after 3 seconds of being back online
            setTimeout(() => setIsVisible(false), 3000);
        };
        const handleOffline = () => {
            setIsOnline(false);
            setIsVisible(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isVisible && isOnline) return null;

    return (
        <div className={`fixed top-0 left-0 right-0 z-[9999] p-4 transition-all duration-500 transform ${isVisible ? 'translate-y-0' : '-translate-y-full'
            }`}>
            <div className={`max-w-md mx-auto rounded-2xl border shadow-2xl flex items-center justify-between gap-4 p-4 ${isOnline
                    ? 'bg-emerald-500/90 border-emerald-400 text-white backdrop-blur-md'
                    : 'bg-rose-500/90 border-rose-400 text-white backdrop-blur-md'
                }`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/20">
                        {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
                    </div>
                    <div>
                        <p className="font-bold text-sm">
                            {isOnline ? 'Connexion rétablie' : 'Vous êtes hors-ligne'}
                        </p>
                        <p className="text-[10px] opacity-80 uppercase font-black tracking-widest">
                            {isOnline ? 'Vos données vont être synchronisées' : 'Certaines fonctionnalités sont limitées'}
                        </p>
                    </div>
                </div>
                {!isOnline && (
                    <button
                        onClick={() => window.location.reload()}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                    >
                        <RefreshCw size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}
