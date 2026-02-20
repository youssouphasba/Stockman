import { Ionicons } from '@expo/vector-icons';

export type Tip = {
  id: string;
  module: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  deepLink?: string;
};

export const TIPS: Tip[] = [
  // ── Dashboard (5) ──────────────────────────────────────────────────────
  {
    id: 'tip_dashboard_01',
    module: 'dashboard',
    icon: 'swap-horizontal-outline',
    title: 'tips.dashboard_01_title',
    description: 'tips.dashboard_01_desc',
    deepLink: '/(tabs)/',
  },
  {
    id: 'tip_dashboard_02',
    module: 'dashboard',
    icon: 'analytics-outline',
    title: 'tips.dashboard_02_title',
    description: 'tips.dashboard_02_desc',
    deepLink: '/(tabs)/',
  },
  {
    id: 'tip_dashboard_03',
    module: 'dashboard',
    icon: 'repeat-outline',
    title: 'tips.dashboard_03_title',
    description: 'tips.dashboard_03_desc',
    deepLink: '/(tabs)/',
  },
  {
    id: 'tip_dashboard_04',
    module: 'dashboard',
    icon: 'alert-circle-outline',
    title: 'tips.dashboard_04_title',
    description: 'tips.dashboard_04_desc',
    deepLink: '/(tabs)/',
  },
  {
    id: 'tip_dashboard_05',
    module: 'dashboard',
    icon: 'bar-chart-outline',
    title: 'tips.dashboard_05_title',
    description: 'tips.dashboard_05_desc',
    deepLink: '/(tabs)/',
  },

  // ── Produits (6) ───────────────────────────────────────────────────────
  {
    id: 'tip_products_01',
    module: 'products',
    icon: 'qr-code-outline',
    title: 'tips.products_01_title',
    description: 'tips.products_01_desc',
    deepLink: '/(tabs)/products',
  },
  {
    id: 'tip_products_02',
    module: 'products',
    icon: 'barcode-outline',
    title: 'tips.products_02_title',
    description: 'tips.products_02_desc',
    deepLink: '/(tabs)/products',
  },
  {
    id: 'tip_products_03',
    module: 'products',
    icon: 'swap-vertical-outline',
    title: 'tips.products_03_title',
    description: 'tips.products_03_desc',
    deepLink: '/(tabs)/products',
  },
  {
    id: 'tip_products_04',
    module: 'products',
    icon: 'calendar-outline',
    title: 'tips.lots_peremption_title',
    description: 'tips.lots_peremption_desc',
    deepLink: '/(tabs)/products',
  },
  {
    id: 'tip_products_05',
    module: 'products',
    icon: 'color-palette-outline',
    title: 'tips.products_05_title',
    description: 'tips.products_05_desc',
    deepLink: '/(tabs)/products',
  },
  {
    id: 'tip_products_06',
    module: 'products',
    icon: 'trending-up-outline',
    title: 'tips.products_06_title',
    description: 'tips.products_06_desc',
    deepLink: '/(tabs)/products',
  },

  // ── Caisse / POS (5) ──────────────────────────────────────────────────
  {
    id: 'tip_pos_01',
    module: 'pos',
    icon: 'scan-outline',
    title: 'tips.pos_01_title',
    description: 'tips.pos_01_desc',
    deepLink: '/(tabs)/pos',
  },
  {
    id: 'tip_pos_02',
    module: 'pos',
    icon: 'gift-outline',
    title: 'tips.pos_02_title',
    description: 'tips.pos_02_desc',
    deepLink: '/(tabs)/pos',
  },
  {
    id: 'tip_pos_03',
    module: 'pos',
    icon: 'card-outline',
    title: 'tips.pos_03_title',
    description: 'tips.pos_03_desc',
    deepLink: '/(tabs)/pos',
  },
  {
    id: 'tip_pos_04',
    module: 'pos',
    icon: 'logo-whatsapp',
    title: 'tips.pos_04_title',
    description: 'tips.pos_04_desc',
    deepLink: '/(tabs)/pos',
  },
  {
    id: 'tip_pos_05',
    module: 'pos',
    icon: 'flash-outline',
    title: 'tips.pos_05_title',
    description: 'tips.pos_05_desc',
    deepLink: '/(tabs)/pos',
  },

  // ── Commandes (4) ─────────────────────────────────────────────────────
  {
    id: 'tip_orders_01',
    module: 'orders',
    icon: 'globe-outline',
    title: 'tips.orders_01_title',
    description: 'tips.orders_01_desc',
    deepLink: '/(tabs)/orders',
  },
  {
    id: 'tip_orders_02',
    module: 'orders',
    icon: 'sparkles-outline',
    title: 'tips.orders_02_title',
    description: 'tips.orders_02_desc',
    deepLink: '/(tabs)/orders',
  },
  {
    id: 'tip_orders_03',
    module: 'orders',
    icon: 'navigate-outline',
    title: 'tips.orders_03_title',
    description: 'tips.orders_03_desc',
    deepLink: '/(tabs)/orders',
  },
  {
    id: 'tip_orders_04',
    module: 'orders',
    icon: 'time-outline',
    title: 'tips.orders_04_title',
    description: 'tips.orders_04_desc',
    deepLink: '/(tabs)/orders',
  },

  // ── Fournisseurs (5) ──────────────────────────────────────────────────
  {
    id: 'tip_suppliers_01',
    module: 'suppliers',
    icon: 'storefront-outline',
    title: 'tips.suppliers_01_title',
    description: 'tips.suppliers_01_desc',
    deepLink: '/(tabs)/suppliers',
  },
  {
    id: 'tip_suppliers_02',
    module: 'suppliers',
    icon: 'call-outline',
    title: 'tips.suppliers_02_title',
    description: 'tips.suppliers_02_desc',
    deepLink: '/(tabs)/suppliers',
  },
  {
    id: 'tip_suppliers_03',
    module: 'suppliers',
    icon: 'link-outline',
    title: 'tips.suppliers_03_title',
    description: 'tips.suppliers_03_desc',
    deepLink: '/(tabs)/suppliers',
  },
  {
    id: 'tip_suppliers_04',
    module: 'suppliers',
    icon: 'chatbubble-outline',
    title: 'tips.suppliers_04_title',
    description: 'tips.suppliers_04_desc',
    deepLink: '/(tabs)/suppliers',
  },
  {
    id: 'tip_suppliers_05',
    module: 'suppliers',
    icon: 'arrow-up-circle-outline',
    title: 'tips.suppliers_05_title',
    description: 'tips.suppliers_05_desc',
    deepLink: '/(tabs)/suppliers',
  },

  // ── CRM (5) ───────────────────────────────────────────────────────────
  {
    id: 'tip_crm_01',
    module: 'crm',
    icon: 'ribbon-outline',
    title: 'tips.crm_01_title',
    description: 'tips.crm_01_desc',
    deepLink: '/(tabs)/crm',
  },
  {
    id: 'tip_crm_02',
    module: 'crm',
    icon: 'wallet-outline',
    title: 'tips.crm_02_title',
    description: 'tips.crm_02_desc',
    deepLink: '/(tabs)/crm',
  },
  {
    id: 'tip_crm_03',
    module: 'crm',
    icon: 'megaphone-outline',
    title: 'tips.crm_03_title',
    description: 'tips.crm_03_desc',
    deepLink: '/(tabs)/crm',
  },
  {
    id: 'tip_crm_04',
    module: 'crm',
    icon: 'gift-outline',
    title: 'tips.crm_04_title',
    description: 'tips.crm_04_desc',
    deepLink: '/(tabs)/crm',
  },
  {
    id: 'tip_crm_05',
    module: 'crm',
    icon: 'pricetag-outline',
    title: 'tips.crm_05_title',
    description: 'tips.crm_05_desc',
    deepLink: '/(tabs)/crm',
  },

  // ── Comptabilité (5) ──────────────────────────────────────────────────
  {
    id: 'tip_accounting_01',
    module: 'accounting',
    icon: 'calendar-outline',
    title: 'tips.accounting_01_title',
    description: 'tips.accounting_01_desc',
    deepLink: '/(tabs)/accounting',
  },
  {
    id: 'tip_accounting_02',
    module: 'accounting',
    icon: 'document-text-outline',
    title: 'tips.accounting_02_title',
    description: 'tips.accounting_02_desc',
    deepLink: '/(tabs)/accounting',
  },
  {
    id: 'tip_accounting_03',
    module: 'accounting',
    icon: 'download-outline',
    title: 'tips.accounting_03_title',
    description: 'tips.accounting_03_desc',
    deepLink: '/(tabs)/accounting',
  },
  {
    id: 'tip_accounting_04',
    module: 'accounting',
    icon: 'cash-outline',
    title: 'tips.accounting_04_title',
    description: 'tips.accounting_04_desc',
    deepLink: '/(tabs)/accounting',
  },
  {
    id: 'tip_accounting_05',
    module: 'accounting',
    icon: 'trending-up-outline',
    title: 'tips.accounting_05_title',
    description: 'tips.accounting_05_desc',
    deepLink: '/(tabs)/accounting',
  },

  // ── Alertes (3) ───────────────────────────────────────────────────────
  {
    id: 'tip_alerts_01',
    module: 'alerts',
    icon: 'settings-outline',
    title: 'tips.alerts_01_title',
    description: 'tips.alerts_01_desc',
    deepLink: '/(tabs)/alerts',
  },
  {
    id: 'tip_alerts_02',
    module: 'alerts',
    icon: 'notifications-outline',
    title: 'tips.alerts_02_title',
    description: 'tips.alerts_02_desc',
    deepLink: '/(tabs)/alerts',
  },
  {
    id: 'tip_alerts_03',
    module: 'alerts',
    icon: 'bed-outline',
    title: 'tips.alerts_03_title',
    description: 'tips.alerts_03_desc',
    deepLink: '/(tabs)/alerts',
  },

  // ── Activité (3) ──────────────────────────────────────────────────────
  {
    id: 'tip_activity_01',
    module: 'activity',
    icon: 'list-outline',
    title: 'tips.activity_01_title',
    description: 'tips.activity_01_desc',
  },
  {
    id: 'tip_activity_02',
    module: 'activity',
    icon: 'funnel-outline',
    title: 'tips.activity_02_title',
    description: 'tips.activity_02_desc',
  },
  {
    id: 'tip_activity_03',
    module: 'activity',
    icon: 'finger-print-outline',
    title: 'tips.activity_03_title',
    description: 'tips.activity_03_desc',
  },

  // ── Utilisateurs (3) ──────────────────────────────────────────────────
  {
    id: 'tip_users_01',
    module: 'users',
    icon: 'shield-outline',
    title: 'tips.users_01_title',
    description: 'tips.users_01_desc',
  },
  {
    id: 'tip_users_02',
    module: 'users',
    icon: 'share-outline',
    title: 'tips.users_02_title',
    description: 'tips.users_02_desc',
  },
  {
    id: 'tip_users_03',
    module: 'users',
    icon: 'people-circle-outline',
    title: 'tips.users_03_title',
    description: 'tips.users_03_desc',
  },

  // ── Paramètres (3) ────────────────────────────────────────────────────
  {
    id: 'tip_settings_01',
    module: 'settings',
    icon: 'business-outline',
    title: 'tips.settings_01_title',
    description: 'tips.settings_01_desc',
  },
  {
    id: 'tip_settings_02',
    module: 'settings',
    icon: 'remove-circle-outline',
    title: 'tips.settings_02_title',
    description: 'tips.settings_02_desc',
  },
  {
    id: 'tip_settings_03',
    module: 'settings',
    icon: 'moon-outline',
    title: 'tips.settings_03_title',
    description: 'tips.settings_03_desc',
  },

  // ── Général (3) ───────────────────────────────────────────────────────
  {
    id: 'tip_general_01',
    module: 'general',
    icon: 'sparkles-outline',
    title: 'tips.general_01_title',
    description: 'tips.general_01_desc',
  },
  {
    id: 'tip_general_02',
    module: 'general',
    icon: 'cloud-offline-outline',
    title: 'tips.general_02_title',
    description: 'tips.general_02_desc',
  },
  {
    id: 'tip_general_03',
    module: 'general',
    icon: 'help-circle-outline',
    title: 'tips.general_03_title',
    description: 'tips.general_03_desc',
  },

  // ── Fournisseur / Supplier (5) ────────────────────────────────────────
  {
    id: 'tip_supplier_01',
    module: 'supplier_catalog',
    icon: 'cube-outline',
    title: 'tips.supplier_01_title',
    description: 'tips.supplier_01_desc',
    deepLink: '/(supplier-tabs)/catalog',
  },
  {
    id: 'tip_supplier_02',
    module: 'supplier_orders',
    icon: 'download-outline',
    title: 'tips.supplier_02_title',
    description: 'tips.supplier_02_desc',
    deepLink: '/(supplier-tabs)/orders',
  },
  {
    id: 'tip_supplier_03',
    module: 'supplier_dashboard',
    icon: 'star-outline',
    title: 'tips.supplier_03_title',
    description: 'tips.supplier_03_desc',
    deepLink: '/(supplier-tabs)/',
  },
  {
    id: 'tip_supplier_04',
    module: 'supplier_dashboard',
    icon: 'stats-chart-outline',
    title: 'tips.supplier_04_title',
    description: 'tips.supplier_04_desc',
    deepLink: '/(supplier-tabs)/',
  },
  {
    id: 'tip_supplier_05',
    module: 'supplier_settings',
    icon: 'map-outline',
    title: 'tips.supplier_05_title',
    description: 'tips.supplier_05_desc',
    deepLink: '/(supplier-tabs)/settings',
  },
];

export function getTipsForRole(role: 'shopkeeper' | 'supplier' | 'staff'): Tip[] {
  if (role === 'supplier') {
    return TIPS.filter(t => t.module.startsWith('supplier_') || t.module === 'general');
  }
  return TIPS.filter(t => !t.module.startsWith('supplier_'));
}
