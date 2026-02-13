FROM node:22-slim AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile

FROM node:22-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (outputs to ./generated/prisma)
RUN pnpm exec prisma generate

# Skip env validation during build (secrets not available at build time)
ENV SKIP_ENV_VALIDATION=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

RUN node -e " \
  const path = require('path'); \
  const fs = require('fs'); \
  ['@prisma/engines', '@prisma/config'].forEach(mod => { \
    try { \
      const src = path.dirname(require.resolve(mod + '/package.json')); \
      const dest = path.join('/app/node_modules', mod); \
      if (!fs.existsSync(dest)) fs.cpSync(src, dest, { recursive: true }); \
    } catch {} \
  });"

FROM node:22-slim AS runner
WORKDIR /app

# Install OpenSSL for Prisma runtime
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
