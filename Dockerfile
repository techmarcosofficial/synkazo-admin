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
