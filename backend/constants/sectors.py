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
    "autre": {"label": "Autre", "icon": "🔀"},
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
    "beauté": "cosmetiques",
    "beaute": "cosmetiques",
    "coiffure": "cosmetiques",
    "salon": "cosmetiques",
    "boulanger": "boulangerie",
    "patisserie": "boulangerie",
    "pâtisserie": "boulangerie",
    "garage": "automobile",
    "pièces auto": "automobile",
    "pieces auto": "automobile",
    "mécanique": "automobile",
    "grossiste": "grossiste",
    "demi-gros": "grossiste",
}


def normalize_sector(raw: str) -> str:
    """Normalise un type de commerce saisi librement vers une clé de secteur."""
    if not raw:
        return "autre"
    key = raw.strip().lower()
    if key in BUSINESS_SECTORS:
        return key
    return SECTOR_ALIASES.get(key, "autre")
