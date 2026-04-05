# Guide - Quotas IA et detection de doublons

## Objectif

Ce guide explique le comportement de la detection de doublons (produits et fournisseurs) quand le quota IA est atteint.

## Comportement applique

- Si le quota mensuel est disponible, l'analyse des doublons fonctionne normalement.
- Si le quota mensuel est atteint, la detection est suspendue temporairement.
- Un message d'information est affiche dans les ecrans **Stock** et **Fournisseurs**.

## Pourquoi ce changement

- Eviter les appels repetes vers l'API quand la limite est deja atteinte.
- Eviter les erreurs 429 en boucle dans la console.
- Donner une information claire a l'utilisateur.

## Ecrans concernes

- Web app -> Stock
- Web app -> Fournisseurs
