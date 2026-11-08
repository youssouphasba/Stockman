// Ce fichier existe en deux copies identiques : frontend/utils/ecommerceAppearance.ts (mobile)
// et web-app/src/lib/ecommerceAppearance.ts (web). Le test ecommerce-appearance.test.cjs vérifie leur parité.
// Le serveur reste l'autorité : ce module prépare l'affichage et le document envoyé, sans décider des droits.

export type ThemeFieldType = 'text' | 'color';

export type ThemeField = {
  id: string;
  scope: 'global' | 'section';
  key: string;
  page_id?: string;
  section_id?: string;
  type: ThemeFieldType;
  label: string;
  hint?: string;
  max_length?: number;
  multiline?: boolean;
  nullable?: boolean;
};

export type ThemeSectionDocument = { id: string; type: string; type_version: number; settings: Record<string, unknown>; blocks: unknown[] };
export type ThemePageDocument = { id: string; kind: string; path?: string; title?: string | null; sections: ThemeSectionDocument[] };
export type ThemeDocument = {
  schema_version: number;
  model_id: string;
  model_version: string;
  global_settings: Record<string, unknown>;
  pages: ThemePageDocument[];
};

export type ThemeCapabilitySet = {
  view: boolean;
  guided_edit: boolean;
  change_model: boolean;
  publish: boolean;
  structure_edit: boolean;
  custom_pages: boolean;
  manage_history: boolean;
  preview: boolean;
};

export type ThemeState = {
  site_slug: string;
  site_enabled: boolean;
  lock_version: number;
  capabilities: ThemeCapabilitySet;
  model: { id: string; name: string; version: string };
  fields: ThemeField[];
  published: {
    document: ThemeDocument;
    fingerprint: string;
    revision_id: string | null;
    published_at: string | null;
    issues: Array<{ code: string; path: string; message: string }>;
  };
  draft: null | { revision_id: string; document: ThemeDocument; updated_at: string | null; updated_by: string | null };
};

export type ThemeRevisionItem = {
  revision_id: string;
  created_at: string | null;
  author: string | null;
  kind: 'draft' | 'restore';
  restored_from: string | null;
  model_id: string;
  is_draft: boolean;
  is_published: boolean;
};

export type ThemePreview = { preview_url: string; expires_at: string };
export type ThemeValues = Record<string, string>;
export type ThemeChange = { field: ThemeField; before: string; after: string };
export type ThemeErrorInfo = { code: string | null; message: string; status: number | null };

export type AppearanceApi = {
  getTheme: () => Promise<ThemeState>;
  saveThemeDraft: (data: { site_slug: string; lock_version: number; document: ThemeDocument }) => Promise<ThemeState>;
  discardThemeDraft: (data: { site_slug: string; lock_version: number }) => Promise<ThemeState>;
  publishTheme: (data: { site_slug: string; lock_version: number; revision_id: string; published_fingerprint: string }) => Promise<ThemeState>;
  createThemePreview: (data: { site_slug: string; source: 'draft' | 'published' }) => Promise<ThemePreview>;
};

export type AppearanceView = {
  status: 'loading' | 'ready' | 'error';
  state: ThemeState | null;
  base: ThemeValues;
  values: ThemeValues;
  busy: null | 'load' | 'save' | 'preview' | 'publish' | 'discard';
  error: ThemeErrorInfo | null;
  conflict: boolean;
  notice: string | null;
};

export const THEME_COLOR_SWATCHES: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Émeraude', value: '#047857' },
  { label: 'Bleu', value: '#2563EB' },
  { label: 'Noir premium', value: '#111827' },
  { label: 'Rose', value: '#DB2777' },
  { label: 'Orange', value: '#EA580C' },
  { label: 'Violet', value: '#7C3AED' },
];

export const APPEARANCE_MESSAGES = {
  loadError: "Impossible de charger l'apparence du site. Vérifiez votre connexion puis réessayez.",
  saveError: "Impossible d'enregistrer le brouillon. Vérifiez votre connexion puis réessayez.",
  previewError: "Impossible de préparer l'aperçu. Vérifiez votre connexion puis réessayez.",
  publishError: "Impossible de publier l'apparence du site. Vérifiez votre connexion puis réessayez.",
  discardError: "Impossible d'abandonner le brouillon. Vérifiez votre connexion puis réessayez.",
  draftSaved: "Brouillon enregistré. Le site public n'a pas changé.",
  published: 'Apparence publiée sur votre site.',
  publishedDisabled: "Apparence publiée. Le site reste désactivé tant que vous ne l'activez pas.",
  draftDiscarded: "Brouillon abandonné. Le site public n'a pas changé.",
  changesCancelled: 'Modifications annulées.',
  nothingToPublish: 'Aucune modification à publier.',
};

