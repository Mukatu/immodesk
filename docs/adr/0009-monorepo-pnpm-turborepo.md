# ADR-0009 — Monorepo unique pnpm + Turborepo

- **Statut** : Accepté
- **Date** : 2026-09-10
- **Décideurs** : Équipe technique fondatrice
- **Phase concernée** : Phase 0

## Contexte

Quatre livrables partagent un même domaine financier : l'API NestJS, le web Next.js, le mobile Flutter et l'infrastructure. Le risque majeur d'un découpage en dépôts séparés est la dérive du contrat : un statut de paiement ajouté côté API, oublié côté web, mal interprété côté mobile.

## Décision

Monorepo unique : apps/api, apps/web, apps/mobile, packages/shared (enums, schémas zod, catalogue d'erreurs, formatage XAF, matrice de permissions), infra/, docs/. Orchestration par pnpm workspaces et Turborepo (cache local et distant, graphe de tâches). Le mobile, en Dart, ne partage pas le code TypeScript mais consomme le client Dart généré depuis openapi.json, lui-même produit par l'API et versionné dans le dépôt.

## Conséquences

### Positives

- Un changement de contrat traverse l'API, le web et le client mobile dans une seule PR, et la CI échoue si openapi.json régénéré diffère du fichier versionné.
- Une seule configuration de lint, de formatage et de commits.
- Atomicité des migrations et du code qui les accompagne.

### Négatives / dette acceptée

- Dépôt volumineux (le mobile pèse).
- CI plus longue si le filtrage par périmètre n'est pas soigné — d'où l'usage systématique de turbo run --filter et du cache distant.
- Les droits d'accès sont uniformes sur tout le dépôt.

### Réversibilité

Une extraction reste possible avec git subtree, mais elle réintroduirait le risque de dérive du contrat qui motive cette décision.

## Alternatives écartées

| Option | Pourquoi écartée |
| --- | --- |
| Dépôts séparés par application | Dérive du contrat entre API, web et mobile, coordination manuelle des versions. |
