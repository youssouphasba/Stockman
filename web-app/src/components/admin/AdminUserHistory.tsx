'use client';

import React from 'react';
import AdminAuditPanel from './AdminAuditPanel';

const formatDate = (value?: string) => (value ? new Date(value).toLocaleString('fr-FR') : '—');

const TICKET_STATUS: Record<string, string> = {
    open: 'Ouvert',
    in_progress: 'En cours',
    resolved: 'Résolu',
    closed: 'Fermé',
};

const EVENT_LABELS: Record<string, string> = {
    payment_succeeded: 'Paiement reçu',
    invoice_paid: 'Facture payée',
    checkout_completed: 'Paiement validé',
    checkout_failed: 'Paiement échoué',
    payment_failed: 'Paiement échoué',
    payment_issue: 'Incident de paiement',
    payment_unmatched: 'Paiement non rattaché',
    subscription_cancelled: 'Abonnement résilié',
    subscription_updated: 'Abonnement modifié',
    manual_grace_granted: 'Délai de grâce accordé',
    manual_read_only_enabled: 'Lecture seule activée',
    manual_read_only_disabled: 'Lecture seule retirée',
    reminder_sent: 'Relance envoyée',
};

type Props = { userId: string; detail: any };

// Fiche client, onglet Historique : abonnement, tickets et actions admin du compte.
export default function AdminUserHistory({ userId, detail }: Props) {
    const account = detail?.account || {};
    const tickets: any[] = detail?.support_tickets || [];
    const events: any[] = detail?.subscription_events || [];
    const graceUntil = account.manual_access_grace_until ? new Date(account.manual_access_grace_until) : null;

    return (
        <div className="space-y-6">
            <section>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Abonnement</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <Info label="Forfait" value={account.plan ? String(account.plan).charAt(0).toUpperCase() + String(account.plan).slice(1) : '—'} />
                    <Info label="Statut" value={account.subscription_status || '—'} />
                    <Info label="Moyen de paiement" value={account.subscription_provider && account.subscription_provider !== 'none' ? account.subscription_provider : 'Aucun'} />
                    <Info label="Fin de période" value={formatDate(account.subscription_end || account.trial_ends_at)} />
                </div>
                {graceUntil && graceUntil.getTime() > Date.now() ? (
                    <p className="mt-2 text-xs font-bold text-amber-300">Délai de grâce jusqu’au {graceUntil.toLocaleDateString('fr-FR')}</p>
                ) : null}
                {account.manual_read_only_enabled ? <p className="mt-1 text-xs font-bold text-rose-300">Compte en lecture seule</p> : null}
                {events.length ? (
                    <ul className="mt-3 divide-y divide-white/5">
                        {events.map((event, index) => (
                            <li key={`${event.event_type}-${event.created_at}-${index}`} className="py-2 flex items-center justify-between gap-3 text-sm">
                                <span className="text-slate-200">{EVENT_LABELS[event.event_type] || event.event_type}{event.provider ? ` · ${event.provider}` : ''}</span>
                                <span className="shrink-0 text-xs text-slate-500">{formatDate(event.created_at)}</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="mt-3 text-xs text-slate-500">Aucun événement d’abonnement.</p>}
            </section>

            <section>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Tickets support</h4>
                {tickets.length ? (
                    <ul className="divide-y divide-white/5">
                        {tickets.map(ticket => (
                            <li key={ticket.ticket_id} className="py-2 flex items-center justify-between gap-3 text-sm">
                                <span className="min-w-0 truncate text-slate-200">{ticket.subject}</span>
                                <span className="shrink-0 text-xs text-slate-500">{TICKET_STATUS[ticket.status] || ticket.status} · {formatDate(ticket.created_at)}</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-xs text-slate-500">Aucun ticket.</p>}
            </section>

            <section>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Actions admin sur ce compte</h4>
                <AdminAuditPanel targetUserId={userId} compact />
            </section>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
            <p className="mt-1 font-bold text-white truncate">{value}</p>
        </div>
    );
}
