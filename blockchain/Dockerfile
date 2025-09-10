# Blockchain Dockerfile - ParkSync
FROM node:18-alpine

# Métadonnées
LABEL maintainer="ParkSync Team"
LABEL description="Blockchain Hardhat pour ParkSync IoT"
LABEL version="1.0.0"

# Installer des outils système
RUN apk add --no-cache \
  curl \
  git \
  python3 \
  make \
  g++ \
  && rm -rf /var/cache/apk/*

# Répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install && npm cache clean --force

# Copier le code source
COPY . .

# Compiler les contrats
RUN npx hardhat compile

# Créer les répertoires nécessaires
RUN mkdir -p data deployments cache

# Variables d'environnement par défaut
ENV PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
ENV ETHEREUM_RPC_URL=http://localhost:8545
ENV CHAIN_ID=31337

# Exposer le port Hardhat
EXPOSE 8545

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545 || exit 1

# Script d'entrée
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
