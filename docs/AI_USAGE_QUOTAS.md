# Quotas IA par plan

## Objectif

Ce document decrit les limites d'utilisation appliquees aux fonctions IA afin de maitriser les couts tout en conservant une valeur produit claire selon le plan.

Les quotas doivent etre interpretes avec le plan effectif de l'utilisateur :

- `starter`
- `pro`
- `enterprise`

Les fonctions non autorisees pour un plan doivent retourner un message clair indiquant le plan requis.

## Regles validees

### Starter

- Assistant IA : 30 utilisations par mois
- Scan de facture : 2 utilisations par mois
- Resume quotidien : 1 utilisation par jour
- Caisse vocale : 4 utilisations par mois
- Conseil de reapprovisionnement : 4 utilisations par mois
- Suggestion de categorie : 30 utilisations par mois
- Detection d'anomalies : non disponible
- Suggestion de prix : non disponible
- Generation de description : non disponible

### Pro

- Assistant IA : 120 utilisations par mois
- Scan de facture : 10 utilisations par mois
- Resume quotidien : 1 utilisation par jour
- Caisse vocale : 12 utilisations par mois
- Detection d'anomalies : 12 utilisations par mois
- Conseil de reapprovisionnement : 12 utilisations par mois
- Suggestion de categorie : 100 utilisations par mois
- Suggestion de prix : non disponible
- Generation de description : non disponible

### Enterprise

- Assistant IA : 500 utilisations par mois
- Scan de facture : 50 utilisations par mois
- Resume quotidien : 1 utilisation par jour
- Caisse vocale : 40 utilisations par mois
- Detection d'anomalies : 40 utilisations par mois
- Conseil de reapprovisionnement : 40 utilisations par mois
- Suggestion de prix : 120 utilisations par mois
- Suggestion de categorie : 300 utilisations par mois
- Generation de description : 300 utilisations par mois

## Fonctionnalites concernees

- `/ai/support`
- `/ai/scan-invoice`
- `/ai/daily-summary`
- `/ai/voice-to-cart`
- `/ai/detect-anomalies`
- `/ai/replenishment-advice`
- `/ai/suggest-price`
- `/ai/suggest-category`
- `/ai/generate-description`

## Regles de reponse produit

- Le resume quotidien doit etre presente comme une fonctionnalite utilisable une seule fois par jour.
- La caisse vocale doit etre presente comme disponible sur tous les plans, avec un quota mensuel selon l'offre.
- La suggestion de prix doit etre presente comme reservee au plan Enterprise.
- La generation de description doit etre presente comme reservee au plan Enterprise.
- La detection d'anomalies doit etre presente comme reservee aux plans Pro et Enterprise.
- Les messages de blocage doivent rester clairs et mentionner le type de limite ou le plan requis.
