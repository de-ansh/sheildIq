# ShieldIQ backend. Built and run by ../docker-compose.yml alongside Postgres.
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build && rm -rf dist/__tests__

# Production dependencies only: no TypeScript, test tools or the embedded dev database.
FROM base AS deps
RUN pnpm install --prod --frozen-lockfile

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
EXPOSE 5001
CMD ["node", "dist/server.js"]
