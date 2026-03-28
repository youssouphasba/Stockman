export const BUSINESS_SECTORS = [
    { key: 'epicerie', label: 'Épicerie / Alimentation générale' },
    { key: 'pharmacie', label: 'Pharmacie / Parapharmacie' },
    { key: 'vetements', label: 'Boutique de vêtements' },
    { key: 'quincaillerie', label: 'Quincaillerie' },
    { key: 'electronique', label: 'Électronique / Téléphonie' },
    { key: 'restaurant', label: 'Restaurant / Fast-food' },
    { key: 'cosmetiques', label: 'Cosmétiques / Beauté' },
    { key: 'supermarche', label: 'Supermarché' },
    { key: 'grossiste', label: 'Grossiste / Demi-gros' },
    { key: 'papeterie', label: 'Papeterie / Bureautique' },
    { key: 'boulangerie', label: 'Boulangerie / Pâtisserie' },
    { key: 'automobile', label: 'Pièces auto / Garage' },
    { key: 'traiteur', label: 'Traiteur / Événementiel' },
    { key: 'boissons', label: 'Jus / Boissons artisanales' },
    { key: 'couture', label: 'Couture / Confection' },
    { key: 'savonnerie', label: 'Savonnerie / Cosmétiques artisanaux' },
    { key: 'menuiserie', label: 'Menuiserie / Ébénisterie' },
    { key: 'imprimerie', label: 'Imprimerie / Sérigraphie' },
    { key: 'forge', label: 'Forge / Métallurgie' },
    { key: 'artisanat', label: 'Artisanat' },
    { key: 'autre', label: 'Autre' },
] as const;

export function getBusinessSectorLabel(key?: string | null) {
    return BUSINESS_SECTORS.find((sector) => sector.key === key)?.label || 'Autre';
}
