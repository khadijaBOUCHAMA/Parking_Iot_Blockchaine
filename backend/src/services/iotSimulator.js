const logger = require('../utils/logger');
const { cacheSet, cacheGet } = require('../config/redis');
const blockchainService = require('./blockchainService');
const crypto = require('crypto');

class IoTSimulator {
  constructor() {
    this.isRunning = false;
    this.sensors = new Map();
    this.updateInterval = parseInt(process.env.IOT_UPDATE_INTERVAL) || 5000;
    this.sensorsCount = parseInt(process.env.IOT_SENSORS_COUNT) || 8;
    this.io = null;
    this.intervalId = null;
  }

  start(socketIo) {
    if (this.isRunning) {
      logger.warn('Simulateur IoT déjà en cours d\'exécution');
      return;
    }

    this.io = socketIo;
    this.initializeSensors();
    this.startSimulation();
    this.isRunning = true;
    
    logger.info(`🤖 Simulateur IoT démarré avec ${this.sensorsCount} capteurs`);
    logger.info(`📡 Intervalle de mise à jour: ${this.updateInterval}ms`);
  }

  stop() {
    if (!this.isRunning) return;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    logger.info('🛑 Simulateur IoT arrêté');
  }

  initializeSensors() {
    // Créer des capteurs pour chaque place de parking
    const parkingSpots = [
      { id: 1, location: 'A1', zone: 'A' },
      { id: 2, location: 'A2', zone: 'A' },
      { id: 3, location: 'A3', zone: 'A' },
      { id: 4, location: 'B1', zone: 'B' },
      { id: 5, location: 'B2', zone: 'B' },
      { id: 6, location: 'C1', zone: 'C' },
      { id: 7, location: 'C2', zone: 'C' },
      { id: 8, location: 'D1', zone: 'D' }
    ];

    parkingSpots.forEach(spot => {
      this.sensors.set(spot.id, {
        spotId: spot.id,
        location: spot.location,
        zone: spot.zone,
        
        // État actuel
        isOccupied: false,
        lastChange: Date.now(),
        occupancyDuration: 0,
        
        // Capteurs individuels
        ultrasonic: {
          distance: this.generateRandomDistance(false), // false = libre
          confidence: 0.8,
          lastReading: Date.now()
        },
        
        magnetic: {
          detected: false,
          strength: this.generateRandomMagneticStrength(false),
          confidence: 0.7,
          lastReading: Date.now()
        },
        
        camera: {
          vehicleDetected: false,
          licensePlate: null,
          confidence: 0.9,
          lastReading: Date.now(),
          imageUrl: null
        },
        
        // Algorithme de fusion IA
        aiDecision: {
          finalStatus: 'available',
          confidence: 0.95,
          weights: {
            ultrasonic: 0.3,
            magnetic: 0.2,
            camera: 0.5
          }
        },
        
        // Statistiques
        stats: {
          totalDetections: 0,
          falsePositives: 0,
          falseNegatives: 0,
          averageConfidence: 0.85
        }
      });
    });

    logger.info(`✅ ${this.sensors.size} capteurs IoT initialisés`);
  }

  startSimulation() {
    this.intervalId = setInterval(() => {
      this.updateAllSensors();
    }, this.updateInterval);

    // Simulation d'événements aléatoires
    setInterval(() => {
      this.simulateRandomEvent();
    }, 15000); // Événement aléatoire toutes les 15 secondes
  }

  updateAllSensors() {
    const updates = [];
    
    this.sensors.forEach((sensor, spotId) => {
      const sensorData = this.updateSensorData(sensor);
      updates.push(sensorData);
      
      // Mettre à jour le cache
      this.cacheSensorData(spotId, sensorData);
    });

    // Envoyer les mises à jour via WebSocket
    if (this.io) {
      this.io.emit('sensor_updates', updates);
    }

    // Log périodique
    if (Math.random() < 0.1) { // 10% de chance de logger
      const occupiedCount = updates.filter(s => s.isOccupied).length;
      logger.info(`📊 État parking: ${occupiedCount}/${updates.length} places occupées`);
    }
  }

