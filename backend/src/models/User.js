const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Adresse Ethereum (identifiant principal)
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/
  },
  
  // Informations utilisateur
  email: {
    type: String,
    sparse: true, // Permet les valeurs null multiples
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  username: {
    type: String,
    sparse: true,
    minlength: 3,
    maxlength: 30
  },
  
  // Rôle utilisateur
  role: {
    type: String,
    enum: ['user', 'admin', 'manager'],
    default: 'user'
  },
  
  // Statut du compte
  isActive: {
    type: Boolean,
    default: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Préférences utilisateur
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    language: {
      type: String,
      default: 'fr',
      enum: ['fr', 'en', 'es', 'de']
    },
    currency: {
      type: String,
      default: 'EUR',
      enum: ['EUR', 'USD', 'ETH', 'BTC']
    }
  },
  
  // Statistiques utilisateur
  stats: {
    totalReservations: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    joinDate: { type: Date, default: Date.now }
  },
  
  // Informations de paiement
  paymentMethods: [{
    type: {
      type: String,
      enum: ['ethereum', 'credit_card', 'paypal'],
      required: true
    },
    address: String, // Pour Ethereum
    last4: String,   // Pour cartes de crédit
    isDefault: { type: Boolean, default: false }
  }],
  
  // Métadonnées
  lastLogin: Date,
  ipAddress: String,
  userAgent: String,
  
  // Données blockchain
  nonce: {
    type: Number,
    default: () => Math.floor(Math.random() * 1000000)
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour les performances
userSchema.index({ walletAddress: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'stats.totalReservations': -1 });

// Virtuals
userSchema.virtual('displayName').get(function() {
  return this.username || this.email || `${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}`;
});

userSchema.virtual('shortAddress').get(function() {
  return `${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}`;
});

// Méthodes d'instance
userSchema.methods.updateStats = async function(reservationCost) {
  this.stats.totalReservations += 1;
  this.stats.totalSpent += reservationCost;
  await this.save();
};

userSchema.methods.generateNonce = function() {
  this.nonce = Math.floor(Math.random() * 1000000);
  return this.save();
};

userSchema.methods.toPublicJSON = function() {
  const user = this.toObject();
  delete user.nonce;
  delete user.ipAddress;
  delete user.userAgent;
  return user;
};

// Méthodes statiques
userSchema.statics.findByWallet = function(walletAddress) {
  return this.findOne({ walletAddress: walletAddress.toLowerCase() });
};

userSchema.statics.getActiveUsers = function() {
  return this.find({ isActive: true });
};

userSchema.statics.getUserStats = async function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
        verifiedUsers: { $sum: { $cond: ['$isVerified', 1, 0] } },
        totalReservations: { $sum: '$stats.totalReservations' },
        totalRevenue: { $sum: '$stats.totalSpent' }
      }
    }
  ]);
};

// Middleware pre-save
userSchema.pre('save', function(next) {
  if (this.isModified('walletAddress')) {
    this.walletAddress = this.walletAddress.toLowerCase();
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
