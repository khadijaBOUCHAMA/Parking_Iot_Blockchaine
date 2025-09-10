const express = require('express');
const User = require('../models/User');
const ParkingSpot = require('../models/ParkingSpot');
const Reservation = require('../models/Reservation');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { requireRole } = require('../middleware/auth');
const blockchainService = require('../services/blockchainService');
const iotSimulator = require('../services/iotSimulator');
const { cacheGet, cacheSet, cacheFlush } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/admin/dashboard
 * @desc    Obtenir les données du dashboard admin
 * @access  Private (Admin)
 */
router.get('/dashboard', requireRole(['admin']), asyncHandler(async (req, res) => {
  // Vérifier le cache
  const cacheKey = 'admin:dashboard';
  const cachedData = await cacheGet(cacheKey);
  
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true
    });
  }

  // Statistiques des utilisateurs
  const userStats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
        newUsersToday: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  // Statistiques des places de parking
  const parkingStats = await ParkingSpot.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Statistiques des réservations
  const reservationStats = await Reservation.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$pricing.actualCost' }
      }
    }
  ]);

  // Réservations récentes
  const recentReservations = await Reservation.find()
    .populate('userId', 'walletAddress username')
    .populate('parkingSpotId', 'spotId location')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // Statistiques IoT
  const iotStats = iotSimulator.getOccupancyStats();

  // Statistiques blockchain
  const blockchainStats = {
    connected: blockchainService.isConnected(),
    walletAddress: blockchainService.getWalletAddress(),
    balance: await blockchainService.getBalance()
  };

  const dashboard = {
    users: userStats[0] || { totalUsers: 0, activeUsers: 0, newUsersToday: 0 },
    parking: {
      byStatus: parkingStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      realTime: iotStats
    },
    reservations: {
      byStatus: reservationStats.reduce((acc, stat) => {
        acc[stat._id] = { count: stat.count, revenue: stat.totalRevenue || 0 };
        return acc;
      }, {}),
      recent: recentReservations
    },
    blockchain: blockchainStats,
    system: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeEnv: process.env.NODE_ENV,
      iotSimulatorRunning: iotSimulator.getRunningStatus()
    },
    lastUpdate: new Date().toISOString()
  };

  // Mettre en cache pour 30 secondes
  await cacheSet(cacheKey, dashboard, 30);

  res.json({
    success: true,
    data: dashboard
  });
}));

/**
 * @route   GET /api/admin/users
 * @desc    Obtenir la liste des utilisateurs
 * @access  Private (Admin)
 */
router.get('/users', requireRole(['admin']), asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    search, 
    role, 
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Construire le filtre
  const filter = {};
  
  if (search) {
    filter.$or = [
      { walletAddress: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const users = await User.find(filter)
    .select('-nonce') // Exclure les données sensibles
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await User.countDocuments(filter);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: users.length,
        totalUsers: total
      }
    }
  });
}));

/**
 * @route   PUT /api/admin/users/:userId
 * @desc    Mettre à jour un utilisateur
 * @access  Private (Admin)
 */
router.put('/users/:userId', requireRole(['admin']), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role, isActive, username, email } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw createError.notFound('Utilisateur non trouvé');
  }

  // Mettre à jour les champs autorisés
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (username !== undefined) user.username = username;
  if (email !== undefined) user.email = email;

  await user.save();

  logger.info(`Utilisateur ${userId} mis à jour par l'admin ${req.user.walletAddress}`);

  res.json({
    success: true,
    data: {
      user: user.toPublicJSON(),
      message: 'Utilisateur mis à jour avec succès'
    }
  });
}));

/**
 * @route   POST /api/admin/parking-spots
 * @desc    Créer une nouvelle place de parking
 * @access  Private (Admin)
 */
router.post('/parking-spots', requireRole(['admin']), asyncHandler(async (req, res) => {
  const {
    spotId,
    location,
    features,
    pricing,
    parkingLotId
  } = req.body;

  // Vérifier que la place n'existe pas déjà
  const existingSpot = await ParkingSpot.findOne({ spotId });
  if (existingSpot) {
    throw createError.conflict('Une place avec cet ID existe déjà');
  }

  const parkingSpot = new ParkingSpot({
    spotId,
    parkingLotId: parkingLotId || '507f1f77bcf86cd799439011', // ID par défaut
    location,
    features,
    pricing,
    createdBy: req.user._id
  });

  await parkingSpot.save();

  // Invalider les caches
  await cacheFlush();

  logger.info(`Nouvelle place de parking créée: ${spotId} par l'admin ${req.user.walletAddress}`);

  res.status(201).json({
    success: true,
    data: {
      parkingSpot,
      message: 'Place de parking créée avec succès'
    }
  });
}));

/**
 * @route   PUT /api/admin/parking-spots/:spotId
 * @desc    Mettre à jour une place de parking
 * @access  Private (Admin)
 */
router.put('/parking-spots/:spotId', requireRole(['admin']), asyncHandler(async (req, res) => {
  const { spotId } = req.params;
  const updates = req.body;

  const parkingSpot = await ParkingSpot.findOne({ spotId: parseInt(spotId) });
  if (!parkingSpot) {
    throw createError.notFound('Place de parking non trouvée');
  }

  // Mettre à jour les champs autorisés
  const allowedFields = ['status', 'features', 'pricing', 'isActive', 'maintenance'];
  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      parkingSpot[field] = updates[field];
    }
  });

  await parkingSpot.save();

  // Invalider les caches
  await cacheFlush();

  logger.info(`Place de parking ${spotId} mise à jour par l'admin ${req.user.walletAddress}`);

  res.json({
    success: true,
    data: {
      parkingSpot,
      message: 'Place de parking mise à jour avec succès'
    }
  });
}));

