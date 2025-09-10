const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  // Identifiants
  reservationId: {
    type: String,
    required: true,
    unique: true,
    default: () => `RES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Utilisateur
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  walletAddress: {
    type: String,
    required: true,
    lowercase: true
  },
  
  // Place de parking
  parkingSpotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSpot',
    required: true
  },
  
  parkingLotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingLot',
    required: true
  },
  
  // Horaires
  startTime: {
    type: Date,
    required: true
  },
  
  endTime: {
    type: Date,
    required: true
  },
  
  actualStartTime: Date, // Quand le véhicule arrive réellement
  actualEndTime: Date,   // Quand le véhicule part réellement
  
  // Statut de la réservation
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired', 'no_show'],
    default: 'pending'
  },
  
  // Informations du véhicule
  vehicle: {
    licensePlate: String,
    make: String,
    model: String,
    color: String,
    type: {
      type: String,
      enum: ['car', 'motorcycle', 'truck', 'van', 'electric'],
      default: 'car'
    }
  },
  
  // Paiement et tarification
  pricing: {
    baseRate: { type: Number, required: true }, // €/heure
    estimatedCost: { type: Number, required: true },
    actualCost: { type: Number, default: 0 },
    currency: { type: String, default: 'EUR' },
    
    // Détails de facturation
    breakdown: {
      baseCost: Number,
      discounts: Number,
      taxes: Number,
      fees: Number
    }
  },
  
  // Blockchain et paiement
  blockchain: {
    transactionHash: String,
    blockNumber: Number,
    gasUsed: Number,
    gasPrice: String,
    contractAddress: String,
    
    // Paiements
    paymentTx: String,      // Transaction de paiement initial
    refundTx: String,       // Transaction de remboursement si applicable
    
    // Smart contract events
    events: [{
      eventName: String,
      transactionHash: String,
      blockNumber: Number,
      timestamp: Date,
      data: mongoose.Schema.Types.Mixed
    }]
  },
  
  // Notifications et communications
  notifications: {
    confirmationSent: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
    arrivalNotified: { type: Boolean, default: false },
    completionSent: { type: Boolean, default: false }
  },
  
  // Évaluation et feedback
  rating: {
    userRating: { type: Number, min: 1, max: 5 },
    userComment: String,
    ratedAt: Date
  },
  
  // Métadonnées
  source: {
    type: String,
    enum: ['web', 'mobile', 'api', 'admin'],
    default: 'web'
  },
  
  ipAddress: String,
  userAgent: String,
  
  // Gestion des extensions
  extensions: [{
    originalEndTime: Date,
    newEndTime: Date,
    additionalCost: Number,
    requestedAt: Date,
    approvedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  
  // Incidents et problèmes
  incidents: [{
    type: {
      type: String,
      enum: ['late_arrival', 'overstay', 'wrong_spot', 'payment_issue', 'other']
    },
    description: String,
    reportedAt: { type: Date, default: Date.now },
    resolvedAt: Date,
    resolution: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour les performances
reservationSchema.index({ reservationId: 1 });
reservationSchema.index({ userId: 1 });
reservationSchema.index({ walletAddress: 1 });
reservationSchema.index({ parkingSpotId: 1 });
reservationSchema.index({ status: 1 });
reservationSchema.index({ startTime: 1, endTime: 1 });
reservationSchema.index({ 'blockchain.transactionHash': 1 });
reservationSchema.index({ createdAt: -1 });

// Virtuals
reservationSchema.virtual('duration').get(function() {
  const start = this.actualStartTime || this.startTime;
  const end = this.actualEndTime || this.endTime;
  return Math.ceil((end - start) / (1000 * 60)); // Durée en minutes
});

reservationSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.startTime <= now && 
         this.endTime >= now;
});

reservationSchema.virtual('isExpired').get(function() {
  return new Date() > this.endTime && this.status !== 'completed';
});

// Méthodes d'instance
reservationSchema.methods.calculateActualCost = function() {
  if (!this.actualStartTime || !this.actualEndTime) {
    return this.pricing.estimatedCost;
  }
  
  const actualDurationHours = (this.actualEndTime - this.actualStartTime) / (1000 * 60 * 60);
  const baseCost = actualDurationHours * this.pricing.baseRate;
  
  // Appliquer les réductions et frais
  const discounts = this.pricing.breakdown.discounts || 0;
  const taxes = this.pricing.breakdown.taxes || 0;
  const fees = this.pricing.breakdown.fees || 0;
  
  this.pricing.actualCost = Math.max(0, baseCost - discounts + taxes + fees);
  return this.pricing.actualCost;
};

reservationSchema.methods.markAsActive = async function() {
  this.status = 'active';
  this.actualStartTime = new Date();
  await this.save();
};

reservationSchema.methods.complete = async function() {
  this.status = 'completed';
  this.actualEndTime = new Date();
  this.calculateActualCost();
  await this.save();
};

reservationSchema.methods.cancel = async function(reason = 'user_cancelled') {
  this.status = 'cancelled';
  this.incidents.push({
    type: 'other',
    description: `Réservation annulée: ${reason}`,
    reportedAt: new Date(),
    resolvedAt: new Date(),
    resolution: 'cancelled'
  });
  await this.save();
};

reservationSchema.methods.addBlockchainEvent = async function(eventName, transactionHash, blockNumber, data = {}) {
  this.blockchain.events.push({
    eventName,
    transactionHash,
    blockNumber,
    timestamp: new Date(),
    data
  });
  await this.save();
};

// Méthodes statiques
reservationSchema.statics.findActiveReservations = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    startTime: { $lte: now },
    endTime: { $gte: now }
  }).populate('userId parkingSpotId');
};

reservationSchema.statics.findByWallet = function(walletAddress) {
  return this.find({ walletAddress: walletAddress.toLowerCase() })
    .populate('parkingSpotId')
    .sort({ createdAt: -1 });
};

reservationSchema.statics.getRevenueStats = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        status: 'completed',
        actualEndTime: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$actualEndTime' },
          month: { $month: '$actualEndTime' },
          day: { $dayOfMonth: '$actualEndTime' }
        },
        totalRevenue: { $sum: '$pricing.actualCost' },
        totalReservations: { $sum: 1 },
        averageCost: { $avg: '$pricing.actualCost' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
};

// Middleware pre-save
reservationSchema.pre('save', function(next) {
  // Vérifier la cohérence des dates
  if (this.startTime >= this.endTime) {
    return next(new Error('La date de fin doit être postérieure à la date de début'));
  }
  
  // Calculer le coût estimé si pas défini
  if (!this.pricing.estimatedCost) {
    const durationHours = (this.endTime - this.startTime) / (1000 * 60 * 60);
    this.pricing.estimatedCost = durationHours * this.pricing.baseRate;
  }
  
  next();
});

module.exports = mongoose.model('Reservation', reservationSchema);
