export const DEFAULT_CATEGORIES = [
    { name: 'Alimentation > Boissons', color: '#3b82f6' },
    { name: 'Alimentation > Épicerie Salée', color: '#f59e0b' },
    { name: 'Alimentation > Épicerie Sucrée', color: '#ec4899' },
    { name: 'Alimentation > Produits Frais', color: '#10b981' },
    { name: 'Alimentation > Fruits & Légumes', color: '#84cc16' },
    { name: 'Maison > Entretien', color: '#06b6d4' },
    { name: 'Maison > Cuisine', color: '#6366f1' },
    { name: 'Maison > Décoration', color: '#8b5cf6' },
    { name: 'Hygiène & Beauté > Soins', color: '#d946ef' },
    { name: 'Hygiène & Beauté > Maquillage', color: '#ec4899' },
    { name: 'Bébé > Alimentation', color: '#f43f5e' },
    { name: 'Bébé > Hygiène', color: '#fb7185' },
    { name: 'Mode > Homme', color: '#64748b' },
    { name: 'Mode > Femme', color: '#db2777' },
    { name: 'Mode > Enfant', color: '#fcd34d' },
    { name: 'High-Tech > Téléphonie', color: '#3b82f6' },
    { name: 'High-Tech > Accessoires', color: '#60a5fa' },
    { name: 'High-Tech > Informatique', color: '#1e3a8a' },
    { name: 'Bricolage > Outillage', color: '#f97316' },
    { name: 'Bricolage > Matériaux', color: '#ea580c' },
    { name: 'Papeterie & Bureau', color: '#a855f7' },
    { name: 'Jeux & Jouets', color: '#facc15' },
    { name: 'Sports & Loisirs', color: '#22c55e' },
    { name: 'Automobile', color: '#ef4444' },
    { name: 'Animaux', color: '#78350f' },
    { name: 'Autre', color: '#94a3b8' },
];

export type DefaultCategorySeed = {
    name: string;
    color: string;
    icon?: string;
};

