# ADR-013 — Le web installable comme surface universelle, Flutter pour le terrain

- **Statut** : Accepté
- **Date** : 2026-09-22
- **Décideurs** : Porteur du produit, responsable technique
- **Phase concernée** : Phase 8 (et cible au-delà)

## Contexte

Deux documents du projet décrivent le rôle du mobile sans se rejoindre. `docs/_DECISIONS_COMMUNES.md` place sur Flutter « démarcheurs, bailleurs, locataires » et promet au gestionnaire indépendant un « onboarding mobile-first en moins de 10 minutes ». `docs/04_plan_de_phases.md` réduit la phase 5 au démarcheur, avec « un mode démarcheur au périmètre volontairement restreint ».

Ce n'est pas une contradiction mais une désynchronisation : le premier décrit la destination, le second l'étape construite en premier. Aucun ADR n'arbitrait la question, et l'écart s'est creusé sans être nommé.

Constat au 22 septembre 2026 : le tableau de bord web compte 76 routes métier, l'application Flutter 53 écrans répartis sur 19 fonctionnalités. Un bailleur indépendant sur téléphone ne peut aujourd'hui ni émettre une facture, ni délivrer une quittance, ni lancer une relance, ni gérer les cautions, ni créer un immeuble, un locataire ou un bail. Or les personas du cadrage placent les bailleurs indépendants multi-lots et mono-lot au cœur de la cible, et le référentiel technique affirme déjà que « le dashboard est réellement utilisé sur téléphone par les gestionnaires ».

Amener Flutter à parité représente une quarantaine d'écrans à porter, plusieurs phases de travail, et une double maintenance permanente : chaque évolution écrite deux fois, dans deux langages.

## Décision

Le tableau de bord web est la surface universelle. Il est responsive et installable sur l'écran d'accueil : agences, bailleurs indépendants et gestionnaires l'utilisent sur ordinateur comme sur téléphone.

L'application Flutter couvre le travail de terrain hors réseau — encaissement, état des lieux, relevés de compteurs — et le portail bailleur. Elle ne vise pas la parité fonctionnelle avec le web à ce stade.

La parité mobile complète reste la cible du produit : démarcheurs, bailleurs et locataires sur Flutter, avec l'onboarding mobile-first promis au gestionnaire indépendant. Cette cible est différée, non abandonnée. Le présent ADR fige l'étape, pas la destination.

## Conséquences

### Positives

- Un seul code porte l'essentiel des fonctionnalités : une évolution métier est écrite une fois.
- Le bailleur indépendant dispose d'un outil utilisable sur téléphone immédiatement, sans attendre que Flutter rattrape 76 routes.
- Les mises à jour sont instantanées : aucun passage en magasin, aucune action de l'utilisateur.
- Flutter garde le seul terrain qu'il est seul à pouvoir tenir — le hors-ligne réel, qu'un site ne fera jamais.

### Négatives / dette acceptée

- **iOS est le point faible.** Pas d'invite d'installation : l'utilisateur doit passer par le menu Partager. Apple n'autorise aucun équivalent du Trusted Web Activity : un site installé ne sera jamais dans l'App Store.
- L'icône d'écran d'accueil iOS exige un PNG ; l'icône actuelle est un SVG, donc iOS retombera sur une capture de page tant qu'un outil de génération d'image n'est pas ajouté au projet.
- Aucune présence en magasin tant que l'application Flutter n'est pas préparée pour la publication : sa signature de version pointe encore sur la clé de débogage, ses icônes sont celles par défaut, et la CI ne la compile pas.
- L'expérience installée dépend du réseau : le service worker ne met volontairement rien en cache hors une page de repli, Immodesk manipulant des données financières.

### Réversibilité

Élevée et bon marché. Rien de ce qui est construit pour le web installable n'est perdu si la parité mobile est reprise : le manifeste, l'icône et le service worker représentent quelques fichiers, et les listes en cartes servent de toute façon l'usage sur téléphone. Le déclencheur d'un retour en arrière est commercial, non technique — si la présence en magasin devient nécessaire à l'acquisition, le chantier à ouvrir est la préparation de publication de Flutter, pas le démantèlement du web installable.

## Alternatives écartées

| Option                                                           | Pourquoi écartée                                                                                                                    |
| :--------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| Porter les 76 routes vers Flutter dès maintenant                 | Une quarantaine d'écrans, plusieurs phases, et surtout une double maintenance définitive de deux bases de code pour un même métier. |
| Emballer le web dans une Trusted Web Activity pour le Play Store | Faisable sur Android et pertinent à terme, mais c'est un chantier à part entière, et sans équivalent côté iOS.                      |
| Ne rien faire et laisser le bailleur sur le web non installable  | Le tableau de bord restait inconfortable au téléphone, alors que la majorité de la cible y travaillera.                             |
