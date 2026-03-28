
import json
import os

def update_locale(file_path, translations):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        data = json.load(f)
    
    for key, value in translations.items():
        parts = key.split('.')
        d = data
        for part in parts[:-1]:
            d = d.setdefault(part, {})
        d[parts[-1]] = value
    
    with open(file_path, 'w', encoding='utf-8-sig') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

locales_dir = r'c:\Users\Utilisateur\projet_stock\frontend\locales'

# Spanish (es)
es_translations = {
    'common.call': 'Llamar',
    'common.categories': 'Categorías',
    'common.min': 'mín.',
    'common.reviews': 'opiniones',
    'common.see_less': 'Ver menos',
    'marketplace.catalog': 'Catálogo',
    'marketplace.delivery': 'entrega',
    'marketplace.products': 'productos',
    'marketplace.no_products_in_catalog': 'No hay productos en el catálogo',
    'marketplace.see_more_products': 'Ver {{count}} productos más',
    'marketplace.filters': 'Filtros'
}

# Arabic (ar)
ar_translations = {
    'common.call': 'اتصال',
    'common.categories': 'الفئات',
    'common.min': 'الحد الأدنى',
    'common.reviews': 'تقييمات',
    'common.see_less': 'عرض أقل',
    'marketplace.catalog': 'الكتالوج',
    'marketplace.delivery': 'توصيل',
    'marketplace.products': 'منتجات',
    'marketplace.no_products_in_catalog': 'لا يوجد منتجات في الكتالوج',
    'marketplace.see_more_products': 'عرض {{count}} منتج آخر',
    'marketplace.filters': 'الفلاتر'
}

# Portuguese (pt)
pt_translations = {
    'common.call': 'Ligar',
    'common.categories': 'Categorias',
    'common.min': 'mín.',
    'common.reviews': 'avaliações',
    'common.see_less': 'Ver menos',
    'marketplace.catalog': 'Catálogo',
    'marketplace.delivery': 'entrega',
    'marketplace.products': 'produtos',
    'marketplace.no_products_in_catalog': 'Nenhum produto no catálogo',
    'marketplace.see_more_products': 'Ver mais {{count}} produtos',
    'marketplace.filters': 'Filtros'
}

# German (de)
de_translations = {
    'common.call': 'Anrufen',
    'common.categories': 'Kategorien',
    'common.min': 'min.',
    'common.reviews': 'Bewertungen',
    'common.see_less': 'Weniger sehen',
    'marketplace.catalog': 'Katalog',
    'marketplace.delivery': 'Lieferung',
    'marketplace.products': 'Produkte',
    'marketplace.no_products_in_catalog': 'Keine Produkte im Katalog',
    'marketplace.see_more_products': '{{count}} weitere Produkte sehen',
    'marketplace.filters': 'Filter'
}

# Italian (it)
it_translations = {
    'common.call': 'Chiamare',
    'common.categories': 'Categorie',
    'common.min': 'min.',
    'common.reviews': 'recensioni',
    'common.see_less': 'Vedi meno',
    'marketplace.catalog': 'Catalogo',
    'marketplace.delivery': 'consegna',
    'marketplace.products': 'prodotti',
    'marketplace.no_products_in_catalog': 'Nessun prodotto nel catalogo',
    'marketplace.see_more_products': 'Vedi altri {{count}} prodotti',
    'marketplace.filters': 'Filtri'
}

all_updates = {
    'es.json': es_translations,
    'ar.json': ar_translations,
    'pt.json': pt_translations,
    'de.json': de_translations,
    'it.json': it_translations
}

for filename, trans in all_updates.items():
    update_locale(os.path.join(locales_dir, filename), trans)
    print(f"Updated {filename}")

print("All main locales updated successfully.")
