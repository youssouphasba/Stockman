// Opérations de structure de l'éditeur visuel Enterprise. Le registre partagé décrit les sections,
// blocs et réglages autorisés ; le serveur revalide tout document enregistré.
import contract from './ecommerceThemeContract.json';
import type { ThemeDocument, ThemeField, ThemePageDocument, ThemeSectionDocument } from './ecommerceAppearance';

type Spec = { type: string; label?: string; hint?: string; max_length?: number; multiline?: boolean; nullable?: boolean; media_kind?: 'logo' | 'image'; values?: string[]; labels?: Record<string, string>; min?: number; max?: number };
type SectionSpec = { type_version: number; label?: string; settings: Record<string, Spec>; blocks: Record<string, { type_version: number; label?: string; settings: Record<string, Spec> }> };
type BlockDocument = { id: string; type: string; type_version: number; settings: Record<string, unknown> };

const REGISTRY = contract as unknown as {
    limits: { max_sections_per_page: number; max_blocks_per_section: number; max_id_length: number };
    sections: Record<string, SectionSpec>;
    models: Record<string, { structure_editable?: boolean; pages: Array<{ kind: string; sections: Array<{ type: string; required?: boolean }> }> }>;
};

export const PAGE_LABELS: Record<string, string> = { home: 'Accueil', catalog: 'Catalogue', contact: 'Contact' };

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
        .map(([type, spec]) => ({ type, label: spec.label || type }));
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

// Une section indispensable du modèle (catalogue, contact) ne peut pas disparaître de sa page.
export function isRequiredSection(document: ThemeDocument, pageId: string, sectionId: string) {
    const page = findPage(document, pageId);
    const section = page.sections.find((item) => item.id === sectionId);
    if (!section) return false;
    const template = REGISTRY.models[document.model_id]?.pages.find((item) => item.kind === page.kind);
    const required = template?.sections.some((item) => item.type === section.type && item.required);
    return !!required && page.sections.filter((item) => item.type === section.type).length === 1;
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
        options: spec.values?.map((value) => ({ value, label: spec.labels?.[value] || value })),
    };
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
