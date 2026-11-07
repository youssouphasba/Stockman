'use client';

import { useEffect, useRef, useState } from 'react';
import { Globe } from 'lucide-react';
import { ecommerce } from '../services/api';
import type { User as AppUser } from '../services/api';
import { getAccessContext } from '../utils/access';
import { createEcommerceSetupController, ECOMMERCE_SETUP_MESSAGE as message, EMPTY_SETUP_VIEW } from '../lib/ecommerceSetup';

// Indication d'interface uniquement : le serveur reste l'autorité (Starter et Pro sont en consultation sur le web).
export function canOfferEcommerceSetupOnWeb(user?: AppUser | null): boolean {
    if (!user || user.is_demo || user.can_write_data === false) return false;
    if (!getAccessContext(user).isOrgAdmin) return false;
    if (user.role === 'admin' || user.role === 'superadmin') return true;
    return (user.effective_plan || user.subscription_plan || user.plan) === 'enterprise';
}

export default function EcommerceSetupInvitation({ onConfigure }: { onConfigure: () => void }) {
    const [state, setState] = useState(EMPTY_SETUP_VIEW);
    const configureRef = useRef(onConfigure);
    configureRef.current = onConfigure;
    const controller = useRef<ReturnType<typeof createEcommerceSetupController> | null>(null);

    useEffect(() => {
        const current = createEcommerceSetupController(ecommerce, setState, () => configureRef.current());
        controller.current = current;
        current.start();
        return () => {
            controller.current = null;
            current.dispose();
        };
    }, []);

    if (!state.visible) return null;

    return (
        <section
            role="region"
            aria-labelledby="ecommerce-setup-title"
            className="mb-6 flex flex-col gap-4 rounded-2xl border border-primary/25 bg-primary/10 p-5 md:flex-row md:items-center"
        >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Globe size={20} />
            </div>
            <div className="min-w-0 flex-1">
                <h2 id="ecommerce-setup-title" className="text-lg font-black text-white">{message.title}</h2>
                <p className="mt-1 text-sm text-slate-300">{message.description}</p>
                {state.error && <p role="alert" className="mt-2 text-sm font-bold text-rose-300">{state.error}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    disabled={state.busy}
                    onClick={() => { void controller.current?.respond('configure'); }}
                    className="min-h-11 rounded-xl bg-primary px-5 text-sm font-black text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                    {message.configure}
                </button>
                <button
                    type="button"
                    disabled={state.busy}
                    onClick={() => { void controller.current?.respond('later'); }}
                    className="min-h-11 rounded-xl px-4 text-sm font-bold text-slate-300 transition-colors hover:text-white disabled:opacity-50"
                >
                    {message.later}
                </button>
            </div>
        </section>
    );
}
