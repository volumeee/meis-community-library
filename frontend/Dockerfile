FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY shared ./shared
COPY frontend/index.html frontend/vite.config.ts ./frontend/
COPY frontend/public ./frontend/public
COPY frontend/src ./frontend/src

RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY frontend/nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
