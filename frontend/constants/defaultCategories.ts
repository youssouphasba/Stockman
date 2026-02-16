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
    'Alimentation': {
        subcategories: ['Riz', 'Huile', 'Sucre', 'Farine', 'Lait', 'Boissons',
            'Conserves', 'Épices', 'Pâtes', 'Céréales', 'Fruits & Légumes',
            'Viande & Poisson', 'Biscuits & Snacks', 'Produits Frais', 'Autre'],
        color: '#f59e0b', icon: 'restaurant',
    },
    'Hygiène & Beauté': {
        subcategories: ['Savon', 'Dentifrice', 'Shampoing', 'Crème', 'Parfum',
            'Maquillage', 'Serviettes hygiéniques', 'Autre'],
        color: '#d946ef', icon: 'sparkles',
    },
    'Maison & Entretien': {
        subcategories: ['Détergent', 'Javel', 'Balai & Nettoyage', 'Insecticide',
            'Cuisine', 'Décoration', 'Autre'],
        color: '#06b6d4', icon: 'home',
    },
    'Bébé': {
        subcategories: ['Couches', 'Lait infantile', 'Céréales bébé', 'Hygiène bébé', 'Autre'],
        color: '#f43f5e', icon: 'happy',
    },
    'Boissons': {
        subcategories: ['Eau', 'Jus', 'Soda', 'Bière', 'Vin & Alcool', 'Énergisant', 'Autre'],
        color: '#3b82f6', icon: 'beer',
    },
    'High-Tech': {
        subcategories: ['Téléphonie', 'Accessoires', 'Informatique', 'Piles & Batteries', 'Autre'],
        color: '#1e3a8a', icon: 'phone-portrait',
    },
    'Mode & Textile': {
        subcategories: ['Homme', 'Femme', 'Enfant', 'Chaussures', 'Accessoires', 'Autre'],
        color: '#64748b', icon: 'shirt',
    },
    'Bricolage & Quincaillerie': {
        subcategories: ['Outillage', 'Matériaux', 'Électricité', 'Plomberie', 'Peinture', 'Autre'],
        color: '#f97316', icon: 'build',
    },
    'Papeterie & Bureau': {
        subcategories: ['Cahiers', 'Stylos', 'Fournitures', 'Autre'],
        color: '#a855f7', icon: 'document-text',
    },
    'Automobile & Moto': {
        subcategories: ['Huile moteur', 'Pièces', 'Accessoires', 'Autre'],
        color: '#ef4444', icon: 'car',
    },
    'Autre': {
        subcategories: ['Autre'],
        color: '#94a3b8', icon: 'cube',
    },
};
