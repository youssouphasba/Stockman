import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from './components/SEO';
import MarketingNav from './components/marketing/MarketingNav';
import MarketingFooter from './components/marketing/MarketingFooter';
import { useScrollReveal } from './hooks/useScrollReveal';
import { API_URL } from './config';
import {
  ENTERPRISE_FEATURES_URL,
  LANDING_BUSINESS_TYPES_PATH,
  LANDING_KEYWORDS,
  MOBILE_APP_URL,
} from './data/marketing';

type DemoChoiceId = 'commerce-mobile' | 'restaurant-mobile' | 'enterprise-web';

type DemoChoice = {
  id: DemoChoiceId;
  title: string;
  duration: string;
  surface: string;
  audience: string;
  recommendationBadge?: string;
  screenshot: string;
  summary: string;
  businessTypes: string[];
  whatTheyWillSee: string[];
  whyChooseIt: string[];
  nextLinks: Array<{ label: string; href: string; external?: boolean }>;
};

const DEMO_CHOICES: DemoChoice[] = [
  {
    id: 'commerce-mobile',
    title: 'Epicerie ou boutique',
    duration: '24h',
    surface: 'Demo mobile',
    audience: 'Pour les commerces de terrain',
    screenshot: '/assets/screenshots/stockman_screenshot_2_inventory_final_1771434576068.png',
    summary:
      "Une demo mobile centree sur la caisse, le stock, les ventes et les operations quotidiennes d'une boutique.",
    businessTypes: ['Epicerie', 'Boutique', 'Quincaillerie', 'Pharmacie', 'Point de vente de quartier'],
    whatTheyWillSee: [
      'une caisse mobile simple a utiliser',
      'des produits, du stock et des mouvements pre-remplis',
      'des clients, des dettes et des ventes deja creees',
      'des ecrans pensés pour l execution rapide sur le terrain',
    ],
    whyChooseIt: [
      'vous voulez voir comment vendre vite au quotidien',
      'vous avez une seule boutique ou un usage tres operationnel',
      "vous voulez comprendre l'app mobile avant tout",
    ],
    nextLinks: [
      { label: "Voir les business types commerce", href: LANDING_BUSINESS_TYPES_PATH },
      { label: "Voir l'app mobile", href: MOBILE_APP_URL, external: true },
    ],
  },
  {
    id: 'restaurant-mobile',
    title: 'Restaurant',
    duration: '24h',
    surface: 'Demo mobile',
    audience: 'Pour le service et la cuisine',
    screenshot: '/assets/screenshots/pos-overview.jpg',
    summary:
      "Une demo mobile orientee reservation, commande, service et encaissement pour les activites alimentaires.",
    businessTypes: ['Restaurant', 'Fast-food', 'Boulangerie', 'Traiteur', 'Snack'],
    whatTheyWillSee: [
      'des reservations et arrivees clients',
      'des commandes ouvertes et le suivi de service',
      'un parcours terrain pour salle et cuisine',
      'des tickets et paiements deja presents pour tester vite',
    ],
    whyChooseIt: [
      'vous voulez voir un vrai flux restaurant sur mobile',
      'vous travaillez avec reservations, salle ou cuisine',
      'vous cherchez un outil terrain plus qu un back-office web',
    ],
    nextLinks: [
      { label: 'Voir les activites restauration', href: LANDING_BUSINESS_TYPES_PATH },
      { label: "Voir l'app mobile", href: MOBILE_APP_URL, external: true },
    ],
  },
  {
    id: 'enterprise-web',
    title: 'Entreprise',
    duration: '48h',
    surface: 'Demo web Enterprise sur ordinateur',
    audience: 'Pour les supermarches, reseaux de boutiques et equipes de pilotage',
    recommendationBadge:
      'Recommande pour supermarches, grandes surfaces, entreprises de commerce et entreprises logistiques',
    screenshot: '/assets/screenshots/stockman-enterprise-preview.png',
    summary:
      "La demo Enterprise montre le vrai poste de pilotage web a utiliser de preference sur ordinateur pour les supermarches, entreprises de commerce, reseaux de boutiques, distribution, logistique et structures qui ont besoin d'analyses avancees.",
    businessTypes: ['Supermarche', 'Reseau de boutiques', 'Distribution', 'Logistique', 'Commerce multi-boutiques', "Centrale d'achat"],
    whatTheyWillSee: [
      'le back-office web Enterprise complet a utiliser sur ordinateur',
      'les analytics, rapports et comparaisons multi-boutiques',
      'les fournisseurs, achats, CRM et comptabilite avances',
      'les reglages entreprise et le pilotage des equipes sur grand ecran',
    ],
    whyChooseIt: [
      'vous pilotez plusieurs boutiques, depots ou equipes',
      'vous avez besoin de reporting, de controle, de consolidation ou de coordination inter-sites',
      'vous voulez tester le vrai niveau Enterprise des le debut, sur ordinateur',
    ],
    nextLinks: [
      { label: "Voir l'app web Enterprise", href: ENTERPRISE_FEATURES_URL, external: true },
      { label: 'Comprendre Enterprise', href: '/enterprise' },
    ],
  },
];

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Demo Stockman',
    url: 'https://stockman.pro/demo',
    description:
      'Selectionnez la bonne demo Stockman selon votre activite : commerce mobile, restaurant mobile ou Enterprise web.',
  },
];

