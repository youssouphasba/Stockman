export const DEFAULT_CATEGORIES = [
    { name: 'Alimentation > Boissons', color: '#3b82f6' },
    { name: 'Alimentation > �picerie Sal�e', color: '#f59e0b' },
    { name: 'Alimentation > �picerie Sucr�e', color: '#ec4899' },
    { name: 'Alimentation > Produits Frais', color: '#10b981' },
    { name: 'Alimentation > Fruits & L�gumes', color: '#84cc16' },
    { name: 'Maison > Entretien', color: '#06b6d4' },
    { name: 'Maison > Cuisine', color: '#6366f1' },
    { name: 'Maison > D�coration', color: '#8b5cf6' },
    { name: 'Hygi�ne & Beaut� > Soins', color: '#d946ef' },
    { name: 'Hygi�ne & Beaut� > Maquillage', color: '#ec4899' },
    { name: 'B�b� > Alimentation', color: '#f43f5e' },
    { name: 'B�b� > Hygi�ne', color: '#fb7185' },
    { name: 'Mode > Homme', color: '#64748b' },
    { name: 'Mode > Femme', color: '#db2777' },
    { name: 'Mode > Enfant', color: '#fcd34d' },
    { name: 'High-Tech > T�l�phonie', color: '#3b82f6' },
    { name: 'High-Tech > Accessoires', color: '#60a5fa' },
    { name: 'High-Tech > Informatique', color: '#1e3a8a' },
    { name: 'Bricolage > Outillage', color: '#f97316' },
    { name: 'Bricolage > Mat�riaux', color: '#ea580c' },
    { name: 'Papeterie & Bureau', color: '#a855f7' },
    { name: 'Jeux & Jouets', color: '#facc15' },
    { name: 'Sports & Loisirs', color: '#22c55e' },
    { name: 'Automobile', color: '#ef4444' },
    { name: 'Animaux', color: '#78350f' },
    { name: 'Autre', color: '#94a3b8' },
];

export const PRODUCT_UNITS = [
    'Pi�ce',
    'Kg',
    'g',
    'L',
    'cL',
    'mL',
    'm',
    'm�',
    'm�',
    'Paquet',
    'Bo�te',
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
            'Conserves', '�pices', 'P�tes', 'C�r�ales', 'Fruits & L�gumes',
            'Viande & Poisson', 'Biscuits & Snacks', 'Produits Frais', 'Autre'],
        color: '#f59e0b', icon: 'restaurant',
    },
    'Hygi�ne & Beaut�': {
        subcategories: ['Savon', 'Dentifrice', 'Shampoing', 'Cr�me', 'Parfum',
            'Maquillage', 'Serviettes hygi�niques', 'Autre'],
        color: '#d946ef', icon: 'sparkles',
    },
    'Maison & Entretien': {
        subcategories: ['D�tergent', 'Javel', 'Balai & Nettoyage', 'Insecticide',
            'Cuisine', 'D�coration', 'Autre'],
        color: '#06b6d4', icon: 'home',
    },
    'B�b�': {
        subcategories: ['Couches', 'Lait infantile', 'C�r�ales b�b�', 'Hygi�ne b�b�', 'Autre'],
        color: '#f43f5e', icon: 'happy',
    },
    'Boissons': {
        subcategories: ['Eau', 'Jus', 'Soda', 'Bi�re', 'Vin & Alcool', '�nergisant', 'Autre'],
        color: '#3b82f6', icon: 'beer',
    },
    'High-Tech': {
        subcategories: ['T�l�phonie', 'Accessoires', 'Informatique', 'Piles & Batteries', 'Autre'],
        color: '#1e3a8a', icon: 'phone-portrait',
    },
    'Mode & Textile': {
        subcategories: ['Homme', 'Femme', 'Enfant', 'Chaussures', 'Accessoires', 'Autre'],
        color: '#64748b', icon: 'shirt',
    },
    'Bricolage & Quincaillerie': {
        subcategories: ['Outillage', 'Mat�riaux', '�lectricit�', 'Plomberie', 'Peinture', 'Autre'],
        color: '#f97316', icon: 'build',
    },
    'Papeterie & Bureau': {
        subcategories: ['Cahiers', 'Stylos', 'Fournitures', 'Autre'],
        color: '#a855f7', icon: 'document-text',
    },
    'Automobile & Moto': {
        subcategories: ['Huile moteur', 'Pi�ces', 'Accessoires', 'Autre'],
        color: '#ef4444', icon: 'car',
    },
    'Autre': {
        subcategories: ['Autre'],
        color: '#94a3b8', icon: 'cube',
    },
};
