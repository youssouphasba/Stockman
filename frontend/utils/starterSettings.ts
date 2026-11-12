import type { EcommerceSite, EcommerceSiteUpdate } from '../services/api';

export const STARTER_SETTINGS_GROUPS = [
  { id: 'online', title: 'Boutique en ligne', icon: 'globe-outline', sections: ['storeEcommerce'] },
  { id: 'store', title: 'Ma boutique', icon: 'storefront-outline', sections: ['storeIdentity', 'storeDocuments', 'tax', 'storeEmpty'] },
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
