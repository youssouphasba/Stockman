import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { API_URL } from './config';
import { MOBILE_APP_URL } from './data/marketing';

interface InviteInfo {
  supplier_name: string;
  merchant_name: string;
  store_name: string | null;
  already_linked: boolean;
}

export default function SupplierInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(true);
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/api/public/supplier-invite/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => setInfo(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconCircle}>
            <span style={{ fontSize: 32 }}>?</span>
          </div>
          <h1 style={styles.title}>Invitation introuvable</h1>
          <p style={styles.text}>
            Ce lien d'invitation n'est plus valide ou a expir&eacute;.
          </p>
          <Link to="/" style={styles.secondaryButton}>
            Retour au site
          </Link>
        </div>
      </div>
    );
  }

  const storeLine = info.store_name
    ? `${info.merchant_name} (${info.store_name})`
    : info.merchant_name;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoSection}>
          <h2 style={styles.logo}>Stockman</h2>
        </div>

        <h1 style={styles.title}>
          Bonjour {info.supplier_name},
        </h1>

        <p style={styles.text}>
          <strong>{storeLine}</strong> vous a ajout&eacute; comme fournisseur sur{' '}
          <strong>Stockman</strong>.
        </p>

        {info.already_linked ? (
          <div style={styles.successBox}>
            <p style={styles.successText}>
              Votre compte est d&eacute;j&agrave; connect&eacute;. Ouvrez l'application pour g&eacute;rer vos commandes.
            </p>
          </div>
        ) : (
          <>
            <p style={styles.subtitle}>
              En rejoignant Stockman en tant que fournisseur, vous pourrez :
            </p>
            <ul style={styles.list}>
              <li>Recevoir des bons de commande directement dans l'application</li>
              <li>G&eacute;rer et confirmer vos commandes en temps r&eacute;el</li>
              <li>Communiquer avec vos clients via la messagerie int&eacute;gr&eacute;e</li>
              <li>Proposer votre catalogue sur la marketplace Stockman</li>
            </ul>
          </>
        )}

        <div style={styles.buttonsSection}>
          <a
            href={MOBILE_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.primaryButton}
          >
            T&eacute;l&eacute;charger sur Google Play
          </a>
          <a
            href="https://apps.apple.com/app/stockman/id6760587628"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.iosButton}
          >
            T&eacute;l&eacute;charger sur l'App Store
          </a>
        </div>

        <div style={styles.stepsSection}>
          <h3 style={styles.stepsTitle}>Comment commencer ?</h3>
          <ol style={styles.steps}>
            <li>T&eacute;l&eacute;chargez l'application Stockman</li>
            <li>Cr&eacute;ez votre compte avec le r&ocirc;le <strong>Fournisseur</strong></li>
            <li>Votre profil sera automatiquement connect&eacute; &agrave; vos clients</li>
          </ol>
        </div>

        <div style={styles.footer}>
          <Link to="/" style={styles.footerLink}>
            En savoir plus sur Stockman
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
  },
  card: {
    maxWidth: 520,
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: '40px 32px',
    backdropFilter: 'blur(12px)',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: 24,
  },
  logo: {
    color: '#3B82F6',
    fontSize: 28,
    fontWeight: 800,
    margin: 0,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    background: 'rgba(59,130,246,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    color: '#3B82F6',
  },
  title: {
    color: '#F1F5F9',
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 12,
  },
  text: {
    color: '#94A3B8',
    fontSize: 16,
    lineHeight: '1.6',
    marginBottom: 16,
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 8,
  },
  list: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: '1.8',
    paddingLeft: 20,
    marginBottom: 24,
  },
  buttonsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 28,
  },
  primaryButton: {
    display: 'block',
    textAlign: 'center',
    background: '#3B82F6',
    color: '#fff',
    padding: '14px 24px',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 15,
    textDecoration: 'none',
  },
  iosButton: {
    display: 'block',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.06)',
    color: '#F1F5F9',
    padding: '14px 24px',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 15,
    textDecoration: 'none',
    border: '1px solid rgba(255,255,255,0.12)',
  },
  secondaryButton: {
    display: 'inline-block',
    color: '#3B82F6',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 14,
  },
  successBox: {
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.2)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
  },
  successText: {
    color: '#4ADE80',
    fontSize: 14,
    margin: 0,
  },
  stepsSection: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 20,
    marginBottom: 24,
  },
  stepsTitle: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 10,
    marginTop: 0,
  },
  steps: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: '2',
    paddingLeft: 20,
    margin: 0,
  },
  footer: {
    textAlign: 'center',
  },
  footerLink: {
    color: '#64748B',
    fontSize: 13,
    textDecoration: 'none',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid rgba(59,130,246,0.2)',
    borderTopColor: '#3B82F6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 12px',
  },
  loadingText: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 14,
  },
};
