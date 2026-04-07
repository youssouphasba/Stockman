# Roadmap KPIs Comptabilite Mobile

## KPIs actuels (9 cartes)

| # | KPI | Donnee backend | Insight au clic |
|---|-----|---------------|-----------------|
| 1 | Chiffre d'affaires | `revenue` | Variation periode, meilleure journee |
| 2 | Marge brute | `gross_profit` | Taux marge, cout d'achat |
| 3 | Depenses | `expenses` | Ratio depenses/CA, nb categories |
| 4 | Resultat net | `net_profit` | Marge nette, pertes comptabilisees |
| 5 | Taxes (conditionnel) | `tax_collected` | Taux sur activite |
| 6 | Valeur stock | `stock_value` | Valeur achat vs potentiel vente |
| 7 | Pertes | `total_losses` | Total, motifs, motif principal |
| 8 | Articles vendus | `total_items_sold` | Nb ventes, panier moyen |
| 9 | Achats fournisseurs | `total_purchases` | Nb reappros, moyenne par achat |

---

## Ameliorations planifiees

### P1 — Deltas vs periode precedente
**Impact : eleve | Effort : moyen**

Chaque KPI affiche un delta % vert/rouge par rapport a la periode precedente.
Exemple : CA 1 200 000 FCFA (+12% vs 30j precedents)

**Backend :**
- Dans `/accounting/stats`, calculer la meme periode en N-1
- Ajouter au retour : `prev_revenue`, `prev_gross_profit`, `prev_expenses`, `prev_net_profit`, `prev_total_losses`, `prev_total_items_sold`, `prev_total_purchases`
- Ou un objet `deltas: { revenue_pct, gross_profit_pct, expenses_pct, ... }`

**Frontend :**
- Sous chaque `kpiValue`, afficher une ligne delta :
  - Fleche haut verte si positif (pour CA, marge, items)
  - Fleche haut rouge si positif (pour depenses, pertes) — logique inversee
  - Texte : `+12.3%` ou `-5.1%`

**Fichiers :**
- `backend/server.py` : endpoint `get_accounting_stats` (ligne ~17124)
- `frontend/app/(tabs)/accounting.tsx` : chaque `kpiCard`
- `frontend/services/api.ts` : type `AccountingStats`

---

### P2 — Creances clients
**Impact : eleve | Effort : faible**

Nouvelle carte KPI : total des dettes clients en cours.

**Backend :**
- Query : `db.customers.find({"user_id": owner_id, "current_debt": {"$gt": 0}})`
- Retourner : `total_customer_debt`, `debtors_count`, `top_debtors` (top 5 avec nom + montant)
- Ajouter ces champs a `AccountingStats` ou creer un sous-endpoint

**Frontend :**
- Nouvelle carte avec icone `wallet-outline`, couleur `danger`
- Valeur : montant total des creances
- Sous-valeur : "X clients debiteurs"
- Au clic : liste des top 5 debiteurs

**Fichiers :**
- `backend/server.py` : dans `get_accounting_stats`
- `frontend/app/(tabs)/accounting.tsx` : nouvelle carte + detail modal
- `frontend/services/api.ts` : nouveaux champs type

---

### P3 — Tresorerie / Cash-flow
**Impact : eleve | Effort : moyen**

Vue synthetique des flux de tresorerie.

**Backend :**
- Encaissements = ventes par methode de paiement (deja dans `payment_breakdown`)
- Decaissements = depenses + achats fournisseurs livres
- Solde net = encaissements - decaissements
- Ajouter : `cash_in`, `cash_out`, `cash_balance`

**Frontend :**
- Nouvelle carte avec icone `swap-vertical-outline`
- Couleur : vert si positif, rouge si negatif
- Au clic : detail encaissements vs decaissements par categorie

**Fichiers :**
- `backend/server.py` : calcul dans `get_accounting_stats`
- `frontend/app/(tabs)/accounting.tsx` : nouvelle carte

---

### P4 — Rotation stock en jours
**Impact : moyen | Effort : faible**

"Ton stock actuel couvre X jours de vente"

**Calcul :**
```
jours_stock = stock_value / (cogs / nb_jours_periode)
```
Si `cogs == 0` : afficher "Pas assez de donnees"

