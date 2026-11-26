# =====================================================================
# @immodesk/api — image de production, construction multi-étapes.
# Deux cibles : `runtime` (par défaut, l'API) et `migrate` (migrations).
#
# Le CONTEXTE DE BUILD est la RACINE du monorepo (le lockfile pnpm y vit) :
#   docker build -f apps/api/Dockerfile -t immodesk/api:local .
# =====================================================================

# ---------------------------------------------------------------------
# Étape 1 — dépendances complètes (production + développement)
# ---------------------------------------------------------------------
FROM node:24-bookworm-slim AS deps
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /repo
# Seuls les manifestes sont copiés d'abord : le cache de couche survit à
# toute modification du code source.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter @immodesk/api --frozen-lockfile

# ---------------------------------------------------------------------
# Étape 2 — génération du client Prisma et compilation TypeScript
# ---------------------------------------------------------------------
FROM deps AS build
WORKDIR /repo
COPY apps/api apps/api
WORKDIR /repo/apps/api
# `prisma generate` n'ouvre aucune connexion : une URL factice suffit, la
# vraie DATABASE_URL est fournie au démarrage du conteneur.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN pnpm exec prisma generate && pnpm exec nest build

# ---------------------------------------------------------------------
# Cible « migrate » — tâche ponctuelle `prisma migrate deploy`
# ---------------------------------------------------------------------
# Le CLI Prisma est une dépendance de développement : il vit dans cette étape,
# jamais dans l'image d'exécution. Lancée avec DATABASE_ADMIN_URL (propriétaire
# du schéma) par le service `migrate` de infra/deploy/docker-compose.yml.
FROM build AS migrate
WORKDIR /repo/apps/api
ENV DATABASE_URL=""
USER node
CMD ["node_modules/.bin/prisma", "migrate", "deploy"]

# ---------------------------------------------------------------------
# Étape 3 — dépendances de production uniquement
# ---------------------------------------------------------------------
FROM deps AS prod-deps
WORKDIR /repo
# `--ignore-scripts` : le script `prepare` de la racine (husky, outil de
# développement) échouerait, et le client Prisma est déjà généré et compilé.
RUN pnpm install --filter @immodesk/api --frozen-lockfile --prod --ignore-scripts

# ---------------------------------------------------------------------
# Étape 4 — image d'exécution
# ---------------------------------------------------------------------
FROM node:24-bookworm-slim AS runtime
# Chromium du système pour Puppeteer (quittances, contrats, états des lieux en
# PDF) : le téléchargement du navigateur empaqueté est désactivé dans
# pnpm-workspace.yaml (allowBuilds). Polices : rendu correct des accents.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates tini \
       chromium fonts-dejavu-core fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
# Même arborescence que le monorepo : les liens symboliques pnpm de
# apps/api/node_modules pointent vers ../../node_modules/.pnpm (racine).
WORKDIR /app/apps/api

COPY --from=prod-deps --chown=node:node /repo/node_modules /app/node_modules
COPY --from=prod-deps --chown=node:node /repo/apps/api/node_modules /app/apps/api/node_modules
COPY --from=build --chown=node:node /repo/apps/api/dist /app/apps/api/dist
# Le schéma accompagne l'image (référence) ; les migrations sont appliquées par
# la cible `migrate`, qui seule embarque le CLI Prisma.
COPY --from=build --chown=node:node /repo/apps/api/prisma /app/apps/api/prisma
COPY --from=build --chown=node:node /repo/apps/api/package.json /app/apps/api/package.json

# L'API ne tourne jamais en root.
USER node

EXPOSE 3000

# Sonde applicative : `status: degraded` reste un 200, seule une API morte
# fait échouer la sonde.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# tini assure la transmission des signaux (arrêt propre, hooks NestJS).
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/main.js"]