export default function DemoSelectorPage() {
  useScrollReveal();
  const [searchParams] = useSearchParams();
  const preset = searchParams.get('type');
  const [email, setEmail] = useState('');
  const [selectedId, setSelectedId] = useState<DemoChoiceId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (preset === 'enterprise') {
      setSelectedId('enterprise-web');
    } else if (preset === 'restaurant') {
      setSelectedId('restaurant-mobile');
    } else if (preset === 'commerce') {
      setSelectedId('commerce-mobile');
    }
  }, [preset]);

  const selectedChoice = useMemo(
    () => DEMO_CHOICES.find((choice) => choice.id === selectedId) ?? null,
    [selectedId],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError("Renseignez votre adresse email pour recevoir la bonne demo.");
      return;
    }

    if (!selectedChoice) {
      setError('Choisissez d abord le type de demo qui correspond a votre activite.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Lead demo ${selectedChoice.title}`,
          email: email.trim().toLowerCase(),
          message:
            `Demande de demo Stockman.\n` +
            `Type de demo: ${selectedChoice.title}\n` +
            `Surface: ${selectedChoice.surface}\n` +
            `Duree souhaitee: ${selectedChoice.duration}\n` +
            `Audience: ${selectedChoice.audience}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Impossible d'enregistrer la demande de demo pour le moment.");
      }

      setSuccess(true);
    } catch (submitError) {
      console.error(submitError);
      setError("Impossible d'enregistrer la demande de demo pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <SEO
        title="Tester en mode Demo - Choisissez la bonne experience Stockman"
        description="Choisissez la bonne demo Stockman selon votre activite : epicerie ou boutique, restaurant, ou Enterprise pour les supermarches et entreprises multi-boutiques."
        url="https://stockman.pro/demo"
        keywords={[...LANDING_KEYWORDS, 'demo Stockman', 'demo enterprise', 'demo commerce', 'demo restaurant']}
        structuredData={structuredData}
      />

      <MarketingNav active="demo" />

      <section className="container page-hero reveal">
        <div className="section-title">
          <span className="badge-premium">Tester en mode Demo</span>
          <h1>Choisissez la demo qui montre vraiment votre realite</h1>
          <p className="text-muted">
            Les commerces de terrain et les entreprises n&apos;ont pas besoin de voir la meme chose.
            Choisissez le bon parcours des le depart pour tester la bonne promesse produit, surtout si vous cherchez un vrai outil de pilotage sur ordinateur pour un supermarche, un reseau de boutiques, une activite de distribution ou de logistique.
          </p>
        </div>
      </section>

      <section className="container reveal">
        <div className="glass-card demo-intro-card">
          <div className="demo-steps">
            <div className="demo-step">
              <span className="demo-step-number">1</span>
              <div>
                <strong>Renseignez votre email</strong>
                <p>On qualifie la bonne demo et on garde un point de contact propre.</p>
              </div>
            </div>
            <div className="demo-step">
              <span className="demo-step-number">2</span>
              <div>
                <strong>Choisissez votre type d&apos;activite</strong>
                <p>Mobile terrain pour les operations, web Enterprise sur ordinateur pour le pilotage avance.</p>
              </div>
            </div>
          </div>
          <div className="demo-enterprise-callout">
            <strong>Pour qui est la demo Enterprise ?</strong>
            <p>
              Supermarches, entreprises de commerce, distribution, logistique, reseaux de boutiques,
              centrales d&apos;achat, structures multi-equipes ou toute activite qui a besoin d&apos;analytics,
              de consolidation et d&apos;un vrai back-office web a utiliser de preference sur ordinateur.
            </p>
          </div>
        </div>
      </section>

      <section className="container reveal">
        <form onSubmit={handleSubmit} className="demo-email-form glass-card">
          <div className="demo-email-copy">
            <h2>Entrez votre email avant de commencer</h2>
            <p className="text-muted">
              Votre email nous permet de preparer la bonne experience demo, de relancer si la session expire
              et de vous orienter vers le bon parcours ensuite.
            </p>
          </div>
          <div className="demo-email-controls">
            <input
              type="email"
              className="demo-email-input"
              placeholder="vous@entreprise.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Recevoir cette demo'}
            </button>
          </div>
          {error ? <p className="signup-error">{error}</p> : null}
          {success && selectedChoice ? (
            <div className="demo-success-panel">
              <h3>Votre demande de demo a bien ete enregistree</h3>
              <p>
                Nous avons note votre interet pour <strong>{selectedChoice.title}</strong>. En attendant
                l&apos;activation de la demo adaptee, vous pouvez deja explorer le bon parcours ci-dessous.
              </p>
              <div className="hero-btns">
                {selectedChoice.nextLinks.map((link) =>
                  link.external ? (
                    <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                      {link.label}
                    </a>
                  ) : (
                    <Link key={link.label} to={link.href} className="btn-secondary">
                      {link.label}
                    </Link>
                  ),
                )}
              </div>
            </div>
          ) : null}
        </form>
      </section>

      <section className="container demo-options-grid reveal">
        {DEMO_CHOICES.map((choice) => {
          const isSelected = selectedId === choice.id;
          return (
            <article
              key={choice.id}
              className={`glass-card demo-option-card interactive-card${isSelected ? ' selected' : ''}`}
            >
              <div className="demo-option-media">
                <img src={choice.screenshot} alt={choice.title} className="demo-option-image" />
              </div>
              <div className="demo-option-body">
                <div className="demo-option-meta">
                  <span className="demo-option-pill">{choice.surface}</span>
                  <span className="demo-option-pill demo-option-pill-soft">{choice.duration}</span>
                </div>
                {choice.recommendationBadge ? (
                  <div className="demo-option-highlight">{choice.recommendationBadge}</div>
                ) : null}
                <p className="business-card-eyebrow">{choice.audience}</p>
                <h2>{choice.title}</h2>
                <p className="text-muted">{choice.summary}</p>

                <div className="demo-option-block">
                  <h3>Ideal pour</h3>
                  <div className="tag-list">
                    {choice.businessTypes.map((item) => (
                      <span key={item} className="tag-pill">{item}</span>
                    ))}
                  </div>
                </div>

                <div className="demo-option-block">
                  <h3>Vous verrez</h3>
                  <ul className="business-type-list">
                    {choice.whatTheyWillSee.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="demo-option-block">
                  <h3>Pourquoi choisir ce parcours</h3>
                  <ul className="business-type-list">
                    {choice.whyChooseIt.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  className={isSelected ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => {
                    setSelectedId(choice.id);
                    setSuccess(false);
                    setError('');
                  }}
                >
                  {isSelected ? 'Selectionnee' : 'Choisir cette demo'}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="container reveal">
        <div className="glass-card demo-footer-card">
          <div className="section-title">
            <h2>Une separation claire entre terrain et pilotage</h2>
            <p className="text-muted">
              Les demos mobiles montrent l&apos;execution rapide. La demo Enterprise montre la vision
              direction, la consolidation et les analyses avancees dans une experience web pensee pour ordinateur.
            </p>
          </div>
          <div className="section-cta-row">
            <Link to={LANDING_BUSINESS_TYPES_PATH} className="btn-secondary">Voir les business types</Link>
            <Link to="/enterprise" className="btn-primary">Comprendre le plan Enterprise</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
