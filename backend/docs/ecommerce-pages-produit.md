# Pages produit, partage et référencement de la boutique en ligne

## Une adresse pour chaque produit

Chaque produit publié sur la boutique en ligne a sa propre adresse :

- sur l'adresse Stockman : `app.stockman.pro/shop/nom-de-la-boutique/produit/<identifiant du produit>` ;
- sur un domaine connecté et vérifié : `www.votredomaine.com/produit/<identifiant du produit>`.

Quand un visiteur ouvre un produit sur le site, sa fiche s'affiche par-dessus la vitrine et l'adresse du navigateur devient celle du produit. Fermer la fiche ou appuyer sur « Retour » ramène à la vitrine. Un lien de produit ouvert directement affiche la vitrine avec la fiche du produit déjà ouverte.

Cela fonctionne avec tous les modèles de site : Stockman Basic et les modèles à sections (Atelier, Marché, Vitrine, Éclat, Prestige, Bazar). Dans l'aperçu privé, l'adresse ne change pas.

## Partager un produit

La fiche d'un produit propose un bouton **Partager** :

- sur un téléphone, il ouvre la feuille de partage du téléphone (WhatsApp, Messenger, SMS, etc.) ;
- sinon, il propose **Envoyer sur WhatsApp** et **Copier le lien**.

Le lien partagé affiche un aperçu avec la photo du produit, son nom et son prix dans WhatsApp, Facebook et les autres applications qui lisent les aperçus de liens. Sans photo, l'aperçu montre le nom et le prix.

Pour partager un produit, le commerçant ouvre son site (bouton E-com > Voir le site), ouvre le produit puis touche **Partager**. Le bouton n'apparaît pas dans l'aperçu privé.

Un lien vers un produit retiré du site (désactivé, sans prix, ou en rupture quand les ruptures sont masquées) ouvre simplement la vitrine.

## Référencement sur Google

- Chaque page produit donne à Google son titre, sa description, sa photo, son prix, sa devise et sa disponibilité (données structurées « Product »).
- Quand la boutique a un domaine connecté et vérifié, les pages produit indiquent ce domaine comme adresse de référence, pour éviter les doublons avec l'adresse Stockman.
- Chaque boutique a un plan du site qui liste la vitrine et ses produits : `/shop/nom-de-la-boutique/sitemap.xml` sur l'adresse Stockman, `/sitemap.xml` sur un domaine connecté. Le fichier `robots.txt` l'indique aux moteurs de recherche.
- Les aperçus privés ne sont jamais référencés.

## Photos des produits et catalogue

- Les photos des produits ne sont plus recopiées dans le catalogue du site : chaque photo a sa propre adresse et le navigateur la garde en mémoire. Le site se charge plus vite, surtout sur les réseaux mobiles, et chaque produit peut avoir une photo sans alourdir la boutique.
- Une photo modifiée dans la fiche produit change d'adresse : le site affiche toujours la dernière photo.
- Le site public affiche jusqu'à 5 000 produits (contre 2 000 auparavant), triés par nom.

## Panier conservé

Le panier du visiteur est gardé sur son appareil. Il survit à une page rechargée ou fermée, par exemple dans le navigateur intégré de WhatsApp. À son retour, le prix et le stock viennent toujours du catalogue publié : un produit retiré du site disparaît du panier, et une quantité supérieure au stock disponible est ramenée à ce stock. Le panier est vidé après l'envoi de la commande. Le panier de l'aperçu privé n'est jamais gardé.

## Questions fréquentes

| Question | Réponse |
|---|---|
| Comment envoyer un produit à un client sur WhatsApp ? | Ouvrez votre site, ouvrez le produit, touchez « Partager » puis choisissez WhatsApp. Le client reçoit un lien avec la photo et le prix. |
| Pourquoi l'aperçu WhatsApp n'affiche pas de photo ? | Le produit n'a pas de photo dans Stockman. Ajoutez-en une dans sa fiche produit. WhatsApp peut garder un ancien aperçu en mémoire quelque temps. |
| Le lien d'un produit marche-t-il sur mon domaine ? | Oui, une fois le domaine vérifié : www.votredomaine.com/produit/… |
| Mon client a fermé la page : son panier est-il perdu ? | Non, il le retrouve en revenant sur le site depuis le même téléphone et le même navigateur. |
