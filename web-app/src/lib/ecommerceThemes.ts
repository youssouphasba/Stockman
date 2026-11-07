// Contrat partagé avec le serveur : web-app/src/lib/ecommerceThemeContract.json est une copie
// identique de backend/ecommerce_theme_contract.json (parité vérifiée par les tests).
// Le serveur Python reste l'autorité de validation ; ces types servent l'affichage et les futurs éditeurs.
import contract from './ecommerceThemeContract.json';

export type ThemeFieldSpec = {
  type: 'text' | 'color' | 'media_id' | 'boolean' | 'enum' | 'integer';
  nullable?: boolean;
  required?: boolean;
  max_length?: number;
  multiline?: boolean;
  values?: string[];
  min?: number;
  max?: number;
};

export type ThemeBlock = { id: string; type: string; type_version: number; settings: Record<string, unknown> };
export type ThemeSection = { id: string; type: string; type_version: number; settings: Record<string, unknown>; blocks: ThemeBlock[] };
export type ThemePageKind = 'home' | 'catalog' | 'contact' | 'custom';
export type ThemePage = { id: string; kind: ThemePageKind; path?: string; title?: string | null; sections: ThemeSection[] };
export type ThemeDocument = {
  schema_version: number;
  model_id: string;
  model_version: string;
  global_settings: { brand_color?: string | null; logo_asset_id?: string | null };
  pages: ThemePage[];
};

export type ThemeCapabilities = {
  view: boolean;
  guided_edit: boolean;
  change_model: boolean;
  publish: boolean;
  structure_edit: boolean;
  custom_pages: boolean;
  manage_history: boolean;
};

export type EcommerceModel = Readonly<{ id: string; name: string; version: string; schemaVersion: number }>;

export const THEME_CONTRACT = contract;
export const THEME_SCHEMA_VERSION = contract.schema_version;

export const ECOMMERCE_MODELS: Readonly<Record<string, EcommerceModel>> = Object.freeze(Object.fromEntries(
  Object.entries(contract.models).map(([id, model]) => [id, Object.freeze({ id, name: model.name, version: model.version, schemaVersion: contract.schema_version })]),
));

export const BASIC_THEME = ECOMMERCE_MODELS['legacy-v1'];

export function resolveEcommerceModel(modelId?: string | null): EcommerceModel {
  return (modelId && Object.prototype.hasOwnProperty.call(ECOMMERCE_MODELS, modelId) ? ECOMMERCE_MODELS[modelId] : null) || BASIC_THEME;
}
