import type { User, UserPermissions } from '../services/api';

const ACCESS_MODULES: (keyof UserPermissions)[] = ['dashboard', 'pos', 'stock', 'accounting', 'crm', 'suppliers', 'staff'];

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

// Module activé par l'admin Stockman (global, plan, type d'activité ou compte).
// Coupé tant que le serveur ne l'a pas activé ; l'équipe Stockman et les fournisseurs ne sont pas concernés.
export function hasPlatformModule(user: User | null | undefined, module: string): boolean {
  if (!user) return false;
  if (user.role === 'superadmin' || user.role === 'supplier') return true;
  return user.platform_modules?.[module] === true;
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
