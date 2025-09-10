const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  ultrasonic: {
    distance: { type: Number, required: true }, // Distance en cm
    confidence: { type: Number, min: 0, max: 1, default: 0.8 }
  },
  magnetic: {
    detected: { type: Boolean, required: true },
    strength: { type: Number, min: 0, max: 100 },
    confidence: { type: Number, min: 0, max: 1, default: 0.7 }
  },
  camera: {
    vehicleDetected: { type: Boolean, required: true },
    licensePlate: { type: String, default: null },
    confidence: { type: Number, min: 0, max: 1, default: 0.9 },
    imageUrl: { type: String, default: null }
  },
  timestamp: { type: Date, default: Date.now }
});

const parkingSpotSchema = new mongoose.Schema({
  // Identifiants
  spotId: {
    type: String,
    required: true,
    unique: true,
    match: /^[A-Z]\d+$/ // Format: A1, B2, C10, etc.
  },
  
  parkingLotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingLot',
    required: true
  },
  
  // Position physique
  location: {
    zone: { type: String, required: true }, // A, B, C, etc.
    number: { type: Number, required: true }, // 1, 2, 3, etc.
    floor: { type: Number, default: 0 }, // 0 = rez-de-chaussée
    coordinates: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      latitude: Number,
      longitude: Number
    }
  },
  
  // Statut actuel
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance', 'disabled'],
    default: 'available'
  },
  
  // Données des capteurs IoT
  sensors: {
    current: sensorDataSchema,
    history: [sensorDataSchema]
  },
  
  // Algorithme de fusion IA
  aiDecision: {
    finalStatus: {
      type: String,
      enum: ['available', 'occupied'],
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      required: true
    },
    weights: {
      ultrasonic: { type: Number, default: 0.3 },
      magnetic: { type: Number, default: 0.2 },
      camera: { type: Number, default: 0.5 }
    },
    lastUpdate: { type: Date, default: Date.now }
  },
  
  // Caractéristiques de la place
  features: {
    type: {
      type: String,
      enum: ['standard', 'compact', 'large', 'electric', 'disabled'],
      default: 'standard'
    },
    hasCharging: { type: Boolean, default: false },
    isAccessible: { type: Boolean, default: false },
    isCovered: { type: Boolean, default: false },
    maxHeight: { type: Number, default: 200 }, // en cm
    width: { type: Number, default: 250 }, // en cm
    length: { type: Number, default: 500 } // en cm
  },
  
  // Tarification
  pricing: {
    baseRate: { type: Number, required: true }, // €/heure
    currency: { type: String, default: 'EUR' },
    discounts: [{
      type: { type: String, enum: ['early_bird', 'long_stay', 'frequent_user'] },
      percentage: { type: Number, min: 0, max: 100 },
      conditions: mongoose.Schema.Types.Mixed
    }]
  },
  
  // Réservation actuelle
  currentReservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    default: null
  },
  
  // Statistiques
  stats: {
    totalOccupations: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageOccupationTime: { type: Number, default: 0 }, // en minutes
    lastOccupied: Date,
    popularityScore: { type: Number, default: 0 }
  },
  
  // Maintenance
  maintenance: {
    lastCheck: Date,
    nextCheck: Date,
    issues: [{
      type: String,
      description: String,
      reportedAt: { type: Date, default: Date.now },
      resolved: { type: Boolean, default: false },
      resolvedAt: Date
    }]
  },
  
  // Métadonnées
  isActive: { type: Boolean, default: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour les performances
parkingSpotSchema.index({ spotId: 1 });
parkingSpotSchema.index({ parkingLotId: 1 });
parkingSpotSchema.index({ status: 1 });
parkingSpotSchema.index({ 'location.zone': 1, 'location.number': 1 });
parkingSpotSchema.index({ 'features.type': 1 });
parkingSpotSchema.index({ 'aiDecision.finalStatus': 1 });
parkingSpotSchema.index({ 'aiDecision.lastUpdate': -1 });

// Virtuals
parkingSpotSchema.virtual('isAvailable').get(function() {
  return this.status === 'available' && this.aiDecision.finalStatus === 'available';
});

parkingSpotSchema.virtual('displayName').get(function() {
  return `${this.location.zone}${this.location.number}`;
});

// Méthodes d'instance
parkingSpotSchema.methods.updateSensorData = async function(sensorData) {
  // Ajouter aux historiques (garder seulement les 100 dernières)
  this.sensors.history.push(this.sensors.current);
  if (this.sensors.history.length > 100) {
    this.sensors.history = this.sensors.history.slice(-100);
  }
  
  // Mettre à jour les données actuelles
  this.sensors.current = sensorData;
  
  // Calculer la décision IA
  this.calculateAIDecision();
  
  await this.save();
};

parkingSpotSchema.methods.calculateAIDecision = function() {
  const { ultrasonic, magnetic, camera } = this.sensors.current;
  const weights = this.aiDecision.weights;
  
  // Logique de fusion des capteurs
  let occupancyScore = 0;
  let totalWeight = 0;
  
  // Capteur ultrasonique (distance < 50cm = occupé)
  if (ultrasonic) {
    const ultrasonicScore = ultrasonic.distance < 50 ? 1 : 0;
    occupancyScore += ultrasonicScore * weights.ultrasonic * ultrasonic.confidence;
    totalWeight += weights.ultrasonic * ultrasonic.confidence;
  }
  
  // Capteur magnétique
  if (magnetic) {
    const magneticScore = magnetic.detected ? 1 : 0;
    occupancyScore += magneticScore * weights.magnetic * magnetic.confidence;
    totalWeight += weights.magnetic * magnetic.confidence;
  }
  
  // Caméra (plus fiable)
  if (camera) {
    const cameraScore = camera.vehicleDetected ? 1 : 0;
    occupancyScore += cameraScore * weights.camera * camera.confidence;
    totalWeight += weights.camera * camera.confidence;
  }
  
  // Calcul final
  const finalScore = totalWeight > 0 ? occupancyScore / totalWeight : 0;
  
  this.aiDecision.finalStatus = finalScore > 0.5 ? 'occupied' : 'available';
  this.aiDecision.confidence = Math.abs(finalScore - 0.5) * 2; // Confiance basée sur la distance à 0.5
  this.aiDecision.lastUpdate = new Date();
  
  // Mettre à jour le statut si pas de réservation
  if (!this.currentReservation && this.status !== 'maintenance' && this.status !== 'disabled') {
    this.status = this.aiDecision.finalStatus;
  }
};

// Méthodes statiques
parkingSpotSchema.statics.findAvailable = function(parkingLotId) {
  return this.find({
    parkingLotId,
    status: 'available',
    'aiDecision.finalStatus': 'available',
    isActive: true
  });
};

parkingSpotSchema.statics.getOccupancyStats = async function(parkingLotId) {
  return this.aggregate([
    { $match: { parkingLotId: mongoose.Types.ObjectId(parkingLotId), isActive: true } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('ParkingSpot', parkingSpotSchema);
