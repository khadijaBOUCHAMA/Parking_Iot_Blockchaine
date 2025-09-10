import { ethers } from 'ethers';
import ParkingSystemArtifact from '../abis/ParkingSystem.json';
import ParkingOracleArtifact from '../abis/ParkingOracle.json';
import contractsConfig from '../config/contracts.json';

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.parkingSystemContract = null;
    this.parkingOracleContract = null;
    this.isInitialized = false;
    this.currentAccount = null;
    this.chainId = null;
  }

  /**
   * Initialiser le service blockchain
   */
  async initialize() {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask non détecté');
      }

      // Créer le provider
      this.provider = new ethers.BrowserProvider(window.ethereum);
      
      // Obtenir le réseau
      const network = await this.provider.getNetwork();
      this.chainId = network.chainId.toString();
      
      console.log(`Connecté au réseau: ${network.name} (chainId: ${this.chainId})`);

      // Charger les contrats
      this.loadContracts();
      
      // Configurer les listeners d'événements
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('✅ Service blockchain initialisé');
      
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation blockchain:', error);
      throw error;
    }
  }

  /**
   * Connecter MetaMask
   */
  async connectWallet() {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask non installé');
      }

      // Demander la connexion
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('Aucun compte sélectionné');
      }

      this.currentAccount = accounts[0];
      
      // Créer le signer
      this.signer = await this.provider.getSigner();
      
      // Recharger les contrats avec le signer
      this.loadContracts();
      
      console.log('✅ Portefeuille connecté:', this.currentAccount);
      
      return {
        address: this.currentAccount,
        chainId: this.chainId
      };
    } catch (error) {
      console.error('❌ Erreur de connexion MetaMask:', error);
      throw error;
    }
  }

  /**
   * Charger les contrats intelligents
   */
  loadContracts() {
    try {
      const signer = this.signer || this.provider;
      
      if (contractsConfig.contracts.ParkingSystem.address) {
        this.parkingSystemContract = new ethers.Contract(
          contractsConfig.contracts.ParkingSystem.address,
          ParkingSystemArtifact,
          signer
        );
        console.log('📄 Contrat ParkingSystem chargé');
      }

      if (contractsConfig.contracts.ParkingOracle.address) {
        this.parkingOracleContract = new ethers.Contract(
          contractsConfig.contracts.ParkingOracle.address,
          ParkingOracleArtifact,
          signer
        );
        console.log('📄 Contrat ParkingOracle chargé');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des contrats:', error);
    }
  }

  /**
   * Configurer les listeners d'événements
   */
  setupEventListeners() {
    if (!window.ethereum) return;

    // Écouter les changements de compte
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        this.disconnect();
      } else {
        this.currentAccount = accounts[0];
        this.signer = null; // Sera recréé au besoin
        console.log('🔄 Compte changé:', this.currentAccount);
        window.dispatchEvent(new CustomEvent('accountChanged', { 
          detail: { address: this.currentAccount } 
        }));
      }
    });

    // Écouter les changements de réseau
    window.ethereum.on('chainChanged', (chainId) => {
      this.chainId = chainId;
      console.log('🔄 Réseau changé:', chainId);
      window.location.reload(); // Recharger la page pour éviter les problèmes
    });

    // Écouter les événements des contrats
    if (this.parkingSystemContract) {
      this.setupContractListeners();
    }
  }

  /**
   * Configurer les listeners des contrats
   */
  setupContractListeners() {
    if (!this.parkingSystemContract) return;

    // Écouter les nouvelles réservations
    this.parkingSystemContract.on('ReservationCreated', (reservationId, user, spotId, startTime, endTime, totalCost, event) => {
      console.log('🎉 Nouvelle réservation:', {
        reservationId: reservationId.toString(),
        user,
        spotId: spotId.toString(),
        totalCost: ethers.formatEther(totalCost)
      });

      window.dispatchEvent(new CustomEvent('reservationCreated', {
        detail: {
          reservationId: reservationId.toString(),
          user,
          spotId: spotId.toString(),
          startTime: new Date(Number(startTime) * 1000),
          endTime: new Date(Number(endTime) * 1000),
          totalCost: ethers.formatEther(totalCost),
          transactionHash: event.log.transactionHash
        }
      }));
    });

    // Écouter les changements d'occupation
    this.parkingSystemContract.on('SpotOccupancyChanged', (spotId, isOccupied, user, event) => {
      console.log('🚗 Changement d\'occupation:', {
        spotId: spotId.toString(),
        isOccupied,
        user
      });

      window.dispatchEvent(new CustomEvent('spotOccupancyChanged', {
        detail: {
          spotId: spotId.toString(),
          isOccupied,
          user,
          transactionHash: event.log.transactionHash
        }
      }));
    });

    // Écouter les réservations terminées
    this.parkingSystemContract.on('ReservationCompleted', (reservationId, actualEndTime, actualCost, refundAmount, event) => {
      console.log('✅ Réservation terminée:', {
        reservationId: reservationId.toString(),
        actualCost: ethers.formatEther(actualCost),
        refundAmount: ethers.formatEther(refundAmount)
      });

      window.dispatchEvent(new CustomEvent('reservationCompleted', {
        detail: {
          reservationId: reservationId.toString(),
          actualEndTime: new Date(Number(actualEndTime) * 1000),
          actualCost: ethers.formatEther(actualCost),
          refundAmount: ethers.formatEther(refundAmount),
          transactionHash: event.log.transactionHash
        }
      }));
    });
  }

  /**
   * Créer une réservation
   */
  async createReservation(spotId, startTime, endTime, value) {
    if (!this.parkingSystemContract || !this.signer) {
      throw new Error('Contrat ou signer non disponible');
    }

    try {
      const startTimestamp = Math.floor(startTime.getTime() / 1000);
      const endTimestamp = Math.floor(endTime.getTime() / 1000);
      const valueInWei = ethers.parseEther(value.toString());

      console.log('📝 Création de réservation:', {
        spotId,
        startTimestamp,
        endTimestamp,
        value: value.toString()
      });

      const tx = await this.parkingSystemContract.reserveSpot(
        spotId,
        startTimestamp,
        endTimestamp,
        { value: valueInWei }
      );

      console.log('📤 Transaction envoyée:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Transaction confirmée:', receipt.hash);

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('❌ Erreur lors de la création de réservation:', error);
      throw error;
    }
  }

  /**
   * Obtenir les informations d'une place de parking
   */
  async getParkingSpot(spotId) {
    if (!this.parkingSystemContract) {
      throw new Error('Contrat non disponible');
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
      console.error('❌ Erreur lors de la récupération de la place:', error);
      throw error;
    }
  }

  /**
   * Obtenir les réservations d'un utilisateur
   */
  async getUserReservations(userAddress) {
    if (!this.parkingSystemContract) {
      throw new Error('Contrat non disponible');
    }

    try {
      const reservationIds = await this.parkingSystemContract.getUserReservations(userAddress);
      const reservations = [];

      for (const id of reservationIds) {
        try {
          const reservation = await this.parkingSystemContract.getReservation(id);
          reservations.push({
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
          });
        } catch (error) {
          console.warn(`Impossible de récupérer la réservation ${id}:`, error.message);
        }
      }

      return reservations;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des réservations:', error);
      throw error;
    }
  }

  /**
   * Annuler une réservation
   */
  async cancelReservation(reservationId) {
    if (!this.parkingSystemContract || !this.signer) {
      throw new Error('Contrat ou signer non disponible');
    }

    try {
      const tx = await this.parkingSystemContract.cancelReservation(reservationId);
      console.log('📤 Annulation envoyée:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Annulation confirmée:', receipt.hash);

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('❌ Erreur lors de l\'annulation:', error);
      throw error;
    }
  }

  /**
   * Obtenir le solde ETH
   */
  async getBalance(address = null) {
    if (!this.provider) return null;

    try {
      const targetAddress = address || this.currentAccount;
      if (!targetAddress) return null;

      const balance = await this.provider.getBalance(targetAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du solde:', error);
      return null;
    }
  }

  /**
   * Obtenir les frais de gas
   */
  async getGasPrice() {
    if (!this.provider) return null;

    try {
      const feeData = await this.provider.getFeeData();
      return {
        gasPrice: ethers.formatUnits(feeData.gasPrice, 'gwei'),
        maxFeePerGas: ethers.formatUnits(feeData.maxFeePerGas, 'gwei'),
        maxPriorityFeePerGas: ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei')
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du prix du gas:', error);
      return null;
    }
  }

  /**
   * Déconnecter le portefeuille
   */
  disconnect() {
    this.currentAccount = null;
    this.signer = null;
    this.loadContracts(); // Recharger avec provider seulement
    
    console.log('🔌 Portefeuille déconnecté');
    
    window.dispatchEvent(new CustomEvent('walletDisconnected'));
  }

  /**
   * Vérifier si connecté
   */
  isConnected() {
    return this.isInitialized && this.currentAccount !== null;
  }

  /**
   * Obtenir l'adresse actuelle
   */
  getCurrentAccount() {
    return this.currentAccount;
  }

  /**
   * Obtenir l'ID de la chaîne
   */
  getChainId() {
    return this.chainId;
  }
}

// Instance singleton
const blockchainService = new BlockchainService();

export default blockchainService;
