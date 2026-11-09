// Opérations de structure de l'éditeur visuel Enterprise. Le registre partagé décrit les sections,
// blocs et réglages autorisés ; le serveur revalide tout document enregistré.
import contract from './ecommerceThemeContract.json';
import type { ThemeDocument, ThemeField, ThemePageDocument, ThemeSectionDocument } from './ecommerceAppearance';

type Spec = { type: string; label?: string; hint?: string; max_length?: number; multiline?: boolean; nullable?: boolean; media_kind?: 'logo' | 'image'; values?: string[]; labels?: Record<string, string>; min?: number; max?: number; source?: string; group?: string };
type SectionSpec = { type_version: number; label?: string; settings: Record<string, Spec>; blocks: Record<string, { type_version: number; label?: string; settings: Record<string, Spec> }> };
type BlockDocument = { id: string; type: string; type_version: number; settings: Record<string, unknown> };

const REGISTRY = contract as unknown as {
    limits: { max_pages: number; max_sections_per_page: number; max_blocks_per_section: number; max_id_length: number; max_path_length: number; max_header_pages: number };
    reserved_paths: string[];
    global_groups: Record<string, string>;
    global_settings: Record<string, Spec>;
    sections: Record<string, SectionSpec>;
    models: Record<string, { structure_editable?: boolean; custom_pages?: boolean; pages: Array<{ kind: string; sections: Array<{ type: string; required?: boolean }> }> }>;
};

export const PAGE_LABELS: Record<string, string> = { home: 'Accueil', catalog: 'Catalogue', contact: 'Contact' };
// Même borne que le serveur pour le titre d'une page.
export const PAGE_TITLE_MAX_LENGTH = 120;
export const MAX_PATH_LENGTH = REGISTRY.limits.max_path_length;
export const MAX_HEADER_PAGES = REGISTRY.limits.max_header_pages;

export type PageMenu = 'header' | 'footer' | 'hidden';
export const PAGE_MENUS: Array<{ value: PageMenu; label: string }> = [
    { value: 'header', label: 'Menu principal et pied de page' },
    { value: 'footer', label: 'Pied de page uniquement' },
    { value: 'hidden', label: 'Lien direct uniquement' },
];
const PATH_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Description courte de chaque section, affichée dans la liste « Ajouter une section ».
export const SECTION_DESCRIPTIONS: Record<string, string> = {
    hero: "Grand titre d'accueil, avec ou sans photo, et un bouton.",
    'category-list': 'Vos catégories en vignettes illustrées ou en pastilles.',
    'product-grid': 'Une sélection de vos produits, triée comme vous le souhaitez.',
    'featured-collection': "Les produits d'une catégorie choisie, avec un lien vers elle.",
    'image-banner': 'Une grande image avec un message et un bouton.',
    'image-with-text': 'Une image à côté de votre texte : histoire, savoir-faire, service.',
    'rich-text': 'Un texte libre : présentation, engagement, informations.',
    features: 'Vos points forts en quelques cartes avec icônes.',
    faq: 'Les réponses aux questions que vos clients posent souvent.',
    marquee: 'Un bandeau de messages courts qui défile.',
    'image-gallery': 'Plusieurs photos en grille ou en mosaïque.',
    testimonials: "Les avis réels de vos clients, avec leur accord.",
    contact: 'Vos coordonnées et un formulaire de contact.',
    catalog: 'Le catalogue complet avec recherche et filtres.',
};

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

export function isStructureEditable(modelId: string) {
    return !!REGISTRY.models[modelId]?.structure_editable;
}

export function sectionLabel(type: string) {
    return REGISTRY.sections[type]?.label || type;
}

// Sections que l'on peut ajouter : tout le registre, sauf la vitrine historique de Basic.
export function addableSections() {
    return Object.entries(REGISTRY.sections)
        .filter(([type]) => type !== 'legacy-storefront')
        .map(([type, spec]) => ({ type, label: spec.label || type, description: SECTION_DESCRIPTIONS[type] || '' }));
}

