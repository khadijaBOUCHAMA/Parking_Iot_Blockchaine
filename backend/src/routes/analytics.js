const express = require('express');
const Reservation = require('../models/Reservation');
const ParkingSpot = require('../models/ParkingSpot');
const User = require('../models/User');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { requireRole } = require('../middleware/auth');
const { cacheGet, cacheSet } = require('../config/redis');
const iotSimulator = require('../services/iotSimulator');

const router = express.Router();

/**
 * @route   GET /api/analytics/revenue
 * @desc    Obtenir les analytics de revenus
 * @access  Private (Admin/Manager)
 */
router.get('/revenue', requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { 
    startDate, 
    endDate, 
    groupBy = 'day',
    spotId,
    zone 
  } = req.query;

  // Dates par défaut (30 derniers jours)
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Vérifier le cache
  const cacheKey = `analytics:revenue:${start.getTime()}:${end.getTime()}:${groupBy}:${spotId || 'all'}:${zone || 'all'}`;
  const cachedData = await cacheGet(cacheKey);
  
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true
    });
  }

  // Construire le pipeline d'agrégation
  const matchStage = {
    status: 'completed',
    actualEndTime: { $gte: start, $lte: end }
  };

  // Filtres optionnels
  if (spotId) matchStage.parkingSpotId = spotId;

  let pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'parkingspots',
        localField: 'parkingSpotId',
        foreignField: '_id',
        as: 'spot'
      }
    },
    { $unwind: '$spot' }
  ];

  // Filtre par zone si spécifié
  if (zone) {
    pipeline.push({
      $match: { 'spot.location.zone': zone }
    });
  }

  // Groupement selon la période
  let groupId;
  switch (groupBy) {
    case 'hour':
      groupId = {
        year: { $year: '$actualEndTime' },
        month: { $month: '$actualEndTime' },
        day: { $dayOfMonth: '$actualEndTime' },
        hour: { $hour: '$actualEndTime' }
      };
      break;
    case 'day':
      groupId = {
        year: { $year: '$actualEndTime' },
        month: { $month: '$actualEndTime' },
        day: { $dayOfMonth: '$actualEndTime' }
      };
      break;
    case 'week':
      groupId = {
        year: { $year: '$actualEndTime' },
        week: { $week: '$actualEndTime' }
      };
      break;
    case 'month':
      groupId = {
        year: { $year: '$actualEndTime' },
        month: { $month: '$actualEndTime' }
      };
      break;
    default:
      groupId = null;
  }

  pipeline.push({
    $group: {
      _id: groupId,
      totalRevenue: { $sum: '$pricing.actualCost' },
      totalReservations: { $sum: 1 },
      averageRevenue: { $avg: '$pricing.actualCost' },
      averageDuration: { $avg: { $divide: [{ $subtract: ['$actualEndTime', '$actualStartTime'] }, 3600000] } }, // en heures
      uniqueUsers: { $addToSet: '$userId' }
    }
  });

  pipeline.push({
    $addFields: {
      uniqueUsersCount: { $size: '$uniqueUsers' }
    }
  });

  pipeline.push({
    $project: {
      uniqueUsers: 0 // Exclure le tableau des utilisateurs uniques
    }
  });

  pipeline.push({ $sort: { '_id': 1 } });

  const revenueData = await Reservation.aggregate(pipeline);

  // Statistiques globales
  const totalStats = await Reservation.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$pricing.actualCost' },
        totalReservations: { $sum: 1 },
        averageRevenue: { $avg: '$pricing.actualCost' }
      }
    }
  ]);

  const result = {
    period: { start, end, groupBy },
    data: revenueData,
    summary: totalStats[0] || {
      totalRevenue: 0,
      totalReservations: 0,
      averageRevenue: 0
    },
    lastUpdate: new Date().toISOString()
  };

  // Mettre en cache pour 10 minutes
  await cacheSet(cacheKey, result, 600);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route   GET /api/analytics/occupancy
 * @desc    Obtenir les analytics d'occupation
 * @access  Private (Admin/Manager)
 */