const CONFLICT_CODES = ['conflict', 'published_changed', 'draft_changed', 'site_changed'];

function findSection(document: ThemeDocument, field: ThemeField): ThemeSectionDocument | null {
  const page = document.pages.find((item) => item.id === field.page_id);
  return page?.sections.find((item) => item.id === field.section_id) || null;
}

function fieldSource(document: ThemeDocument, field: ThemeField): Record<string, unknown> | null {
  return field.scope === 'global' ? document.global_settings : findSection(document, field)?.settings || null;
}

// Une valeur absente, nulle ou vide s'affiche comme un champ vide.
export function readThemeValues(document: ThemeDocument, fields: ThemeField[]): ThemeValues {
  const values: ThemeValues = {};
  for (const field of fields) {
    const value = fieldSource(document, field)?.[field.key];
    values[field.id] = typeof value === 'string' ? value : '';
  }
  return values;
}

export function normalizeThemeValue(field: ThemeField, value: string): string | null {
  const text = (value || '').replace(/\r\n/g, '\n').trim();
  if (!text) return null;
  return field.type === 'color' ? text.toUpperCase() : text;
}

// Seuls les champs réellement modifiés changent : une valeur équivalente garde sa forme d'origine.
export function writeThemeValues(document: ThemeDocument, fields: ThemeField[], values: ThemeValues): ThemeDocument {
  const next: ThemeDocument = JSON.parse(JSON.stringify(document));
  const original = readThemeValues(document, fields);
  for (const field of fields) {
    if (!(field.id in values) || normalizeThemeValue(field, values[field.id]) === normalizeThemeValue(field, original[field.id])) continue;
    const target = fieldSource(next, field);
    if (target) target[field.key] = normalizeThemeValue(field, values[field.id]);
  }
  return next;
}

export function themeChanges(fields: ThemeField[], before: ThemeValues, after: ThemeValues): ThemeChange[] {
  return fields
    .map((field) => ({
      field,
      before: normalizeThemeValue(field, before[field.id] || '') || '',
      after: normalizeThemeValue(field, after[field.id] || '') || '',
    }))
    .filter((change) => change.before !== change.after);
}

function quote(value: string): string {
  if (!value) return '(vide)';
  const compact = value.replace(/\s+/g, ' ');
  return `« ${compact.length > 60 ? `${compact.slice(0, 57)}…` : compact} »`;
}

export function describeThemeChange(change: ThemeChange): string {
  return `${change.field.label} : ${quote(change.before)} → ${quote(change.after)}`;
}

// Après un conflit, la dernière version du serveur devient la base et les saisies locales sont conservées.
export function rebaseThemeValues(fields: ThemeField[], oldBase: ThemeValues, edited: ThemeValues, newBase: ThemeValues): ThemeValues {
  const result: ThemeValues = { ...newBase };
  for (const field of fields) {
    if ((edited[field.id] || '') !== (oldBase[field.id] || '')) result[field.id] = edited[field.id] || '';
  }
  return result;
}

export function parseThemeError(error: unknown, fallback: string): ThemeErrorInfo {
  const source = (error || {}) as { status?: unknown; message?: unknown };
  const status = typeof source.status === 'number' ? source.status : null;
  const raw = typeof source.message === 'string' ? source.message : '';
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.message === 'string') {
        return { code: typeof parsed.code === 'string' ? parsed.code : null, message: parsed.message, status };
      }
    } catch {
      // Message texte : il est affiché tel quel.
    }
  }
  return { code: null, message: raw || fallback, status };
}

export function isThemeConflict(info: ThemeErrorInfo | null): boolean {
  return !!info && (info.status === 409 || CONFLICT_CODES.includes(info.code || ''));
}

export function formatThemeDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} à ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function describeAppearanceStatus(view: AppearanceView): string {
  const state = view.state;
  if (!state) return '';
  if (themeChanges(state.fields, view.base, view.values).length) return 'Modifications non enregistrées.';
  if (state.draft) {
    const date = formatThemeDate(state.draft.updated_at);
    const author = state.draft.updated_by ? ` par ${state.draft.updated_by}` : '';
    return `Brouillon enregistré${date ? ` le ${date}` : ''}${author}. Il n'est pas encore publié.`;
  }
  return 'Aucune modification en attente : le formulaire affiche la version publiée.';
}

function editedDocument(state: ThemeState): ThemeDocument {
  return state.draft ? state.draft.document : state.published.document;
}

