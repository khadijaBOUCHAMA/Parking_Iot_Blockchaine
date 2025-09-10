const express = require('express');
const ParkingSpot = require('../models/ParkingSpot');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const iotSimulator = require('../services/iotSimulator');
const blockchainService = require('../services/blockchainService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/parking/spots
 * @desc    Obtenir toutes les places de parking
 * @access  Public
 */
router.get('/spots', asyncHandler(async (req, res) => {
  const { 
    status, 
    zone, 
    type, 
    available, 
    page = 1, 
    limit = 50,
    sortBy = 'location.zone'
  } = req.query;

  // Construire le filtre
  const filter = { isActive: true };
  
  if (status) filter.status = status;
  if (zone) filter['location.zone'] = zone;
  if (type) filter['features.type'] = type;
  if (available === 'true') {
    filter.status = 'available';
    filter['aiDecision.finalStatus'] = 'available';
  }

  // Vérifier le cache
  const cacheKey = `parking:spots:${JSON.stringify(filter)}:${page}:${limit}:${sortBy}`;
  const cachedData = await cacheGet(cacheKey);
  
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true
    });
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Requête avec population
  const spots = await ParkingSpot.find(filter)
    .populate('currentReservation')
    .sort(sortBy)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await ParkingSpot.countDocuments(filter);

  // Enrichir avec les données IoT en temps réel
  const enrichedSpots = spots.map(spot => {
    const sensorData = iotSimulator.getSensorData(spot.spotId);
    return {
      ...spot,
      realTimeData: sensorData ? {
        isOccupied: sensorData.isOccupied,
        confidence: sensorData.aiDecision.confidence,
        lastUpdate: sensorData.timestamp
      } : null
    };
  });

  const result = {
    spots: enrichedSpots,
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / parseInt(limit)),
      count: spots.length,
      totalSpots: total
    }
  };

  // Mettre en cache pour 30 secondes
  await cacheSet(cacheKey, result, 30);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route   GET /api/parking/spots/:spotId
 * @desc    Obtenir une place de parking spécifique
 * @access  Public
 */
router.get('/spots/:spotId', asyncHandler(async (req, res) => {
  const { spotId } = req.params;

  // Vérifier le cache
  const cacheKey = `parking:spot:${spotId}`;
  const cachedData = await cacheGet(cacheKey);
  
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true
    });
  }

  const spot = await ParkingSpot.findOne({ 
    spotId: parseInt(spotId), 
    isActive: true 
  }).populate('currentReservation');

  if (!spot) {
    throw createError.notFound('Place de parking non trouvée');
  }

  // Enrichir avec les données IoT
  const sensorData = iotSimulator.getSensorData(parseInt(spotId));
  const enrichedSpot = {
    ...spot.toObject(),
    realTimeData: sensorData ? {
      isOccupied: sensorData.isOccupied,
      confidence: sensorData.aiDecision.confidence,
      lastUpdate: sensorData.timestamp,
      sensors: sensorData.sensors
    } : null
  };

  // Données blockchain si disponibles
  try {
    if (blockchainService.isConnected()) {
      const blockchainData = await blockchainService.getParkingSpot(parseInt(spotId));
      enrichedSpot.blockchainData = blockchainData;
    }
  } catch (error) {
    logger.warn(`Impossible de récupérer les données blockchain pour la place ${spotId}:`, error.message);
  }

  // Mettre en cache pour 15 secondes
  await cacheSet(cacheKey, enrichedSpot, 15);

  res.json({
    success: true,
    data: enrichedSpot
  });
}));

/**
 * @route   GET /api/parking/availability
 * @desc    Obtenir la disponibilité en temps réel
 * @access  Public
 */
router.get('/availability', asyncHandler(async (req, res) => {
  const { zone } = req.query;

  // Vérifier le cache
  const cacheKey = `parking:availability:${zone || 'all'}`;
  const cachedData = await cacheGet(cacheKey);
  
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true
    });
  }

  // Construire le filtre
  const filter = { isActive: true };
  if (zone) filter['location.zone'] = zone;

  // Obtenir les statistiques depuis la base de données
  const stats = await ParkingSpot.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Obtenir les données IoT en temps réel
  const iotStats = iotSimulator.getOccupancyStats();

  // Obtenir les statistiques par zone
  const zoneStats = await ParkingSpot.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$location.zone',
        total: { $sum: 1 },
        available: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'available'] },
              1,
              0
            ]
          }
        },
        occupied: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'occupied'] },
              1,
              0
            ]
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const result = {
    overall: {
      total: iotStats.total,
      available: iotStats.available,
      occupied: iotStats.occupied,
      occupancyRate: iotStats.occupancyRate
    },
    byStatus: stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {}),
    byZone: zoneStats,
    lastUpdate: new Date().toISOString()
  };

  // Mettre en cache pour 10 secondes
  await cacheSet(cacheKey, result, 10);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route   GET /api/parking/search
 * @desc    Rechercher des places disponibles
 * @access  Public
 */
