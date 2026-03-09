import type { User, UserPermissions } from '../services/api';

const ACCESS_MODULES: (keyof UserPermissions)[] = ['pos', 'stock', 'accounting', 'crm', 'suppliers', 'staff'];

export type AccessContext = {
  accountRoles: ('billing_admin' | 'org_admin')[];
  effectivePermissions: Partial<UserPermissions>;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  isBillingAdmin: boolean;
  hasOperationalAccess: boolean;
  isBillingOnly: boolean;
};

export function getAccessContext(user?: User | null): AccessContext {
  const role = user?.role;
  const accountRoles = user?.account_roles || [];
  const effectivePermissions = (user?.effective_permissions || user?.permissions || {}) as Partial<UserPermissions>;
  const isSuperAdmin = role === 'superadmin';
  const isOrgAdmin = role === 'shopkeeper' || isSuperAdmin || accountRoles.includes('org_admin');
  const isBillingAdmin = role === 'shopkeeper' || isSuperAdmin || accountRoles.includes('billing_admin');
  const hasOperationalAccess = isOrgAdmin || ACCESS_MODULES.some((module) => {
    const level = effectivePermissions[module];
    return level === 'read' || level === 'write';
  });

  return {
    accountRoles,
    effectivePermissions,
    isSuperAdmin,
    isOrgAdmin,
    isBillingAdmin,
    hasOperationalAccess,
    isBillingOnly: isBillingAdmin && !hasOperationalAccess,
  };
}

export function hasModulePermission(
  user: User | null | undefined,
  module: keyof UserPermissions,
  level: 'read' | 'write' = 'read',
): boolean {
  const access = getAccessContext(user);
  if (access.isOrgAdmin || access.isSuperAdmin) return true;
  const currentLevel = access.effectivePermissions[module] || 'none';
  if (level === 'write') return currentLevel === 'write';
  return currentLevel === 'read' || currentLevel === 'write';
}
