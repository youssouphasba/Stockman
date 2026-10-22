export const BASIC_THEME = Object.freeze({
  id: 'legacy-v1',
  name: 'Stockman Basic',
  schemaVersion: 1,
});

export const ECOMMERCE_MODELS = Object.freeze({ [BASIC_THEME.id]: BASIC_THEME });

export function resolveEcommerceModel(modelId?: string | null) {
  return ECOMMERCE_MODELS[modelId as keyof typeof ECOMMERCE_MODELS] || BASIC_THEME;
}