export function createAppearanceController(api: AppearanceApi, update: (view: AppearanceView) => void) {
  let disposed = false;
  let view: AppearanceView = { status: 'loading', state: null, base: {}, values: {}, busy: null, error: null, conflict: false, notice: null };

  const emit = (patch: Partial<AppearanceView>) => {
    if (disposed) return;
    view = { ...view, ...patch };
    update(view);
  };
  const accept = (state: ThemeState, values?: ThemeValues) => {
    const base = readThemeValues(editedDocument(state), state.fields);
    emit({ status: 'ready', state, base, values: values || base, error: null, conflict: false });
  };
  const fail = (error: unknown, fallback: string) => {
    const info = parseThemeError(error, fallback);
    emit({ busy: null, error: info, conflict: isThemeConflict(info), notice: null });
  };
  const isDirty = () => !!view.state && themeChanges(view.state.fields, view.base, view.values).length > 0;

  // Enregistre les saisies en brouillon si nécessaire et renvoie l'état serveur à jour.
  async function persist(): Promise<ThemeState | null> {
    const state = view.state;
    if (!state || !isDirty()) return state;
    const document = writeThemeValues(editedDocument(state), state.fields, view.values);
    const next = await api.saveThemeDraft({ site_slug: state.site_slug, lock_version: state.lock_version, document });
    accept(next);
    return disposed ? null : next;
  }

  async function load() {
    emit({ busy: 'load', error: null, notice: null });
    try {
      const state = await api.getTheme();
      accept(state);
      emit({ busy: null });
    } catch (error) {
      const info = parseThemeError(error, APPEARANCE_MESSAGES.loadError);
      emit({ status: view.state ? 'ready' : 'error', busy: null, error: info, conflict: false });
    }
  }

  async function reload() {
    if (view.busy) return;
    const previous = view;
    emit({ busy: 'load', notice: null });
    try {
      const state = await api.getTheme();
      const base = readThemeValues(editedDocument(state), state.fields);
      accept(state, previous.state ? rebaseThemeValues(state.fields, previous.base, previous.values, base) : base);
      emit({ busy: null });
    } catch (error) {
      fail(error, APPEARANCE_MESSAGES.loadError);
    }
  }

  function setValue(id: string, value: string) {
    emit({ values: { ...view.values, [id]: value }, notice: null, error: view.conflict ? view.error : null });
  }

  async function saveDraft() {
    if (view.busy || !view.state) return;
    emit({ busy: 'save', error: null, notice: null });
    try {
      await persist();
      emit({ busy: null, notice: APPEARANCE_MESSAGES.draftSaved });
    } catch (error) {
      fail(error, APPEARANCE_MESSAGES.saveError);
    }
  }

  async function preview(): Promise<string | null> {
    if (view.busy || !view.state) return null;
    emit({ busy: 'preview', error: null, notice: null });
    try {
      const state = await persist();
      if (!state) return null;
      const result = await api.createThemePreview({ site_slug: state.site_slug, source: state.draft ? 'draft' : 'published' });
      emit({ busy: null });
      return disposed ? null : result.preview_url;
    } catch (error) {
      fail(error, APPEARANCE_MESSAGES.previewError);
      return null;
    }
  }

  // Différences entre la version publiée et le formulaire, à confirmer avant publication.
  function pendingChanges(): ThemeChange[] {
    const state = view.state;
    if (!state) return [];
    return themeChanges(state.fields, readThemeValues(state.published.document, state.fields), view.values);
  }

  async function publish(): Promise<boolean> {
    if (view.busy || !view.state) return false;
    emit({ busy: 'publish', error: null, notice: null });
    try {
      const state = await persist();
      if (!state) return false;
      if (!state.draft) {
        emit({ busy: null, notice: APPEARANCE_MESSAGES.nothingToPublish });
        return false;
      }
      const next = await api.publishTheme({
        site_slug: state.site_slug,
        lock_version: state.lock_version,
        revision_id: state.draft.revision_id,
        published_fingerprint: state.published.fingerprint,
      });
      accept(next);
      emit({ busy: null, notice: next.site_enabled ? APPEARANCE_MESSAGES.published : APPEARANCE_MESSAGES.publishedDisabled });
      return !disposed;
    } catch (error) {
      fail(error, APPEARANCE_MESSAGES.publishError);
      return false;
    }
  }

  async function discard() {
    const state = view.state;
    if (view.busy || !state) return;
    if (!state.draft) {
      emit({ values: view.base, error: null, conflict: false, notice: APPEARANCE_MESSAGES.changesCancelled });
      return;
    }
    emit({ busy: 'discard', error: null, notice: null });
    try {
      const next = await api.discardThemeDraft({ site_slug: state.site_slug, lock_version: state.lock_version });
      accept(next);
      emit({ busy: null, notice: APPEARANCE_MESSAGES.draftDiscarded });
    } catch (error) {
      fail(error, APPEARANCE_MESSAGES.discardError);
    }
  }

  return {
    load,
    reload,
    setValue,
    saveDraft,
    preview,
    publish,
    discard,
    pendingChanges,
    isDirty,
    applyServerState: (state: ThemeState) => accept(state),
    getView: () => view,
    dispose: () => { disposed = true; },
  };
}
