FROM node:20-alpine AS base

# ── Install dependencies ──────────────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/storefront/package.json ./apps/storefront/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/billing/package.json ./packages/billing/
COPY packages/email/package.json ./packages/email/
COPY packages/permissions/package.json ./packages/permissions/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config-typescript/package.json ./packages/config-typescript/
COPY packages/config-eslint/package.json ./packages/config-eslint/
RUN npm ci

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_ADMIN_URL
ARG NEXT_PUBLIC_LEAGUE_URL
ARG NEXT_PUBLIC_DASHBOARD_URL
ARG NEXT_PUBLIC_STOREFRONT_URL
ARG NEXT_PUBLIC_PLATFORM_DOMAIN
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL
ENV NEXT_PUBLIC_LEAGUE_URL=$NEXT_PUBLIC_LEAGUE_URL
ENV NEXT_PUBLIC_DASHBOARD_URL=$NEXT_PUBLIC_DASHBOARD_URL
ENV NEXT_PUBLIC_STOREFRONT_URL=$NEXT_PUBLIC_STOREFRONT_URL
ENV NEXT_PUBLIC_PLATFORM_DOMAIN=$NEXT_PUBLIC_PLATFORM_DOMAIN

RUN npx turbo build --filter=@goparticipate/storefront

# ── Production image ──────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/storefront/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/.next/static ./apps/storefront/.next/static

USER nextjs

EXPOSE 4004
ENV PORT=4004
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/storefront/server.js"]
