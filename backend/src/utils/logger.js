const winston = require('winston');
const path = require('path');

// Configuration des niveaux de log
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Configuration des couleurs
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(logColors);

// Format personnalisé pour les logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Format pour les fichiers (sans couleurs)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Configuration des transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat
  })
];

// Ajouter le transport fichier en production
if (process.env.NODE_ENV === 'production') {
  // Créer le dossier logs s'il n'existe pas
  const fs = require('fs');
  const logsDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Transport pour tous les logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      level: 'info',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );

  // Transport pour les erreurs uniquement
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Créer le logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: fileFormat,
  transports,
  exitOnError: false
});

// Ajouter des méthodes personnalisées
logger.blockchain = (message, data = {}) => {
  logger.info(`⛓️ [BLOCKCHAIN] ${message}`, data);
};

logger.iot = (message, data = {}) => {
  logger.info(`🤖 [IoT] ${message}`, data);
};

logger.api = (message, data = {}) => {
  logger.info(`🌐 [API] ${message}`, data);
};

logger.websocket = (message, data = {}) => {
  logger.info(`🔌 [WebSocket] ${message}`, data);
};

logger.database = (message, data = {}) => {
  logger.info(`💾 [DATABASE] ${message}`, data);
};

logger.cache = (message, data = {}) => {
  logger.info(`⚡ [CACHE] ${message}`, data);
};

logger.security = (message, data = {}) => {
  logger.warn(`🔒 [SECURITY] ${message}`, data);
};

logger.performance = (message, data = {}) => {
  logger.info(`📊 [PERFORMANCE] ${message}`, data);
};

// Middleware pour Express
logger.expressMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const method = req.method;
    const url = req.originalUrl;
    const userAgent = req.get('User-Agent') || '';
    const ip = req.ip || req.connection.remoteAddress;
    
    let logLevel = 'info';
    if (statusCode >= 400 && statusCode < 500) {
      logLevel = 'warn';
    } else if (statusCode >= 500) {
      logLevel = 'error';
    }
    
    logger[logLevel](`${method} ${url} ${statusCode} ${duration}ms - ${ip} - ${userAgent}`);
  });
  
  next();
};

// Gestionnaire d'erreurs non capturées
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = logger;