const SECTOR_DEFAULT_CATEGORIES: Record<string, DefaultCategorySeed[]> = {
    epicerie: [
        { name: 'Epicerie salee', color: '#f59e0b', icon: 'basket-outline' },
        { name: 'Epicerie sucree', color: '#ec4899', icon: 'cafe-outline' },
        { name: 'Boissons', color: '#3b82f6', icon: 'wine-outline' },
        { name: 'Produits frais', color: '#10b981', icon: 'leaf-outline' },
        { name: 'Hygiene', color: '#06b6d4', icon: 'water-outline' },
        { name: 'Entretien maison', color: '#22c55e', icon: 'home-outline' },
        { name: 'Bebe', color: '#f43f5e', icon: 'happy-outline' },
        { name: 'Autre', color: '#94a3b8', icon: 'cube-outline' },
    ],
    supermarche: [
        { name: 'Fruits et legumes', color: '#84cc16', icon: 'nutrition-outline' },
        { name: 'Boucherie', color: '#ef4444', icon: 'restaurant-outline' },
        { name: 'Poissonnerie', color: '#0ea5e9', icon: 'fish-outline' },
        { name: 'Epicerie salee', color: '#f59e0b', icon: 'basket-outline' },
        { name: 'Epicerie sucree', color: '#ec4899', icon: 'cafe-outline' },
        { name: 'Boissons', color: '#3b82f6', icon: 'wine-outline' },
        { name: 'Hygiene et beaute', color: '#d946ef', icon: 'sparkles-outline' },
        { name: 'Entretien maison', color: '#22c55e', icon: 'home-outline' },
        { name: 'Bebe', color: '#f43f5e', icon: 'happy-outline' },
    ],
    pharmacie: [
        { name: 'Medicaments OTC', color: '#3b82f6', icon: 'medkit-outline' },
        { name: 'Prescription', color: '#1d4ed8', icon: 'document-text-outline' },
        { name: 'Parapharmacie', color: '#8b5cf6', icon: 'medical-outline' },
        { name: 'Dermocosmetique', color: '#d946ef', icon: 'sparkles-outline' },
        { name: 'Hygiene', color: '#06b6d4', icon: 'water-outline' },
        { name: 'Bebe et maternite', color: '#f43f5e', icon: 'happy-outline' },
        { name: 'Complements alimentaires', color: '#f59e0b', icon: 'nutrition-outline' },
        { name: 'Materiel medical', color: '#64748b', icon: 'bandage-outline' },
    ],
    quincaillerie: [
        { name: 'Outillage manuel', color: '#f97316', icon: 'hammer-outline' },
        { name: 'Outillage electrique', color: '#ea580c', icon: 'construct-outline' },
        { name: 'Electricite', color: '#eab308', icon: 'flash-outline' },
        { name: 'Plomberie', color: '#0ea5e9', icon: 'water-outline' },
        { name: 'Peinture', color: '#8b5cf6', icon: 'color-fill-outline' },
        { name: 'Fixation et visserie', color: '#64748b', icon: 'settings-outline' },
        { name: 'Securite EPI', color: '#ef4444', icon: 'shield-checkmark-outline' },
        { name: 'Jardinage', color: '#22c55e', icon: 'leaf-outline' },
    ],
    electronique: [
        { name: 'Smartphones', color: '#3b82f6', icon: 'phone-portrait-outline' },
        { name: 'Accessoires mobile', color: '#60a5fa', icon: 'headset-outline' },
        { name: 'Informatique', color: '#1d4ed8', icon: 'laptop-outline' },
        { name: 'Audio video', color: '#06b6d4', icon: 'tv-outline' },
        { name: 'Gaming', color: '#8b5cf6', icon: 'game-controller-outline' },
        { name: 'Peripheriques', color: '#6366f1', icon: 'hardware-chip-outline' },
        { name: 'Reseau', color: '#0ea5e9', icon: 'wifi-outline' },
        { name: 'Energie et batteries', color: '#f59e0b', icon: 'battery-charging-outline' },
    ],
    vetements: [
        { name: 'Femme', color: '#db2777', icon: 'shirt-outline' },
        { name: 'Homme', color: '#64748b', icon: 'shirt-outline' },
        { name: 'Enfant', color: '#fcd34d', icon: 'shirt-outline' },
        { name: 'Chaussures', color: '#0ea5e9', icon: 'walk-outline' },
        { name: 'Accessoires', color: '#8b5cf6', icon: 'sparkles-outline' },
        { name: 'Sport', color: '#22c55e', icon: 'fitness-outline' },
        { name: 'Lingerie', color: '#ec4899', icon: 'flower-outline' },
        { name: 'Sacs', color: '#f59e0b', icon: 'briefcase-outline' },
    ],
    cosmetiques: [
        { name: 'Soins visage', color: '#d946ef', icon: 'sparkles-outline' },
        { name: 'Soins corps', color: '#a855f7', icon: 'body-outline' },
        { name: 'Maquillage', color: '#ec4899', icon: 'brush-outline' },
        { name: 'Cheveux', color: '#f97316', icon: 'cut-outline' },
        { name: 'Parfums', color: '#0ea5e9', icon: 'water-outline' },
        { name: 'Hygiene', color: '#06b6d4', icon: 'water-outline' },
        { name: 'Accessoires beaute', color: '#64748b', icon: 'color-palette-outline' },
    ],
    restaurant: [
        { name: 'Entrees', color: '#f59e0b', icon: 'restaurant-outline' },
        { name: 'Plats', color: '#ef4444', icon: 'fast-food-outline' },
        { name: 'Desserts', color: '#ec4899', icon: 'ice-cream-outline' },
        { name: 'Boissons', color: '#3b82f6', icon: 'wine-outline' },
        { name: 'Accompagnements', color: '#22c55e', icon: 'leaf-outline' },
        { name: 'Sauces', color: '#8b5cf6', icon: 'flask-outline' },
        { name: 'Menus', color: '#6366f1', icon: 'list-outline' },
        { name: 'Ingredients', color: '#06b6d4', icon: 'cube-outline' },
    ],
    traiteur: [
        { name: 'Entrees', color: '#f59e0b', icon: 'restaurant-outline' },
        { name: 'Plats', color: '#ef4444', icon: 'fast-food-outline' },
        { name: 'Desserts', color: '#ec4899', icon: 'ice-cream-outline' },
        { name: 'Boissons', color: '#3b82f6', icon: 'wine-outline' },
        { name: 'Buffets', color: '#22c55e', icon: 'apps-outline' },
        { name: 'Menus evenementiels', color: '#8b5cf6', icon: 'calendar-outline' },
        { name: 'Ingredients', color: '#06b6d4', icon: 'cube-outline' },
    ],
    boulangerie: [
        { name: 'Pains', color: '#f59e0b', icon: 'restaurant-outline' },
        { name: 'Viennoiseries', color: '#ec4899', icon: 'cafe-outline' },
        { name: 'Patisseries', color: '#8b5cf6', icon: 'ice-cream-outline' },
        { name: 'Sandwichs', color: '#ef4444', icon: 'fast-food-outline' },
        { name: 'Boissons', color: '#3b82f6', icon: 'wine-outline' },
        { name: 'Snacking', color: '#22c55e', icon: 'pizza-outline' },
        { name: 'Ingredients', color: '#06b6d4', icon: 'cube-outline' },
    ],
    autre: DEFAULT_CATEGORIES.map((item) => ({ ...item })),
};

