'use client';

import { Suspense, useEffect, useState } from 'react';
import StorefrontClient from '../shop/[slug]/StorefrontClient';
import ThemeStorefront from '../../storefront/ThemeStorefront';
import type { StorefrontPayload } from '../../storefront/types';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

function PreviewMessage({ title, text }: { title: string; text?: string }) {
  return (
    <main className="min-h-screen bg-[#f7f8f4] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-black">{title}</h1>
          {text && <p className="mt-2 text-sm text-slate-600">{text}</p>}
        </div>
      </div>
    </main>
  );
}

function PreviewRenderer({ token }: { token: string }) {
  const [payload, setPayload] = useState<StorefrontPayload | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setPayload(undefined);
    fetch('/api/public/ecommerce/preview', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (!cancelled) setPayload(data); })
      .catch(() => { if (!cancelled) setPayload(null); });
    return () => { cancelled = true; };
  }, [token]);

  if (payload === undefined) return <PreviewMessage title="Chargement de l'aperçu..." />;
  if (payload?.theme) return <ThemeStorefront slug="" previewToken={token} initialPayload={payload} />;
  // Stockman Basic, ou aperçu expiré : le rendu Basic affiche lui-même le message adapté.
  return <StorefrontClient key={token} slug="" previewToken={token} />;
}

export default function PreviewClient() {
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    // Le jeton est lu dans le fragment de l'adresse, qui n'est jamais transmis au serveur web ni aux statistiques.
    const read = () => {
      const value = window.location.hash.replace(/^#/, '');
      setToken(TOKEN_PATTERN.test(value) ? value : null);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  if (token === undefined) return <PreviewMessage title="Chargement de l'aperçu..." />;
  if (!token) return <PreviewMessage title="Lien d'aperçu incomplet" text="Ouvrez de nouveau l'aperçu depuis Stockman pour obtenir un lien valide." />;
  return (
    <Suspense fallback={<PreviewMessage title="Chargement de l'aperçu..." />}>
      <PreviewRenderer key={token} token={token} />
    </Suspense>
  );
}
