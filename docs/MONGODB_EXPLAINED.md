# Comprendre MongoDB pour Stockman

Tu m'as demandé une explication sur le fonctionnement de MongoDB. Voici pourquoi nous l'avons choisi pour Stockman et comment cela fonctionne comparé aux bases de données traditionnelles.

## 1. L'Analogie : Excel vs Classeur

### 🟦 SQL (Traditionnel) = Tableau Excel Rigide
Imagine un fichier Excel où chaque colonne est définie à l'avance.
- Si tu as une colonne "Taille", **tous** tes produits doivent avoir une case pour la taille, même si ça n'a aucun sens pour une bouteille d'eau.
- Si tu veux ajouter une nouvelle information (ex: "Date de péremption") 6 mois après, tu dois modifier **tout** le tableau, ce qui peut "casser" l'application.

### 🍃 MongoDB (NoSQL) = Classeur Flexible
MongoDB fonctionne avec des **Documents** (comme des feuilles de papier) rangés dans des **Collections** (comme des dossiers).
- Chaque feuille peut contenir des informations différentes.
- Le produit "T-shirt" peut avoir un champ `taille: "XL"`.
- Le produit "Coca" peut avoir un champ `volume: "33cl"`.
- **Avantage clé** : On peut faire évoluer l'application très vite sans tout casser. Pour Stockman, c'est crucial car on gère des produits très variés (boulangerie, électroménager, alimentation...).

## 2. Structure des Données (JSON)

Au lieu de lignes et de colonnes, MongoDB stocke les données sous forme d'objets (JSON), lisibles par les humains et les machines.

**Exemple d'un Utilisateur Stockman :**
```json
{
  "_id": "user_12345",
  "nom": "Modou Boutique",
  "role": "commerçant",
  "magasins": [
    { "nom": "Sandaga 1", "ca_jour": 50000 },
    { "nom": "HLM 5", "ca_jour": 25000 }
  ]
}
```
*Note comme on peut "imbriquer" les magasins directement dans l'utilisateur. En SQL, il faudrait 2 tableaux séparés et faire des "jointures" compliquées.*

## 3. Pourquoi c'est le meilleur choix pour Stockman ?

1.  **Vitesse** : Comme les données sont regroupées (l'utilisateur ET ses magasins sont ensemble), l'application n'a besoin de faire qu'une seule lecture pour tout afficher. C'est beaucoup plus rapide sur mobile.
2.  **Mode Hors-Ligne** : Cette structure JSON est exactement la même que celle utilisée par l'application mobile (React Native). C'est ce qui nous permet de synchroniser facilement les données quand la connexion revient.
3.  **Scalabilité (Croissance)** : MongoDB est conçu pour gérer des millions de documents. Quand Stockman aura 1 million d'utilisateurs, on pourra simplement ajouter des serveurs sans changer l'architecture.

## 4. Prochaine étape : L'Explorateur de Données

Pour que tu puisses **voir** concrètement tes données, je te propose de passer à la **Phase 27** : Créer un "Explorateur de Données" dans ton Dashboard Admin.
Tu pourras cliquer sur "Utilisateurs", "Produits" ou "Ventes" et voir exactement comment ils sont stockés, ce qui t'aidera beaucoup à comprendre ton business.
