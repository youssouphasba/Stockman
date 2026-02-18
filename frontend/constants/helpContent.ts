import { Ionicons } from '@expo/vector-icons';

export type HelpFeature = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

export type HelpModule = {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  guideKey: string;
  features: HelpFeature[];
  role: 'shopkeeper' | 'supplier' | 'all';
};

export type FAQItem = {
  question: string;
  answer: string;
};

export const HELP_MODULES: HelpModule[] = [
  {
    key: 'dashboard',
    title: 'help.modules.dashboard.title',
    icon: 'grid-outline',
    color: '#6366f1',
    guideKey: 'dashboard',
    role: 'shopkeeper',
    features: [
      { icon: 'trending-up-outline', title: 'help.modules.dashboard.f1.t', description: "help.modules.dashboard.f1.d" },
      { icon: 'pie-chart-outline', title: 'help.modules.dashboard.f2.t', description: "help.modules.dashboard.f2.d" },
      { icon: 'alert-circle-outline', title: 'help.modules.dashboard.f3.t', description: "help.modules.dashboard.f3.d" },
      { icon: 'repeat-outline', title: 'help.modules.dashboard.f4.t', description: "help.modules.dashboard.f4.d" },
      { icon: 'analytics-outline', title: 'help.modules.dashboard.f5.t', description: "help.modules.dashboard.f5.d" },
      { icon: 'bar-chart-outline', title: 'help.modules.dashboard.f6.t', description: "help.modules.dashboard.f6.d" },
    ],
  },
  {
    key: 'products',
    title: 'help.modules.products.title',
    icon: 'cube-outline',
    color: '#10b981',
    guideKey: 'products',
    role: 'shopkeeper',
    features: [
      { icon: 'search-outline', title: 'help.modules.products.f1.t', description: "help.modules.products.f1.d" },
      { icon: 'pricetag-outline', title: 'help.modules.products.f2.t', description: "help.modules.products.f2.d" },
      { icon: 'swap-vertical-outline', title: 'help.modules.products.f3.t', description: "help.modules.products.f3.d" },
      { icon: 'qr-code-outline', title: 'help.modules.products.f4.t', description: "help.modules.products.f4.d" },
      { icon: 'settings-outline', title: 'help.modules.products.f5.t', description: "help.modules.products.f5.d" },
      { icon: 'layers-outline', title: 'help.modules.products.f6.t', description: "help.modules.products.f6.d" },
      { icon: 'trending-up-outline', title: 'help.modules.products.f7.t', description: "help.modules.products.f7.d" },
    ],
  },
  {
    key: 'pos',
    title: 'help.modules.pos.title',
    icon: 'calculator-outline',
    color: '#f59e0b',
    guideKey: 'pos',
    role: 'shopkeeper',
    features: [
      { icon: 'barcode-outline', title: 'help.modules.pos.f1.t', description: "help.modules.pos.f1.d" },
      { icon: 'cart-outline', title: 'help.modules.pos.f2.t', description: "help.modules.pos.f2.d" },
      { icon: 'person-outline', title: 'help.modules.pos.f3.t', description: "help.modules.pos.f3.d" },
      { icon: 'card-outline', title: 'help.modules.pos.f4.t', description: "help.modules.pos.f4.d" },
      { icon: 'receipt-outline', title: 'help.modules.pos.f5.t', description: "help.modules.pos.f5.d" },
      { icon: 'ribbon-outline', title: 'help.modules.pos.f6.t', description: "help.modules.pos.f6.d" },
    ],
  },
  {
    key: 'orders',
    title: 'help.modules.orders.title',
    icon: 'document-text-outline',
    color: '#3b82f6',
    guideKey: 'orders',
    role: 'shopkeeper',
    features: [
      { icon: 'add-circle-outline', title: 'help.modules.orders.f1.t', description: "help.modules.orders.f1.d" },
      { icon: 'navigate-outline', title: 'help.modules.orders.f2.t', description: "help.modules.orders.f2.d" },
      { icon: 'sparkles-outline', title: 'help.modules.orders.f3.t', description: "help.modules.orders.f3.d" },
      { icon: 'link-outline', title: 'help.modules.orders.f4.t', description: "help.modules.orders.f4.d" },
      { icon: 'filter-outline', title: 'help.modules.orders.f5.t', description: "help.modules.orders.f5.d" },
    ],
  },
  {
    key: 'suppliers',
    title: 'help.modules.suppliers.title',
    icon: 'people-outline',
    color: '#8b5cf6',
    guideKey: 'suppliers',
    role: 'shopkeeper',
    features: [
      { icon: 'person-add-outline', title: 'help.modules.suppliers.f1.t', description: "help.modules.suppliers.f1.d" },
      { icon: 'call-outline', title: 'help.modules.suppliers.f2.t', description: "help.modules.suppliers.f2.d" },
      { icon: 'globe-outline', title: 'help.modules.suppliers.f3.t', description: "help.modules.suppliers.f3.d" },
      { icon: 'link-outline', title: 'help.modules.suppliers.f4.t', description: "help.modules.suppliers.f4.d" },
      { icon: 'chatbubble-outline', title: 'help.modules.suppliers.f5.t', description: "help.modules.suppliers.f5.d" },
      { icon: 'arrow-up-circle-outline', title: 'help.modules.suppliers.f6.t', description: "help.modules.suppliers.f6.d" },
    ],
  },
  {
    key: 'crm',
    title: 'help.modules.crm.title',
    icon: 'heart-outline',
    color: '#ec4899',
    guideKey: 'crm',
    role: 'shopkeeper',
    features: [
      { icon: 'people-outline', title: 'help.modules.crm.f1.t', description: "help.modules.crm.f1.d" },
      { icon: 'ribbon-outline', title: 'help.modules.crm.f2.t', description: "help.modules.crm.f2.d" },
      { icon: 'wallet-outline', title: 'help.modules.crm.f3.t', description: "help.modules.crm.f3.d" },
      { icon: 'megaphone-outline', title: 'help.modules.crm.f4.t', description: "help.modules.crm.f4.d" },
      { icon: 'gift-outline', title: 'help.modules.crm.f5.t', description: "help.modules.crm.f5.d" },
      { icon: 'calendar-outline', title: 'help.modules.crm.f6.t', description: "help.modules.crm.f6.d" },
    ],
  },
  {
    key: 'accounting',
    title: 'help.modules.accounting.title',
    icon: 'calculator-outline',
    color: '#14b8a6',
    guideKey: 'accounting',
    role: 'shopkeeper',
    features: [
      { icon: 'calendar-outline', title: 'help.modules.accounting.f1.t', description: "help.modules.accounting.f1.d" },
      { icon: 'stats-chart-outline', title: 'help.modules.accounting.f2.t', description: "help.modules.accounting.f2.d" },
      { icon: 'document-text-outline', title: 'help.modules.accounting.f3.t', description: "help.modules.accounting.f3.d" },
      { icon: 'cash-outline', title: 'help.modules.accounting.f4.t', description: "help.modules.accounting.f4.d" },
      { icon: 'pie-chart-outline', title: 'help.modules.accounting.f5.t', description: "help.modules.accounting.f5.d" },
      { icon: 'download-outline', title: 'help.modules.accounting.f6.t', description: "help.modules.accounting.f6.d" },
    ],
  },
  {
    key: 'alerts',
    title: 'help.modules.alerts.title',
    icon: 'notifications-outline',
    color: '#ef4444',
    guideKey: 'alerts',
    role: 'shopkeeper',
    features: [
      { icon: 'settings-outline', title: 'help.modules.alerts.f1.t', description: "help.modules.alerts.f1.d" },
      { icon: 'flash-outline', title: 'help.modules.alerts.f2.t', description: "help.modules.alerts.f2.d" },
      { icon: 'bed-outline', title: 'help.modules.alerts.f3.t', description: "help.modules.alerts.f3.d" },
      { icon: 'checkmark-done-outline', title: 'help.modules.alerts.f4.t', description: "help.modules.alerts.f4.d" },
    ],
  },
  {
    key: 'activity',
    title: "help.modules.activity.title",
    icon: 'time-outline',
    color: '#64748b',
    guideKey: 'activity',
    role: 'shopkeeper',
    features: [
      { icon: 'list-outline', title: 'help.modules.activity.f1.t', description: "help.modules.activity.f1.d" },
      { icon: 'funnel-outline', title: 'help.modules.activity.f2.t', description: "help.modules.activity.f2.d" },
      { icon: 'people-outline', title: 'help.modules.activity.f3.t', description: "help.modules.activity.f3.d" },
    ],
  },
  {
    key: 'users',
    title: 'help.modules.users.title',
    icon: 'shield-outline',
    color: '#f97316',
    guideKey: 'users',
    role: 'shopkeeper',
    features: [
      { icon: 'person-add-outline', title: 'help.modules.users.f1.t', description: "help.modules.users.f1.d" },
      { icon: 'lock-closed-outline', title: 'help.modules.users.f2.t', description: "help.modules.users.f2.d" },
      { icon: 'key-outline', title: 'help.modules.users.f3.t', description: "help.modules.users.f3.d" },
      { icon: 'trash-outline', title: 'help.modules.users.f4.t', description: "help.modules.users.f4.d" },
    ],
  },
  {
    key: 'settings',
    title: 'help.modules.settings.title',
    icon: 'settings-outline',
    color: '#6366f1',
    guideKey: 'settings',
    role: 'all',
    features: [
      { icon: 'storefront-outline', title: 'help.modules.settings.f1.t', description: "help.modules.settings.f1.d" },
      { icon: 'moon-outline', title: 'help.modules.settings.f2.t', description: "help.modules.settings.f2.d" },
      { icon: 'toggle-outline', title: 'help.modules.settings.f3.t', description: "help.modules.settings.f3.d" },
      { icon: 'notifications-outline', title: 'help.modules.settings.f4.t', description: "help.modules.settings.f4.d" },
    ],
  },
  {
    key: 'supplierDashboard',
    title: 'help.modules.supplierDashboard.title',
    icon: 'stats-chart-outline',
    color: '#6366f1',
    guideKey: 'supplierDashboard',
    role: 'supplier',
    features: [
      { icon: 'trending-up-outline', title: 'help.modules.supplierDashboard.f1.t', description: "help.modules.supplierDashboard.f1.d" },
      { icon: 'star-outline', title: 'help.modules.supplierDashboard.f2.t', description: "help.modules.supplierDashboard.f2.d" },
      { icon: 'trophy-outline', title: 'help.modules.supplierDashboard.f3.t', description: "help.modules.supplierDashboard.f3.d" },
      { icon: 'people-outline', title: 'help.modules.supplierDashboard.f4.t', description: "help.modules.supplierDashboard.f4.d" },
    ],
  },
  {
    key: 'supplierCatalog',
    title: 'help.modules.supplierCatalog.title',
    icon: 'cube-outline',
    color: '#10b981',
    guideKey: 'supplierCatalog',
    role: 'supplier',
    features: [
      { icon: 'add-circle-outline', title: 'help.modules.supplierCatalog.f1.t', description: "help.modules.supplierCatalog.f1.d" },
      { icon: 'pricetag-outline', title: 'help.modules.supplierCatalog.f2.t', description: "help.modules.supplierCatalog.f2.d" },
      { icon: 'toggle-outline', title: 'help.modules.supplierCatalog.f3.t', description: "help.modules.supplierCatalog.f3.d" },
      { icon: 'grid-outline', title: 'help.modules.supplierCatalog.f4.t', description: "help.modules.supplierCatalog.f4.d" },
    ],
  },
  {
    key: 'supplierOrders',
    title: 'help.modules.supplierOrders.title',
    icon: 'document-text-outline',
    color: '#3b82f6',
    guideKey: 'supplierOrders',
    role: 'supplier',
    features: [
      { icon: 'list-outline', title: 'help.modules.supplierOrders.f1.t', description: "help.modules.supplierOrders.f1.d" },
      { icon: 'checkmark-circle-outline', title: 'help.modules.supplierOrders.f2.t', description: "help.modules.supplierOrders.f2.d" },
      { icon: 'airplane-outline', title: 'help.modules.supplierOrders.f3.t', description: "help.modules.supplierOrders.f3.d" },
      { icon: 'funnel-outline', title: 'help.modules.supplierOrders.f4.t', description: "help.modules.supplierOrders.f4.d" },
    ],
  },
];

export const FAQ: FAQItem[] = [
  {
    question: 'help.faq.q1.q',
    answer: "help.faq.q1.a",
  },
  {
    question: 'help.faq.q2.q',
    answer: "help.faq.q2.a",
  },
  {
    question: 'help.faq.q3.q',
    answer: "help.faq.q3.a",
  },
  {
    question: 'help.faq.q4.q',
    answer: "help.faq.q4.a",
  },
  {
    question: 'help.faq.q5.q',
    answer: "help.faq.q5.a",
  },
  {
    question: 'help.faq.q6.q',
    answer: "help.faq.q6.a",
  },
  {
    question: 'help.faq.q7.q',
    answer: "help.faq.q7.a",
  },
  {
    question: 'help.faq.q8.q',
    answer: "help.faq.q8.a",
  },
  {
    question: 'help.faq.q9.q',
    answer: "help.faq.q9.a",
  },
  {
    question: 'help.faq.q10.q',
    answer: "help.faq.q10.a",
  },
  {
    question: 'help.faq.q11.q',
    answer: "help.faq.q11.a",
  },
  {
    question: 'help.faq.q12.q',
    answer: "help.faq.q12.a",
  },
];
