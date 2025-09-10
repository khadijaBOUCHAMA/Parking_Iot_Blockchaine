const logger = require('../utils/logger');
const iotSimulator = require('../services/iotSimulator');
const blockchainService = require('../services/blockchainService');
const { cacheGet } = require('../config/redis');

/**
 * Configuration des WebSockets pour la communication temps réel
 */
module.exports = (io) => {
  // Middleware d'authentification pour les sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const walletAddress = socket.handshake.auth.walletAddress;
      
      if (token || walletAddress) {
        // Ici on pourrait vérifier le token JWT ou la signature MetaMask
        // Pour la démo, on accepte toutes les connexions
        socket.userId = walletAddress || 'anonymous';
        socket.isAuthenticated = true;
        next();
      } else {
        socket.isAuthenticated = false;
        next(); // Permettre les connexions anonymes pour les données publiques
      }
    } catch (error) {
      logger.error('Erreur d\'authentification WebSocket:', error);
      next(error);
    }
  });

  io.on('connection', (socket) => {
    logger.websocket(`Nouvelle connexion WebSocket: ${socket.id} (utilisateur: ${socket.userId || 'anonyme'})`);

    // Envoyer les données initiales
    socket.emit('connection_established', {
      socketId: socket.id,
      timestamp: new Date().toISOString(),
      authenticated: socket.isAuthenticated
    });

    // === ÉVÉNEMENTS D'ABONNEMENT ===

    /**
     * S'abonner aux mises à jour des capteurs IoT
     */
    socket.on('subscribe_sensors', (data) => {
      const { zones, spotIds } = data || {};
      
      socket.join('sensors');
      
      if (zones && zones.length > 0) {
        zones.forEach(zone => socket.join(`sensors:zone:${zone}`));
      }
      
      if (spotIds && spotIds.length > 0) {
        spotIds.forEach(spotId => socket.join(`sensors:spot:${spotId}`));
      }

      logger.websocket(`Socket ${socket.id} abonné aux capteurs`, { zones, spotIds });

      // Envoyer les données actuelles
      const currentSensorData = iotSimulator.getAllSensorsData();
      socket.emit('sensors_data', {
        type: 'initial',
        data: currentSensorData,
        timestamp: new Date().toISOString()
      });
    });

    /**
     * S'abonner aux mises à jour de disponibilité des parkings
     */
    socket.on('subscribe_availability', (data) => {
      const { zones } = data || {};
      
      socket.join('availability');
      
      if (zones && zones.length > 0) {
        zones.forEach(zone => socket.join(`availability:zone:${zone}`));
      }

      logger.websocket(`Socket ${socket.id} abonné à la disponibilité`, { zones });

      // Envoyer les données actuelles
      const occupancyStats = iotSimulator.getOccupancyStats();
      socket.emit('availability_update', {
        type: 'initial',
        data: occupancyStats,
        timestamp: new Date().toISOString()
      });
    });

    /**
     * S'abonner aux événements blockchain
     */
    socket.on('subscribe_blockchain', () => {
      if (!socket.isAuthenticated) {
        socket.emit('error', { message: 'Authentification requise pour les événements blockchain' });
        return;
      }

      socket.join('blockchain');
      logger.websocket(`Socket ${socket.id} abonné aux événements blockchain`);

      // Envoyer le statut blockchain actuel
      socket.emit('blockchain_status', {
        connected: blockchainService.isConnected(),
        walletAddress: blockchainService.getWalletAddress(),
        timestamp: new Date().toISOString()
      });
    });

    /**
     * S'abonner aux réservations d'un utilisateur spécifique
     */
    socket.on('subscribe_user_reservations', (data) => {
      if (!socket.isAuthenticated) {
        socket.emit('error', { message: 'Authentification requise' });
        return;
      }

      const { walletAddress } = data;
      
      if (walletAddress && walletAddress === socket.userId) {
        socket.join(`reservations:user:${walletAddress}`);
        logger.websocket(`Socket ${socket.id} abonné aux réservations de ${walletAddress}`);
      }
    });

    /**
     * S'abonner au dashboard admin (admin seulement)
     */
    socket.on('subscribe_admin_dashboard', () => {
      // Ici on devrait vérifier que l'utilisateur est admin
      // Pour la démo, on accepte toutes les connexions
      socket.join('admin_dashboard');
      logger.websocket(`Socket ${socket.id} abonné au dashboard admin`);
    });

    // === ÉVÉNEMENTS DE DONNÉES ===

    /**
     * Demander les données d'un capteur spécifique
     */
    socket.on('get_sensor_data', (data) => {
      const { spotId } = data;
      
      if (!spotId) {
        socket.emit('error', { message: 'spotId requis' });
        return;
      }

      const sensorData = iotSimulator.getSensorData(parseInt(spotId));
      
      if (sensorData) {
        socket.emit('sensor_data', {
          spotId: parseInt(spotId),
          data: sensorData,
          timestamp: new Date().toISOString()
        });
      } else {
        socket.emit('error', { message: 'Capteur non trouvé' });
      }
    });

    /**
     * Demander les statistiques en temps réel
     */
    socket.on('get_realtime_stats', async () => {
      try {
        const stats = {
          occupancy: iotSimulator.getOccupancyStats(),
          sensors: {
            total: iotSimulator.getAllSensorsData().length,
            active: iotSimulator.getAllSensorsData().filter(s => s.timestamp > Date.now() - 60000).length
          },
          system: {
            uptime: process.uptime(),
            memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
            iotSimulatorRunning: iotSimulator.getRunningStatus()
          },
          blockchain: {
            connected: blockchainService.isConnected(),
            walletAddress: blockchainService.getWalletAddress()
          }
        };

        socket.emit('realtime_stats', {
          data: stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Erreur lors de la récupération des stats temps réel:', error);
        socket.emit('error', { message: 'Erreur lors de la récupération des statistiques' });
      }
    });

    // === ÉVÉNEMENTS DE DÉCONNEXION ===

    socket.on('unsubscribe_sensors', () => {
      socket.leave('sensors');
      // Quitter toutes les rooms de capteurs
      Object.keys(socket.rooms).forEach(room => {
        if (room.startsWith('sensors:')) {
          socket.leave(room);
        }
      });
      logger.websocket(`Socket ${socket.id} désabonné des capteurs`);
    });

    socket.on('disconnect', (reason) => {
      logger.websocket(`Socket ${socket.id} déconnecté: ${reason}`);
    });

    // === GESTION D'ERREURS ===

    socket.on('error', (error) => {
      logger.error('Erreur WebSocket:', error);
    });
  });

  // === FONCTIONS D'ÉMISSION GLOBALE ===

  /**
   * Émettre les mises à jour des capteurs IoT
   */
  const emitSensorUpdates = (sensorUpdates) => {
    // Émettre à tous les abonnés aux capteurs
    io.to('sensors').emit('sensors_update', {
      type: 'update',
      data: sensorUpdates,
      timestamp: new Date().toISOString()
    });

    // Émettre par zone
    sensorUpdates.forEach(sensor => {
      io.to(`sensors:zone:${sensor.zone}`).emit('sensor_zone_update', {
        zone: sensor.zone,
        data: sensor,
        timestamp: new Date().toISOString()
      });

      // Émettre par place spécifique
      io.to(`sensors:spot:${sensor.spotId}`).emit('sensor_spot_update', {
        spotId: sensor.spotId,
        data: sensor,
        timestamp: new Date().toISOString()
      });
    });
  };

  /**
   * Émettre les mises à jour de disponibilité
   */
  const emitAvailabilityUpdate = (occupancyStats) => {
    io.to('availability').emit('availability_update', {
      type: 'update',
      data: occupancyStats,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Émettre les événements blockchain
   */
  const emitBlockchainEvent = (eventType, eventData) => {
    io.to('blockchain').emit('blockchain_event', {
      type: eventType,
      data: eventData,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Émettre les mises à jour de réservation
   */
  const emitReservationUpdate = (walletAddress, reservationData) => {
    io.to(`reservations:user:${walletAddress}`).emit('reservation_update', {
      data: reservationData,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Émettre les alertes admin
   */
  const emitAdminAlert = (alertType, alertData) => {
    io.to('admin_dashboard').emit('admin_alert', {
      type: alertType,
      data: alertData,
      timestamp: new Date().toISOString()
    });
  };

  // === INTÉGRATION AVEC LES SERVICES ===

  // Écouter les mises à jour du simulateur IoT
  setInterval(() => {
    if (iotSimulator.getRunningStatus()) {
      const sensorUpdates = iotSimulator.getAllSensorsData();
      const occupancyStats = iotSimulator.getOccupancyStats();
      
      emitSensorUpdates(sensorUpdates);
      emitAvailabilityUpdate(occupancyStats);
    }
  }, 5000); // Toutes les 5 secondes

  // Écouter les événements blockchain (si connecté)
  if (blockchainService.isConnected()) {
    // Ici on pourrait écouter les événements du service blockchain
    // et les retransmettre via WebSocket
  }

  // Exposer les fonctions d'émission pour les autres modules
  io.emitSensorUpdates = emitSensorUpdates;
  io.emitAvailabilityUpdate = emitAvailabilityUpdate;
  io.emitBlockchainEvent = emitBlockchainEvent;
  io.emitReservationUpdate = emitReservationUpdate;
  io.emitAdminAlert = emitAdminAlert;

  logger.websocket('✅ WebSocket configuré avec succès');
};
