import type { User } from '../services/api';

export type EcommerceGuideFeature = 'ecommerce_mobile_money_available' | 'ecommerce_denkma_available';

export function filterGuideContent<T extends { requires?: EcommerceGuideFeature }>(
  items: T[],
  user?: Pick<User, EcommerceGuideFeature> | null,
): T[] {
  return items.filter((item) => !item.requires || user?.[item.requires] === true);
}