const SECTOR_ALIASES: Record<string, string> = {
    superette: 'supermarche',
    alimentation: 'epicerie',
    alimentaire: 'epicerie',
    pharma: 'pharmacie',
    para: 'pharmacie',
    hightech: 'electronique',
};

export function getDefaultCategoriesForSector(rawSector?: string): DefaultCategorySeed[] {
    const key = (rawSector || '').trim().toLowerCase();
    const normalized = key && SECTOR_DEFAULT_CATEGORIES[key]
        ? key
        : (SECTOR_ALIASES[key] || 'autre');
    const source = SECTOR_DEFAULT_CATEGORIES[normalized] || SECTOR_DEFAULT_CATEGORIES.autre;
    return source.map((item) => ({ ...item }));
}

export const PRODUCT_UNITS = [
    'Pièce',
    'Kg',
    'g',
    'L',
    'cL',
    'mL',
    'm',
    'm²',
    'm³',
    'Paquet',
    'Boîte',
    'Bouteille',
    'Sac',
    'Carton',
    'Palette',
    'Lot',
];

export const SHARED_CATEGORIES: Record<string, {
    subcategories: string[];
    color: string;
    icon: string;
}> = {
    Alimentation: {
        subcategories: [
            'Riz',
            'Huile',
            'Sucre',
            'Farine',
            'Lait',
            'Boissons',
            'Conserves',
            'Épices',
            'Pâtes',
            'Céréales',
            'Fruits & Légumes',
            'Viande & Poisson',
            'Biscuits & Snacks',
            'Produits Frais',
            'Autre',
        ],
        color: '#f59e0b',
        icon: 'restaurant',
    },
    'Hygiène & Beauté': {
        subcategories: ['Savon', 'Dentifrice', 'Shampoing', 'Crème', 'Parfum', 'Maquillage', 'Serviettes hygiéniques', 'Autre'],
        color: '#d946ef',
        icon: 'sparkles',
    },
    'Maison & Entretien': {
        subcategories: ['Détergent', 'Javel', 'Balai & Nettoyage', 'Insecticide', 'Cuisine', 'Décoration', 'Autre'],
        color: '#06b6d4',
        icon: 'home',
    },
    Bébé: {
        subcategories: ['Couches', 'Lait infantile', 'Céréales bébé', 'Hygiène bébé', 'Autre'],
        color: '#f43f5e',
        icon: 'happy',
    },
    Boissons: {
        subcategories: ['Eau', 'Jus', 'Soda', 'Bière', 'Vin & Alcool', 'Énergisant', 'Autre'],
        color: '#3b82f6',
        icon: 'beer',
    },
    'High-Tech': {
        subcategories: ['Téléphonie', 'Accessoires', 'Informatique', 'Piles & Batteries', 'Autre'],
        color: '#1e3a8a',
        icon: 'phone-portrait',
    },
    'Mode & Textile': {
        subcategories: ['Homme', 'Femme', 'Enfant', 'Chaussures', 'Accessoires', 'Autre'],
        color: '#64748b',
        icon: 'shirt',
    },
    'Bricolage & Quincaillerie': {
        subcategories: ['Outillage', 'Matériaux', 'Électricité', 'Plomberie', 'Peinture', 'Autre'],
        color: '#f97316',
        icon: 'build',
    },
    'Papeterie & Bureau': {
        subcategories: ['Cahiers', 'Stylos', 'Fournitures', 'Autre'],
        color: '#a855f7',
        icon: 'document-text',
    },
    'Automobile & Moto': {
        subcategories: ['Huile moteur', 'Pièces', 'Accessoires', 'Autre'],
        color: '#ef4444',
        icon: 'car',
    },
    Autre: {
        subcategories: ['Autre'],
        color: '#94a3b8',
        icon: 'cube',
    },
};
