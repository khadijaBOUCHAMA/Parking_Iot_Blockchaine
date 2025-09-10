# 🚗 ParkSync IoT Blockchain

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8+-red.svg)](https://soliditylang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8+-green.svg)](https://www.mongodb.com/)

Un système intelligent de gestion de parkings utilisant l'IoT, l'Intelligence Artificielle et la blockchain pour optimiser l'utilisation des espaces de stationnement urbains.

## 🌟 Fonctionnalités Principales

### 🅿️ Gestion Intelligente des Parkings
- **Surveillance en temps réel** : Capteurs IoT (ultrasoniques, magnétiques, caméras)
- **Réservation intelligente** : Système de réservation en ligne avec confirmation blockchain
- **Optimisation automatique** : Algorithmes IA pour maximiser l'utilisation des espaces

### 🔗 Intégration Blockchain
- **Smart Contracts** : Contrats intelligents pour les réservations et paiements
- **Transparence** : Traçabilité complète des transactions
- **Sécurité** : Protection contre la fraude et les manipulations

### 📊 Analytics et Reporting
- **Tableaux de bord** : Interfaces administrateur et utilisateur
- **Statistiques en temps réel** : Taux d'occupation, revenus, satisfaction client
- **Prédictions IA** : Anticipation des pics de demande

### 🌐 Architecture Modulaire
- **Backend API** : RESTful API avec WebSocket pour les mises à jour temps réel
- **Frontend React** : Interface moderne et responsive
- **Blockchain** : Smart contracts Ethereum déployés

## 🛠️ Technologies Utilisées

### Backend
- **Node.js** avec **Express.js** pour l'API REST
- **MongoDB** avec **Mongoose** pour la persistance des données
- **Socket.io** pour les communications temps réel
- **Redis** pour le cache et les sessions
- **JWT** pour l'authentification
- **Winston** pour la journalisation

### Frontend
- **React 18** avec **TypeScript**
- **Vite** pour le développement rapide
- **Tailwind CSS** pour le styling
- **React Router** pour la navigation
- **Axios** pour les appels API

### Blockchain
- **Solidity 0.8+** pour les smart contracts
- **Hardhat** pour le développement et les tests
- **OpenZeppelin** pour les contrats sécurisés
- **Ethers.js** pour l'interaction avec la blockchain

### IoT & AI
- **Capteurs physiques** : Ultrasoniques, magnétiques, caméras
- **Algorithmes de fusion** : IA pour combiner les données capteurs
- **Edge Computing** : Traitement local des données

## 📁 Structure du Projet

```
parksync-iot-blockchain/
├── backend/                 # API Backend Node.js
│   ├── src/
│   │   ├── config/         # Configuration DB, Redis
│   │   ├── middleware/     # Auth, erreurs, validation
│   │   ├── models/         # Schémas MongoDB
│   │   ├── routes/         # Routes API
│   │   ├── services/       # Services métier
│   │   ├── sockets/        # WebSocket handlers
│   │   └── utils/          # Utilitaires
│   ├── Dockerfile
│   └── package.json
├── frontend/                # Application React
│   ├── src/
│   │   ├── components/     # Composants UI
│   │   ├── pages/          # Pages de l'application
│   │   ├── services/       # Services API
│   │   ├── hooks/          # Hooks React personnalisés
│   │   └── config/         # Configuration
│   ├── Dockerfile
│   └── package.json
├── blockchain/              # Smart Contracts
│   ├── contracts/          # Contrats Solidity
│   ├── scripts/            # Scripts de déploiement
│   ├── test/               # Tests des contrats
│   └── hardhat.config.js
├── docs/                   # Documentation
└── README.md
```

## 🚀 Installation et Configuration

### Prérequis
- **Node.js** >= 18.0.0
- **MongoDB** (local ou Atlas)
- **Redis** (optionnel, pour le cache)
- **Docker** (recommandé pour le développement)

### 1. Clonage du Repository
```bash
git clone https://github.com/votre-username/parksync-iot-blockchain.git
cd parksync-iot-blockchain
```

### 2. Configuration de l'Environnement

#### Backend (.env)
```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/parksync
REDIS_URL=redis://localhost:6379
JWT_SECRET=votre-secret-jwt
FRONTEND_URL=http://localhost:8080
BLOCKCHAIN_RPC_URL=http://localhost:8545
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api
VITE_BLOCKCHAIN_RPC_URL=http://localhost:8545
```

#### Blockchain (.env)
```env
PRIVATE_KEY=votre-cle-privee
INFURA_PROJECT_ID=votre-project-id
ETHERSCAN_API_KEY=votre-api-key
```

### 3. Installation des Dépendances

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Blockchain
cd ../blockchain
npm install
```

### 4. Démarrage des Services

#### Avec Docker (Recommandé)
```bash
# Démarrer MongoDB et Redis avec Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
docker run -d -p 6379:6379 --name redis redis:latest

# Démarrer l'application
docker-compose up --build
```

#### Démarrage Manuel

**Terminal 1 - Backend :**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend :**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Blockchain :**
```bash
cd blockchain
npx hardhat node
```

### 5. Déploiement des Smart Contracts
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

## 📖 Utilisation

### Interface Utilisateur
- **Page d'accueil** : `http://localhost:8080`
- **Dashboard Utilisateur** : `/dashboard`
- **Dashboard Admin** : `/admin`

### API Endpoints

#### Authentification
```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
```

#### Parkings
```http
GET    /api/parking          # Liste des parkings
GET    /api/parking/:id      # Détails d'un parking
POST   /api/parking          # Créer un parking (Admin)
PUT    /api/parking/:id      # Modifier un parking (Admin)
DELETE /api/parking/:id      # Supprimer un parking (Admin)
```

#### Réservations
```http
GET    /api/reservation      # Mes réservations
POST   /api/reservation      # Nouvelle réservation
PUT    /api/reservation/:id  # Modifier réservation
DELETE /api/reservation/:id  # Annuler réservation
```

#### IoT
```http
GET    /api/iot/status       # Statut des capteurs
POST   /api/iot/sensor-data  # Mise à jour données capteurs
```

## 🔧 Scripts Disponibles

### Backend
```bash
npm run dev      # Démarrage en mode développement
npm run start    # Démarrage en production
npm run test     # Exécution des tests
```

### Frontend
```bash
npm run dev      # Serveur de développement
npm run build    # Build de production
npm run preview  # Prévisualisation du build
```

### Blockchain
```bash
npx hardhat compile    # Compilation des contrats
npx hardhat test       # Exécution des tests
npx hardhat deploy     # Déploiement local
```

## 🧪 Tests

### Tests Backend
```bash
cd backend
npm test
```

### Tests Blockchain
```bash
cd blockchain
npx hardhat test
```

### Tests d'Intégration
```bash
# Tests end-to-end avec Cypress (à implémenter)
npm run test:e2e
```

## 📊 Monitoring et Logs

### Logs Applicatifs
- **Backend** : Logs structurés avec Winston
- **Frontend** : Console logs et monitoring des erreurs
- **Blockchain** : Events des smart contracts

### Métriques
- **Performance** : Temps de réponse API, utilisation CPU/Mémoire
- **Utilisation** : Taux d'occupation des parkings, nombre de réservations
- **Blockchain** : Gas utilisé, transactions confirmées

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

### Guidelines de Développement
- **Code Style** : ESLint et Prettier configurés
- **Tests** : Tests unitaires et d'intégration requis
- **Documentation** : Mise à jour de la documentation pour les nouvelles fonctionnalités
- **Security** : Audit de sécurité pour les smart contracts

## 📚 Documentation Supplémentaire

- [Architecture Système](./docs/architecture.md)
- [API Documentation](./docs/api.md)
- [Smart Contracts](./docs/contracts.md)
- [Guide de Déploiement](./docs/deployment.md)

## 🔒 Sécurité

### Mesures Implémentées
- **Authentification JWT** avec refresh tokens
- **Rate Limiting** sur les endpoints API
- **Validation** des données d'entrée
- **Encryption** des données sensibles
- **Audit Trail** des opérations administrateur

### Bonnes Pratiques
- Utilisation de bibliothèques sécurisées (OpenZeppelin)
- Tests de sécurité des smart contracts
- Mise à jour régulière des dépendances
- Monitoring des vulnérabilités

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.


## 🙏 Remerciements

- OpenZeppelin pour les contrats sécurisés
- Hardhat pour l'environnement de développement blockchain
- La communauté Ethereum pour les standards et outils

---

⭐ **Si ce projet vous plaît, n'hésitez pas à lui donner une étoile !**

📧 **Contact** : contact@parksync.io | 🌐 **Site Web** : [www.parksync.io](https://www.parksync.io)