router.get('/occupancy', requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { 
    startDate, 
    endDate, 
    zone,
    spotType = 'all'
  } = req.query;

  // Vérifier le cache
  const cacheKey = `analytics:occupancy:${startDate || 'default'}:${endDate || 'default'}:${zone || 'all'}:${spotType}`;
  const cachedData = await cacheGet(cacheKey);
  
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true
    });
  }

  // Données en temps réel depuis le simulateur IoT
  const realTimeData = iotSimulator.getOccupancyStats();
  const allSensors = iotSimulator.getAllSensorsData();

  // Filtrer par zone si spécifié
  let filteredSensors = allSensors;
  if (zone) {
    filteredSensors = allSensors.filter(sensor => sensor.zone === zone);
  }

  // Statistiques par zone
  const byZone = allSensors.reduce((acc, sensor) => {
    if (!acc[sensor.zone]) {
      acc[sensor.zone] = {
        total: 0,
        occupied: 0,
        available: 0,
        occupancyRate: 0
      };
    }
    
    acc[sensor.zone].total++;
    if (sensor.isOccupied) {
      acc[sensor.zone].occupied++;
    } else {
      acc[sensor.zone].available++;
    }
    
    return acc;
  }, {});

  // Calculer les taux d'occupation par zone
  Object.keys(byZone).forEach(zone => {
    const zoneData = byZone[zone];
    zoneData.occupancyRate = zoneData.total > 0 ? (zoneData.occupied / zoneData.total) * 100 : 0;
  });

  // Tendances horaires simulées (en production, cela viendrait de données historiques)
  const hourlyTrends = Array.from({ length: 24 }, (_, hour) => {
    // Simuler des patterns réalistes d'occupation
    let baseRate = 30; // 30% de base
    
    // Pics aux heures de pointe
    if (hour >= 8 && hour <= 10) baseRate += 40; // Matin
    if (hour >= 12 && hour <= 14) baseRate += 30; // Midi
    if (hour >= 17 && hour <= 19) baseRate += 50; // Soir
    
    // Nuit plus calme
    if (hour >= 22 || hour <= 6) baseRate -= 20;
    
    // Ajouter de la variabilité
    const variation = (Math.random() - 0.5) * 20;
    const occupancyRate = Math.max(0, Math.min(100, baseRate + variation));
    
    return {
      hour,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      totalSpots: filteredSensors.length,
      occupiedSpots: Math.round((occupancyRate / 100) * filteredSensors.length)
    };
  });

  // Prédictions (simulation simple)
  const predictions = Array.from({ length: 6 }, (_, i) => {
    const futureHour = (new Date().getHours() + i + 1) % 24;
    const baseTrend = hourlyTrends[futureHour];
    
    return {
      hour: futureHour,
      predictedOccupancyRate: baseTrend.occupancyRate + (Math.random() - 0.5) * 10,
      confidence: 0.7 + Math.random() * 0.3
    };
  });

  const result = {
    realTime: {
      ...realTimeData,
      byZone,
      lastUpdate: new Date().toISOString()
    },
    trends: {
      hourly: hourlyTrends,
      predictions
    },
    insights: {
      peakHours: hourlyTrends
        .map((trend, index) => ({ ...trend, hour: index }))
        .sort((a, b) => b.occupancyRate - a.occupancyRate)
        .slice(0, 3),
      lowHours: hourlyTrends
        .map((trend, index) => ({ ...trend, hour: index }))
        .sort((a, b) => a.occupancyRate - b.occupancyRate)
        .slice(0, 3),
      averageOccupancy: hourlyTrends.reduce((sum, trend) => sum + trend.occupancyRate, 0) / 24
    }
  };

  // Mettre en cache pour 2 minutes
  await cacheSet(cacheKey, result, 120);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route   GET /api/analytics/users
 * @desc    Obtenir les analytics des utilisateurs
 * @access  Private (Admin/Manager)
 */
router.get('/users', requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;

  // Vérifier le cache
  const cacheKey = `analytics:users:${period}`;
  const cachedData = await cacheGet(cacheKey);
  
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true
    });
  }

  // Calculer la date de début selon la période
  let startDate;
  switch (period) {
    case '7d':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  // Statistiques générales des utilisateurs
  const userStats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
        newUsers: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', startDate] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  // Utilisateurs par rôle
  const usersByRole = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  // Activité des utilisateurs (basée sur les réservations)
  const userActivity = await Reservation.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$userId',
        reservationCount: { $sum: 1 },
        totalSpent: { $sum: '$pricing.actualCost' },
        lastReservation: { $max: '$createdAt' }
      }
    },
    {
      $group: {
        _id: null,
        activeUsers: { $sum: 1 },
        averageReservationsPerUser: { $avg: '$reservationCount' },
        averageSpentPerUser: { $avg: '$totalSpent' }
      }
    }
  ]);

  // Top utilisateurs
  const topUsers = await Reservation.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$userId',
        reservationCount: { $sum: 1 },
        totalSpent: { $sum: '$pricing.actualCost' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        walletAddress: '$user.walletAddress',
        username: '$user.username',
        reservationCount: 1,
        totalSpent: 1
      }
    },
    { $sort: { totalSpent: -1 } },
    { $limit: 10 }
  ]);

  const result = {
    period,
    overview: userStats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      newUsers: 0
    },
    byRole: usersByRole.reduce((acc, role) => {
      acc[role._id] = role.count;
      return acc;
    }, {}),
    activity: userActivity[0] || {
      activeUsers: 0,
      averageReservationsPerUser: 0,
      averageSpentPerUser: 0
    },
    topUsers,
    lastUpdate: new Date().toISOString()
  };

  // Mettre en cache pour 15 minutes
  await cacheSet(cacheKey, result, 900);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route   GET /api/analytics/performance
 * @desc    Obtenir les analytics de performance du système
 * @access  Private (Admin/Manager)
 */
