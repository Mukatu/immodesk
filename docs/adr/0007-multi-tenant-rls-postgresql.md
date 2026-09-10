# ADR-0007 — Multi-tenant par Row Level Security PostgreSQL

- **Statut** : Accepté
- **Date** : 2026-09-10
- **Décideurs** : Équipe technique fondatrice
- **Phase concernée** : Phase 0

## Contexte

Une agence ne doit jamais voir les données d'une autre. Trois modèles étaient possibles : une base par tenant (isolation maximale, exploitation et migrations ingérables au-delà de quelques dizaines de clients), un schéma par tenant (même difficulté à moindre degré), ou une base partagée filtrée par organization_id. Ce dernier modèle est le seul viable économiquement, mais son point faible est connu : un seul WHERE oublié suffit à provoquer une fuite.

## Décision

Base partagée, colonne organization_id sur toute table métier, et Row Level Security PostgreSQL activée sur chacune d'elles comme dernier rempart. Le contexte est posé par SET LOCAL app.organization_id au début de chaque transaction, depuis un AsyncLocalStorage alimenté par le garde d'authentification. Le rôle applicatif de connexion n'est ni superutilisateur ni BYPASSRLS. Les policies sont versionnées dans prisma/rls/ et appliquées par migration.

## Conséquences

### Positives

- Une erreur applicative ne produit pas une fuite mais zéro ligne.
- Une seule base à exploiter, sauvegarder et migrer.
- Le filet se maintient automatiquement grâce à un test de métadonnée qui échoue si une table porte organization_id sans policy.

### Négatives / dette acceptée

- Attention constante requise avec Prisma (extension dédiée pour poser le contexte).
- PgBouncer imposé en mode transaction pour que SET LOCAL reste correct.
- Léger surcoût de planification.
- Le débogage d'un « 0 ligne » inattendu demande de vérifier le contexte avant le code.

### Réversibilité

Extraire un gros client vers une base dédiée reste possible, le modèle est identique.

## Contrôle invariant

Les tests d'isolation multi-tenant sont bloquants en CI et énumèrent automatiquement toutes les tables du schéma.

## Alternatives écartées

| Option            | Pourquoi écartée                                                                 |
| ----------------- | -------------------------------------------------------------------------------- |
| Base par tenant   | Isolation maximale mais exploitation et migrations ingérables à l'échelle visée. |
| Schéma par tenant | Même difficulté à moindre degré.                                                 |