  updateSensorData(sensor) {
    const now = Date.now();
    
    // Simuler la dérive naturelle des capteurs
    this.simulateNaturalDrift(sensor);
    
    // Calculer la décision IA
    const aiDecision = this.calculateAIFusion(sensor);
    
    // Détecter les changements d'état
    const previousState = sensor.isOccupied;
    sensor.isOccupied = aiDecision.finalStatus === 'occupied';
    
    if (previousState !== sensor.isOccupied) {
      sensor.lastChange = now;
      sensor.occupancyDuration = 0;
      
      // Log du changement
      logger.info(`🚗 Place ${sensor.location}: ${sensor.isOccupied ? 'OCCUPÉE' : 'LIBRE'} (confiance: ${Math.round(aiDecision.confidence * 100)}%)`);
      
      // Envoyer à la blockchain si confiance suffisante
      if (aiDecision.confidence > 0.8) {
        this.sendToBlockchain(sensor, aiDecision);
      }
    } else {
      sensor.occupancyDuration = now - sensor.lastChange;
    }
    
    // Mettre à jour les statistiques
    sensor.stats.totalDetections++;
    sensor.stats.averageConfidence = (sensor.stats.averageConfidence + aiDecision.confidence) / 2;
    
    return {
      spotId: sensor.spotId,
      location: sensor.location,
      zone: sensor.zone,
      isOccupied: sensor.isOccupied,
      lastChange: sensor.lastChange,
      occupancyDuration: sensor.occupancyDuration,
      sensors: {
        ultrasonic: { ...sensor.ultrasonic },
        magnetic: { ...sensor.magnetic },
        camera: { ...sensor.camera }
      },
      aiDecision: { ...aiDecision },
      stats: { ...sensor.stats },
      timestamp: now
    };
  }

  simulateNaturalDrift(sensor) {
    const now = Date.now();
    
    // Capteur ultrasonique - variation de distance
    if (now - sensor.ultrasonic.lastReading > 1000) {
      const baseDistance = sensor.isOccupied ? 30 : 150; // 30cm si occupé, 150cm si libre
      const noise = (Math.random() - 0.5) * 20; // Bruit ±10cm
      sensor.ultrasonic.distance = Math.max(5, baseDistance + noise);
      sensor.ultrasonic.confidence = 0.7 + Math.random() * 0.2; // 70-90%
      sensor.ultrasonic.lastReading = now;
    }
    
    // Capteur magnétique - détection de métal
    if (now - sensor.magnetic.lastReading > 2000) {
      sensor.magnetic.detected = sensor.isOccupied && Math.random() > 0.1; // 90% de fiabilité
      sensor.magnetic.strength = this.generateRandomMagneticStrength(sensor.magnetic.detected);
      sensor.magnetic.confidence = 0.6 + Math.random() * 0.3; // 60-90%
      sensor.magnetic.lastReading = now;
    }
    
    // Caméra - détection visuelle (plus fiable)
    if (now - sensor.camera.lastReading > 3000) {
      sensor.camera.vehicleDetected = sensor.isOccupied && Math.random() > 0.05; // 95% de fiabilité
      sensor.camera.confidence = 0.85 + Math.random() * 0.1; // 85-95%
      
      if (sensor.camera.vehicleDetected && Math.random() > 0.3) {
        sensor.camera.licensePlate = this.generateRandomLicensePlate();
      } else {
        sensor.camera.licensePlate = null;
      }
      
      sensor.camera.lastReading = now;
    }
  }

  calculateAIFusion(sensor) {
    const weights = sensor.aiDecision.weights;
    let occupancyScore = 0;
    let totalWeight = 0;
    
    // Capteur ultrasonique
    const ultrasonicScore = sensor.ultrasonic.distance < 50 ? 1 : 0;
    occupancyScore += ultrasonicScore * weights.ultrasonic * sensor.ultrasonic.confidence;
    totalWeight += weights.ultrasonic * sensor.ultrasonic.confidence;
    
    // Capteur magnétique
    const magneticScore = sensor.magnetic.detected ? 1 : 0;
    occupancyScore += magneticScore * weights.magnetic * sensor.magnetic.confidence;
    totalWeight += weights.magnetic * sensor.magnetic.confidence;
    
    // Caméra (plus fiable)
    const cameraScore = sensor.camera.vehicleDetected ? 1 : 0;
    occupancyScore += cameraScore * weights.camera * sensor.camera.confidence;
    totalWeight += weights.camera * sensor.camera.confidence;
    
    // Calcul final
    const finalScore = totalWeight > 0 ? occupancyScore / totalWeight : 0;
    const confidence = Math.abs(finalScore - 0.5) * 2; // Confiance basée sur la distance à 0.5
    
    return {
      finalStatus: finalScore > 0.5 ? 'occupied' : 'available',
      confidence: Math.min(0.99, Math.max(0.01, confidence)),
      rawScore: finalScore,
      sensorContributions: {
        ultrasonic: ultrasonicScore * weights.ultrasonic * sensor.ultrasonic.confidence,
        magnetic: magneticScore * weights.magnetic * sensor.magnetic.confidence,
        camera: cameraScore * weights.camera * sensor.camera.confidence
      }
    };
  }

