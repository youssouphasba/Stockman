import type { User } from '../services/api';
import { hasModulePermission } from './access';

type StarterNavigationOptions = {
  modules?: Record<string, boolean>;
  isRestaurant?: boolean;
};

export function getCommercialPlan(user: User | null): User['plan'] | undefined {
  return user?.subscribed_plan || user?.subscription_plan || user?.plan;
}

export function isStarterShopkeeper(user: User | null): boolean {
  return user?.role === 'shopkeeper' && !user.is_demo && getCommercialPlan(user) === 'starter';
}

export function getStarterRoute(user: User | null, options: StarterNavigationOptions = {}): string {
  const modules = options.modules || {};
  if ((options.isRestaurant || modules.stock_management !== false) && hasModulePermission(user, 'stock', 'read')) {
    return '/(tabs)/products';
  }
  if (hasModulePermission(user, 'pos', 'read')) return '/(tabs)/pos';
  if (modules.accounting !== false && hasModulePermission(user, 'accounting', 'read')) return '/(tabs)/accounting';
  return '/(tabs)/settings';
}

export function getStarterNavigationRedirect(
  user: User | null,
  route: string,
  openModal: unknown,
  options: StarterNavigationOptions = {},
): string | null {
  if (!isStarterShopkeeper(user)) return null;
  const target = getStarterRoute(user, options);
  if (route === 'index') {
    return openModal === 'history' || openModal === 'statistics' ? null : target;
  }
  if (route === 'products' && target !== '/(tabs)/products') return target;
  return null;
}

export function getFirstAuthorizedShopkeeperRoute(user: User | null): string {
  if (!user) return '/(tabs)';
  if (isStarterShopkeeper(user)) return getStarterRoute(user);
  if (user.role === 'shopkeeper' || user.role === 'superadmin') return '/(tabs)';

  if (hasModulePermission(user, 'pos', 'read')) return '/(tabs)/pos';
  if (hasModulePermission(user, 'stock', 'read')) return '/(tabs)/products';
  if (hasModulePermission(user, 'accounting', 'read')) return '/(tabs)/accounting';
  if (hasModulePermission(user, 'suppliers', 'read')) return '/(tabs)/suppliers';
  if (hasModulePermission(user, 'crm', 'read')) return '/(tabs)/crm';
  if (hasModulePermission(user, 'staff', 'read')) return '/(tabs)/users';
  return '/(tabs)/settings';
}

export function getDefaultRouteForUser(user: User | null): string {
  if (!user) return '/(auth)';
  if (user.role === 'superadmin') return '/(admin)';
  if (user.role === 'supplier') return '/(supplier-tabs)';
  return getFirstAuthorizedShopkeeperRoute(user);
}
