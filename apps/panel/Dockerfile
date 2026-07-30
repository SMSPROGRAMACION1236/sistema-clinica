FROM node:20-alpine AS base
RUN apk add --no-cache openssl tzdata
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json packages/db/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY apps/panel/package.json apps/panel/package.json
RUN pnpm install --frozen-lockfile --filter @sistema-clinica/panel... --filter @sistema-clinica/db

FROM deps AS build
COPY packages/db packages/db
COPY apps/panel apps/panel
RUN pnpm --filter @sistema-clinica/db run generate
RUN pnpm --filter @sistema-clinica/db run build
RUN pnpm --filter @sistema-clinica/panel run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/apps/panel/.next/standalone ./
COPY --from=build /app/apps/panel/.next/static ./apps/panel/.next/static
COPY --from=build /app/apps/panel/public ./apps/panel/public

WORKDIR /app/apps/panel
EXPOSE 3000
CMD ["node", "server.js"]
