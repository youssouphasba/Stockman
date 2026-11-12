# Adresse et nom de domaine du site e-commerce

## Adresse Stockman

Chaque boutique dispose d'un site public à l'adresse `https://app.stockman.pro/shop/` suivie d'une fin d'adresse tirée du nom de la boutique, au moment de la création du site. Les lettres accentuées sont converties et les espaces deviennent des tirets : une boutique « Senlab » a l'adresse `https://app.stockman.pro/shop/senlab`, une boutique « Épicerie Senlab » `https://app.stockman.pro/shop/epicerie-senlab`. Si l'adresse est déjà prise par une autre boutique, un numéro est ajouté (`senlab-2`). Renommer la boutique ensuite ne change pas l'adresse. L'adresse exacte est affichée dans Paramètres > Boutique en ligne. Il n'existe pas d'adresse du type `senlab.stockman.pro`.

L'adresse Stockman reste toujours active, même quand un nom de domaine est connecté.

## Connecter son propre nom de domaine

Le commerçant doit d'abord posséder le domaine, acheté chez un fournisseur (OVHcloud, GoDaddy, Namecheap, Cloudflare ou autre). La carte du domaine se trouve dans Paramètres > Site e-commerce (Boutique en ligne sur mobile Starter), rubrique « Nom de domaine ». Tous les abonnements la gèrent depuis l'application mobile ; sur le web, la gestion est réservée à Enterprise, et Starter et Pro y voient seulement l'état du domaine.

1. Saisir le domaine, sans `https://`, puis toucher « Connecter ce domaine ». Avec `senlab.com` (ou `www.senlab.com`), le site s'ouvrira sur `www.senlab.com` et `senlab.com` y redirigera. Un sous-domaine comme `boutique.senlab.com` est aussi accepté : il est alors connecté seul.
2. Chez le fournisseur du domaine, dans la gestion DNS, créer les enregistrements affichés par Stockman. Pour `senlab.com`, il y en a deux : un CNAME nommé `www` vers la valeur indiquée, et un enregistrement A nommé `@` vers l'adresse IP indiquée. Chaque valeur se copie avec le bouton « Copier ». Il faut supprimer les anciens enregistrements A, AAAA ou CNAME sur ces mêmes noms. Certains fournisseurs demandent le nom complet (`www.senlab.com`) au lieu du nom court (`www`).
3. Revenir dans Stockman et toucher « Vérifier maintenant ». La prise en compte des enregistrements prend en général quelques minutes, parfois jusqu'à 48 heures. Tant que le domaine attend, une vérification se fait aussi à chaque ouverture de la carte.

Le site ne passe sur le domaine qu'une fois tout prêt ; jusque-là, il reste servi à l'adresse Stockman.

## États affichés

- « En attente de vos réglages DNS » : les enregistrements ne sont pas encore visibles ou ne sont pas corrects.
- « Preuve de propriété demandée » : le domaine a déjà servi pour un autre site ; un enregistrement TXT supplémentaire (nommé `_vercel`) est affiché et doit être ajouté.
- « Sécurisation en cours » : le DNS est correct et le certificat HTTPS est en cours de création, en général en quelques minutes.
- « Activation par Stockman » : le DNS est correct, mais l'équipe Stockman doit encore activer le domaine sur ses serveurs. Si cela dure plus d'une journée, contacter le support.
- « Domaine connecté » : le site est en ligne sur `https://www.senlab.com`. La carte indique aussi si `senlab.com` redirige bien vers `www.senlab.com` ; sinon, vérifier l'enregistrement A sur `@`.

« Retirer ce domaine » déconnecte le domaine : le site reste en ligne à son adresse Stockman. Un domaine ne peut être connecté qu'à une seule boutique Stockman.

## Conseils par fournisseur

- Cloudflare : DNS > Records > Add record. Régler le proxy sur « DNS only » (nuage gris) pour ces enregistrements.
- OVHcloud : Noms de domaine > le domaine > Zone DNS > Ajouter une entrée. Modifier une entrée existante sur le même nom plutôt que d'en créer une seconde.
- GoDaddy : Portefeuille de domaines > DNS > Ajouter un nouvel enregistrement. Les enregistrements A sur `@` et CNAME sur `www` existent souvent déjà : les modifier.
- Namecheap : Domain List > Manage > Advanced DNS > Add new record, avec `@` ou `www` dans le champ Host.
- Autre fournisseur : chercher « Zone DNS », « Gestion DNS » ou « DNS records » dans l'espace client.

## Questions fréquentes

- Le site ne s'ouvre pas encore sur le domaine : vérifier que les anciens enregistrements ont été supprimés, puis relancer la vérification. Sur Cloudflare, désactiver le proxy (nuage gris).
- `senlab.com` ne redirige pas vers `www.senlab.com` : l'enregistrement A sur `@` manque ou pointe ailleurs.
- Le domaine est « déjà connecté à une autre boutique Stockman » : le retirer d'abord de l'autre boutique.
- Le domaine est « déjà utilisé par un autre site chez notre hébergeur » : le retirer de cet autre site (par exemple un ancien site créé avec un autre service), puis réessayer.
