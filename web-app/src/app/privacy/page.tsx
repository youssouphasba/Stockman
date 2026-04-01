'use client';

import { useState, useEffect } from 'react';
import { legal } from '@/services/api';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  const [content, setContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    legal.getPrivacy('fr')
      .then((res) => {
        setContent(res.content || '');
        setUpdatedAt(res.updated_at || null);
      })
      .catch(() => setContent('Impossible de charger la politique de confidentialité.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/#dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Retour
        </Link>

        <div className="glass-card p-8 md:p-10">
          <h1 className="text-2xl font-black text-white mb-2">
            Politique de Confidentialité
          </h1>
          {updatedAt && (
            <p className="text-xs text-slate-500 mb-6">
              Dernière mise à jour : {new Date(updatedAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap">
              {content}
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <Link href="/terms" className="text-sm text-primary hover:underline">
            ← Voir les Conditions Générales d&apos;Utilisation
          </Link>
        </div>
      </div>
    </div>
  );
}
