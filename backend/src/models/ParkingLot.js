const mongoose = require('mongoose');

const parkingLotSchema = new mongoose.Schema({
  // Identifiants
  lotId: {
    type: String,
    required: true,
    unique: true,
    match: /^LOT-[A-Z0-9]+$/
  },
  
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  description: {
    type: String,
    maxlength: 500
  },
  
  // Localisation
  location: {
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: 'France' }
    },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    timezone: { type: String, default: 'Europe/Paris' }
  },
  
  // Caractéristiques
  capacity: {
    total: { type: Number, required: true, min: 1 },
    available: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    occupied: { type: Number, default: 0 },
    maintenance: { type: Number, default: 0 }
  },
  
  // Types de places disponibles
  spotTypes: [{
    type: {
      type: String,
      enum: ['standard', 'compact', 'large', 'electric', 'disabled'],
      required: true
    },
    count: { type: Number, required: true, min: 0 },
    baseRate: { type: Number, required: true, min: 0 }
  }],
  
  // Horaires d'ouverture
  operatingHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
  },
  
  // Services et équipements
  amenities: {
    security: { type: Boolean, default: false },
    lighting: { type: Boolean, default: true },
    covered: { type: Boolean, default: false },
    evCharging: { type: Boolean, default: false },
    carWash: { type: Boolean, default: false },
    restrooms: { type: Boolean, default: false },
    elevator: { type: Boolean, default: false },
    cctv: { type: Boolean, default: false }
  },
  
  // Tarification
  pricing: {
    currency: { type: String, default: 'EUR' },
    baseRate: { type: Number, required: true, min: 0 },
    
    // Tarifs spéciaux
    specialRates: [{
      name: String,
      description: String,
      rate: Number,
      conditions: mongoose.Schema.Types.Mixed,
      validFrom: Date,
      validTo: Date
    }],
    
    // Réductions
    discounts: [{
      type: {
        type: String,
        enum: ['early_bird', 'long_stay', 'frequent_user', 'student', 'senior']
      },
      percentage: { type: Number, min: 0, max: 100 },
      conditions: mongoose.Schema.Types.Mixed
    }]
  },
  
  // Gestion et contact
  management: {
    operator: {
      name: { type: String, required: true },
      contact: {
        phone: String,
        email: String,
        website: String
      }
    },
    
    onSiteStaff: { type: Boolean, default: false },
    emergencyContact: {
      phone: { type: String, required: true },
      available24h: { type: Boolean, default: false }
    }
  },
  
  // Technologie IoT
  iotConfig: {
    sensorTypes: [{
      type: String,
      enum: ['ultrasonic', 'magnetic', 'camera', 'pressure']
    }],
    
    networkType: {
      type: String,
      enum: ['wifi', 'cellular', 'lora', 'zigbee'],
      default: 'wifi'
    },
    
    updateFrequency: { type: Number, default: 30 }, // secondes
    
    aiEnabled: { type: Boolean, default: true },
    
    maintenanceSchedule: {
      lastCheck: Date,
      nextCheck: Date,
      frequency: { type: Number, default: 30 } // jours
    }
  },
  
  // Blockchain
  blockchain: {
    contractAddress: String,
    deployedBlock: Number,
    oracleAddress: String,
    isActive: { type: Boolean, default: false }
  },
  
  // Statistiques
  stats: {
    totalReservations: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageOccupancyRate: { type: Number, default: 0 },
    averageSessionDuration: { type: Number, default: 0 }, // minutes
    customerSatisfaction: { type: Number, default: 0, min: 0, max: 5 },
    
    // Données mensuelles
    monthlyStats: [{
      year: Number,
      month: Number,
      reservations: Number,
      revenue: Number,
      occupancyRate: Number,
      averageRating: Number
    }]
  },
  
  // Statut et métadonnées
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'construction'],
    default: 'active'
  },
  
  isPublic: { type: Boolean, default: true },
  
  tags: [String],
  
  // Données de création et modification
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour les performances
parkingLotSchema.index({ lotId: 1 });
parkingLotSchema.index({ 'location.coordinates': '2dsphere' });
parkingLotSchema.index({ status: 1 });
parkingLotSchema.index({ isPublic: 1 });
parkingLotSchema.index({ tags: 1 });

// Virtuals
parkingLotSchema.virtual('occupancyRate').get(function() {
  if (this.capacity.total === 0) return 0;
  return (this.capacity.occupied / this.capacity.total) * 100;
});

parkingLotSchema.virtual('availabilityRate').get(function() {
  if (this.capacity.total === 0) return 0;
  return (this.capacity.available / this.capacity.total) * 100;
});

parkingLotSchema.virtual('isOpen').get(function() {
  const now = new Date();
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const todayHours = this.operatingHours[dayName];
  
  if (todayHours.closed) return false;
  
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
});

// Méthodes d'instance
parkingLotSchema.methods.updateCapacity = async function() {
  // Cette méthode serait appelée pour recalculer les capacités
  // basées sur les places de parking associées
  const ParkingSpot = mongoose.model('ParkingSpot');
  
  const spots = await ParkingSpot.find({ parkingLotId: this._id, isActive: true });
  
  this.capacity.total = spots.length;
  this.capacity.available = spots.filter(spot => spot.status === 'available').length;
  this.capacity.occupied = spots.filter(spot => spot.status === 'occupied').length;
  this.capacity.reserved = spots.filter(spot => spot.status === 'reserved').length;
  this.capacity.maintenance = spots.filter(spot => spot.status === 'maintenance').length;
  
  await this.save();
  return this.capacity;
};

parkingLotSchema.methods.calculateDistance = function(latitude, longitude) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (latitude - this.location.coordinates.latitude) * Math.PI / 180;
  const dLon = (longitude - this.location.coordinates.longitude) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.location.coordinates.latitude * Math.PI / 180) * 
    Math.cos(latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance en km
};

// Méthodes statiques
parkingLotSchema.statics.findNearby = function(latitude, longitude, maxDistance = 10) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance * 1000 // Convertir km en mètres
      }
    },
    status: 'active',
    isPublic: true
  });
};

parkingLotSchema.statics.getOccupancyStats = async function() {
  return this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        totalLots: { $sum: 1 },
        totalCapacity: { $sum: '$capacity.total' },
        totalOccupied: { $sum: '$capacity.occupied' },
        totalAvailable: { $sum: '$capacity.available' },
        averageOccupancyRate: { $avg: { $multiply: [{ $divide: ['$capacity.occupied', '$capacity.total'] }, 100] } }
      }
    }
  ]);
};

// Middleware pre-save
parkingLotSchema.pre('save', function(next) {
  // Générer un lotId si pas défini
  if (!this.lotId) {
    this.lotId = `LOT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
  
  // Valider les coordonnées
  if (this.location.coordinates.latitude < -90 || this.location.coordinates.latitude > 90) {
    return next(new Error('Latitude invalide'));
  }
  
  if (this.location.coordinates.longitude < -180 || this.location.coordinates.longitude > 180) {
    return next(new Error('Longitude invalide'));
  }
  
  next();
});

module.exports = mongoose.model('ParkingLot', parkingLotSchema);
