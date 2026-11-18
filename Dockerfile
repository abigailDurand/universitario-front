# uni-panel: compila React con Vite y lo sirve con Nginx sin root (usuario nginx, uid 101).

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.js ./
COPY src/ ./src/
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/proxy-comun.inc /etc/nginx/conf.d/proxy-comun.inc
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