**Implementation :**
- Calculable cote frontend avec les donnees existantes (`stock_value`, `cogs`, nombre de jours de la periode)
- Pas de changement backend necessaire

**Frontend :**
- Ajouter en sous-valeur de la carte "Valeur stock"
- Texte : "Couvre ~X jours de vente"

**Fichiers :**
- `frontend/app/(tabs)/accounting.tsx` : modifier carte stock existante

---

### P5 — CA par jour de la semaine
**Impact : moyen | Effort : faible**

Identifier le meilleur et le pire jour de la semaine.

**Implementation :**
- `daily_revenue` est deja retourne par le backend
- Agreger cote frontend par jour de semaine (lundi-dimanche)
- Identifier meilleur jour + pire jour

**Frontend :**
- Nouveau mini-graphique ou section sous le graphique CA existant
- Barres horizontales par jour de semaine
- Badge "Meilleur jour : Samedi" / "Jour le plus calme : Lundi"

**Fichiers :**
- `frontend/app/(tabs)/accounting.tsx` : nouvelle section apres le graphique

---

### P6 — Rentabilite par categorie
**Impact : moyen | Effort : moyen**

Marge brute par categorie produit, pas juste le CA.

**Backend :**
- `product_performance` existe deja avec `margin_pct` par produit
- Ajouter un champ `category` a chaque entree de `product_performance`
- Ou creer un nouveau champ `category_performance` agrege

**Frontend :**
- Section dans le detail de la carte "Marge brute"
- Tableau : categorie | CA | marge | taux
- Trier par marge descendante
- Highlight categories a forte vente mais faible marge

**Fichiers :**
- `backend/server.py` : enrichir `product_performance` avec categorie
- `frontend/app/(tabs)/accounting.tsx` : section dans modal marge

---

### P7 — Ratio achats/ventes
**Impact : faible | Effort : faible**

Deja calculable avec les donnees existantes.

**Calcul :**
```
ratio = (total_purchases / revenue) * 100
```

**Frontend :**
- Ajouter en sous-valeur de la carte "Achats fournisseurs"
- Texte : "42% du CA"
- Alerte visuelle si ratio > 80%

**Fichiers :**
- `frontend/app/(tabs)/accounting.tsx` : modifier carte achats existante

---

### P8 — Seuil de rentabilite
**Impact : eleve | Effort : eleve**

CA minimum pour couvrir les charges fixes.

**Prerequis :**
- L'utilisateur doit saisir ses charges fixes (loyer, salaires, etc.)
- Nouveau champ dans les settings ou dans la section depenses

**Calcul :**
```
seuil = charges_fixes / taux_marge_brute
```

**Frontend :**
- Nouvelle carte ou section
- "Il te faut X FCFA/mois pour ne pas perdre d'argent"
- Jauge visuelle : CA actuel vs seuil

**Complexite :**
- Necessite un nouveau parametre utilisateur (charges fixes mensuelles)
- A implementer apres P1-P4

---

## Ordre d'implementation recommande

| Phase | KPIs | Justification |
|-------|------|---------------|
| 1 | P1 (deltas) + P4 (rotation) + P7 (ratio achats) | P4 et P7 = modifications frontend uniquement, P1 = backend leger |
| 2 | P2 (creances) + P3 (tresorerie) | Nouvelles cartes, queries simples |
| 3 | P5 (CA/jour semaine) + P6 (rentabilite categorie) | Enrichissement analytique |
| 4 | P8 (seuil rentabilite) | Necessite nouveau parametre utilisateur |

## Fichiers impactes (resume)

| Fichier | Phases |
|---------|--------|
| `backend/server.py` — `/accounting/stats` | P1, P2, P3, P6 |
| `backend/server.py` — modele `AccountingStats` | P1, P2, P3 |
| `frontend/app/(tabs)/accounting.tsx` | Toutes |
| `frontend/services/api.ts` — type `AccountingStats` | P1, P2, P3 |
| `web-app/src/components/Accounting.tsx` | Toutes (mirror mobile) |
| `web-app/src/services/api.ts` | P1, P2, P3 |
