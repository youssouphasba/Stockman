'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Mail, RefreshCw } from 'lucide-react';
import { auth, type User } from '../services/api';

type Props = {
  user: User;
  onVerified: (user: User) => void;
  onLogout: () => void;
};

export default function VerifyEmailPanel({ user, onVerified, onLogout }: Props) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Entrez le code a 6 chiffres recu par email.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await auth.verifyEmail(otp);
      setMessage(response.message);
      onVerified(response.user);
    } catch (err: any) {
      setError(err?.message || 'Le code email est incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    setResending(true);
    setError('');
    setMessage('');
    try {
      const response = await auth.resendEmailOtp();
      setMessage(response.message);
      setCooldown(60);
    } catch (err: any) {
      setError(err?.message || "Impossible de renvoyer l'email de verification.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg glass-card p-8 space-y-6">
        <div className="space-y-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto">
            <Mail className="text-primary" size={28} />
          </div>
          <h1 className="text-3xl font-black">Verifiez votre email</h1>
          <p className="text-slate-400 text-sm leading-6">
            Nous avons cree votre compte Enterprise. Entrez le code envoye a <strong className="text-white">{user.email}</strong> pour debloquer l&apos;acces web.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-widest">Code email</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center text-2xl tracking-[0.4em] text-white placeholder-white/20 focus:outline-none focus:border-primary/50"
            />
          </div>

          {message && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300 flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={loading || otp.length !== 6}
            className="btn-primary w-full py-4 rounded-xl disabled:opacity-60"
          >
            {loading ? 'Verification...' : 'Verifier mon email'}
          </button>

          <button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="w-full py-3 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} className={resending ? 'animate-spin' : ''} />
            {cooldown > 0 ? `Renvoyer le code (${cooldown}s)` : 'Renvoyer le code'}
          </button>

          <button
            onClick={onLogout}
            className="w-full text-sm text-slate-400 hover:text-white transition-colors"
          >
            Utiliser un autre compte
          </button>
        </div>
      </div>
    </div>
  );
}
