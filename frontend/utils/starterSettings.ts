import type { EcommerceSite, EcommerceSiteUpdate } from '../services/api';

export const STARTER_SETTINGS_GROUPS = [
  { id: 'online', icon: 'globe-outline', sections: ['storeEcommerce'] },
  { id: 'store', icon: 'storefront-outline', sections: ['team', 'storeIdentity', 'storeDocuments', 'tax', 'storeEmpty'] },
  { id: 'help', icon: 'help-circle-outline', sections: ['support', 'incident'] },
  { id: 'account', icon: 'person-outline', sections: ['identity', 'profile', 'security', 'accounts', 'data', 'logout'] },
  { id: 'notifications', icon: 'notifications-outline', sections: ['notificationsToggle', 'notifications'] },
  { id: 'billing', icon: 'card-outline', sections: ['billing'] },
  // La synchronisation est automatique : son état est une information, pas une aide.
  { id: 'information', icon: 'information-circle-outline', sections: ['sync', 'legal'] },
] as const;

type SettingsGroup = typeof STARTER_SETTINGS_GROUPS[number];
export const MANAGED_SETTINGS_GROUPS = STARTER_SETTINGS_GROUPS.map((group) => {
  if (group.id === 'account') return { ...group, sections: group.sections.flatMap((section) => section === 'security' ? [section, 'organization'] : [section]) };
  if (group.id === 'notifications') return { ...group, sections: [...group.sections, 'accountAlerts', 'storeAlerts'] };
  return group;
});

export type StarterSettingsGroup = SettingsGroup['id'];

const SECTION_ALIASES: Record<string, StarterSettingsGroup> = {
  storeGroup: 'store', accountAppGroup: 'account', organizationGroup: 'account',
  alertsGroup: 'notifications', accountAlerts: 'notifications', storeAlerts: 'notifications',
  supportGroup: 'help', securityGroup: 'account', organization: 'account', enterpriseHub: 'account',
};

export function getStarterSettingsGroup(section: string): StarterSettingsGroup | null {
  const group = STARTER_SETTINGS_GROUPS.find((item) => item.id === section || (item.sections as readonly string[]).includes(section));
  return group?.id || SECTION_ALIASES[section] || null;
}

// Le nom du site, les textes d'accueil et la couleur passent par le brouillon et la publication de
// l'apparence : ils ne sont jamais envoyés avec les réglages du site, pour ne pas écraser une publication.
export const ECOMMERCE_PRESENTATION_FIELDS = ['site_name', 'hero_title', 'welcome_message', 'brand_color'] as const;

// Le domaine se connecte et se retire depuis sa propre carte : il n'est jamais renvoyé avec ce formulaire.
export function createEcommerceDraft(site: EcommerceSite | null, storeId?: string): EcommerceSiteUpdate {
  return {
    store_id: site?.store_id ?? storeId ?? '',
    contact_email: site?.contact_email ?? '', contact_phone: site?.contact_phone ?? '',
    contact_address: site?.contact_address ?? '', delivery_info: site?.delivery_info ?? '',
    whatsapp_phone: site?.whatsapp_phone ?? '', payment_instructions: site?.payment_instructions ?? '',
    wave_phone: site?.wave_phone ?? '', wave_name: site?.wave_name ?? '', wave_link: site?.wave_link ?? '',
    orange_money_phone: site?.orange_money_phone ?? '', orange_money_name: site?.orange_money_name ?? '',
    pay_on_delivery: site?.pay_on_delivery !== false,
    show_out_of_stock_products: Boolean(site?.show_out_of_stock_products),
  };
}

export function buildEcommerceSettingsUpdate(site: EcommerceSite, draft: EcommerceSiteUpdate, enabled?: boolean): EcommerceSiteUpdate {
  const saved = createEcommerceDraft(site);
  const changes = Object.fromEntries(Object.entries(draft).filter(([key, value]) => {
    if (key === 'store_id' && !value) return false;
    if ((ECOMMERCE_PRESENTATION_FIELDS as readonly string[]).includes(key)) return false;
    return value !== undefined && value !== saved[key as keyof EcommerceSiteUpdate];
  })) as EcommerceSiteUpdate;
  if (enabled !== undefined && enabled !== site.enabled) changes.enabled = enabled;
  return changes;
}
