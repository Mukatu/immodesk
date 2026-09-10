# =====================================================================
# @immodesk/api — image de production, construction multi-étapes.
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
# Étape 3 — dépendances de production uniquement
# ---------------------------------------------------------------------
FROM deps AS prod-deps
WORKDIR /repo
RUN pnpm install --filter @immodesk/api --frozen-lockfile --prod
COPY --from=build /repo/node_modules/.prisma /repo/node_modules/.prisma

# ---------------------------------------------------------------------
# Étape 4 — image d'exécution
# ---------------------------------------------------------------------
FROM node:24-bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

COPY --from=prod-deps /repo/node_modules /app/node_modules
COPY --from=prod-deps /repo/apps/api/node_modules /app/node_modules
COPY --from=build /repo/apps/api/dist /app/dist
# Le schéma et les migrations accompagnent l'image : `prisma migrate deploy`
# doit pouvoir être lancé depuis le conteneur.
COPY --from=build /repo/apps/api/prisma /app/prisma
COPY --from=build /repo/apps/api/package.json /app/package.json

# L'API ne tourne jamais en root.
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Sonde applicative : `status: degraded` reste un 200, seule une API morte
# fait échouer la sonde.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# tini assure la transmission des signaux (arrêt propre, hooks NestJS).
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/main.js"]