  simulateRandomEvent() {
    if (this.sensors.size === 0) return;
    
    // Choisir une place aléatoire
    const spotIds = Array.from(this.sensors.keys());
    const randomSpotId = spotIds[Math.floor(Math.random() * spotIds.length)];
    const sensor = this.sensors.get(randomSpotId);
    
    // 30% de chance de changer l'état
    if (Math.random() < 0.3) {
      sensor.isOccupied = !sensor.isOccupied;
      logger.info(`🎲 Événement aléatoire: Place ${sensor.location} ${sensor.isOccupied ? 'occupée' : 'libérée'}`);
    }
  }

  async sendToBlockchain(sensor, aiDecision) {
    try {
      if (!blockchainService.isConnected()) {
        logger.warn('Service blockchain non connecté - données IoT non envoyées');
        return;
      }

      // Créer un hash des données pour éviter les doublons
      const dataString = JSON.stringify({
        spotId: sensor.spotId,
        isOccupied: sensor.isOccupied,
        confidence: Math.round(aiDecision.confidence * 100),
        timestamp: Date.now()
      });
      
      const dataHash = '0x' + crypto.createHash('sha256').update(dataString).digest('hex');
      
      // Envoyer à l'oracle blockchain
      await blockchainService.updateSensorData(
        sensor.spotId,
        sensor.isOccupied,
        Math.round(aiDecision.confidence * 100),
        'fusion',
        dataHash
      );
      
      logger.info(`⛓️ Données envoyées à la blockchain pour la place ${sensor.location}`);
      
    } catch (error) {
      logger.error('Erreur lors de l\'envoi vers la blockchain:', error);
    }
  }

  async cacheSensorData(spotId, sensorData) {
    try {
      await cacheSet(`sensor:${spotId}`, sensorData, 300); // Cache 5 minutes
      await cacheSet(`sensor:${spotId}:latest`, {
        spotId: sensorData.spotId,
        isOccupied: sensorData.isOccupied,
        confidence: sensorData.aiDecision.confidence,
        timestamp: sensorData.timestamp
      }, 3600); // Cache 1 heure
    } catch (error) {
      logger.error('Erreur lors de la mise en cache des données capteur:', error);
    }
  }

  // Méthodes utilitaires
  generateRandomDistance(isOccupied) {
    if (isOccupied) {
      return 20 + Math.random() * 40; // 20-60cm si occupé
    } else {
      return 100 + Math.random() * 100; // 100-200cm si libre
    }
  }

  generateRandomMagneticStrength(detected) {
    if (detected) {
      return 60 + Math.random() * 40; // 60-100% si métal détecté
    } else {
      return Math.random() * 20; // 0-20% si pas de métal
    }
  }

  generateRandomLicensePlate() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    // Format français: AB-123-CD
    let plate = '';
    plate += letters[Math.floor(Math.random() * letters.length)];
    plate += letters[Math.floor(Math.random() * letters.length)];
    plate += '-';
    plate += numbers[Math.floor(Math.random() * numbers.length)];
    plate += numbers[Math.floor(Math.random() * numbers.length)];
    plate += numbers[Math.floor(Math.random() * numbers.length)];
    plate += '-';
    plate += letters[Math.floor(Math.random() * letters.length)];
    plate += letters[Math.floor(Math.random() * letters.length)];
    
    return plate;
  }

  // API publique
  getSensorData(spotId) {
    return this.sensors.get(spotId);
  }

  getAllSensorsData() {
    const data = [];
    this.sensors.forEach((sensor, spotId) => {
      data.push(this.updateSensorData(sensor));
    });
    return data;
  }

  getOccupancyStats() {
    const total = this.sensors.size;
    let occupied = 0;
    
    this.sensors.forEach(sensor => {
      if (sensor.isOccupied) occupied++;
    });
    
    return {
      total,
      occupied,
      available: total - occupied,
      occupancyRate: total > 0 ? (occupied / total) * 100 : 0
    };
  }

  getRunningStatus() {
    return this.isRunning;
  }
}

module.exports = new IoTSimulator();
