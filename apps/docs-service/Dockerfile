FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/
COPY packages/analyzers/package.json packages/analyzers/
COPY packages/db/package.json packages/db/
ARG SERVICE=docs-service
COPY apps/$SERVICE/package.json apps/$SERVICE/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile 2>/dev/null || pnpm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/$SERVICE/ apps/$SERVICE/

WORKDIR /app/packages/db
RUN npx prisma generate 2>/dev/null || true
WORKDIR /app
RUN pnpm --filter @triefrog/shared-types build 2>/dev/null || true
RUN pnpm --filter @triefrog/shared-utils build 2>/dev/null || true
RUN pnpm --filter @triefrog/analyzers build 2>/dev/null || true
RUN pnpm --filter @triefrog/$SERVICE build

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app/apps/$SERVICE
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages /app/packages
COPY --from=builder /app/apps/$SERVICE/dist ./dist
CMD ["node", "dist/main"]
