# Scalabilite backend catalogue

Ce lot renforce le backend sur les points les plus rentables a court terme :

- cache IA compatible Redis via `REDIS_URL`, avec repli automatique sur le cache memoire existant ;
- index MongoDB cibles pour les ecrans Produits et les endpoints IA les plus consultes ;
- import CSV execute en arriere-plan par job, avec progression stockee en base et reprise possible ;
- aucun changement du contrat API existant.

Effet attendu :

- moins de recalculs IA identiques entre deux ouvertures proches ;
- moins de scans MongoDB inutiles sur `products`, `sales`, `stock_movements`, `customers` et `expenses` ;
- plus de blocage serveur pendant l'import catalogue ;
- une progression visible et relancable si l'utilisateur quitte l'ecran ;
- une alerte de fin d'import visible sur l'ecran Produits, meme si le modal a ete ferme ;
- une meilleure tenue quand le catalogue depasse plusieurs centaines ou milliers de produits.

Ce lot ne remplace pas les prochaines etapes structurelles :

1. pre-calcul de certaines analyses IA ;
2. pagination stricte sur tous les gros endpoints de lecture ;
3. nettoyage progressif des anciens textes corrompus encore visibles dans certaines traductions.
