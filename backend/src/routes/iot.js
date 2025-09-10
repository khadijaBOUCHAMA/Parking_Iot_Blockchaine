const express = require('express');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { requireRole } = require('../middleware/auth');
const iotSimulator = require('../services/iotSimulator');
const blockchainService = require('../services/blockchainService');
const ParkingSpot = require('../models/ParkingSpot');
const { cacheGet, cacheSet } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/iot/sensors
 * @desc    Obtenir les données de tous les capteurs
 * @access  Private (Admin/Manager)
 */
router.get('/sensors', requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { zone, status } = req.query;

  // Vérifier le cache
  const cacheKey = `iot:sensors:${zone || 'all'}:${status || 'all'}`;
  const cachedData = await cacheGet(cacheKey);
  
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true
    });
  }

  // Obtenir toutes les données des capteurs
  const allSensorsData = iotSimulator.getAllSensorsData();

  // Filtrer selon les paramètres
  let filteredData = allSensorsData;
  
  if (zone) {
    filteredData = filteredData.filter(sensor => sensor.zone === zone);
  }
  
  if (status) {
    filteredData = filteredData.filter(sensor => 
      status === 'occupied' ? sensor.isOccupied : !sensor.isOccupied
    );
  }

  const result = {
    sensors: filteredData,
    summary: {
      total: filteredData.length,
      occupied: filteredData.filter(s => s.isOccupied).length,
      available: filteredData.filter(s => !s.isOccupied).length,
      averageConfidence: filteredData.reduce((sum, s) => sum + s.aiDecision.confidence, 0) / filteredData.length || 0
    },
    lastUpdate: new Date().toISOString()
  };

  // Mettre en cache pour 5 secondes
  await cacheSet(cacheKey, result, 5);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route   GET /api/iot/sensors/:spotId
 * @desc    Obtenir les données d'un capteur spécifique
 * @access  Private (Admin/Manager)
 */
router.get('/sensors/:spotId', requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { spotId } = req.params;
  const { includeHistory = false } = req.query;

  const sensorData = iotSimulator.getSensorData(parseInt(spotId));

  if (!sensorData) {
    throw createError.notFound('Capteur non trouvé');
  }

  let result = {
    current: sensorData,
    spotId: parseInt(spotId)
  };

  // Inclure l'historique si demandé
  if (includeHistory === 'true') {
    const historyCacheKey = `iot:history:${spotId}`;
    let history = await cacheGet(historyCacheKey);
    
    if (!history) {
      // Simuler un historique (en production, cela viendrait de la base de données)
      history = Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000),
        isOccupied: Math.random() > 0.6,
        confidence: 0.7 + Math.random() * 0.3
      }));
      
      await cacheSet(historyCacheKey, history, 300); // Cache 5 minutes
    }
    
    result.history = history;
  }

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route   GET /api/iot/status
 * @desc    Obtenir le statut du système IoT
 * @access  Private (Admin/Manager)
 */
