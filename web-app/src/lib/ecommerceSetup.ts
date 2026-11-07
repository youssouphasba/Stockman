// Ce fichier existe en deux copies identiques : frontend/utils/ecommerceSetup.ts (mobile)
// et web-app/src/lib/ecommerceSetup.ts (web). Le test ecommerce-setup.test.cjs vérifie leur parité.
export const ECOMMERCE_SETUP_MESSAGE = {
  title: 'Bienvenue dans votre boutique en ligne !',
  description: "Votre boutique dispose déjà d'un modèle de site prêt à personnaliser. Configurez-le maintenant ou poursuivez votre activité.",
  configure: 'Configurer mon site',
  later: 'Plus tard',
  error: "Impossible d'enregistrer votre choix. Vérifiez votre connexion puis réessayez.",
};

export type SetupStatus = { state: string; can_configure: boolean; site_slug: string | null };
export type SetupClaim = { state: string; claim_id: string | null; retry_after_seconds: number; site_slug: string };
export type SetupToken = { site_slug: string; claim_id?: string };
export type SetupApi = {
  getSetup: () => Promise<SetupStatus>;
  claimSetup: (data: SetupToken) => Promise<SetupClaim>;
  respondSetup: (data: SetupToken & { decision: 'configure' | 'later' }) => Promise<unknown>;
  releaseSetup: (data: SetupToken) => Promise<unknown>;
};
export type SetupView = { visible: boolean; busy: boolean; error: string | null };
export const EMPTY_SETUP_VIEW: SetupView = { visible: false, busy: false, error: null };

export function createEcommerceSetupController(api: SetupApi, update: (state: SetupView) => void, configure: () => void) {
  let disposed = false;
  let token: SetupToken | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let busy = false;
  const schedule = (run: () => void, seconds: number) => {
    clearTimeout(timer);
    if (!disposed) timer = setTimeout(run, Math.max(1, seconds) * 1000);
  };
  const release = (value: SetupToken | null) => { if (value) void api.releaseSetup(value).catch(() => undefined); };
  async function load() {
    if (disposed) return;
    try {
      const status = await api.getSetup();
      if (disposed || !status.can_configure || status.state !== 'pending' || !status.site_slug) return;
      const claim = await api.claimSetup({ site_slug: status.site_slug });
      if (disposed) { if (claim.claim_id) release({ site_slug: claim.site_slug, claim_id: claim.claim_id }); return; }
      receive(claim);
    } catch {
      if (!disposed) schedule(() => { void load(); }, 30);
    }
  }
  function receive(claim: SetupClaim) {
    token = claim.claim_id ? { site_slug: claim.site_slug, claim_id: claim.claim_id } : null;
    update(token ? { visible: true, busy: false, error: null } : EMPTY_SETUP_VIEW);
    if (token) schedule(() => { void renew(); }, claim.retry_after_seconds / 3);
    else if (claim.state === 'pending') schedule(() => { void load(); }, claim.retry_after_seconds);
  }
  async function renew() {
    if (disposed || !token) return;
    try {
      const claim = await api.claimSetup(token);
      if (!disposed && !busy) receive(claim);
    } catch {
      if (!disposed && !busy) {
        release(token);
        token = null;
        update(EMPTY_SETUP_VIEW);
        schedule(() => { void load(); }, 30);
      }
    }
  }
  async function respond(decision: 'configure' | 'later') {
    if (disposed || busy || !token) return;
    busy = true;
    clearTimeout(timer);
    update({ visible: true, busy: true, error: null });
    try {
      await api.respondSetup({ ...token, decision });
      if (disposed) return;
      token = null;
      update(EMPTY_SETUP_VIEW);
      if (decision === 'configure') configure();
    } catch {
      if (!disposed) {
        update({ visible: true, busy: false, error: ECOMMERCE_SETUP_MESSAGE.error });
        schedule(() => { void renew(); }, 30);
      }
    } finally { busy = false; }
  }
  return {
    start: () => { void load(); }, respond,
    dispose: () => { disposed = true; clearTimeout(timer); release(token); token = null; },
  };
}
