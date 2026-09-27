# ==============================================================================
# ERPfy.net Multi-Stage Production Dockerfile
# ==============================================================================

# --- Stage 1: Base & Dependencies ---
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# --- Stage 2: Build Stage ---
FROM base AS builder
WORKDIR /app
COPY . .
ENV NODE_ENV=production
RUN npm run typecheck
RUN npm run lint
RUN npm test
RUN npm run build

# --- Stage 3: Production Runner ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Non-root user for maximum container security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 erpfy

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts

USER erpfy

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/live || exit 1

CMD ["npm", "start"]
