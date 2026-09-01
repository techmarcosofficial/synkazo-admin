# ─────────────────────────────────────────────────────────────────────────────
# Vite + React admin panel — builds a static bundle then serves it via nginx.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV CI=true

# pnpm@11 matches the pnpm-lock.yaml in the repo (npm ci fails here — no
# package-lock.json). corepack ships with Node 22 and pins the version
# from package.json's packageManager field where set.
RUN corepack enable && corepack prepare pnpm@11 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# VITE_* values are baked into the client bundle at build time (Vite exposes
# any process.env var prefixed with VITE_ via import.meta.env — no vite.config
# wiring needed). Pass them as docker-compose build.args so the image is
# deploy-ready. Defaults keep the image usable without any build args.
ARG VITE_API_BASE_URL=http://localhost:3001/api
ARG VITE_FRONTEND_URL=https://synkazo.com
ARG VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

RUN pnpm build

# ─────────────────────────────────────────────────────────────────────────────
# Nginx stage — serves the built /dist as a SPA, single-file fallback for
# client-side routes.
# ─────────────────────────────────────────────────────────────────────────────

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