router.get('/status', requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const isRunning = iotSimulator.getRunningStatus();
  const occupancyStats = iotSimulator.getOccupancyStats();

  // Statistiques de performance des capteurs
  const allSensors = iotSimulator.getAllSensorsData();
  const sensorStats = {
    totalSensors: allSensors.length,
    activeSensors: allSensors.filter(s => s.timestamp > Date.now() - 60000).length, // Actifs dans la dernière minute
    averageConfidence: allSensors.reduce((sum, s) => sum + s.aiDecision.confidence, 0) / allSensors.length || 0,
    sensorTypes: {
      ultrasonic: allSensors.filter(s => s.sensors.ultrasonic.confidence > 0.5).length,
      magnetic: allSensors.filter(s => s.sensors.magnetic.confidence > 0.5).length,
      camera: allSensors.filter(s => s.sensors.camera.confidence > 0.5).length
    }
  };

  // Vérifier la connectivité blockchain
  const blockchainConnected = blockchainService.isConnected();

  const result = {
    system: {
      isRunning,
      uptime: process.uptime(),
      lastUpdate: new Date().toISOString()
    },
    occupancy: occupancyStats,
    sensors: sensorStats,
    blockchain: {
      connected: blockchainConnected,
      oracleAddress: blockchainService.getWalletAddress()
    },
    performance: {
      updateInterval: parseInt(process.env.IOT_UPDATE_INTERVAL) || 5000,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }
  };

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route   POST /api/iot/simulate-event
 * @desc    Simuler un événement IoT (pour les tests)
 * @access  Private (Admin)
 */
router.post('/simulate-event', requireRole(['admin']), asyncHandler(async (req, res) => {
  const { spotId, isOccupied, confidence = 95, sensorType = 'manual' } = req.body;

  if (!spotId || isOccupied === undefined) {
    throw createError.badRequest('spotId et isOccupied requis');
  }

  // Vérifier que la place existe
  const parkingSpot = await ParkingSpot.findOne({ spotId: parseInt(spotId) });
  if (!parkingSpot) {
    throw createError.notFound('Place de parking non trouvée');
  }

  // Simuler les données de capteur
  const sensorData = {
    ultrasonic: {
      distance: isOccupied ? 30 : 150,
      confidence: 0.8,
      lastReading: Date.now()
    },
    magnetic: {
      detected: isOccupied,
      strength: isOccupied ? 80 : 10,
      confidence: 0.7,
      lastReading: Date.now()
    },
    camera: {
      vehicleDetected: isOccupied,
      licensePlate: isOccupied ? 'AB-123-CD' : null,
      confidence: 0.9,
      lastReading: Date.now()
    },
    timestamp: Date.now()
  };

  // Mettre à jour le capteur dans le simulateur
  const sensor = iotSimulator.getSensorData(parseInt(spotId));
  if (sensor) {
    sensor.isOccupied = isOccupied;
    sensor.sensors = sensorData;
    sensor.aiDecision = {
      finalStatus: isOccupied ? 'occupied' : 'available',
      confidence: confidence / 100,
      lastUpdate: new Date()
    };
  }

  // Envoyer à la blockchain si connectée
  try {
    if (blockchainService.isConnected()) {
      const dataHash = '0x' + require('crypto')
        .createHash('sha256')
        .update(JSON.stringify(sensorData))
        .digest('hex');

      await blockchainService.updateSensorData(
        parseInt(spotId),
        isOccupied,
        confidence,
        sensorType,
        dataHash
      );
    }
  } catch (error) {
    logger.warn('Erreur lors de l\'envoi vers la blockchain:', error.message);
  }

  logger.info(`Événement IoT simulé: Place ${spotId} ${isOccupied ? 'occupée' : 'libre'} (confiance: ${confidence}%)`);

  res.json({
    success: true,
    data: {
      spotId: parseInt(spotId),
      isOccupied,
      confidence: confidence / 100,
      sensorType,
      timestamp: new Date().toISOString(),
      message: 'Événement simulé avec succès'
    }
  });
}));

/**
 * @route   GET /api/iot/analytics
 * @desc    Obtenir les analytics des capteurs IoT
 * @access  Private (Admin/Manager)
 */
router.get('/analytics', requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { period = '24h' } = req.query;

  // Vérifier le cache
  const cacheKey = `iot:analytics:${period}`;
  const cachedData = await cacheGet(cacheKey);
  
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true
    });
  }

  const allSensors = iotSimulator.getAllSensorsData();

  // Calculer les métriques
  const analytics = {
    overview: {
      totalSensors: allSensors.length,
      activeSensors: allSensors.filter(s => s.timestamp > Date.now() - 300000).length, // 5 minutes
      averageConfidence: allSensors.reduce((sum, s) => sum + s.aiDecision.confidence, 0) / allSensors.length || 0
    },
    
    occupancyTrends: {
      current: iotSimulator.getOccupancyStats(),
      // Simuler des tendances historiques
      hourly: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        occupancyRate: Math.random() * 100,
        averageConfidence: 0.7 + Math.random() * 0.3
      }))
    },
    
    sensorPerformance: {
      byType: {
        ultrasonic: {
          active: allSensors.filter(s => s.sensors.ultrasonic.confidence > 0.5).length,
          averageConfidence: allSensors.reduce((sum, s) => sum + s.sensors.ultrasonic.confidence, 0) / allSensors.length || 0
        },
        magnetic: {
          active: allSensors.filter(s => s.sensors.magnetic.confidence > 0.5).length,
          averageConfidence: allSensors.reduce((sum, s) => sum + s.sensors.magnetic.confidence, 0) / allSensors.length || 0
        },
        camera: {
          active: allSensors.filter(s => s.sensors.camera.confidence > 0.5).length,
          averageConfidence: allSensors.reduce((sum, s) => sum + s.sensors.camera.confidence, 0) / allSensors.length || 0
        }
      },
      
      byZone: allSensors.reduce((acc, sensor) => {
        if (!acc[sensor.zone]) {
          acc[sensor.zone] = {
            totalSensors: 0,
            averageConfidence: 0,
            occupancyRate: 0
          };
        }
        acc[sensor.zone].totalSensors++;
        acc[sensor.zone].averageConfidence += sensor.aiDecision.confidence;
        if (sensor.isOccupied) acc[sensor.zone].occupancyRate++;
        return acc;
      }, {})
    },
    
    alerts: [
      // Simuler quelques alertes
      {
        type: 'low_confidence',
        message: 'Capteur A3 - Confiance faible (65%)',
        severity: 'warning',
        timestamp: new Date(Date.now() - 300000).toISOString()
      },
      {
        type: 'sensor_offline',
        message: 'Capteur B1 - Hors ligne depuis 2 minutes',
        severity: 'error',
        timestamp: new Date(Date.now() - 120000).toISOString()
      }
    ].filter(() => Math.random() > 0.7), // Afficher aléatoirement
    
    lastUpdate: new Date().toISOString()
  };

  // Finaliser les calculs par zone
  Object.keys(analytics.sensorPerformance.byZone).forEach(zone => {
    const zoneData = analytics.sensorPerformance.byZone[zone];
    zoneData.averageConfidence /= zoneData.totalSensors;
    zoneData.occupancyRate = (zoneData.occupancyRate / zoneData.totalSensors) * 100;
  });

  // Mettre en cache pour 2 minutes
  await cacheSet(cacheKey, analytics, 120);

  res.json({
    success: true,
    data: analytics
  });
}));

