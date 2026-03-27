export const BUSINESS_SECTORS = [
    { key: 'epicerie', label: '�picerie / Alimentation g�n�rale' },
    { key: 'pharmacie', label: 'Pharmacie / Parapharmacie' },
    { key: 'vetements', label: 'Boutique de v�tements' },
    { key: 'quincaillerie', label: 'Quincaillerie' },
    { key: 'electronique', label: '�lectronique / T�l�phonie' },
    { key: 'restaurant', label: 'Restaurant / Fast-food' },
    { key: 'cosmetiques', label: 'Cosm�tiques / Beaut�' },
    { key: 'supermarche', label: 'Supermarch�' },
    { key: 'grossiste', label: 'Grossiste / Demi-gros' },
    { key: 'papeterie', label: 'Papeterie / Bureautique' },
    { key: 'boulangerie', label: 'Boulangerie / P�tisserie' },
    { key: 'automobile', label: 'Pi�ces auto / Garage' },
    { key: 'traiteur', label: 'Traiteur / �v�nementiel' },
    { key: 'boissons', label: 'Jus / Boissons artisanales' },
    { key: 'couture', label: 'Couture / Confection' },
    { key: 'savonnerie', label: 'Savonnerie / Cosm�tiques artisanaux' },
    { key: 'menuiserie', label: 'Menuiserie / �b�nisterie' },
    { key: 'imprimerie', label: 'Imprimerie / S�rigraphie' },
    { key: 'forge', label: 'Forge / M�tallurgie' },
    { key: 'artisanat', label: 'Artisanat' },
    { key: 'autre', label: 'Autre' },
] as const;

export function getBusinessSectorLabel(key?: string | null) {
    return BUSINESS_SECTORS.find((sector) => sector.key === key)?.label || 'Autre';
}