/**
 * @route   GET /api/admin/reservations
 * @desc    Obtenir toutes les réservations (admin)
 * @access  Private (Admin)
 */
router.get('/reservations', requireRole(['admin']), asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    startDate,
    endDate,
    userId,
    spotId
  } = req.query;

  // Construire le filtre
  const filter = {};
  
  if (status) filter.status = status;
  if (userId) filter.userId = userId;
  if (spotId) filter.parkingSpotId = spotId;
  
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const reservations = await Reservation.find(filter)
    .populate('userId', 'walletAddress username')
    .populate('parkingSpotId', 'spotId location')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Reservation.countDocuments(filter);

  res.json({
    success: true,
    data: {
      reservations,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: reservations.length,
        totalReservations: total
      }
    }
  });
}));

/**
 * @route   PUT /api/admin/reservations/:reservationId
 * @desc    Mettre à jour une réservation (admin)
 * @access  Private (Admin)
 */
router.put('/reservations/:reservationId', requireRole(['admin']), asyncHandler(async (req, res) => {
  const { reservationId } = req.params;
  const { status, notes } = req.body;

  const reservation = await Reservation.findOne({ reservationId });
  if (!reservation) {
    throw createError.notFound('Réservation non trouvée');
  }

  if (status) reservation.status = status;
  if (notes) {
    reservation.incidents.push({
      type: 'other',
      description: `Note admin: ${notes}`,
      reportedAt: new Date(),
      resolvedAt: new Date(),
      resolution: 'admin_note'
    });
  }

  await reservation.save();

  logger.info(`Réservation ${reservationId} mise à jour par l'admin ${req.user.walletAddress}`);

  res.json({
    success: true,
    data: {
      reservation,
      message: 'Réservation mise à jour avec succès'
    }
  });
}));

/**
 * @route   GET /api/admin/system-info
 * @desc    Obtenir les informations système
 * @access  Private (Admin)
 */
router.get('/system-info', requireRole(['admin']), asyncHandler(async (req, res) => {
  const systemInfo = {
    server: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      pid: process.pid
    },
    memory: process.memoryUsage(),
    blockchain: {
      connected: blockchainService.isConnected(),
      walletAddress: blockchainService.getWalletAddress(),
      balance: await blockchainService.getBalance(),
      gasPrice: await blockchainService.getGasPrice()
    },
    iot: {
      simulatorRunning: iotSimulator.getRunningStatus(),
      sensorsCount: iotSimulator.getAllSensorsData().length,
      occupancyStats: iotSimulator.getOccupancyStats()
    },
    database: {
      // Statistiques MongoDB
      users: await User.countDocuments(),
      parkingSpots: await ParkingSpot.countDocuments(),
      reservations: await Reservation.countDocuments()
    }
  };

  res.json({
    success: true,
    data: systemInfo
  });
}));

/**
 * @route   POST /api/admin/cache/flush
 * @desc    Vider le cache Redis
 * @access  Private (Admin)
 */
router.post('/cache/flush', requireRole(['admin']), asyncHandler(async (req, res) => {
  const flushed = await cacheFlush();

  logger.info(`Cache vidé par l'admin ${req.user.walletAddress}`);

  res.json({
    success: true,
    data: {
      flushed,
      message: 'Cache vidé avec succès'
    }
  });
}));

/**
 * @route   POST /api/admin/iot/restart
 * @desc    Redémarrer le simulateur IoT
 * @access  Private (Admin)
 */
router.post('/iot/restart', requireRole(['admin']), asyncHandler(async (req, res) => {
  try {
    iotSimulator.stop();
    
    // Attendre un peu avant de redémarrer
    setTimeout(() => {
      iotSimulator.start(req.app.get('io')); // Récupérer l'instance Socket.IO
    }, 1000);

    logger.info(`Simulateur IoT redémarré par l'admin ${req.user.walletAddress}`);

    res.json({
      success: true,
      data: {
        message: 'Simulateur IoT redémarré avec succès'
      }
    });
  } catch (error) {
    logger.error('Erreur lors du redémarrage du simulateur IoT:', error);
    throw createError.internalServer('Erreur lors du redémarrage du simulateur IoT');
  }
}));

/**
 * @route   GET /api/admin/logs
 * @desc    Obtenir les logs récents (simulation)
 * @access  Private (Admin)
 */
router.get('/logs', requireRole(['admin']), asyncHandler(async (req, res) => {
  const { level = 'info', limit = 100 } = req.query;

  // Simulation de logs récents (en production, lire depuis les fichiers de log)
  const mockLogs = Array.from({ length: parseInt(limit) }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 60000).toISOString(),
    level: ['info', 'warn', 'error'][Math.floor(Math.random() * 3)],
    message: [
      'Nouvelle réservation créée',
      'Capteur IoT mis à jour',
      'Transaction blockchain confirmée',
      'Utilisateur connecté',
      'Cache mis à jour'
    ][Math.floor(Math.random() * 5)],
    service: ['api', 'iot', 'blockchain', 'auth'][Math.floor(Math.random() * 4)]
  })).filter(log => level === 'all' || log.level === level);

  res.json({
    success: true,
    data: {
      logs: mockLogs,
      count: mockLogs.length,
      level,
      lastUpdate: new Date().toISOString()
    }
  });
}));

module.exports = router;
