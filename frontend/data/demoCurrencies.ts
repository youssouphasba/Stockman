export type DemoCountry = {
  code: string;      // ISO 3166-1 alpha-2
  name: string;      // Display name (French)
  flag: string;      // Emoji flag
  currency: string;  // Currency code
  currencyLabel: string;
};

// Currency mapping (mirrors backend pricing.py)
// XOF: SN CI ML BF NE TG BJ GW
// XAF: CM GA CG CF TD GQ
// GNF: GN
// CDF: CD
// EUR: EU countries
// USD: everything else

export const DEMO_COUNTRIES: DemoCountry[] = [
  // ── Afrique de l'Ouest – FCFA (XOF) ──────────────────────────
  { code: 'SN', name: 'Sénégal',          flag: '🇸🇳', currency: 'XOF', currencyLabel: 'FCFA' },
  { code: 'CI', name: "Côte d'Ivoire",    flag: '🇨🇮', currency: 'XOF', currencyLabel: 'FCFA' },
  { code: 'ML', name: 'Mali',             flag: '🇲🇱', currency: 'XOF', currencyLabel: 'FCFA' },
  { code: 'BF', name: 'Burkina Faso',     flag: '🇧🇫', currency: 'XOF', currencyLabel: 'FCFA' },
  { code: 'NE', name: 'Niger',            flag: '🇳🇪', currency: 'XOF', currencyLabel: 'FCFA' },
  { code: 'TG', name: 'Togo',             flag: '🇹🇬', currency: 'XOF', currencyLabel: 'FCFA' },
  { code: 'BJ', name: 'Bénin',            flag: '🇧🇯', currency: 'XOF', currencyLabel: 'FCFA' },
  { code: 'GW', name: 'Guinée-Bissau',    flag: '🇬🇼', currency: 'XOF', currencyLabel: 'FCFA' },

  // ── Afrique Centrale – FCFA (XAF) ────────────────────────────
  { code: 'CM', name: 'Cameroun',         flag: '🇨🇲', currency: 'XAF', currencyLabel: 'FCFA' },
  { code: 'GA', name: 'Gabon',            flag: '🇬🇦', currency: 'XAF', currencyLabel: 'FCFA' },
  { code: 'CG', name: 'Congo',            flag: '🇨🇬', currency: 'XAF', currencyLabel: 'FCFA' },
  { code: 'CF', name: 'Centrafrique',     flag: '🇨🇫', currency: 'XAF', currencyLabel: 'FCFA' },
  { code: 'TD', name: 'Tchad',            flag: '🇹🇩', currency: 'XAF', currencyLabel: 'FCFA' },
  { code: 'GQ', name: 'Guinée Équatoriale', flag: '🇬🇶', currency: 'XAF', currencyLabel: 'FCFA' },

  // ── Autres pays d'Afrique ─────────────────────────────────────
  { code: 'GN', name: 'Guinée',           flag: '🇬🇳', currency: 'GNF', currencyLabel: 'GNF' },
  { code: 'CD', name: 'RD Congo',         flag: '🇨🇩', currency: 'CDF', currencyLabel: 'CDF' },
  { code: 'MG', name: 'Madagascar',       flag: '🇲🇬', currency: 'USD', currencyLabel: 'USD' },
  { code: 'MA', name: 'Maroc',            flag: '🇲🇦', currency: 'USD', currencyLabel: 'USD' },
  { code: 'DZ', name: 'Algérie',          flag: '🇩🇿', currency: 'USD', currencyLabel: 'USD' },
  { code: 'TN', name: 'Tunisie',          flag: '🇹🇳', currency: 'USD', currencyLabel: 'USD' },
  { code: 'NG', name: 'Nigeria',          flag: '🇳🇬', currency: 'USD', currencyLabel: 'USD' },
  { code: 'GH', name: 'Ghana',            flag: '🇬🇭', currency: 'USD', currencyLabel: 'USD' },
  { code: 'KE', name: 'Kenya',            flag: '🇰🇪', currency: 'USD', currencyLabel: 'USD' },
  { code: 'ET', name: 'Éthiopie',         flag: '🇪🇹', currency: 'USD', currencyLabel: 'USD' },
  { code: 'TZ', name: 'Tanzanie',         flag: '🇹🇿', currency: 'USD', currencyLabel: 'USD' },
  { code: 'UG', name: 'Ouganda',          flag: '🇺🇬', currency: 'USD', currencyLabel: 'USD' },
  { code: 'RW', name: 'Rwanda',           flag: '🇷🇼', currency: 'USD', currencyLabel: 'USD' },
  { code: 'MZ', name: 'Mozambique',       flag: '🇲🇿', currency: 'USD', currencyLabel: 'USD' },
  { code: 'AO', name: 'Angola',           flag: '🇦🇴', currency: 'USD', currencyLabel: 'USD' },
  { code: 'ZA', name: 'Afrique du Sud',   flag: '🇿🇦', currency: 'USD', currencyLabel: 'USD' },
  { code: 'MR', name: 'Mauritanie',       flag: '🇲🇷', currency: 'USD', currencyLabel: 'USD' },
  { code: 'CV', name: 'Cap-Vert',         flag: '🇨🇻', currency: 'USD', currencyLabel: 'USD' },
  { code: 'KM', name: 'Comores',          flag: '🇰🇲', currency: 'USD', currencyLabel: 'USD' },
  { code: 'DJ', name: 'Djibouti',         flag: '🇩🇯', currency: 'USD', currencyLabel: 'USD' },
  { code: 'SO', name: 'Somalie',          flag: '🇸🇴', currency: 'USD', currencyLabel: 'USD' },
  { code: 'SD', name: 'Soudan',           flag: '🇸🇩', currency: 'USD', currencyLabel: 'USD' },
  { code: 'LY', name: 'Libye',            flag: '🇱🇾', currency: 'USD', currencyLabel: 'USD' },
  { code: 'EG', name: 'Égypte',           flag: '🇪🇬', currency: 'USD', currencyLabel: 'USD' },

  // ── Europe – EUR ──────────────────────────────────────────────
  { code: 'FR', name: 'France',           flag: '🇫🇷', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'BE', name: 'Belgique',         flag: '🇧🇪', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'LU', name: 'Luxembourg',       flag: '🇱🇺', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'DE', name: 'Allemagne',        flag: '🇩🇪', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'ES', name: 'Espagne',          flag: '🇪🇸', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'IT', name: 'Italie',           flag: '🇮🇹', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'PT', name: 'Portugal',         flag: '🇵🇹', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'NL', name: 'Pays-Bas',         flag: '🇳🇱', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'AT', name: 'Autriche',         flag: '🇦🇹', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'IE', name: 'Irlande',          flag: '🇮🇪', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'FI', name: 'Finlande',         flag: '🇫🇮', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'GR', name: 'Grèce',            flag: '🇬🇷', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'SK', name: 'Slovaquie',        flag: '🇸🇰', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'SI', name: 'Slovénie',         flag: '🇸🇮', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'EE', name: 'Estonie',          flag: '🇪🇪', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'LV', name: 'Lettonie',         flag: '🇱🇻', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'LT', name: 'Lituanie',         flag: '🇱🇹', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'CY', name: 'Chypre',           flag: '🇨🇾', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'MT', name: 'Malte',            flag: '🇲🇹', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'HR', name: 'Croatie',          flag: '🇭🇷', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'GB', name: 'Royaume-Uni',      flag: '🇬🇧', currency: 'USD', currencyLabel: 'USD' },
  { code: 'CH', name: 'Suisse',           flag: '🇨🇭', currency: 'USD', currencyLabel: 'USD' },
  { code: 'PL', name: 'Pologne',          flag: '🇵🇱', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'RO', name: 'Roumanie',         flag: '🇷🇴', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'BG', name: 'Bulgarie',         flag: '🇧🇬', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'HU', name: 'Hongrie',          flag: '🇭🇺', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'CZ', name: 'Tchéquie',         flag: '🇨🇿', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'DK', name: 'Danemark',         flag: '🇩🇰', currency: 'EUR', currencyLabel: 'EUR' },
  { code: 'SE', name: 'Suède',            flag: '🇸🇪', currency: 'EUR', currencyLabel: 'EUR' },

  // ── Amériques ─────────────────────────────────────────────────
  { code: 'US', name: 'États-Unis',       flag: '🇺🇸', currency: 'USD', currencyLabel: 'USD' },
  { code: 'CA', name: 'Canada',           flag: '🇨🇦', currency: 'USD', currencyLabel: 'USD' },
  { code: 'MX', name: 'Mexique',          flag: '🇲🇽', currency: 'USD', currencyLabel: 'USD' },
  { code: 'BR', name: 'Brésil',           flag: '🇧🇷', currency: 'USD', currencyLabel: 'USD' },
  { code: 'AR', name: 'Argentine',        flag: '🇦🇷', currency: 'USD', currencyLabel: 'USD' },
  { code: 'CO', name: 'Colombie',         flag: '🇨🇴', currency: 'USD', currencyLabel: 'USD' },

  // ── Asie / Océanie ────────────────────────────────────────────
  { code: 'IN', name: 'Inde',             flag: '🇮🇳', currency: 'USD', currencyLabel: 'USD' },
  { code: 'CN', name: 'Chine',            flag: '🇨🇳', currency: 'USD', currencyLabel: 'USD' },
  { code: 'JP', name: 'Japon',            flag: '🇯🇵', currency: 'USD', currencyLabel: 'USD' },
  { code: 'AU', name: 'Australie',        flag: '🇦🇺', currency: 'USD', currencyLabel: 'USD' },
  { code: 'AE', name: 'Émirats Arabes',   flag: '🇦🇪', currency: 'USD', currencyLabel: 'USD' },
  { code: 'SA', name: 'Arabie Saoudite',  flag: '🇸🇦', currency: 'USD', currencyLabel: 'USD' },
  { code: 'TR', name: 'Turquie',          flag: '🇹🇷', currency: 'USD', currencyLabel: 'USD' },
];
