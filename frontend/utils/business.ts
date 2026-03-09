type FeatureLike = {
  is_restaurant?: boolean | null;
  sector?: string | null;
};

export function isRestaurantBusiness(features?: FeatureLike | null) {
  if (!features) return false;
  return Boolean(features.is_restaurant) || ['restaurant', 'traiteur', 'boulangerie'].includes(features.sector || '');
}
