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


// Traduction des textes affichés : français par défaut, branchée sur i18n par l'application.
type TextTranslator = (key: string, fallback: string, vars?: Record<string, string | number>) => string;
const fillText = (text: string, vars?: Record<string, string | number>) => text.replace(/\{\{(\w+)\}\}/g, (_match, name) => String(vars?.[name] ?? ''));
let translateText: TextTranslator = (_key, fallback, vars) => fillText(fallback, vars);
export function setEcommerceDomainTranslator(fn: TextTranslator): void {
  translateText = fn;
}
const tr = (key: string, fallback: string, vars?: Record<string, string | number>) => translateText(`ecommerce_domain_lib.${key}`, fallback, vars);
export const DNS_PROVIDERS: Array<{ key: string; label: string; tip: string }> = [
  { key: 'cloudflare', label: 'Cloudflare', get tip() { return tr('tip_cloudflare', "DNS > Records > Add record. Réglez le proxy sur « DNS only » (nuage gris) pour ces enregistrements."); } },
  { key: 'ovh', label: 'OVHcloud', get tip() { return tr('tip_ovh', "Noms de domaine > votre domaine > Zone DNS > Ajouter une entrée. Modifiez une entrée existante sur le même nom plutôt que d'en créer une seconde."); } },
  { key: 'godaddy', label: 'GoDaddy', get tip() { return tr('tip_godaddy', 'Portefeuille de domaines > DNS > Ajouter un nouvel enregistrement. Les enregistrements A sur @ et CNAME sur www existent souvent déjà : modifiez-les.'); } },
  { key: 'namecheap', label: 'Namecheap', get tip() { return tr('tip_namecheap', 'Domain List > Manage > Advanced DNS > Add new record. Saisissez @ ou www dans le champ Host.'); } },
  { key: 'other', get label() { return tr('provider_other', 'Autre fournisseur'); }, get tip() { return tr('tip_other', "Cherchez « Zone DNS », « Gestion DNS » ou « DNS records » dans l'espace client de votre fournisseur."); } },
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
      return { tone: 'progress', title: tr('dns_pending_title', 'En attente de vos réglages DNS'), text: tr('dns_pending_text', "Ajoutez les enregistrements ci-dessous chez le fournisseur de votre domaine, puis lancez la vérification. Leur prise en compte prend en général quelques minutes, parfois jusqu'à 48 heures.") };
    case 'ownership_pending':
      return { tone: 'progress', title: tr('ownership_title', 'Preuve de propriété demandée'), text: tr('ownership_text', "Ce domaine a déjà servi pour un autre site. Ajoutez aussi l'enregistrement TXT ci-dessous : il prouve que le domaine vous appartient.") };
    case 'certificate_pending':
      return { tone: 'progress', title: tr('certificate_title', 'Sécurisation en cours'), text: tr('certificate_text', 'Vos réglages DNS sont corrects. Le certificat HTTPS de {{domain}} est en cours de création ; cela prend en général quelques minutes.', { domain }) };
    case 'activation_pending':
      return { tone: 'warning', title: tr('activation_title', 'Activation par Stockman'), text: tr('activation_text', "Vos réglages DNS sont corrects. L'équipe Stockman doit encore activer {{domain}} sur ses serveurs : revenez vérifier plus tard, ou contactez le support si cela dure plus d'une journée.", { domain }) };
    case 'active':
      return { tone: 'success', title: tr('active_title', 'Domaine connecté'), text: tr('active_text', 'Votre site est en ligne sur https://{{domain}}. Votre adresse Stockman reste active.', { domain }) };
    default:
      return { tone: 'neutral', title: tr('none_title', 'Adresse Stockman active'), text: tr('none_text', 'Votre site est en ligne à son adresse Stockman. Vous pouvez aussi y connecter un nom de domaine que vous possédez déjà.') };
  }
}

export function recordPurpose(record: DomainRecord, site: DomainSite | null | undefined): string {
  if (record.purpose === 'redirect') return tr('purpose_redirect', 'Redirige {{host}} vers votre site', { host: record.host || site?.domain_redirect_from || tr('your_domain', 'votre domaine') });
  if (record.purpose === 'ownership') return tr('purpose_ownership', 'Prouve que le domaine vous appartient');
  return tr('purpose_site', 'Ouvre votre site sur {{host}}', { host: record.host || site?.custom_domain || tr('your_domain', 'votre domaine') });
}

// Le domaine nu ne redirige pas encore alors que le site est en ligne : seul l'enregistrement A manque.
export function redirectHint(site: DomainSite | null | undefined): string | null {
  if (domainState(site) !== 'active' || !site?.domain_redirect_from) return null;
  if (site.domain_redirect_ready) return tr('redirect_ready', '{{from}} redirige vers {{to}}.', { from: site.domain_redirect_from, to: site.custom_domain || '' });
  return tr('redirect_missing', "{{from}} ne redirige pas encore vers {{to}} : vérifiez l'enregistrement A sur @.", { from: site.domain_redirect_from, to: site.custom_domain || '' });
}

// Contrôle immédiat de la saisie ; le serveur reste seul juge du domaine.
export function domainInputProblem(text: string): string | null {
  const value = text.trim();
  if (!value) return tr('input_empty', 'Saisissez votre nom de domaine, par exemple senlab.com.');
  if (/\s/.test(value)) return tr('input_space', "Un nom de domaine ne contient pas d'espace.");
  const host = value.replace(/^[a-z]+:\/\//i, '').split(/[/?#]/)[0].replace(/\.$/, '');
  if (!/^[^.]+(\.[^.]+)+$/.test(host)) return tr('input_incomplete', 'Ce nom de domaine est incomplet, par exemple senlab.com.');
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
  return sameDay ? tr('checked_today', 'Dernière vérification à {{time}}', { time }) : tr('checked_on', 'Dernière vérification le {{date}} à {{time}}', { date: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`, time });
}
