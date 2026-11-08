// Ce fichier existe en deux copies identiques : frontend/utils/ecommerceAppearance.ts (mobile)
// et web-app/src/lib/ecommerceAppearance.ts (web). Le test ecommerce-appearance.test.cjs vérifie leur parité.
// Le serveur reste l'autorité : ce module prépare l'affichage et le document envoyé, sans décider des droits.

export type ThemeFieldType = 'text' | 'color' | 'media_id' | 'enum' | 'boolean' | 'integer';

export type ThemeField = {
  id: string;
  scope: 'global' | 'section' | 'block';
  key: string;
  page_id?: string;
  section_id?: string;
  block_id?: string;
  group?: string;
  group_label?: string;
  type: ThemeFieldType;
  label: string;
  hint?: string;
  max_length?: number;
  multiline?: boolean;
  nullable?: boolean;
  media_kind?: 'logo' | 'image';
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  // « categories » : la valeur se choisit parmi les catégories réelles du catalogue.
  source?: string;
};

// Style prêt à l'emploi : ambiance, typographie, forme et animations, jamais la couleur de marque.
export type ThemePreset = { id: string; label: string; settings: Record<string, string> };

export type ThemeModelSummary = { id: string; name: string; description: string; published: boolean; draft: boolean };
export type ThemeFieldGroup = { id: string; label: string; fields: ThemeField[] };

export type ThemeMediaItem = {
  media_id: string;
  kind: 'logo' | 'image';
  alt: string;
  width: number;
  height: number;
  has_alpha: boolean;
  urls: Record<string, string>;
  thumbnail_url: string | null;
  created_at: string | null;
  in_use: boolean;
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
  models: ThemeModelSummary[];
  fields: ThemeField[];
  presets?: ThemePreset[];
  categories?: string[];
  published: {
    model_id: string;
    document: ThemeDocument;
    fingerprint: string;
    revision_id: string | null;
    published_at: string | null;
    issues: Array<{ code: string; path: string; message: string }>;
  };
  draft: null | { revision_id: string; document: ThemeDocument; updated_at: string | null; updated_by: string | null };
  media: Record<string, ThemeMediaItem>;
};

export type ThemeRevisionItem = {
  revision_id: string;
  created_at: string | null;
  author: string | null;
  kind: 'draft' | 'restore' | 'model' | 'settings';
  restored_from: string | null;
  model_id: string;
  model_name?: string | null;
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
  createThemePreview: (data: { site_slug: string; source: 'draft' | 'published' | 'model'; model_id?: string }) => Promise<ThemePreview>;
  changeThemeModel: (data: { site_slug: string; lock_version: number; model_id: string }) => Promise<ThemeState>;
};

export type AppearanceView = {
  status: 'loading' | 'ready' | 'error';
  state: ThemeState | null;
  base: ThemeValues;
  values: ThemeValues;
  busy: null | 'load' | 'save' | 'preview' | 'publish' | 'discard' | 'model';
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
  modelError: "Impossible de changer de modèle. Vérifiez votre connexion puis réessayez.",
};

const CONFLICT_CODES = ['conflict', 'published_changed', 'draft_changed', 'site_changed'];

function findSection(document: ThemeDocument, field: ThemeField): ThemeSectionDocument | null {
  const page = document.pages.find((item) => item.id === field.page_id);
  return page?.sections.find((item) => item.id === field.section_id) || null;
}

function fieldSource(document: ThemeDocument, field: ThemeField): Record<string, unknown> | null {
  if (field.scope === 'global') return document.global_settings;
  const section = findSection(document, field);
  if (field.scope === 'block') {
    const block = (section?.blocks as Array<{ id?: string; settings?: Record<string, unknown> }> | undefined)?.find((item) => item?.id === field.block_id);
    return block?.settings || null;
  }
  return section?.settings || null;
}

// Les valeurs du formulaire sont des textes ; une valeur absente ou nulle s'affiche comme un champ vide.
export function readThemeValues(document: ThemeDocument, fields: ThemeField[]): ThemeValues {
  const values: ThemeValues = {};
  for (const field of fields) {
    const value = fieldSource(document, field)?.[field.key];
    values[field.id] = typeof value === 'string' ? value : typeof value === 'boolean' || typeof value === 'number' ? String(value) : '';
  }
  return values;
}

export type ThemeTypedValue = string | number | boolean | null;

export function normalizeThemeValue(field: ThemeField, value: string): ThemeTypedValue {
  const text = (value || '').replace(/\r\n/g, '\n').trim();
  if (!text) return null;
  if (field.type === 'color') return text.toUpperCase();
  if (field.type === 'boolean') return text === 'true' ? true : text === 'false' ? false : null;
  if (field.type === 'integer') {
    const number = Number(text);
    if (!Number.isInteger(number)) return null;
    return Math.min(field.max ?? number, Math.max(field.min ?? number, number));
  }
  if (field.type === 'enum') return field.options?.some((option) => option.value === text) ? text : null;
  return text;
}

// Message d'erreur affiché si l'envoi d'une image échoue sans explication du serveur.
export const MEDIA_UPLOAD_ERROR = "Impossible d'importer cette image. Vérifiez votre connexion puis réessayez.";

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
  const display = (field: ThemeField, value: string) => {
    const normalized = normalizeThemeValue(field, value || '');
    return normalized === null ? '' : String(normalized);
  };
  return fields
    .map((field) => ({ field, before: display(field, before[field.id] || ''), after: display(field, after[field.id] || '') }))
    .filter((change) => change.before !== change.after);
}

