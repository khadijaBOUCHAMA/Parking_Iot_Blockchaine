#!/bin/sh

# Script d'entrée Docker pour la blockchain ParkSync

set -e

echo "⛓️ Démarrage de la blockchain ParkSync..."

# Afficher les variables d'environnement (sans les secrets)
echo "📊 Configuration blockchain:"
echo "  - RPC URL: ${ETHEREUM_RPC_URL:-'http://localhost:8545'}"
echo "  - Chain ID: ${CHAIN_ID:-'31337'}"
echo "  - Network: ${NETWORK:-'localhost'}"

# Vérifier que les contrats sont compilés
if [ ! -d "artifacts" ]; then
    echo "📄 Compilation des contrats..."
    npx hardhat compile
fi

echo "✅ Contrats compilés"

# Si c'est le nœud Hardhat, démarrer en arrière-plan et déployer
if [ "$1" = "npx" ] && [ "$2" = "hardhat" ] && [ "$3" = "node" ]; then
    echo "🚀 Démarrage du nœud Hardhat..."
    
    # Démarrer Hardhat en arrière-plan
    npx hardhat node --hostname 0.0.0.0 &
    HARDHAT_PID=$!
    
    # Attendre que le nœud soit prêt
    echo "⏳ Attente du nœud Hardhat..."
    sleep 10
    
    # Vérifier que le nœud répond
    for i in $(seq 1 30); do
        if curl -s -X POST -H "Content-Type: application/json" \
           --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
           http://localhost:8545 > /dev/null; then
            echo "✅ Nœud Hardhat prêt"
            break
        fi
        
        if [ $i -eq 30 ]; then
            echo "❌ Timeout: Le nœud Hardhat ne répond pas"
            exit 1
        fi
        
        sleep 2
    done
    
    # Déployer les contrats
    echo "📄 Déploiement des contrats..."
    if npx hardhat run scripts/deploy.js --network localhost; then
        echo "✅ Contrats déployés avec succès"
    else
        echo "⚠️ Erreur lors du déploiement des contrats"
    fi
    
    # Attendre que le processus Hardhat se termine
    wait $HARDHAT_PID
else
    # Exécuter la commande passée en argument
    exec "$@"
fi
