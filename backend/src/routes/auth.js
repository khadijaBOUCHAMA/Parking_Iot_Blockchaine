const express = require('express');
const { ethers } = require('ethers');
const User = require('../models/User');
const { 
  generateSignMessage, 
  generateJWT, 
  authRateLimit,
  authMiddleware 
} = require('../middleware/auth');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/auth/nonce
 * @desc    Obtenir un nonce pour la signature MetaMask
 * @access  Public
 */
router.get('/nonce/:walletAddress', asyncHandler(async (req, res) => {
  const { walletAddress } = req.params;

  // Valider l'adresse Ethereum
  if (!ethers.isAddress(walletAddress)) {
    throw createError.badRequest('Adresse Ethereum invalide');
  }

  // Trouver ou créer l'utilisateur
  let user = await User.findByWallet(walletAddress);
  
  if (!user) {
    user = new User({
      walletAddress: walletAddress.toLowerCase(),
      role: 'user',
      isActive: true
    });
    await user.save();
    logger.info(`Nouvel utilisateur créé pour obtenir le nonce: ${walletAddress}`);
  }

  // Générer un nouveau nonce
  await user.generateNonce();

  // Générer le message à signer
  const message = generateSignMessage(walletAddress, user.nonce);

  res.json({
    success: true,
    data: {
      message,
      nonce: user.nonce
    }
  });
}));

/**
 * @route   POST /api/auth/verify
 * @desc    Vérifier la signature MetaMask et connecter l'utilisateur
 * @access  Public
 */
router.post('/verify', authRateLimit, asyncHandler(async (req, res) => {
  const { walletAddress, signature, message } = req.body;

  // Validation des données
  if (!walletAddress || !signature || !message) {
    throw createError.badRequest('Adresse, signature et message requis');
  }

  if (!ethers.isAddress(walletAddress)) {
    throw createError.badRequest('Adresse Ethereum invalide');
  }

  try {
    // Vérifier la signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      logger.security('Tentative de signature invalide', { 
        walletAddress, 
        recoveredAddress,
        ip: req.ip 
      });
      throw createError.unauthorized('Signature invalide');
    }

    // Vérifier que le message n'est pas trop ancien
    const messageData = JSON.parse(message);
    const messageTime = new Date(messageData.timestamp);
    const now = new Date();
    const timeDiff = (now - messageTime) / 1000;

    if (timeDiff > 300) { // 5 minutes
      throw createError.unauthorized('Message expiré');
    }

    // Trouver l'utilisateur
    const user = await User.findByWallet(walletAddress);
    
    if (!user) {
      throw createError.notFound('Utilisateur non trouvé. Obtenez d\'abord un nonce.');
    }

    if (!user.isActive) {
      throw createError.forbidden('Compte désactivé');
    }

    // Vérifier le nonce
    if (messageData.nonce !== user.nonce) {
      throw createError.unauthorized('Nonce invalide');
    }

    // Mettre à jour les informations de connexion
    user.lastLogin = new Date();
    user.ipAddress = req.ip;
    user.userAgent = req.get('User-Agent');
    
    // Générer un nouveau nonce pour la prochaine connexion
    await user.generateNonce();

    // Générer le token JWT
    const token = generateJWT(user);

    logger.info(`Connexion réussie pour: ${walletAddress}`);

    res.json({
      success: true,
      data: {
        token,
        user: user.toPublicJSON(),
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });

  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    
    logger.error('Erreur lors de la vérification de signature:', error);
    throw createError.unauthorized('Erreur de vérification de signature');
  }
}));

/**
 * @route   GET /api/auth/me
 * @desc    Obtenir les informations de l'utilisateur connecté
 * @access  Private
 */
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user.toPublicJSON(),
      authMethod: req.authMethod
    }
  });
}));

/**
 * @route   PUT /api/auth/profile
 * @desc    Mettre à jour le profil utilisateur
 * @access  Private
 */
router.put('/profile', authMiddleware, asyncHandler(async (req, res) => {
  const { username, email, preferences } = req.body;
  const user = req.user;

  // Validation des données
  if (username && (username.length < 3 || username.length > 30)) {
    throw createError.badRequest('Le nom d\'utilisateur doit contenir entre 3 et 30 caractères');
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError.badRequest('Format d\'email invalide');
  }

  // Vérifier l'unicité du nom d'utilisateur et de l'email
  if (username && username !== user.username) {
    const existingUser = await User.findOne({ 
      username, 
      _id: { $ne: user._id } 
    });
    if (existingUser) {
      throw createError.conflict('Ce nom d\'utilisateur est déjà utilisé');
    }
  }

  if (email && email !== user.email) {
    const existingUser = await User.findOne({ 
      email, 
      _id: { $ne: user._id } 
    });
    if (existingUser) {
      throw createError.conflict('Cet email est déjà utilisé');
    }
  }

  // Mettre à jour les champs
  if (username !== undefined) user.username = username;
  if (email !== undefined) user.email = email;
  if (preferences !== undefined) {
    user.preferences = { ...user.preferences, ...preferences };
  }

  await user.save();

  logger.info(`Profil mis à jour pour: ${user.walletAddress}`);

  res.json({
    success: true,
    data: {
      user: user.toPublicJSON()
    }
  });
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnecter l'utilisateur (côté client principalement)
 * @access  Private
 */
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  // En JWT, la déconnexion se fait principalement côté client
  // Ici on peut logger l'événement et éventuellement blacklister le token
  
  logger.info(`Déconnexion de: ${req.user.walletAddress}`);

  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
}));

/**
 * @route   GET /api/auth/stats
 * @desc    Obtenir les statistiques d'authentification (admin seulement)
 * @access  Private (Admin)
 */
router.get('/stats', authMiddleware, asyncHandler(async (req, res) => {
  // Vérifier que l'utilisateur est admin
  if (req.user.role !== 'admin') {
    throw createError.forbidden('Accès réservé aux administrateurs');
  }

  const stats = await User.getUserStats();
  
  res.json({
    success: true,
    data: stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      verifiedUsers: 0,
      totalReservations: 0,
      totalRevenue: 0
    }
  });
}));

/**
 * @route   GET /api/auth/check-address/:address
 * @desc    Vérifier si une adresse est déjà enregistrée
 * @access  Public
 */
router.get('/check-address/:address', asyncHandler(async (req, res) => {
  const { address } = req.params;

  if (!ethers.isAddress(address)) {
    throw createError.badRequest('Adresse Ethereum invalide');
  }

  const user = await User.findByWallet(address);
  
  res.json({
    success: true,
    data: {
      exists: !!user,
      isActive: user ? user.isActive : false,
      hasProfile: user ? !!(user.username || user.email) : false
    }
  });
}));

module.exports = router;
