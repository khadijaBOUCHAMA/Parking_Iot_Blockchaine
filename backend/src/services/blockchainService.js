const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.parkingSystemContract = null;
    this.parkingOracleContract = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Configuration du provider
      const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Test de connexion
      const network = await this.provider.getNetwork();
      logger.info(`Connecté au réseau blockchain: ${network.name} (chainId: ${network.chainId})`);

      // Configuration du wallet
      if (process.env.PRIVATE_KEY) {
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        logger.info(`Wallet configuré: ${this.wallet.address}`);
      } else {
        logger.warn('Aucune clé privée configurée - mode lecture seule');
      }

      // Charger les contrats
      await this.loadContracts();
      
      // Configurer les listeners d'événements
      this.setupEventListeners();
      
      this.isInitialized = true;
      logger.info('✅ Service blockchain initialisé avec succès');
      
    } catch (error) {
      logger.error('❌ Erreur lors de l\'initialisation du service blockchain:', error);
      throw error;
    }
  }

  async loadContracts() {
    try {
      // Charger la configuration des contrats
      const configPath = path.join(__dirname, '../../../frontend/src/config/contracts.json');
      
      if (!fs.existsSync(configPath)) {
        logger.warn('Fichier de configuration des contrats non trouvé');
        return;
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Charger les ABIs
      const parkingSystemAbi = this.loadABI('ParkingSystem');
      const parkingOracleAbi = this.loadABI('ParkingOracle');

      if (config.contracts.ParkingSystem.address && parkingSystemAbi) {
        this.parkingSystemContract = new ethers.Contract(
          config.contracts.ParkingSystem.address,
          parkingSystemAbi,
          this.wallet || this.provider
        );
        logger.info(`Contrat ParkingSystem chargé: ${config.contracts.ParkingSystem.address}`);
      }

      if (config.contracts.ParkingOracle.address && parkingOracleAbi) {
        this.parkingOracleContract = new ethers.Contract(
          config.contracts.ParkingOracle.address,
          parkingOracleAbi,
          this.wallet || this.provider
        );
        logger.info(`Contrat ParkingOracle chargé: ${config.contracts.ParkingOracle.address}`);
      }

    } catch (error) {
      logger.error('Erreur lors du chargement des contrats:', error);
    }
  }

  loadABI(contractName) {
    try {
      const abiPath = path.join(__dirname, `../../../frontend/src/abis/${contractName}.json`);
      if (fs.existsSync(abiPath)) {
        const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        return artifact.abi; // Extract only the abi field
      }
      return null;
    } catch (error) {
      logger.error(`Erreur lors du chargement de l'ABI ${contractName}:`, error);
      return null;
    }
  }

  setupEventListeners() {
    if (!this.parkingSystemContract) return;

    // Écouter les événements de réservation
    this.parkingSystemContract.on('ReservationCreated', (reservationId, user, spotId, startTime, endTime, totalCost, event) => {
      logger.info(`Nouvelle réservation: ${reservationId} par ${user} pour la place ${spotId}`);
      this.handleReservationCreated({
        reservationId: reservationId.toString(),
        user,
        spotId: spotId.toString(),
        startTime: new Date(Number(startTime) * 1000),
        endTime: new Date(Number(endTime) * 1000),
        totalCost: ethers.formatEther(totalCost),
        transactionHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber
      });
    });

    // Écouter les changements d'occupation
    this.parkingSystemContract.on('SpotOccupancyChanged', (spotId, isOccupied, user, event) => {
      logger.info(`Changement d'occupation place ${spotId}: ${isOccupied ? 'occupée' : 'libre'} par ${user}`);
      this.handleSpotOccupancyChanged({
        spotId: spotId.toString(),
        isOccupied,
        user,
        transactionHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber
      });
    });

    // Écouter les réservations terminées
    this.parkingSystemContract.on('ReservationCompleted', (reservationId, actualEndTime, actualCost, refundAmount, event) => {
      logger.info(`Réservation terminée: ${reservationId}, coût: ${ethers.formatEther(actualCost)} ETH`);
      this.handleReservationCompleted({
        reservationId: reservationId.toString(),
        actualEndTime: new Date(Number(actualEndTime) * 1000),
        actualCost: ethers.formatEther(actualCost),
        refundAmount: ethers.formatEther(refundAmount),
        transactionHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber
      });
    });

    logger.info('✅ Event listeners configurés');
  }

  // Méthodes pour interagir avec les contrats
  async createReservation(spotId, startTime, endTime, userAddress, value) {
    if (!this.parkingSystemContract || !this.wallet) {
      throw new Error('Contrat ou wallet non configuré');
    }

    try {
      const tx = await this.parkingSystemContract.reserveSpot(
        spotId,
        Math.floor(startTime.getTime() / 1000),
        Math.floor(endTime.getTime() / 1000),
        { value: ethers.parseEther(value.toString()) }
      );

      logger.info(`Transaction de réservation envoyée: ${tx.hash}`);
      const receipt = await tx.wait();
      logger.info(`Réservation confirmée dans le bloc: ${receipt.blockNumber}`);

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      logger.error('Erreur lors de la création de réservation:', error);
      throw error;
    }
  }

  async updateSensorData(spotId, isOccupied, confidence, sensorType, dataHash) {
    if (!this.parkingOracleContract || !this.wallet) {
      throw new Error('Contrat Oracle ou wallet non configuré');
    }

    try {
      const tx = await this.parkingOracleContract.updateSensorData(
        spotId,
        isOccupied,
        confidence,
        sensorType,
        dataHash
      );

      logger.info(`Données capteur mises à jour: ${tx.hash}`);
      const receipt = await tx.wait();

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      logger.error('Erreur lors de la mise à jour des données capteur:', error);
      throw error;
    }
  }

  async getParkingSpot(spotId) {
    if (!this.parkingSystemContract) {
      throw new Error('Contrat non configuré');
    }

    try {
      const spot = await this.parkingSystemContract.getParkingSpot(spotId);
      return {
        spotId: spot.spotId.toString(),
        location: spot.location,
        hourlyRate: ethers.formatEther(spot.hourlyRate),
        isActive: spot.isActive,
        isOccupied: spot.isOccupied,
        currentUser: spot.currentUser,
        reservationEnd: new Date(Number(spot.reservationEnd) * 1000),
        totalEarnings: ethers.formatEther(spot.totalEarnings),
        totalOccupations: spot.totalOccupations.toString()
      };
    } catch (error) {
      logger.error(`Erreur lors de la récupération de la place ${spotId}:`, error);
      throw error;
    }
  }

  async getReservation(reservationId) {
    if (!this.parkingSystemContract) {
      throw new Error('Contrat non configuré');
    }

    try {
      const reservation = await this.parkingSystemContract.getReservation(reservationId);
      return {
        reservationId: reservation.reservationId.toString(),
        user: reservation.user,
        spotId: reservation.spotId.toString(),
        startTime: new Date(Number(reservation.startTime) * 1000),
        endTime: new Date(Number(reservation.endTime) * 1000),
        totalCost: ethers.formatEther(reservation.totalCost),
        paidAmount: ethers.formatEther(reservation.paidAmount),
        status: reservation.status,
        actualStartTime: reservation.actualStartTime > 0 ? new Date(Number(reservation.actualStartTime) * 1000) : null,
        actualEndTime: reservation.actualEndTime > 0 ? new Date(Number(reservation.actualEndTime) * 1000) : null
      };
    } catch (error) {
      logger.error(`Erreur lors de la récupération de la réservation ${reservationId}:`, error);
      throw error;
    }
  }

  async getUserReservations(userAddress) {
    if (!this.parkingSystemContract) {
      throw new Error('Contrat non configuré');
    }

    try {
      const reservationIds = await this.parkingSystemContract.getUserReservations(userAddress);
      const reservations = [];

      for (const id of reservationIds) {
        try {
          const reservation = await this.getReservation(id.toString());
          reservations.push(reservation);
        } catch (error) {
          logger.warn(`Impossible de récupérer la réservation ${id}:`, error.message);
        }
      }

      return reservations;
    } catch (error) {
      logger.error(`Erreur lors de la récupération des réservations pour ${userAddress}:`, error);
      throw error;
    }
  }

  // Gestionnaires d'événements (à implémenter selon les besoins)
  async handleReservationCreated(data) {
    // Sauvegarder en base de données
    // Envoyer notification WebSocket
    // Mettre à jour le cache
    logger.info('Traitement événement ReservationCreated:', data);
  }

  async handleSpotOccupancyChanged(data) {
    // Mettre à jour l'état en temps réel
    // Notifier les clients connectés
    logger.info('Traitement événement SpotOccupancyChanged:', data);
  }

  async handleReservationCompleted(data) {
    // Finaliser la réservation en base
    // Calculer les statistiques
    // Envoyer notification de fin
    logger.info('Traitement événement ReservationCompleted:', data);
  }

  // Méthodes utilitaires
  isConnected() {
    return this.isInitialized && this.provider !== null;
  }

  getWalletAddress() {
    return this.wallet ? this.wallet.address : null;
  }

  async getBalance(address = null) {
    const targetAddress = address || this.getWalletAddress();
    if (!targetAddress) return null;

    try {
      const balance = await this.provider.getBalance(targetAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      logger.error('Erreur lors de la récupération du solde:', error);
      return null;
    }
  }

  async getGasPrice() {
    try {
      const gasPrice = await this.provider.getFeeData();
      return {
        gasPrice: ethers.formatUnits(gasPrice.gasPrice, 'gwei'),
        maxFeePerGas: ethers.formatUnits(gasPrice.maxFeePerGas, 'gwei'),
        maxPriorityFeePerGas: ethers.formatUnits(gasPrice.maxPriorityFeePerGas, 'gwei')
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération du prix du gas:', error);
      return null;
    }
  }
}

module.exports = new BlockchainService();
