# ADR-0001 — Monolithe modulaire NestJS 10 + Prisma

- **Statut** : Accepté
- **Date** : 2026-09-10
- **Décideurs** : Équipe technique fondatrice
- **Phase concernée** : Phase 0

## Contexte

Équipe de deux à quatre développeurs, domaine financier fortement transactionnel, budget d'exploitation contraint, besoin d'un contrat d'API partagé entre un web TypeScript et un mobile Dart. Les options étaient : microservices Node, monolithe Laravel/PHP (vivier local plus large à Brazzaville), monolithe modulaire NestJS.

## Décision

Monolithe modulaire NestJS 10 en TypeScript strict, découpé en modules Clean Architecture (domain / application / infrastructure / presentation), ORM Prisma, files BullMQ sur Redis, déployé en trois processus (API, workers, worker PDF) contre une seule base PostgreSQL.

## Conséquences

### Positives

- Une facture, ses allocations et son écriture d'audit commitent dans une seule transaction SQL.
- Le domaine financier est écrit une fois dans packages/shared et consommé sans retranscription.
- L'exploitation tient sur deux VPS.

### Négatives / dette acceptée

- Montée en charge horizontale limitée par la base.
- Recrutement local plus difficile qu'en PHP, compensé par la formation.
- Prisma n'est pas un ORM de domaine riche, d'où le recours encadré à $queryRaw typé pour l'analytique et le rapprochement.

### Réversibilité

Chaque module est extractible en service autonome puisqu'il ne communique que par façade ou événement. Le déclencheur serait un module dont le profil de charge diverge nettement (le rendu PDF est déjà isolé en processus).

## Alternatives écartées

| Option        | Pourquoi écartée                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Microservices | Coût opérationnel sans contrepartie à cette taille d'équipe, et invariants financiers distribués. |
| Laravel       | Duplication du contrat financier entre PHP et TypeScript, payée en incidents.                     |
