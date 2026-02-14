# Build stage
FROM node:24-alpine AS builder

RUN corepack enable

WORKDIR /app

# Copy package files first for layer caching
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev for the build)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build the application
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm build

# Production stage
FROM node:24-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nuxtjs

# Copy built application (self-contained, no node_modules needed at runtime)
COPY --from=builder /app/.output ./.output

# Copy migration tooling and full node_modules (avoids slow prune/reinstall)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/scripts/db ./scripts/db
COPY --from=builder /app/server/database/migrations ./server/database/migrations
COPY --from=builder /app/node_modules ./node_modules

RUN chown -R nuxtjs:nodejs /app

USER nuxtjs

EXPOSE 3000

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", ".output/server/index.mjs"]
