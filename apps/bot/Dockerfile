FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json packages/db/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY apps/panel/package.json apps/panel/package.json
RUN pnpm install --frozen-lockfile --filter @sistema-clinica/bot... --filter @sistema-clinica/db

FROM deps AS build
COPY packages/db packages/db
COPY apps/bot apps/bot
RUN pnpm --filter @sistema-clinica/db run generate
RUN pnpm --filter @sistema-clinica/db run build
RUN pnpm --filter @sistema-clinica/bot run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/db ./packages/db
COPY --from=build /app/apps/bot/node_modules ./apps/bot/node_modules
COPY --from=build /app/apps/bot/dist ./apps/bot/dist
COPY --from=build /app/apps/bot/package.json ./apps/bot/package.json

WORKDIR /app/apps/bot
EXPOSE 3001
CMD ["node", "dist/index.js"]
