import type { EcommerceSite, EcommerceSiteUpdate } from '../services/api';

export const STARTER_SETTINGS_GROUPS = [
  { id: 'store', title: 'Ma boutique', icon: 'storefront-outline', sections: ['storeIdentity', 'storeDocuments', 'tax', 'storeEmpty'] },
  { id: 'online', title: 'Boutique en ligne', icon: 'globe-outline', sections: ['storeEcommerce'] },
  { id: 'account', title: 'Mon compte', icon: 'person-outline', sections: ['identity', 'profile', 'security', 'accounts', 'team', 'logout'] },
  { id: 'notifications', title: 'Notifications', icon: 'notifications-outline', sections: ['notificationsToggle', 'notifications'] },
  { id: 'billing', title: 'Mon abonnement', icon: 'card-outline', sections: ['billing'] },
  { id: 'help', title: 'Aide et informations', icon: 'help-circle-outline', sections: ['sync', 'support', 'incident', 'legal', 'data'] },
] as const;

export type StarterSettingsGroup = typeof STARTER_SETTINGS_GROUPS[number]['id'];

const SECTION_ALIASES: Record<string, StarterSettingsGroup> = {
  storeGroup: 'store', accountAppGroup: 'account', organizationGroup: 'account',
  alertsGroup: 'notifications', accountAlerts: 'notifications', storeAlerts: 'notifications',
  supportGroup: 'help', securityGroup: 'account', organization: 'account',
};

export function getStarterSettingsGroup(section: string): StarterSettingsGroup | null {
  const group = STARTER_SETTINGS_GROUPS.find((item) => item.id === section || (item.sections as readonly string[]).includes(section));
  return group?.id || SECTION_ALIASES[section] || null;
}

export function createEcommerceDraft(site: EcommerceSite | null, storeId?: string): EcommerceSiteUpdate {
  return {
    store_id: site?.store_id ?? storeId ?? '',
    custom_domain: site?.custom_domain ?? '',
    domain_mode: site?.domain_mode ?? (site?.custom_domain ? 'connect' : 'stockman'),
    domain_requested_name: site?.domain_requested_name ?? '',
    domain_request_notes: site?.domain_request_notes ?? '',
    hero_title: site?.hero_title ?? '', site_name: site?.site_name ?? '',
    welcome_message: site?.welcome_message ?? '', brand_color: site?.brand_color ?? '#2563EB',
    contact_email: site?.contact_email ?? '', contact_phone: site?.contact_phone ?? '',
    contact_address: site?.contact_address ?? '', delivery_info: site?.delivery_info ?? '',
    whatsapp_phone: site?.whatsapp_phone ?? '', payment_instructions: site?.payment_instructions ?? '',
    show_out_of_stock_products: Boolean(site?.show_out_of_stock_products),
  };
}

export function buildEcommerceSettingsUpdate(site: EcommerceSite, draft: EcommerceSiteUpdate, enabled?: boolean): EcommerceSiteUpdate {
  const saved = createEcommerceDraft(site);
  const changes = Object.fromEntries(Object.entries(draft).filter(([key, value]) => {
    if (key === 'store_id' && !value) return false;
    return value !== undefined && value !== saved[key as keyof EcommerceSiteUpdate];
  })) as EcommerceSiteUpdate;
  if (enabled !== undefined && enabled !== site.enabled) changes.enabled = enabled;
  return changes;
}