/**
 * @route   POST /api/iot/calibrate/:spotId
 * @desc    Calibrer un capteur spécifique
 * @access  Private (Admin)
 */
router.post('/calibrate/:spotId', requireRole(['admin']), asyncHandler(async (req, res) => {
  const { spotId } = req.params;
  const { sensorType, calibrationData } = req.body;

  if (!sensorType || !calibrationData) {
    throw createError.badRequest('Type de capteur et données de calibration requis');
  }

  const sensor = iotSimulator.getSensorData(parseInt(spotId));
  if (!sensor) {
    throw createError.notFound('Capteur non trouvé');
  }

  // Simuler la calibration
  if (sensorType === 'ultrasonic' && calibrationData.baselineDistance) {
    sensor.sensors.ultrasonic.baselineDistance = calibrationData.baselineDistance;
  }
  
  if (sensorType === 'magnetic' && calibrationData.sensitivity) {
    sensor.sensors.magnetic.sensitivity = calibrationData.sensitivity;
  }
  
  if (sensorType === 'camera' && calibrationData.threshold) {
    sensor.sensors.camera.detectionThreshold = calibrationData.threshold;
  }

  logger.info(`Capteur ${spotId} calibré: ${sensorType}`, calibrationData);

  res.json({
    success: true,
    data: {
      spotId: parseInt(spotId),
      sensorType,
      calibrationData,
      message: 'Calibration effectuée avec succès'
    }
  });
}));

/**
 * @route   GET /api/iot/health
 * @desc    Vérifier la santé du système IoT
 * @access  Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  const isRunning = iotSimulator.getRunningStatus();
  const allSensors = iotSimulator.getAllSensorsData();
  
  const health = {
    status: isRunning ? 'healthy' : 'down',
    timestamp: new Date().toISOString(),
    sensors: {
      total: allSensors.length,
      active: allSensors.filter(s => s.timestamp > Date.now() - 60000).length,
      offline: allSensors.filter(s => s.timestamp <= Date.now() - 60000).length
    },
    system: {
      uptime: process.uptime(),
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
      isSimulator: true
    }
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;

  res.status(statusCode).json({
    success: health.status === 'healthy',
    data: health
  });
}));

module.exports = router;
