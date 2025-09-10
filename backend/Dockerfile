# Backend Dockerfile - ParkSync
FROM node:18-alpine

# Métadonnées
LABEL maintainer="ParkSync Team"
LABEL description="Backend Node.js pour ParkSync IoT Blockchain"
LABEL version="1.0.0"

# Installer des outils système utiles
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S parksync -u 1001

# Répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --only=production && \
    npm cache clean --force

# Copier le code source
COPY . .

# Créer les répertoires nécessaires
RUN mkdir -p logs uploads temp && \
    chown -R parksync:nodejs /app

# Changer vers l'utilisateur non-root
USER parksync

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3001
ENV LOG_LEVEL=info

# Exposer le port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Point d'entrée avec dumb-init pour une gestion propre des signaux
ENTRYPOINT ["dumb-init", "--"]

# Commande par défaut
CMD ["node", "src/server.js"]
