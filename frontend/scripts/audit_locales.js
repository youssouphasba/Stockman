const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'locales');
const fr = JSON.parse(fs.readFileSync(path.join(localesDir, 'fr.json'), 'utf8'));
const frKeys = Object.keys(fr);

// Count all leaf keys recursively
function countLeafKeys(obj, prefix = '') {
    let count = 0;
    for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            count += countLeafKeys(obj[key], prefix + key + '.');
        } else {
            count++;
        }
    }
    return count;
}

// Get all leaf keys recursively
function getLeafKeys(obj, prefix = '') {
    let keys = [];
    for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            keys = keys.concat(getLeafKeys(obj[key], prefix + key + '.'));
        } else {
            keys.push(prefix + key);
        }
    }
    return keys;
}

const frLeafKeys = getLeafKeys(fr);
console.log(`FR.json: ${frKeys.length} sections, ${frLeafKeys.length} total leaf keys\n`);

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'fr.json').sort();
const report = [];

for (const file of files) {
    const lang = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'));
    const langLeafKeys = getLeafKeys(lang);
    const missingSections = frKeys.filter(k => !lang[k]);
    const missingKeys = frLeafKeys.filter(k => !langLeafKeys.includes(k));

    report.push({
        file,
        sections: Object.keys(lang).length,
        leafKeys: langLeafKeys.length,
        missingSections: missingSections.length,
        missingKeys: missingKeys.length,
        missingSectionNames: missingSections
    });

    console.log(`${file}: ${Object.keys(lang).length}/${frKeys.length} sections, ${langLeafKeys.length}/${frLeafKeys.length} leaf keys`);
    if (missingSections.length > 0) {
        console.log(`  Missing sections: ${missingSections.join(', ')}`);
    }
    console.log(`  Missing leaf keys: ${missingKeys.length}`);
    console.log('');
}

// Also find hardcoded French strings in TSX files
console.log('\n=== HARDCODED FRENCH STRINGS IN TSX ===\n');
const frenchPatterns = [
    /['"`](?:Aucun|Rechercher|Ajouter|Modifier|Supprimer|Confirmer|Annuler|Enregistrer|Valider|Gestion|Historique|Téléphone|Alimentaire|Cosmétique)[^'"`]*['"`]/g,
    /['"`]Mon Magasin['"`]/g,
];

function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.expo') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            scanDir(fullPath);
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                for (const pattern of frenchPatterns) {
                    pattern.lastIndex = 0;
                    let match;
                    while ((match = pattern.exec(lines[i])) !== null) {
                        // Skip import lines and comments
                        if (lines[i].trim().startsWith('import') || lines[i].trim().startsWith('//')) continue;
                        const relPath = path.relative(path.join(__dirname, '..'), fullPath);
                        console.log(`  ${relPath}:${i + 1} -> ${match[0]}`);
                    }
                }
            }
        }
    }
}

scanDir(path.join(__dirname, '..', 'app'));
scanDir(path.join(__dirname, '..', 'components'));
