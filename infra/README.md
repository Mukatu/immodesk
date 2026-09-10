# Infra — pile de développement local

Cette pile Docker fournit les dépendances de développement d'Immodesk :
PostgreSQL 16, Redis 7, MinIO (S3) et, en option, Mailpit (capture SMTP).

## Démarrage

Depuis la racine du repo :

```bash
pnpm db:up
# équivalent à :
docker compose -f infra/docker/docker-compose.yml up -d
```

Au tout premier démarrage (volume `immodesk_postgres_data` vide), PostgreSQL
exécute automatiquement `infra/docker/init/01-schema.sh`, qui :

1. charge `docs/schema/schema.sql` (71 tables, enums, vues, policies RLS,
   rôles `immodesk_app` et `immodesk_admin`, GRANT complets) ;
2. attribue un mot de passe et le droit de `LOGIN` au rôle `immodesk_app`
   (créé `NOLOGIN` par le schéma) via la variable `IMMODESK_APP_PASSWORD`.

Ce script ne s'exécute qu'une seule fois, tant que le volume de données
persiste. Pour rejouer l'initialisation, voir « Réinitialisation » ci-dessous.

Mailpit est placé sous le profile Docker Compose `mail` et ne démarre pas
avec `up -d` par défaut. Pour le démarrer :

```bash
docker compose -f infra/docker/docker-compose.yml --profile mail up -d
```

## Ports exposés (hôte)

| Service             | Port(s) hôte | Détail                            |
| ------------------- | ------------ | --------------------------------- |
| postgres            | **5440**     | mappé vers 5432 dans le conteneur |
| redis               | 6390         |                                   |
| minio               | 9010 / 9011  | API S3 / console web              |
| mailpit (optionnel) | 1025 / 8025  | SMTP / UI web (profile `mail`)    |

**Important : le port hôte de PostgreSQL est 5440, jamais 5432.** Le port
5432 est déjà utilisé par un PostgreSQL 18 installé localement sur la
machine de développement — ne jamais modifier ce mapping ni le service
local sur 5432.

## Variables d'environnement de la pile

Définies avec des valeurs par défaut inline dans
`infra/docker/docker-compose.yml` (surchargeables via l'environnement ou
`--env-file infra/env/docker.env.example`, voir ce fichier) :

| Variable                | Défaut dev     | Usage                                  |
| ----------------------- | -------------- | -------------------------------------- |
| `POSTGRES_DB`           | `immodesk`     | Nom de la base                         |
| `POSTGRES_USER`         | `immodesk`     | Rôle admin/owner Postgres              |
| `POSTGRES_PASSWORD`     | `immodesk`     | Mot de passe du rôle admin/owner       |
| `IMMODESK_APP_PASSWORD` | `immodesk_app` | Mot de passe attribué à `immodesk_app` |
| `MINIO_ROOT_USER`       | `immodesk`     | Utilisateur admin MinIO                |
| `MINIO_ROOT_PASSWORD`   | `immodesk123`  | Mot de passe admin MinIO               |

Ces valeurs correspondent exactement à celles utilisées dans `.env.example`
à la racine du repo (`DATABASE_URL`, `DATABASE_ADMIN_URL`, `S3_*`, etc.).

## Réinitialisation complète

Pour repartir d'un état vierge (supprime aussi les volumes, donc les
données Postgres/Redis/MinIO — l'init du schéma sera rejouée au prochain
démarrage) :

```bash
docker compose -f infra/docker/docker-compose.yml down -v
pnpm db:up
```

## Fichiers

- `infra/docker/docker-compose.yml` — définition des services.
- `infra/docker/init/01-schema.sh` — script d'initialisation du schéma,
  exécuté automatiquement au premier démarrage de PostgreSQL.
- `infra/env/docker.env.example` — variables de la pile Docker, utilisable
  avec `--env-file`.
- `.env.example` (racine du repo) — variables applicatives (backend/front),
  cohérentes avec les credentials de cette pile.
