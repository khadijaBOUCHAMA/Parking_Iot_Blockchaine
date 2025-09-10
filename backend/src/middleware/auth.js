const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Middleware d'authentification pour les routes protégées
 * Supporte l'authentification par JWT et par signature MetaMask
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const walletAddress = req.header('X-Wallet-Address');
    const signature = req.header('X-Signature');
    const message = req.header('X-Message');

    // Méthode 1: Authentification par JWT
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user || !user.isActive) {
          return res.status(401).json({
            success: false,
            message: 'Utilisateur non trouvé ou inactif'
          });
        }

        req.user = user;
        req.authMethod = 'jwt';
        return next();
        
      } catch (jwtError) {
        logger.security('Token JWT invalide', { error: jwtError.message, ip: req.ip });
        return res.status(401).json({
          success: false,
          message: 'Token invalide'
        });
      }
    }

    // Méthode 2: Authentification par signature MetaMask
    if (walletAddress && signature && message) {
      try {
        // Vérifier la signature
        const recoveredAddress = ethers.verifyMessage(message, signature);
        
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          logger.security('Signature MetaMask invalide', { 
            walletAddress, 
            recoveredAddress, 
            ip: req.ip 
          });
          return res.status(401).json({
            success: false,
            message: 'Signature invalide'
          });
        }

        // Vérifier que le message n'est pas trop ancien (5 minutes max)
        const messageData = JSON.parse(message);
        const messageTime = new Date(messageData.timestamp);
        const now = new Date();
        const timeDiff = (now - messageTime) / 1000; // en secondes

        if (timeDiff > 300) { // 5 minutes
          return res.status(401).json({
            success: false,
            message: 'Message expiré'
          });
        }

        // Trouver ou créer l'utilisateur
        let user = await User.findByWallet(walletAddress);
        
        if (!user) {
          // Créer un nouvel utilisateur
          user = new User({
            walletAddress: walletAddress.toLowerCase(),
            role: 'user',
            isActive: true,
            lastLogin: new Date(),
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
          
          await user.save();
          logger.info(`Nouvel utilisateur créé: ${walletAddress}`);
        } else {
          // Mettre à jour les informations de connexion
          user.lastLogin = new Date();
          user.ipAddress = req.ip;
          user.userAgent = req.get('User-Agent');
          await user.save();
        }

        if (!user.isActive) {
          return res.status(401).json({
            success: false,
            message: 'Compte désactivé'
          });
        }

        req.user = user;
        req.authMethod = 'metamask';
        return next();
        
      } catch (signatureError) {
        logger.security('Erreur de vérification de signature', { 
          error: signatureError.message, 
          walletAddress, 
          ip: req.ip 
        });
        return res.status(401).json({
          success: false,
          message: 'Erreur de vérification de signature'
        });
      }
    }

    // Aucune méthode d'authentification fournie
    return res.status(401).json({
      success: false,
      message: 'Authentification requise'
    });

  } catch (error) {
    logger.error('Erreur dans le middleware d\'authentification:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Middleware pour vérifier les rôles d'utilisateur
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      logger.security('Accès refusé - rôle insuffisant', {
        userId: req.user._id,
        userRole,
        requiredRoles: allowedRoles,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }

    next();
  };
};

/**
 * Middleware pour vérifier que l'utilisateur est admin
 */
const requireAdmin = requireRole(['admin']);

/**
 * Middleware pour vérifier que l'utilisateur est admin ou manager
 */
const requireManager = requireRole(['admin', 'manager']);

/**
 * Middleware optionnel - n'échoue pas si pas d'auth
 */
const optionalAuth = async (req, res, next) => {
  try {
    await authMiddleware(req, res, () => {
      // Continue même si l'auth échoue
      next();
    });
  } catch (error) {
    // Ignorer les erreurs d'auth et continuer
    next();
  }
};

/**
 * Générer un message à signer pour MetaMask
 */
const generateSignMessage = (walletAddress, nonce = null) => {
  const timestamp = new Date().toISOString();
  const messageNonce = nonce || Math.floor(Math.random() * 1000000);
  
  const message = {
    domain: 'ParkSync IoT',
    address: walletAddress,
    statement: 'Connectez-vous à ParkSync avec votre portefeuille Ethereum.',
    uri: process.env.FRONTEND_URL || 'http://localhost:8080',
    version: '1',
    chainId: process.env.CHAIN_ID || '31337',
    nonce: messageNonce,
    timestamp
  };

  return JSON.stringify(message, null, 2);
};

/**
 * Générer un token JWT
 */
const generateJWT = (user) => {
  const payload = {
    userId: user._id,
    walletAddress: user.walletAddress,
    role: user.role
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

/**
 * Middleware de limitation de taux pour l'authentification
 */
const authRateLimit = (req, res, next) => {
  // Implémentation simple - en production, utiliser Redis
  const ip = req.ip;
  const now = Date.now();
  
  if (!req.app.locals.authAttempts) {
    req.app.locals.authAttempts = new Map();
  }
  
  const attempts = req.app.locals.authAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  
  // Reset si plus d'une heure
  if (now - attempts.lastAttempt > 3600000) {
    attempts.count = 0;
  }
  
  if (attempts.count >= 10) {
    logger.security('Trop de tentatives d\'authentification', { ip, attempts: attempts.count });
    return res.status(429).json({
      success: false,
      message: 'Trop de tentatives. Réessayez plus tard.'
    });
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  req.app.locals.authAttempts.set(ip, attempts);
  
  next();
};

module.exports = {
  authMiddleware,
  requireRole,
  requireAdmin,
  requireManager,
  optionalAuth,
  generateSignMessage,
  generateJWT,
  authRateLimit
};