router.get('/search', asyncHandler(async (req, res) => {
  const {
    startTime,
    endTime,
    zone,
    type = 'standard',
    features,
    maxPrice,
    sortBy = 'pricing.baseRate'
  } = req.query;

  if (!startTime || !endTime) {
    throw createError.badRequest('Heures de début et de fin requises');
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start >= end) {
    throw createError.badRequest('L\'heure de fin doit être postérieure à l\'heure de début');
  }

  if (start < new Date()) {
    throw createError.badRequest('L\'heure de début ne peut pas être dans le passé');
  }

  // Construire le filtre
  const filter = {
    isActive: true,
    status: 'available',
    'features.type': type
  };

  if (zone) filter['location.zone'] = zone;
  if (maxPrice) filter['pricing.baseRate'] = { $lte: parseFloat(maxPrice) };

  // Filtres de fonctionnalités
  if (features) {
    const featureList = features.split(',');
    if (featureList.includes('charging')) filter['features.hasCharging'] = true;
    if (featureList.includes('accessible')) filter['features.isAccessible'] = true;
    if (featureList.includes('covered')) filter['features.isCovered'] = true;
  }

  // Trouver les places disponibles (sans réservation conflictuelle)
  const availableSpots = await ParkingSpot.find(filter)
    .where('currentReservation').equals(null)
    .sort(sortBy)
    .lean();

  // Calculer le prix pour chaque place
  const duration = (end - start) / (1000 * 60 * 60); // en heures
  const spotsWithPricing = availableSpots.map(spot => {
    const basePrice = duration * spot.pricing.baseRate;
    let finalPrice = basePrice;

    // Appliquer les réductions
    if (spot.pricing.discounts && spot.pricing.discounts.length > 0) {
      spot.pricing.discounts.forEach(discount => {
        if (discount.type === 'long_stay' && duration >= 4) {
          finalPrice -= (basePrice * discount.percentage) / 100;
        }
        if (discount.type === 'early_bird' && start.getHours() < 9) {
          finalPrice -= (basePrice * discount.percentage) / 100;
        }
      });
    }

    return {
      ...spot,
      calculatedPricing: {
        duration,
        basePrice,
        finalPrice: Math.max(finalPrice, 0),
        currency: spot.pricing.currency,
        savings: basePrice - finalPrice
      }
    };
  });

  res.json({
    success: true,
    data: {
      spots: spotsWithPricing,
      searchCriteria: {
        startTime: start,
        endTime: end,
        duration,
        zone,
        type,
        features: features ? features.split(',') : []
      },
      count: spotsWithPricing.length
    }
  });
}));

/**
 * @route   GET /api/parking/zones
 * @desc    Obtenir la liste des zones de parking
 * @access  Public
 */
router.get('/zones', asyncHandler(async (req, res) => {
  // Vérifier le cache
  const cacheKey = 'parking:zones';
  const cachedData = await cacheGet(cacheKey);
  
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true
    });
  }

  const zones = await ParkingSpot.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$location.zone',
        totalSpots: { $sum: 1 },
        availableSpots: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'available'] },
              1,
              0
            ]
          }
        },
        averageRate: { $avg: '$pricing.baseRate' },
        features: { $addToSet: '$features.type' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const result = zones.map(zone => ({
    zone: zone._id,
    totalSpots: zone.totalSpots,
    availableSpots: zone.availableSpots,
    occupancyRate: ((zone.totalSpots - zone.availableSpots) / zone.totalSpots) * 100,
    averageRate: Math.round(zone.averageRate * 100) / 100,
    features: zone.features
  }));

  // Mettre en cache pour 5 minutes
  await cacheSet(cacheKey, result, 300);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route   GET /api/parking/stats
 * @desc    Obtenir les statistiques générales
 * @access  Public
 */
router.get('/stats', asyncHandler(async (req, res) => {
  // Vérifier le cache
  const cacheKey = 'parking:stats';
  const cachedData = await cacheGet(cacheKey);
  
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true
    });
  }

  // Statistiques de base
  const totalSpots = await ParkingSpot.countDocuments({ isActive: true });
  const availableSpots = await ParkingSpot.countDocuments({ 
    isActive: true, 
    status: 'available' 
  });

  // Statistiques IoT
  const iotStats = iotSimulator.getOccupancyStats();

  // Statistiques par type
  const typeStats = await ParkingSpot.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$features.type',
        count: { $sum: 1 },
        available: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'available'] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  const result = {
    overview: {
      totalSpots,
      availableSpots,
      occupiedSpots: totalSpots - availableSpots,
      occupancyRate: totalSpots > 0 ? ((totalSpots - availableSpots) / totalSpots) * 100 : 0
    },
    realTime: iotStats,
    byType: typeStats,
    lastUpdate: new Date().toISOString()
  };

  // Mettre en cache pour 1 minute
  await cacheSet(cacheKey, result, 60);

  res.json({
    success: true,
    data: result
  });
}));

module.exports = router;