export function blockTypes(sectionType: string) {
    return Object.entries(REGISTRY.sections[sectionType]?.blocks || {}).map(([type, spec]) => ({ type, label: spec.label || type }));
}

function documentIds(document: ThemeDocument) {
    const ids = new Set<string>();
    for (const page of document.pages) {
        ids.add(page.id);
        for (const section of page.sections) {
            ids.add(section.id);
            for (const block of section.blocks as BlockDocument[]) ids.add(block.id);
        }
    }
    return ids;
}

export function uniqueId(document: ThemeDocument, prefix: string) {
    const ids = documentIds(document);
    const base = prefix.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+/, '').slice(0, REGISTRY.limits.max_id_length - 4) || 'section';
    let index = 1;
    while (ids.has(`${base}-${index}`)) index += 1;
    return `${base}-${index}`;
}

function findPage(document: ThemeDocument, pageId: string): ThemePageDocument {
    const page = document.pages.find((item) => item.id === pageId);
    if (!page) throw new Error(`Page inconnue : ${pageId}`);
    return page;
}

// --- Pages personnalisées ---------------------------------------------------

export function pageLabel(page: ThemePageDocument) {
    return PAGE_LABELS[page.kind] || page.title?.trim() || 'Page sans titre';
}

export function pageMenu(page: ThemePageDocument): PageMenu {
    return page.menu === 'header' || page.menu === 'hidden' ? page.menu : 'footer';
}

export function canAddCustomPage(document: ThemeDocument) {
    return !!REGISTRY.models[document.model_id]?.custom_pages && document.pages.length < REGISTRY.limits.max_pages;
}

// Adresse lisible tirée d'un texte : minuscules sans accents, mots séparés par des tirets.
// Pendant la saisie (« strict » à false), un tiret ou une barre finale reste possible.
export function slugifyPath(text: string, strict = true): string {
    let value = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss')
        .replace(/[^a-z0-9/]+/g, '-').replace(/-{2,}/g, '-').replace(/\/{2,}/g, '/')
        .replace(/(^|\/)-+/g, '$1').replace(/^\/+/, '');
    if (strict) value = value.split('/').map((segment) => segment.replace(/-+$/, '')).filter(Boolean).join('/');
    value = value.slice(0, MAX_PATH_LENGTH);
    return strict ? value.replace(/[-/]+$/, '') : value;
}

// Mêmes règles que le serveur ; le message explique comment corriger l'adresse.
export function pathProblem(document: ThemeDocument, pageId: string, path: string): string | null {
    if (!path) return 'Indiquez une adresse pour la page.';
    if (path.length > MAX_PATH_LENGTH) return `L'adresse est limitée à ${MAX_PATH_LENGTH} caractères.`;
    const segments = path.split('/');
    if (!segments.every((segment) => PATH_SEGMENT.test(segment))) return 'Utilisez des lettres minuscules sans accent, des chiffres et des tirets.';
    if (REGISTRY.reserved_paths.includes(segments[0])) return 'Cette adresse est réservée par Stockman. Choisissez-en une autre.';
    if (document.pages.some((item) => item.id !== pageId && item.kind === 'custom' && item.path === path)) return 'Une autre page utilise déjà cette adresse.';
    return null;
}

// Premier problème qui empêcherait l'enregistrement des pages personnalisées, s'il y en a un.
export function customPageProblem(document: ThemeDocument): { pageId: string; message: string } | null {
    const custom = document.pages.filter((page) => page.kind === 'custom');
    for (const page of custom) {
        if (!page.title?.trim()) return { pageId: page.id, message: 'Donnez un titre à chaque page personnalisée.' };
        const problem = pathProblem(document, page.id, page.path || '');
        if (problem) return { pageId: page.id, message: `${page.title.trim()} : ${problem}` };
    }
    const header = custom.filter((page) => page.menu === 'header');
    if (header.length > MAX_HEADER_PAGES) return { pageId: header[MAX_HEADER_PAGES].id, message: `Le menu principal accueille au plus ${MAX_HEADER_PAGES} pages personnalisées.` };
    return null;
}