router.get('/performance', requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  // Vérifier le cache
  const cacheKey = 'analytics:performance';
  const cachedData = await cacheGet(cacheKey);
  
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true
    });
  }

  // Métriques système
  const systemMetrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    nodeVersion: process.version,
    platform: process.platform
  };

  // Métriques IoT
  const iotMetrics = {
    sensorsActive: iotSimulator.getAllSensorsData().length,
    simulatorRunning: iotSimulator.getRunningStatus(),
    averageConfidence: iotSimulator.getAllSensorsData()
      .reduce((sum, sensor) => sum + sensor.aiDecision.confidence, 0) / 
      iotSimulator.getAllSensorsData().length || 0
  };

  // Métriques de base de données (simulation)
  const dbMetrics = {
    totalUsers: await User.countDocuments(),
    totalSpots: await ParkingSpot.countDocuments(),
    totalReservations: await Reservation.countDocuments(),
    activeReservations: await Reservation.countDocuments({ status: 'active' })
  };

  // Métriques de performance simulées
  const performanceMetrics = {
    apiResponseTime: {
      average: 150 + Math.random() * 100, // ms
      p95: 300 + Math.random() * 200,
      p99: 500 + Math.random() * 300
    },
    throughput: {
      requestsPerSecond: 50 + Math.random() * 100,
      reservationsPerHour: 10 + Math.random() * 20
    },
    errorRates: {
      api: Math.random() * 2, // %
      iot: Math.random() * 1,
      blockchain: Math.random() * 3
    }
  };

  const result = {
    system: systemMetrics,
    iot: iotMetrics,
    database: dbMetrics,
    performance: performanceMetrics,
    lastUpdate: new Date().toISOString()
  };

  // Mettre en cache pour 30 secondes
  await cacheSet(cacheKey, result, 30);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route   GET /api/analytics/predictions
 * @desc    Obtenir les prédictions basées sur l'IA
 * @access  Private (Admin/Manager)
 */
router.get('/predictions', requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { type = 'occupancy', horizon = '24h' } = req.query;

  // Vérifier le cache
  const cacheKey = `analytics:predictions:${type}:${horizon}`;
  const cachedData = await cacheGet(cacheKey);
  
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true
    });
  }

  let predictions = [];
  const now = new Date();

  switch (type) {
    case 'occupancy':
      // Prédictions d'occupation pour les prochaines heures
      const hours = horizon === '24h' ? 24 : 6;
      predictions = Array.from({ length: hours }, (_, i) => {
        const futureTime = new Date(now.getTime() + (i + 1) * 60 * 60 * 1000);
        const hour = futureTime.getHours();
        
        // Modèle simple basé sur les patterns typiques
        let baseOccupancy = 30;
        if (hour >= 8 && hour <= 10) baseOccupancy = 70;
        if (hour >= 12 && hour <= 14) baseOccupancy = 60;
        if (hour >= 17 && hour <= 19) baseOccupancy = 80;
        if (hour >= 22 || hour <= 6) baseOccupancy = 15;
        
        return {
          timestamp: futureTime,
          predictedOccupancy: baseOccupancy + (Math.random() - 0.5) * 20,
          confidence: 0.7 + Math.random() * 0.3,
          factors: ['historical_pattern', 'time_of_day', 'day_of_week']
        };
      });
      break;

    case 'revenue':
      // Prédictions de revenus
      predictions = Array.from({ length: 7 }, (_, i) => {
        const futureDate = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
        const dayOfWeek = futureDate.getDay();
        
        // Revenus plus élevés en semaine
        let baseRevenue = dayOfWeek >= 1 && dayOfWeek <= 5 ? 500 : 300;
        
        return {
          date: futureDate,
          predictedRevenue: baseRevenue + (Math.random() - 0.5) * 200,
          confidence: 0.6 + Math.random() * 0.4,
          factors: ['day_of_week', 'seasonal_trend', 'historical_data']
        };
      });
      break;

    case 'demand':
      // Prédictions de demande par zone
      const zones = ['A', 'B', 'C', 'D'];
      predictions = zones.map(zone => ({
        zone,
        predictedDemand: 50 + Math.random() * 50,
        currentDemand: 30 + Math.random() * 40,
        trend: Math.random() > 0.5 ? 'increasing' : 'decreasing',
        confidence: 0.6 + Math.random() * 0.4
      }));
      break;
  }

  const result = {
    type,
    horizon,
    predictions,
    model: {
      name: 'ParkSync AI Predictor v1.0',
      lastTrained: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      accuracy: 0.85 + Math.random() * 0.1
    },
    lastUpdate: new Date().toISOString()
  };

  // Mettre en cache pour 5 minutes
  await cacheSet(cacheKey, result, 300);

  res.json({
    success: true,
    data: result
  });
}));

module.exports = router;
