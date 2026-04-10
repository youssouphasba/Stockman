import { User } from '../services/api';
import { hasModulePermission } from './access';

export function getFirstAuthorizedShopkeeperRoute(user: User | null): string {
  if (!user) return '/(tabs)';
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