// Le menu principal peut-il encore accueillir cette page ?
export function canUseHeaderMenu(document: ThemeDocument, pageId: string) {
    const others = document.pages.filter((page) => page.kind === 'custom' && page.id !== pageId && page.menu === 'header').length;
    return others < MAX_HEADER_PAGES;
}

// Adresse qui sera donnée à une nouvelle page portant ce titre : libre et non réservée.
export function proposedPath(document: ThemeDocument, title: string) {
    return freePath(document, slugifyPath(title));
}

function freePath(document: ThemeDocument, wanted: string) {
    let base = wanted || 'page';
    if (REGISTRY.reserved_paths.includes(base.split('/')[0])) base = `page-${base}`;
    let candidate = base.slice(0, MAX_PATH_LENGTH);
    for (let index = 2; document.pages.some((page) => page.kind === 'custom' && page.path === candidate); index += 1) {
        const suffix = `-${index}`;
        candidate = `${base.slice(0, MAX_PATH_LENGTH - suffix.length).replace(/[-/]+$/, '')}${suffix}`;
    }
    return candidate;
}

// Nouvelle page : son adresse vient du titre et un bloc de texte reprend ce titre, rien d'autre.
export function addCustomPage(document: ThemeDocument, title: string): { document: ThemeDocument; id: string } {
    const clean = title.replace(/\s+/g, ' ').trim().slice(0, PAGE_TITLE_MAX_LENGTH);
    if (!clean) throw new Error('Donnez un titre à la page.');
    if (!canAddCustomPage(document)) throw new Error('Le site compte déjà le nombre maximal de pages.');
    const next = clone(document);
    const id = uniqueId(next, 'page');
    const page: ThemePageDocument = { id, kind: 'custom', path: proposedPath(next, clean), title: clean, menu: 'footer', sections: [] };
    next.pages.push(page);
    const spec = REGISTRY.sections['rich-text'];
    if (spec) {
        page.sections.push({ id: uniqueId(next, 'rich-text'), type: 'rich-text', type_version: spec.type_version, settings: { heading: clean.slice(0, spec.settings.heading?.max_length || clean.length) }, blocks: [] });
    }
    return { document: next, id };
}

export function updateCustomPage(document: ThemeDocument, pageId: string, patch: { title?: string; path?: string; menu?: PageMenu }): ThemeDocument {
    const current = findPage(document, pageId);
    if (current.kind !== 'custom') return document;
    const next = clone(document);
    const page = findPage(next, pageId);
    if (patch.title !== undefined) page.title = patch.title.replace(/[\r\n]+/g, ' ').slice(0, PAGE_TITLE_MAX_LENGTH);
    if (patch.path !== undefined) page.path = patch.path.slice(0, MAX_PATH_LENGTH);
    if (patch.menu !== undefined) page.menu = patch.menu;
    return next;
}

export function removeCustomPage(document: ThemeDocument, pageId: string): ThemeDocument {
    if (document.pages.find((page) => page.id === pageId)?.kind !== 'custom') return document;
    const next = clone(document);
    next.pages = next.pages.filter((page) => page.id !== pageId);
    return next;
}

// Une section indispensable du modèle (catalogue, contact) ne peut ni disparaître de sa page ni
// être masquée : il en reste toujours une visible. Une copie masquée de ce type reste supprimable.
export function isRequiredSection(document: ThemeDocument, pageId: string, sectionId: string) {
    const page = findPage(document, pageId);
    const section = page.sections.find((item) => item.id === sectionId);
    if (!section) return false;
    const template = REGISTRY.models[document.model_id]?.pages.find((item) => item.kind === page.kind);
    const required = template?.sections.some((item) => item.type === section.type && item.required);
    if (!required) return false;
    const sameType = page.sections.filter((item) => item.type === section.type);
    const visible = sameType.filter((item) => !item.hidden);
    return sameType.length === 1 || (!section.hidden && visible.length === 1);
}

