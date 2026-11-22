FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY backend ./backend
COPY shared ./shared

RUN ./node_modules/.bin/esbuild backend/src/index.ts \
      --bundle --platform=node --format=esm --target=node22 --packages=external \
      --outfile=dist-server/server.mjs \
    && ./node_modules/.bin/esbuild backend/src/scripts/seed.ts \
      --bundle --platform=node --format=esm --target=node22 --packages=external \
      --outfile=dist-server/seed.mjs

FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV API_ONLY=true
ENV PORT=4000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist-server ./dist-server
COPY package.json ./

USER node
EXPOSE 4000

CMD ["node", "dist-server/server.mjs"]
