# ─── Secteurs d'activité pour le Catalogue Global ────────────────────────────

BUSINESS_SECTORS = {
    "epicerie": {"label": "Épicerie / Alimentation Générale", "icon": "🛒"},
    "pharmacie": {"label": "Pharmacie / Parapharmacie", "icon": "💊"},
    "vetements": {"label": "Boutique de Vêtements", "icon": "👗"},
    "quincaillerie": {"label": "Quincaillerie / BTP", "icon": "🔧"},
    "electronique": {"label": "Électronique / Téléphonie", "icon": "📱"},
    "restaurant": {"label": "Restaurant / Fast-food", "icon": "🍽️"},
    "cosmetiques": {"label": "Cosmétiques / Beauté", "icon": "💄"},
    "supermarche": {"label": "Supermarché", "icon": "🏪"},
    "grossiste": {"label": "Grossiste / Demi-gros", "icon": "📦"},
    "papeterie": {"label": "Papeterie / Bureautique", "icon": "📎"},
    "boulangerie": {"label": "Boulangerie / Pâtisserie", "icon": "🥖"},
    "automobile": {"label": "Pièces Auto / Garage", "icon": "🚗"},
    "traiteur": {"label": "Traiteur / Événementiel", "icon": "🍰"},
    "boissons": {"label": "Jus / Boissons Artisanales", "icon": "🧃"},
    "couture": {"label": "Couture / Confection", "icon": "🧵"},
    "savonnerie": {"label": "Savonnerie / Cosmétiques Artisanaux", "icon": "🧼"},
    "menuiserie": {"label": "Menuiserie / Ébénisterie", "icon": "🪑"},
    "imprimerie": {"label": "Imprimerie / Sérigraphie", "icon": "🖨️"},
    "forge": {"label": "Forge / Métallurgie", "icon": "⚒️"},
    "artisanat": {"label": "Artisanat", "icon": "🧶"},
    "autre": {"label": "Autre", "icon": "🔀"},
}

# Secteurs qui activent le module Production
PRODUCTION_SECTORS = {
    "boulangerie", "restaurant", "traiteur", "boissons",
    "couture", "savonnerie", "menuiserie", "imprimerie",
    "forge", "artisanat"
}

# Mapping flexible : normalise les valeurs saisies par les utilisateurs
# vers les clés du dictionnaire ci-dessus
SECTOR_ALIASES = {
    "boutique": "epicerie",
    "alimentation": "epicerie",
    "alimentaire": "epicerie",
    "supérette": "supermarche",
    "superette": "supermarche",
    "mini market": "supermarche",
    "mini-market": "supermarche",
    "pharma": "pharmacie",
    "parapharmacie": "pharmacie",
    "habits": "vetements",
    "vêtements": "vetements",
    "friperie": "vetements",
    "bricolage": "quincaillerie",
    "btp": "quincaillerie",
    "matériaux": "quincaillerie",
    "téléphone": "electronique",
    "telephone": "electronique",
    "high-tech": "electronique",
    "resto": "restaurant",
    "fast food": "restaurant",
    "fast-food": "restaurant",
    "maquis": "restaurant",
    "gargote": "restaurant",
    "beauté": "cosmetiques",
    "beaute": "cosmetiques",
    "coiffure": "cosmetiques",
    "salon": "cosmetiques",
    "boulanger": "boulangerie",
    "patisserie": "boulangerie",
    "pâtisserie": "boulangerie",
    "confiserie": "boulangerie",
    "garage": "automobile",
    "pièces auto": "automobile",
    "pieces auto": "automobile",
    "mécanique": "automobile",
    "grossiste": "grossiste",
    "demi-gros": "grossiste",
    "traiteur": "traiteur",
    "catering": "traiteur",
    "événementiel": "traiteur",
    "jus": "boissons",
    "glacerie": "boissons",
    "brasserie": "boissons",
    "tailleur": "couture",
    "styliste": "couture",
    "confection": "couture",
    "textile": "couture",
    "savon": "savonnerie",
    "cosmétiques artisanaux": "savonnerie",
    "ébénisterie": "menuiserie",
    "ebenisterie": "menuiserie",
    "meubles": "menuiserie",
    "sérigraphie": "imprimerie",
    "serigraphie": "imprimerie",
    "soudure": "forge",
    "métallurgie": "forge",
    "metallurgie": "forge",
    "portails": "forge",
    "bijoux": "artisanat",
    "maroquinerie": "artisanat",
    "vannerie": "artisanat",
}


def normalize_sector(raw: str) -> str:
    """Normalise un type de commerce saisi librement vers une clé de secteur."""
    if not raw:
        return "autre"
    key = raw.strip().lower()
    if key in BUSINESS_SECTORS:
        return key
    return SECTOR_ALIASES.get(key, "autre")


def is_production_sector(raw: str) -> bool:
    """Vérifie si un type de commerce nécessite le module Production."""
    return normalize_sector(raw) in PRODUCTION_SECTORS
