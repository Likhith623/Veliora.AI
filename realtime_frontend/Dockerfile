# ============================================================
# Familia Frontend — Next.js 15 on GCP Cloud Run
# Multi-stage build with standalone output
# ============================================================

# --- Stage 1: Install dependencies ---
FROM node:18-alpine AS deps

WORKDIR /app

# Install libc6 for sharp (image optimization)
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# --- Stage 2: Build the application ---
FROM node:18-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (these get baked into the client bundle)
# Set via --build-arg in Cloud Build or deploy script
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- Stage 3: Production image ---
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
# Create public dir in case it's empty (COPY fails on missing dirs)
RUN mkdir -p /app/public
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Cloud Run injects PORT (defaults to 3000)
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1

# Next.js standalone server
CMD ["node", "server.js"]
