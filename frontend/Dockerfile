# Frontend Dockerfile - ParkSync
FROM node:18-alpine AS builder

# Métadonnées
LABEL maintainer="ParkSync Team"
LABEL description="Frontend React pour ParkSync IoT Blockchain"
LABEL version="1.0.0"

# Variables d'environnement de build
ARG VITE_API_URL=http://localhost:3001/api
ARG VITE_WS_URL=http://localhost:3001
ARG VITE_CHAIN_ID=31337
ARG VITE_APP_NAME=ParkSync
ARG VITE_APP_VERSION=1.0.0

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_CHAIN_ID=$VITE_CHAIN_ID
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --only=production && npm cache clean --force

# Copier le code source
COPY . .

# Build de l'application
RUN npm run build

# Stage de production avec Nginx
FROM nginx:alpine

# Installer des outils utiles
RUN apk add --no-cache curl

# Copier la configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/nginx.conf

# Copier les fichiers buildés depuis le stage builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copier le script d'entrée
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Exposer le port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

# Point d'entrée
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
