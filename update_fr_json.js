const fs = require('fs');
const path = 'frontend/locales/fr.json';
let content = fs.readFileSync(path, 'utf8');

// Replace CMP/Coût Moyen Pondéré terms
content = content.replace(/"wac_label":\s*"Coût Moyen Pondéré \(CMP\)"/g, '"wac_label": "Coût d\'achat"');
content = content.replace(/"purchase_price_short":\s*"CMP"/g, '"purchase_price_short": "Achat"');
content = content.replace(/"wac_help":\s*"Le coût d'achat est calculé automatiquement à chaque entrée de stock\."/g, '"wac_help": "Le coût d\'achat peut être modifié directement ou via une entrée de stock."');
content = content.replace(/"wac_locked_alert":\s*"Le coût d'achat ne peut pas être modifié directement\."/g, '"wac_locked_alert": "Le coût d\'achat est désormais modifiable."');

// Add/Update Bulk Edit labels
content = content.replace(/"bulk_price_edit_cta":\s*".*?"/g, '"bulk_price_edit_cta": "Prix et stock"');
content = content.replace(/"bulk_edit_modal_title":\s*".*?"/g, '"bulk_edit_modal_title": "Édition en masse"');
content = content.replace(/"bulk_edit_modal_subtitle":\s*".*?"/g, '"bulk_edit_modal_subtitle": "Modification de {{count}} produits"');

fs.writeFileSync(path, content, 'utf8');
console.log('fr.json labels updated');
