# Legacy Control Lab — production image (HTTP + websockify + TN5250 host)
FROM node:20-bookworm-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
# Install with build tools so better-sqlite3 compiles once in this stage.
RUN npm ci

COPY tsconfig.json ./
COPY scripts/copyRuntimeAssets.mjs ./scripts/copyRuntimeAssets.mjs
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV HTTP_PORT=8080
ENV WEBSOCKIFY_PORT=6080
ENV TN5250_PORT=8023
ENV DATABASE_PATH=/app/data/claims400.db
ENV DEV_FRAME_LOG=false
ENV SERVE_IRONTERM=true
ENV SYSTEM_NAME=CLAIMS400

COPY package.json package-lock.json ./
# Reuse modules (and the compiled better-sqlite3 binary) from the build stage.
# Production does not need Python/make/g++.
COPY --from=build /app/node_modules ./node_modules
RUN npm prune --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY external ./external
COPY public ./public
COPY data ./data
COPY docs ./docs

RUN mkdir -p /app/data/reports

EXPOSE 8080 6080 8023

CMD ["node", "dist/server.js"]
