# Immodesk

SaaS de gestion locative multi-canale (espèces, Mobile Money, virement, chèque) pour le Congo-Brazzaville et la zone CEMAC.

## Documentation

Le dossier de cadrage complet est dans [docs/](docs/00_README.md) : lettre de cadrage, architecture, modèle de données, DDL, plan de phases.

## Structure

| Dossier           | Contenu                                                    |
| :---------------- | :--------------------------------------------------------- |
| `apps/api`        | API NestJS (TypeScript, Prisma, BullMQ)                    |
| `apps/web`        | Dashboard Next.js (agences, bailleurs, portail locataire)  |
| `apps/mobile`     | Application Flutter (démarcheurs, bailleurs, locataires)   |
| `packages/shared` | Énumérations, schémas de validation zod, client API généré |
| `infra`           | Docker Compose, scripts de déploiement, CI                 |
| `docs`            | Dossier de cadrage et d'architecture                       |

## Démarrage rapide

1. Prérequis : Node 24, pnpm, Docker Desktop, Flutter 3.41.
2. `pnpm install`
3. `pnpm db:up` pour PostgreSQL 16, Redis et MinIO.
4. `pnpm dev`

Pour visualiser les écrans sans monter toute la pile, avec des données simulées, voir le
[guide de démarrage local](docs/07_guide_de_demarrage_local.md). Il couvre aussi la charte
graphique, les comptes de démonstration et le lancement de l'application mobile.

Voir le README de chaque application pour les détails.
