const express = require('express');
const Reservation = require('../models/Reservation');
const ParkingSpot = require('../models/ParkingSpot');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { requireRole } = require('../middleware/auth');
const blockchainService = require('../services/blockchainService');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   POST /api/reservation/create
 * @desc    Créer une nouvelle réservation
 * @access  Private
 */
router.post('/create', asyncHandler(async (req, res) => {
  const {
    parkingSpotId,
    startTime,
    endTime,
    vehicle
  } = req.body;

  const user = req.user;

  // Validation des données
  if (!parkingSpotId || !startTime || !endTime) {
    throw createError.badRequest('Place, heure de début et heure de fin requises');
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start >= end) {
    throw createError.badRequest('L\'heure de fin doit être postérieure à l\'heure de début');
  }

  if (start < new Date()) {
    throw createError.badRequest('L\'heure de début ne peut pas être dans le passé');
  }

  // Vérifier que la place existe et est disponible
  const parkingSpot = await ParkingSpot.findById(parkingSpotId);
  
  if (!parkingSpot || !parkingSpot.isActive) {
    throw createError.notFound('Place de parking non trouvée ou inactive');
  }

  if (parkingSpot.status !== 'available') {
    throw createError.conflict('Place de parking non disponible');
  }

  // Vérifier les conflits de réservation
  const conflictingReservation = await Reservation.findOne({
    parkingSpotId,
    status: { $in: ['pending', 'confirmed', 'active'] },
    $or: [
      {
        startTime: { $lt: end },
        endTime: { $gt: start }
      }
    ]
  });

  if (conflictingReservation) {
    throw createError.conflict('Place déjà réservée pour cette période');
  }

  // Calculer le prix
  const duration = (end - start) / (1000 * 60 * 60); // en heures
  const baseRate = parkingSpot.pricing.baseRate;
  let estimatedCost = duration * baseRate;

  // Appliquer les réductions
  let discounts = 0;
  if (parkingSpot.pricing.discounts) {
    parkingSpot.pricing.discounts.forEach(discount => {
      if (discount.type === 'long_stay' && duration >= 4) {
        discounts += (estimatedCost * discount.percentage) / 100;
      }
      if (discount.type === 'early_bird' && start.getHours() < 9) {
        discounts += (estimatedCost * discount.percentage) / 100;
      }
    });
  }

  estimatedCost = Math.max(estimatedCost - discounts, 0);

  // Créer la réservation
  const reservation = new Reservation({
    userId: user._id,
    walletAddress: user.walletAddress,
    parkingSpotId,
    parkingLotId: parkingSpot.parkingLotId,
    startTime: start,
    endTime: end,
    vehicle,
    pricing: {
      baseRate,
      estimatedCost,
      currency: parkingSpot.pricing.currency,
      breakdown: {
        baseCost: duration * baseRate,
        discounts,
        taxes: 0,
        fees: 0
      }
    },
    source: 'web',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  await reservation.save();

  // Mettre à jour la place de parking
  parkingSpot.currentReservation = reservation._id;
  await parkingSpot.save();

  // Invalider les caches
  await cacheDel(`parking:spot:${parkingSpot.spotId}`);
  await cacheDel('parking:availability:all');

  logger.info(`Nouvelle réservation créée: ${reservation.reservationId} par ${user.walletAddress}`);

  res.status(201).json({
    success: true,
    data: {
      reservation: await reservation.populate('parkingSpotId'),
      paymentRequired: true,
      estimatedCost,
      currency: parkingSpot.pricing.currency
    }
  });
}));

/**
 * @route   POST /api/reservation/:reservationId/pay
 * @desc    Effectuer le paiement d'une réservation via blockchain
 * @access  Private
 */
router.post('/:reservationId/pay', asyncHandler(async (req, res) => {
  const { reservationId } = req.params;
  const { transactionHash, blockNumber, gasUsed } = req.body;

  const reservation = await Reservation.findOne({
    reservationId,
    userId: req.user._id
  }).populate('parkingSpotId');

  if (!reservation) {
    throw createError.notFound('Réservation non trouvée');
  }

  if (reservation.status !== 'pending') {
    throw createError.badRequest('Réservation déjà payée ou annulée');
  }

  // Vérifier la transaction sur la blockchain
  try {
    if (blockchainService.isConnected()) {
      // Ici on pourrait vérifier la transaction sur la blockchain
      // Pour la démo, on fait confiance aux données fournies
      
      reservation.blockchain.paymentTx = transactionHash;
      reservation.blockchain.blockNumber = blockNumber;
      reservation.blockchain.gasUsed = gasUsed;
      reservation.status = 'confirmed';
      
      await reservation.save();

      logger.blockchain(`Paiement confirmé pour la réservation ${reservationId}`, {
        transactionHash,
        blockNumber,
        user: req.user.walletAddress
      });

      res.json({
        success: true,
        data: {
          reservation,
          paymentConfirmed: true,
          transactionHash
        }
      });
    } else {
      throw createError.serviceUnavailable('Service blockchain indisponible');
    }
  } catch (error) {
    logger.error('Erreur lors de la vérification du paiement:', error);
    throw createError.internalServer('Erreur lors de la vérification du paiement');
  }
}));

/**
 * @route   GET /api/reservation/my-reservations
 * @desc    Obtenir les réservations de l'utilisateur connecté
 * @access  Private
 */
router.get('/my-reservations', asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const user = req.user;

  // Construire le filtre
  const filter = { userId: user._id };
  if (status) filter.status = status;

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const reservations = await Reservation.find(filter)
    .populate('parkingSpotId')
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
 * @route   GET /api/reservation/:reservationId
 * @desc    Obtenir une réservation spécifique
 * @access  Private
 */
router.get('/:reservationId', asyncHandler(async (req, res) => {
  const { reservationId } = req.params;
  const user = req.user;

  const reservation = await Reservation.findOne({
    reservationId,
    userId: user._id
  }).populate('parkingSpotId');

  if (!reservation) {
    throw createError.notFound('Réservation non trouvée');
  }

  // Enrichir avec les données blockchain si disponibles
  try {
    if (blockchainService.isConnected() && reservation.blockchain.paymentTx) {
      const blockchainData = await blockchainService.getReservation(reservation.reservationId);
      reservation.blockchainData = blockchainData;
    }
  } catch (error) {
    logger.warn(`Impossible de récupérer les données blockchain pour la réservation ${reservationId}:`, error.message);
  }

  res.json({
    success: true,
    data: reservation
  });
}));

/**
 * @route   PUT /api/reservation/:reservationId/cancel
 * @desc    Annuler une réservation
 * @access  Private
 */
router.put('/:reservationId/cancel', asyncHandler(async (req, res) => {
  const { reservationId } = req.params;
  const { reason = 'user_cancelled' } = req.body;
  const user = req.user;

  const reservation = await Reservation.findOne({
    reservationId,
    userId: user._id
  }).populate('parkingSpotId');

  if (!reservation) {
    throw createError.notFound('Réservation non trouvée');
  }

  if (reservation.status !== 'confirmed' && reservation.status !== 'pending') {
    throw createError.badRequest('Impossible d\'annuler cette réservation');
  }

  if (reservation.actualStartTime) {
    throw createError.badRequest('Impossible d\'annuler une réservation déjà commencée');
  }

  // Vérifier si l'annulation est encore possible (ex: 1 heure avant)
  const now = new Date();
  const timeDiff = (reservation.startTime - now) / (1000 * 60); // en minutes

  if (timeDiff < 60) {
    throw createError.badRequest('Annulation impossible moins d\'1 heure avant le début');
  }

  // Annuler la réservation
  await reservation.cancel(reason);

  // Libérer la place de parking
  const parkingSpot = await ParkingSpot.findById(reservation.parkingSpotId);
  if (parkingSpot) {
    parkingSpot.currentReservation = null;
    await parkingSpot.save();
  }

  // Invalider les caches
  await cacheDel(`parking:spot:${parkingSpot.spotId}`);
  await cacheDel('parking:availability:all');

  logger.info(`Réservation annulée: ${reservationId} par ${user.walletAddress}, raison: ${reason}`);

  res.json({
    success: true,
    data: {
      reservation,
      refundAmount: reservation.pricing.estimatedCost * 0.95, // 95% de remboursement
      message: 'Réservation annulée avec succès'
    }
  });
}));

/**
 * @route   PUT /api/reservation/:reservationId/extend
 * @desc    Prolonger une réservation
 * @access  Private
 */
router.put('/:reservationId/extend', asyncHandler(async (req, res) => {
  const { reservationId } = req.params;
  const { newEndTime } = req.body;
  const user = req.user;

  if (!newEndTime) {
    throw createError.badRequest('Nouvelle heure de fin requise');
  }

  const reservation = await Reservation.findOne({
    reservationId,
    userId: user._id
  }).populate('parkingSpotId');

  if (!reservation) {
    throw createError.notFound('Réservation non trouvée');
  }

  if (reservation.status !== 'active') {
    throw createError.badRequest('Seules les réservations actives peuvent être prolongées');
  }

  const newEnd = new Date(newEndTime);
  
  if (newEnd <= reservation.endTime) {
    throw createError.badRequest('La nouvelle heure de fin doit être postérieure à l\'heure de fin actuelle');
  }

  // Calculer le coût supplémentaire
  const additionalDuration = (newEnd - reservation.endTime) / (1000 * 60 * 60);
  const additionalCost = additionalDuration * reservation.pricing.baseRate;

  // Créer une demande d'extension
  reservation.extensions.push({
    originalEndTime: reservation.endTime,
    newEndTime: newEnd,
    additionalCost,
    requestedAt: new Date(),
    status: 'pending'
  });

  await reservation.save();

  logger.info(`Demande d'extension pour la réservation ${reservationId}: +${additionalDuration}h`);

  res.json({
    success: true,
    data: {
      reservation,
      additionalCost,
      additionalDuration,
      message: 'Demande d\'extension enregistrée'
    }
  });
}));

/**
 * @route   POST /api/reservation/:reservationId/rate
 * @desc    Noter une réservation terminée
 * @access  Private
 */
router.post('/:reservationId/rate', asyncHandler(async (req, res) => {
  const { reservationId } = req.params;
  const { rating, comment } = req.body;
  const user = req.user;

  if (!rating || rating < 1 || rating > 5) {
    throw createError.badRequest('Note entre 1 et 5 requise');
  }

  const reservation = await Reservation.findOne({
    reservationId,
    userId: user._id
  });

  if (!reservation) {
    throw createError.notFound('Réservation non trouvée');
  }

  if (reservation.status !== 'completed') {
    throw createError.badRequest('Seules les réservations terminées peuvent être notées');
  }

  if (reservation.rating.userRating) {
    throw createError.badRequest('Réservation déjà notée');
  }

  // Ajouter la note
  reservation.rating = {
    userRating: rating,
    userComment: comment,
    ratedAt: new Date()
  };

  await reservation.save();

  logger.info(`Réservation ${reservationId} notée: ${rating}/5 par ${user.walletAddress}`);

  res.json({
    success: true,
    data: {
      reservation,
      message: 'Note enregistrée avec succès'
    }
  });
}));

/**
 * @route   GET /api/reservation/active
 * @desc    Obtenir les réservations actives (admin)
 * @access  Private (Admin/Manager)
 */
router.get('/active', requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const activeReservations = await Reservation.findActiveReservations();

  res.json({
    success: true,
    data: {
      reservations: activeReservations,
      count: activeReservations.length
    }
  });
}));

/**
 * @route   GET /api/reservation/stats
 * @desc    Obtenir les statistiques des réservations (admin)
 * @access  Private (Admin/Manager)
 */
router.get('/stats', requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 jours par défaut
  const end = endDate ? new Date(endDate) : new Date();

  const stats = await Reservation.getRevenueStats(start, end);

  // Statistiques générales
  const totalReservations = await Reservation.countDocuments({
    createdAt: { $gte: start, $lte: end }
  });

  const completedReservations = await Reservation.countDocuments({
    status: 'completed',
    actualEndTime: { $gte: start, $lte: end }
  });

  res.json({
    success: true,
    data: {
      period: { start, end },
      overview: {
        totalReservations,
        completedReservations,
        completionRate: totalReservations > 0 ? (completedReservations / totalReservations) * 100 : 0
      },
      revenue: stats
    }
  });
}));

module.exports = router;
