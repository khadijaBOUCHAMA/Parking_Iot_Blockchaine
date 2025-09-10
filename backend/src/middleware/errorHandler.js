const logger = require('../utils/logger');

/**
 * Middleware de gestion centralisée des erreurs
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log de l'erreur
  logger.error('Erreur capturée par le middleware:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user._id : null
  });

  // Erreur de validation Mongoose
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      statusCode: 400,
      message: `Erreur de validation: ${message}`
    };
  }

  // Erreur de duplication Mongoose
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = {
      statusCode: 400,
      message: `${field} '${value}' existe déjà`
    };
  }

  // Erreur de cast Mongoose (ID invalide)
  if (err.name === 'CastError') {
    error = {
      statusCode: 400,
      message: 'Identifiant invalide'
    };
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    error = {
      statusCode: 401,
      message: 'Token invalide'
    };
  }

  // Erreur JWT expiré
  if (err.name === 'TokenExpiredError') {
    error = {
      statusCode: 401,
      message: 'Token expiré'
    };
  }

  // Erreur Ethereum/Blockchain
  if (err.code === 'NETWORK_ERROR' || err.code === 'SERVER_ERROR') {
    error = {
      statusCode: 503,
      message: 'Service blockchain temporairement indisponible'
    };
  }

  // Erreur de limite de taux
  if (err.statusCode === 429) {
    error = {
      statusCode: 429,
      message: 'Trop de requêtes, veuillez ralentir'
    };
  }

  // Erreur de taille de fichier
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      statusCode: 413,
      message: 'Fichier trop volumineux'
    };
  }

  // Erreur de connexion base de données
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    error = {
      statusCode: 503,
      message: 'Service temporairement indisponible'
    };
  }

  // Erreur par défaut
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Erreur interne du serveur';

  // En développement, inclure la stack trace
  const response = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      originalError: err 
    })
  };

  // Ajouter des informations de débogage en développement
  if (process.env.NODE_ENV === 'development') {
    response.debug = {
      url: req.originalUrl,
      method: req.method,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query
    };
  }

  res.status(statusCode).json(response);
};

/**
 * Middleware pour gérer les routes non trouvées
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route non trouvée: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Wrapper pour les fonctions async afin de capturer les erreurs
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Créer une erreur personnalisée
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erreurs prédéfinies courantes
 */
const createError = {
  badRequest: (message = 'Requête invalide') => new AppError(message, 400),
  unauthorized: (message = 'Non autorisé') => new AppError(message, 401),
  forbidden: (message = 'Accès interdit') => new AppError(message, 403),
  notFound: (message = 'Ressource non trouvée') => new AppError(message, 404),
  conflict: (message = 'Conflit de données') => new AppError(message, 409),
  tooManyRequests: (message = 'Trop de requêtes') => new AppError(message, 429),
  internalServer: (message = 'Erreur interne du serveur') => new AppError(message, 500),
  serviceUnavailable: (message = 'Service indisponible') => new AppError(message, 503)
};

/**
 * Middleware de validation des données d'entrée
 */
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(createError.badRequest(`Validation échouée: ${message}`));
    }
    next();
  };
};

/**
 * Middleware de gestion des timeouts
 */
const timeoutHandler = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Timeout de requête', {
          url: req.originalUrl,
          method: req.method,
          timeout: timeoutMs
        });
        res.status(408).json({
          success: false,
          message: 'Timeout de la requête'
        });
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  createError,
  validateInput,
  timeoutHandler
};
