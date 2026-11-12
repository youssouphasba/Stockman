# Paiement des commandes en ligne

Dans une boutique en ligne Stockman, le client paie le commerçant directement, en une seule fois : le total comprend les articles et, si le client a choisi Denkma, la livraison. Stockman ne reçoit et ne garde jamais cet argent. Il affiche au client le compte sur lequel payer, puis suit l'état du paiement.

## Régler les moyens de paiement

Le bloc « Paiement des commandes » se trouve dans Paramètres > Site e-commerce (Boutique en ligne sur mobile Starter), rubrique « Paiement ». Le commerçant y indique :

- **Wave** : son numéro Wave, le nom affiché dans Wave (le client le vérifie avant de payer) et, s'il en a un, le lien de paiement fourni par Wave Business ;
- **Orange Money** : son numéro Orange Money et le nom affiché ;
- **Accepter le paiement à la livraison** : activé, le client peut choisir de payer à la réception ; désactivé, il doit payer avec Wave ou Orange Money avant la préparation ;
- **Autres consignes de paiement** : un texte libre facultatif (virement, espèces au retrait en boutique, délai de paiement).

Un moyen de paiement est proposé aux clients dès que son numéro est renseigné et enregistré avec « Enregistrer », bouton qui apparaît dès qu'une modification est en attente. Le commerçant peut renseigner Wave, Orange Money ou les deux. Sans aucun numéro, la boutique fonctionne comme avant : le client lit seulement les consignes écrites.

## Ce que voit le client

Dans le panier, le client choisit « Payer avec Wave », « Payer avec Orange Money » ou « Payer à la livraison », selon ce que la boutique propose. Après « Commander et payer », la page de paiement de sa commande s'affiche :

1. le total à payer, livraison comprise ;
2. le numéro Wave ou Orange Money de la boutique, avec « Copier le numéro », le nom du compte à vérifier et, si la boutique a donné un lien Wave, « Ouvrir Wave » ;
3. le bouton « J'ai payé », à toucher une fois le paiement envoyé.

La boutique est alors prévenue. Dès qu'elle confirme, la page du client affiche « Paiement confirmé par la boutique » toute seule. Si le client quitte la page pour payer dans l'application de son opérateur, il la retrouve en revenant sur la boutique, sur le même appareil. Un client qui a choisi le paiement à la livraison peut quand même payer tout de suite depuis cette page.

## Confirmer un paiement dans Stockman

Chaque commande en ligne affiche l'état de son paiement :

- « Paiement Wave attendu » ou « Paiement Orange Money attendu » : le client a vu le numéro et le montant ;
- « Le client dit avoir payé » : il a touché « J'ai payé » ; le commerçant reçoit une notification « Paiement à vérifier » ;
- « Paiement à la livraison » : le client paiera à la réception ;
- « Payée » : le commerçant a confirmé avoir reçu l'argent.

Le commerçant vérifie sur son compte Wave ou Orange Money que l'argent est arrivé, puis touche « Paiement reçu ». Une commande nouvelle est confirmée du même geste, et le client qui a laissé son e-mail est prévenu. Si le client a choisi la livraison Denkma, le transport est réservé à ce moment ; l'enlèvement n'est demandé qu'au geste « Prête ». Une confirmation faite par erreur s'annule avec « Paiement confirmé par erreur », tant que la commande n'est pas livrée.

La commande met en avant une seule « Prochaine étape » : confirmer le paiement, confirmer la commande, la marquer « Prête », puis la livrer. Les autres gestes restent disponibles en dessous. Si le client devait payer avant la livraison et ne l'a pas fait, Stockman le signale au moment de marquer la commande « Prête ».

## Questions fréquentes

- **Stockman prélève-t-il une commission sur ces paiements ?** Non. L'argent va directement du client au compte Wave ou Orange Money du commerçant. Les frais éventuels sont ceux de l'opérateur.
- **Le livreur Denkma encaisse-t-il la commande ?** Non. Le livreur transporte le colis ; le paiement des articles se fait toujours entre le client et le commerçant.
- **Le client dit avoir payé, mais rien n'est arrivé.** Ne confirmez pas le paiement. Contactez le client avec le numéro de la commande et vérifiez avec lui le numéro et le montant envoyés.
- **« Ce numéro Wave (ou Orange Money) n'est pas reconnu »** : saisissez le numéro comme dans l'application de l'opérateur, par exemple 77 123 45 67, ou au format international avec l'indicatif.
- **« Le lien de paiement doit être un lien Wave »** : seul un lien https du domaine wave.com est accepté ; laissez le champ vide si vous n'en avez pas.

## Règles par pays et par livraison

- Wave et Orange Money sont proposés aux boutiques du Sénégal (compte en XOF). Une boutique d'un autre pays garde sa boutique en ligne : le réglage n'affiche que les consignes de paiement écrites, que le client lit avant de commander.
- Une commande livrée par Denkma ne propose pas « Payer à la livraison » : le livreur Denkma n'encaisse jamais pour la boutique, le client paie donc avant le départ du colis.
- Si le commerçant fait partir une commande dont le paiement n'est pas confirmé, la commande affiche « Expédiée sans paiement confirmé » jusqu'à « Paiement reçu ».
- À la livraison, la vente enregistrée reprend le moyen de paiement de la commande : Wave et Orange Money sont classés en paiement mobile, pas en espèces.
- Dès que le paiement d'une commande est confirmé, ses articles sont réservés : ils sortent du stock tout de suite, pour qu'une vente en caisse ne les prenne pas avant la livraison. Si la commande est annulée avant la livraison, les articles reviennent en stock.
- Livrer une commande dont le paiement n'est pas confirmé fait apparaître une question : « Le client a payé » enregistre la vente comme payée ; « Pas encore payé : vente à crédit » enregistre une vente à crédit, et le montant s'ajoute à la dette du client. Un « Paiement reçu » ultérieur solde cette dette, une seule fois.
- Dans Finances, la vue E-com affiche ces commandes dans « À encaisser » ; la vue Trésorerie les compte dans les créances clients.