// Les rubriques suivent l'ordre du serveur : identité, style, en-tête, pied de page, puis les sections.
export function groupThemeFields(fields: ThemeField[]): ThemeFieldGroup[] {
  const groups: ThemeFieldGroup[] = [];
  for (const field of fields) {
    const id = field.group || 'fields';
    let group = groups.find((item) => item.id === id);
    if (!group) {
      group = { id, label: field.group_label || 'Réglages', fields: [] };
      groups.push(group);
    }
    group.fields.push(field);
  }
  return groups;
}

// Applique un style prêt à l'emploi aux réglages globaux présents dans le formulaire. Les textes,
// les images et la couleur de marque ne changent jamais.
export function applyThemePreset(fields: ThemeField[], values: ThemeValues, preset: ThemePreset): ThemeValues {
  const next = { ...values };
  for (const [key, value] of Object.entries(preset.settings || {})) {
    const field = fields.find((item) => item.scope === 'global' && item.key === key);
    if (!field || key === 'brand_color' || typeof value !== 'string') continue;
    if (field.type === 'enum' && !field.options?.some((option) => option.value === value)) continue;
    next[field.id] = value;
  }
  return next;
}

// Style prêt à l'emploi correspondant exactement aux réglages actuels, s'il y en a un.
export function activeThemePreset(fields: ThemeField[], values: ThemeValues, presets: ThemePreset[] | undefined): string | null {
  for (const preset of presets || []) {
    const entries = Object.entries(preset.settings || {}).filter(([key]) => key !== 'brand_color' && fields.some((field) => field.scope === 'global' && field.key === key));
    if (entries.length && entries.every(([key, value]) => values[`global.${key}`] === value)) return preset.id;
  }
  return null;
}

// Couleur personnalisée saisie librement : « 1a2b3c », « #1A2B3C » ou « #abc » deviennent « #1A2B3C ».
export function normalizeHexColor(input: string): string | null {
  const raw = (input || '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) return `#${raw.split('').map((char) => char + char).join('')}`.toUpperCase();
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw}`.toUpperCase();
  return null;
}

const SCHEME_BACKGROUNDS: Record<string, string> = { light: '#FFFFFF', cream: '#FBF8F3', dark: '#0F1217' };

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const value = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((value >> 16) & 255) + 0.7152 * channel((value >> 8) & 255) + 0.0722 * channel(value & 255);
}

export function contrastRatio(first: string, second: string) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

// Correction proposée, jamais imposée : la couleur de marque enregistrée n'est pas remplacée.
export function brandContrastWarning(values: ThemeValues): string | null {
  const color = (values['global.brand_color'] || '').toUpperCase();
  const scheme = values['global.color_scheme'] || 'light';
  const background = SCHEME_BACKGROUNDS[scheme];
  if (!/^#[0-9A-F]{6}$/.test(color) || !background || contrastRatio(color, background) >= 3) return null;
  return "Votre couleur de marque se distingue peu du fond de cette ambiance. Les boutons recevront un contour pour rester visibles ; vous pouvez aussi choisir une couleur plus contrastée.";
}

function quote(value: string): string {
  if (!value) return '(vide)';
  const compact = value.replace(/\s+/g, ' ');
  return `« ${compact.length > 60 ? `${compact.slice(0, 57)}…` : compact} »`;
}

export function describeThemeChange(change: ThemeChange): string {
  const field = change.field;
  if (field.type === 'media_id') {
    const action = !change.before ? 'nouvelle image' : !change.after ? 'image retirée' : 'image remplacée';
    return `${field.label} : ${action}`;
  }
  if (field.type === 'boolean') {
    return `${field.label} : ${change.after === 'true' ? 'activé' : change.after === 'false' ? 'désactivé' : 'valeur par défaut'}`;
  }
  if (field.type === 'enum') {
    const label = (value: string) => field.options?.find((option) => option.value === value)?.label || value;
    return `${field.label} : ${change.before ? label(change.before) : '(par défaut)'} → ${change.after ? label(change.after) : '(par défaut)'}`;
  }
  if (field.type === 'integer') return `${field.label} : ${change.before || '(par défaut)'} → ${change.after || '(par défaut)'}`;
  return `${field.label} : ${quote(change.before)} → ${quote(change.after)}`;
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

  function applyPreset(presetId: string) {
    const state = view.state;
    const preset = state?.presets?.find((item) => item.id === presetId);
    if (!state || !preset) return;
    emit({ values: applyThemePreset(state.fields, view.values, preset), notice: null, error: view.conflict ? view.error : null });
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

  async function changeModel(modelId: string): Promise<boolean> {
    const state = view.state;
    if (view.busy || !state) return false;
    emit({ busy: 'model', error: null, notice: null });
    try {
      const next = await api.changeThemeModel({ site_slug: state.site_slug, lock_version: state.lock_version, model_id: modelId });
      accept(next);
      const name = next.models.find((model) => model.id === modelId)?.name || next.model.name;
      emit({ busy: null, notice: `Brouillon créé avec le modèle ${name}. Vérifiez-le dans l'aperçu avant de le publier.` });
      return !disposed;
    } catch (error) {
      fail(error, APPEARANCE_MESSAGES.modelError);
      return false;
    }
  }

  async function previewModel(modelId: string): Promise<string | null> {
    const state = view.state;
    if (view.busy || !state) return null;
    emit({ busy: 'preview', error: null, notice: null });
    try {
      const result = await api.createThemePreview({ site_slug: state.site_slug, source: 'model', model_id: modelId });
      emit({ busy: null });
      return disposed ? null : result.preview_url;
    } catch (error) {
      fail(error, APPEARANCE_MESSAGES.previewError);
      return null;
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
    applyPreset,
    saveDraft,
    preview,
    publish,
    discard,
    changeModel,
    previewModel,
    pendingChanges,
    isDirty,
    applyServerState: (state: ThemeState) => accept(state),
    getView: () => view,
    dispose: () => { disposed = true; },
  };
}
