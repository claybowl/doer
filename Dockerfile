FROM node:lts-trixie-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl git \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY cli/package.json cli/
COPY server/package.json server/
COPY ui/package.json ui/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/adapter-utils/package.json packages/adapter-utils/
# KEEP IN SYNC with packages/adapters/*. Every workspace package manifest must be
# present here or `pnpm install --frozen-lockfile` cannot resolve its workspace
# links. A new adapter that is not listed here breaks the Docker build.
COPY packages/adapters/a2a/package.json packages/adapters/a2a/
COPY packages/adapters/agent-file/package.json packages/adapters/agent-file/
COPY packages/adapters/claude-local/package.json packages/adapters/claude-local/
COPY packages/adapters/codex-local/package.json packages/adapters/codex-local/
COPY packages/adapters/cursor-local/package.json packages/adapters/cursor-local/
COPY packages/adapters/gemini-local/package.json packages/adapters/gemini-local/
COPY packages/adapters/letta-cli/package.json packages/adapters/letta-cli/
COPY packages/adapters/letta-cloud/package.json packages/adapters/letta-cloud/
COPY packages/adapters/letta-code/package.json packages/adapters/letta-code/
COPY packages/adapters/openclaw-gateway/package.json packages/adapters/openclaw-gateway/
COPY packages/adapters/opencode-local/package.json packages/adapters/opencode-local/
COPY packages/adapters/pi-local/package.json packages/adapters/pi-local/
COPY packages/plugins/sdk/package.json packages/plugins/sdk/
COPY patches/ patches/

RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app /app
COPY . .
# `...` includes each package's workspace dependencies. Without it the UI compiles
# against adapter packages whose dist/ does not exist yet and fails with TS2307
# "Cannot find module '@doerai/adapter-*/ui'".
RUN pnpm --filter @doerai/ui... build
RUN pnpm --filter @doerai/plugin-sdk build
RUN pnpm --filter @doerai/server... build
RUN test -f server/dist/index.js || (echo "ERROR: server build output missing" && exit 1)
RUN test -f server/dist/index.js || (echo "ERROR: server build output missing" && exit 1)

FROM base AS production
WORKDIR /app
COPY --chown=node:node --from=build /app /app
RUN npm install --global --omit=dev @anthropic-ai/claude-code@latest @openai/codex@latest opencode-ai \
  && mkdir -p /doer \
  && chown node:node /doer

ENV NODE_ENV=production \
  HOME=/doer \
  HOST=0.0.0.0 \
  PORT=3100 \
  SERVE_UI=true \
  DOER_HOME=/doer \
  DOER_INSTANCE_ID=default \
  DOER_CONFIG=/doer/instances/default/config.json \
  DOER_DEPLOYMENT_MODE=authenticated \
  DOER_DEPLOYMENT_EXPOSURE=private

VOLUME ["/doer"]
EXPOSE 3100

USER node
CMD ["node", "--import", "./server/node_modules/tsx/dist/loader.mjs", "server/dist/index.js"]
