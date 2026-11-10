'use client';

// Réglage « Paiement des commandes » de la boutique en ligne. Le client paie le commerçant
// directement, sur son compte Wave ou Orange Money : Stockman affiche le numéro et le montant,
// puis le commerçant confirme « Paiement reçu ». Stockman ne reçoit jamais cet argent.
import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

export type PaymentDraft = {
    wave_phone?: string | null;
    wave_name?: string | null;
    wave_link?: string | null;
    orange_money_phone?: string | null;
    orange_money_name?: string | null;
    pay_on_delivery?: boolean;
    payment_instructions?: string | null;
};

const inputClass = 'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-primary/50 disabled:opacity-60';

function Wallet({ title, active, children }: { title: string; active: boolean; children: React.ReactNode }) {
    return (
        <div className={`rounded-2xl border p-4 ${active ? 'border-emerald-400/30 bg-emerald-500/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}>
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-white">{title}</p>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${active ? 'text-emerald-300' : 'text-slate-500'}`}>
                    {active ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-4 w-4" aria-hidden="true" />}
                    {active ? 'Proposé à vos clients' : 'Non proposé'}
                </span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">{children}</div>
        </div>
    );
}

function Input({ label, hint, value, onChange, disabled, type = 'text', placeholder }: {
    label: string;
    hint?: string;
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
    type?: string;
    placeholder?: string;
}) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-300">{label}</span>
            <input type={type} inputMode={type === 'tel' ? 'tel' : undefined} value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={inputClass} />
            {hint && <span className="text-xs leading-5 text-slate-500">{hint}</span>}
        </label>
    );
}

export default function EcommercePaymentSettings({ draft, onChange, disabled = false, mobileMoneyAvailable }: {
    // Faux hors du Sénégal : Wave et Orange Money ne sont pas proposés à cette boutique.
    mobileMoneyAvailable?: boolean;
    draft: PaymentDraft;
    onChange: (patch: Partial<PaymentDraft>) => void;
    disabled?: boolean;
}) {
    const wave = Boolean((draft.wave_phone || '').trim());
    const orange = Boolean((draft.orange_money_phone || '').trim());
    const mobile = wave || orange;
    const mobileMoney = mobileMoneyAvailable !== false;
    return (
        <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.02] p-5" aria-labelledby="payment-settings-title">
            <div>
                <h3 id="payment-settings-title" className="text-base font-black text-white">Paiement des commandes</h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                    {mobileMoney
                        ? 'Vos clients vous paient directement, en une seule fois, articles et livraison compris. Indiquez le compte sur lequel ils doivent payer : la boutique leur affiche le numéro et le montant exact, et vous confirmez « Paiement reçu » dans la commande.'
                        : 'Vos clients vous paient directement. Écrivez ci-dessous comment vous payer : ils le lisent avant de commander, et vous confirmez « Paiement reçu » dans la commande. Wave et Orange Money sont proposés aux boutiques du Sénégal.'}
                </p>
            </div>

            {mobileMoney && <>
            <Wallet title="Wave" active={wave}>
                <Input label="Votre numéro Wave" type="tel" placeholder="77 123 45 67" value={draft.wave_phone || ''} onChange={(value) => onChange({ wave_phone: value })} disabled={disabled} />
                <Input label="Nom affiché dans Wave" hint="Le client vérifie ce nom avant de payer." value={draft.wave_name || ''} onChange={(value) => onChange({ wave_name: value })} disabled={disabled} />
                <div className="md:col-span-2">
                    <Input label="Lien de paiement Wave (facultatif)" hint="Si Wave Business vous a donné un lien de paiement, collez-le : le client l'ouvrira d'un geste." placeholder="https://…wave.com/…" value={draft.wave_link || ''} onChange={(value) => onChange({ wave_link: value })} disabled={disabled} />
                </div>
            </Wallet>

            <Wallet title="Orange Money" active={orange}>
                <Input label="Votre numéro Orange Money" type="tel" placeholder="77 123 45 67" value={draft.orange_money_phone || ''} onChange={(value) => onChange({ orange_money_phone: value })} disabled={disabled} />
                <Input label="Nom affiché dans Orange Money" hint="Le client vérifie ce nom avant de payer." value={draft.orange_money_name || ''} onChange={(value) => onChange({ orange_money_name: value })} disabled={disabled} />
            </Wallet>

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <input type="checkbox" checked={draft.pay_on_delivery !== false} disabled={disabled || !mobile} onChange={(event) => onChange({ pay_on_delivery: event.target.checked })} className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10" />
                <span>
                    <span className="block text-sm font-black text-white">Accepter le paiement à la livraison</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-400">
                        {mobile
                            ? 'Le client peut choisir de vous payer à la réception. Décochez pour exiger le paiement avant la préparation.'
                            : 'Ajoutez un numéro Wave ou Orange Money pour proposer un choix à vos clients. Sans numéro, ils lisent seulement vos consignes ci-dessous.'}
                    </span>
                </span>
            </label>
            </>}

            <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-white">{mobileMoney ? 'Autres consignes de paiement (facultatif)' : 'Consignes de paiement'}</span>
                <span className="text-xs leading-5 text-slate-500">Exemple : virement, espèces au retrait en boutique, délai de paiement.</span>
                <textarea value={draft.payment_instructions || ''} disabled={disabled} onChange={(event) => onChange({ payment_instructions: event.target.value })} rows={3} className={`${inputClass} resize-none`} />
            </label>
        </section>
    );
}