// Section masquée : gardée avec ses réglages dans l'éditeur, absente du site public.
export function setSectionHidden(document: ThemeDocument, pageId: string, sectionId: string, hidden: boolean): ThemeDocument {
    const current = findPage(document, pageId).sections.find((item) => item.id === sectionId);
    if (!current || !!current.hidden === hidden || (hidden && isRequiredSection(document, pageId, sectionId))) return document;
    const next = clone(document);
    const section = findPage(next, pageId).sections.find((item) => item.id === sectionId) as ThemeSectionDocument;
    // Le serveur n'accepte que true : une section visible n'a pas la propriété.
    if (hidden) section.hidden = true; else delete section.hidden;
    return next;
}

export function canAddSection(document: ThemeDocument, pageId: string) {
    return findPage(document, pageId).sections.length < REGISTRY.limits.max_sections_per_page;
}

export function addSection(document: ThemeDocument, pageId: string, type: string, index?: number): { document: ThemeDocument; id: string } {
    const spec = REGISTRY.sections[type];
    if (!spec || type === 'legacy-storefront') throw new Error(`Section non autorisée : ${type}`);
    const next = clone(document);
    const page = findPage(next, pageId);
    if (!canAddSection(next, pageId)) throw new Error('Nombre maximal de sections atteint');
    const id = uniqueId(next, type);
    const section: ThemeSectionDocument = { id, type, type_version: spec.type_version, settings: {}, blocks: [] };
    page.sections.splice(index === undefined ? page.sections.length : index, 0, section);
    return { document: next, id };
}

export function moveSection(document: ThemeDocument, pageId: string, sectionId: string, delta: number): ThemeDocument {
    const next = clone(document);
    const sections = findPage(next, pageId).sections;
    const from = sections.findIndex((item) => item.id === sectionId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= sections.length) return document;
    const [moved] = sections.splice(from, 1);
    sections.splice(to, 0, moved);
    return next;
}

// Glisser-déposer : la section prend la place « index » de la liste (bornée), les autres suivent.
export function moveSectionTo(document: ThemeDocument, pageId: string, sectionId: string, index: number): ThemeDocument {
    const from = findPage(document, pageId).sections.findIndex((item) => item.id === sectionId);
    return from < 0 ? document : moveSection(document, pageId, sectionId, Math.max(0, Math.min(index, findPage(document, pageId).sections.length - 1)) - from);
}

export function removeSection(document: ThemeDocument, pageId: string, sectionId: string): ThemeDocument {
    if (isRequiredSection(document, pageId, sectionId)) return document;
    const next = clone(document);
    const page = findPage(next, pageId);
    page.sections = page.sections.filter((item) => item.id !== sectionId);
    return next;
}

function findSection(document: ThemeDocument, pageId: string, sectionId: string) {
    const section = findPage(document, pageId).sections.find((item) => item.id === sectionId);
    if (!section) throw new Error(`Section inconnue : ${sectionId}`);
    return section;
}

export function addBlock(document: ThemeDocument, pageId: string, sectionId: string, type: string): ThemeDocument {
    const next = clone(document);
    const section = findSection(next, pageId, sectionId);
    const spec = REGISTRY.sections[section.type]?.blocks[type];
    const blocks = section.blocks as BlockDocument[];
    if (!spec || blocks.length >= REGISTRY.limits.max_blocks_per_section) return document;
    blocks.push({ id: uniqueId(next, type), type, type_version: spec.type_version, settings: {} });
    return next;
}

