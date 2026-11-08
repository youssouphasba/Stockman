// Connexion d'un nom de domaine au site e-commerce : états, enregistrements DNS et conseils par
// fournisseur. Copie identique dans web-app/src/lib/ecommerceDomain.ts, vérifiée par les tests.

export type DomainState = 'not_connected' | 'dns_pending' | 'ownership_pending' | 'certificate_pending' | 'activation_pending' | 'active';
export type DomainRecord = { type: string; name: string; host?: string; value: string; purpose: string };
export type DomainTone = 'neutral' | 'progress' | 'warning' | 'success';
export type DomainSite = {
  site_url?: string | null;
  stockman_site_url?: string | null;
  custom_domain?: string | null;
  custom_domain_url?: string | null;
  domain_status?: string | null;
  domain_state?: string | null;
  domain_records?: DomainRecord[] | null;
  domain_redirect_from?: string | null;
  domain_redirect_ready?: boolean | null;
  domain_checked_at?: string | null;
  domain_automatic?: boolean | null;
};

const STATES: DomainState[] = ['not_connected', 'dns_pending', 'ownership_pending', 'certificate_pending', 'activation_pending', 'active'];
// États qui évoluent sans action du commerçant : une vérification à l'ouverture fait gagner du temps.
const WAITING_STATES: DomainState[] = ['dns_pending', 'ownership_pending', 'certificate_pending'];
const AUTO_CHECK_DELAY = 60_000;

export const DNS_PROVIDERS: Array<{ key: string; label: string; tip: string }> = [
  { key: 'cloudflare', label: 'Cloudflare', tip: "DNS > Records > Add record. Réglez le proxy sur « DNS only » (nuage gris) pour ces enregistrements." },
  { key: 'ovh', label: 'OVHcloud', tip: "Noms de domaine > votre domaine > Zone DNS > Ajouter une entrée. Modifiez une entrée existante sur le même nom plutôt que d'en créer une seconde." },
  { key: 'godaddy', label: 'GoDaddy', tip: 'Portefeuille de domaines > DNS > Ajouter un nouvel enregistrement. Les enregistrements A sur @ et CNAME sur www existent souvent déjà : modifiez-les.' },
  { key: 'namecheap', label: 'Namecheap', tip: 'Domain List > Manage > Advanced DNS > Add new record. Saisissez @ ou www dans le champ Host.' },
  { key: 'other', label: 'Autre fournisseur', tip: "Cherchez « Zone DNS », « Gestion DNS » ou « DNS records » dans l'espace client de votre fournisseur." },
];

export function domainState(site: DomainSite | null | undefined): DomainState {
  if (!site?.custom_domain) return 'not_connected';
  if (site.domain_state && (STATES as string[]).includes(site.domain_state)) return site.domain_state as DomainState;
  // Réponse d'un serveur antérieur : seul le statut historique est connu.
  return site.domain_status === 'verified' ? 'active' : 'dns_pending';
}

export function domainRecords(site: DomainSite | null | undefined): DomainRecord[] {
  return Array.isArray(site?.domain_records) ? site!.domain_records!.filter((record) => record && record.type && record.value) : [];
}

export function describeDomainState(site: DomainSite | null | undefined): { tone: DomainTone; title: string; text: string } {
  const domain = site?.custom_domain || '';
  switch (domainState(site)) {
    case 'dns_pending':
      return { tone: 'progress', title: 'En attente de vos réglages DNS', text: "Ajoutez les enregistrements ci-dessous chez le fournisseur de votre domaine, puis lancez la vérification. Leur prise en compte prend en général quelques minutes, parfois jusqu'à 48 heures." };
    case 'ownership_pending':
      return { tone: 'progress', title: 'Preuve de propriété demandée', text: "Ce domaine a déjà servi pour un autre site. Ajoutez aussi l'enregistrement TXT ci-dessous : il prouve que le domaine vous appartient." };
    case 'certificate_pending':
      return { tone: 'progress', title: 'Sécurisation en cours', text: `Vos réglages DNS sont corrects. Le certificat HTTPS de ${domain} est en cours de création ; cela prend en général quelques minutes.` };
    case 'activation_pending':
      return { tone: 'warning', title: 'Activation par Stockman', text: `Vos réglages DNS sont corrects. L'équipe Stockman doit encore activer ${domain} sur ses serveurs : revenez vérifier plus tard, ou contactez le support si cela dure plus d'une journée.` };
    case 'active':
      return { tone: 'success', title: 'Domaine connecté', text: `Votre site est en ligne sur https://${domain}. Votre adresse Stockman reste active.` };
    default:
      return { tone: 'neutral', title: 'Adresse Stockman active', text: 'Votre site est en ligne à son adresse Stockman. Vous pouvez aussi y connecter un nom de domaine que vous possédez déjà.' };
  }
}

export function recordPurpose(record: DomainRecord, site: DomainSite | null | undefined): string {
  if (record.purpose === 'redirect') return `Redirige ${record.host || site?.domain_redirect_from || 'votre domaine'} vers votre site`;
  if (record.purpose === 'ownership') return 'Prouve que le domaine vous appartient';
  return `Ouvre votre site sur ${record.host || site?.custom_domain || 'votre domaine'}`;
}

// Le domaine nu ne redirige pas encore alors que le site est en ligne : seul l'enregistrement A manque.
export function redirectHint(site: DomainSite | null | undefined): string | null {
  if (domainState(site) !== 'active' || !site?.domain_redirect_from) return null;
  if (site.domain_redirect_ready) return `${site.domain_redirect_from} redirige vers ${site.custom_domain}.`;
  return `${site.domain_redirect_from} ne redirige pas encore vers ${site.custom_domain} : vérifiez l'enregistrement A sur @.`;
}

// Contrôle immédiat de la saisie ; le serveur reste seul juge du domaine.
export function domainInputProblem(text: string): string | null {
  const value = text.trim();
  if (!value) return 'Saisissez votre nom de domaine, par exemple senlab.com.';
  if (/\s/.test(value)) return "Un nom de domaine ne contient pas d'espace.";
  const host = value.replace(/^[a-z]+:\/\//i, '').split(/[/?#]/)[0].replace(/\.$/, '');
  if (!/^[^.]+(\.[^.]+)+$/.test(host)) return 'Ce nom de domaine est incomplet, par exemple senlab.com.';
  return null;
}

export function shouldAutoCheck(site: DomainSite | null | undefined, now = Date.now()): boolean {
  if (!WAITING_STATES.includes(domainState(site))) return false;
  const checked = site?.domain_checked_at ? new Date(site.domain_checked_at).getTime() : NaN;
  return Number.isNaN(checked) || now - checked > AUTO_CHECK_DELAY;
}

export function formatCheckedAt(value: string | null | undefined, now = new Date()): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (number: number) => String(number).padStart(2, '0');
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay ? `Dernière vérification à ${time}` : `Dernière vérification le ${pad(date.getDate())}/${pad(date.getMonth() + 1)} à ${time}`;
}