export function moveBlock(document: ThemeDocument, pageId: string, sectionId: string, blockId: string, delta: number): ThemeDocument {
    const next = clone(document);
    const blocks = findSection(next, pageId, sectionId).blocks as BlockDocument[];
    const from = blocks.findIndex((item) => item.id === blockId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= blocks.length) return document;
    const [moved] = blocks.splice(from, 1);
    blocks.splice(to, 0, moved);
    return next;
}

export function moveBlockTo(document: ThemeDocument, pageId: string, sectionId: string, blockId: string, index: number): ThemeDocument {
    const blocks = findSection(document, pageId, sectionId).blocks as BlockDocument[];
    const from = blocks.findIndex((item) => item.id === blockId);
    return from < 0 ? document : moveBlock(document, pageId, sectionId, blockId, Math.max(0, Math.min(index, blocks.length - 1)) - from);
}

// Nom d'un bloc dans la liste de l'éditeur : son type et son rang, suivis de son premier texte s'il en a un.
export function blockSummary(sectionType: string, block: { type: string; settings: Record<string, unknown> }, index: number) {
    const spec = REGISTRY.sections[sectionType]?.blocks[block.type];
    const label = `${spec?.label || 'Élément'} ${index + 1}`;
    const text = Object.entries(spec?.settings || {})
        .filter(([, setting]) => setting.type === 'text')
        .map(([key]) => block.settings[key])
        .find((value): value is string => typeof value === 'string' && value.trim() !== '');
    return { label, text: text ? text.trim() : null };
}

export function removeBlock(document: ThemeDocument, pageId: string, sectionId: string, blockId: string): ThemeDocument {
    const next = clone(document);
    const section = findSection(next, pageId, sectionId);
    section.blocks = (section.blocks as BlockDocument[]).filter((item) => item.id !== blockId);
    return next;
}

function toField(spec: Spec, base: Omit<ThemeField, 'type' | 'label'>): ThemeField {
    return {
        ...base,
        type: spec.type as ThemeField['type'],
        label: spec.label || base.key,
        hint: spec.hint,
        max_length: spec.max_length,
        multiline: spec.multiline,
        nullable: spec.nullable,
        media_kind: spec.media_kind,
        min: spec.min,
        max: spec.max,
        source: spec.source,
        options: spec.values?.map((value) => ({ value, label: spec.labels?.[value] || value })),
    };
}

// Réglages communs à tout le site (identité, style, en-tête, pied de page), dans l'ordre du registre.
export function globalFields(): ThemeField[] {
    return Object.entries(REGISTRY.global_settings).map(([key, spec]) => {
        const group = spec.group || 'style';
        return { ...toField(spec, { id: `global.${key}`, scope: 'global', key }), group, group_label: REGISTRY.global_groups[group] || 'Réglages' };
    });
}

// Enterprise règle tous les paramètres d'une section, pas seulement les points guidés.
export function sectionFields(document: ThemeDocument, pageId: string, sectionId: string): ThemeField[] {
    const section = findSection(document, pageId, sectionId);
    const spec = REGISTRY.sections[section.type];
    if (!spec) return [];
    const fields = Object.entries(spec.settings).map(([key, setting]) => toField(setting, { id: `${pageId}.${sectionId}.${key}`, scope: 'section', page_id: pageId, section_id: sectionId, key }));
    (section.blocks as BlockDocument[]).forEach((block, index) => {
        const blockSpec = spec.blocks[block.type];
        if (!blockSpec) return;
        for (const [key, setting] of Object.entries(blockSpec.settings)) {
            const field = toField(setting, { id: `${pageId}.${sectionId}.${block.id}.${key}`, scope: 'block', page_id: pageId, section_id: sectionId, block_id: block.id, key });
            fields.push({ ...field, group: block.id, group_label: `${blockSpec.label || 'Élément'} ${index + 1}` });
        }
    });
    return fields;
}
